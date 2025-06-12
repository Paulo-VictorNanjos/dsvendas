const knex = require('../database/connection');
const logger = require('../utils/logger');
const erpDatabase = require('../config/erp-database');
const FiscalLogger = require('../utils/fiscalLogger');

/**
 * Determina se um cliente é contribuinte baseado em seus dados
 * @param {Object} cliente - Dados do cliente
 * @returns {boolean} - true se for contribuinte, false caso contrário
 */
function determinarContribuinteCliente(cliente) {
  // Se já temos a informação explícita de contribuinte
  if (cliente.contribuinte !== undefined && cliente.contribuinte !== null) {
    // Verificar diferentes formatos
    if (typeof cliente.contribuinte === 'string') {
      return cliente.contribuinte.toUpperCase() === 'S' || 
             cliente.contribuinte === '1' || 
             cliente.contribuinte.toUpperCase() === 'SIM';
    } else if (typeof cliente.contribuinte === 'number') {
      return cliente.contribuinte === 1;
    } else if (typeof cliente.contribuinte === 'boolean') {
      return cliente.contribuinte;
    }
  }
  
  // Inferir pelo CNPJ e Inscrição Estadual
  const temCNPJ = cliente.cnpj && cliente.cnpj.length > 11; // CNPJ tem mais de 11 dígitos
  const temIE = cliente.insc_est && cliente.insc_est.trim() !== '';
  return temCNPJ && temIE;
}

class ProductFiscalRulesService {
  constructor() {
    // Valores padrão para quando não existirem dados fiscais
    this.defaultValues = {
      class_fiscal: '72131000', // NCM para produtos de ferro/aço (apenas exemplo)
      aliq_icms: 18,            // Alíquota padrão para SP
      aliq_ipi: 0,              // 0% de IPI padrão
      cod_regra_icms: 1,        // Regra 1 (padrão)
      cod_origem_prod: '0',     // Produto nacional
      iva: 0,                   // IVA 0%
      cest: '',                 // CEST vazio
      aliq_fcp: 0,              // FCP 0%
      aliq_fcpst: 0,            // FCPST 0%
      aliq_pst: 0,              // PST 0%
    };
  }

  // Obter regras fiscais de um produto
  async getFiscalRules(productCode) {
    try {
      if (!productCode) {
        throw new Error('Código do produto é obrigatório');
      }

      // Buscar o produto
      const produto = await knex('produtos')
        .where('codigo', productCode)
        .first();

      if (!produto) {
        throw new Error(`Produto não encontrado: ${productCode}`);
      }

      // Buscar regras fiscais específicas do produto
      const regrasFiscaisProduto = await knex('regras_fiscais_produtos')
        .where({
          cod_produto: productCode
        })
        .orderBy('dt_inc', 'desc')
        .first();

      // Buscar regra ICMS
      let regraIcms = null;
      if (produto.cod_regra_icms) {
        regraIcms = await knex('regras_icms_cadastro')
          .where('codigo', produto.cod_regra_icms)
          .first();
      }

      // Buscar regra de classificação fiscal 
      let classFiscal = null;
      if (produto.class_fiscal) {
        classFiscal = await knex('class_fiscal')
          .where('codigo', produto.class_fiscal)
          .first();
      }

      // Combinar dados, preferindo os específicos do produto quando disponíveis
      return {
        produto,
        regrasFiscaisProduto,
        regraIcms,
        classFiscal
      };
    } catch (error) {
      console.error(`[ERRO] Falha ao obter regras fiscais do produto ${productCode}:`, error);
      throw error;
    }
  }

  /**
   * Save product fiscal rules
   * @param {object} rules - Product fiscal rules
   * @returns {Promise<object>} - Saved product fiscal rules
   */
  async saveFiscalRules(rules) {
    try {
      // Validar dados requeridos
      if (!rules.cod_produto) {
        throw new Error('Código do produto é obrigatório');
      }
      
      if (!rules.cod_regra_icms) {
        throw new Error('Código da regra de ICMS é obrigatório');
      }
      
      // Verificar se já existe regra para este produto
      const existingRule = await knex('regras_fiscais_produtos')
        .where({
          'cod_produto': rules.cod_produto
        })
        .first();
      
      // Preparar dados para salvar
      const ruleData = {
        cod_produto: rules.cod_produto,
        cod_regra_icms: rules.cod_regra_icms,
        class_fiscal: rules.class_fiscal || null,
        cest: rules.cest || null,
        iva: rules.iva || null,
        aliq_interna: rules.aliq_interna || null,
        pauta_icms_st: rules.pauta_icms_st || null,
        cod_origem_prod: rules.cod_origem_prod || null
      };
      
      if (existingRule) {
        // Atualizar regra anterior com data de alteração
        await knex('regras_fiscais_produtos')
          .where('id', existingRule.id)
          .update({
            dt_alt: knex.fn.now()
          });
      }
      
      // Inserir nova regra
      const [id] = await knex('regras_fiscais_produtos')
        .insert({
          ...ruleData
        })
        .returning('id');
      
      // Atualizar produto com as mesmas regras
      await knex('produtos')
        .where('codigo', rules.cod_produto)
        .update({
          cod_regra_icms: rules.cod_regra_icms,
          class_fiscal: rules.class_fiscal || knex.raw('class_fiscal'),
          cest: rules.cest || knex.raw('cest'),
          iva: rules.iva || knex.raw('iva'),
          aliq_interna: rules.aliq_interna || knex.raw('aliq_interna'),
          pauta_icms_st: rules.pauta_icms_st || knex.raw('pauta_icms_st'),
          cod_origem_prod: rules.cod_origem_prod || knex.raw('cod_origem_prod')
        });
      
      // Buscar e retornar a regra atualizada
      return this.getFiscalRuleById(id);
    } catch (error) {
      logger.error('Erro ao salvar regras fiscais do produto:', error);
      throw error;
    }
  }
  
  /**
   * Get fiscal rule by ID
   * @param {number} id - Rule ID
   * @returns {Promise<object>} - Fiscal rule or null if not found
   */
  async getFiscalRuleById(id) {
    try {
      return await knex('regras_fiscais_produtos')
        .where('id', id)
        .first();
    } catch (error) {
      logger.error(`Erro ao buscar regra fiscal pelo ID ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Get ICMS rules for a product
   * @param {string} productCode - Product code
   * @param {string} uf - UF code
   * @param {string} ufEmpresa - Company UF code
   * @param {number} codRegime - Tax regime code
   * @returns {Promise<object>} - ICMS rules or null if not found
   */
  async getICMSRules(productCode, uf, ufEmpresa, codRegime = 3) {
    try {
      // Buscar regras fiscais do produto
      const fiscalRules = await this.getFiscalRules(productCode);
      
      if (!fiscalRules || !fiscalRules.cod_regra_icms) {
        return null;
      }
      
      // Buscar regras de ICMS com base na regra do produto
      const icmsRules = await knex('regras_icms')
        .where({
          'codigo': fiscalRules.cod_regra_icms,
          'uf': uf
        })
        .first();
      
      if (!icmsRules) {
        // Se não encontrou regra específica para a UF, buscar com UF da empresa
        const icmsRulesEmpresa = await knex('regras_icms')
          .where({
            'codigo': fiscalRules.cod_regra_icms,
            'uf': ufEmpresa
          })
          .first();
          
        if (!icmsRulesEmpresa) {
          // Se não encontrou, retornar regra genérica para SP mantendo o código da regra do produto
          const icmsRulesSP = await knex('regras_icms')
            .where({
              'codigo': fiscalRules.cod_regra_icms,
              'uf': 'SP'
            })
            .first();
            
          if (icmsRulesSP) {
            return {
              ...icmsRulesSP,
              isOperacaoInterestadual: uf !== ufEmpresa
            };
          }
            
          // Se ainda não encontrou, usar valores padrão MAS MANTENDO o código da regra do produto
          return {
            codigo: fiscalRules.cod_regra_icms, // Mantém o código da regra do produto
            uf: uf,
            st_icms: '00',
            aliq_icms: 18,
            red_icms: 0,
            st_icms_contr: '00',
            aliq_icms_contr: 18,
            red_icms_contr: 0,
            icms_st: 'N',
            isOperacaoInterestadual: uf !== ufEmpresa
          };
        }
        
        return {
          ...icmsRulesEmpresa,
          isOperacaoInterestadual: uf !== ufEmpresa
        };
      }
      
      return {
        ...icmsRules,
        isOperacaoInterestadual: uf !== ufEmpresa
      };
    } catch (error) {
      logger.error(`Erro ao buscar regras de ICMS para o produto ${productCode}:`, error);
      // Retornar regra padrão em caso de erro, mas mantendo o código da regra do produto
      return {
        codigo: fiscalRules?.cod_regra_icms || 0, // Alterado de 1 para 0 como fallback
        uf: uf,
        st_icms: '00',
        aliq_icms: 18,
        red_icms: 0,
        st_icms_contr: '00',
        aliq_icms_contr: 18,
        red_icms_contr: 0,
        icms_st: 'N',
        isOperacaoInterestadual: uf !== ufEmpresa
      };
    }
  }
  
  /**
   * Calculate taxes for a product
   * @param {object} params - Tax calculation parameters
   * @returns {Promise<object>} - Calculated taxes
   */
  async calculateTaxes(params) {
    try {
      const { 
        produto_codigo, 
        uf_destino, 
        uf_empresa = 'SP', 
        quantidade = 1, 
        valor_unitario, 
        cod_regime = 3,
        cliente_codigo
      } = params;
      
      if (!produto_codigo) {
        throw new Error('Código do produto é obrigatório');
      }
      
      if (!uf_destino && !cliente_codigo) {
        throw new Error('UF de destino ou código do cliente é obrigatório');
      }
      
      if (!valor_unitario && valor_unitario !== 0) {
        throw new Error('Valor unitário é obrigatório');
      }
      
      // Se temos o código do cliente, buscar seus dados
      let clienteUf = uf_destino;
      let clienteCodigoIbge = null;
      
      if (cliente_codigo) {
        try {
          const cliente = await knex('clientes')
            .select('uf', 'cod_ibge')
            .where('codigo', cliente_codigo)
            .first();
            
          if (cliente) {
            clienteUf = cliente.uf || uf_destino;
            clienteCodigoIbge = cliente.cod_ibge;
          }
        } catch (error) {
          console.error(`Erro ao buscar cliente ${cliente_codigo}:`, error);
          // Continuar com a UF informada no parâmetro
        }
      }
      
      // 1. Obter dados fiscais do produto
      const fiscalRules = await this.getFiscalRules(produto_codigo);
      
      if (!fiscalRules) {
        throw new Error(`Produto com código ${produto_codigo} não encontrado`);
      }
      
      // 2. Obter produto para dados adicionais (alíquotas)
      const produto = await knex('produtos')
        .select(
          'aliq_ipi',
          'aliq_icms',
          'class_fiscal'
        )
        .where('codigo', produto_codigo)
        .first();
        
      if (!produto) {
        throw new Error(`Produto com código ${produto_codigo} não encontrado`);
      }
      
      // Verificar se temos um código NCM válido (usando class_fiscal)
      const ncm = produto.class_fiscal || fiscalRules.class_fiscal;
      
      // 3. Obter regras de ICMS
      const regrasIcms = await this.getICMSRules(
        produto_codigo, 
        clienteUf, 
        uf_empresa, 
        cod_regime
      );
      
      // 4. Obter dados da classificação fiscal (NCM) e FCP
      let dadosClassFiscal = null;
      let dadosFcp = null;
      if (ncm) {
        try {
          // Primeiro buscar a classificação fiscal do produto
          const classFiscal = await knex('class_fiscal')
            .where('cod_ncm', ncm)
            .whereNull('dt_exc')
            .first();

          if (classFiscal) {
            // Depois buscar o FCP-ST usando o código da classificação fiscal
            dadosFcp = await knex('class_fiscal_fcp')
              .where({
                'cod_class_fiscal': classFiscal.codigo,
                'uf': clienteUf
              })
              .first();

            // Buscar dados da classificação fiscal
            dadosClassFiscal = await knex('class_fiscal_dados')
              .where({
                'cod_ncm': ncm,
                'uf': clienteUf
              })
              .first();

            if (!dadosClassFiscal) {
              // Tentar buscar com a UF da empresa
              dadosClassFiscal = await knex('class_fiscal_dados')
                .where({
                  'cod_ncm': ncm,
                  'uf': uf_empresa
                })
                .first();
                
              if (!dadosClassFiscal) {
                // Tentar buscar para SP como fallback
                dadosClassFiscal = await knex('class_fiscal_dados')
                  .where({
                    'cod_ncm': ncm,
                    'uf': 'SP'
                  })
                  .first();
              }
            }
          } else {
            logger.warn(`Classificação fiscal não encontrada para NCM ${ncm}`);
          }
        } catch (error) {
          logger.error(`Erro ao buscar classificação fiscal para NCM ${ncm}:`, error);
        }
      }
      
      // Valores padrão se não encontrou classificação fiscal
      if (!dadosClassFiscal) {
        dadosClassFiscal = {
          cod_ncm: ncm || '',
          uf: clienteUf,
          aliq_fcp: dadosFcp?.aliq_fcp || 0,
          aliq_fcpst: dadosFcp?.aliq_fcpst || 0,
          aliq_pst: dadosFcp?.aliq_pst || 0,
          iva: fiscalRules.iva || 0,
          aliq_interna: fiscalRules.aliq_interna || 18,
          iva_diferenciado: 0,
          cest: fiscalRules.cest || '',
          iva_importado: 0,
          aliq_importado: 0
        };
      } else {
        // Adicionar dados de FCP aos dados da classificação fiscal
        dadosClassFiscal.aliq_fcp = dadosFcp?.aliq_fcp || dadosClassFiscal.aliq_fcp || 0;
        dadosClassFiscal.aliq_fcpst = dadosFcp?.aliq_fcpst || dadosClassFiscal.aliq_fcpst || 0;
        dadosClassFiscal.aliq_pst = dadosFcp?.aliq_pst || dadosClassFiscal.aliq_pst || 0;
      }
      
      // Log para debug
      console.log(`[DEBUG] Calculando impostos para produto ${produto_codigo}, cliente ${cliente_codigo}, UF ${clienteUf}`);
      console.log(`[DEBUG] Regras fiscais:`, fiscalRules);
      console.log(`[DEBUG] Regras ICMS:`, regrasIcms);
      console.log(`[DEBUG] Dados classificação fiscal:`, dadosClassFiscal);
      
      // Calcular impostos
      const valorTotal = quantidade * valor_unitario;
      
      // Base ICMS calculation
      let baseIcms = valorTotal;
      if (regrasIcms && regrasIcms.red_icms > 0) {
        baseIcms = valorTotal * (1 - regrasIcms.red_icms / 100);
      }
      
      // ICMS calculation
      let aliqIcms = regrasIcms ? regrasIcms.aliq_icms : (produto.aliq_icms || 18);
      let valorIcms = baseIcms * (aliqIcms / 100);
      
      // IPI calculation
      const aliqIpi = produto.aliq_ipi || 0;
      const valorIpi = valorTotal * (aliqIpi / 100);
      
      // ICMS-ST calculation (if applicable)
      let baseIcmsSt = 0;
      let valorIcmsSt = 0;
      
      // Obter CST para verificar compatibilidade com ST
      const cstIcms = regrasIcms ? regrasIcms.st_icms : '00';
      
      // NOVA VALIDAÇÃO: CST 00 é incompatível com ICMS-ST
      // CST 00 = Tributada integralmente, não pode ter ST mesmo que icms_st='S'
      if (cstIcms === '00' && regrasIcms?.icms_st === 'S') {
        logger.warn(`INCONSISTÊNCIA FISCAL detectada no productFiscalRulesService: CST ${cstIcms} (Tributada integralmente) está configurado com icms_st='S'. CST 00 é incompatível com ICMS-ST.`);
        
        // Forçar que não aplique ST mesmo que icms_st='S'
        regrasIcms.icms_st = 'N';
      }
      
      // Verificar se aplica ST
      const aplicaST = regrasIcms ? regrasIcms.icms_st === 'S' : false;
      
      if (aplicaST) {
        // Determinar IVA a usar
        const iva = fiscalRules.iva || (dadosClassFiscal?.iva || 0);
        
        // Se tem pauta fiscal, usa o valor da pauta
        if (fiscalRules.pauta_icms_st && fiscalRules.pauta_icms_st > 0) {
          baseIcmsSt = fiscalRules.pauta_icms_st * quantidade;
        } else {
          // Base ICMS-ST
          baseIcmsSt = (valorTotal + valorIpi) * (1 + iva / 100);
        }
        
        // ICMS-ST value
        const aliqInterna = fiscalRules.aliq_interna || (dadosClassFiscal?.aliq_interna || aliqIcms);
        
        // Usar o FCP-ST encontrado na tabela class_fiscal_fcp
        let aliqFcpSt = dadosFcp?.aliq_fcpst || 0;
        if (aliqFcpSt > 0) {
          logger.info(`FCP-ST encontrado para UF ${clienteUf}: ${aliqFcpSt}%`);
        }
        
        // Calcula o ST considerando a alíquota interna + FCP-ST se aplicável
        const aliqTotal = aliqInterna + aliqFcpSt;
        valorIcmsSt = (baseIcmsSt * (aliqTotal / 100)) - valorIcms;
        
        if (valorIcmsSt < 0) valorIcmsSt = 0;
        
        // Separa o valor do FCP-ST do valor total do ST
        let valorFcpSt = 0;
        if (aliqFcpSt > 0 && baseIcmsSt > 0) {
          valorFcpSt = baseIcmsSt * (aliqFcpSt / 100);
          // Ajusta o valor do ICMS-ST para não incluir o FCP-ST
          valorIcmsSt = valorIcmsSt - valorFcpSt;
        }
      }
      
      // Calculate total with taxes
      const valorTotalComImpostos = valorTotal + valorIpi + valorIcmsSt + valorFcpSt;
      
      // Prepare response
      return {
        produto_codigo,
        ncm: ncm,
        class_fiscal: fiscalRules.class_fiscal,
        cod_regra_icms: fiscalRules.cod_regra_icms,
        quantidade,
        valor_unitario,
        valor_total: valorTotal,
        situacao_tributaria: regrasIcms ? regrasIcms.st_icms : '00',
        base_icms: baseIcms,
        aliq_icms: aliqIcms,
        valor_icms: valorIcms,
        reducao_icms: regrasIcms ? regrasIcms.red_icms : 0,
        aliq_ipi: aliqIpi,
        valor_ipi: valorIpi,
        icms_st: aplicaST ? 'S' : 'N',
        base_icms_st: baseIcmsSt,
        valor_icms_st: valorIcmsSt,
        aliq_fcp_st: dadosClassFiscal?.aliq_fcpst || 0,
        valor_fcp_st: valorFcpSt,
        valor_total_com_impostos: valorTotalComImpostos,
        cod_origem_prod: fiscalRules.cod_origem_prod,
        cest: fiscalRules.cest || dadosClassFiscal?.cest || '',
        uf_destino: clienteUf,
        uf_empresa,
        interestadual: clienteUf !== uf_empresa,
        cod_ibge: clienteCodigoIbge
      };
    } catch (error) {
      logger.error('Erro ao calcular tributos do produto:', error);
      throw error;
    }
  }

  // Obter regras fiscais de um produto
  async getProductFiscalRules(productCode) {
    try {
      console.log(`[INFO] Buscando regras fiscais para produto ${productCode}`);
      
      // Tentar obter as regras específicas do produto
      const regrasFiscais = await knex('regras_fiscais_produtos')
        .where({
          cod_produto: productCode
        })
        .first();
      
      // Se não encontrar regras específicas, buscar dados do produto para identificar regras genéricas
      if (!regrasFiscais) {
        console.log(`[INFO] Regras fiscais específicas não encontradas para produto ${productCode}, usando dados do produto`);
        
        const produto = await knex('produtos')
          .where('codigo', productCode)
          .select('cod_regra_icms', 'class_fiscal', 'aliq_icms', 'aliq_ipi', 'cod_origem_prod')
          .first();
          
        if (!produto) {
          console.log(`[AVISO] Produto ${productCode} não encontrado, usando valores padrão`);
          return this.defaultValues;
        }
        
        // Obter o NCM do produto (seja da coluna class_fiscal ou ncm)
        const ncm = produto.class_fiscal || this.defaultValues.class_fiscal;
        
        // Se o produto não tem regra ICMS, usar a padrão
        if (!produto.cod_regra_icms || produto.cod_regra_icms === 0) {
          console.log(`[AVISO] Produto ${productCode} sem regra ICMS, usando regra padrão`);
          
          return {
            ...this.defaultValues,
            class_fiscal: ncm || produto.class_fiscal || this.defaultValues.class_fiscal,
            aliq_icms: produto.aliq_icms || this.defaultValues.aliq_icms,
            aliq_ipi: produto.aliq_ipi || this.defaultValues.aliq_ipi,
            cod_origem_prod: produto.cod_origem_prod || this.defaultValues.cod_origem_prod
          };
        }
        
        // Produto tem regra ICMS, buscar essa regra
        console.log(`[INFO] Usando regra ICMS ${produto.cod_regra_icms} para produto ${productCode}`);
        
        return {
          cod_produto: productCode,
          cod_regra_icms: produto.cod_regra_icms,
          class_fiscal: ncm || produto.class_fiscal || this.defaultValues.class_fiscal,
          cest: this.defaultValues.cest,
          iva: this.defaultValues.iva,
          aliq_interna: produto.aliq_icms || this.defaultValues.aliq_icms,
          pauta_icms_st: 0,
          cod_origem_prod: produto.cod_origem_prod || this.defaultValues.cod_origem_prod,
          aliq_ipi: produto.aliq_ipi || this.defaultValues.aliq_ipi
        };
      }
      
      // Completar regras encontradas com valores padrão para campos ausentes
      return {
        ...regrasFiscais,
        aliq_interna: regrasFiscais.aliq_interna || this.defaultValues.aliq_icms,
        aliq_ipi: regrasFiscais.aliq_ipi || this.defaultValues.aliq_ipi,
        cest: regrasFiscais.cest || this.defaultValues.cest,
        iva: regrasFiscais.iva || this.defaultValues.iva,
        cod_origem_prod: regrasFiscais.cod_origem_prod || this.defaultValues.cod_origem_prod
      };
    } catch (error) {
      console.error(`[ERRO] Falha ao buscar regras fiscais para produto ${productCode}:`, error);
      
      // Em caso de erro, retornar valores padrão
      return this.defaultValues;
    }
  }

  // Obter regras de ICMS baseadas no código da regra e UF
  async getIcmsRules(codRegraIcms, uf = 'SP') {
    try {
      if (!codRegraIcms || codRegraIcms === 0) {
        console.log('[AVISO] Código de regra ICMS não informado, usando regra padrão');
        return this.getDefaultIcmsRule(uf);
      }
      
      // Buscar regras ICMS para a UF especificada - PRIORIDADE: ERP, FALLBACK: Local
      let regras = null;
      
      // Tentar buscar no ERP primeiro
      if (erpDatabase) {
        try {
          FiscalLogger.fallbackDados('GET_ICMS_RULES', 'ERP', 'Tentativa', `Consultando regras ICMS no ERP para código ${codRegraIcms} e UF ${uf}`);
          
          const regrasErp = await erpDatabase.raw(`
            SELECT 
              r.codigo as cod_regra_icms,
              i.uf,
              i.st_icms, 
              i.aliq_icms, 
              i.red_icms,
              i.st_icms_contr, 
              i.aliq_icms_contr, 
              i.red_icms_contr,
              i.icms_st, 
              i.aliq_interna
            FROM 
              regras_icms_cadastro r
            JOIN 
              regras_icms_itens i ON r.codigo = i.cod_regra_icms
            WHERE 
              r.codigo = ? AND i.uf = ?
          `, [codRegraIcms, uf]);
          
          if (regrasErp.rows && regrasErp.rows.length > 0) {
            regras = regrasErp.rows[0];
            FiscalLogger.fallbackDados('GET_ICMS_RULES', 'ERP', 'Sucesso', `Dados obtidos do banco ERP para código ${codRegraIcms} e UF ${uf}`);
          }
        } catch (erpError) {
          FiscalLogger.fallbackDados('GET_ICMS_RULES', 'ERP', 'Erro', `Falha no ERP: ${erpError.message}`);
        }
      }
      
      // Se não conseguiu do ERP, buscar no banco local
      if (!regras) {
        FiscalLogger.fallbackDados('GET_ICMS_RULES', 'Local', 'Tentativa', `Consultando banco local para código ${codRegraIcms} e UF ${uf}`);
        
        regras = await knex('regras_icms_itens')
          .where({
            'cod_regra_icms': codRegraIcms,
            'uf': uf
          })
          .first();
          
        if (regras) {
          FiscalLogger.fallbackDados('GET_ICMS_RULES', 'Local', 'Sucesso', `Dados obtidos do banco local para código ${codRegraIcms} e UF ${uf}`);
        }
      }

      if (!regras) {
        console.log(`[AVISO] Regras ICMS não encontradas para código ${codRegraIcms} e UF ${uf} (consultado ERP e Local), tentando regra genérica`);
        
        // Tentar buscar para qualquer UF no banco local como último recurso
        const regrasGerais = await knex('regras_icms_itens')
          .where('cod_regra_icms', codRegraIcms)
          .first();
          
        if (regrasGerais) {
          return regrasGerais;
        }
        
        console.log(`[AVISO] Nenhuma regra ICMS encontrada para código ${codRegraIcms}, usando regra padrão`);
        return this.getDefaultIcmsRule(uf);
      }

      return regras;
    } catch (error) {
      console.error(`[ERRO] Falha ao buscar regras ICMS:`, error);
      return this.getDefaultIcmsRule(uf);
    }
  }
  
  // Obter uma regra ICMS padrão para a UF
  getDefaultIcmsRule(uf = 'SP') {
    return {
      cod_regra_icms: 1,
      uf: uf,
      st_icms: '00',
      aliq_icms: uf === 'SP' ? 18 : 12,
      red_icms: 0,
      st_icms_contr: '00',
      aliq_icms_contr: uf === 'SP' ? 18 : 12,
      red_icms_contr: 0,
      icms_st: 'N',
      icms_st_reg_sn: 'N',
      st_icms_contr_reg_sn: '00',
      aliq_icms_contr_reg_sn: uf === 'SP' ? 18 : 12,
      red_icms_contr_reg_sn: 0
    };
  }
  
  // Calcular ICMS para um item de orçamento
  async calculateIcms(produto, quantidade, valorUnitario, cliente) {
    try {
      if (!produto || !cliente || !cliente.uf) {
        throw new Error('Produto e UF do cliente são obrigatórios');
      }

      // Buscar regras fiscais resilientes
      let dadosFiscais;
      
      if (typeof produto === 'string' || typeof produto === 'number') {
        // Se for código do produto, buscar dados fiscais
        dadosFiscais = await this.getFiscalRulesResiliente(produto);
      } else {
        // Se for objeto produto, usar diretamente
        dadosFiscais = {
          class_fiscal: produto.class_fiscal || this.defaultValues.class_fiscal,
          aliq_icms: produto.aliq_icms || this.defaultValues.aliq_icms,
          aliq_ipi: produto.aliq_ipi || this.defaultValues.aliq_ipi,
          cod_regra_icms: produto.cod_regra_icms || this.defaultValues.cod_regra_icms,
          cod_origem_prod: produto.cod_origem_prod || this.defaultValues.cod_origem_prod,
          cest: produto.cest || this.defaultValues.cest
        };
      }

      // Verificar se o produto é importado
      const isImportado = dadosFiscais.cod_origem_prod && dadosFiscais.cod_origem_prod !== '0';
      console.log(`[INFO] Produto ${typeof produto === 'object' ? produto.codigo : produto} tem origem: ${dadosFiscais.cod_origem_prod} (${isImportado ? 'Importado' : 'Nacional'})`);

      // Valores base do cálculo
      const valorTotal = parseFloat(valorUnitario) * parseInt(quantidade);
      let aliqIcms = dadosFiscais.aliq_icms;
      let aliqIpi = dadosFiscais.aliq_ipi;
      let iva = dadosFiscais.iva || 0;
      let aliqFcp = dadosFiscais.aliq_fcp || 0;
      let aliqFcpst = dadosFiscais.aliq_fcpst || 0;
      let aliqPst = dadosFiscais.aliq_pst || 0;
      let baseIcms = valorTotal;
      let baseIcmsSt = 0;
      let valorIcms = 0;
      let valorIcmsSt = 0;
      let valorIpi = 0;
      let valorFcp = 0;
      let valorFcpst = 0;
      let stIcms = '00'; // Situação tributária padrão (Tributado integralmente)
      let aplicaIcmsSt = false;
      
      // Verificar se o cliente é de fora do estado (UF da empresa é SP)
      const ufEmpresa = 'SP'; // No futuro, buscar da configuração
      const isInterestadual = cliente.uf !== ufEmpresa;
      
      // Buscar classificação fiscal para o NCM
      let dadosClassFiscal = null;
      let dadosFcp = null;
      try {
        console.log(`[DEBUG] Buscando dados de classificação fiscal para NCM ${dadosFiscais.class_fiscal} e UF ${cliente.uf}`);
        
        dadosClassFiscal = await knex('class_fiscal_dados')
          .where({
            'cod_ncm': dadosFiscais.class_fiscal,
            'uf': cliente.uf
          })
          .first();
          
        // Buscar dados de FCP da tabela class_fiscal_fcp
        dadosFcp = await knex('class_fiscal_fcp')
          .where({
            'cod_class_fiscal': dadosFiscais.class_fiscal,
            'uf': cliente.uf
          })
          .first();
          
        if (!dadosClassFiscal) {
          console.log(`[INFO] Dados de classificação fiscal não encontrados para NCM ${dadosFiscais.class_fiscal} e UF ${cliente.uf}`);
          
          // Verificar se existe para SP como fallback
          if (cliente.uf !== 'SP') {
            console.log(`[DEBUG] Tentando buscar dados de classificação fiscal para NCM ${dadosFiscais.class_fiscal} e UF SP como fallback`);
            dadosClassFiscal = await knex('class_fiscal_dados')
              .where({
                'cod_ncm': dadosFiscais.class_fiscal,
                'uf': 'SP'
              })
              .first();
              
            if (dadosClassFiscal) {
              console.log(`[INFO] Usando dados de classificação fiscal de SP como fallback:`, dadosClassFiscal);
            }
          }
        } else {
          console.log(`[INFO] Dados de classificação fiscal encontrados para NCM ${dadosFiscais.class_fiscal} e UF ${cliente.uf}:`, dadosClassFiscal);
          
          // Se tem dados de classificação fiscal, usar no cálculo
          iva = dadosClassFiscal.iva || iva;
          aliqFcp = dadosFcp?.aliq_fcp || dadosClassFiscal.aliq_fcp || aliqFcp;
          aliqFcpst = dadosFcp?.aliq_fcpst || dadosClassFiscal.aliq_fcpst || aliqFcpst;
          aliqPst = dadosFcp?.aliq_pst || dadosClassFiscal.aliq_pst || aliqPst;
          
          // Se é produto importado e tem valores específicos, usar esses valores
          if (isImportado && dadosClassFiscal.iva_importado > 0) {
            console.log(`[INFO] Usando IVA específico para produtos importados: ${dadosClassFiscal.iva_importado}%`);
            iva = dadosClassFiscal.iva_importado;
          }
          
          if (isImportado && dadosClassFiscal.aliq_importado > 0) {
            console.log(`[INFO] Usando alíquota específica para produtos importados: ${dadosClassFiscal.aliq_importado}%`);
            aliqIcms = parseFloat(dadosClassFiscal.aliq_importado);
          }
        }
      } catch (error) {
        console.warn(`[AVISO] Erro ao buscar dados de classificação fiscal para NCM ${dadosFiscais.class_fiscal} e UF ${cliente.uf}:`, error.message);
      }
      
      // Buscar regras de ICMS para a UF específica
      try {
        // Tentar buscar regra de ICMS para o estado do cliente - PRIORIDADE: ERP, FALLBACK: Local
        let regraIcmsUF = null;
        
        // Tentar buscar no ERP primeiro
        if (erpDatabase) {
          try {
            FiscalLogger.fallbackDados('PRODUCT_FISCAL_ICMS', 'ERP', 'Tentativa', `Consultando regras ICMS no ERP para UF ${cliente.uf}`);
            
            const regrasErp = await erpDatabase.raw(`
              SELECT 
                r.codigo as cod_regra_icms,
                i.uf,
                i.st_icms, 
                i.aliq_icms, 
                i.red_icms,
                i.st_icms_contr, 
                i.aliq_icms_contr, 
                i.red_icms_contr,
                i.icms_st, 
                i.aliq_interna
              FROM 
                regras_icms_cadastro r
              JOIN 
                regras_icms_itens i ON r.codigo = i.cod_regra_icms
              WHERE 
                r.codigo = ? AND i.uf = ?
            `, [dadosFiscais.cod_regra_icms, cliente.uf]);
            
            if (regrasErp.rows && regrasErp.rows.length > 0) {
              regraIcmsUF = regrasErp.rows[0];
              FiscalLogger.fallbackDados('PRODUCT_FISCAL_ICMS', 'ERP', 'Sucesso', `Dados obtidos do banco ERP para UF ${cliente.uf}`);
            }
          } catch (erpError) {
            FiscalLogger.fallbackDados('PRODUCT_FISCAL_ICMS', 'ERP', 'Erro', `Falha no ERP: ${erpError.message}`);
          }
        }
        
        // Se não conseguiu do ERP, buscar no banco local
        if (!regraIcmsUF) {
          FiscalLogger.fallbackDados('PRODUCT_FISCAL_ICMS', 'Local', 'Tentativa', `Consultando banco local para UF ${cliente.uf}`);
          
          regraIcmsUF = await knex('regras_icms_itens')
            .where({
              'cod_regra_icms': dadosFiscais.cod_regra_icms,
              'uf': cliente.uf
            })
            .first();
            
          if (regraIcmsUF) {
            FiscalLogger.fallbackDados('PRODUCT_FISCAL_ICMS', 'Local', 'Sucesso', `Dados obtidos do banco local para UF ${cliente.uf}`);
          }
        }
          
        if (regraIcmsUF) {
          console.log(`[INFO] Regra ICMS encontrada para UF ${cliente.uf}:`, regraIcmsUF);
          
          // Verificar tipo de cliente para usar a alíquota correta
          const isContribuinte = determinarContribuinteCliente(cliente);
          
          if (isContribuinte) {
            // Se for produto importado, manter a alíquota específica de importado
            if (!isImportado || !dadosClassFiscal || !dadosClassFiscal.aliq_importado) {
              aliqIcms = regraIcmsUF.aliq_icms_contr || aliqIcms;
            }
            stIcms = regraIcmsUF.st_icms_contr || stIcms;
          } else {
            // Se for produto importado, manter a alíquota específica de importado
            if (!isImportado || !dadosClassFiscal || !dadosClassFiscal.aliq_importado) {
              aliqIcms = regraIcmsUF.aliq_icms || aliqIcms;
            }
            stIcms = regraIcmsUF.st_icms || stIcms;
          }
          
          // NOVA VALIDAÇÃO: CST 00 é incompatível com ICMS-ST
          // CST 00 = Tributada integralmente, não pode ter ST mesmo que icms_st='S'
          if (stIcms === '00' && regraIcmsUF.icms_st === 'S') {
            console.warn(`[INCONSISTÊNCIA FISCAL] CST ${stIcms} (Tributada integralmente) está configurado com icms_st='S' no productFiscalRulesService.calculateIcms. CST 00 é incompatível com ICMS-ST.`);
            
            // Forçar que não aplique ST mesmo que icms_st='S'
            regraIcmsUF.icms_st = 'N';
          }
          
          // Verificar se tem ICMS-ST
          if (regraIcmsUF.icms_st === 'S') {
            aplicaIcmsSt = true;
            
            // CORREÇÃO: Sempre buscar a alíquota interna da tabela class_fiscal_tributacoes primeiro
            // em vez de usar a da tabela regras_icms_itens
            let aliqInterna = 0;
            
            // 1. Priorizar dados da classificação fiscal para a UF de destino
            if (dadosClassFiscal) {
              // Se é produto importado e tem alíquota específica, usar
              if (isImportado && dadosClassFiscal.aliq_importado > 0) {
                aliqInterna = dadosClassFiscal.aliq_importado;
                console.log(`[INFO] Usando alíquota interna para importados de class_fiscal_dados: ${aliqInterna}%`);
              } else {
                aliqInterna = dadosClassFiscal.aliq_interna || 0;
                console.log(`[INFO] Usando alíquota interna de class_fiscal_dados: ${aliqInterna}%`);
              }
            }
            
            // 2. Se não encontrou na classificação fiscal, tentar na regra ICMS (fallback)
            if (aliqInterna === 0) {
              aliqInterna = regraIcmsUF.aliq_interna || 0;
              console.log(`[INFO] Fallback: Usando alíquota interna de regras_icms_itens: ${aliqInterna}%`);
            }
            
            // 3. Se ainda não tem, usar a alíquota da UF
            if (aliqInterna === 0) {
              if (cliente.uf === 'SP') {
                aliqInterna = isImportado && dadosClassFiscal && dadosClassFiscal.aliq_importado > 0 
                  ? dadosClassFiscal.aliq_importado 
                  : 18; // Alíquota padrão SP ou específica para importados
              } else {
                // Buscar alíquota interestadual
                const aliqUF = await this.getAliquotaUF(cliente.uf);
                aliqInterna = isImportado && dadosClassFiscal && dadosClassFiscal.aliq_importado > 0
                  ? dadosClassFiscal.aliq_importado 
                  : (aliqUF || 12);
              }
              console.log(`[INFO] Usando alíquota padrão da UF como último recurso: ${aliqInterna}%`);
            }
            
            // Base de ICMS-ST inclui IVA
            baseIcmsSt = valorTotal * (1 + iva/100);
            
            // Valor de ICMS-ST
            valorIcmsSt = (baseIcmsSt * aliqInterna/100) - (valorTotal * aliqIcms/100);
            if (valorIcmsSt < 0) valorIcmsSt = 0;
            
            // Valor FCP-ST
            if (aliqFcpst > 0) {
              valorFcpst = baseIcmsSt * (aliqFcpst/100);
            }
          }
        } else {
          console.log(`[INFO] Regra ICMS não encontrada para UF ${cliente.uf}, usando valores padrão`);
          
          // Se for operação interestadual, ajustar alíquota
          if (isInterestadual && (!isImportado || !dadosClassFiscal || !dadosClassFiscal.aliq_importado)) {
            aliqIcms = await this.getAliquotaUF(cliente.uf) || 12;
          }
        }
      } catch (error) {
        console.warn(`[AVISO] Erro ao buscar regra de ICMS para UF ${cliente.uf}:`, error.message);
        // Continua usando valores padrão
        
        // Se for operação interestadual, ajustar alíquota
        if (isInterestadual && (!isImportado || !dadosClassFiscal || !dadosClassFiscal.aliq_importado)) {
          aliqIcms = await this.getAliquotaUF(cliente.uf) || 12;
        }
      }
      
      // Valor do ICMS
      valorIcms = baseIcms * (aliqIcms/100);
      
      // Valor do IPI
      valorIpi = valorTotal * (aliqIpi/100);
      
      // Valor do FCP
      if (aliqFcp > 0) {
        valorFcp = baseIcms * (aliqFcp/100);
      }
      
      // Log dos valores calculados
      console.log(`[INFO] Valores calculados para produto ${typeof produto === 'object' ? produto.codigo : produto}:`, {
        baseIcms,
        valorIcms,
        aliqIcms,
        baseIcmsSt,
        valorIcmsSt,
        valorIpi,
        aliqIpi,
        valorFcp,
        aliqFcp,
        valorFcpst,
        aliqFcpst,
        stIcms,
        aplicaIcmsSt,
        isImportado,
        ufCliente: cliente.uf,
        isInterestadual
      });
      
      // Valores arredondados para 2 casas decimais
      return {
        baseIcms: parseFloat(baseIcms.toFixed(2)),
        valorIcms: parseFloat(valorIcms.toFixed(2)),
        aliqIcms: parseFloat((typeof aliqIcms === 'number' ? aliqIcms : parseFloat(aliqIcms) || 0).toFixed(2)),
        baseIcmsSt: parseFloat(baseIcmsSt.toFixed(2)),
        valorIcmsSt: parseFloat(valorIcmsSt.toFixed(2)),
        valorIpi: parseFloat(valorIpi.toFixed(2)),
        aliqIpi: parseFloat((typeof aliqIpi === 'number' ? aliqIpi : parseFloat(aliqIpi) || 0).toFixed(2)),
        valorFcp: parseFloat(valorFcp.toFixed(2)),
        aliqFcp: parseFloat((typeof aliqFcp === 'number' ? aliqFcp : parseFloat(aliqFcp) || 0).toFixed(2)),
        valorFcpst: parseFloat(valorFcpst.toFixed(2)),
        aliqFcpst: parseFloat((typeof aliqFcpst === 'number' ? aliqFcpst : parseFloat(aliqFcpst) || 0).toFixed(2)),
        valorTotal: parseFloat(valorTotal.toFixed(2)),
        ncm: dadosFiscais.class_fiscal || this.defaultValues.class_fiscal,
        cest: dadosFiscais.cest || this.defaultValues.cest,
        codOrigemProd: dadosFiscais.cod_origem_prod || this.defaultValues.cod_origem_prod,
        stIcms: stIcms,
        aplicaIcmsSt: aplicaIcmsSt
      };
    } catch (error) {
      console.error('[ERRO] Falha ao calcular ICMS:', error);
      // Retorna valores zerados em caso de erro
      return {
        baseIcms: 0,
        valorIcms: 0,
        aliqIcms: 0,
        baseIcmsSt: 0,
        valorIcmsSt: 0,
        valorIpi: 0,
        aliqIpi: 0,
        valorFcp: 0,
        aliqFcp: 0,
        valorFcpst: 0,
        aliqFcpst: 0,
        valorTotal: parseFloat(valorUnitario) * parseInt(quantidade),
        ncm: this.defaultValues.class_fiscal,
        cest: this.defaultValues.cest,
        codOrigemProd: this.defaultValues.cod_origem_prod,
        stIcms: '00',
        aplicaIcmsSt: false
      };
    }
  }
  
  // Helper para buscar alíquota de ICMS para uma UF
  async getAliquotaUF(uf) {
    try {
      // Buscar na tabela de alíquotas interestaduais (origem SP)
      const aliquota = await knex('icms_aliq_interna')
        .where({
          'uf_origem': 'SP',
          'uf_destino': uf
        })
        .first();
        
      if (aliquota) {
        return parseFloat(aliquota.aliquota);
      }
      
      // Se não encontrou, retornar valor padrão com base na região
      const regioesSul = ['PR', 'SC', 'RS'];
      const regioesSudeste = ['SP', 'RJ', 'MG', 'ES'];
      
      if (regioesSul.includes(uf) || regioesSudeste.includes(uf)) {
        return 12; // Alíquota para Sul e Sudeste
      } else {
        return 7; // Alíquota para Norte, Nordeste e Centro-Oeste
      }
    } catch (error) {
      console.warn(`[AVISO] Erro ao buscar alíquota para UF ${uf}:`, error.message);
      return 12; // Valor padrão em caso de erro
    }
  }

  // Obter regras fiscais de um produto de forma resiliente (usando valores padrão quando necessário)
  async getFiscalRulesResiliente(productCode) {
    try {
      if (!productCode) {
        throw new Error('Código do produto é obrigatório');
      }

      // Dados de retorno
      let result = {
        class_fiscal: this.defaultValues.class_fiscal,
        aliq_icms: this.defaultValues.aliq_icms,
        aliq_ipi: this.defaultValues.aliq_ipi,
        cod_regra_icms: this.defaultValues.cod_regra_icms,
        cod_origem_prod: this.defaultValues.cod_origem_prod,
        iva: this.defaultValues.iva,
        cest: this.defaultValues.cest,
        aliq_fcp: this.defaultValues.aliq_fcp,
        aliq_fcpst: this.defaultValues.aliq_fcpst,
        aliq_pst: this.defaultValues.aliq_pst
      };

      // Buscar o produto
      const produto = await knex('produtos')
        .where('codigo', productCode)
        .first();

      // Se não encontrou o produto, retorna valores padrão
      if (!produto) {
        console.warn(`[AVISO] Produto não encontrado: ${productCode}, usando valores fiscais padrão`);
        return result;
      }

      // Usar dados do produto quando disponíveis
      if (produto.class_fiscal) {
        result.class_fiscal = produto.class_fiscal;
      }
      
      if (produto.aliq_icms) {
        result.aliq_icms = produto.aliq_icms;
      }
      
      if (produto.aliq_ipi) {
        result.aliq_ipi = produto.aliq_ipi;
      }
      
      if (produto.cod_regra_icms) {
        result.cod_regra_icms = produto.cod_regra_icms;
      }
      
      if (produto.cod_origem_prod) {
        result.cod_origem_prod = produto.cod_origem_prod;
      }

      // Tentar buscar regras fiscais específicas do produto
      try {
        const regrasFiscaisProduto = await knex('regras_fiscais_produtos')
          .where({
            cod_produto: productCode
          })
          .first();

        // Se encontrou regras específicas, usar esses valores
        if (regrasFiscaisProduto) {
          if (regrasFiscaisProduto.class_fiscal) {
            result.class_fiscal = regrasFiscaisProduto.class_fiscal;
          }
          
          if (regrasFiscaisProduto.cest) {
            result.cest = regrasFiscaisProduto.cest;
          }
          
          if (regrasFiscaisProduto.cod_regra_icms) {
            result.cod_regra_icms = regrasFiscaisProduto.cod_regra_icms;
          }
          
          if (regrasFiscaisProduto.cod_origem_prod) {
            result.cod_origem_prod = regrasFiscaisProduto.cod_origem_prod;
          }
          
          if (regrasFiscaisProduto.aliq_interna) {
            result.aliq_icms = regrasFiscaisProduto.aliq_interna;
          }
          
          if (regrasFiscaisProduto.iva) {
            result.iva = regrasFiscaisProduto.iva;
          }
        }
      } catch (error) {
        console.warn(`[AVISO] Erro ao buscar regras fiscais específicas para o produto ${productCode}:`, error.message);
        // Continua usando os valores do produto ou padrões
      }

      // Tentar buscar dados da classificação fiscal
      try {
        if (result.class_fiscal) {
          const classFiscal = await knex('class_fiscal')
            .where('codigo', result.class_fiscal)
            .first();

          if (classFiscal) {
            if (classFiscal.aliq_ipi) {
              result.aliq_ipi = classFiscal.aliq_ipi;
            }
            
            if (classFiscal.cest) {
              result.cest = classFiscal.cest;
            }
          }
        }
      } catch (error) {
        console.warn(`[AVISO] Erro ao buscar classificação fiscal para o código ${result.class_fiscal}:`, error.message);
        // Continua usando os valores do produto ou padrões
      }

      return result;
    } catch (error) {
      console.error(`[ERRO] Falha ao obter regras fiscais resilientes do produto ${productCode}:`, error);
      // Retorna valores padrão em caso de erro
      return {
        class_fiscal: this.defaultValues.class_fiscal,
        aliq_icms: this.defaultValues.aliq_icms,
        aliq_ipi: this.defaultValues.aliq_ipi,
        cod_regra_icms: this.defaultValues.cod_regra_icms,
        cod_origem_prod: this.defaultValues.cod_origem_prod,
        iva: this.defaultValues.iva,
        cest: this.defaultValues.cest,
        aliq_fcp: this.defaultValues.aliq_fcp,
        aliq_fcpst: this.defaultValues.aliq_fcpst,
        aliq_pst: this.defaultValues.aliq_pst
      };
    }
  }
}

module.exports = new ProductFiscalRulesService(); 