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

  /**
   * Obtém as configurações de funcionalidades de orçamentos (email/WhatsApp)
   * @param {Object} req - Requisição
   * @param {Object} res - Resposta
   */
  async getOrcamentoFeaturesConfig(req, res) {
    try {
      const codEmpresa = req.userEmpresa || 1;
      
      const emailEnabled = await configService.getConfig('enable_orcamento_email', codEmpresa);
      const whatsappEnabled = await configService.getConfig('enable_orcamento_whatsapp', codEmpresa);

      return res.json({
        success: true,
        data: {
          enable_orcamento_email: emailEnabled ? emailEnabled.value === 'true' : true,
          enable_orcamento_whatsapp: whatsappEnabled ? whatsappEnabled.value === 'true' : true
        }
      });
    } catch (error) {
      logger.error(`Erro ao obter configurações de funcionalidades de orçamentos: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao obter configurações de funcionalidades'
      });
    }
  }

  /**
   * Atualiza as configurações de funcionalidades de orçamentos (email/WhatsApp)
   * @param {Object} req - Requisição
   * @param {Object} res - Resposta
   */
  async updateOrcamentoFeaturesConfig(req, res) {
    try {
      const { enable_email, enable_whatsapp } = req.body;
      const codEmpresa = req.userEmpresa || 1;

      if (enable_email !== undefined) {
        await configService.setConfig(
          'enable_orcamento_email',
          enable_email,
          'Habilitar envio de orçamentos por email',
          'boolean',
          codEmpresa
        );
      }

      if (enable_whatsapp !== undefined) {
        await configService.setConfig(
          'enable_orcamento_whatsapp',
          enable_whatsapp,
          'Habilitar envio de orçamentos por WhatsApp',
          'boolean',
          codEmpresa
        );
      }

      return res.json({
        success: true,
        message: 'Configurações de funcionalidades de orçamentos atualizadas com sucesso'
      });
    } catch (error) {
      logger.error(`Erro ao atualizar configurações de funcionalidades de orçamentos: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar configurações de funcionalidades'
      });
    }
  }
}

module.exports = new ConfigurationController(); 