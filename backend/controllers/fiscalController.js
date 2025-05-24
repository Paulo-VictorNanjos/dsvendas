const knex = require('../database/connection');
const fiscalRulesService = require('../services/fiscalRulesService');
const productFiscalRulesService = require('../services/productFiscalRulesService');
const logger = require('../utils/logger');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * Get fiscal data for a product
 */
const getDadosFiscaisProduto = async (req, res) => {
  try {
    const { codigo } = req.params;
    
    const produto = await fiscalRulesService.getDadosFiscaisProduto(codigo);
      
    if (!produto) {
      return res.status(404).json({ 
        success: false,
        error: 'Produto não encontrado' 
      });
    }
    
    res.json({
      success: true,
      data: produto
    });
  } catch (error) {
    logger.error(`Erro ao buscar dados fiscais do produto ${req.params.codigo}:`, error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar dados fiscais do produto',
      message: error.message
    });
  }
};

/**
 * Get ICMS rules
 */
const getRegrasIcms = async (req, res) => {
  try {
    const params = req.query;
    
    const regras = await fiscalRulesService.getRegrasIcms(params);
    
    res.json({
      success: true,
      data: regras
    });
  } catch (error) {
    logger.error('Erro ao buscar regras ICMS:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar regras ICMS',
      message: error.message
    });
  }
};

/**
 * Get fiscal classification data
 */
const getDadosClassFiscal = async (req, res) => {
  try {
    const params = req.query;
    
    const dados = await fiscalRulesService.getDadosClassFiscal(params);
    
    res.json({
      success: true,
      data: dados
    });
  } catch (error) {
    logger.error('Erro ao buscar dados da classificação fiscal:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar dados da classificação fiscal',
      message: error.message
    });
  }
};

/**
 * Get complete fiscal classification data including data from class_fiscal_tributacoes
 */
const getDadosClassFiscalCompletos = async (req, res) => {
  try {
    const params = req.query;
    
    // Buscar dados básicos da classificação fiscal
    const dados = await fiscalRulesService.getDadosClassFiscal(params);
    
    // Buscar dados adicionais da tabela class_fiscal_tributacoes
    try {
      const { ncm, uf } = params;
      
      // Buscar class_fiscal pelo NCM
      const classFiscal = await knex('class_fiscal')
        .where('cod_ncm', ncm)
        .first();
      
      if (classFiscal) {
        // Buscar dados de tributações pelo código da classificação e UF
        const tributacoes = await knex('class_fiscal_tributacoes')
          .where({
            'cod_class_fiscal': classFiscal.codigo,
            'uf': uf
          })
          .first();
        
        if (tributacoes) {
          logger.info(`Encontradas tributações específicas para NCM ${ncm} e UF ${uf}`);
          
          // Incorporar dados de tributações aos dados fiscais
          Object.assign(dados, {
            iva: tributacoes.iva !== undefined ? tributacoes.iva : dados.iva,
            cest: tributacoes.cest || dados.cest || '',
            aliq_interna: tributacoes.aliq_interna !== undefined ? tributacoes.aliq_interna : dados.aliq_interna,
            iva_importado: tributacoes.iva_importado !== undefined ? tributacoes.iva_importado : dados.iva_importado,
            aliq_importado: tributacoes.aliq_importado !== undefined ? tributacoes.aliq_importado : dados.aliq_importado
          });
        } else {
          logger.info(`Sem tributações específicas para NCM ${ncm} e UF ${uf}, usando dados básicos`);
        }
      } else {
        logger.warn(`Classificação fiscal não encontrada para NCM ${ncm}`);
      }
    } catch (tributacaoError) {
      logger.error('Erro ao buscar tributações específicas:', tributacaoError);
      // Continua com os dados básicos
    }
    
    res.json({
      success: true,
      data: dados
    });
  } catch (error) {
    logger.error('Erro ao buscar dados completos da classificação fiscal:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar dados completos da classificação fiscal',
      message: error.message
    });
  }
};

/**
 * Calculate taxes for a product
 * POST endpoint to avoid URL encoding issues with special characters in product codes
 */
const calcularTributosProduto = async (req, res) => {
  try {
    const { 
      produto_codigo, 
      uf_destino, 
      uf_empresa = 'SP',  // Default to SP if not provided
      quantidade = 1, 
      valor_unitario, 
      cod_regime = 3      // Default to regime normal if not provided
    } = req.body;
    
    if (!produto_codigo) {
      return res.status(400).json({ 
        success: false,
        error: 'Código do produto é obrigatório' 
      });
    }
    
    if (!uf_destino) {
      return res.status(400).json({ 
        success: false,
        error: 'UF de destino é obrigatória' 
      });
    }
    
    if (!valor_unitario && valor_unitario !== 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Valor unitário é obrigatório' 
      });
    }
    
    // Tente usar o novo serviço resiliente primeiro
    try {
      // Obter dados do produto
      const produto = await knex('produtos')
        .where('codigo', produto_codigo)
        .first();
      
      if (!produto) {
        return res.status(404).json({ 
          success: false,
          error: `Produto com código ${produto_codigo} não encontrado` 
        });
      }
      
      // Dados do cliente (mock para cálculo)
      const cliente = {
        uf: uf_destino,
        cod_regime: cod_regime
      };
      
      // Usar o serviço resiliente para calcular impostos
      const impostos = await productFiscalRulesService.calculateIcms(
        produto, 
        quantidade, 
        valor_unitario, 
        cliente
      );
      
      // Preparar resposta
      const valorTotal = quantidade * valor_unitario;
      const valorTotalComImpostos = valorTotal + impostos.valorIpi + impostos.valorIcmsSt + impostos.valorFcp;
      
      // Formatar resultado
      const resultado = {
        produto_codigo,
        class_fiscal: impostos.ncm,
        cod_regra_icms: produto.cod_regra_icms,
        quantidade,
        valor_unitario,
        valor_total: valorTotal,
        situacao_tributaria: impostos.stIcms,
        base_icms: valorTotal, // Base sem redução
        aliq_icms: impostos.aliqIcms,
        valor_icms: impostos.valorIcms,
        reducao_icms: 0, // Para simplificar
        aliq_ipi: impostos.aliqIpi,
        valor_ipi: impostos.valorIpi,
        icms_st: impostos.aplicaIcmsSt ? 'S' : 'N',
        base_icms_st: impostos.aplicaIcmsSt ? (valorTotal + impostos.valorIpi) : 0,
        valor_icms_st: impostos.valorIcmsSt,
        aliq_fcp_st: impostos.aliqFcp,
        valor_fcp_st: impostos.valorFcp,
        valor_total_com_impostos: valorTotalComImpostos,
        cod_origem_prod: impostos.codOrigemProd,
        interestadual: uf_destino !== uf_empresa,
        aliq_interestadual: uf_destino !== uf_empresa ? 12 : 0
      };
      
      return res.json({
        success: true,
        data: resultado,
        method: 'resilient'
      });
    } catch (resilientError) {
      logger.warn('Falha no serviço resiliente, tentando método original:', resilientError);
      // Continuar com o método original em caso de falha
    }
    
    // Método original (backup)
    // 1. Get product fiscal data
    const dadosFiscais = await fiscalRulesService.getDadosFiscaisProduto(produto_codigo);
    
    if (!dadosFiscais) {
      return res.status(404).json({ 
        success: false,
        error: `Produto com código ${produto_codigo} não encontrado` 
      });
    }
    
    // 2. Get ICMS rules
    const regrasIcms = await fiscalRulesService.getRegrasIcms({
      codigo: dadosFiscais.cod_regra_icms,
      uf: uf_destino,
      ufEmpresa: uf_empresa,
      codRegime: cod_regime
    });
    
    // 3. Get fiscal classification data (if class_fiscal exists)
    let dadosClassFiscal = null;
    if (dadosFiscais.class_fiscal) {
      dadosClassFiscal = await fiscalRulesService.getDadosClassFiscal({
        ncm: dadosFiscais.class_fiscal,
        uf: uf_destino,
        ufEmpresa: uf_empresa
      });
    }
    
    // 4. Calculate taxes
    const valorTotal = quantidade * valor_unitario;
    
    // Base ICMS calculation
    let baseIcms = valorTotal;
    if (regrasIcms.red_icms > 0) {
      baseIcms = valorTotal * (1 - regrasIcms.red_icms / 100);
    }
    
    // ICMS calculation
    let valorIcms = baseIcms * (regrasIcms.aliq_icms / 100);
    
    // IPI calculation
    const aliqIpi = dadosFiscais.aliq_ipi || 0;
    const valorIpi = valorTotal * (aliqIpi / 100);
    
    // ICMS-ST calculation (if applicable)
    let baseIcmsSt = 0;
    let valorIcmsSt = 0;
    
    if (regrasIcms.icms_st === 'S' && dadosClassFiscal) {
      const iva = dadosClassFiscal.iva || 0;
      
      // Base ICMS-ST
      baseIcmsSt = (valorTotal + valorIpi) * (1 + iva / 100);
      
      // Buscar FCP-ST da tabela class_fiscal_fcp
      let aliqFcpSt = 0;
      try {
        // Primeiro buscar a classificação fiscal do produto
        const classFiscal = await knex('class_fiscal')
          .where('cod_ncm', dadosClassFiscal.cod_ncm)
          .whereNull('dt_exc')
          .first();

        if (classFiscal) {
          // Depois buscar o FCP-ST usando o código da classificação fiscal
          const fcpData = await knex('class_fiscal_fcp')
            .where({
              'cod_class_fiscal': classFiscal.codigo,
              'uf': uf_destino
            })
            .first();
            
          if (fcpData) {
            aliqFcpSt = fcpData.aliq_fcpst || 0;
            logger.info(`FCP-ST encontrado para UF ${uf_destino}: ${aliqFcpSt}%`);
          }
        } else {
          logger.warn(`Classificação fiscal não encontrada para NCM ${dadosClassFiscal.cod_ncm}`);
        }
      } catch (fcpError) {
        logger.warn(`Erro ao buscar FCP-ST: ${fcpError.message}`);
        // Continuar com aliqFcpSt = 0
      }
      
      // ICMS-ST value considerando FCP-ST
      const aliqInterna = dadosClassFiscal.aliq_interna || regrasIcms.aliq_icms;
      const aliqTotal = aliqInterna + aliqFcpSt;
      valorIcmsSt = (baseIcmsSt * (aliqTotal / 100)) - valorIcms;
      
      if (valorIcmsSt < 0) valorIcmsSt = 0;
      
      // Calcula FCP-ST separadamente
      let valorFcpSt = 0;
      if (aliqFcpSt > 0 && baseIcmsSt > 0) {
        valorFcpSt = baseIcmsSt * (aliqFcpSt / 100);
        // Ajusta o valor do ICMS-ST para não incluir o FCP-ST
        valorIcmsSt = valorIcmsSt - valorFcpSt;
      }
    }
    
    // Calculate total with taxes
    const valorTotalComImpostos = valorTotal + valorIpi + valorIcmsSt + valorFcpSt;
    
    // Prepare response
    const resultado = {
      produto_codigo,
      class_fiscal: dadosFiscais.class_fiscal,
      cod_regra_icms: dadosFiscais.cod_regra_icms,
      quantidade,
      valor_unitario,
      valor_total: valorTotal,
      situacao_tributaria: regrasIcms.st_icms,
      base_icms: baseIcms,
      aliq_icms: regrasIcms.aliq_icms,
      valor_icms: valorIcms,
      reducao_icms: regrasIcms.red_icms,
      aliq_ipi: aliqIpi,
      valor_ipi: valorIpi,
      icms_st: regrasIcms.icms_st,
      base_icms_st: baseIcmsSt,
      valor_icms_st: valorIcmsSt,
      aliq_fcp_st: dadosClassFiscal?.aliq_fcpst || 0,
      valor_fcp_st: valorFcpSt,
      valor_total_com_impostos: valorTotalComImpostos,
      cod_origem_prod: dadosFiscais.cod_origem_prod,
      interestadual: regrasIcms.isOperacaoInterestadual,
      aliq_interestadual: regrasIcms.aliq_interestadual
    };
    
    res.json({
      success: true,
      data: resultado,
      method: 'original'
    });
  } catch (error) {
    logger.error('Erro ao calcular tributos do produto:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao calcular tributos do produto',
      message: error.message
    });
  }
};

// Novo endpoint que usa apenas o serviço resiliente
const calcularImpostosProduto = async (req, res) => {
  try {
    const { 
      produto_codigo, 
      uf_destino = 'SP', 
      quantidade = 1, 
      valor_unitario,
    } = req.body;
    
    if (!produto_codigo) {
      return res.status(400).json({ 
        success: false,
        error: 'Código do produto é obrigatório' 
      });
    }
    
    if (!valor_unitario && valor_unitario !== 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Valor unitário é obrigatório' 
      });
    }
    
    // Obter dados do produto
    const produto = await knex('produtos')
      .where('codigo', produto_codigo)
      .first();
    
    if (!produto) {
      return res.status(404).json({ 
        success: false,
        error: `Produto com código ${produto_codigo} não encontrado` 
      });
    }
    
    // Dados do cliente (mock para cálculo)
    const cliente = {
      uf: uf_destino
    };
    
    // Usar o serviço resiliente para calcular impostos
    const impostos = await productFiscalRulesService.calculateIcms(
      produto, 
      quantidade, 
      valor_unitario, 
      cliente
    );
    
    // Preparar resposta
    const valorTotal = quantidade * valor_unitario;
    const valorTotalComImpostos = valorTotal + impostos.valorIpi + impostos.valorIcmsSt + impostos.valorFcp;
    
    res.json({
      success: true,
      data: {
        produto_codigo,
        ncm: impostos.ncm,
        cest: impostos.cest,
        quantidade,
        valor_unitario,
        valor_total: valorTotal,
        aliq_icms: impostos.aliqIcms,
        valor_icms: impostos.valorIcms,
        aliq_ipi: impostos.aliqIpi,
        valor_ipi: impostos.valorIpi,
        icms_st: impostos.aplicaIcmsSt ? 'S' : 'N',
        valor_icms_st: impostos.valorIcmsSt,
        valor_fcp: impostos.valorFcp,
        valor_total_com_impostos: valorTotalComImpostos,
        cod_origem_prod: impostos.codOrigemProd,
        st_icms: impostos.stIcms
      }
    });
  } catch (error) {
    logger.error('Erro ao calcular impostos do produto:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao calcular impostos do produto',
      message: error.message
    });
  }
};

/**
 * Get product fiscal rules using the resilient service
 */
const getDadosFiscaisProdutoResiliente = async (req, res) => {
  try {
    const { codigo } = req.params;
    
    // Usar o serviço resiliente
    const regrasFiscais = await productFiscalRulesService.getProductFiscalRules(codigo);
    
    res.json({
      success: true,
      data: regrasFiscais
    });
  } catch (error) {
    logger.error(`Erro ao buscar dados fiscais do produto ${req.params.codigo}:`, error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar dados fiscais do produto',
      message: error.message
    });
  }
};

/**
 * Endpoint que retorna todos os dados fiscais de um produto
 * Inclui dados de NCM, regras ICMS e dados do produto
 */
const getProdutoFiscal = async (req, res) => {
  const { codigo } = req.params;
  
  try {
    console.log(`Buscando dados fiscais completos para produto ${codigo}`);
    
    // 1. Buscar dados básicos do produto
    const produtoQuery = 'SELECT * FROM produtos WHERE codigo = $1';
    const produtoResult = await pool.query(produtoQuery, [codigo]);
    
    if (produtoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Produto código ${codigo} não encontrado`
      });
    }
    
    const produto = produtoResult.rows[0];
    console.log('Dados básicos do produto:', produto);
    
    // 2. Complementar com dados fiscais mais específicos
    try {
      const dadosFiscaisQuery = `
        SELECT p.*, cf.* 
        FROM produtos p
        LEFT JOIN class_fiscal_dados cf ON p.class_fiscal = cf.cod_ncm 
        WHERE p.codigo = $1
      `;
      
      const dadosFiscaisResult = await pool.query(dadosFiscaisQuery, [codigo]);
      
      if (dadosFiscaisResult.rows.length > 0) {
        const dadosFiscais = dadosFiscaisResult.rows[0];
        console.log('Dados fiscais do produto com NCM:', dadosFiscais);
        
        // 3. Tentar obter regras ICMS se o código de regra estiver definido
        if (dadosFiscais.cod_regra_icms) {
          try {
            const regrasIcmsQuery = `
              SELECT * FROM regras_icms 
              WHERE codigo = $1
            `;
            
            const regrasIcmsResult = await pool.query(regrasIcmsQuery, [dadosFiscais.cod_regra_icms]);
            
            if (regrasIcmsResult.rows.length > 0) {
              const regrasIcms = regrasIcmsResult.rows[0];
              console.log('Regras ICMS do produto:', regrasIcms);
              
              // Combinamos todos os dados
              return res.json({
                ...dadosFiscais,
                icms_info: regrasIcms
              });
            }
          } catch (regrasError) {
            console.error('Erro ao buscar regras ICMS:', regrasError);
            // Continua e retorna dados sem as regras
          }
        }
        
        return res.json(dadosFiscais);
      } else {
        // Se não encontrou na query completa, retorna dados básicos
        return res.json(produto);
      }
    } catch (dadosFiscaisError) {
      console.error('Erro ao buscar dados fiscais:', dadosFiscaisError);
      return res.json(produto);
    }
  } catch (error) {
    console.error('Erro ao buscar dados fiscais do produto:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar dados fiscais do produto',
      error: error.message
    });
  }
};

/**
 * Busca as regras fiscais de um produto específico
 */
const getRegrasFiscaisProduto = async (req, res) => {
  try {
    const { codigoProduto } = req.params;
    
    if (!codigoProduto) {
      return res.status(400).json({ 
        success: false, 
        message: 'Código do produto é obrigatório' 
      });
    }
    
    // Busca as regras fiscais associadas ao produto
    const regras = await knex('regras_fiscais_produtos')
      .where('cod_produto', codigoProduto)
      .first();
    
    if (!regras) {
      return res.status(404).json({ 
        success: false, 
        message: 'Regras fiscais não encontradas para este produto' 
      });
    }
    
    return res.json({
      success: true,
      data: regras
    });
  } catch (error) {
    logger.error('Erro ao buscar regras fiscais:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar regras fiscais',
      error: error.message
    });
  }
};

/**
 * Busca as regras de cálculo fiscal para um produto e UF específicos
 */
const getRegraCalculoProdutoUF = async (req, res) => {
  try {
    const { codigoProduto, uf } = req.params;
    
    if (!codigoProduto || !uf) {
      return res.status(400).json({ 
        success: false, 
        message: 'Código do produto e UF são obrigatórios' 
      });
    }
    
    // Busca a regra de cálculo específica para o produto e UF
    const regra = await knex('regras_fiscais_produto')
      .where('codigo_produto', codigoProduto)
      .andWhere('uf', uf)
      .first();
    
    if (!regra) {
      return res.status(404).json({ 
        success: false, 
        message: 'Regra de cálculo fiscal não encontrada para este produto e UF' 
      });
    }
    
    return res.json({
      success: true,
      data: regra
    });
  } catch (error) {
    logger.error('Erro ao buscar regra de cálculo fiscal:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar regra de cálculo fiscal',
      error: error.message
    });
  }
};

/**
 * Busca as regras ICMS diretamente do ERP
 */
const getRegrasIcmsERP = async (req, res) => {
  try {
    // Tenta conexão com o ERP
    let regras;
    
    try {
      // Configuração da conexão com o banco do ERP
      const erpConfig = {
        host: process.env.ERP_DB_HOST || 'localhost',
        port: process.env.ERP_DB_PORT || 5434,
        user: process.env.ERP_DB_USER || 'postgres',
        password: process.env.ERP_DB_PASSWORD || 'ds_due339',
        database: process.env.ERP_DB_DATABASE || 'permak_test'
      };
      
      const erpPool = new Pool(erpConfig);
      
      // Consulta no banco do ERP
      const erpQuery = `
        SELECT 
          r.codigo, 
          r.descricao,
          i.uf, 
          i.st_icms, 
          i.aliq_icms, 
          i.red_icms,
          i.st_icms_contr, 
          i.aliq_icms_contr, 
          i.red_icms_contr,
          i.icms_st
        FROM 
          regras_icms_cadastro r
        JOIN 
          regras_icms_itens i ON r.codigo = i.cod_regra_icms
        WHERE
          r.dt_exc IS NULL
        ORDER BY r.codigo, i.uf
      `;
      
      const erpResult = await erpPool.query(erpQuery);
      regras = erpResult.rows;
      
      await erpPool.end(); // Fechar conexão com o ERP
    } catch (erpError) {
      logger.warn('Falha ao conectar com ERP, usando banco local:', erpError.message);
      
      // Fallback para dados locais se falhar conexão com ERP
      regras = await knex('regras_icms_itens')
        .select('cod_regra_icms as codigo', 'uf', 'st_icms', 'aliq_icms', 'red_icms', 
                'st_icms_contr', 'aliq_icms_contr', 'red_icms_contr', 'icms_st')
        .orderBy(['cod_regra_icms', 'uf']);
    }
    
    if (!regras || regras.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Nenhuma regra ICMS encontrada' 
      });
    }
    
    return res.json({
      success: true,
      data: regras
    });
  } catch (error) {
    logger.error('Erro ao buscar regras ICMS:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar regras ICMS',
      error: error.message
    });
  }
};

/**
 * Define manualmente as regras fiscais para um produto
 */
const setRegrasFiscaisProduto = async (req, res) => {
  try {
    const { 
      codigoProduto,
      codRegraIcms,
      codRegraPisCofins,
      classFiscal,
      cest,
      codOrigemProd
    } = req.body;
    
    if (!codigoProduto || !codRegraIcms) {
      return res.status(400).json({ 
        success: false, 
        message: 'Código do produto e código da regra ICMS são obrigatórios' 
      });
    }
    
    // Verifica se o produto já tem regras fiscais
    const existente = await knex('regras_fiscais_produtos')
      .where('cod_produto', codigoProduto)
      .first();
      
    const codEmpresa = 1; // Empresa padrão, poderia vir do token de autenticação
    
    try {
      if (existente) {
        // Atualiza regras existentes
        await knex('regras_fiscais_produtos')
          .where('cod_produto', codigoProduto)
          .update({
            cod_regra_icms: codRegraIcms,
            cod_regra_pis_cofins: codRegraPisCofins || null,
            class_fiscal: classFiscal || null,
            cest: cest || null,
            cod_origem_prod: codOrigemProd || null,
            ativo: true,
            dt_alt: knex.fn.now()
          });
      } else {
        // Insere novas regras
        await knex('regras_fiscais_produtos').insert({
          cod_empresa: codEmpresa,
          cod_produto: codigoProduto,
          cod_regra_icms: codRegraIcms,
          cod_regra_pis_cofins: codRegraPisCofins || null,
          class_fiscal: classFiscal || null,
          cest: cest || null,
          cod_origem_prod: codOrigemProd || null,
          ativo: true,
          dt_inc: knex.fn.now()
        });
      }
      
      // Dispara a recalculação das regras específicas por UF
      // Esta parte deve ser disparada de forma assíncrona para não bloquear a resposta
      setTimeout(async () => {
        try {
          const listaUFs = await knex('regras_icms_itens')
            .distinct('uf')
            .where('cod_regra_icms', codRegraIcms)
            .pluck('uf');
          
          for (const uf of listaUFs) {
            await recalcularRegrasFiscaisPorUF(codigoProduto, codRegraIcms, uf);
          }
          logger.info(`Regras fiscais recalculadas para produto ${codigoProduto}`);
        } catch (error) {
          logger.error(`Erro ao recalcular regras fiscais: ${error.message}`);
        }
      }, 100);
      
      return res.json({
        success: true,
        message: 'Regras fiscais definidas com sucesso',
        data: {
          codigoProduto,
          codRegraIcms,
          codRegraPisCofins
        }
      });
    } catch (error) {
      logger.error('Erro ao definir regras fiscais:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao definir regras fiscais',
        error: error.message
      });
    }
  } catch (error) {
    logger.error('Erro ao processar requisição:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição',
      error: error.message
    });
  }
};

/**
 * Função auxiliar para recalcular regras fiscais específicas por UF
 * para um produto após atualização da regra geral
 */
async function recalcularRegrasFiscaisPorUF(codigoProduto, codRegraIcms, uf) {
  try {
    // Busca a regra ICMS para esta UF na tabela regras_icms_itens
    const regraICMS = await knex('regras_icms_itens')
      .where({ 
        cod_regra_icms: codRegraIcms, 
        uf: uf 
      })
      .first();
    
    if (!regraICMS) {
      logger.warn(`Regra ICMS não encontrada para código ${codRegraIcms} e UF ${uf} na tabela regras_icms_itens`);
      return;
    }
    
    // Busca o produto para obter o NCM
    const produto = await knex('regras_fiscais_produtos')
      .where('cod_produto', codigoProduto)
      .first();
    
    if (!produto) {
      logger.warn(`Produto não encontrado: ${codigoProduto}`);
      return;
    }
    
    // Valores padrão para PIS/COFINS
    const aliqPis = 1.65;
    const aliqCofins = 7.60;
    const cstPis = '01';
    const cstCofins = '01';
    
    // Determina CST e valores de ICMS
    const cstIcms = regraICMS.st_icms_contr || '00';
    const aliqIcms = regraICMS.aliq_icms_contr || 0;
    const redBcIcms = regraICMS.red_icms_contr || 0;
    
    // Verifica se já existe regra para este produto/UF
    const regraExistente = await knex('regras_fiscais_produto')
      .where({
        codigo_produto: codigoProduto,
        uf: uf
      })
      .first();
    
    const dadosRegra = {
      codigo_produto: codigoProduto,
      uf: uf,
      cst_icms: cstIcms,
      aliq_icms: aliqIcms,
      red_bc_icms: redBcIcms,
      aliq_pis: aliqPis,
      aliq_cofins: aliqCofins,
      cst_pis: cstPis,
      cst_cofins: cstCofins,
      codigo_ncm: produto.ncm,
      margem_st: regraICMS.icms_st === 'S' ? 30.00 : 0,
      aliq_icms_st: regraICMS.aliq_interna || 0,
      mvast: 0,
      updated_at: knex.fn.now()
    };
    
    if (regraExistente) {
      // Atualiza regra existente
      await knex('regras_fiscais_produto')
        .where({
          codigo_produto: codigoProduto,
          uf: uf
        })
        .update(dadosRegra);
    } else {
      // Insere nova regra
      dadosRegra.created_at = knex.fn.now();
      await knex('regras_fiscais_produto').insert(dadosRegra);
    }
    
    return true;
  } catch (error) {
    logger.error(`Erro ao recalcular regra fiscal para produto ${codigoProduto}, UF ${uf}:`, error);
    return false;
  }
}

/**
 * Verificar se um produto tem substituição tributária para uma determinada UF
 */
const verificarSubstituicaoTributaria = async (req, res) => {
  try {
    const { codigo, uf } = req.params;
    
    if (!codigo) {
      return res.status(400).json({ 
        success: false,
        error: 'Código do produto é obrigatório' 
      });
    }
    
    if (!uf) {
      return res.status(400).json({ 
        success: false,
        error: 'UF é obrigatória' 
      });
    }
    
    logger.info(`Verificando ST para produto ${codigo} e UF ${uf}`);
    
    // Buscar dados do produto apenas para validar que ele existe
    const produto = await knex('produtos')
      .where('codigo', codigo)
      .first();
    
    if (!produto) {
      return res.status(404).json({ 
        success: false,
        error: `Produto com código ${codigo} não encontrado` 
      });
    }

    // Verificar se o produto é importado com base no código de origem
    // Códigos: 0-Nacional, 1-Estrangeira ImportDireta, 2-Estrangeira MercInterno, 3-8=Outras
    const codOrigemProd = produto.cod_origem_prod || '0';
    const isImportado = ['1', '2'].includes(codOrigemProd);
    logger.info(`Produto ${codigo} tem origem ${codOrigemProd} (${isImportado ? 'Importado' : 'Nacional'})`);

    // CORREÇÃO: Usar EXCLUSIVAMENTE a tabela regras_fiscais_produtos
    // para obter cod_regra_icms, sem fallback para a tabela produtos
    const regraFiscalProduto = await knex('regras_fiscais_produtos')
      .where({
        'cod_produto': codigo
      })
      .first();
    
    if (!regraFiscalProduto || !regraFiscalProduto.cod_regra_icms) {
      // Se não encontrar na tabela regras_fiscais_produtos, retornar erro
      return res.status(404).json({
        success: false,
        error: `Produto ${codigo} não possui regra fiscal configurada na tabela regras_fiscais_produtos`,
        temST: false
      });
    }
    
    const codRegraIcms = regraFiscalProduto.cod_regra_icms;
    logger.info(`Produto ${codigo} usa cod_regra_icms ${codRegraIcms} da tabela regras_fiscais_produtos`);
    
    // Buscar informações de ST
    let temST = false;
    let cstIcms = '';
    let aliqIcms = 0;
    let redIcms = 0;
    let aliqInterna = 0;
    let detalhes = {};
    
    // Agora consultar a tabela regras_icms_itens
    // Primeiro tenta buscar com empresa = 1
    let regraIcmsItem = await knex('regras_icms_itens')
      .where({
        'cod_regra_icms': codRegraIcms,
        'uf': uf,
        'cod_empresa': 1
      })
      .first();
    
    if (regraIcmsItem) {
      // Verificar diretamente pelo campo icms_st da tabela regras_icms_itens
      if (regraIcmsItem.icms_st === 'S') {
        temST = true;
        logger.info(`Produto ${codigo} tem ST baseado no campo icms_st='S' da tabela regras_icms_itens`);
      }
      
      // CSTs que indicam Substituição Tributária como fallback
      const cstsComST = ['10', '30', '60', '70', '201', '202', '203'];
      
      // Verificar se o cliente é contribuinte ou não
      const isTipoContribuinte = req.query.tipo_cliente === '1';
      
      // Obter o CST adequado com base no tipo de cliente
      if (isTipoContribuinte) {
        cstIcms = regraIcmsItem.st_icms_contr || '';
        aliqIcms = parseFloat(regraIcmsItem.aliq_icms_contr || 0);
        redIcms = parseFloat(regraIcmsItem.red_icms_contr || 0);
      } else {
        cstIcms = regraIcmsItem.st_icms || '';
        aliqIcms = parseFloat(regraIcmsItem.aliq_icms || 0);
        redIcms = parseFloat(regraIcmsItem.red_icms || 0);
      }
      
      // Verificar também pelo CST se ainda não tem ST
      if (!temST && cstsComST.includes(cstIcms)) {
        temST = true;
        logger.info(`Produto ${codigo} tem ST baseado no CST ${cstIcms}`);
      }
      
      // Verificar se tem alíquota interna que pode indicar ST
      aliqInterna = parseFloat(regraIcmsItem.aliq_interna || 0);
      if (!temST && aliqInterna > 0 && cstsComST.includes(cstIcms)) {
        // Se tem alíquota interna e o CST é compatível, possivelmente tem ST
        temST = true;
        logger.info(`Produto ${codigo} tem ST baseado na alíquota interna ${aliqInterna} e CST ${cstIcms}`);
      }

      // Buscar classificação fiscal para obter informações de IVA e alíquota importado
      let ivaImportado = 0;
      let aliqImportado = 0;
      
      if (produto.class_fiscal && isImportado) {
        try {
          // Primeiro buscar a classificação fiscal
          const classFiscal = await knex('class_fiscal')
            .where('cod_ncm', produto.class_fiscal)
            .first();
            
          if (classFiscal) {
            // Depois buscar os dados específicos para a UF
            const dadosClass = await knex('class_fiscal_dados')
              .where({
                'cod_ncm': produto.class_fiscal,
                'uf': uf
              })
              .first();
              
            if (dadosClass) {
              ivaImportado = parseFloat(dadosClass.iva_importado || 0);
              aliqImportado = parseFloat(dadosClass.aliq_importado || 0);
              
              logger.info(`Produto importado ${codigo} na UF ${uf} tem IVA importado=${ivaImportado}% e alíquota importado=${aliqImportado}%`);
            }
          }
        } catch (error) {
          logger.warn(`Erro ao buscar dados de classificação fiscal para produto importado ${codigo}:`, error);
        }
      }
      
      // Montar detalhes fiscais com mais informações
      detalhes = {
        origem: 'regras_fiscais_produtos',
        cstIcms,
        icmsSt: regraIcmsItem.icms_st,
        aliqIcms,
        redIcms,
        aliqInterna,
        possivelST: aliqInterna > 0 && cstsComST.includes(cstIcms),
        codRegraFiscalProduto: regraFiscalProduto.id,
        codOrigemProd,
        isImportado,
        ivaImportado: isImportado ? ivaImportado : 0,
        aliqImportado: isImportado ? aliqImportado : 0
      };
      
      return res.json({
        success: true,
        temST,
        codRegraIcms,
        detalhes
      });
    } else {
      // Se não encontrar regras na tabela regras_icms_itens, retornar erro
      return res.status(404).json({
        success: false,
        error: `Regras fiscais não encontradas para o produto ${codigo} com cod_regra_icms ${codRegraIcms} e UF ${uf}`,
        temST: false
      });
    }
  } catch (error) {
    logger.error(`Erro ao verificar ST para produto ${req.params.codigo}:`, error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao verificar substituição tributária',
      message: error.message
    });
  }
};

/**
 * Calcular ICMS-ST com base nas regras fiscais de um produto para uma UF específica
 */
const calcularIcmsST = async (req, res) => {
  try {
    const { 
      codigoProduto, 
      ufDestino, 
      valorProduto, 
      valorIpi, 
      tipoContribuinte,
      valorDesconto = 0,
      isImportado = false
    } = req.body;
    
    if (!codigoProduto) {
      return res.status(400).json({ 
        success: false,
        error: 'Código do produto é obrigatório' 
      });
    }
    
    if (!ufDestino) {
      return res.status(400).json({ 
        success: false,
        error: 'UF de destino é obrigatória' 
      });
    }
    
    if (!valorProduto && valorProduto !== 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Valor do produto é obrigatório' 
      });
    }
    
    logger.info(`Calculando ICMS-ST para produto ${codigoProduto}, UF ${ufDestino}, valor ${valorProduto}, desconto ${valorDesconto}, produto importado: ${isImportado}`);
    
    // Chamar o método calcularIcmsST do serviço fiscalRulesService
    const resultado = await fiscalRulesService.calcularIcmsST({
      codigoProduto,
      ufDestino,
      valorProduto: parseFloat(valorProduto),
      valorIpi: valorIpi ? parseFloat(valorIpi) : 0,
      tipoContribuinte: tipoContribuinte === true || tipoContribuinte === 'true' || tipoContribuinte === '1',
      valorDesconto: valorDesconto ? parseFloat(valorDesconto) : 0,
      isImportado: isImportado === true || isImportado === 'true' || isImportado === '1'
    });
    
    if (!resultado.success) {
      return res.status(400).json(resultado);
    }
    
    return res.json(resultado);
  } catch (error) {
    logger.error(`Erro ao calcular ICMS-ST: ${error.message}`, error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao calcular ICMS Substituição Tributária',
      message: error.message
    });
  }
};

module.exports = {
  getDadosFiscaisProduto,
  getDadosFiscaisProdutoResiliente,
  getRegrasIcms,
  getDadosClassFiscal,
  getDadosClassFiscalCompletos,
  calcularTributosProduto,
  calcularImpostosProduto,
  getProdutoFiscal,
  getRegrasFiscaisProduto,
  getRegraCalculoProdutoUF,
  getRegrasIcmsERP,
  setRegrasFiscaisProduto,
  verificarSubstituicaoTributaria,
  calcularIcmsST
};