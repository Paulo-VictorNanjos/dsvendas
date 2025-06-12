/**
 * Sistema de Logs Fiscais Organizados
 * Padroniza e organiza os logs relacionados a cálculos fiscais
 */

const logger = require('./logger');

class FiscalLogger {
  
  /**
   * Log de início de processo fiscal
   */
  static inicioProcesso(tipo, produto, uf, detalhes = {}) {
    logger.info(`🚀 [FISCAL] ${tipo.toUpperCase()} - Produto: ${produto} | UF: ${uf}`, detalhes);
  }

  /**
   * Log de dados fiscais básicos do produto
   */
  static dadosFiscaisProduto(produto, dados) {
    const resumo = {
      produto: produto,
      cod_regra_icms: dados.cod_regra_icms,
      ncm: dados.class_fiscal || dados.ncm,
      origem: dados.cod_origem_prod,
      iva: dados.iva,
      fonte_dados: dados.fonte_iva || 'produto'
    };
    
    logger.info(`📋 [FISCAL-DADOS] Produto: ${produto}`, resumo);
  }

  /**
   * Log de regras ICMS específicas por UF
   */
  static regrasICMS(produto, uf, regras, fonte = 'regras_icms_itens') {
    const resumo = {
      produto: produto,
      uf: uf,
      cod_regra_icms: regras.cod_regra_icms,
      cst: regras.st_icms,
      cst_contr: regras.st_icms_contr,
      aliq_icms: regras.aliq_icms,
      icms_st: regras.icms_st,
      fonte: fonte
    };
    
    logger.info(`⚖️ [FISCAL-ICMS] ${produto} - ${uf}`, resumo);
  }

  /**
   * Log de validação fiscal (inconsistências)
   */
  static validacaoFiscal(produto, uf, status, detalhes) {
    const emoji = status === 'INCONSISTENTE' ? '❌' : status === 'CORRIGIDO' ? '🔧' : '✅';
    
    logger.info(`${emoji} [FISCAL-VALIDACAO] ${produto} - ${uf} | Status: ${status}`, detalhes);
  }

  /**
   * Log de resultado de cálculo fiscal
   */
  static resultadoCalculo(produto, uf, resultado) {
    const resumo = {
      produto: produto,
      uf: uf,
      cst: resultado.stIcms,
      aplica_st: resultado.aplicaIcmsSt || resultado.temST,
      valor_icms: resultado.valorIcms,
      valor_st: resultado.valorIcmsSt,
      base_st: resultado.baseIcmsSt,
      inconsistencia: resultado.inconsistenciaDetectada || false
    };
    
    const emoji = resultado.inconsistenciaDetectada ? '⚠️' : resultado.aplicaIcmsSt ? '💰' : '📊';
    logger.info(`${emoji} [FISCAL-RESULTADO] ${produto} - ${uf}`, resumo);
  }

  /**
   * Log de erro fiscal
   */
  static erroFiscal(contexto, produto, erro) {
    logger.error(`💥 [FISCAL-ERRO] ${contexto} - Produto: ${produto}`, {
      erro: erro.message,
      stack: erro.stack
    });
  }

  /**
   * Log de fallback de dados
   */
  static fallbackDados(contexto, origem, destino, motivo) {
    logger.warn(`🔄 [FISCAL-FALLBACK] ${contexto} | ${origem} → ${destino} | Motivo: ${motivo}`);
  }

  /**
   * Log de classificação fiscal
   */
  static classificacaoFiscal(ncm, uf, dados, fonte = 'class_fiscal_dados') {
    const resumo = {
      ncm: ncm,
      uf: uf,
      iva: dados?.iva || 0,
      aliq_interna: dados?.aliq_interna || 0,
      cest: dados?.cest || '',
      fonte: fonte
    };
    
    logger.info(`🏷️ [FISCAL-CLASSIFICACAO] NCM: ${ncm} - ${uf}`, resumo);
  }

  /**
   * Log resumido para debug de inconsistências
   */
  static debugInconsistencia(produto, dadosColetados) {
    logger.info(`🔍 [FISCAL-DEBUG] Produto: ${produto}`, {
      total_fontes: Object.keys(dadosColetados).length,
      fontes: Object.keys(dadosColetados),
      inconsistencias_detectadas: dadosColetados.inconsistencias || [],
      dados_por_fonte: dadosColetados
    });
  }

  /**
   * Separador visual para logs
   */
  static separador(titulo) {
    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`🎯 ${titulo.toUpperCase()}`);
    logger.info(`${'='.repeat(60)}`);
  }
}

module.exports = FiscalLogger; 