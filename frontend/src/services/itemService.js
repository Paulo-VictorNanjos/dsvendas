import api from './api';

/**
 * Adiciona um item a um pedido/orçamento com verificação de duplicados
 * @param {Object} itemData - Dados do item a ser adicionado
 * @param {string} documentType - Tipo de documento ('pedido' ou 'orcamento')
 * @param {number} codEmpresa - Código da empresa
 * @returns {Promise<Object>} - Resultado da operação
 */
export const addItem = async (itemData, documentType, codEmpresa = 1) => {
  try {
    const response = await api.post('/items/add', {
      itemData,
      documentType,
      codEmpresa
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao adicionar item:', error);
    throw error;
  }
};

/**
 * Resolve um conflito de item duplicado
 * @param {Object} resolution - Dados da resolução (merge ou add)
 * @param {string} documentType - Tipo de documento ('pedido' ou 'orcamento')
 * @returns {Promise<Object>} - Resultado da operação
 */
export const resolveDuplicateItem = async (resolution, documentType) => {
  try {
    const response = await api.post('/items/resolve-duplicate', {
      resolution,
      documentType
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao resolver item duplicado:', error);
    throw error;
  }
};

export default {
  addItem,
  resolveDuplicateItem
}; 