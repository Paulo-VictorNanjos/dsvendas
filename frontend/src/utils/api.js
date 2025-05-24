/**
 * Utilitários para configurações da API
 */

/**
 * Retorna a URL base da API
 * @returns {string} URL base da API
 */
export const getAPIBaseUrl = () => {
  // Usar a variável de ambiente se disponível, caso contrário, usar localhost
  return process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
};

export default {
  getAPIBaseUrl
}; 