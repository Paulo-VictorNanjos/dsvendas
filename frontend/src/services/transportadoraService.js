import api from './api';

/**
 * Serviço para consulta de transportadoras
 */
const transportadoraService = {
  /**
   * Busca todas as transportadoras
   * @returns {Promise} Promise com lista de transportadoras
   */
  getAll: async () => {
    try {
      const response = await api.get('/erp/transportadoras');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar transportadoras:', error);
      throw error;
    }
  },

  /**
   * Busca transportadoras por termo de pesquisa
   * @param {string} termo Termo para busca (nome ou código)
   * @returns {Promise} Promise com resultado da busca
   */
  search: async (termo) => {
    try {
      const response = await api.get(`/erp/transportadoras/search?termo=${encodeURIComponent(termo)}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar transportadoras:', error);
      throw error;
    }
  },
};

export default transportadoraService; 