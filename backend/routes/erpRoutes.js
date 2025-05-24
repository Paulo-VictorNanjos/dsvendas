const express = require('express');
const router = express.Router();
const erpService = require('../services/erpService');

/**
 * @route   GET /api/erp/transportadoras
 * @desc    Busca todas as transportadoras do ERP
 * @access  Public - Não requer autenticação para permitir acesso em telas de orçamento
 */
router.get('/transportadoras', async (req, res) => {
  try {
    const result = await erpService.getTransportadoras();
    if (result.success) {
      return res.json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    console.error('Erro ao buscar transportadoras:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar transportadoras',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/erp/transportadoras/search
 * @desc    Busca transportadoras pelo nome ou código
 * @access  Public - Não requer autenticação para permitir acesso em telas de orçamento
 */
router.get('/transportadoras/search', async (req, res) => {
  const { termo } = req.query;
  
  if (!termo) {
    return res.status(400).json({
      success: false,
      message: 'Termo de busca é obrigatório'
    });
  }
  
  try {
    const result = await erpService.searchTransportadoras(termo);
    if (result.success) {
      return res.json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    console.error('Erro ao buscar transportadoras:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar transportadoras',
      error: error.message
    });
  }
});

module.exports = router; 