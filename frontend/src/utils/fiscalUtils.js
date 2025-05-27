/**
 * Utilitários para operações fiscais
 * Inclui funções para verificar regras fiscais, como Substituição Tributária (ST)
 */

import api from '../services/api';

/**
 * Verifica se um produto tem Substituição Tributária (ST) para uma UF específica
 * 
 * @param {string} codigoProduto - Código do produto para verificar
 * @param {string} uf - Unidade Federativa para verificar (ex: SP, MG)
 * @returns {Promise<Object>} - Objeto com resultado da verificação
 */
export const verificarSubstituicaoTributaria = async (codigoProduto, uf) => {
  try {
    const response = await api.get(`/fiscal/verificar-st/${codigoProduto}/${uf}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao verificar substituição tributária:', error);
    return {
      success: false,
      temST: false,
      error: error.message || 'Erro desconhecido ao verificar ST'
    };
  }
};

/**
 * Formata um valor fiscal para exibição com simbolo
 * 
 * @param {number} valor - Valor a ser formatado
 * @param {string} simbolo - Símbolo a ser exibido (ex: %, R$)
 * @returns {string} - Valor formatado
 */
export const formatarValorFiscal = (valor, simbolo = '%') => {
  if (valor === undefined || valor === null) return '-';
  
  const valorNumerico = parseFloat(valor);
  if (isNaN(valorNumerico)) return '-';
  
  return `${valorNumerico.toFixed(2).replace('.', ',')}${simbolo}`;
};

/**
 * Converte códigos CST para descrições amigáveis
 * 
 * @param {string} cst - Código CST 
 * @returns {string} - Descrição do CST
 */
export const obterDescricaoCST = (cst) => {
  if (!cst) return '';
  
  const cstMap = {
    // Regime Normal
    '00': 'Tributada integralmente',
    '10': 'Tributada com cobrança de ICMS por ST',
    '20': 'Com redução de base de cálculo',
    '30': 'Isenta ou não tributada com cobrança de ICMS por ST',
    '40': 'Isenta',
    '41': 'Não tributada',
    '50': 'Suspensão',
    '51': 'Diferimento',
    '60': 'ICMS cobrado anteriormente por ST',
    '70': 'Com redução de base de cálculo e cobrança de ICMS por ST',
    '90': 'Outros',
    
    // Regime Simples Nacional
    '101': 'Tributada com permissão de crédito',
    '102': 'Tributada sem permissão de crédito',
    '103': 'Isenção do ICMS para faixa de receita bruta',
    '201': 'Tributada com permissão de crédito e cobrança de ICMS por ST',
    '202': 'Tributada sem permissão de crédito e cobrança de ICMS por ST',
    '203': 'Isenção do ICMS para faixa de receita bruta e cobrança de ICMS por ST',
    '300': 'Imune',
    '400': 'Não tributada',
    '500': 'ICMS cobrado anteriormente por ST ou por antecipação',
    '900': 'Outros'
  };
  
  return cstMap[cst] || `CST ${cst}`;
};

/**
 * Verifica se um CST indica Substituição Tributária
 * 
 * @param {string} cst - Código CST para verificar 
 * @returns {boolean} - Verdadeiro se o CST indicar ST
 */
export const verificarCSTSubstituicaoTributaria = (cst) => {
  if (!cst) return false;
  
  // CSTs que indicam Substituição Tributária
  const cstsComST = ['10', '30', '60', '70', '201', '202', '203'];
  
  return cstsComST.includes(cst);
};

export default {
  verificarSubstituicaoTributaria,
  formatarValorFiscal,
  obterDescricaoCST,
  verificarCSTSubstituicaoTributaria
}; 