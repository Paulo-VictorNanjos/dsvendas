const erpConnection = require('../database/erpConnection');
const connection = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const configService = require('../services/configurationService');

class SyncController {
  // Obtém o status atual da sincronização
  async getSyncStatus(req, res) {
    try {
      const lastSyncFromERP = await connection
        .select('data_sincronizacao')
        .from('log_sincronizacao')
        .where('direcao', 'FROM_ERP')
        .orderBy('data_sincronizacao', 'desc')
        .first();

      const lastSyncToERP = await connection
        .select('data_sincronizacao')
        .from('log_sincronizacao')
        .where('direcao', 'TO_ERP')
        .orderBy('data_sincronizacao', 'desc')
        .first();

      res.json({
        lastSyncFromERP: lastSyncFromERP?.data_sincronizacao || null,
        lastSyncToERP: lastSyncToERP?.data_sincronizacao || null
      });
    } catch (error) {
      logger.error('Erro ao obter status da sincronização', error);
      res.status(500).json({ error: 'Erro ao obter status da sincronização' });
    }
  }

  // Sincroniza dados do ERP para o sistema web
  async syncFromERP(req, res) {
    try {
      logger.info('Iniciando sincronização FROM_ERP...');

      // Busca dados do ERP
      logger.info('Buscando empresa padrão (Permak) do ERP...');
      const erpCompany = await erpConnection
        .select(
          'codigo',
          'razao',
          'nome',
          'cnpj'
        )
        .from('empresas')
        .where('codigo', 1) // Permak
        .first();
      logger.info('Empresa padrão encontrada', erpCompany);

      logger.info('Buscando clientes do ERP...');
      const erpClients = await erpConnection
        .select(
          'codigo',
          'razao',
          'nome',
          'cnpj',
          'cod_status'
        )
        .from('clientes')
        .where('cod_status', 1); // Apenas clientes ativos
      logger.info(`Encontrados ${erpClients.length} clientes no ERP`);
      
      logger.info('Buscando vendedores do ERP...');
      const erpSellers = await erpConnection
        .select(
          'codigo',
          'nome',
          'email',
          'fone1 as telefone',
          'cod_status'
        )
        .from('vendedores')
        .where('cod_status', 1); // Apenas vendedores ativos
      logger.info(`Encontrados ${erpSellers.length} vendedores no ERP`);
      
      logger.info('Buscando produtos do ERP...');
      const erpProducts = await erpConnection
        .select(
          'produtos.codigo',
          'produtos.nome as descricao',
          'produtos.preco_venda_a as preco_venda',
          'produtos.estoque_at as estoque',
          'produtos.cod_status',
          'produtos.class_fiscal',
          'produtos.aliq_ipi',
          'produtos.aliq_icms',
          'produtos.cod_regra_icms',
          'produtos.cod_origem_prod'
        )
        .from('produtos')
        .leftJoin('class_fiscal', function() {
          this.on(erpConnection.raw('CAST(produtos.class_fiscal AS INTEGER)'), '=', 'class_fiscal.codigo')
        })
        .where('produtos.cod_status', 1); // Apenas produtos ativos
      logger.info(`Encontrados ${erpProducts.length} produtos no ERP`);

      // Buscar regras fiscais dos produtos
      logger.info('Buscando regras fiscais dos produtos...');
      const erpFiscalRules = await erpConnection
        .select(
          'r.codigo',
          'r.acrescimo_icms',
          'i.uf',
          'i.st_icms',
          'i.aliq_icms',
          'i.red_icms',
          'i.cod_convenio',
          'i.st_icms_contr',
          'i.aliq_icms_contr',
          'i.red_icms_contr',
          'i.cod_convenio_contr',
          'i.icms_st',
          'i.cod_aliquota',
          'i.aliq_interna',
          'i.aliq_ecf',
          'i.aliq_dif_icms_contr',
          'i.aliq_dif_icms_cons',
          'i.reducao_somente_icms_proprio',
          'i.cod_cbnef',
          'i.st_icms_contr_reg_sn',
          'i.aliq_icms_contr_reg_sn',
          'i.red_icms_contr_reg_sn',
          'i.aliq_dif_icms_contr_reg_sn',
          'i.cod_convenio_contr_reg_sn',
          'i.icms_st_reg_sn'
        )
        .from('regras_icms_cadastro as r')
        .join('regras_icms_itens as i', 'r.codigo', 'i.cod_regra_icms')
        .whereNull('r.dt_exc');
      logger.info(`Encontradas ${erpFiscalRules.length} regras fiscais no ERP`);

      // Buscar classificações fiscais
      logger.info('Buscando classificações fiscais...');
      const erpFiscalClasses = await erpConnection
        .select(
          'cf.codigo',
          'cf.cod_ncm',
          'dados.uf',
          'dados.aliq_fcp',
          'dados.aliq_fcpst',
          'dados.aliq_pst',
          'dados.iva',
          'dados.aliq_interna',
          'dados.iva_diferenciado',
          'dados.cest',
          'dados.iva_importado',
          'dados.aliq_importado'
        )
        .from('class_fiscal as cf')
        .leftJoin('class_fiscal_dados as dados', 'cf.codigo', 'dados.cod_class_fiscal')
        .whereNull('cf.dt_exc');
      logger.info(`Encontradas ${erpFiscalClasses.length} classificações fiscais no ERP`);

      // Buscar tributações fiscais (CEST e IVA)
      logger.info('Buscando tributações fiscais (CEST e IVA)...');
      let erpTributacoes = [];
      try {
        // Verificar se a tabela existe no ERP
        const hasTable = await erpConnection.schema.hasTable('class_fiscal_tributacoes');
        if (hasTable) {
          // Buscar dados da tabela
          erpTributacoes = await erpConnection
            .select(
              'cod_class_fiscal',
              'uf',
              'cest',
              'iva',
              'aliq_interna',
              'iva_importado',
              'aliq_importado'
            )
            .from('class_fiscal_tributacoes');
            
          logger.info(`Encontradas ${erpTributacoes.length} tributações fiscais no ERP`);
        } else {
          // Tentar buscar dados de tabela alternativa
          const hasAlternativeTable = await erpConnection.schema.hasTable('CEST');
          if (hasAlternativeTable) {
            logger.info('Tabela CEST encontrada, verificando dados...');
            
            // Buscar dados da tabela CEST
            const cestData = await erpConnection
              .select(
                'CEST.CODIGO as cest',
                'CEST.DESCRICAO as descricao',
                'CEST.COD_NCM as cod_ncm'
              )
              .from('CEST');
              
            logger.info(`Encontrados ${cestData.length} códigos CEST na tabela CEST`);
            
            // Criar temporariamente mapeamento de NCM para código de classificação fiscal
            if (cestData.length > 0) {
              // Extrair todos os NCMs distintos das classificações fiscais
              const ncmToClassFiscal = {};
              for (const fc of erpFiscalClasses) {
                if (fc.cod_ncm) {
                  ncmToClassFiscal[fc.cod_ncm] = fc.codigo;
                }
              }
              
              // Converter dados CEST para o formato de tributações
              for (const cest of cestData) {
                if (cest.cod_ncm && ncmToClassFiscal[cest.cod_ncm]) {
                  const codClassFiscal = ncmToClassFiscal[cest.cod_ncm];
                  
                  // Para cada UF, criar um registro
                  const ufs = ["SP", "RJ", "MG", "ES", "PR", "SC", "RS", "MS", "MT", "GO", "DF", "BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA", "PA", "AP", "AM", "RR", "RO", "AC", "TO"];
                  
                  for (const uf of ufs) {
                    erpTributacoes.push({
                      cod_class_fiscal: codClassFiscal,
                      uf: uf,
                      cest: cest.cest,
                      iva: 0,  // Valor padrão
                      aliq_interna: 0,  // Valor padrão
                      iva_importado: 0,  // Valor padrão
                      aliq_importado: 0  // Valor padrão
                    });
                  }
                }
              }
              
              logger.info(`Convertidos ${erpTributacoes.length} registros de tributações fiscais`);
            }
          }
        }
      } catch (tributacoesError) {
        logger.error('Erro ao buscar tributações fiscais:', tributacoesError);
      }

      logger.info('Buscando orçamentos do ERP...');
      const erpQuotations = await erpConnection
        .select(
          'codigo',
          'cod_empresa as cliente_codigo',
          'cod_vendedor as vendedor_codigo',
          'dt_orcamento as data',
          'vl_total as valor_total',
          'cod_status as status',
          'observacoes',
          'dt_inc as data_inclusao',
          'vl_produtos',
          'vl_servicos',
          'vl_frete',
          'vl_desconto'
        )
        .from('orcamentos')
        .where('cod_status', 1); // Apenas orçamentos ativos
      logger.info(`Encontrados ${erpQuotations.length} orçamentos no ERP`);

      logger.info('Buscando itens de orçamento do ERP...');
      const erpQuotationItems = await erpConnection
        .select(
          'codigo',
          'orcamento_codigo as orcamento_codigo',
          'produto_codigo as produto_codigo',
          'quantidade',
          'valor_unitario',
          'valor_total'
        )
        .from('orcamentos_itens');
      logger.info(`Encontrados ${erpQuotationItems.length} itens de orçamento no ERP`);

      // Sincroniza com o banco local
      logger.info('Iniciando transação de sincronização...');
      await connection.transaction(async (trx) => {
        // Limpa dados existentes na ordem correta (do mais dependente para o menos dependente)
        logger.info('Removendo dados existentes...');
        await trx('orcamentos_itens').del();
        await trx('orcamentos').del();
        await trx('vendedores').del();
        await trx('produtos').del();
        await trx('clientes').del();
        await trx('empresas').del();
        await trx('regras_icms').del();
        await trx('class_fiscal').del();
        await trx('class_fiscal_dados').del();
        await trx('class_fiscal_tributacoes').del();
        logger.info('Dados existentes removidos com sucesso');

        // Insere novos dados na ordem correta (do menos dependente para o mais dependente)
        logger.info('Inserindo novos dados...');
        if (erpCompany) {
          logger.info('Inserindo empresa padrão...');
          await trx('empresas').insert([erpCompany]);
        }

        if (erpFiscalClasses.length) {
          logger.info('Inserindo classificações fiscais...');
          // Separar dados da classificação fiscal e dados específicos por UF
          const classFiscal = erpFiscalClasses.map(({ codigo, cod_ncm }) => ({
            codigo,
            cod_ncm
          }));
          
          const classFiscalDados = erpFiscalClasses
            .filter(c => c.uf) // Filtrar apenas registros com UF
            .map(({ codigo, cod_ncm, uf, aliq_fcp, aliq_fcpst, aliq_pst, iva, aliq_interna, iva_diferenciado, cest, iva_importado, aliq_importado }) => ({
              cod_class_fiscal: codigo,
              cod_ncm: cod_ncm || '', // Garantir que cod_ncm está presente
              uf,
              aliq_fcp: aliq_fcp || 0,
              aliq_fcpst: aliq_fcpst || 0,
              aliq_pst: aliq_pst || 0,
              iva: iva || 0,
              aliq_interna: aliq_interna || 0,
              iva_diferenciado: iva_diferenciado || 0,
              cest: cest || '',
              iva_importado: iva_importado || 0,
              aliq_importado: aliq_importado || 0
            }));

          // Atualizar ou inserir classificações fiscais
          for (const cf of classFiscal) {
            await trx('class_fiscal')
              .insert(cf)
              .onConflict('codigo')
              .merge();
          }

          // Atualizar ou inserir dados por UF
          if (classFiscalDados.length) {
            for (const cfd of classFiscalDados) {
              // Garantir que temos o cod_ncm antes de inserir
              if (!cfd.cod_ncm) {
                // Buscar o cod_ncm da tabela class_fiscal
                const classeFiscal = await trx('class_fiscal')
                  .where('codigo', cfd.cod_class_fiscal)
                  .first();
                if (classeFiscal) {
                  cfd.cod_ncm = classeFiscal.cod_ncm;
                } else {
                  logger.warn(`Classificação fiscal ${cfd.cod_class_fiscal} não encontrada para dados UF ${cfd.uf}`);
                  continue; // Pula este registro
                }
              }

              await trx('class_fiscal_dados')
                .insert(cfd)
                .onConflict(['cod_class_fiscal', 'uf'])
                .merge();
            }
          }
        }

        // Inserir tributações fiscais (CEST e IVA)
        if (erpTributacoes && erpTributacoes.length > 0) {
          logger.info('Inserindo tributações fiscais (CEST e IVA)...');
          
          // Verificar se a tabela existe no banco local
          const hasLocalTable = await trx.schema.hasTable('class_fiscal_tributacoes');
          if (!hasLocalTable) {
            logger.info('Criando tabela class_fiscal_tributacoes no banco local...');
            
            try {
              await trx.schema.createTable('class_fiscal_tributacoes', table => {
                table.increments('codigo').primary();
                table.integer('cod_class_fiscal').notNullable();
                table.string('uf', 2).notNullable();
                table.string('cest', 10);
                table.decimal('iva', 10, 4).defaultTo(0);
                table.decimal('aliq_interna', 10, 4).defaultTo(0);
                table.decimal('iva_importado', 10, 4).defaultTo(0);
                table.decimal('aliq_importado', 10, 4).defaultTo(0);
                
                // Índice composto para uniqueness
                table.unique(['cod_class_fiscal', 'uf']);
              });
              
              logger.info('Tabela class_fiscal_tributacoes criada com sucesso');
            } catch (error) {
              logger.error('Falha ao criar tabela class_fiscal_tributacoes:', error);
            }
          }
          
          // Processar as tributações fiscais em lotes para não sobrecarregar a transação
          const batchSize = 100;
          let countTributacoes = 0;
          
          for (let i = 0; i < erpTributacoes.length; i += batchSize) {
            try {
              const batch = erpTributacoes.slice(i, Math.min(i + batchSize, erpTributacoes.length));
              
              for (const tributacao of batch) {
                try {
                  // Verificar se já existe esse registro
                  const exists = await trx('class_fiscal_tributacoes')
                    .where({
                      cod_class_fiscal: tributacao.cod_class_fiscal,
                      uf: tributacao.uf
                    })
                    .first();
                    
                  if (exists) {
                    // Atualizar registro existente
                    await trx('class_fiscal_tributacoes')
                      .where({
                        cod_class_fiscal: tributacao.cod_class_fiscal,
                        uf: tributacao.uf
                      })
                      .update({
                        cest: tributacao.cest || exists.cest,
                        iva: tributacao.iva !== undefined ? tributacao.iva : exists.iva,
                        aliq_interna: tributacao.aliq_interna !== undefined ? tributacao.aliq_interna : exists.aliq_interna,
                        iva_importado: tributacao.iva_importado !== undefined ? tributacao.iva_importado : exists.iva_importado,
                        aliq_importado: tributacao.aliq_importado !== undefined ? tributacao.aliq_importado : exists.aliq_importado
                      });
                  } else {
                    // Inserir novo registro
                    await trx('class_fiscal_tributacoes').insert(tributacao);
                  }
                  
                  countTributacoes++;
                } catch (tribError) {
                  logger.error(`Erro ao processar tributação fiscal para cod_class_fiscal=${tributacao.cod_class_fiscal}, uf=${tributacao.uf}:`, tribError);
                }
              }
              
              // Log a cada lote processado
              logger.info(`Processados ${Math.min(countTributacoes, erpTributacoes.length)} de ${erpTributacoes.length} tributações fiscais`);
            } catch (batchError) {
              logger.error(`Erro ao processar lote de tributações fiscais:`, batchError);
            }
          }
          
          logger.info(`Inseridas/atualizadas ${countTributacoes} tributações fiscais`);
        }

        if (erpFiscalRules.length) {
          logger.info('Inserindo regras fiscais...');
          // Separar dados do cadastro de regras e itens
          const regrasCadastro = [...new Set(erpFiscalRules.map(r => r.codigo))].map(codigo => ({
            codigo,
            acrescimo_icms: erpFiscalRules.find(r => r.codigo === codigo)?.acrescimo_icms || 'N'
          }));

          const regrasItens = erpFiscalRules.map(r => ({
            codigo: r.codigo_item, // Se existir no ERP
            cod_regra_icms: r.codigo,
            uf: r.uf,
            st_icms: r.st_icms,
            aliq_icms: r.aliq_icms || 0,
            red_icms: r.red_icms || 0,
            cod_convenio: r.cod_convenio,
            st_icms_contr: r.st_icms_contr,
            aliq_icms_contr: r.aliq_icms_contr || 0,
            red_icms_contr: r.red_icms_contr || 0,
            cod_convenio_contr: r.cod_convenio_contr,
            icms_st: r.icms_st || 'N',
            cod_aliquota: r.cod_aliquota,
            aliq_interna: r.aliq_interna || 0,
            aliq_ecf: r.aliq_ecf,
            aliq_dif_icms_contr: r.aliq_dif_icms_contr || 0,
            aliq_dif_icms_cons: r.aliq_dif_icms_cons || 0,
            reducao_somente_icms_proprio: r.reducao_somente_icms_proprio || 'N',
            cod_cbnef: r.cod_cbnef,
            st_icms_contr_reg_sn: r.st_icms_contr_reg_sn,
            aliq_icms_contr_reg_sn: r.aliq_icms_contr_reg_sn || 0,
            red_icms_contr_reg_sn: r.red_icms_contr_reg_sn || 0,
            aliq_dif_icms_contr_reg_sn: r.aliq_dif_icms_contr_reg_sn || 0,
            cod_convenio_contr_reg_sn: r.cod_convenio_contr_reg_sn || 0,
            icms_st_reg_sn: r.icms_st_reg_sn || 'N'
          }));

          await trx('regras_icms_cadastro').insert(regrasCadastro)
            .onConflict('codigo')
            .merge();

          // Novo código para lidar com duplicatas em regras_icms_itens
          for (const regra of regrasItens) {
            // Primeiro remove todos os registros existentes para esta combinação
            await trx('regras_icms_itens')
              .where({
                cod_regra_icms: regra.cod_regra_icms,
                uf: regra.uf
              })
              .del();

            // Buscar o próximo código disponível
            const maxCodigo = await trx('regras_icms_itens')
              .max('codigo as max')
              .first();
            
            const nextCodigo = (maxCodigo?.max || 0) + 1;

            // Depois insere o novo registro com o código
            await trx('regras_icms_itens')
              .insert({
                ...regra,
                codigo: nextCodigo
              });
          }
        }

        if (erpClients.length) {
          logger.info('Inserindo clientes...');
          // Adiciona cod_empresa a todos os clientes
          const clientesComEmpresa = erpClients.map(cliente => ({
            ...cliente,
            cod_empresa: 1,
            fantasia: cliente.nome // Garantindo que o campo fantasia está preenchido
          }));
          await trx('clientes').insert(clientesComEmpresa);
        }
        
        if (erpProducts.length) {
          logger.info('Inserindo produtos...');
          // Adiciona cod_empresa a todos os produtos e mapeia campos fiscais
          const produtosComEmpresa = erpProducts.map(produto => ({
            ...produto,
            cod_empresa: 1,
            class_fiscal: produto.class_fiscal || '',
            aliq_ipi: produto.aliq_ipi || 0,
            aliq_icms: produto.aliq_icms || 0,
            cod_regra_icms: produto.cod_regra_icms || 0,
            cod_origem_prod: produto.cod_origem_prod || '0'
          }));
          await trx('produtos').insert(produtosComEmpresa);
        }
        
        if (erpSellers.length) {
          logger.info('Inserindo vendedores...');
          // Adiciona cod_empresa a todos os vendedores
          const vendedoresComEmpresa = erpSellers.map(vendedor => ({
            ...vendedor,
            cod_empresa: 1
          }));
          await trx('vendedores').insert(vendedoresComEmpresa);
        }
        
        if (erpQuotations.length) {
          logger.info('Inserindo orçamentos...');
          // Adiciona cod_empresa a todos os orçamentos
          const orcamentosComEmpresa = erpQuotations.map(orcamento => ({
            ...orcamento,
            cod_empresa: 1
          }));
          await trx('orcamentos').insert(orcamentosComEmpresa);
        }
        
        if (erpQuotationItems.length) {
          logger.info('Inserindo itens de orçamento...');
          // Adiciona cod_empresa a todos os itens de orçamento
          const itensComEmpresa = erpQuotationItems.map(item => ({
            ...item,
            cod_empresa: 1
          }));
          await trx('orcamentos_itens').insert(itensComEmpresa);
        }

        // Registra log da sincronização
        logger.info('Registrando log de sincronização...');
        await trx('log_sincronizacao').insert({
          data_sincronizacao: new Date(),
          direcao: 'FROM_ERP',
          status: 'SUCCESS',
          mensagem: 'Sincronização do ERP concluída com sucesso (inclui formas e condições de pagamento)',
          entidade: 'SISTEMA',
          origem: 'WEB'
        });
        logger.info('Log registrado com sucesso');
      });

      logger.info('Sincronização FROM_ERP concluída com sucesso');
      res.json({ message: 'Sincronização do ERP concluída com sucesso' });
    } catch (error) {
      logger.error('Erro na sincronização do ERP', error);
      res.status(500).json({ error: `Erro na sincronização do ERP: ${error.message}` });
    }
  }

  // Sincroniza dados do sistema web para o ERP
  async syncToERP(req, res) {
    try {
      logger.info('Iniciando sincronização TO_ERP...');
      
      // Busca todos os dados locais
      logger.info('Buscando dados locais...');
      const localCompany = await connection
        .select('*')
        .from('empresas')
        .first();
      logger.info('Empresa local encontrada', localCompany);

      const localClients = await connection
        .select('*')
        .from('clientes');
      logger.info(`Encontrados ${localClients.length} clientes locais`);

      const localSellers = await connection
        .select('*')
        .from('vendedores');
      logger.info(`Encontrados ${localSellers.length} vendedores locais`);

      const localProducts = await connection
        .select('*')
        .from('produtos');
      logger.info(`Encontrados ${localProducts.length} produtos locais`);

      const localQuotations = await connection
        .select('*')
        .from('orcamentos');
      logger.info(`Encontrados ${localQuotations.length} orçamentos locais`);

      const localQuotationItems = await connection
        .select('*')
        .from('orcamentos_itens');
      logger.info(`Encontrados ${localQuotationItems.length} itens de orçamento locais`);

      // Sincroniza com o ERP
      logger.info('Iniciando transação de sincronização com ERP...');
      await erpConnection.transaction(async (trx) => {
        // Atualiza empresa padrão
        if (localCompany) {
          await trx('empresas')
            .where('codigo', localCompany.codigo)
            .update({
              razao: localCompany.razao,
              nome: localCompany.nome,
              cnpj: localCompany.cnpj
            });
        }

        // Atualiza clientes
        for (const client of localClients) {
          await trx('clientes')
            .where('codigo', client.codigo)
            .update({
              razao: client.razao,
              nome: client.nome,
              cnpj: client.cnpj,
              cod_status: client.cod_status
            });
        }

        for (const product of localProducts) {
          await trx('produtos')
            .where('codigo', product.codigo)
            .update({
              nome: product.descricao,
              preco_venda_a: product.preco_venda,
              estoque_at: product.estoque,
              cod_status: product.cod_status
            });
        }

        for (const seller of localSellers) {
          await trx('vendedores')
            .where('codigo', seller.codigo)
            .update({
              nome: seller.nome,
              email: seller.email,
              fone1: seller.telefone,
              cod_status: seller.cod_status
            });
        }

        for (const quotation of localQuotations) {
          await trx('orcamentos')
            .where('codigo', quotation.codigo)
            .update({
              cod_empresa: quotation.cliente_codigo,
              cod_vendedor: quotation.vendedor_codigo,
              dt_orcamento: quotation.data,
              vl_total: quotation.valor_total,
              cod_status: quotation.status,
              observacoes: quotation.observacoes,
              dt_inc: quotation.data_inclusao,
              vl_produtos: quotation.vl_produtos,
              vl_servicos: quotation.vl_servicos,
              vl_frete: quotation.vl_frete,
              vl_desconto: quotation.vl_desconto
            });
        }

        for (const item of localQuotationItems) {
          await trx('orcamentos_itens')
            .where('codigo', item.codigo)
            .update({
              orcamento_codigo: item.orcamento_codigo,
              produto_codigo: item.produto_codigo,
              quantidade: item.quantidade,
              valor_unitario: item.valor_unitario,
              valor_total: item.valor_total
            });
        }
      });

      // Registra log da sincronização
      logger.info('Registrando log de sincronização...');
      await connection('log_sincronizacao').insert({
        data_sincronizacao: new Date(),
        direcao: 'TO_ERP',
        status: 'SUCCESS',
        mensagem: 'Sincronização para o ERP concluída com sucesso',
        entidade: 'SISTEMA',
        origem: 'WEB'
      });
      logger.info('Log registrado com sucesso');

      logger.info('Sincronização TO_ERP concluída com sucesso');
      res.json({ message: 'Sincronização para o ERP concluída com sucesso' });
    } catch (error) {
      logger.error('Erro na sincronização para o ERP', error);
      res.status(500).json({ error: `Erro na sincronização para o ERP: ${error.message}` });
    }
  }

  /**
   * Converter orçamento em pedido
   */
  async convertToSalesOrder(req, res) {
    const { quotationId } = req.params;
    const { cod_forma_pagto, cod_cond_pagto, cod_transportadora } = req.body || {};
    const transactionDate = new Date();
    let nextOrderCode; // Mover a declaração para o escopo da função
    let isCodeUnique = false; // Adicionar declaração da variável isCodeUnique

    logger.info(`Iniciando conversão do orçamento ${quotationId} em pedido de venda`);
    
    if (cod_transportadora) {
      logger.info(`Transportadora informada para o pedido: ${cod_transportadora}`);
    }

    // Verificar se o orçamento existe
    let quotation;
    try {
      quotation = await connection('orcamentos')
        .where('codigo', quotationId)
        .first();

      if (!quotation) {
        logger.error(`Orçamento ${quotationId} não encontrado`);
        return res.status(404).json({ 
          success: false, 
          message: 'Orçamento não encontrado' 
        });
      }

      // Verificar se o orçamento já foi convertido
      const existingSalesOrder = await connection('pedidos')
        .where('orcamento_origem', quotationId)
        .first();
      
      if (existingSalesOrder) {
        logger.error(`Orçamento ${quotationId} já foi convertido no pedido ${existingSalesOrder.codigo}`);
        return res.status(400).json({ 
          success: false, 
          message: `Este orçamento já foi convertido no pedido ${existingSalesOrder.codigo}` 
        });
      }
    } catch (error) {
      logger.error(`Erro ao verificar orçamento ${quotationId}:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao verificar status do orçamento',
        error: error.message
      });
    }

    try {
      // Buscar itens do orçamento
      const quotationItems = await connection('orcamentos_itens')
        .where('orcamento_codigo', quotationId)
        .select('*');

      if (!quotationItems.length) {
        logger.error(`Orçamento ${quotationId} não possui itens`);
        return res.status(400).json({ 
          success: false, 
          message: 'Não é possível converter um orçamento sem itens' 
        });
      }

      // Verificar se a validação de estoque está ativada
      const shouldValidateStock = await configService.shouldValidateStockInOrders();

      // Verificar estoque disponível para todos os produtos apenas se a validação estiver ativada
      if (shouldValidateStock) {
        const stockValidation = await Promise.all(
          quotationItems.map(async (item) => {
            const product = await connection('produtos')
              .where('codigo', item.produto_codigo)
              .first();
            
            return {
              produto: product,
              item: item,
              estoqueDisponivel: product ? product.estoque >= item.quantidade : false
            };
          })
        );

        const insufficientStock = stockValidation.filter(item => !item.estoqueDisponivel);
        if (insufficientStock.length > 0) {
          const products = insufficientStock.map(item => item.produto.descricao).join(', ');
          logger.error(`Estoque insuficiente para os produtos: ${products}`);
          return res.status(400).json({ 
            success: false, 
            message: `Estoque insuficiente para os produtos: ${products}` 
          });
        }
      }

      // Iniciar transação no banco
      await connection.transaction(async (trx) => {
        logger.info(`Iniciando transação para criar pedido a partir do orçamento ${quotationId}`);
        
        // Buscar o último código de pedido no ERP (apenas tabela mob_pedidos_venda)
        let lastErpOrder;
        try {
          // Verificar apenas na tabela mob_pedidos_venda
          const lastErpOrderMobTable = await erpConnection('mob_pedidos_venda')
            .orderBy('codigo', 'desc')
            .first();

          lastErpOrder = lastErpOrderMobTable;
          
          logger.info(`Último código de pedido na tabela mob_pedidos_venda: ${lastErpOrderMobTable?.codigo || 'Nenhum'}`);
        } catch (error) {
          logger.error(`Erro ao buscar último código de pedido no ERP: ${error.message}`);
          lastErpOrder = null;
        }
        
        // Buscar o último código de pedido local
        const lastLocalOrder = await trx('pedidos')
              .orderBy('codigo', 'desc')
              .first();
        
        logger.info(`Último código de pedido local: ${lastLocalOrder?.codigo || 'Nenhum'}`);
        
        // Determinar o próximo código de pedido
        isCodeUnique = false;
        let attemptCount = 0;
        const MAX_ATTEMPTS = 10;
        
        while (!isCodeUnique && attemptCount < MAX_ATTEMPTS) {
          if (lastErpOrder && lastLocalOrder) {
            // Usar o maior código entre o local e o ERP
            const lastErpCode = parseInt(lastErpOrder.codigo) || 0;
            const lastLocalCode = parseInt(lastLocalOrder.codigo) || 0;
            const lastCode = Math.max(lastErpCode, lastLocalCode);
            nextOrderCode = (lastCode + 1 + attemptCount).toString().padStart(6, '0');
          } else if (lastErpOrder) {
            // Só existe pedido no ERP
            const lastCode = parseInt(lastErpOrder.codigo) || 0;
            nextOrderCode = (lastCode + 1 + attemptCount).toString().padStart(6, '0');
          } else if (lastLocalOrder) {
            // Só existe pedido local
            const lastCode = parseInt(lastLocalOrder.codigo) || 0;
            nextOrderCode = (lastCode + 1 + attemptCount).toString().padStart(6, '0');
          } else {
            // Nenhum pedido existe
            nextOrderCode = '000001';
        }

          // Verificar se o código já existe na tabela mob_pedidos_venda
          try {
            const existsInMobTable = await erpConnection('mob_pedidos_venda')
              .where('codigo', nextOrderCode)
          .first();
        
            if (!existsInMobTable) {
              isCodeUnique = true;
              logger.info(`Código ${nextOrderCode} é único na tabela mob_pedidos_venda, prosseguindo`);
            } else {
              attemptCount++;
              logger.warn(`Código ${nextOrderCode} já existe na tabela mob_pedidos_venda, tentando próximo: ${attemptCount}/${MAX_ATTEMPTS}`);
        }
          } catch (codeCheckError) {
            logger.error(`Erro ao verificar existência do código: ${codeCheckError.message}`);
            // Continuar com o código atual, mesmo sem confirmação
            isCodeUnique = true;
          }
        }
        
        if (!isCodeUnique) {
          logger.error(`Não foi possível encontrar um código único após ${MAX_ATTEMPTS} tentativas.`);
          throw new Error(`Não foi possível gerar um código único para o pedido após ${MAX_ATTEMPTS} tentativas.`);
        }

        logger.info(`Gerando novo código de pedido: ${nextOrderCode}`);

        // Criar o pedido no sistema web
        const [orderId] = await trx('pedidos').insert({
          codigo: nextOrderCode,
          dt_pedido: transactionDate,
          cod_cliente: quotation.cliente_codigo || quotation.cod_cliente,
          cod_vendedor: quotation.vendedor_codigo || quotation.cod_vendedor,
          cod_transportadora: cod_transportadora || quotation.cod_transportadora,
          observacoes: quotation.observacoes,
          vl_total: quotation.valor_total || quotation.vl_total || 0,
          orcamento_origem: quotationId,
          cod_status: 1, // Pedido ativo
          dt_inc: transactionDate,
          vl_produtos: quotation.vl_produtos || 0, // Usar o valor original de vl_produtos do orçamento
          vl_desconto: quotation.vl_desconto || 0,
          cod_forma_pagto: cod_forma_pagto || quotation.cod_forma_pagto,
          cod_cond_pagto: cod_cond_pagto || quotation.cod_cond_pagto
        }, 'codigo');

        logger.info(`Pedido ${orderId} criado com sucesso no sistema web`);

        // Inserir itens do pedido
        await Promise.all(
          quotationItems.map(async (item, index) => {
            await trx('pedidos_itens').insert({
              pedido_codigo: nextOrderCode,
              produto_codigo: item.produto_codigo,
              quantidade: item.quantidade,
              valor_unitario: item.valor_unitario,
              valor_total: item.valor_total
            });

            // Atualizar estoque do produto
            await trx('produtos')
              .where('codigo', item.produto_codigo)
              .decrement('estoque_at', item.quantidade);
          })
        );

        logger.info(`Itens do pedido ${nextOrderCode} inseridos com sucesso`);

        // Atualizar status do orçamento para "convertido" e incluir transportadora se foi informada
        const updateData = {
          status: 'CONVERTIDO', // Status de convertido em pedido
          data_conversao: transactionDate
        };
        
        // Se a transportadora foi informada no body e não estava no orçamento, atualizar no orçamento também
        if (cod_transportadora && !quotation.cod_transportadora) {
          updateData.cod_transportadora = cod_transportadora;
          logger.info(`Transportadora ${cod_transportadora} adicionada ao orçamento ${quotationId}`);
        }
        
        // Atualizar as formas de pagamento se foram informadas
        if (cod_forma_pagto && !quotation.cod_forma_pagto) {
          updateData.cod_forma_pagto = cod_forma_pagto;
        }
        
        if (cod_cond_pagto && !quotation.cod_cond_pagto) {
          updateData.cod_cond_pagto = cod_cond_pagto;
        }
        
        await trx('orcamentos')
          .where('codigo', quotationId)
          .update(updateData);

        logger.info(`Status do orçamento ${quotationId} atualizado para convertido`);

        // Registrar no log de sincronização
        await trx('log_sincronizacao').insert({
          data_sincronizacao: transactionDate,
          direcao: 'TO_ERP',
          status: 'PENDING',
          origem: 'CONVERT_ORDER',
          entidade: 'PEDIDO',
          entidade_id: nextOrderCode,
          mensagem: `Conversão de orçamento ${quotationId} para pedido ${nextOrderCode}`
        });

        logger.info(`Log de sincronização registrado para o pedido ${nextOrderCode}`);

        // PRIMEIRO PASSO NO ERP: Inserir o cabeçalho básico do pedido
        await erpConnection('mob_pedidos_venda').insert({
          codigo: nextOrderCode,
          cod_vendedor: quotation.cod_vendedor, // Usar cod_vendedor do orçamento
          dt_inc: transactionDate,
          cod_usr_inc: 1 // Usuário padrão do sistema, ou buscar do usuário logado se aplicável
        });
        logger.info(`Pedido ${nextOrderCode} (INSERT inicial) gravado em mob_pedidos_venda`);

        // SEGUNDO PASSO NO ERP: Calcular totais com desconto e inserir itens
        logger.info(`Calculando valor com desconto e inserindo itens do pedido ${nextOrderCode} na tabela mob_itens_pedidos_venda`);
        let valorTotalComDescontoAplicado = 0;
        
        for (let i = 0; i < quotationItems.length; i++) {
          const item = quotationItems[i];
          
          // Usar o valor líquido/com desconto do item, conforme calculado no orçamento
          // Prioridade: valor_liquido -> valor_com_desconto -> valor_total (do item) -> fallback para bruto
          const itemValorComDesconto = 
            parseFloat(item.valor_liquido) || 
            parseFloat(item.valor_com_desconto) || 
            parseFloat(item.valor_total) || 
            (parseFloat(item.valor_unitario) * parseFloat(item.quantidade)); // Fallback para bruto se nenhum valor com desconto estiver disponível
          
          valorTotalComDescontoAplicado += itemValorComDesconto;
          
          logger.info(`Item ${i + 1} - Valores para conversão (com desconto):`, {
            produto_codigo: item.produto_codigo,
            valor_unitario_bruto: item.valor_unitario,
            quantidade: item.quantidade,
            valor_liquido_orc: item.valor_liquido,
            valor_com_desconto_orc: item.valor_com_desconto,
            valor_total_item_orc: item.valor_total, // Valor total do item no orçamento (pode incluir impostos)
            valor_enviado_item_erp: itemValorComDesconto,
            observacao: "Usando valor COM DESCONTO para ERP aplicar impostos"
          });
          
          const mobItemData = {
            cod_pedido_venda: nextOrderCode,
            cod_vendedor: quotation.cod_vendedor,
            cod_produto: item.produto_codigo,
            seq: i + 1, 
            vl_unitario: item.valor_unitario, // Ainda envia o valor unitário bruto para referência
            vl_unit_venda: itemValorComDesconto / (parseFloat(item.quantidade) || 1), // Recalcula unitário com desconto
            qtde: item.quantidade,
            vl_total: itemValorComDesconto, // Valor COM DESCONTO do item
            comissao: 0,
            cod_tabela_preco: 1,
            cod_local_estoque: 1,
            promocional: 'N',
            unidade: 'PC', 
            fator_conversao: 1.00
          };
          
          await erpConnection('mob_itens_pedidos_venda').insert(mobItemData);
          logger.info(`Item ${i + 1} do pedido ${nextOrderCode} inserido com sucesso (valor com desconto)`);
        }
        logger.info(`Todos os itens do pedido ${nextOrderCode} inseridos. Valor total com desconto calculado: ${valorTotalComDescontoAplicado}`);

        // TERCEIRO PASSO NO ERP: Atualizar o cabeçalho do pedido com todos os detalhes e totais calculados
        logger.info(`Atualizando cabeçalho completo do pedido ${nextOrderCode} em mob_pedidos_venda com valor com desconto: ${valorTotalComDescontoAplicado}`);
        await erpConnection('mob_pedidos_venda')
          .where('codigo', nextOrderCode)
          .update({
            dt_alt: transactionDate,
            cod_usr_alt: 1,
            cod_empresa: 1,
            cod_status: 3,
            dt_pedido: quotation.dt_orcamento,
            cod_cfop: 1,
            observacoes: quotation.observacoes || '',
            cod_cliente: quotation.cod_cliente,
            cod_transportadora: cod_transportadora || quotation.cod_transportadora,
            cod_forma_pagto: req.body.cod_forma_pagto || quotation.cod_forma_pagto,
            cod_cond_pagto: req.body.cod_cond_pagto || quotation.cod_cond_pagto,
            cod_tabela_preco: 1,
            vl_produtos: valorTotalComDescontoAplicado, // Usar valor COM DESCONTO calculado
            vl_desconto: quotation.vl_desconto,       // Desconto total do orçamento (informativo)
            vl_total: valorTotalComDescontoAplicado,     // Usar valor COM DESCONTO calculado (ERP aplicará impostos aqui)
            nap: 0,
            cod_tablet: 0,
            cod_representante: quotation.cod_vendedor,
            dt_transmissao: transactionDate,
            hr_transmissao: transactionDate.toTimeString().split(' ')[0], 
            tp_pedido: 'C'
          });
        logger.info(`Pedido ${nextOrderCode} (UPDATE completo) na tabela mob_pedidos_venda com sucesso`);

        // Atualizar log de sincronização
        await trx('log_sincronizacao')
          .where({
            entidade: 'PEDIDO',
            entidade_id: nextOrderCode
          })
          .update({
            status: 'SUCCESS',
            data_conclusao: new Date()
          });
        
        logger.info(`Log de sincronização atualizado para SUCCESS`);
      });

      logger.info(`Conversão do orçamento ${quotationId} em pedido concluída com sucesso`);
      
      // Verificação adicional para debug - remover após resolução
      logger.info(`Dados do orçamento para debug: ${JSON.stringify(quotation)}`);

      return res.status(200).json({
        success: true,
        message: 'Orçamento convertido em pedido de venda com sucesso',
        pedido_codigo: nextOrderCode
      });
    } catch (error) {
      logger.error(`Erro ao converter orçamento ${quotationId} em pedido:`, error);
      
      return res.status(500).json({
        success: false,
        message: 'Erro ao converter orçamento em pedido',
        error: error.message
      });
    }
  }
}

module.exports = new SyncController();