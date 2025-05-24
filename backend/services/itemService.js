const knex = require('../database/connection');
const logger = require('../utils/logger');
const configService = require('./configurationService');

class ItemService {
  /**
   * Verifica se um item já existe em um pedido/orçamento
   * @param {number} documentId - ID do pedido/orçamento
   * @param {number} productId - ID do produto
   * @param {string} documentType - Tipo de documento ('pedido' ou 'orcamento')
   * @returns {Promise<Object|null>} - Item duplicado ou null se não existir
   */
  async checkDuplicateItem(documentId, productId, documentType) {
    try {
      const tableName = documentType === 'pedido' ? 'pedido_itens' : 'orcamento_itens';
      const idField = documentType === 'pedido' ? 'id_pedido' : 'id_orcamento';

      const duplicateItem = await knex(tableName)
        .where({
          [idField]: documentId,
          id_produto: productId
        })
        .first();

      return duplicateItem || null;
    } catch (error) {
      logger.error(`Erro ao verificar item duplicado: ${error.message}`);
      return null;
    }
  }

  /**
   * Adiciona um novo item ao pedido/orçamento
   * @param {Object} item - Dados do item a ser adicionado
   * @param {string} documentType - Tipo de documento ('pedido' ou 'orcamento')
   * @returns {Promise<Object>} - Item adicionado com ID
   */
  async addItem(item, documentType) {
    try {
      const tableName = documentType === 'pedido' ? 'pedido_itens' : 'orcamento_itens';
      
      const [id] = await knex(tableName).insert(item).returning('id');
      
      return { ...item, id };
    } catch (error) {
      logger.error(`Erro ao adicionar item: ${error.message}`);
      throw error;
    }
  }

  /**
   * Atualiza a quantidade de um item existente
   * @param {number} itemId - ID do item a ser atualizado
   * @param {number} newQuantity - Nova quantidade
   * @param {string} documentType - Tipo de documento ('pedido' ou 'orcamento')
   * @returns {Promise<boolean>} - true se a atualização foi bem-sucedida
   */
  async updateItemQuantity(itemId, newQuantity, documentType) {
    try {
      const tableName = documentType === 'pedido' ? 'pedido_itens' : 'orcamento_itens';
      
      await knex(tableName)
        .where('id', itemId)
        .update({
          quantidade: newQuantity,
          updated_at: knex.fn.now()
        });
      
      return true;
    } catch (error) {
      logger.error(`Erro ao atualizar quantidade do item: ${error.message}`);
      return false;
    }
  }

  /**
   * Processa a adição de um item, verificando duplicatas se a configuração estiver ativada
   * @param {Object} itemData - Dados do item a ser adicionado
   * @param {string} documentType - Tipo de documento ('pedido' ou 'orcamento')
   * @param {number} codEmpresa - Código da empresa
   * @returns {Promise<Object>} - Resultado da operação
   */
  async processItemAddition(itemData, documentType, codEmpresa = 1) {
    try {
      const shouldPrompt = await configService.shouldPromptDuplicateItems(codEmpresa);
      const documentId = documentType === 'pedido' ? itemData.id_pedido : itemData.id_orcamento;
      
      // Se a validação de duplicados estiver desativada, adiciona o item diretamente
      if (!shouldPrompt) {
        const newItem = await this.addItem(itemData, documentType);
        return {
          success: true,
          item: newItem,
          message: 'Item adicionado com sucesso'
        };
      }
      
      // Verificar se o item já existe
      const duplicateItem = await this.checkDuplicateItem(
        documentId, 
        itemData.id_produto, 
        documentType
      );
      
      // Se não existir duplicata, adiciona o item normalmente
      if (!duplicateItem) {
        const newItem = await this.addItem(itemData, documentType);
        return {
          success: true,
          item: newItem,
          message: 'Item adicionado com sucesso'
        };
      }
      
      // Se existir duplicata, retorna informação para o frontend solicitar confirmação
      return {
        success: true,
        duplicateFound: true,
        duplicateItem,
        newItem: itemData,
        message: 'Item duplicado encontrado'
      };
    } catch (error) {
      logger.error(`Erro ao processar adição de item: ${error.message}`);
      return {
        success: false,
        message: `Erro ao adicionar item: ${error.message}`
      };
    }
  }

  /**
   * Resolve um conflito de item duplicado
   * @param {Object} resolution - Dados da resolução (merge ou add)
   * @param {string} documentType - Tipo de documento ('pedido' ou 'orcamento')
   * @returns {Promise<Object>} - Resultado da operação
   */
  async resolveDuplicateItem(resolution, documentType) {
    try {
      if (resolution.action === 'merge') {
        // Somar quantidades e atualizar o item existente
        const newQuantity = Number(resolution.duplicateItem.quantidade) + Number(resolution.newItem.quantidade);
        const updated = await this.updateItemQuantity(
          resolution.duplicateItem.id, 
          newQuantity, 
          documentType
        );
        
        if (updated) {
          return {
            success: true,
            message: 'Quantidades somadas com sucesso',
            item: { ...resolution.duplicateItem, quantidade: newQuantity }
          };
        } else {
          throw new Error('Falha ao atualizar quantidade do item');
        }
      } else if (resolution.action === 'add') {
        // Adicionar como um novo item
        const newItem = await this.addItem(resolution.newItem, documentType);
        return {
          success: true,
          message: 'Novo item adicionado',
          item: newItem
        };
      } else {
        throw new Error('Ação inválida para resolução de duplicata');
      }
    } catch (error) {
      logger.error(`Erro ao resolver item duplicado: ${error.message}`);
      return {
        success: false,
        message: `Erro ao resolver item duplicado: ${error.message}`
      };
    }
  }
}

module.exports = new ItemService(); 