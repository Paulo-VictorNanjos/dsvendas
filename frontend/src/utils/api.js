/**
 * Utilitários para configurações da API
 */

/**
 * Retorna a URL base da API
 * @returns {string} URL base da API
 */
export const getAPIBaseUrl = () => {
  // Em desenvolvimento local, usa localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001/api';
  }
  
  // Em produção, sempre usa HTTPS
  return 'https://studywob.com.br/api';
};

export default {
  getAPIBaseUrl
}; 