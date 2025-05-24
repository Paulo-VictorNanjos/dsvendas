const erpConnection = require('../database/erpConnection');
const logger = require('../utils/logger');

class ERPService {
  /**
   * Busca transportadoras da view vw_fornecedores_t no banco de dados ERP
   * @returns {Promise<Array>} Lista de transportadoras
   */
  async getTransportadoras() {
    try {
      // Buscar transportadoras diretamente da view do ERP
      const result = await erpConnection.raw(`
        SELECT 
          codigo as codigo,
          nome as nome,
          tipo_forn as tipo
        FROM vw_fornecedores_t 
        WHERE tipo_forn = 'T'
        ORDER BY nome
      `);

      // Retornar os resultados da query
      return {
        success: true,
        data: result.rows || []
      };
    } catch (error) {
      logger.error('Erro ao buscar transportadoras do ERP:', error);
      return {
        success: false,
        message: 'Erro ao buscar transportadoras',
        error: error.message
      };
    }
  }

  /**
   * Busca transportadoras com filtro de texto
   * @param {string} termo Termo de busca
   * @returns {Promise<Array>} Transportadoras filtradas
   */
  async searchTransportadoras(termo) {
    try {
      // Normaliza o termo de busca para insensitive case
      const termoBusca = termo.toLowerCase();
      
      // Busca transportadoras na view do ERP que correspondem ao termo
      const result = await erpConnection.raw(`
        SELECT 
          codigo as codigo,
          nome as nome,
          tipo_forn as tipo
        FROM vw_fornecedores_t 
        WHERE tipo_forn = 'T' AND (LOWER(nome) LIKE ? OR LOWER(codigo::text) LIKE ?)
        ORDER BY nome
        LIMIT 30
      `, [`%${termoBusca}%`, `%${termoBusca}%`]);

      return {
        success: true,
        data: result.rows || []
      };
    } catch (error) {
      logger.error('Erro ao buscar transportadoras:', error);
      return {
        success: false,
        message: 'Erro ao buscar transportadoras',
        error: error.message
      };
    }
  }
}

module.exports = new ERPService(); 