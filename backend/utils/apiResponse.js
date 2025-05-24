/**
 * Formata a resposta da API no padrão utilizado pelo sistema
 * @param {boolean} success - Indica se a operação foi bem-sucedida
 * @param {string} message - Mensagem descritiva da operação
 * @param {Object|Array|null} data - Dados retornados pela operação
 * @returns {Object} Objeto formatado para retorno
 */
function formatarResposta(success, message, data) {
  return {
    success,
    message,
    data
  };
}

/**
 * Formata uma resposta de erro para a API
 * @param {string} message - Mensagem de erro
 * @param {Object|null} error - Informações detalhadas do erro (opcional)
 * @returns {Object} Objeto formatado para retorno
 */
function formatarErro(message, error = null) {
  return formatarResposta(false, message, error ? { error } : null);
}

module.exports = {
  formatarResposta,
  formatarErro
}; 