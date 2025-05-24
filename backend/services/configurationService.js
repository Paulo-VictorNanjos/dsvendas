const knex = require('../database/connection');
const logger = require('../utils/logger');

class ConfigurationService {
  /**
   * Inicializa o serviço garantindo que a tabela de configurações exista
   */
  async initialize() {
    try {
      // Verificar se a tabela existe
      const hasTable = await knex.schema.hasTable('system_configurations');
      
      if (!hasTable) {
        logger.info('Tabela system_configurations não existe. Criando...');
        
        // Criar a tabela
        await knex.schema.createTable('system_configurations', function(table) {
          table.increments('id').primary();
          table.string('key').notNullable().unique();
          table.string('value').notNullable();
          table.string('description').notNullable();
          table.string('type').notNullable().defaultTo('string'); // string, boolean, number
          table.integer('cod_empresa').defaultTo(1);
          table.timestamps(true, true);
        });
        
        // Inserir configurações padrão
        await knex('system_configurations').insert([
          {
            key: 'validate_stock_in_quotations',
            value: 'false',
            description: 'Validar estoque disponível ao criar orçamentos',
            type: 'boolean',
            cod_empresa: 1
          },
          {
            key: 'validate_stock_in_orders',
            value: 'true',
            description: 'Validar estoque disponível ao converter orçamentos em pedidos',
            type: 'boolean',
            cod_empresa: 1
          },
          {
            key: 'prompt_duplicate_items',
            value: 'true',
            description: 'Solicitar confirmação ao adicionar itens duplicados',
            type: 'boolean',
            cod_empresa: 1
          }
        ]);
        
        logger.info('Tabela system_configurations criada com sucesso!');
      } else {
        logger.info('Tabela system_configurations já existe.');
      }
      
      return true;
    } catch (error) {
      logger.error(`Erro ao inicializar serviço de configurações: ${error.message}`);
      return false;
    }
  }

  /**
   * Obtém uma configuração pelo seu identificador (key)
   * @param {string} key - Chave da configuração
   * @param {number} codEmpresa - Código da empresa (opcional, padrão 1)
   * @returns {Promise<Object>} - Objeto com a configuração
   */
  async getConfig(key, codEmpresa = 1) {
    try {
      const config = await knex('system_configurations')
        .where({
          key,
          cod_empresa: codEmpresa
        })
        .first();

      if (!config) {
        logger.warn(`Configuração '${key}' não encontrada para empresa ${codEmpresa}`);
        return null;
      }

      return config;
    } catch (error) {
      logger.error(`Erro ao buscar configuração '${key}': ${error.message}`);
      return null;
    }
  }

  /**
   * Obtém o valor de uma configuração convertido para o tipo apropriado
   * @param {string} key - Chave da configuração
   * @param {any} defaultValue - Valor padrão caso a configuração não exista
   * @param {number} codEmpresa - Código da empresa (opcional, padrão 1)
   * @returns {Promise<any>} - Valor da configuração convertido para o tipo apropriado
   */
  async getValue(key, defaultValue = null, codEmpresa = 1) {
    const config = await this.getConfig(key, codEmpresa);

    if (!config) {
      return defaultValue;
    }

    // Converter o valor para o tipo apropriado
    switch (config.type) {
      case 'boolean':
        return config.value.toLowerCase() === 'true';
      case 'number':
        return parseFloat(config.value);
      default:
        return config.value;
    }
  }

  /**
   * Define ou atualiza uma configuração
   * @param {string} key - Chave da configuração
   * @param {any} value - Valor da configuração
   * @param {string} description - Descrição da configuração (opcional, apenas para novas configurações)
   * @param {string} type - Tipo da configuração (opcional, apenas para novas configurações)
   * @param {number} codEmpresa - Código da empresa (opcional, padrão 1)
   * @returns {Promise<boolean>} - true se a operação foi bem-sucedida, false caso contrário
   */
  async setConfig(key, value, description = null, type = 'string', codEmpresa = 1) {
    try {
      // Verificar se a configuração já existe
      const existingConfig = await this.getConfig(key, codEmpresa);

      // Converter o valor para string
      const valueStr = value.toString();

      if (existingConfig) {
        // Atualizar a configuração existente
        await knex('system_configurations')
          .where({
            key,
            cod_empresa: codEmpresa
          })
          .update({
            value: valueStr,
            updated_at: knex.fn.now()
          });

        logger.info(`Configuração '${key}' atualizada para '${valueStr}'`);
      } else {
        // Criar uma nova configuração
        if (!description) {
          description = `Configuração ${key}`;
        }

        await knex('system_configurations').insert({
          key,
          value: valueStr,
          description,
          type,
          cod_empresa: codEmpresa,
          created_at: knex.fn.now(),
          updated_at: knex.fn.now()
        });

        logger.info(`Nova configuração '${key}' criada com valor '${valueStr}'`);
      }

      return true;
    } catch (error) {
      logger.error(`Erro ao definir configuração '${key}': ${error.message}`);
      return false;
    }
  }

  /**
   * Lista todas as configurações do sistema
   * @param {number} codEmpresa - Código da empresa (opcional, padrão 1)
   * @returns {Promise<Array>} - Lista de configurações
   */
  async listConfigurations(codEmpresa = 1) {
    try {
      const configs = await knex('system_configurations')
        .where('cod_empresa', codEmpresa)
        .orderBy('key');

      return configs;
    } catch (error) {
      logger.error(`Erro ao listar configurações: ${error.message}`);
      return [];
    }
  }

  /**
   * Verifica se a validação de estoque está ativada para orçamentos
   * @param {number} codEmpresa - Código da empresa (opcional, padrão 1)
   * @returns {Promise<boolean>} - true se a validação estiver ativada, false caso contrário
   */
  async shouldValidateStockInQuotations(codEmpresa = 1) {
    return await this.getValue('validate_stock_in_quotations', false, codEmpresa);
  }

  /**
   * Verifica se a validação de estoque está ativada para pedidos
   * @param {number} codEmpresa - Código da empresa (opcional, padrão 1)
   * @returns {Promise<boolean>} - true se a validação estiver ativada, false caso contrário
   */
  async shouldValidateStockInOrders(codEmpresa = 1) {
    return await this.getValue('validate_stock_in_orders', true, codEmpresa);
  }

  /**
   * Verifica se a confirmação para itens duplicados está ativada
   * @param {number} codEmpresa - Código da empresa (opcional, padrão 1)
   * @returns {Promise<boolean>} - true se a confirmação estiver ativada, false caso contrário
   */
  async shouldPromptDuplicateItems(codEmpresa = 1) {
    return await this.getValue('prompt_duplicate_items', true, codEmpresa);
  }
}

module.exports = new ConfigurationService(); 