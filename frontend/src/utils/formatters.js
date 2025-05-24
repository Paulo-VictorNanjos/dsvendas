// Formatações úteis para a aplicação

/**
 * Formata um valor para moeda brasileira
 * @param {number} value - Valor a ser formatado
 * @returns {string} - Valor formatado como moeda
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined) return 'R$ 0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

/**
 * Formata uma data para o formato brasileiro
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} - Data formatada
 */
export const formatDate = (date) => {
  if (!date) return '-';
  
  try {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('pt-BR');
  } catch (error) {
    return date.toString();
  }
};

/**
 * Formata um valor percentual
 * @param {number} value - Valor a ser formatado
 * @returns {string} - Valor formatado como percentual
 */
export const formatPercent = (value) => {
  if (value === null || value === undefined) return '0%';
  
  return `${Number(value).toFixed(2)}%`;
};

/**
 * Converte um UUID em um código mais amigável e legível
 * @param {string} uuid - UUID a ser formatado (ex: "0698b780-fcba-4f1b-b87a-965976139ff7")
 * @returns {string} - Código formatado (ex: "ORC-6980-FCBA")
 */
export const formatOrcamentoCodigo = (uuid) => {
  if (!uuid) return 'ORC-0000-0000';
  
  // Verifica se é um UUID válido
  if (typeof uuid !== 'string' || !uuid.includes('-')) {
    return `ORC-${uuid.substring(0, 8).toUpperCase()}`;
  }

  try {
    // Extrai partes específicas do UUID
    const parts = uuid.split('-');
    if (parts.length < 2) return `ORC-${uuid.substring(0, 8).toUpperCase()}`;
    
    // Usa os primeiros 4 dígitos da primeira parte e os primeiros 4 da segunda parte
    const firstPart = parts[0].substring(0, 4);
    const secondPart = parts[1].substring(0, 4);
    
    // Formata como ORC-XXXX-YYYY
    return `ORC-${firstPart.toUpperCase()}-${secondPart.toUpperCase()}`;
  } catch (error) {
    console.error('Erro ao formatar código de orçamento:', error);
    return `ORC-${uuid.substring(0, 8).toUpperCase()}`;
  }
}; 