const express = require('express');
const router = express.Router();
const connection = require('../database/connection');
const logger = require('../utils/logger');
const PedidoController = require('../controllers/pedidoController');

// Rota de diagnóstico para verificar tabelas no ERP
router.get('/verificar-tabelas-workflow', PedidoController.verificarTabelasWorkflow);

// Novas rotas do workflow
// Listar pedidos por vendedor com informações de workflow do ERP
router.get('/vendedor/:vendedor_id/pedidos-workflow', PedidoController.listarPedidosPorVendedor);

// Buscar detalhes de um pedido específico com seu workflow
router.get('/workflow/:pedido_id', PedidoController.buscarPedidoComWorkflow);

// Listar todos os status de workflow disponíveis
router.get('/workflow-status/listar', PedidoController.listarStatusWorkflow);

// Nova rota para listar pedidos por vendedor (sem workflow)
router.get('/vendedor/:vendedor_id', async (req, res) => {
  try {
    const { vendedor_id } = req.params;
    
    if (!vendedor_id) {
      logger.error('ID do vendedor não fornecido na requisição');
      return res.status(400).json({
        success: false,
        message: 'É necessário informar o ID do vendedor'
      });
    }
    
    logger.info(`Buscando pedidos para o vendedor ${vendedor_id}`);
    
    const pedidos = await connection('pedidos')
      .select(
        'pedidos.*',
        'clientes.nome as cliente_nome',
        'vendedores.nome as vendedor_nome'
      )
      .leftJoin('clientes', 'pedidos.cod_cliente', 'clientes.codigo')
      .leftJoin('vendedores', 'pedidos.cod_vendedor', 'vendedores.codigo')
      .where('pedidos.cod_vendedor', vendedor_id)
      .orderBy('pedidos.dt_pedido', 'desc');
    
    logger.info(`Encontrados ${pedidos.length} pedidos para o vendedor ${vendedor_id}`);
    
    return res.json({
      success: true,
      data: pedidos
    });
  } catch (error) {
    logger.error(`Erro ao buscar pedidos do vendedor ${req.params.vendedor_id}:`, error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Listar todos os pedidos
router.get('/', async (req, res) => {
  try {
    const pedidos = await connection('pedidos')
      .select(
        'pedidos.*',
        'clientes.nome as cliente_nome',
        'vendedores.nome as vendedor_nome'
      )
      .leftJoin('clientes', 'pedidos.cod_cliente', 'clientes.codigo')
      .leftJoin('vendedores', 'pedidos.cod_vendedor', 'vendedores.codigo')
      .orderBy('pedidos.dt_pedido', 'desc');

    res.json(pedidos);
  } catch (error) {
    logger.error('Erro ao listar pedidos:', error);
    res.status(500).json({ error: 'Erro ao listar pedidos' });
  }
});

// Buscar pedido por ID (coloque por último para evitar conflitos com outras rotas)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const pedido = await connection('pedidos')
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
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // Buscar itens do pedido
    const itens = await connection('pedidos_itens')
      .select(
        'pedidos_itens.*',
        'produtos.descricao as produto_descricao'
      )
      .leftJoin('produtos', 'pedidos_itens.produto_codigo', 'produtos.codigo')
      .where('pedidos_itens.pedido_codigo', id);

    res.json({
      pedido,
      itens
    });
  } catch (error) {
    logger.error('Erro ao buscar pedido:', error);
    res.status(500).json({ error: 'Erro ao buscar pedido' });
  }
});

module.exports = router; 