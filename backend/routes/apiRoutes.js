const express = require('express');
const router = express.Router();
const syncService = require('../services/syncService');
const knex = require('../database/connection');
const produtoRoutes = require('./produtoRoutes'); // Importar rotas de produtos
const logger = require('../utils/logger');
const erpConnection = require('../database/erpConnection');
const authMiddleware = require('../middlewares/auth');
const authController = require('../controllers/authController');
const orcamentoController = require('../controllers/orcamentoController');
const usuarioVendedorController = require('../controllers/usuarioVendedorController');
const vendedorTokenController = require('../controllers/vendedorTokenController');

// Controllers disponíveis
const fiscalController = require('../controllers/fiscalController');
const syncController = require('../controllers/syncController');
const paymentController = require('../controllers/paymentController');

// Importar o controlador de configurações
const configurationController = require('../controllers/configurationController');

// Inicializar padronização de status quando o servidor iniciar
orcamentoController.padronizarStatus().then(result => {
  if (result) {
    console.log('✅ Status dos orçamentos padronizados na inicialização do servidor');
  } else {
    console.log('⚠️ Não foi possível padronizar os status dos orçamentos na inicialização');
  }
}).catch(error => {
  console.error('❌ Erro ao padronizar status dos orçamentos:', error);
});

// Rota para buscar vendedor vinculado a um usuário pelo ID
router.get('/usuarios/:id/vendedor', authMiddleware.authenticateToken, usuarioVendedorController.buscarVendedorPorUsuarioId);

// Rota para buscar a posição de estoque de um produto
router.get('/produtos/estoque/:codigo', async (req, res) => {
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
          success: true,
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

// Rotas de Produtos
router.get('/produtos', async (req, res) => {
  try {
    const produtos = await syncService.getProducts();
    res.json(produtos);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rota de busca de produtos - Movida para antes da rota por ID para evitar conflitos
router.get('/produtos/busca', async (req, res) => {
  try {
    const { termo } = req.query;
    
    if (!termo || termo.length < 2) {
      return res.json([]);
    }
    
    const produtos = await syncService.searchProducts(termo);
    res.json(produtos);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rota para obter produto por ID
router.get('/produtos/:id', async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id);
    const produto = await syncService.getProductById(id);
    
    if (!produto) {
      return res.status(404).json({
        success: false,
        message: `Produto com ID ${id} não encontrado`
      });
    }
    
    res.json(produto);
  } catch (error) {
    console.error(`Erro ao buscar produto ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rota para criar produto
router.post('/produtos', async (req, res) => {
  try {
    const produto = req.body;
    const novoProduto = await syncService.createProduct(produto);
    res.status(201).json(novoProduto);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rota para atualizar produto
router.put('/produtos/:id', async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id);
    const produto = req.body;
    const produtoAtualizado = await syncService.updateProduct(id, produto);
    
    if (!produtoAtualizado) {
      return res.status(404).json({
        success: false,
        message: `Produto com ID ${id} não encontrado`
      });
    }
    
    res.json(produtoAtualizado);
  } catch (error) {
    console.error(`Erro ao atualizar produto ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rota para excluir produto
router.delete('/produtos/:id', async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id);
    const resultado = await syncService.deleteProduct(id);
    
    if (!resultado) {
      return res.status(404).json({
        success: false,
        message: `Produto com ID ${id} não encontrado`
      });
    }
    
    res.json({
      success: true,
      message: `Produto ${id} excluído com sucesso`
    });
  } catch (error) {
    console.error(`Erro ao excluir produto ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rota de categorias de produtos
router.get('/categorias', async (req, res) => {
  try {
    // Como parece não existir um método específico para categorias,
    // retornaremos uma lista padrão básica para evitar erros 404
    res.json([
      { id: 1, codigo: 1, nome: 'Geral' },
      { id: 2, codigo: 2, nome: 'Acabamentos' },
      { id: 3, codigo: 3, nome: 'Estruturais' },
      { id: 4, codigo: 4, nome: 'Madeiras' },
      { id: 5, codigo: 5, nome: 'Ferragens' }
    ]);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rotas de Clientes
router.get('/clientes', async (req, res) => {
  try {
    const clientes = await syncService.getCustomers();
    res.json(clientes);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Nova rota para buscar clientes por vendedor
router.get('/clientes/vendedor/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID do vendedor é obrigatório'
      });
    }
    
    console.log(`API: Buscando clientes para o vendedor ID ${id}`);
    
    // Tentar usar a função do controlador de cliente
    try {
      const clienteController = require('../controllers/clienteController');
      return await clienteController.buscarPorVendedor(req, res);
    } catch (controllerError) {
      console.error('Erro ao usar o controlador de cliente:', controllerError);
      
      // Fallback: Usar o campo cod_vendedor1 para filtrar os clientes do vendedor
      console.log('Usando fallback com syncService');
      const clientes = await syncService.getCustomers({ cod_vendedor1: id });
      
      console.log(`Clientes encontrados via syncService: ${clientes.length}`);
      
      return res.json({
        success: true,
        data: clientes,
        source: 'syncService'
      });
    }
  } catch (error) {
    console.error(`Erro ao buscar clientes do vendedor ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rota de busca de clientes
router.get('/clientes/busca', async (req, res) => {
  try {
    const { termo } = req.query;
    
    if (!termo || termo.length < 2) {
      return res.json([]);
    }
    
    const clientes = await syncService.searchCustomers(termo);
    res.json(clientes);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rota para buscar cliente por código
router.get('/clientes/codigo/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    
    if (!codigo) {
      return res.status(400).json({
        success: false,
        message: 'Código do cliente não informado'
      });
    }
    
    const cliente = await syncService.getCustomerByCode(codigo);
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      });
    }
    
    res.json(cliente);
  } catch (error) {
    console.error(`Erro ao buscar cliente por código ${req.params.codigo}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rotas de Vendedores
router.get('/vendedores', async (req, res) => {
  try {
    const vendedores = await syncService.getSellers();
    res.json(vendedores);
  } catch (error) {
    console.error('Erro ao buscar vendedores:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rota para buscar vendedor por ID
router.get('/vendedores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID do vendedor não informado'
      });
    }
    
    const vendedor = await knex('vendedores')
      .select('codigo', 'nome')
      .where('codigo', id)
      .first();
    
    if (!vendedor) {
      return res.status(404).json({
        success: false,
        message: 'Vendedor não encontrado'
      });
    }
    
    res.json(vendedor);
  } catch (error) {
    console.error(`Erro ao buscar vendedor ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rota de busca de vendedores
router.get('/vendedores/busca', async (req, res) => {
  try {
    const { termo } = req.query;
    
    if (!termo || termo.length < 2) {
      return res.json([]);
    }
    
    const vendedores = await syncService.searchSellers(termo);
    res.json(vendedores);
  } catch (error) {
    console.error('Erro ao buscar vendedores:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rotas de Formas de Pagamento
router.get('/formas-pagamento', async (req, res) => {
  try {
    const formasPagamento = await syncService.getPaymentMethods();
    res.json(formasPagamento);
  } catch (error) {
    console.error('Erro ao buscar formas de pagamento:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rota para buscar forma de pagamento por ID
router.get('/formas-pagamento/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID da forma de pagamento não informado'
      });
    }
    
    // Verificar se as tabelas existem
    const formasTableExists = await knex.schema.hasTable('formas_pagto');
    const formTableExists = await knex.schema.hasTable('form_pagto');
    
    // Determinar qual tabela usar
    const tableName = formTableExists ? 'form_pagto' : 'formas_pagto';
    
    const formaPagamento = await knex(tableName)
      .select('codigo', 'descricao')
      .where('codigo', id)
      .first();
    
    if (!formaPagamento) {
      return res.status(404).json({
        success: false,
        message: 'Forma de pagamento não encontrada'
      });
    }
    
    res.json(formaPagamento);
  } catch (error) {
    console.error(`Erro ao buscar forma de pagamento ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rotas de Condições de Pagamento
router.get('/condicoes-pagamento', async (req, res) => {
  try {
    const condicoesPagamento = await syncService.getPaymentTerms();
    res.json(condicoesPagamento);
  } catch (error) {
    console.error('Erro ao buscar condições de pagamento:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rota para buscar condição de pagamento por ID
router.get('/condicoes-pagamento/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID da condição de pagamento não informado'
      });
    }
    
    const condicaoPagamento = await knex('cond_pagto')
      .select('codigo', 'descricao')
      .where('codigo', id)
      .first();
    
    if (!condicaoPagamento) {
      return res.status(404).json({
        success: false,
        message: 'Condição de pagamento não encontrada'
      });
    }
    
    res.json(condicaoPagamento);
  } catch (error) {
    console.error(`Erro ao buscar condição de pagamento ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rotas públicas de autenticação
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);
router.post('/auth/verificar-token', authController.verificarToken);

// Rota pública para validar token de vendedor (não requer autenticação)
router.get('/vendedor-token/validar/:token', vendedorTokenController.validarToken);

// Middleware de autenticação para rotas protegidas
router.use(authMiddleware.authenticateToken);

// Rotas de vínculo usuário-vendedor
router.get('/usuario-vendedor', usuarioVendedorController.buscarVinculoUsuario);
router.get('/usuario-vendedor/todos', usuarioVendedorController.listarVinculos);
router.post('/usuario-vendedor', usuarioVendedorController.criarVinculo);
router.delete('/usuario-vendedor/:usuario_id/:vendedor_codigo', usuarioVendedorController.removerVinculo);

// Rotas de token de vendedor (requerem autenticação)
router.get('/vendedor-token', vendedorTokenController.listarTokens);
router.post('/vendedor-token', vendedorTokenController.gerarToken);
router.post('/vendedor-token/usar', vendedorTokenController.usarToken);
router.put('/vendedor-token/desativar/:id', vendedorTokenController.desativarToken);

// Rotas protegidas
// Rotas de orçamentos
router.get('/orcamentos', orcamentoController.list);
router.get('/orcamentos/:id', orcamentoController.getById);
router.post('/orcamentos', orcamentoController.create);
router.put('/orcamentos/:id', orcamentoController.update);
router.delete('/orcamentos/:id', orcamentoController.delete);
router.post('/orcamentos/:id/duplicate', orcamentoController.duplicate);
router.post('/orcamentos/:id/aprovar', orcamentoController.approve);
router.get('/orcamentos/:id/pdf', orcamentoController.generatePdf);

// Rota para aplicar desconto com validação
router.post('/orcamentos/aplicar-desconto', async (req, res) => {
  try {
    const { productId, requestedDiscount, unitPrice } = req.body;
    
    if (!productId || requestedDiscount === undefined || !unitPrice) {
      return res.status(400).json({
        error: 'Parâmetros obrigatórios: productId, requestedDiscount, unitPrice'
      });
    }
    
    const result = await syncService.applyDiscount(productId, requestedDiscount, unitPrice);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Erro ao aplicar desconto:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// Endpoint para relatório fiscal de orçamento
router.get('/orcamentos/:id/fiscal', async (req, res) => {
  try {
    const { id } = req.params;
    const erpConnection = require('../database/erpConnection');
    
    // Buscar orçamento
    const orcamento = await knex('orcamentos')
      .where('orcamentos.codigo', id)
      .first();
      
    if (!orcamento) {
      return res.status(404).json({
        success: false,
        message: 'Orçamento não encontrado'
      });
    }

    // Buscar cliente diretamente do ERP
    const cliente = await erpConnection('clientes')
      .where('codigo', orcamento.cod_cliente)
      .select(
        'codigo',
        'razao',
        'uf',
        'cod_ibge',
        'municipio'
      )
      .first();
    
    // Buscar itens com informações fiscais
    const itens = await knex('orcamentos_itens')
      .where('orcamento_codigo', id)
      .select(
        'orcamentos_itens.*',
        'produtos.descricao as produto_descricao'
      )
      .leftJoin('produtos', 'produtos.codigo', 'orcamentos_itens.produto_codigo');
      
    // Calcular totais fiscais
    const totaisFiscais = {
      base_icms: 0,
      valor_icms: 0,
      base_icms_st: 0,
      valor_icms_st: 0,
      valor_ipi: 0,
      valor_fcp_st: 0,
      total_impostos: 0
    };
    
    // Processar cada item para totalizar valores
    itens.forEach(item => {
      totaisFiscais.base_icms += parseFloat(item.base_icms || 0);
      totaisFiscais.valor_icms += parseFloat(item.valor_icms || 0);
      totaisFiscais.base_icms_st += parseFloat(item.base_icms_st || 0);
      totaisFiscais.valor_icms_st += parseFloat(item.valor_icms_st || 0);
      totaisFiscais.valor_ipi += parseFloat(item.valor_ipi || 0);
      totaisFiscais.valor_fcp_st += parseFloat(item.valor_fcp_st || 0);
      
      // Total de impostos deste item
      const impostoItem = parseFloat(item.valor_icms || 0) + 
                        parseFloat(item.valor_icms_st || 0) + 
                        parseFloat(item.valor_ipi || 0) + 
                        parseFloat(item.valor_fcp_st || 0);
                        
      totaisFiscais.total_impostos += impostoItem;
    });
    
    // Retornar relatório fiscal completo
    res.json({
      success: true,
      data: {
        orcamento: {
          codigo: orcamento.codigo,
          data: orcamento.dt_orcamento,
          cliente: {
            codigo: cliente?.codigo || orcamento.cod_cliente,
            nome: cliente?.razao || 'Cliente não encontrado',
            uf: cliente?.uf || 'SP',
            cod_ibge: cliente?.cod_ibge || '',
            municipio: cliente?.municipio || ''
          },
          valor_total: parseFloat(orcamento.vl_total),
          valor_produtos: parseFloat(orcamento.vl_produtos),
          valor_impostos: parseFloat(orcamento.vl_impostos)
        },
        itens: itens.map(item => ({
          codigo: item.codigo,
          produto: {
            codigo: item.produto_codigo,
            descricao: item.produto_descricao
          },
          quantidade: parseFloat(item.quantidade),
          valor_unitario: parseFloat(item.valor_unitario),
          valor_total: parseFloat(item.valor_total),
          fiscal: {
            ncm: item.ncm,
            cest: item.cest,
            origem: item.cod_origem_prod,
            situacao_tributaria: item.situacao_tributaria,
            base_icms: parseFloat(item.base_icms || 0),
            aliquota_icms: parseFloat(item.aliq_icms || 0),
            valor_icms: parseFloat(item.valor_icms || 0),
            base_icms_st: parseFloat(item.base_icms_st || 0),
            valor_icms_st: parseFloat(item.valor_icms_st || 0),
            aliquota_ipi: parseFloat(item.aliq_ipi || 0),
            valor_ipi: parseFloat(item.valor_ipi || 0),
            valor_fcp_st: parseFloat(item.valor_fcp_st || 0),
            total_impostos: parseFloat(item.valor_icms || 0) + 
                         parseFloat(item.valor_icms_st || 0) + 
                         parseFloat(item.valor_ipi || 0) + 
                         parseFloat(item.valor_fcp_st || 0)
          }
        })),
        totais_fiscais: totaisFiscais
      }
    });
    
  } catch (error) {
    console.error(`Erro ao gerar relatório fiscal do orçamento ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rota para calcular parcelas
router.post('/calcular-parcelas', async (req, res) => {
  try {
    const { condicao_pagamento, valor_total } = req.body;
    
    if (!condicao_pagamento || !valor_total) {
      return res.status(400).json({
        success: false,
        message: 'Condição de pagamento e valor total são obrigatórios'
      });
    }

    const parcelas = await syncService.calcularParcelas(condicao_pagamento, valor_total);
    res.json(parcelas);
  } catch (error) {
    console.error('Erro ao calcular parcelas:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rota para calcular tributos de um produto (POST para evitar problemas com URL)
router.post('/produtos/calcular-tributos', async (req, res) => {
  try {
    const { codigoProduto, quantidade, cliente } = req.body;
    
    if (!codigoProduto || !quantidade || !cliente) {
      return res.status(400).json({ 
        error: 'Dados incompletos',
        details: 'codigoProduto, quantidade e cliente são obrigatórios'
      });
    }
    
    console.log(`Calculando tributos para produto ${codigoProduto} (qt: ${quantidade}), cliente: ${cliente.codigo}`);
    
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
      produto = await syncService.getProductById(codigo);
      
      if (produto) {
        console.log(`Produto encontrado com código: ${codigo}`);
        break;
      }
    }
    
    if (!produto) {
      console.warn(`Produto não encontrado após tentar todas as variações: ${codigoProduto}`);
      return res.status(404).json({ 
        error: 'Produto não encontrado',
        details: {
          codigoProduto,
          tentativas
        }
      });
    }
    
    // Buscar regras de ICMS
    const regrasIcms = await syncService.getFiscalRules(produto.cod_regra_icms);
      
    // Retornar dados básicos para cálculos no frontend
    res.json({
      produto,
      regrasIcms,
      tributacao: {
        aliquotaIcms: produto.aliq_icms || 0,
        aliquotaIpi: produto.aliq_ipi || 0,
        baseCalculo: produto.preco_venda * quantidade,
        valorTotalBruto: produto.preco_venda * quantidade
      }
    });
    
  } catch (error) {
    console.error('Erro ao calcular tributos do produto:', error);
    res.status(500).json({ 
      error: 'Erro ao calcular tributos do produto',
      details: error.message
    });
  }
});

// Rota para buscar dados da classificação fiscal
router.get('/class-fiscal-dados', async (req, res) => {
  try {
    const { ncm, uf, ufEmpresa } = req.query;
    
    console.log(`Buscando dados fiscais para NCM ${ncm} - UF Cliente: ${uf}, UF Empresa: ${ufEmpresa}`);
    
    if (!ncm) {
      return res.status(400).json({ 
        error: 'Dados incompletos',
        details: 'NCM é obrigatório'
      });
    }
    
    // Buscar classificação fiscal pelo NCM
    let classFiscal = await knex('class_fiscal')
      .where('cod_ncm', ncm)
      .first();
    
    // Se não encontrou pelo NCM exato, tenta buscar pelo NCM parcial (primeiros dígitos)
    if (!classFiscal && ncm.length >= 4) {
      const ncmPrefix = ncm.substring(0, 4); // Primeiros 4 dígitos
      classFiscal = await knex('class_fiscal')
        .whereRaw('cod_ncm LIKE ?', [`${ncmPrefix}%`])
        .first();
    }
    
    // Se ainda não encontrou, usar classificação fiscal padrão
    if (!classFiscal) {
      console.warn(`Classificação fiscal não encontrada para NCM ${ncm}, usando padrão`);
      classFiscal = {
        codigo: 1,
        cod_ncm: ncm || '00000000',
        descricao: 'CLASSIFICAÇÃO PADRÃO'
      };
    }
    
    // Buscar dados específicos para a UF
    let dadosFiscais = null;
    
    if (uf) {
      dadosFiscais = await knex('class_fiscal_dados')
        .where({
          'cod_class_fiscal': classFiscal.codigo,
          'uf': uf
        })
        .first();
    }
    
    // Se não encontrou dados para a UF, tenta buscar dados para a UF da empresa
    if (!dadosFiscais && ufEmpresa) {
      dadosFiscais = await knex('class_fiscal_dados')
        .where({
          'cod_class_fiscal': classFiscal.codigo,
          'uf': ufEmpresa
        })
        .first();
    }
    
    // Se ainda não encontrou, usar dados padrão
    if (!dadosFiscais) {
      console.warn(`Dados fiscais não encontrados para NCM ${ncm} e UF ${uf}, usando padrão`);
      dadosFiscais = {
        cod_class_fiscal: classFiscal.codigo,
        uf: uf || 'SP',
        aliq_fcp: 0,
        aliq_fcpst: 0,
        aliq_pst: 0,
        iva: 0,
        aliq_interna: 18,
        iva_diferenciado: 0,
        cest: '',
        iva_importado: 0,
        aliq_importado: 0
      };
    }
    
    // Combinar dados da classificação fiscal com dados específicos por UF
    const result = {
      ...classFiscal,
      ...dadosFiscais
    };
    
    console.log(`Dados fiscais retornados para NCM ${ncm}:`, result);
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar dados da classificação fiscal:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar dados da classificação fiscal',
      details: error.message
    });
  }
});

// Rota para buscar regras de ICMS
router.get('/regras-icms', async (req, res) => {
  try {
    const { codigo, uf, tipo, ufEmpresa, codRegime } = req.query;
    
    console.log(`Buscando regras ICMS: código ${codigo}, UF ${uf}, tipo ${tipo}, regime ${codRegime}`);
    
    if (!codigo) {
      return res.status(400).json({ 
        error: 'Dados incompletos',
        details: 'Código da regra é obrigatório'
      });
    }
    
    // Buscar cadastro da regra de ICMS
    const regraIcms = await knex('regras_icms_cadastro')
      .where('codigo', codigo)
      .first();
    
    if (!regraIcms) {
      console.warn(`Regra de ICMS ${codigo} não encontrada, usando padrão`);
      return res.json({
        codigo: codigo,
        acrescimo_icms: 'N',
        st_icms: '00',
        aliq_icms: 18,
        red_icms: 0,
        st_icms_contr: '00',
        aliq_icms_contr: 18,
        red_icms_contr: 0,
        icms_st: 'N',
        st_icms_contr_reg_sn: '00',
        aliq_icms_contr_reg_sn: 18,
        red_icms_contr_reg_sn: 0,
        aliq_dif_icms_contr: 0,
        aliq_dif_icms_cons: 0
      });
    }
    
    // Buscar item específico da regra para a UF
    let regraItem = null;
    if (uf) {
      regraItem = await knex('regras_icms_itens')
        .where({
          'cod_regra_icms': codigo,
          'uf': uf
        })
        .first();
    }
    
    // Se não encontrou para a UF, tenta a UF da empresa
    if (!regraItem && ufEmpresa) {
      regraItem = await knex('regras_icms_itens')
        .where({
          'cod_regra_icms': codigo,
          'uf': ufEmpresa
        })
        .first();
    }
    
    // Se ainda não encontrou, busca uma regra geral para SP
    if (!regraItem) {
      regraItem = await knex('regras_icms_itens')
        .where({
          'cod_regra_icms': codigo,
          'uf': 'SP'
        })
        .first();
    }
    
    // Se não encontrou nenhuma regra, use valores padrão
    if (!regraItem) {
      console.warn(`Item da regra de ICMS ${codigo} para UF ${uf} não encontrado, usando padrão`);
      regraItem = {
        cod_regra_icms: codigo,
        uf: uf || 'SP',
        st_icms: '00',
        aliq_icms: 18,
        red_icms: 0,
        st_icms_contr: '00',
        aliq_icms_contr: 18,
        red_icms_contr: 0,
        icms_st: 'N',
        icms_st_reg_sn: 'N',
        st_icms_contr_reg_sn: '00',
        aliq_icms_contr_reg_sn: 18,
        red_icms_contr_reg_sn: 0,
        aliq_dif_icms_contr: 0,
        aliq_dif_icms_cons: 0
      };
    }
    
    // Verificar se é operação interestadual
    const isOperacaoInterestadual = uf && ufEmpresa && uf !== ufEmpresa;
    
    // Combinar dados do cadastro com item específico da regra
    const result = {
      ...regraIcms,
      ...regraItem,
      isOperacaoInterestadual
    };
    
    console.log(`Regra ICMS retornada: ${JSON.stringify(result)}`);
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar regras de ICMS:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar regras de ICMS',
      details: error.message
    });
  }
});

// Fiscal routes
// Endpoint para dados fiscais do produto
router.get('/produtos/dados-fiscais/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const fiscalRulesService = require('../services/fiscalRulesService');
    
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
    console.error(`Erro ao buscar dados fiscais do produto ${req.params.codigo}:`, error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar dados fiscais do produto',
      message: error.message
    });
  }
});

// Rotas de regras fiscais para produtos
router.get('/produtos/:codigo/regras-fiscais', async (req, res) => {
  try {
    const { codigo } = req.params;
    const productFiscalRulesService = require('../services/productFiscalRulesService');
    
    const regras = await productFiscalRulesService.getFiscalRules(codigo);
    
    if (!regras) {
      return res.status(404).json({
        success: false,
        message: 'Regras fiscais não encontradas para este produto'
      });
    }
    
    res.json({
      success: true,
      data: regras
    });
  } catch (error) {
    console.error(`Erro ao buscar regras fiscais do produto ${req.params.codigo}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/produtos/:codigo/regras-fiscais', async (req, res) => {
  try {
    const { codigo } = req.params;
    const productFiscalRulesService = require('../services/productFiscalRulesService');
    
    // Garantir que o código do produto esteja nos dados
    const dados = {
      ...req.body,
      cod_produto: codigo
    };
    
    const regras = await productFiscalRulesService.saveFiscalRules(dados);
    
    res.status(201).json({
      success: true,
      data: regras
    });
  } catch (error) {
    console.error(`Erro ao salvar regras fiscais do produto ${req.params.codigo}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Endpoint para calcular tributos de um produto com as regras específicas
router.post('/produtos/:codigo/calcular-tributos', async (req, res) => {
  try {
    const { codigo } = req.params;
    const productFiscalRulesService = require('../services/productFiscalRulesService');
    
    // Adicionar código do produto aos parâmetros
    const params = {
      ...req.body,
      produto_codigo: codigo
    };
    
    const resultado = await productFiscalRulesService.calculateTaxes(params);
    
    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error(`Erro ao calcular tributos do produto ${req.params.codigo}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Endpoint para calcular ICMS-ST com base nas regras fiscais
router.post('/fiscal/calcular-icms-st', async (req, res) => {
  await fiscalController.calcularIcmsST(req, res);
});

// Pedidos
// Listar todos os pedidos
router.get('/pedidos', async (req, res) => {
  try {
    const pedidos = await knex('pedidos')
      .select(
        'pedidos.*',
        'clientes.nome as cliente_nome',
        'vendedores.nome as vendedor_nome'
      )
      .leftJoin('clientes', 'pedidos.cod_cliente', 'clientes.codigo')
      .leftJoin('vendedores', 'pedidos.cod_vendedor', 'vendedores.codigo')
      .orderBy('pedidos.dt_pedido', 'desc');

    res.json({
      success: true,
      data: pedidos
    });
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao listar pedidos',
      message: error.message
    });
  }
});

// Buscar pedido por ID
router.get('/pedidos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const pedido = await knex('pedidos')
      .select(
        'pedidos.*',
        'clientes.nome as cliente_nome',
        'vendedores.nome as vendedor_nome'
      )
      .leftJoin('clientes', 'pedidos.cod_cliente', 'clientes.codigo')
      .leftJoin('vendedores', 'pedidos.cod_vendedor', 'vendedores.codigo')
      .where('pedidos.codigo', id)
      .first();

    if (!pedido) {
      return res.status(404).json({ 
        success: false,
        error: 'Pedido não encontrado' 
      });
    }

    // Buscar itens do pedido
    const itens = await knex('pedidos_itens')
      .select(
        'pedidos_itens.*',
        'produtos.descricao as produto_descricao'
      )
      .leftJoin('produtos', 'pedidos_itens.produto_codigo', 'produtos.codigo')
      .where('pedidos_itens.pedido_codigo', id);

    res.json({
      success: true,
      data: {
        pedido,
        itens
      }
    });
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar pedido',
      message: error.message
    });
  }
});

// Rotas de Estados (UF)
router.get('/estados', async (req, res) => {
  try {
    const estados = await knex('estados')
      .select('*')
      .orderBy('nome');
    
    res.json(estados);
  } catch (error) {
    console.error('Erro ao buscar estados:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rota para buscar estado específico por UF
router.get('/estados/:uf', async (req, res) => {
  try {
    const { uf } = req.params;
    
    if (!uf) {
      return res.status(400).json({
        success: false,
        message: 'UF não informada'
      });
    }
    
    const estado = await knex('estados')
      .where('uf', uf.toUpperCase())
      .first();
    
    if (!estado) {
      return res.status(404).json({
        success: false,
        message: 'Estado não encontrado'
      });
    }
    
    res.json(estado);
  } catch (error) {
    console.error(`Erro ao buscar estado pela UF ${req.params.uf}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rota para listar todos os usuários (apenas para administradores)
router.get('/usuarios', authMiddleware.authenticateToken, async (req, res) => {
  try {
    // Verificar se o usuário é administrador
    if (req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso não autorizado'
      });
    }

    const usuarios = await knex('usuarios')
      .select('id', 'nome', 'email', 'role', 'ativo', 'dt_inc')
      .orderBy('nome');

    // Remover senhas dos registros
    usuarios.forEach(usuario => {
      delete usuario.senha;
    });

    return res.json({
      success: true,
      data: usuarios
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rota para obter usuário por ID (apenas para administradores)
router.get('/usuarios/:id', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o usuário é administrador ou está buscando seu próprio perfil
    if (req.userRole !== 'admin' && parseInt(req.userId) !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso não autorizado'
      });
    }

    const usuario = await knex('usuarios')
      .where('id', id)
      .select('id', 'nome', 'email', 'role', 'ativo', 'dt_inc')
      .first();

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Buscar vendedor vinculado, se existir
    const vendedor = await knex('usuario_vendedor')
      .where('usuario_id', id)
      .join('vendedores', 'usuario_vendedor.vendedor_codigo', 'vendedores.codigo')
      .select('vendedores.*')
      .first();

    return res.json({
      success: true,
      data: {
        ...usuario,
        vendedor: vendedor || null
      }
    });
  } catch (error) {
    console.error(`Erro ao buscar usuário ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});



// Rotas para configurações
// Primeiro as rotas específicas
router.get('/configurations/stock-validation/settings', authMiddleware.authenticateToken, configurationController.getStockValidationConfig);
router.put('/configurations/stock-validation/settings', authMiddleware.authenticateToken, authMiddleware.isAdmin, configurationController.updateStockValidationConfig);

// Depois as rotas genéricas
router.get('/configurations', authMiddleware.authenticateToken, configurationController.list);
router.get('/configurations/:key', authMiddleware.authenticateToken, configurationController.get);
router.put('/configurations/:key', authMiddleware.authenticateToken, authMiddleware.isAdmin, configurationController.update);

module.exports = router; 