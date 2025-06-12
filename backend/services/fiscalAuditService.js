/**
 * Serviço de Auditoria Fiscal
 * Detecta e reporta inconsistências entre diferentes fontes de dados fiscais
 */

const knex = require('../database/connection');
const FiscalLogger = require('../utils/fiscalLogger');

class FiscalAuditService {

  /**
   * Auditar dados fiscais de um produto específico
   */
  async auditarProduto(codigoProduto, uf = null) {
    try {
      FiscalLogger.separador(`AUDITORIA FISCAL - ${codigoProduto}`);
      
      const audit = {
        produto: codigoProduto,
        uf: uf,
        fontes: {},
        inconsistencias: [],
        recomendacoes: []
      };

      // 1. Buscar dados do produto base
      audit.fontes.produto = await this.buscarDadosProduto(codigoProduto);
      
      // 2. Buscar regras fiscais específicas do produto
      audit.fontes.regras_fiscais_produtos = await this.buscarRegrasFiscaisProduto(codigoProduto);
      
      // 3. Se temos UF, buscar regras ICMS específicas
      if (uf && audit.fontes.regras_fiscais_produtos?.cod_regra_icms) {
        audit.fontes.regras_icms_itens = await this.buscarRegrasICMSUF(
          audit.fontes.regras_fiscais_produtos.cod_regra_icms, 
          uf
        );
      }
      
      // 4. Buscar classificação fiscal se temos NCM
      const ncm = audit.fontes.produto?.class_fiscal;
      if (ncm && uf) {
        audit.fontes.class_fiscal_dados = await this.buscarClassificacaoFiscal(ncm, uf);
      }

      // 5. Análise de inconsistências
      this.analisarInconsistencias(audit);
      
      // 6. Gerar recomendações
      this.gerarRecomendacoes(audit);
      
      // 7. Log resumido
      FiscalLogger.debugInconsistencia(codigoProduto, audit);
      
      return audit;
      
    } catch (error) {
      FiscalLogger.erroFiscal('AUDITORIA', codigoProduto, error);
      throw error;
    }
  }

  /**
   * Buscar dados básicos do produto
   */
  async buscarDadosProduto(codigo) {
    return await knex('produtos')
      .select(
        'codigo',
        'class_fiscal',
        'cod_regra_icms',
        'cod_origem_prod',
        'aliq_ipi',
        'aliq_icms',
        'cest',
        'iva'
      )
      .where('codigo', codigo)
      .first();
  }

  /**
   * Buscar regras fiscais específicas do produto
   */
  async buscarRegrasFiscaisProduto(codigo) {
    return await knex('regras_fiscais_produtos')
      .where('cod_produto', codigo)
      .first();
  }

  /**
   * Buscar regras ICMS para UF específica
   */
  async buscarRegrasICMSUF(codRegraIcms, uf) {
    return await knex('regras_icms_itens')
      .where({
        'cod_regra_icms': codRegraIcms,
        'uf': uf
      })
      .first();
  }

  /**
   * Buscar classificação fiscal
   */
  async buscarClassificacaoFiscal(ncm, uf) {
    return await knex('class_fiscal_dados')
      .where({
        'cod_ncm': ncm,
        'uf': uf
      })
      .first();
  }

  /**
   * Analisar inconsistências entre fontes
   */
  analisarInconsistencias(audit) {
    const { fontes } = audit;
    
    // 1. Verificar inconsistência CST 00 + ICMS-ST
    if (fontes.regras_icms_itens) {
      const cst = fontes.regras_icms_itens.st_icms;
      const icmsSt = fontes.regras_icms_itens.icms_st;
      
      if (cst === '00' && icmsSt === 'S') {
        audit.inconsistencias.push({
          tipo: 'CST_INCOMPATIVEL_ST',
          severidade: 'CRITICA',
          descricao: `CST ${cst} (Tributada integralmente) incompatível com ICMS-ST = '${icmsSt}'`,
          fonte: 'regras_icms_itens',
          uf: audit.uf,
          correcao_sugerida: `Alterar icms_st para 'N' ou CST para '10'`
        });
      }
    }

    // 2. Verificar conflitos entre cod_regra_icms
    const regraFiscal = fontes.regras_fiscais_produtos?.cod_regra_icms;
    const regraProduto = fontes.produto?.cod_regra_icms;
    
    if (regraFiscal && regraProduto && regraFiscal !== regraProduto) {
      audit.inconsistencias.push({
        tipo: 'CONFLITO_REGRA_ICMS',
        severidade: 'ALTA',
        descricao: `Conflito de cod_regra_icms: produto=${regraProduto}, regras_fiscais=${regraFiscal}`,
        correcao_sugerida: 'Usar apenas regras_fiscais_produtos como fonte autoritativa'
      });
    }

    // 3. Verificar NCM ausente ou inválido
    const ncm = fontes.produto?.class_fiscal;
    if (!ncm || ncm.length !== 8) {
      audit.inconsistencias.push({
        tipo: 'NCM_INVALIDO',
        severidade: 'MEDIA',
        descricao: `NCM ausente ou inválido: '${ncm}'`,
        correcao_sugerida: 'Definir NCM válido de 8 dígitos'
      });
    }

    // 4. Verificar ausência de classificação fiscal
    if (ncm && audit.uf && !fontes.class_fiscal_dados) {
      audit.inconsistencias.push({
        tipo: 'CLASSIFICACAO_FISCAL_AUSENTE',
        severidade: 'MEDIA',
        descricao: `Dados de classificação fiscal não encontrados para NCM ${ncm} e UF ${audit.uf}`,
        correcao_sugerida: 'Cadastrar dados na tabela class_fiscal_dados'
      });
    }
  }

  /**
   * Gerar recomendações de melhoria
   */
  gerarRecomendacoes(audit) {
    const { fontes, inconsistencias } = audit;
    
    // 1. Recomendação para padronização de fonte
    if (fontes.produto?.cod_regra_icms && !fontes.regras_fiscais_produtos) {
      audit.recomendacoes.push({
        tipo: 'PADRONIZACAO',
        prioridade: 'ALTA',
        descricao: 'Migrar cod_regra_icms da tabela produtos para regras_fiscais_produtos',
        acao: 'Criar registro em regras_fiscais_produtos'
      });
    }

    // 2. Recomendação para correção de inconsistências críticas
    const inconsistenciasCriticas = inconsistencias.filter(i => i.severidade === 'CRITICA');
    if (inconsistenciasCriticas.length > 0) {
      audit.recomendacoes.push({
        tipo: 'CORRECAO_URGENTE',
        prioridade: 'CRITICA',
        descricao: `${inconsistenciasCriticas.length} inconsistência(s) crítica(s) detectada(s)`,
        acao: 'Executar correções imediatamente para evitar cálculos fiscais incorretos'
      });
    }

    // 3. Recomendação para classificação fiscal
    if (!fontes.class_fiscal_dados && fontes.produto?.class_fiscal) {
      audit.recomendacoes.push({
        tipo: 'COMPLETUDE_DADOS',
        prioridade: 'MEDIA',
        descricao: 'Cadastrar dados de classificação fiscal completos',
        acao: 'Incluir IVA, alíquotas e demais dados fiscais na class_fiscal_dados'
      });
    }
  }

  /**
   * Gerar relatório de auditoria em formato texto
   */
  gerarRelatorio(audit) {
    let relatorio = [];
    
    relatorio.push(`\n📋 RELATÓRIO DE AUDITORIA FISCAL`);
    relatorio.push(`${'='.repeat(50)}`);
    relatorio.push(`Produto: ${audit.produto}`);
    relatorio.push(`UF: ${audit.uf || 'N/A'}`);
    relatorio.push(`Data: ${new Date().toLocaleString('pt-BR')}`);
    relatorio.push(`\n`);

    // Fontes de dados
    relatorio.push(`📚 FONTES DE DADOS:`);
    Object.keys(audit.fontes).forEach(fonte => {
      const dados = audit.fontes[fonte];
      const status = dados ? '✅ Encontrada' : '❌ Não encontrada';
      relatorio.push(`  - ${fonte}: ${status}`);
    });
    
    // Inconsistências
    relatorio.push(`\n⚠️ INCONSISTÊNCIAS (${audit.inconsistencias.length}):`);
    if (audit.inconsistencias.length === 0) {
      relatorio.push(`  ✅ Nenhuma inconsistência detectada`);
    } else {
      audit.inconsistencias.forEach((inc, index) => {
        relatorio.push(`  ${index + 1}. [${inc.severidade}] ${inc.tipo}`);
        relatorio.push(`     ${inc.descricao}`);
        relatorio.push(`     Correção: ${inc.correcao_sugerida}`);
        relatorio.push(``);
      });
    }

    // Recomendações
    relatorio.push(`\n💡 RECOMENDAÇÕES (${audit.recomendacoes.length}):`);
    if (audit.recomendacoes.length === 0) {
      relatorio.push(`  ✅ Nenhuma recomendação adicional`);
    } else {
      audit.recomendacoes.forEach((rec, index) => {
        relatorio.push(`  ${index + 1}. [${rec.prioridade}] ${rec.tipo}`);
        relatorio.push(`     ${rec.descricao}`);
        relatorio.push(`     Ação: ${rec.acao}`);
        relatorio.push(``);
      });
    }

    return relatorio.join('\n');
  }

  /**
   * Executar auditoria em lote para múltiplos produtos
   */
  async auditarProdutos(codigos, uf = null) {
    const resultados = [];
    
    for (const codigo of codigos) {
      try {
        const audit = await this.auditarProduto(codigo, uf);
        resultados.push(audit);
      } catch (error) {
        resultados.push({
          produto: codigo,
          erro: error.message,
          inconsistencias: [],
          recomendacoes: []
        });
      }
    }

    return resultados;
  }
}

module.exports = new FiscalAuditService(); 