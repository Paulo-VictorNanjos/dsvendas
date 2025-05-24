const knex = require('../database/connection');
const logger = require('../utils/logger');

class FiscalRulesService {
  /**
   * Get fiscal data for a product
   * @param {string} codigo - Product code
   */
  async getDadosFiscaisProduto(codigo) {
    try {
      // Buscar dados básicos do produto
      const produto = await knex('produtos')
        .select(
          'produtos.codigo',
          'produtos.descricao',
          'produtos.aliq_ipi',
          'produtos.cod_regra_icms',
          'produtos.class_fiscal',
          'produtos.cod_origem_prod'
        )
        .where('produtos.codigo', codigo)
        .first();
        
      if (!produto) {
        return null;
      }
      
      // Buscar regras fiscais específicas do produto - PRINCIPAL FONTE DE INFORMAÇÃO FISCAL
      let regrasFiscaisProduto = null;
      let codRegraIcms = null;
      
      try {
        regrasFiscaisProduto = await knex('regras_fiscais_produtos')
          .where({
            'cod_produto': codigo
          })
          .first();
          
        if (regrasFiscaisProduto) {
          codRegraIcms = regrasFiscaisProduto.cod_regra_icms;
          logger.info(`Regra fiscal encontrada para produto ${codigo}: cod_regra_icms = ${codRegraIcms}`);
        } else {
          logger.warn(`Nenhuma regra fiscal encontrada para produto ${codigo}`);
        }
      } catch (error) {
        logger.error(`Erro ao buscar regras fiscais do produto ${codigo}: ${error.message}`);
      }
      
      // Buscar regras de ICMS, usando o cod_regra_icms da tabela regras_fiscais_produtos
      let regrasIcms = null;
      try {
        regrasIcms = await knex('regras_icms_itens')
          .where('cod_regra_icms', codRegraIcms)
          .where('uf', 'SP')  // Usar UF padrão SP, mas deve ser substituída pelo cliente real
          .first();
          
        if (!regrasIcms) {
          // Tentar buscar qualquer regra disponível para essa regra ICMS
          regrasIcms = await knex('regras_icms_itens')
            .where('cod_regra_icms', codRegraIcms)
            .first();
        }
      } catch (error) {
        logger.warn(`Erro ao buscar regras ICMS para produto ${codigo}: ${error.message}`);
      }
      
      // Buscar classificação fiscal, se disponível
      let classFiscal = null;
      let tributacaoFiscal = null;
      
      if (produto.class_fiscal) {
        try {
          classFiscal = await knex('class_fiscal')
            .where('cod_ncm', produto.class_fiscal)
            .first();
          
          // Se encontrou a classificação fiscal, buscar tributação específica
          if (classFiscal) {
            try {
              // Buscar tributação para SP (padrão)
              tributacaoFiscal = await knex('class_fiscal_tributacoes')
                .where({
                  'cod_class_fiscal': classFiscal.codigo,
                  'uf': 'SP'
                })
                .first();
            } catch (tribError) {
              logger.warn(`Erro ao buscar tributação fiscal para produto ${codigo}: ${tribError.message}`);
            }
          }
        } catch (error) {
          logger.warn(`Erro ao buscar class_fiscal para produto ${codigo}: ${error.message}`);
        }
      }
      
      // Montar objeto de resposta completo
      const dadosFiscais = {
        ...produto,
        cod_regime: 3, // Valor padrão para regime normal
        
        // Adicionar valores das regras fiscais específicas (se disponíveis)
        ...(regrasFiscaisProduto || {}),
        
        // Adicionar valores das regras de ICMS (se disponíveis)
        st_icms: regrasIcms?.st_icms || '00',
        aliq_icms: regrasIcms?.aliq_icms || 0,
        red_icms: regrasIcms?.red_icms || 0,
        icms_st: regrasIcms?.icms_st || 'N',
        
        // Adicionar valores de classificação fiscal (se disponíveis)
        ncm: classFiscal?.cod_ncm || produto.class_fiscal || '',
        
        // Adicionar valores de tributação fiscal (CEST e IVA)
        // IMPORTANTE: Priorizar IVA da tributação fiscal sobre o IVA das regras fiscais
        cest: tributacaoFiscal?.cest || regrasFiscaisProduto?.cest || '',
        iva: tributacaoFiscal?.iva || regrasFiscaisProduto?.iva || 0
      };
      
      // Log para debug
      logger.info(`Dados fiscais do produto ${codigo} recuperados:`, {
        ...dadosFiscais,
        fonte_iva: tributacaoFiscal?.iva ? 'tributacao_fiscal' : (regrasFiscaisProduto?.iva ? 'regras_fiscais_produtos' : 'padrao')
      });
      
      return dadosFiscais;
    } catch (error) {
      logger.error(`Erro ao buscar dados fiscais do produto ${codigo}:`, error);
      // Retornar um objeto com valores padrão para não quebrar a aplicação
      return {
        codigo,
        class_fiscal: '',
        aliq_ipi: 0,
        aliq_icms: 0,
        cod_regra_icms: 0,
        cod_origem_prod: '0',
        cod_regime: 3,
        st_icms: '00',
        red_icms: 0,
        icms_st: 'N',
        ncm: '',
        cest: '',
        iva: 0
      };
    }
  }

  /**
   * Get ICMS rules
   * @param {object} params - Query parameters
   */
  async getRegrasIcms(params) {
    try {
      const { codigo, uf, ufEmpresa, codRegime } = params;
      
      // Buscar regra na tabela regras_icms_itens apenas com filtro de empresa = 1
      let regras = await knex('regras_icms_itens')
        .where({
          'cod_regra_icms': codigo,
          'uf': uf
        })
        .first();
      
      if (!regras) {
        logger.warn(`Regra ICMS não encontrada para código ${codigo}, UF ${uf}. Usando valores padrão.`);
        
        // Fornecer dados padrão para não quebrar o fluxo
        regras = {
          cod_regra_icms: codigo,
          uf: uf,
          st_icms: '00',
          aliq_icms: 0,
          red_icms: 0,
          st_icms_contr: '00',
          aliq_icms_contr: 0,
          red_icms_contr: 0,
          icms_st: 'N'
        };
      }

      // Verificar se é operação interestadual
      const isOperacaoInterestadual = uf !== ufEmpresa;

      // Se for operação interestadual, buscar regras específicas
      if (isOperacaoInterestadual) {
        // Buscar alíquota interestadual
        const aliqInterestadual = await knex('icms_aliq_interna')
          .where({
            uf_origem: ufEmpresa,
            uf_destino: uf
          })
          .first();

        // Buscar FCP da tabela class_fiscal_fcp
        const fcpData = await knex('class_fiscal_fcp')
          .where('uf', uf)
          .first();

        // Adicionar informações à resposta
        regras.aliq_interestadual = aliqInterestadual ? aliqInterestadual.aliquota : 12;
        regras.possui_fcp = fcpData ? 'S' : 'N';
        regras.aliq_fcp = fcpData ? fcpData.aliq_fcp : 0;
        regras.aliq_fcpst = fcpData ? fcpData.aliq_fcpst : 0;
      }

      // Adicionar informação sobre operação interestadual para facilitar cálculos
      regras.isOperacaoInterestadual = isOperacaoInterestadual;

      // Buscar regras específicas para Simples Nacional se aplicável
      if (codRegime === 1 || codRegime === 4) {
        try {
          // Usar campos específicos para Simples Nacional da própria tabela regras_icms_itens
          regras.st_icms = regras.st_icms_contr_reg_sn || regras.st_icms;
          regras.aliq_icms = regras.aliq_icms_contr_reg_sn || regras.aliq_icms;
          regras.red_icms = regras.red_icms_contr_reg_sn || regras.red_icms;
          regras.icms_st = regras.icms_st_reg_sn || regras.icms_st;
        } catch (snError) {
          logger.warn(`Erro ao obter regras do Simples Nacional: ${snError.message}`);
        }
      }
      
      return regras;
    } catch (error) {
      logger.error(`Erro ao buscar regras ICMS para código ${params.codigo} e UF ${params.uf}:`, error);
      return {
        cod_regra_icms: params.codigo,
        uf: params.uf,
        st_icms: '00',
        aliq_icms: 18,
        red_icms: 0,
        st_icms_contr: '00',
        aliq_icms_contr: 18,
        red_icms_contr: 0,
        icms_st: 'N',
        isOperacaoInterestadual: params.uf !== params.ufEmpresa
      };
    }
  }

  /**
   * Get fiscal classification data
   * @param {object} params - Query parameters
   */
  async getDadosClassFiscal(params) {
    try {
      const { ncm, uf, ufEmpresa } = params;
      
      // Primeiro, buscar o código da class_fiscal pelo NCM
      let codClassFiscal = null;
      try {
        const classFiscal = await knex('class_fiscal')
          .where('cod_ncm', ncm)
          .first();
          
        if (classFiscal) {
          codClassFiscal = classFiscal.codigo;
        }
      } catch (error) {
        logger.warn(`Erro ao buscar cod_class_fiscal para NCM ${ncm}: ${error.message}`);
      }
      
      // Se não encontrar o código da classificação, usar o NCM diretamente
      if (!codClassFiscal) {
        codClassFiscal = ncm;
      }
      
      // Agora buscar dados na tabela class_fiscal_dados
      const dados = await knex('class_fiscal_dados')
        .select(
          'iva',
          'aliq_interna',
          'iva_importado',
          'aliq_importado',
          'cest'
        )
        .where({
          'cod_ncm': ncm,
          'uf': uf
        })
        .first();
        
      if (!dados) {
        // Valores padrão para evitar erro
        return {
          iva: 0,
          aliq_interna: 18,
          iva_importado: 0,
          aliq_importado: 0,
          cest: '',
          isOperacaoInterestadual: uf !== ufEmpresa
        };
      }

      // Se houver CEST, buscar regras específicas por CEST
      if (dados.cest) {
        const dadosCest = await knex('class_fiscal_dados')
          .select(
            'iva',
            'aliq_interna',
            'iva_importado',
            'aliq_importado'
          )
          .where({
            'cod_ncm': ncm,
            'uf': uf,
            'cest': dados.cest
          })
          .first();

        if (dadosCest) {
          // Sobrescrever valores com as regras específicas do CEST
          Object.assign(dados, dadosCest);
        }
      }

      // Verificar se é operação interestadual
      const isOperacaoInterestadual = uf !== ufEmpresa;
      dados.isOperacaoInterestadual = isOperacaoInterestadual;
      
      return dados;
    } catch (error) {
      logger.error('Erro ao buscar dados da classificação fiscal:', error);
      // Retornar dados padrão em caso de erro
      return {
        iva: 0,
        aliq_interna: 18,
        iva_importado: 0,
        aliq_importado: 0,
        cest: '',
        isOperacaoInterestadual: params.uf !== params.ufEmpresa
      };
    }
  }

  /**
   * Calcular o ICMS-ST (Substituição Tributária) para um produto em uma determinada UF
   * @param {Object} params Parâmetros para o cálculo
   * @param {string} params.codigoProduto Código do produto
   * @param {string} params.ufDestino UF de destino
   * @param {number} params.valorProduto Valor do produto
   * @param {number} params.valorIpi Valor do IPI (opcional)
   * @param {boolean} params.tipoContribuinte Tipo de cliente (true = contribuinte, false = não contribuinte)
   * @param {number} params.valorDesconto Valor do desconto (opcional)
   * @param {boolean} params.isImportado Flag indicando se o produto é importado (opcional)
   * @returns {Object} Resultado do cálculo
   */
  async calcularIcmsST(params) {
    try {
      const {
        codigoProduto,
        ufDestino,
        valorProduto,
        valorIpi = 0,
        tipoContribuinte = false,
        valorDesconto = 0,
        isImportado = false
      } = params;
      
      logger.info(`Calculando ICMS-ST para produto ${codigoProduto}, UF ${ufDestino}, valor ${valorProduto}, desconto ${valorDesconto}, isImportado=${isImportado}`);
      
      // 1. Buscar o produto
      const produto = await knex('produtos')
        .where('codigo', codigoProduto)
        .first();

      if (!produto) {
        return {
          success: false,
          error: `Produto com código ${codigoProduto} não encontrado`
        };
      }

      // CORREÇÃO: Usar SOMENTE a tabela regras_fiscais_produtos para obter o cod_regra_icms
      // Remover completamente o fallback para a tabela produtos
      const regraFiscalProduto = await knex('regras_fiscais_produtos')
        .where({
          'cod_produto': codigoProduto
        })
        .first();
      
      if (!regraFiscalProduto || !regraFiscalProduto.cod_regra_icms) {
        return {
          success: false,
          error: `Produto ${codigoProduto} não possui regra fiscal configurada na tabela regras_fiscais_produtos`,
          valorICMSST: 0
        };
      }
      
      const codRegraIcms = regraFiscalProduto.cod_regra_icms;
      logger.info(`Produto ${codigoProduto} usa cod_regra_icms ${codRegraIcms} da tabela regras_fiscais_produtos`);

      // 2. Consultar a tabela regras_icms_itens para obter as regras fiscais
      // Buscar apenas com empresa = 1
      let regraIcms = await knex('regras_icms_itens')
        .where({
          'cod_regra_icms': codRegraIcms,
          'uf': ufDestino,
          'cod_empresa': 1
        })
        .first();
      
      if (!regraIcms) {
        // Log detalhado para depuração
        logger.info(`Regra ICMS não encontrada com cod_empresa = 1 para código ${codRegraIcms} e UF ${ufDestino}`);
        
        return {
          success: false,
          error: `Regras fiscais não encontradas para o produto ${codigoProduto} com cod_regra_icms ${codRegraIcms} e UF ${ufDestino} na empresa 1`,
          valorICMSST: 0
        };
      }
      
      // Log da regra encontrada para facilitar depuração
      logger.info(`Regra ICMS encontrada para UF ${ufDestino}: ${JSON.stringify(regraIcms)}`);

      // 3. Determinar os valores com base no tipo de cliente (contribuinte ou não)
      let stIcms = '';
      let aliqIcms = 0;
      let redIcms = 0;
      
      if (tipoContribuinte) {
        // Cliente contribuinte usa valores _contr
        stIcms = regraIcms.st_icms_contr || '00';
        aliqIcms = regraIcms.aliq_icms_contr || 0;
        redIcms = regraIcms.red_icms_contr || 0;
      } else {
        // Cliente não contribuinte
        stIcms = regraIcms.st_icms || '00';
        aliqIcms = regraIcms.aliq_icms || 0;
        redIcms = regraIcms.red_icms || 0;
      }

      // CORREÇÃO: Verificação de ST mais abrangente
      // 1) Se tem ST marcado explicitamente (icms_st='S'), sempre calcular ST
      const temSTporFlag = regraIcms.icms_st === 'S';
      
      // 2) Se tem CST específico de ST, sempre calcular ST
      const cstsComST = ['10', '30', '60', '70', '201', '202', '203'];
      const temSTporCST = cstsComST.includes(stIcms);
      
      // 3) Se tem IVA e alíquota interna na classificação fiscal
      let temSTporClassificacao = false;
      let ivaParaCalculo = 0;
      let ivaImportado = 0;
      let aliqInternaParaCalculo = 0;
      let aliqImportadoParaCalculo = 0;
      let dadosClass = null;
      
      // Se o produto tem class_fiscal, verificar na tabela class_fiscal_dados
      if (produto.class_fiscal) {
        try {
          dadosClass = await knex('class_fiscal_dados')
            .where({
              'cod_ncm': produto.class_fiscal,
              'uf': ufDestino
            })
            .first();
          
          if (dadosClass) {
            const ivaClassificacao = parseFloat(dadosClass.iva || 0);
            const aliqInternaClassificacao = parseFloat(dadosClass.aliq_interna || 0);
            
            // Salvar valores especiais para produtos importados
            if (dadosClass.iva_importado !== undefined) {
              ivaImportado = parseFloat(dadosClass.iva_importado || 0);
              logger.info(`Produto ${codigoProduto} na UF ${ufDestino} tem IVA importado=${ivaImportado}%`);
            }
            
            if (dadosClass.aliq_importado !== undefined) {
              aliqImportadoParaCalculo = parseFloat(dadosClass.aliq_importado || 0);
              logger.info(`Produto ${codigoProduto} na UF ${ufDestino} tem alíquota importado=${aliqImportadoParaCalculo}%`);
            }
            
            // Se tem IVA e alíquota interna, considerar que tem ST
            if (ivaClassificacao > 0 && aliqInternaClassificacao > 0) {
              temSTporClassificacao = true;
              ivaParaCalculo = ivaClassificacao;
              aliqInternaParaCalculo = aliqInternaClassificacao;
              logger.info(`Produto ${codigoProduto} na UF ${ufDestino} tem IVA=${ivaClassificacao}% e aliq_interna=${aliqInternaClassificacao}%`);
            }
          }
        } catch (classError) {
          logger.warn(`Erro ao verificar dados de classificação fiscal para ST: ${classError.message}`);
        }
      }
      
      // Determinar se deve calcular ST
      // CORREÇÃO: Respeita a configuração icms_st='N' com prioridade sobre classificação fiscal
      // Se icms_st='N' explicitamente, não deve calcular ST mesmo que tenha classificação fiscal com IVA
      const deveCalcularST = (regraIcms.icms_st !== 'N') && (temSTporFlag || temSTporCST || temSTporClassificacao);
      
      // Logging para debug
      logger.info(`Verificação ST para produto ${codigoProduto} na UF ${ufDestino}:
        icms_st='${regraIcms.icms_st}', 
        cst='${stIcms}', 
        temSTporFlag=${temSTporFlag}, 
        temSTporCST=${temSTporCST},
        temSTporClassificacao=${temSTporClassificacao},
        deveCalcularST=${deveCalcularST},
        isImportado=${isImportado}`);
      
      if (!deveCalcularST) {
        return {
          success: true,
          temST: false,
          valorICMSST: 0,
          valorFCPST: 0,
          baseICMSST: 0,
          mensagem: 'Produto não está sujeito à Substituição Tributária.'
        };
      }
      
      // Buscar dados da classificação fiscal para obter IVA e alíquota interna
      let iva = ivaParaCalculo;
      let aliqInterna = aliqInternaParaCalculo;
      let aliqFcpSt = 0;
      
      // Se for produto importado, usar IVA específico para importados
      if (isImportado && ivaImportado > 0) {
        logger.info(`Produto ${codigoProduto} é importado. Usando IVA importado: ${ivaImportado}% em vez do IVA padrão: ${iva}%`);
        iva = ivaImportado;
      }
      
      // Se for produto importado, usar alíquota específica para importados
      if (isImportado && aliqImportadoParaCalculo > 0) {
        logger.info(`Produto ${codigoProduto} é importado. Usando alíquota interna para importados: ${aliqImportadoParaCalculo}% em vez da alíquota padrão: ${aliqInterna}%`);
        aliqInterna = aliqImportadoParaCalculo;
      }
      
      // Se não tiver IVA da classificação fiscal, tentar obter de outras fontes
      if (iva <= 0) {
        // Tentar obter IVA da regra fiscal do produto
        iva = parseFloat(regraFiscalProduto.iva || 0);
      }
      
      // Se não tiver alíquota interna da classificação fiscal, tentar obter de outras fontes
      if (aliqInterna <= 0) {
        // Tentar obter da regra ICMS
        aliqInterna = parseFloat(regraIcms.aliq_interna || 18); // Valor padrão 18%
      }

      // Buscar FCP-ST usando o código da classificação fiscal
      try {
        if (produto.class_fiscal) {
          // Primeiro buscar a classificação fiscal do produto
          const classFiscal = await knex('class_fiscal')
            .where('cod_ncm', produto.class_fiscal)
            .whereNull('dt_exc')
            .first();

          if (classFiscal) {
            // Depois buscar o FCP-ST usando o código da classificação fiscal
            const fcpData = await knex('class_fiscal_fcp')
              .where({
                'cod_class_fiscal': classFiscal.codigo,
                'uf': ufDestino
              })
              .first();
              
            if (fcpData && fcpData.aliq_fcpst) {
              aliqFcpSt = parseFloat(fcpData.aliq_fcpst || 0);
              logger.info(`FCP-ST encontrado para UF ${ufDestino}: ${aliqFcpSt}%`);
            }
          }
        }
      } catch (fcpError) {
        logger.warn(`Erro ao buscar FCP-ST: ${fcpError.message}`);
        // Continuar com aliqFcpSt = 0
      }
      
      // Log da alíquota interna e IVA que serão efetivamente usados no cálculo
      logger.info(`Valores efetivamente usados no cálculo de ICMS-ST para produto ${codigoProduto} e UF ${ufDestino}:
        Produto importado: ${isImportado ? 'Sim' : 'Não'}
        Alíquota interna: ${aliqInterna}%
        IVA: ${iva}%
        FCP-ST: ${aliqFcpSt}%
      `);
      
      // NOVO: Calcular o valor do ICMS-ST
      const valorLiquido = valorProduto - valorDesconto;
      
      // Função de arredondamento para 4 casas decimais
      const arredondar4Casas = (valor) => {
        return Math.round(valor * 10000) / 10000;
      };
      
      // Base de ICMS com redução (se houver)
      const baseIcms = arredondar4Casas(valorLiquido * (1 - (redIcms / 100)));
      
      // ICMS próprio
      const valorIcms = arredondar4Casas(baseIcms * (aliqIcms / 100));
      
      // Base do ICMS-ST (valor líquido + IPI) * (1 + IVA)
      const baseIcmsSt = arredondar4Casas((valorLiquido + valorIpi) * (1 + (iva / 100)));
      
      // ICMS-ST: (Base ST * Alíquota Interna) - ICMS próprio
      let valorIcmsSt = arredondar4Casas((baseIcmsSt * (aliqInterna / 100)) - valorIcms);
      
      // Se o valor for negativo, definir como zero
      if (valorIcmsSt < 0) valorIcmsSt = 0;
      
      // FCP-ST: Base ST * Alíquota FCP-ST
      const valorFcpSt = arredondar4Casas(baseIcmsSt * (aliqFcpSt / 100));
      
      // Log dos valores calculados
      logger.info(`Cálculo de ICMS-ST para produto ${codigoProduto} (UF: ${ufDestino}):
        Produto importado: ${isImportado ? 'Sim' : 'Não'}
        Valor líquido: ${valorLiquido}
        Base ICMS (red ${redIcms}%): ${baseIcms}
        Valor ICMS (${aliqIcms}%): ${valorIcms}
        Base ICMS-ST (IVA ${iva}%): ${baseIcmsSt}
        ICMS-ST (${aliqInterna}%): ${valorIcmsSt}
        FCP-ST (${aliqFcpSt}%): ${valorFcpSt}
        Valor Total ST: ${valorIcmsSt + valorFcpSt}
      `);
      
      return {
        success: true,
        temST: true,
        stIcms: stIcms,
        baseICMSST: baseIcmsSt,
        baseICMS: baseIcms,
        valorICMS: valorIcms,
        valorICMSST: valorIcmsSt,
        valorFCPST: valorFcpSt,
        valorTotalST: valorIcmsSt + valorFcpSt,
        aliqIcms: aliqIcms,
        aliqInterna: aliqInterna,
        iva: iva,
        redIcms: redIcms,
        icms_st: regraIcms.icms_st,
        isImportado: isImportado,
        ivaOriginal: isImportado && ivaImportado > 0 ? ivaParaCalculo : null,
        ivaImportado: isImportado && ivaImportado > 0 ? ivaImportado : null,
        aliqOriginal: isImportado && aliqImportadoParaCalculo > 0 ? aliqInternaParaCalculo : null,
        aliqImportado: isImportado && aliqImportadoParaCalculo > 0 ? aliqImportadoParaCalculo : null,
        mensagem: 'Cálculo de ICMS Substituição Tributária realizado com sucesso.'
      };
    } catch (error) {
      logger.error(`Erro ao calcular ICMS ST: ${error.message}`, error);
      return {
        success: false,
        error: `Erro ao calcular ICMS ST: ${error.message}`,
        valorICMSST: 0,
        valorFCPST: 0
      };
    }
  }
}

module.exports = new FiscalRulesService(); 