/**
 * Utilitários para formatação de valores monetários e números
 */

/**
 * Formata um valor para moeda brasileira (R$)
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado como moeda (ex: R$ 1.234,56)
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined) return 'R$ 0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Converte uma string formatada como moeda para número
 * @param {string} value - Valor formatado como moeda (ex: R$ 1.234,56)
 * @returns {number} Valor numérico
 */
export const parseCurrency = (value) => {
  if (!value) return 0;
  
  // Remove caracteres não numéricos exceto vírgula e ponto
  const numericValue = value.replace(/[^\d,.-]/g, '')
    .replace('.', '') // Remove pontos de milhar
    .replace(',', '.'); // Substitui vírgula por ponto
  
  return parseFloat(numericValue) || 0;
};

/**
 * Formata um número com precisão definida
 * @param {number} value - Valor a ser formatado
 * @param {number} precision - Número de casas decimais
 * @returns {string} Valor formatado
 */
export const formatNumber = (value, precision = 2) => {
  if (value === null || value === undefined) return '0';
  
  return Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  });
};

/**
 * Formata um valor percentual
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado como percentual (ex: 10,5%)
 */
export const formatPercent = (value) => {
  if (value === null || value === undefined) return '0%';
  
  return `${formatNumber(value, 1)}%`;
}; 