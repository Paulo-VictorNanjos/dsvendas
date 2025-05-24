/**
 * Rotas para funcionalidades fiscais
 */

const express = require('express');
const router = express.Router();
const fiscalController = require('../controllers/fiscalController');

// Rotas para dados de produtos
router.get('/produtos/dados-fiscais/:codigo', fiscalController.getDadosFiscaisProduto);

// Rota alternativa usando o serviço resiliente
router.get('/produtos/dados-fiscais-resiliente/:codigo', fiscalController.getDadosFiscaisProdutoResiliente);

// Rota para obter todos os dados fiscais de um produto
router.get('/produtos/fiscal/:codigo', fiscalController.getProdutoFiscal);

// Rotas para classificação fiscal
router.get('/class-fiscal-dados', fiscalController.getDadosClassFiscal);
router.get('/class-fiscal-dados-completos', fiscalController.getDadosClassFiscalCompletos);
router.get('/dados-classificacao-fiscal/:ncm/:uf', fiscalController.getDadosClassFiscal);

// Rotas para cálculo de tributos
router.post('/calcular-tributos', fiscalController.calcularTributosProduto);
router.post('/calcular-impostos', fiscalController.calcularImpostosProduto);

// Rotas para regras fiscais de produtos
router.get('/regras-produtos/:codigoProduto', fiscalController.getRegrasFiscaisProduto);
router.get('/regras-calculo/:codigoProduto/:uf', fiscalController.getRegraCalculoProdutoUF);

// Rota para definir regras fiscais de produtos
router.post('/set-regras-produto', fiscalController.setRegrasFiscaisProduto);

// Rota para buscar regras ICMS do ERP
router.get('/regras-icms-erp', fiscalController.getRegrasIcmsERP);

module.exports = router; 