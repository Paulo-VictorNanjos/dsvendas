const express = require('express');
const router = express.Router();
const itemService = require('../services/itemService');
const logger = require('../utils/logger');

/**
 * @route POST /api/items/add
 * @desc Adiciona um item a um pedido/orçamento com verificação de duplicados
 * @access Private
 */
router.post('/add', async (req, res) => {
  try {
    const { itemData, documentType, codEmpresa = 1 } = req.body;

    if (!itemData || !documentType) {
      return res.status(400).json({
        success: false,
        message: 'Dados do item e tipo de documento são obrigatórios'
      });
    }

    // Validar tipo de documento
    if (!['pedido', 'orcamento'].includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de documento inválido. Use "pedido" ou "orcamento"'
      });
    }

    const result = await itemService.processItemAddition(itemData, documentType, codEmpresa);
    return res.json(result);
  } catch (error) {
    logger.error(`Erro ao adicionar item: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao adicionar item: ${error.message}`
    });
  }
});

/**
 * @route POST /api/items/resolve-duplicate
 * @desc Resolve um conflito de item duplicado
 * @access Private
 */
router.post('/resolve-duplicate', async (req, res) => {
  try {
    const { resolution, documentType } = req.body;

    if (!resolution || !documentType) {
      return res.status(400).json({
        success: false,
        message: 'Dados de resolução e tipo de documento são obrigatórios'
      });
    }

    // Validar tipo de documento
    if (!['pedido', 'orcamento'].includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de documento inválido. Use "pedido" ou "orcamento"'
      });
    }

    // Validar ação de resolução
    if (!['merge', 'add'].includes(resolution.action)) {
      return res.status(400).json({
        success: false,
        message: 'Ação de resolução inválida. Use "merge" ou "add"'
      });
    }

    const result = await itemService.resolveDuplicateItem(resolution, documentType);
    return res.json(result);
  } catch (error) {
    logger.error(`Erro ao resolver item duplicado: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao resolver item duplicado: ${error.message}`
    });
  }
});

module.exports = router; 