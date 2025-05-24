const express = require('express');
const router = express.Router();
const connection = require('../database/connection');
const erpConnection = connection.erpConnection;
const logger = require('../utils/logger');

// Rota para verificar a estrutura da view posicao_estoque
router.get('/verificar-view-estoque', async (req, res) => {
  try {
    logger.info('Verificando estrutura da view posicao_estoque no banco ERP');
    
    // Verificar se a view existe
    const viewExists = await erpConnection.raw(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'posicao_estoque'
      )
    `);
    
    // Obter informações das colunas se a view existir
    let colunas = [];
    if (viewExists.rows && viewExists.rows[0] && viewExists.rows[0].exists) {
      colunas = await erpConnection.raw(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'posicao_estoque'
        ORDER BY ordinal_position
      `);
    }
    
    // Verificar se há algum dado na view
    let amostraDados = null;
    if (viewExists.rows && viewExists.rows[0] && viewExists.rows[0].exists) {
      try {
        amostraDados = await erpConnection('posicao_estoque')
          .select('*')
          .limit(1)
          .first();
      } catch (err) {
        logger.error('Erro ao consultar amostra de dados da view:', err.message);
      }
    }
    
    // Se a view não existir ou não tiver a estrutura esperada, verificar outras possibilidades
    let tabelasAlternativas = [];
    try {
      // Buscar tabelas que possam conter informações de estoque
      const tabelas = await erpConnection.raw(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE '%estoque%'
        AND table_type = 'BASE TABLE'
      `);
      
      if (tabelas.rows && tabelas.rows.length > 0) {
        tabelasAlternativas = tabelas.rows.map(row => row.table_name);
      }
    } catch (err) {
      logger.error('Erro ao buscar tabelas alternativas:', err.message);
    }
    
    res.json({
      success: true,
      viewExists: viewExists.rows && viewExists.rows[0] && viewExists.rows[0].exists,
      colunas: colunas.rows || [],
      amostraDados,
      tabelasAlternativas
    });
  } catch (error) {
    logger.error('Erro ao verificar estrutura da view posicao_estoque:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao verificar estrutura da view',
      details: error.message
    });
  }
});

// Rota para buscar dados fiscais do produto
router.get('/dados-fiscais/:codigo', async (req, res) => {
  try {
    let { codigo } = req.params;
    
    // Decodificar o código da URL
    codigo = decodeURIComponent(codigo);
    
    // Log do código recebido
    logger.info(`Buscando dados fiscais para produto: ${codigo}`);

    // Tentar buscar pelo código exato primeiro
    let produto = await connection('produtos')
      .select(
        'produtos.*',
        'class_fiscal.cod_ncm',
        'regras_icms_cadastro.acrescimo_icms'
      )
      .leftJoin('class_fiscal', 'produtos.class_fiscal', 'class_fiscal.codigo')
      .leftJoin('regras_icms_cadastro', 'produtos.cod_regra_icms', 'regras_icms_cadastro.codigo')
      .where('produtos.codigo', codigo)
      .first();

    // Se não encontrou, tenta algumas variações
    if (!produto) {
      // Remove caracteres especiais mantendo letras e números
      const codigoLimpo = codigo.replace(/[^a-zA-Z0-9]/g, '');
      
      // Tenta diferentes formatos do código
      const tentativas = [
        codigo.replace('/', ''), // Remove barras
        codigoLimpo, // Remove todos caracteres especiais
        codigo.split('/')[0], // Pega só a primeira parte antes da barra
        `%${codigo}%`, // Busca contendo o código
        `%${codigoLimpo}%` // Busca contendo o código limpo
      ];

      // Log das tentativas
      logger.info(`Tentando variações do código:`, tentativas);

      // Tenta cada variação
      for (const tentativa of tentativas) {
        produto = await connection('produtos')
          .select(
            'produtos.*',
            'class_fiscal.cod_ncm',
            'regras_icms_cadastro.acrescimo_icms'
          )
          .leftJoin('class_fiscal', 'produtos.class_fiscal', 'class_fiscal.codigo')
          .leftJoin('regras_icms_cadastro', 'produtos.cod_regra_icms', 'regras_icms_cadastro.codigo')
          .where('produtos.codigo', 'like', tentativa)
          .first();

        if (produto) {
          logger.info(`Produto encontrado com a variação: ${tentativa}`);
          break;
        }
      }

      if (!produto) {
        logger.warn(`Produto não encontrado após tentar todas as variações. Código original: ${codigo}`);
        return res.status(404).json({ 
          error: 'Produto não encontrado',
          details: {
            codigoOriginal: codigo,
            tentativas: tentativas
          }
        });
      }
    }

    // Buscar regras de ICMS do produto
    const regrasIcms = await connection('regras_icms_itens')
      .where('cod_regra_icms', produto.cod_regra_icms);

    // Log do sucesso
    logger.info(`Dados fiscais encontrados para produto ${codigo}:`, {
      produto: produto.codigo,
      regrasCount: regrasIcms.length
    });

    res.json({
      produto,
      regrasIcms
    });
  } catch (error) {
    logger.error('Erro ao buscar dados fiscais do produto:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar dados fiscais do produto',
      details: error.message
    });
  }
});

// Rota para calcular tributos de um produto (POST para evitar problemas com URL)
router.post('/calcular-tributos', async (req, res) => {
  try {
    const { codigoProduto, quantidade, cliente, uf_destino } = req.body;
    
    if (!codigoProduto || !quantidade) {
      return res.status(400).json({ 
        error: 'Dados incompletos',
        details: 'codigoProduto e quantidade são obrigatórios'
      });
    }
    
    // Determinar a UF de destino - prioridade:
    // 1. uf_destino explícito
    // 2. cliente.uf
    // 3. Valor padrão 'SP'
    const ufDestino = uf_destino || (cliente && cliente.uf) || 'SP';
    
    logger.info(`Calculando tributos para produto ${codigoProduto} (qt: ${quantidade}), UF destino: ${ufDestino}`);
    
    // Buscar produto por código - tentando várias possibilidades
    let produto = null;
    
    // Lista de possíveis formatos do código
    const codigoLimpo = codigoProduto.replace(/[^a-zA-Z0-9]/g, '');
    const tentativas = [
      codigoProduto,
      codigoLimpo,
      codigoProduto.replace('/', ''),
      codigoProduto.split('/')[0],
      `%${codigoProduto}%`,
      `%${codigoLimpo}%`
    ];
    
    // Tentar cada possível formato do código
    for (const codigo of tentativas) {
      produto = await connection('produtos')
        .select(
          'produtos.*',
          'class_fiscal.cod_ncm',
          'regras_icms_cadastro.acrescimo_icms'
        )
        .leftJoin('class_fiscal', 'produtos.class_fiscal', 'class_fiscal.codigo')
        .leftJoin('regras_icms_cadastro', 'produtos.cod_regra_icms', 'regras_icms_cadastro.codigo')
        .where(function() {
          this.where('produtos.codigo', codigo)
              .orWhere('produtos.codigo', 'like', codigo);
        })
        .first();
      
      if (produto) {
        logger.info(`Produto encontrado com código: ${codigo}`);
        break;
      }
    }
    
    if (!produto) {
      logger.warn(`Produto não encontrado após tentar todas as variações: ${codigoProduto}`);
      return res.status(404).json({ 
        error: 'Produto não encontrado',
        details: {
          codigoProduto,
          tentativas
        }
      });
    }
    
    // Buscar regras de ICMS
    const regrasIcms = await connection('regras_icms_itens')
      .where('cod_regra_icms', produto.cod_regra_icms);
    
    // Log para debug
    logger.info(`Dados fiscais para NCM ${produto.class_fiscal} e UF ${ufDestino}`);

    // Buscar dados da classificação fiscal para o cálculo correto
    let dadosClassFiscal = null;
    if (produto.class_fiscal) {
      try {
        dadosClassFiscal = await connection('class_fiscal_dados')
          .where({
            'cod_class_fiscal': produto.class_fiscal,
            'uf': ufDestino
          })
          .first();

        if (!dadosClassFiscal) {
          logger.warn(`Dados fiscais não encontrados para NCM ${produto.class_fiscal} e UF ${ufDestino}, usando padrão`);
          
          // Tentar buscar padrão para SP
          dadosClassFiscal = await connection('class_fiscal_dados')
            .where({
              'cod_class_fiscal': produto.class_fiscal,
              'uf': 'SP'
            })
            .first();
            
          if (dadosClassFiscal) {
            logger.info(`Dados fiscais retornados para NCM ${produto.class_fiscal}: ${JSON.stringify(dadosClassFiscal)}`);
          }
        }
      } catch (error) {
        logger.error(`Erro ao buscar dados fiscais: ${error.message}`);
      }
    }
      
    // Retornar dados básicos para cálculos no frontend
    res.json({
      produto,
      regrasIcms,
      dadosClassFiscal,
      tributacao: {
        aliquotaIcms: produto.aliq_icms || 0,
        aliquotaIpi: produto.aliq_ipi || 0,
        baseCalculo: produto.preco_venda * quantidade,
        valorTotalBruto: produto.preco_venda * quantidade
      }
    });
    
  } catch (error) {
    logger.error('Erro ao calcular tributos do produto:', error);
    res.status(500).json({ 
      error: 'Erro ao calcular tributos do produto',
      details: error.message
    });
  }
});

// Rota para buscar a posição de estoque de um produto
router.get('/estoque/:codigo', async (req, res) => {
  try {
    let { codigo } = req.params;
    
    // Decodificar o código da URL
    codigo = decodeURIComponent(codigo);
    
    // Log do código recebido
    logger.info(`Buscando posição de estoque para produto: ${codigo}`);

    // Buscar exatamente o código informado na view posicao_estoque
    const posicaoEstoque = await erpConnection('posicao_estoque')
      .where('cod_produto', codigo)
      .first();

    if (posicaoEstoque) {
      logger.info(`Estoque encontrado para o produto ${codigo}:`, posicaoEstoque);
      
      // Mapear exatamente os campos que existem na view
      return res.json({
        codigo: posicaoEstoque.cod_produto,
        qtd_disponivel: parseFloat(posicaoEstoque.qtde_kardex || 0),
        qtd_total: parseFloat(posicaoEstoque.qtde_kardex || 0),
        local_estoque: posicaoEstoque.cod_local_estoque,
        empresa: posicaoEstoque.cod_empresa,
        success: true
      });
    }
    
    // Se não encontrou com o código exato, tente variações
    const codigos = [
      codigo,
      codigo.replace(/[^a-zA-Z0-9]/g, ''),
      codigo.replace('/', '')
    ];
    
    for (const codigoTentativa of codigos) {
      if (codigoTentativa === codigo) continue; // Já tentamos este
      
      logger.info(`Tentando buscar estoque com código alternativo: ${codigoTentativa}`);
      
      const estoqueAlternativo = await erpConnection('posicao_estoque')
        .where('cod_produto', 'like', `%${codigoTentativa}%`)
        .first();
      
      if (estoqueAlternativo) {
        logger.info(`Estoque encontrado com código alternativo para ${codigo}:`, estoqueAlternativo);
        
        return res.json({
          codigo: estoqueAlternativo.cod_produto,
          qtd_disponivel: parseFloat(estoqueAlternativo.qtde_kardex || 0),
          qtd_total: parseFloat(estoqueAlternativo.qtde_kardex || 0),
          local_estoque: estoqueAlternativo.cod_local_estoque,
          empresa: estoqueAlternativo.cod_empresa,
          sucesso: true,
          observacao: 'Código alternativo encontrado'
        });
      }
    }

    // Se não encontrou nenhum registro com o código ou variações
    logger.warn(`Estoque não encontrado para o produto: ${codigo}`);
    return res.status(404).json({ 
      error: 'Posição de estoque não encontrada',
      details: {
        codigo: codigo
      }
    });
  } catch (error) {
    logger.error(`Erro ao buscar posição de estoque: ${error.message}`, error);
    return res.status(500).json({
      error: 'Erro ao buscar posição de estoque',
      details: error.message
    });
  }
});

module.exports = router; 