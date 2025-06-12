const express = require('express');
const router = express.Router();
const notasFiscaisController = require('../controllers/notasFiscaisController');
const { authenticateToken } = require('../middlewares/auth');

// Aplicar middleware de autenticação a todas as rotas
router.use(authenticateToken);

// Rotas para notas fiscais
router.get('/pedido/:pedidoId', notasFiscaisController.buscarPorPedido);
router.get('/:numero', notasFiscaisController.buscarPorNumero);
router.get('/:numero/xml', notasFiscaisController.buscarXmlPorNumero);

// Rotas de proxy para o Meu Danfe
router.post('/proxy/danfe/xml', notasFiscaisController.gerarDanfePorXml);
router.post('/proxy/danfe/chave', notasFiscaisController.gerarDanfePorChave);

// Rota para geração de DANFE própria (sem dependência externa)
router.post('/danfe/local', notasFiscaisController.gerarDanfeLocal);

// Rota para verificar status do serviço
router.get('/danfe/status', notasFiscaisController.verificarStatusServicoDANFE);

// Rota para testar o Puppeteer
router.get('/danfe/test-puppeteer', notasFiscaisController.testarPuppeteer);

module.exports = router; 