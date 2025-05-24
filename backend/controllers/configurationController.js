const configService = require('../services/configurationService');
const logger = require('../utils/logger');

class ConfigurationController {
  /**
   * Lista todas as configurações do sistema
   * @param {Object} req - Requisição
   * @param {Object} res - Resposta
   */
  async list(req, res) {
    try {
      const codEmpresa = req.userEmpresa || 1;
      const configs = await configService.listConfigurations(codEmpresa);

      return res.json({
        success: true,
        data: configs
      });
    } catch (error) {
      logger.error(`Erro ao listar configurações: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao listar configurações'
      });
    }
  }

  /**
   * Obtém uma configuração pelo seu identificador (key)
   * @param {Object} req - Requisição
   * @param {Object} res - Resposta
   */
  async get(req, res) {
    try {
      const { key } = req.params;
      const codEmpresa = req.userEmpresa || 1;

      const config = await configService.getConfig(key, codEmpresa);

      if (!config) {
        return res.status(404).json({
          success: false,
          message: `Configuração '${key}' não encontrada`
        });
      }

      // Para configurações booleanas, retornar o valor convertido
      if (config.type === 'boolean') {
        config.value = config.value.toLowerCase() === 'true';
      } else if (config.type === 'number') {
        config.value = parseFloat(config.value);
      }

      return res.json({
        success: true,
        data: config
      });
    } catch (error) {
      logger.error(`Erro ao obter configuração: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao obter configuração'
      });
    }
  }

  /**
   * Atualiza ou cria uma configuração
   * @param {Object} req - Requisição
   * @param {Object} res - Resposta
   */
  async update(req, res) {
    try {
      const { key } = req.params;
      const { value, description, type } = req.body;
      const codEmpresa = req.userEmpresa || 1;

      // Verificar se a chave foi fornecida
      if (!key) {
        return res.status(400).json({
          success: false,
          message: 'Chave da configuração não fornecida'
        });
      }

      // Verificar se o valor foi fornecido
      if (value === undefined || value === null) {
        return res.status(400).json({
          success: false,
          message: 'Valor da configuração não fornecido'
        });
      }

      // Verificar se a configuração já existe
      const existingConfig = await configService.getConfig(key, codEmpresa);
      const result = await configService.setConfig(
        key,
        value,
        description || (existingConfig ? existingConfig.description : null),
        type || (existingConfig ? existingConfig.type : 'string'),
        codEmpresa
      );

      if (!result) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao atualizar configuração'
        });
      }

      return res.json({
        success: true,
        message: `Configuração '${key}' ${existingConfig ? 'atualizada' : 'criada'} com sucesso`
      });
    } catch (error) {
      logger.error(`Erro ao atualizar configuração: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar configuração'
      });
    }
  }

  /**
   * Obtém o valor de uma configuração de validação de estoque em orçamentos
   * @param {Object} req - Requisição
   * @param {Object} res - Resposta
   */
  async getStockValidationConfig(req, res) {
    try {
      const codEmpresa = req.userEmpresa || 1;
      
      const validateInQuotations = await configService.shouldValidateStockInQuotations(codEmpresa);
      const validateInOrders = await configService.shouldValidateStockInOrders(codEmpresa);

      return res.json({
        success: true,
        data: {
          validate_stock_in_quotations: validateInQuotations,
          validate_stock_in_orders: validateInOrders
        }
      });
    } catch (error) {
      logger.error(`Erro ao obter configurações de validação de estoque: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao obter configurações de validação de estoque'
      });
    }
  }

  /**
   * Atualiza a configuração de validação de estoque em orçamentos
   * @param {Object} req - Requisição
   * @param {Object} res - Resposta
   */
  async updateStockValidationConfig(req, res) {
    try {
      const { validate_quotations, validate_orders } = req.body;
      const codEmpresa = req.userEmpresa || 1;

      if (validate_quotations !== undefined) {
        await configService.setConfig(
          'validate_stock_in_quotations',
          validate_quotations,
          'Validar estoque disponível ao criar orçamentos',
          'boolean',
          codEmpresa
        );
      }

      if (validate_orders !== undefined) {
        await configService.setConfig(
          'validate_stock_in_orders',
          validate_orders,
          'Validar estoque disponível ao converter orçamentos em pedidos',
          'boolean',
          codEmpresa
        );
      }

      return res.json({
        success: true,
        message: 'Configurações de validação de estoque atualizadas com sucesso'
      });
    } catch (error) {
      logger.error(`Erro ao atualizar configurações de validação de estoque: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar configurações de validação de estoque'
      });
    }
  }
}

module.exports = new ConfigurationController(); 