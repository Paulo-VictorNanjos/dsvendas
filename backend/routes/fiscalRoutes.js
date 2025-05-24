const express = require('express');
const router = express.Router();
const fiscalController = require('../controllers/fiscalController');

// Rotas para dados de produtos
router.get('/produtos/dados-fiscais/:codigo', fiscalController.getDadosFiscaisProduto);
router.get('/produtos/dados-fiscais-resiliente/:codigo', fiscalController.getDadosFiscaisProdutoResiliente);
router.get('/produto/:codigo', fiscalController.getProdutoFiscal);

// Rotas ICMS
// Essas rotas estavam referenciando métodos que não existem
// router.post('/calcular-icms', fiscalController.calcularIcms);
// router.get('/regras-icms/:codigo/:uf', fiscalController.getRegraIcms);
router.get('/regras-icms', fiscalController.getRegrasIcms);

// Rotas para classificação fiscal
router.get('/class-fiscal-dados', fiscalController.getDadosClassFiscal);
router.get('/class-fiscal-dados-completos', fiscalController.getDadosClassFiscalCompletos);
router.get('/dados-classificacao-fiscal/:ncm/:uf', fiscalController.getDadosClassFiscal);
router.get('/classificacao-fiscal-completa/:ncm/:uf', fiscalController.getDadosClassFiscalCompletos);

// Rotas para cálculo de tributos
router.post('/calcular-tributos', fiscalController.calcularTributosProduto);
router.post('/calcular-impostos', fiscalController.calcularImpostosProduto);

// Nova rota para verificar substituição tributária
router.get('/verificar-st/:codigo/:uf', fiscalController.verificarSubstituicaoTributaria);

module.exports = router; 