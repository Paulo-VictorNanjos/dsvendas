/**
 * Controlador para operações fiscais
 * Gerencia acesso às regras fiscais e cálculos tributários
 */

const knex = require('../config/database');
const erpConnection = require('../config/erp-database');

/**
 * Busca as regras fiscais de um produto específico
 */
exports.getRegrasFiscaisProduto = async (req, res) => {
  try {
    const { codigoProduto } = req.params;
    
    if (!codigoProduto) {
      return res.status(400).json({ 
        success: false, 
        message: 'Código do produto é obrigatório' 
      });
    }
    
    // Busca as regras fiscais associadas ao produto
    const regras = await knex('regras_fiscais_produtos')
      .where('cod_produto', codigoProduto)
      .first();
    
    if (!regras) {
      return res.status(404).json({ 
        success: false, 
        message: 'Regras fiscais não encontradas para este produto' 
      });
    }
    
    return res.json({
      success: true,
      data: regras
    });
  } catch (error) {
    console.error('Erro ao buscar regras fiscais:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar regras fiscais',
      error: error.message
    });
  }
};

/**
 * Busca as regras de cálculo fiscal para um produto e UF específicos
 */
exports.getRegraCalculoProdutoUF = async (req, res) => {
  try {
    const { codigoProduto, uf } = req.params;
    
    if (!codigoProduto || !uf) {
      return res.status(400).json({ 
        success: false, 
        message: 'Código do produto e UF são obrigatórios' 
      });
    }
    
    // Busca a regra de cálculo específica para o produto e UF
    const regra = await knex('regras_fiscais_produto')
      .where('codigo_produto', codigoProduto)
      .andWhere('uf', uf)
      .first();
    
    if (!regra) {
      return res.status(404).json({ 
        success: false, 
        message: 'Regra de cálculo fiscal não encontrada para este produto e UF' 
      });
    }
    
    return res.json({
      success: true,
      data: regra
    });
  } catch (error) {
    console.error('Erro ao buscar regra de cálculo fiscal:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar regra de cálculo fiscal',
      error: error.message
    });
  }
};

/**
 * Calcula impostos para um produto com base nas regras fiscais
 * Parâmetros esperados no body:
 * - codigoProduto: string
 * - uf: string (UF de destino)
 * - quantidade: number
 * - valorUnitario: number
 * - desconto: number (opcional)
 * - tipoCliente: string (opcional, 'C' para consumidor, 'E' para empresa/contribuinte)
 */
exports.calcularImpostosProduto = async (req, res) => {
  try {
    const { 
      codigoProduto, 
      uf, 
      quantidade, 
      valorUnitario, 
      desconto = 0, 
      tipoCliente = 'C' 
    } = req.body;
    
    // Validações básicas
    if (!codigoProduto || !uf || !quantidade || valorUnitario === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parâmetros insuficientes para cálculo' 
      });
    }
    
    // Busca as regras fiscais do produto
    const regra = await knex('regras_fiscais_produto')
      .where('codigo_produto', codigoProduto)
      .andWhere('uf', uf)
      .first();
    
    if (!regra) {
      return res.status(404).json({ 
        success: false, 
        message: 'Regra fiscal não encontrada para este produto e UF' 
      });
    }
    
    // Cálculos fiscais
    const valorTotal = quantidade * valorUnitario;
    const valorComDesconto = valorTotal - desconto;
    
    // Cálculo de ICMS
    let baseIcms = valorComDesconto;
    if (regra.red_bc_icms > 0) {
      baseIcms = baseIcms * (1 - (regra.red_bc_icms / 100));
    }
    const valorIcms = baseIcms * (regra.aliq_icms / 100);
    
    // Cálculo de ICMS-ST (se aplicável)
    let baseIcmsST = 0;
    let valorIcmsST = 0;
    
    // Verifica se tem ST (baseado na CST)
    const temST = ['10', '30', '60', '70', '90', '201', '202', '500', '900'].includes(regra.cst_icms);
    
    if (temST && regra.margem_st > 0) {
      // Cálculo da base do ICMS-ST com MVA
      baseIcmsST = valorComDesconto * (1 + (regra.margem_st / 100));
      
      // Se tiver pauta fiscal, usa o valor de pauta
      if (regra.preco_pauta > 0) {
        baseIcmsST = regra.preco_pauta * quantidade;
      }
      
      // Cálculo do valor do ICMS-ST
      const icmsProprio = valorIcms;
      valorIcmsST = (baseIcmsST * (regra.aliq_icms_st / 100)) - icmsProprio;
      
      // Garantir que ICMS-ST não seja negativo
      valorIcmsST = valorIcmsST > 0 ? valorIcmsST : 0;
    }
    
    // Cálculo de PIS/COFINS
    const valorPis = valorComDesconto * (regra.aliq_pis / 100);
    const valorCofins = valorComDesconto * (regra.aliq_cofins / 100);
    
    // Retorna os cálculos
    return res.json({
      success: true,
      data: {
        valorTotal,
        desconto,
        valorComDesconto,
        baseIcms,
        aliquotaIcms: regra.aliq_icms,
        valorIcms,
        cstIcms: regra.cst_icms,
        baseIcmsST,
        aliquotaIcmsST: regra.aliq_icms_st,
        valorIcmsST,
        aliquotaPis: regra.aliq_pis,
        valorPis,
        cstPis: regra.cst_pis,
        aliquotaCofins: regra.aliq_cofins,
        valorCofins,
        cstCofins: regra.cst_cofins,
        regraAplicada: regra
      }
    });
  } catch (error) {
    console.error('Erro ao calcular impostos:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao calcular impostos',
      error: error.message
    });
  }
};

/**
 * Busca as regras ICMS diretamente do ERP
 */
exports.getRegrasIcmsERP = async (req, res) => {
  try {
    // Tenta conexão direta com o ERP
    let regras;
    
    try {
      // Tenta buscar direto do ERP
      regras = await erpConnection.raw(`
        SELECT 
          r.codigo, 
          r.descricao,
          i.uf, 
          i.st_icms, 
          i.aliq_icms, 
          i.red_icms,
          i.st_icms_contr, 
          i.aliq_icms_contr, 
          i.red_icms_contr,
          i.icms_st
        FROM 
          regras_icms_cadastro r
        JOIN 
          regras_icms_itens i ON r.codigo = i.cod_regra_icms
        WHERE
          r.dt_exc IS NULL
        ORDER BY r.codigo, i.uf
      `);
      
      regras = regras.rows;
    } catch (error) {
      console.log('Falha ao conectar com ERP, usando banco local:', error.message);
      
      // Fallback para dados locais se falhar conexão com ERP
      regras = await knex('regras_icms')
        .select('codigo', 'uf', 'st_icms', 'aliq_icms', 'red_icms', 
                'st_icms_contr', 'aliq_icms_contr', 'red_icms_contr', 'icms_st')
        .orderBy(['codigo', 'uf']);
    }
    
    if (!regras || regras.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Nenhuma regra ICMS encontrada' 
      });
    }
    
    return res.json({
      success: true,
      data: regras
    });
  } catch (error) {
    console.error('Erro ao buscar regras ICMS:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar regras ICMS',
      error: error.message
    });
  }
};

/**
 * Define manualmente as regras fiscais para um produto
 */
exports.setRegrasFiscaisProduto = async (req, res) => {
  try {
    const { 
      codigoProduto,
      codRegraIcms,
      codRegraPisCofins,
      classFiscal,
      cest,
      codOrigemProd
    } = req.body;
    
    if (!codigoProduto || !codRegraIcms) {
      return res.status(400).json({ 
        success: false, 
        message: 'Código do produto e código da regra ICMS são obrigatórios' 
      });
    }
    
    // Verifica se o produto já tem regras fiscais
    const existente = await knex('regras_fiscais_produtos')
      .where('cod_produto', codigoProduto)
      .first();
      
    const codEmpresa = 1; // Empresa padrão, poderia vir do token de autenticação
    
    try {
      if (existente) {
        // Atualiza regras existentes
        await knex('regras_fiscais_produtos')
          .where('cod_produto', codigoProduto)
          .update({
            cod_regra_icms: codRegraIcms,
            cod_regra_pis_cofins: codRegraPisCofins || null,
            class_fiscal: classFiscal || null,
            cest: cest || null,
            cod_origem_prod: codOrigemProd || null
          });
      } else {
        // Insere novas regras
        await knex('regras_fiscais_produtos').insert({
          cod_empresa: codEmpresa,
          cod_produto: codigoProduto,
          cod_regra_icms: codRegraIcms,
          cod_regra_pis_cofins: codRegraPisCofins || null,
          class_fiscal: classFiscal || null,
          cest: cest || null,
          cod_origem_prod: codOrigemProd || null
        });
      }
      
      // Dispara a recalculação das regras específicas por UF
      // Esta parte deve ser disparada de forma assíncrona para não bloquear a resposta
      setTimeout(async () => {
        try {
          const listaUFs = await knex('regras_icms')
            .distinct('uf')
            .where('codigo', codRegraIcms)
            .pluck('uf');
          
          for (const uf of listaUFs) {
            await recalcularRegrasFiscaisPorUF(codigoProduto, codRegraIcms, uf);
          }
          console.log(`Regras fiscais recalculadas para produto ${codigoProduto}`);
        } catch (error) {
          console.error(`Erro ao recalcular regras fiscais: ${error.message}`);
        }
      }, 100);
      
      return res.json({
        success: true,
        message: 'Regras fiscais definidas com sucesso',
        data: {
          codigoProduto,
          codRegraIcms,
          codRegraPisCofins
        }
      });
    } catch (error) {
      console.error('Erro ao definir regras fiscais:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao definir regras fiscais',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição',
      error: error.message
    });
  }
};

/**
 * Função auxiliar para recalcular regras fiscais específicas por UF
 * para um produto após atualização da regra geral
 */
async function recalcularRegrasFiscaisPorUF(codigoProduto, codRegraIcms, uf) {
  try {
    // Busca a regra ICMS para esta UF
    const regraICMS = await knex('regras_icms')
      .where({ codigo: codRegraIcms, uf: uf })
      .first();
    
    if (!regraICMS) {
      console.log(`Regra ICMS não encontrada para código ${codRegraIcms} e UF ${uf}`);
      return;
    }
    
    // Busca o produto para obter o NCM
    const produto = await knex('regras_fiscais_produtos')
      .where('cod_produto', codigoProduto)
      .first();
    
    if (!produto) {
      console.log(`Produto não encontrado: ${codigoProduto}`);
      return;
    }
    
    // Valores padrão para PIS/COFINS
    const aliqPis = 1.65;
    const aliqCofins = 7.60;
    const cstPis = '01';
    const cstCofins = '01';
    
    // Determina CST e valores de ICMS
    const cstIcms = regraICMS.st_icms_contr || '00';
    const aliqIcms = regraICMS.aliq_icms_contr || 0;
    const redBcIcms = regraICMS.red_icms_contr || 0;
    
    // Verifica se já existe regra para este produto/UF
    const regraExistente = await knex('regras_fiscais_produto')
      .where({
        codigo_produto: codigoProduto,
        uf: uf
      })
      .first();
    
    const dadosRegra = {
      codigo_produto: codigoProduto,
      uf: uf,
      cst_icms: cstIcms,
      aliq_icms: aliqIcms,
      red_bc_icms: redBcIcms,
      aliq_pis: aliqPis,
      aliq_cofins: aliqCofins,
      cst_pis: cstPis,
      cst_cofins: cstCofins,
      codigo_ncm: produto.ncm,
      margem_st: regraICMS.icms_st === 'S' ? 30.00 : 0,
      aliq_icms_st: regraICMS.aliq_interna || 0,
      mvast: 0,
      updated_at: knex.fn.now()
    };
    
    if (regraExistente) {
      // Atualiza regra existente
      await knex('regras_fiscais_produto')
        .where({
          codigo_produto: codigoProduto,
          uf: uf
        })
        .update(dadosRegra);
    } else {
      // Insere nova regra
      dadosRegra.created_at = knex.fn.now();
      await knex('regras_fiscais_produto').insert(dadosRegra);
    }
    
    return true;
  } catch (error) {
    console.error(`Erro ao recalcular regra fiscal para produto ${codigoProduto}, UF ${uf}:`, error);
    return false;
  }
} 