/**
 * Utilitários para validação de regras fiscais
 * Detecta inconsistências fiscais comuns
 */

/**
 * CSTs que são incompatíveis com ICMS-ST
 */
const CST_INCOMPATIVEIS_COM_ST = [
  '00', // Tributada integralmente
  '20'  // Com redução de base de cálculo (caso específico)
];

/**
 * CSTs que permitem ICMS-ST
 */
const CST_COMPATIVEIS_COM_ST = [
  '10', // Tributada e com cobrança do ICMS por substituição tributária
  '30', // Isenta ou não tributada e com cobrança do ICMS por substituição tributária
  '60', // ICMS cobrado anteriormente por substituição tributária
  '70', // Com redução de base de cálculo e cobrança do ICMS por substituição tributária
  '201', // Tributada pelo Simples Nacional com permissão de crédito e com cobrança do ICMS por substituição tributária
  '202', // Tributada pelo Simples Nacional sem permissão de crédito e com cobrança do ICMS por substituição tributária
  '203'  // Isenção do ICMS no Simples Nacional para incidência da ST
];

/**
 * Validar se CST é compatível com ICMS-ST
 * @param {string} cst - Código CST/CSOSN
 * @param {string} icmsSt - Flag de ICMS-ST ('S' ou 'N')
 * @returns {object} Resultado da validação
 */
function validarCSTcomICMSST(cst, icmsSt) {
  const inconsistencias = [];
  
  // Verificar se CST é incompatível com ST
  if (CST_INCOMPATIVEIS_COM_ST.includes(cst) && icmsSt === 'S') {
    inconsistencias.push({
      tipo: 'CST_INCOMPATIVEL_COM_ST',
      severidade: 'ERRO',
      cst: cst,
      icmsSt: icmsSt,
      mensagem: `CST ${cst} é incompatível com ICMS-ST. CST ${cst} indica operação tributada integralmente.`,
      sugestao: cst === '00' ? 
        'Para CST 00 (tributada integralmente), definir icms_st=\'N\' ou usar CST compatível com ST como 10, 30, 70.' :
        `Para CST ${cst}, verificar se realmente aplica ICMS-ST ou ajustar para CST compatível.`
    });
  }
  
  // Verificar se tem ST mas CST não está na lista de compatíveis
  if (icmsSt === 'S' && !CST_COMPATIVEIS_COM_ST.includes(cst) && !CST_INCOMPATIVEIS_COM_ST.includes(cst)) {
    inconsistencias.push({
      tipo: 'CST_NAO_RECONHECIDO_PARA_ST',
      severidade: 'AVISO',
      cst: cst,
      icmsSt: icmsSt,
      mensagem: `CST ${cst} não está na lista de CSTs conhecidos para ICMS-ST.`,
      sugestao: 'Verificar se o CST está correto ou se deve aplicar ICMS-ST para este CST.'
    });
  }
  
  return {
    valido: inconsistencias.length === 0,
    inconsistencias: inconsistencias,
    podeCalcularST: !CST_INCOMPATIVEIS_COM_ST.includes(cst) && icmsSt === 'S'
  };
}

/**
 * Validar regra fiscal completa
 * @param {object} regraFiscal - Dados da regra fiscal
 * @returns {object} Resultado da validação
 */
function validarRegraFiscal(regraFiscal) {
  const inconsistencias = [];
  
  const { st_icms, st_icms_contr, icms_st, uf, cod_regra_icms } = regraFiscal;
  
  // Validar CST para contribuinte
  if (st_icms_contr) {
    const validacaoContr = validarCSTcomICMSST(st_icms_contr, icms_st);
    if (!validacaoContr.valido) {
      validacaoContr.inconsistencias.forEach(inc => {
        inconsistencias.push({
          ...inc,
          contexto: 'CONTRIBUINTE',
          uf: uf,
          codRegra: cod_regra_icms
        });
      });
    }
  }
  
  // Validar CST para não contribuinte
  if (st_icms) {
    const validacaoNaoContr = validarCSTcomICMSST(st_icms, icms_st);
    if (!validacaoNaoContr.valido) {
      validacaoNaoContr.inconsistencias.forEach(inc => {
        inconsistencias.push({
          ...inc,
          contexto: 'NAO_CONTRIBUINTE',
          uf: uf,
          codRegra: cod_regra_icms
        });
      });
    }
  }
  
  return {
    valido: inconsistencias.length === 0,
    inconsistencias: inconsistencias
  };
}

/**
 * Gerar relatório de inconsistências fiscais
 * @param {array} inconsistencias - Array de inconsistências encontradas
 * @returns {string} Relatório formatado
 */
function gerarRelatorioInconsistencias(inconsistencias) {
  if (inconsistencias.length === 0) {
    return 'Nenhuma inconsistência fiscal encontrada.';
  }
  
  let relatorio = `RELATÓRIO DE INCONSISTÊNCIAS FISCAIS\n`;
  relatorio += `=====================================\n\n`;
  
  const erros = inconsistencias.filter(inc => inc.severidade === 'ERRO');
  const avisos = inconsistencias.filter(inc => inc.severidade === 'AVISO');
  
  if (erros.length > 0) {
    relatorio += `🔴 ERROS (${erros.length}):\n`;
    erros.forEach((erro, index) => {
      relatorio += `${index + 1}. ${erro.mensagem}\n`;
      relatorio += `   CST: ${erro.cst} | ICMS-ST: ${erro.icmsSt}\n`;
      relatorio += `   UF: ${erro.uf || 'N/A'} | Contexto: ${erro.contexto || 'N/A'}\n`;
      relatorio += `   Sugestão: ${erro.sugestao}\n\n`;
    });
  }
  
  if (avisos.length > 0) {
    relatorio += `🟡 AVISOS (${avisos.length}):\n`;
    avisos.forEach((aviso, index) => {
      relatorio += `${index + 1}. ${aviso.mensagem}\n`;
      relatorio += `   CST: ${aviso.cst} | ICMS-ST: ${aviso.icmsSt}\n`;
      relatorio += `   UF: ${aviso.uf || 'N/A'} | Contexto: ${aviso.contexto || 'N/A'}\n`;
      relatorio += `   Sugestão: ${aviso.sugestao}\n\n`;
    });
  }
  
  return relatorio;
}

module.exports = {
  CST_INCOMPATIVEIS_COM_ST,
  CST_COMPATIVEIS_COM_ST,
  validarCSTcomICMSST,
  validarRegraFiscal,
  gerarRelatorioInconsistencias
}; 