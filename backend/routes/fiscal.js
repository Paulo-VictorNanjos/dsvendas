const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const knex = require('../config/database');
const { getDadosFiscaisProduto, calcularTributos, getRegrasIcms, getDadosClassFiscal } = require('../services/productFiscalRulesService');
const { checkAuth } = require('../middleware/auth');
const erpDatabase = require('../config/erp-database');
const fiscalRulesService = require('../services/fiscalRulesService');
const { validarRegraFiscal, gerarRelatorioInconsistencias, validarCSTcomICMSST } = require('../utils/fiscalValidation');
const FiscalLogger = require('../utils/fiscalLogger');
const fiscalAuditService = require('../services/fiscalAuditService');

/**
 * @route   GET /api/fiscal/verificar-regra-icms/:codigo/:uf
 * @desc    Verificar se existe uma regra ICMS para o código e UF especificados
 * @access  Privado
 */
router.get('/verificar-regra-icms/:codigo/:uf', async (req, res) => {
  try {
    const { codigo, uf } = req.params;
    
    console.log(`Verificando regra ICMS para código ${codigo} e UF ${uf}`);
    
    // Buscar registro na tabela regras_icms
    const regra = await knex('regras_icms')
      .where({
        codigo: codigo,
        uf: uf
      })
      .first();
    
    if (regra) {
      return res.json({
        exists: true,
        regra: regra
      });
    } else {
      // Tentar buscar qualquer regra com o mesmo código
      const regrasComMesmoCodigo = await knex('regras_icms')
        .where({ codigo: codigo })
        .select();
      
      // Buscar total de regras na tabela
      const totalRegras = await knex('regras_icms')
        .count('* as total')
        .first();
      
      return res.json({
        exists: false,
        message: `Regra ICMS para código ${codigo} e UF ${uf} não encontrada`,
        regrasComMesmoCodigo: regrasComMesmoCodigo || [],
        totalRegrasNaTabela: totalRegras.total
      });
    }
  } catch (error) {
    console.error(`Erro ao verificar regra ICMS: ${error.message}`);
    return res.status(500).json({
      error: 'Erro ao verificar regra ICMS',
      details: error.message
    });
  }
});

/**
 * Busca dados fiscais do produto diretamente do banco de dados ERP
 * Mantém compatibilidade com a estrutura usada no sistema mobile
 */
router.get('/produto-erp/:codigo', async (req, res) => {
  const { codigo } = req.params;
  
  try {
    // Verificar se temos conexão ERP configurada
    if (!erpDatabase) {
      // Fallback para o banco local se não tivermos conexão ERP
      const dadosFiscais = await knex('produtos')
        .where({ codigo })
        .select('aliq_ipi', 'cod_regra_icms', 'class_fiscal', 'cod_origem_prod')
        .first();
      
      return res.json({ success: true, data: dadosFiscais });
    }
    
    // Buscar do banco ERP (usando a mesma estrutura do sistema mobile)
    const dadosFiscais = await erpDatabase.raw(`
      SELECT 
        aliq_ipi, 
        cod_regra_icms, 
        class_fiscal, 
        cod_origem_prod 
      FROM 
        produtos 
      WHERE 
        codigo = ?
    `, [codigo]);
    
    if (!dadosFiscais || !dadosFiscais.rows || dadosFiscais.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }
    
    return res.json({ success: true, data: dadosFiscais.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar dados fiscais do produto do ERP:', error);
    
    // Fallback para busca no banco local
    try {
      const dadosFiscais = await knex('produtos')
        .where({ codigo })
        .select('aliq_ipi', 'cod_regra_icms', 'class_fiscal', 'cod_origem_prod')
        .first();
      
      return res.json({ success: true, data: dadosFiscais, source: 'local' });
    } catch (localError) {
      console.error('Erro ao buscar dados fiscais no banco local:', localError);
      return res.status(500).json({ success: false, message: 'Erro ao buscar dados fiscais' });
    }
  }
});

/**
 * Busca regras ICMS diretamente do banco de dados ERP
 * Seguindo a mesma estrutura do sistema mobile (icms_sinc_mobile.java)
 */
router.get('/regras-icms-erp', async (req, res) => {
  const { codigo, uf, tipo, ufEmpresa, codRegime } = req.query;
  
  try {
    // Verificar se temos conexão ERP configurada
    if (!erpDatabase) {
      // Fallback para o banco local se não tivermos conexão ERP
      const regrasIcms = await knex('regras_icms')
        .where({ codigo, uf })
        .select();
      
      return res.json({ success: true, data: regrasIcms });
    }
    
    // Buscar regras ICMS do banco ERP (seguindo a mesma estrutura do sistema mobile)
    const regrasIcms = await erpDatabase.raw(`
      SELECT 
        r.codigo, 
        r.acrescimo_icms, 
        i.uf, 
        i.st_icms, 
        i.aliq_icms, 
        i.red_icms,
        i.cod_convenio, 
        i.st_icms_contr, 
        i.aliq_icms_contr, 
        i.red_icms_contr,
        i.cod_convenio_contr, 
        i.icms_st, 
        i.cod_aliquota, 
        i.aliq_interna, 
        i.aliq_ecf,
        i.aliq_dif_icms_contr, 
        i.aliq_dif_icms_cons, 
        i.reducao_somente_icms_proprio,
        i.cod_cbnef, 
        i.st_icms_contr_reg_sn, 
        i.aliq_icms_contr_reg_sn,
        i.red_icms_contr_reg_sn, 
        i.aliq_dif_icms_contr_reg_sn,
        i.cod_convenio_contr_reg_sn, 
        i.icms_st_reg_sn
      FROM 
        regras_icms_cadastro r
      JOIN 
        regras_icms_itens i ON r.codigo = i.cod_regra_icms
      WHERE 
        r.codigo = ? AND i.uf = ?
    `, [codigo, uf]);
    
    // Converter resultado para o formato esperado pelo frontend
    const resultado = regrasIcms.rows || [];
    
    return res.json({ success: true, data: resultado });
  } catch (error) {
    console.error('Erro ao buscar regras ICMS do ERP:', error);
    
    // Fallback para busca no banco local
    try {
      const regrasIcms = await knex('regras_icms')
        .where({ codigo, uf })
        .select();
      
      return res.json({ success: true, data: regrasIcms, source: 'local' });
    } catch (localError) {
      console.error('Erro ao buscar regras ICMS no banco local:', localError);
      return res.status(500).json({ success: false, message: 'Erro ao buscar regras ICMS' });
    }
  }
});

/**
 * Busca classificação fiscal (IVA, alíquota interna, etc) diretamente do banco ERP
 */
router.get('/classificacao-fiscal-erp', async (req, res) => {
  const { ncm, uf, ufEmpresa } = req.query;
  
  try {
    // Verificar se temos conexão ERP configurada
    if (!erpDatabase) {
      // Fallback para o banco local
      const classFiscal = await knex('class_fiscal_dados')
        .where({ 
          'cod_ncm': ncm,
          'uf': uf
        })
        .select();
      
      return res.json({ 
        success: true, 
        data: classFiscal[0] || {}, 
        isOperacaoInterestadual: uf !== ufEmpresa
      });
    }
    
    // Buscar classificação fiscal do banco ERP
    const classFiscal = await erpDatabase.raw(`
      SELECT 
        cf.codigo AS cod_class_fiscal,
        cf.cod_ncm,
        dados.uf,
        dados.aliq_fcp,
        dados.aliq_fcpst,
        dados.aliq_pst,
        dados.iva,
        dados.aliq_interna,
        dados.iva_diferenciado,
        dados.cest,
        dados.iva_importado,
        dados.aliq_importado
      FROM 
        class_fiscal cf
      LEFT JOIN (
        SELECT 
          cod_class_fiscal, 
          uf, 
          aliq_fcp, 
          aliq_fcpst, 
          aliq_pst, 
          0::numeric AS iva, 
          0::numeric AS aliq_interna, 
          0::numeric AS iva_diferenciado, 
          ''::character varying AS cest, 
          0::numeric AS iva_importado, 
          0::numeric AS aliq_importado
        FROM 
          class_fiscal_fcp
        UNION 
        SELECT 
          cod_class_fiscal, 
          uf, 
          0::numeric AS aliq_fcp, 
          0::numeric AS aliq_fcpst, 
          0::numeric AS aliq_pst, 
          iva, 
          aliq_interna, 
          iva_diferenciado, 
          cest, 
          iva_importado, 
          aliq_importado
        FROM 
          public.class_fiscal_tributacoes
      ) dados ON cf.codigo = dados.cod_class_fiscal
      WHERE 
        cf.cod_ncm = ? AND dados.uf = ?
    `, [ncm, uf]);
    
    const resultado = classFiscal.rows && classFiscal.rows.length > 0 ? classFiscal.rows[0] : {};
    
    return res.json({ 
      success: true, 
      data: resultado, 
      isOperacaoInterestadual: uf !== ufEmpresa
    });
  } catch (error) {
    console.error('Erro ao buscar classificação fiscal do ERP:', error);
    
    // Fallback para busca no banco local
    try {
      const classFiscal = await knex('class_fiscal_dados')
        .where({ 
          'cod_ncm': ncm,
          'uf': uf
        })
        .select();
      
      return res.json({ 
        success: true, 
        data: classFiscal[0] || {}, 
        isOperacaoInterestadual: uf !== ufEmpresa,
        source: 'local'
      });
    } catch (localError) {
      console.error('Erro ao buscar classificação fiscal no banco local:', localError);
      return res.status(500).json({ success: false, message: 'Erro ao buscar classificação fiscal' });
    }
  }
});

/**
 * @route   GET /api/fiscal/verificar-st/:codigo/:uf
 * @desc    Verificar se um produto tem Substituição Tributária (ST) para uma UF específica
 * @access  Privado
 */
router.get('/verificar-st/:codigo/:uf', async (req, res) => {
  try {
    const { codigo, uf } = req.params;
    
    console.log(`Verificando ST para produto: ${codigo} e UF: ${uf}`);
    
    // Etapa 1: Buscar o cod_regra_icms do produto
    let codRegraIcms = null;
    
    if (erpDatabase) {
      // Buscar no banco ERP (prioridade)
      try {
        const regraFiscal = await erpDatabase.raw(`
          SELECT cod_regra_icms 
          FROM regras_fiscais_produtos 
          WHERE cod_produto = ? 
          LIMIT 1
        `, [codigo]);
        
        if (regraFiscal.rows && regraFiscal.rows.length > 0) {
          codRegraIcms = regraFiscal.rows[0].cod_regra_icms;
        }
      } catch (erpError) {
        console.error('Erro ao buscar regra fiscal no ERP:', erpError);
      }
    }
    
    // Se não encontrou no ERP, buscar no banco local
    if (codRegraIcms === null) {
      const regraFiscal = await knex('regras_fiscais_produtos')
        .where('cod_produto', codigo)
        .first();
      
      if (regraFiscal) {
        codRegraIcms = regraFiscal.cod_regra_icms;
      }
    }
    
    // Se não encontrou a regra ICMS
    if (codRegraIcms === null) {
      return res.json({
        success: false,
        temST: false,
        message: `Produto ${codigo} não tem regra fiscal cadastrada`
      });
    }
    
    // Etapa 2: Buscar informações de ST baseadas na regra ICMS e UF
    let temST = false;
    let cstIcms = '';
    let icmsSt = '';
    let detalhes = {};
    
    if (erpDatabase) {
      // Buscar no banco ERP (prioridade)
      try {
        const regrasIcms = await erpDatabase.raw(`
          SELECT 
            i.st_icms_contr, 
            i.icms_st, 
            i.aliq_icms_contr, 
            i.red_icms_contr,
            i.aliq_interna
          FROM 
            regras_icms_cadastro r
          JOIN 
            regras_icms_itens i ON r.codigo = i.cod_regra_icms
          WHERE 
            r.codigo = ? AND i.uf = ?
        `, [codRegraIcms, uf]);
        
        if (regrasIcms.rows && regrasIcms.rows.length > 0) {
          const regra = regrasIcms.rows[0];
          cstIcms = regra.st_icms_contr;
          icmsSt = regra.icms_st;
          
          // Verificar ST baseado no valor de icms_st ou no CST
          if (icmsSt === 'S') {
            temST = true;
          } else if (cstIcms) {
            // Verificar CSTs que indicam ST
            // CSTs do Regime Normal que indicam ST: 10, 30, 60, 70, 90 (quando há cálculo ST)
            // CSTs do Simples Nacional que indicam ST: 201, 202, 203, 900 (quando há cálculo ST)
            const cstsComST = ['10', '30', '60', '70', '201', '202', '203'];
            if (cstsComST.includes(cstIcms)) {
              temST = true;
            }
          }
          
          // Adicionar detalhes para ajudar no debug/visualização
          detalhes = {
            cstIcms: cstIcms,
            icmsSt: icmsSt,
            aliqIcms: regra.aliq_icms_contr,
            redIcms: regra.red_icms_contr,
            aliqInterna: regra.aliq_interna
          };
        }
      } catch (erpError) {
        console.error('Erro ao verificar ST no ERP:', erpError);
      }
    }
    
    // Se não encontrou no ERP, buscar no banco local
    if (!detalhes.cstIcms) {
      try {
        // Consultar da tabela regras_fiscais_produto
        const regraFiscal = await knex('regras_fiscais_produto')
          .where({
            'codigo_produto': codigo,
            'uf': uf
          })
          .first();
        
        if (regraFiscal) {
          cstIcms = regraFiscal.cst_icms;
          
          // CSTs do Regime Normal que indicam ST: 10, 30, 60, 70, 90 (quando há cálculo ST)
          // CSTs do Simples Nacional que indicam ST: 201, 202, 203, 900 (quando há cálculo ST)
          const cstsComST = ['10', '30', '60', '70', '201', '202', '203'];
          if (cstsComST.includes(cstIcms)) {
            temST = true;
          }
          
          // Adicionar detalhes
          detalhes = {
            cstIcms: cstIcms,
            icmsSt: temST ? 'S' : 'N',
            aliqIcms: regraFiscal.aliq_icms,
            redIcms: regraFiscal.red_bc_icms,
            aliqIcmsSt: regraFiscal.aliq_icms_st,
            margemSt: regraFiscal.margem_st
          };
        } else {
          // Consultar da tabela regras_icms
          const regrasIcms = await knex('regras_icms')
            .where({
              'codigo': codRegraIcms,
              'uf': uf
            })
            .select('cst', 'aliquota', 'reducao_base', 'aliq_st', 'mva_st')
            .first();
          
          if (regrasIcms) {
            cstIcms = regrasIcms.cst;
            
            // CSTs do Regime Normal que indicam ST: 10, 30, 60, 70, 90 (quando há cálculo ST)
            // CSTs do Simples Nacional que indicam ST: 201, 202, 203, 900 (quando há cálculo ST)
            const cstsComST = ['10', '30', '60', '70', '201', '202', '203'];
            if (cstsComST.includes(cstIcms)) {
              temST = true;
            }
            
            detalhes = {
              cstIcms: cstIcms,
              icmsSt: temST ? 'S' : 'N',
              aliqIcms: regrasIcms.aliquota,
              redIcms: regrasIcms.reducao_base,
              aliqIcmsSt: regrasIcms.aliq_st,
              margemSt: regrasIcms.mva_st
            };
          }
        }
      } catch (localError) {
        console.error('Erro ao verificar ST no banco local:', localError);
      }
    }
    
    return res.json({
      success: true,
      temST,
      codRegraIcms,
      detalhes
    });
  } catch (error) {
    console.error(`Erro ao verificar ST: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Erro ao verificar se produto tem ST',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/fiscal/validar-inconsistencias/:cod_regra_icms
 * @desc    Validar inconsistências fiscais de uma regra ICMS
 * @access  Privado
 */
router.get('/validar-inconsistencias/:cod_regra_icms', async (req, res) => {
  try {
    const { cod_regra_icms } = req.params;
    
    logger.info(`Validando inconsistências fiscais para regra ICMS: ${cod_regra_icms}`);
    
    // Buscar todas as UFs para essa regra ICMS
    const regrasIcms = await knex('regras_icms_itens')
      .where('cod_regra_icms', cod_regra_icms)
      .where('cod_empresa', 1);
    
    if (regrasIcms.length === 0) {
      return res.json({
        success: false,
        message: `Nenhuma regra ICMS encontrada para código ${cod_regra_icms}`
      });
    }
    
    const todasInconsistencias = [];
    
    // Validar cada UF
    for (const regra of regrasIcms) {
      const validacao = validarRegraFiscal(regra);
      
      if (!validacao.valido) {
        todasInconsistencias.push(...validacao.inconsistencias);
      }
    }
    
    const relatorio = gerarRelatorioInconsistencias(todasInconsistencias);
    
    return res.json({
      success: true,
      codRegraIcms: cod_regra_icms,
      totalRegras: regrasIcms.length,
      totalInconsistencias: todasInconsistencias.length,
      inconsistencias: todasInconsistencias,
      relatorio: relatorio
    });
  } catch (error) {
    logger.error(`Erro ao validar inconsistências fiscais: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Erro ao validar inconsistências fiscais',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/fiscal/validar-todas-inconsistencias
 * @desc    Validar inconsistências fiscais de todas as regras ICMS
 * @access  Privado
 */
router.get('/validar-todas-inconsistencias', async (req, res) => {
  try {
    logger.info('Iniciando validação de todas as inconsistências fiscais');
    
    // Buscar todas as regras ICMS
    const regrasIcms = await knex('regras_icms_itens')
      .where('cod_empresa', 1)
      .orderBy(['cod_regra_icms', 'uf']);
    
    if (regrasIcms.length === 0) {
      return res.json({
        success: false,
        message: 'Nenhuma regra ICMS encontrada no sistema'
      });
    }
    
    const todasInconsistencias = [];
    const regrasPorCodigo = {};
    
    // Agrupar regras por código
    regrasIcms.forEach(regra => {
      if (!regrasPorCodigo[regra.cod_regra_icms]) {
        regrasPorCodigo[regra.cod_regra_icms] = [];
      }
      regrasPorCodigo[regra.cod_regra_icms].push(regra);
    });
    
    // Validar cada regra
    for (const regra of regrasIcms) {
      const validacao = validarRegraFiscal(regra);
      
      if (!validacao.valido) {
        todasInconsistencias.push(...validacao.inconsistencias);
      }
    }
    
    // Estatísticas
    const stats = {
      totalRegras: regrasIcms.length,
      totalRegrasCodigo: Object.keys(regrasPorCodigo).length,
      totalInconsistencias: todasInconsistencias.length,
      erros: todasInconsistencias.filter(inc => inc.severidade === 'ERRO').length,
      avisos: todasInconsistencias.filter(inc => inc.severidade === 'AVISO').length
    };
    
    const relatorio = gerarRelatorioInconsistencias(todasInconsistencias);
    
    return res.json({
      success: true,
      stats: stats,
      inconsistencias: todasInconsistencias,
      relatorio: relatorio
    });
  } catch (error) {
    logger.error(`Erro ao validar todas as inconsistências fiscais: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Erro ao validar todas as inconsistências fiscais',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/fiscal/debug-produto/:codigo
 * @desc    Debug - verificar de onde vêm os dados fiscais inconsistentes
 * @access  Privado
 */
router.get('/debug-produto/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    
    logger.info(`Debug fiscal para produto: ${codigo}`);
    
    // 1. Buscar dados do produto
    const produto = await knex('produtos')
      .where('codigo', codigo)
      .first();
    
    // 2. Buscar regras fiscais do produto
    const regrasFiscaisProduto = await knex('regras_fiscais_produtos')
      .where('cod_produto', codigo)
      .first();
    
    // 3. Buscar regras ICMS para diferentes UFs (se existir cod_regra_icms)
    let regrasIcmsRS = null;
    let regrasIcmsSP = null;
    
    if (regrasFiscaisProduto?.cod_regra_icms) {
      regrasIcmsRS = await knex('regras_icms_itens')
        .where({
          'cod_regra_icms': regrasFiscaisProduto.cod_regra_icms,
          'uf': 'RS'
        })
        .first();
        
      regrasIcmsSP = await knex('regras_icms_itens')
        .where({
          'cod_regra_icms': regrasFiscaisProduto.cod_regra_icms,
          'uf': 'SP'
        })
        .first();
    }
    
    return res.json({
      success: true,
      debug: {
        produto: produto,
        regrasFiscaisProduto: regrasFiscaisProduto,
        regrasIcmsRS: regrasIcmsRS,
        regrasIcmsSP: regrasIcmsSP,
        analise: {
          temRegraFiscal: !!regrasFiscaisProduto,
          codRegraIcms: regrasFiscaisProduto?.cod_regra_icms,
          temStIcmsNaRegraFiscal: regrasFiscaisProduto && 'st_icms' in regrasFiscaisProduto,
          temIcmsStNaRegraFiscal: regrasFiscaisProduto && 'icms_st' in regrasFiscaisProduto,
          cstRS: regrasIcmsRS?.st_icms,
          icmsStRS: regrasIcmsRS?.icms_st,
          cstSP: regrasIcmsSP?.st_icms,
          icmsStSP: regrasIcmsSP?.icms_st
        }
      }
    });
  } catch (error) {
    logger.error(`Erro no debug fiscal: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Erro no debug fiscal',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/fiscal/auditar-produto/:codigo/:uf?
 * @desc    Auditar consistência fiscal de um produto
 * @access  Privado
 */
router.get('/auditar-produto/:codigo/:uf?', async (req, res) => {
  try {
    const { codigo, uf } = req.params;
    
    FiscalLogger.separador(`AUDITORIA PRODUTO ${codigo}`);
    
    const audit = await fiscalAuditService.auditarProduto(codigo, uf);
    const relatorio = fiscalAuditService.gerarRelatorio(audit);
    
    return res.json({
      success: true,
      audit: audit,
      relatorio: relatorio,
      resumo: {
        inconsistencias: audit.inconsistencias.length,
        recomendacoes: audit.recomendacoes.length,
        criticidade_maxima: audit.inconsistencias.reduce((max, inc) => {
          const prioridades = { 'CRITICA': 3, 'ALTA': 2, 'MEDIA': 1, 'BAIXA': 0 };
          const prioridadeAtual = prioridades[inc.severidade] || 0;
          const prioridadeMax = prioridades[max] || 0;
          return prioridadeAtual > prioridadeMax ? inc.severidade : max;
        }, 'BAIXA')
      }
    });
  } catch (error) {
    FiscalLogger.erroFiscal('AUDITORIA_ENDPOINT', req.params.codigo, error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao auditar produto',
      details: error.message
    });
  }
});

/**
 * @route   POST /api/fiscal/auditar-lote
 * @desc    Auditar múltiplos produtos em lote
 * @access  Privado
 */
router.post('/auditar-lote', async (req, res) => {
  try {
    const { produtos, uf } = req.body;
    
    if (!produtos || !Array.isArray(produtos)) {
      return res.status(400).json({
        success: false,
        error: 'Campo "produtos" é obrigatório e deve ser um array'
      });
    }
    
    FiscalLogger.separador(`AUDITORIA LOTE - ${produtos.length} PRODUTOS`);
    
    const resultados = await fiscalAuditService.auditarProdutos(produtos, uf);
    
    // Estatísticas gerais
    const stats = {
      total_produtos: produtos.length,
      produtos_com_inconsistencias: resultados.filter(r => r.inconsistencias?.length > 0).length,
      total_inconsistencias: resultados.reduce((acc, r) => acc + (r.inconsistencias?.length || 0), 0),
      inconsistencias_criticas: resultados.reduce((acc, r) => 
        acc + (r.inconsistencias?.filter(i => i.severidade === 'CRITICA').length || 0), 0)
    };
    
    return res.json({
      success: true,
      stats: stats,
      resultados: resultados,
      produtos_criticos: resultados
        .filter(r => r.inconsistencias?.some(i => i.severidade === 'CRITICA'))
        .map(r => r.produto)
    });
  } catch (error) {
    logger.error('Erro na auditoria em lote:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao auditar produtos em lote',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/fiscal/relatorio-inconsistencias
 * @desc    Gerar relatório completo de inconsistências fiscais
 * @access  Privado
 */
router.get('/relatorio-inconsistencias', async (req, res) => {
  try {
    const { uf, limite = 50 } = req.query;
    
    FiscalLogger.separador('RELATÓRIO GERAL DE INCONSISTÊNCIAS');
    
    // Buscar produtos que podem ter inconsistências
    const query = knex('regras_fiscais_produtos as rfp')
      .join('regras_icms_itens as rii', 'rfp.cod_regra_icms', 'rii.cod_regra_icms')
      .select('rfp.cod_produto')
      .where('rii.st_icms', '00')
      .where('rii.icms_st', 'S')
      .limit(parseInt(limite));
    
    if (uf) {
      query.where('rii.uf', uf);
    }
    
    const produtosComInconsistencias = await query;
    const codigosProdutos = produtosComInconsistencias.map(p => p.cod_produto);
    
    if (codigosProdutos.length === 0) {
      return res.json({
        success: true,
        message: 'Nenhuma inconsistência CST 00 + ICMS-ST encontrada',
        stats: { total: 0 }
      });
    }
    
    // Auditar produtos com inconsistências
    const auditResults = await fiscalAuditService.auditarProdutos(codigosProdutos, uf);
    
    // Agrupar por tipo de inconsistência
    const inconsistenciasPorTipo = {};
    auditResults.forEach(audit => {
      if (audit.inconsistencias) {
        audit.inconsistencias.forEach(inc => {
          if (!inconsistenciasPorTipo[inc.tipo]) {
            inconsistenciasPorTipo[inc.tipo] = [];
          }
          inconsistenciasPorTipo[inc.tipo].push({
            produto: audit.produto,
            ...inc
          });
        });
      }
    });
    
    return res.json({
      success: true,
      stats: {
        produtos_analisados: codigosProdutos.length,
        produtos_com_inconsistencias: auditResults.filter(r => r.inconsistencias?.length > 0).length,
        tipos_inconsistencias: Object.keys(inconsistenciasPorTipo).length
      },
      inconsistencias_por_tipo: inconsistenciasPorTipo,
      produtos_criticos: auditResults
        .filter(r => r.inconsistencias?.some(i => i.severidade === 'CRITICA'))
        .map(r => ({
          produto: r.produto,
          inconsistencias: r.inconsistencias.filter(i => i.severidade === 'CRITICA')
        }))
    });
  } catch (error) {
    logger.error('Erro ao gerar relatório de inconsistências:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao gerar relatório',
      details: error.message
    });
  }
});

module.exports = router; 