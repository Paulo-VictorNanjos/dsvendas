const knex = require('../database/connection');
const erpConnection = require('../database/erpConnection');

class SyncService {
  constructor() {
    this.lastSync = null;
    this.syncInProgress = false;
  }

  // Garantir que a empresa padrão existe
  async ensureDefaultCompany() {
    const empresa = await knex('empresas').where({ codigo: 1 }).first();
    if (!empresa) {
      await knex('empresas').insert({
        codigo: 1,
        razao: 'Empresa Padrão',
        nome: 'Empresa Padrão',
        cnpj: '00000000000000'
      });
    }
  }

  // Sincronizar dados de IBGE
  async syncIBGE() {
    try {
      console.log('[INFO] Iniciando sincronização de dados IBGE...');
      
      // Tentar buscar dados de diferentes tabelas possíveis no ERP
      const possibleTables = ['IBGE', 'MUNICIPIOS', 'MUNICIPIOS_IBGE'];
      let ibgeData = [];
      let tableFound = false;
      
      // Tentar cada tabela possível
      for (const tableName of possibleTables) {
        try {
          // Verificar se a tabela existe
          const hasTable = await erpConnection.schema.hasTable(tableName);
          
          if (hasTable) {
            console.log(`[INFO] Tabela '${tableName}' encontrada no ERP`);
            
            let data = [];
            // Tentar diferentes estruturas de colunas
            try {
              // Estrutura 1: Padrão código, nome, uf
              data = await erpConnection(tableName)
                .select(
                  'CODIGO as codigo',
                  'NOME as nome',
                  'UF as uf',
                  'DDD as ddd',
                  'SIAFI as codigo_siafi',
                  'REGIAO as regiao',
                  'CAPITAL as capital'
                )
                .limit(5000);
            } catch (err) {
              console.log(`[INFO] Erro na estrutura 1: ${err.message}`);
              
              try {
                // Estrutura 2: Padrão COD_IBGE, MUNICIPIO, UF
                data = await erpConnection(tableName)
                  .select(
                    'COD_IBGE as codigo',
                    'MUNICIPIO as nome',
                    'UF as uf',
                    'DDD as ddd',
                    'COD_SIAFI as codigo_siafi',
                    'REGIAO as regiao',
                    'CAPITAL as capital'
                  )
                  .limit(5000);
              } catch (err) {
                console.log(`[INFO] Erro na estrutura 2: ${err.message}`);
                
                try {
                  // Estrutura 3: Nomes de colunas em minúsculas
                  data = await erpConnection(tableName)
                    .select(
                      'codigo',
                      'nome',
                      'municipio',
                      'uf',
                      'ddd',
                      'codigo_siafi',
                      'regiao',
                      'capital'
                    )
                    .limit(5000);
                } catch (err) {
                  console.log(`[INFO] Erro na estrutura 3: ${err.message}`);
                }
              }
            }
            
            if (data && data.length > 0) {
              ibgeData = data;
              tableFound = true;
              console.log(`[INFO] Encontrados ${data.length} registros na tabela '${tableName}'`);
              break;
            }
          }
        } catch (error) {
          console.log(`[INFO] Erro ao verificar tabela '${tableName}': ${error.message}`);
        }
      }
      
      if (!tableFound || ibgeData.length === 0) {
        console.log('[INFO] Nenhuma tabela de IBGE válida encontrada no ERP');
        return 0;
      }
      
      // Processar os dados obtidos para garantir consistência
      const dadosProcessados = ibgeData.map(item => {
        // Verificar se temos um código IBGE válido
        const codigo = item.codigo || item.cod_ibge;
        if (!codigo) return null;
        
        // Determinar o nome do município
        const nome = item.nome || item.municipio || '';
        
        // Determinar a UF
        const uf = item.uf || '';
        
        return {
          codigo: String(codigo).padStart(7, '0'),
          nome: nome.trim(),
          uf: uf.trim().toUpperCase(),
          regiao: item.regiao || null,
          capital: item.capital === 'S' || item.capital === true || false,
          ddd: item.ddd || null,
          codigo_siafi: item.codigo_siafi || item.siafi || null,
          ativo: true,
          dt_alt: knex.fn.now()
        };
      }).filter(item => item !== null);
      
      if (dadosProcessados.length === 0) {
        console.log('[INFO] Nenhum dado IBGE válido encontrado no ERP');
        return 0;
      }
      
      console.log(`[INFO] Sincronizando ${dadosProcessados.length} municípios...`);
      
      // Atualizar municípios existentes e inserir novos usando upsert
      let countUpdated = 0;
      let countInserted = 0;
      
      for (const cidade of dadosProcessados) {
        try {
          // Verificar se o município já existe
          const existing = await knex('ibge')
            .where('codigo', cidade.codigo)
            .first();
            
          if (existing) {
            // Atualizar município existente
            await knex('ibge')
              .where('codigo', cidade.codigo)
              .update({
                ...cidade,
                dt_alt: knex.fn.now()
              });
            countUpdated++;
          } else {
            // Inserir novo município
            await knex('ibge').insert(cidade);
            countInserted++;
          }
        } catch (error) {
          console.error(`[ERRO] Falha ao processar município ${cidade.codigo} - ${cidade.nome}: ${error.message}`);
        }
      }
      
      console.log(`[INFO] Sincronização IBGE concluída: ${countInserted} inseridos, ${countUpdated} atualizados`);
      return countInserted + countUpdated;
    } catch (error) {
      console.error('[ERRO] Falha na sincronização de dados IBGE:', error);
      return 0;
    }
  }

  // Download: Sincronizar dados do ERP para o sistema web
  async syncFromERP() {
    if (this.syncInProgress) {
      throw new Error('Sincronização já em andamento');
    }

    try {
      this.syncInProgress = true;
      await this.ensureDefaultCompany();

      // Sincronizar estados (UF) - NOVO
      console.log('[INFO] Sincronizando estados (UF)...');
      await this.syncEstados();
      
      // Sincronizar dados IBGE - NOVO
      console.log('[INFO] Sincronizando dados IBGE...');
      await this.syncIBGE();
      
      // Sincronizar clientes com campos de endereço
      console.log('[INFO] Sincronizando clientes...');
      await this.syncClientes();

      // Verificar tabelas disponíveis no ERP
      console.log('[INFO] Verificando tabelas de pagamento no ERP...');
      try {
        const formasPagtoCount = await erpConnection('FORM_PAGTO')
          .count('* as count')
          .first();
        console.log(`[INFO] Total de registros em FORM_PAGTO: ${formasPagtoCount?.count || 0}`);
      } catch (error) {
        console.log('[INFO] Tabela FORM_PAGTO não encontrada ou erro ao acessar:', error.message);
      }

      // Sincroniza formas de pagamento
      console.log('[INFO] Tentando buscar formas de pagamento...');
      let formasPagamento = [];
      try {
        formasPagamento = await this.getFormasFromERP();
      } catch (error) {
        console.log('[INFO] Erro ao buscar formas de pagamento do ERP:', error.message);
      }

      console.log('[INFO] Tentando buscar condições de pagamento...');
      let condicoesPagamento = [];
      try {
        condicoesPagamento = await this.getCondPagtoFromERP();
      } catch (error) {
        console.log('[INFO] Erro ao buscar condições de pagamento do ERP:', error.message);
      }

      // Atualizar formas e condições de pagamento
      await this.updatePaymentMethods(formasPagamento, condicoesPagamento);

      // Sincronizar dados fiscais - NOVO
      console.log('[INFO] Sincronizando dados fiscais...');
      await this.syncFiscalData();

      this.lastSync = new Date();
      this.syncInProgress = false;

      return {
        status: 'success',
        message: 'Sincronização concluída com sucesso',
        lastSync: this.lastSync
      };
    } catch (error) {
      this.syncInProgress = false;
      console.error('[ERRO] Falha na sincronização:', error);
      throw error;
    }
  }

  // Upload: Sincronizar dados do sistema web para o ERP
  async syncToERP() {
    if (this.syncInProgress) {
      throw new Error('Sincronização já em andamento');
    }

    try {
      this.syncInProgress = true;

      // Busca dados do sistema web
      const webProducts = await knex('produtos')
        .select('*')
        .where('cod_empresa', 1);

      const webCustomers = await knex('clientes')
        .select('*')
        .where('cod_empresa', 1);

      // Atualiza produtos no ERP
      for (const product of webProducts) {
        const classFiscalId = parseInt(product.class_fiscal) || null;
        
        await erpConnection('PRODUTOS')
          .insert({
            CODIGO: product.codigo.toString(),
            DESCRICAO: product.descricao,
            PRECO_VENDA_A: product.preco_venda,
            ESTOQUE_AT: product.estoque,
            CLASS_FISCAL: classFiscalId,
            ALIQ_IPI: product.aliq_ipi,
            ALIQ_ICMS: product.aliq_icms,
            COD_REGRA_ICMS: product.cod_regra_icms,
            COD_ORIGEM_PROD: product.cod_origem_prod || '0',
            COD_STATUS: product.cod_status || 1
          })
          .onConflict('CODIGO')
          .merge();

        // Se houver alteração no NCM, atualizar na tabela class_fiscal
        if (classFiscalId && product.ncm) {
          // Verificar se a classificação fiscal existe
          const existingClassFiscal = await erpConnection('CLASS_FISCAL')
            .where('CODIGO', classFiscalId)
            .first();

          if (existingClassFiscal) {
            // Atualizar apenas se existir
            await erpConnection('CLASS_FISCAL')
              .where('CODIGO', classFiscalId)
              .update({
                COD_NCM: product.ncm
              });
          } else {
            console.warn(`Classificação fiscal ${classFiscalId} não encontrada para o produto ${product.codigo}`);
          }
        }
      }

      // Atualiza clientes no ERP
      for (const customer of webCustomers) {
        await erpConnection('CLIENTES')
          .insert({
            CODIGO: customer.codigo.toString(),
            RAZAO: customer.razao,
            FANTASIA: customer.nome,
            CGC: customer.cnpj,
            COD_STATUS: customer.cod_status || 1
          })
          .onConflict('CODIGO')
          .merge();
      }

      this.lastSync = new Date();
      return {
        success: true,
        message: 'Dados sincronizados para o ERP com sucesso',
        timestamp: this.lastSync
      };
    } catch (error) {
      console.error('Erro na sincronização para o ERP:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  // Buscar produtos
  async getProducts() {
    try {
      // Buscar produtos diretamente da view do banco ERP
      const produtosERP = await erpConnection.raw(`
        SELECT 
          codigo,
          nome,
          cod_barras,
          unidade,
          unidade2,
          CAST(preco_venda AS FLOAT) as preco_venda,
          CAST(preco_venda2 AS FLOAT) as preco_venda2
        FROM vw_produtos_precos 
        ORDER BY nome
      `);

      // Retornar os resultados da query
      return produtosERP.rows || [];
    } catch (error) {
      console.error('Erro ao buscar produtos do ERP:', error);
      throw error;
    }
  }

  // Buscar produtos com filtro
  async searchProducts(termo) {
    try {
      // Normaliza o termo de busca para insensitive case
      const termoBusca = termo.toLowerCase();
      
      // Busca produtos na view do banco ERP que correspondem ao termo de busca
      const result = await erpConnection.raw(`
        SELECT 
          codigo,
          nome,
          cod_barras,
          unidade,
          unidade2,
          CAST(preco_venda AS FLOAT) as preco_venda,
          CAST(preco_venda2 AS FLOAT) as preco_venda2
        FROM vw_produtos_precos 
        WHERE LOWER(nome) LIKE ? OR LOWER(codigo::text) LIKE ?
        ORDER BY nome
        LIMIT 50
      `, [`%${termoBusca}%`, `%${termoBusca}%`]);

      return result.rows || [];
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      throw error;
    }
  }

  // Buscar clientes com filtro
  async searchCustomers(termo) {
    try {
      // Normaliza o termo de busca para insensitive case
      const termoBusca = termo.toLowerCase();
      
      // Busca clientes no ERP que correspondem ao termo de busca
      const clientes = await erpConnection('clientes')
        .select(
          'codigo', 
          'razao', 
          'nome', 
          'cnpj', 
          'municipio', 
          'cod_status',
          'uf',
          'uf_insc_rg',
          'insc_mun',
          'cep',
          'logradouro',
          'logradouro_num',
          'complemento',
          'bairro',
          'cod_ibge',
          'municipio'
        )
        .whereNull('dt_exc')  // Apenas clientes não excluídos
        .whereRaw('LOWER(razao) LIKE ?', [`%${termoBusca}%`])
        .orWhereRaw('LOWER(nome) LIKE ?', [`%${termoBusca}%`])
        .orWhereRaw('LOWER(codigo::text) LIKE ?', [`%${termoBusca}%`])
        .orWhereRaw('LOWER(cnpj) LIKE ?', [`%${termoBusca}%`]);
      
      // Processar cada cliente para garantir UF correta
      const clientesProcessados = [];
      
      for (const cliente of clientes) {
        // Se o cliente já tem UF válida, usar diretamente
        if (cliente.uf && cliente.uf.trim() !== '') {
          clientesProcessados.push({
            ...cliente,
            insc_est: cliente.insc_est || '',
            cod_regime: 1,
            cod_atv_economica: 1
          });
          continue;
        }
        
        // Se não tem UF mas tem município, tentar encontrar UF pelo município
        if (cliente.municipio && !cliente.uf) {
          try {
            // Tentar encontrar a UF pelo município usando a tabela IBGE
            const municipioData = await knex('ibge')
              .where('nome', cliente.municipio.trim())
              .first();
            
            if (municipioData && municipioData.uf) {
              clientesProcessados.push({
                ...cliente,
                uf: municipioData.uf,
                insc_est: cliente.insc_est || '',
                cod_regime: 1,
                cod_atv_economica: 1
              });
              continue;
            }
          } catch (err) {
            console.log(`Erro ao buscar UF pelo município para cliente ${cliente.codigo}:`, err);
          }
        }
        
        // Se não encontrou pelo município, usar o estado padrão
        const estadoPadrao = await knex('estados')
          .where('uf', 'SP')
          .first();
          
        const ufPadrao = estadoPadrao ? estadoPadrao.uf : 'SP';
        
        clientesProcessados.push({
          ...cliente,
          uf: cliente.uf || ufPadrao,
          insc_est: cliente.insc_est || '',
          cod_regime: 1,
          cod_atv_economica: 1
        });
      }
      
      return clientesProcessados;
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      throw error;
    }
  }

  // Buscar clientes
  async getCustomers(filtro = {}) {
    try {
      console.log('[syncService] Iniciando busca de clientes com filtro:', filtro);
      
      // Iniciar a consulta base
      let query = erpConnection('clientes')
        .select(
          'codigo', 
          'razao', 
          'nome', 
          'cnpj',
          'municipio', 
          'cod_status',
          'uf',
          'uf_insc_rg',
          'insc_mun',
          'insc_est',
          'cep',
          'logradouro',
          'logradouro_num',
          'complemento',
          'bairro',
          'cod_ibge',
          'municipio',
          'cod_vendedor1'
        )
        .whereNull('dt_exc');  // Apenas clientes não excluídos
      
      // Aplicar filtros se fornecidos
      if (filtro && Object.keys(filtro).length > 0) {
        console.log('[syncService] Aplicando filtros:', filtro);
        
        // Para cada filtro fornecido, aplicar à consulta
        Object.keys(filtro).forEach(key => {
          if (filtro[key] !== undefined && filtro[key] !== null) {
            console.log(`[syncService] Aplicando filtro: ${key} = ${filtro[key]}`);
            query = query.where(key, filtro[key]);
          }
        });
      }
      
      // Ordenar os resultados
      query = query.orderBy('razao');
      
      // Mostrar a consulta SQL gerada para debug
      console.log(`[syncService] Query SQL: ${query.toString()}`);
      
      // Executar a consulta
      const clientes = await query;
      console.log(`[syncService] Clientes encontrados: ${clientes.length}`);
      
      // Exibir alguns detalhes para depuração
      if (clientes.length > 0) {
        console.log('[syncService] Primeiros clientes encontrados:', 
          clientes.slice(0, 3).map(c => ({ 
            codigo: c.codigo, 
            razao: c.razao.substring(0, 30), 
            cod_vendedor1: c.cod_vendedor1 
          }))
        );
      }
      
      // Processar cada cliente para garantir UF correta e outros dados necessários
      const clientesProcessados = clientes.map(cliente => {
        // Adicionar campos padrão se necessário
        return {
          ...cliente,
          insc_est: cliente.insc_est || '',
          cod_regime: 1,
          cod_atv_economica: 1,
          uf: cliente.uf || 'SP' // Usar SP como UF padrão se não existir
        };
      });
      
      return clientesProcessados;
    } catch (error) {
      console.error('[syncService] Erro ao buscar clientes:', error);
      throw error;
    }
  }
  
  // Buscar cliente por código
  async getCustomerByCode(codigo) {
    try {
      const cliente = await knex('clientes')
        .select(
          'codigo', 
          'razao', 
          'nome', 
          'cnpj',
          'municipio', 
          'cod_status',
          'uf',
          'uf_insc_rg',
          'insc_est',
          'insc_mun',
          'cep',
          'logradouro',
          'logradouro_num',
          'complemento',
          'bairro',
          'cod_ibge',
          'municipio'
        )
        .where('codigo', codigo)
        .first();

      if (!cliente) {
        return null;
      }
      
      // Verificar e assegurar que UF e município estão corretos
      const dadosProcessados = { ...cliente };
      
      // Verificar colunas disponíveis na tabela IBGE
      let colunaMunicipio = 'municipio'; // Valor padrão
      try {
        const colunas = await knex('ibge').columnInfo();
        const colunasDisponiveis = Object.keys(colunas);
        
        // Verificar quais colunas podem representar o nome do município
        const possiveisColunasMunicipio = ['municipio', 'nome_municipio', 'descricao', 'NOME'];
        for (const col of possiveisColunasMunicipio) {
          if (colunasDisponiveis.includes(col)) {
            colunaMunicipio = col;
            break;
          }
        }
      } catch (err) {
        console.error(`Erro ao verificar colunas da tabela IBGE: ${err.message}`);
        // Manter o valor padrão 'municipio'
      }
      
      // Se o cliente não tem UF válida
      if (!cliente.uf || cliente.uf.trim().length !== 2) {
        console.log(`[WARN] Cliente ${codigo} sem UF válida, tentando determinar...`);
        
        // 1. Tentar obter do código IBGE
        if (cliente.cod_ibge) {
          try {
            const ibgeCidade = await knex('ibge')
              .where('codigo', String(cliente.cod_ibge).padStart(7, '0'))
              .first();
              
            if (ibgeCidade) {
              dadosProcessados.uf = ibgeCidade.uf;
              dadosProcessados.municipio = ibgeCidade[colunaMunicipio];
              console.log(`[INFO] UF e município determinados pelo código IBGE ${cliente.cod_ibge}: ${ibgeCidade[colunaMunicipio]}/${ibgeCidade.uf}`);
            }
          } catch (ibgeError) {
            console.log(`[ERRO] Falha ao consultar IBGE: ${ibgeError.message}`);
          }
        }
        
        // 2. Se ainda não tem UF, tentar pelo município
        if (!dadosProcessados.uf && cliente.municipio) {
          try {
            const municipios = await knex('ibge')
              .whereRaw(`UPPER(${colunaMunicipio}) = ?`, [cliente.municipio.trim().toUpperCase()])
              .limit(10);
              
            if (municipios.length === 1) {
              // Se há apenas um município com esse nome, usar sua UF
              dadosProcessados.uf = municipios[0].uf;
              console.log(`[INFO] UF determinada pelo nome do município ${cliente.municipio}: ${municipios[0].uf}`);
            } else if (municipios.length > 1) {
              // Se há múltiplos, tentar filtrar por proximidade geográfica ou usar SP como default
              const spMunicipio = municipios.find(m => m.uf === 'SP');
              if (spMunicipio) {
                dadosProcessados.uf = 'SP';
                console.log(`[INFO] Múltiplos municípios com nome ${cliente.municipio}, usando UF padrão SP`);
              } else {
                // Usar o primeiro da lista
                dadosProcessados.uf = municipios[0].uf;
                console.log(`[INFO] Múltiplos municípios com nome ${cliente.municipio}, usando primeiro encontrado: ${municipios[0].uf}`);
              }
            }
          } catch (municipioError) {
            console.log(`[ERRO] Falha ao buscar município: ${municipioError.message}`);
          }
        }
        
        // 3. Se ainda não tem UF, usar SP como padrão
        if (!dadosProcessados.uf) {
          dadosProcessados.uf = 'SP';
          console.log(`[INFO] Não foi possível determinar UF, usando padrão SP`);
        }
      }
      
      // Se não tem município mas tem UF, tentar encontrar a capital do estado
      if ((!cliente.municipio || cliente.municipio.trim() === '') && dadosProcessados.uf) {
        try {
          // Buscar a capital do estado
          const capital = await knex('ibge')
            .where({
              'uf': dadosProcessados.uf,
              'capital': true
            })
            .first();
            
          if (capital) {
            dadosProcessados.municipio = capital[colunaMunicipio];
            dadosProcessados.cod_ibge = capital.codigo;
            console.log(`[INFO] Usando capital do estado ${dadosProcessados.uf}: ${capital[colunaMunicipio]}`);
          } else {
            // Buscar qualquer município do estado
            const qualquerCidade = await knex('ibge')
              .where('uf', dadosProcessados.uf)
              .first();
              
            if (qualquerCidade) {
              dadosProcessados.municipio = qualquerCidade[colunaMunicipio];
              dadosProcessados.cod_ibge = qualquerCidade.codigo;
              console.log(`[INFO] Usando cidade do estado ${dadosProcessados.uf}: ${qualquerCidade[colunaMunicipio]}`);
            }
          }
        } catch (capitalError) {
          console.log(`[ERRO] Falha ao buscar capital para UF ${dadosProcessados.uf}: ${capitalError.message}`);
        }
      }
      
      // Determinar regime tributário (simples, normal, etc)
      let codRegime = 3; // Regime normal por padrão
      
      // Removemos a verificação da coluna contribuinte e sempre inferimos pelo CNPJ e IE
      // Inferir pelo CNPJ e IE
      const temCNPJ = cliente.cnpj && cliente.cnpj.length > 11;
      const temIE = cliente.insc_est && cliente.insc_est.trim() !== '';
      
      if (temCNPJ && temIE) {
        codRegime = 3; // Regime normal para empresas com CNPJ e IE
      } else {
        codRegime = 9; // Regime para não contribuintes
      }
      
      // Adicionar manualmente um campo contribuinte inferido
      const isContribuinte = temCNPJ && temIE;
      
      return {
        ...dadosProcessados,
        insc_est: dadosProcessados.insc_est || '',
        cod_regime: codRegime,
        cod_atv_economica: 1, // Padrão para atividade econômica
        contribuinte: isContribuinte ? 'S' : 'N' // Adicionando o campo contribuinte de volta na resposta
      };
    } catch (error) {
      console.error(`Erro ao buscar cliente por código ${codigo}:`, error);
      // Em caso de erro específico de coluna não existente, tente uma consulta sem essa coluna
      if (error.code === '42703' && error.message && error.message.includes('contribuinte')) {
        console.log('Erro de coluna contribuinte, tentando consulta alternativa');
        try {
          const clienteAlternativo = await knex('clientes')
            .select(
              'codigo', 
              'razao', 
              'nome', 
              'cnpj',
              'municipio', 
              'cod_status',
              'uf',
              'uf_insc_rg',
              'insc_est',
              'insc_mun',
              'cep',
              'logradouro',
              'logradouro_num',
              'complemento',
              'bairro',
              'cod_ibge'
            )
            .where('codigo', codigo)
            .first();
            
          if (!clienteAlternativo) return null;
          
          // Inferir contribuinte pelo CNPJ e IE
          const temCNPJ = clienteAlternativo.cnpj && clienteAlternativo.cnpj.length > 11;
          const temIE = clienteAlternativo.insc_est && clienteAlternativo.insc_est.trim() !== '';
          const isContribuinte = temCNPJ && temIE;
          
          return {
            ...clienteAlternativo,
            insc_est: clienteAlternativo.insc_est || '',
            cod_regime: isContribuinte ? 3 : 9,
            cod_atv_economica: 1,
            contribuinte: isContribuinte ? 'S' : 'N'
          };
        } catch (altError) {
          console.error(`Erro na consulta alternativa: ${altError.message}`);
          throw altError;
        }
      }
      throw error;
    }
  }

  // Buscar vendedores
  async getSellers() {
    try {
      const vendedores = await knex('vendedores')
        .select('codigo', 'nome')
        .where('cod_empresa', 1)
        .orderBy('nome');

      if (!vendedores || vendedores.length === 0) {
        await this.ensureDefaultCompany();
        await knex('vendedores').insert({
          codigo: 1,
          cod_empresa: 1,
          nome: 'Vendedor Padrão',
          comissao: 0
        });
        return [{
          codigo: 1,
          nome: 'Vendedor Padrão'
        }];
      }

      return vendedores;
    } catch (error) {
      console.error('Erro ao buscar vendedores:', error);
      return [{
        codigo: 1,
        nome: 'Vendedor Padrão'
      }];
    }
  }

  // Verificar status da última sincronização
  async getSyncStatus() {
    return {
      lastSync: this.lastSync,
      syncInProgress: this.syncInProgress
    };
  }

  // Registrar log de sincronização
  async logSync(tipo, status, mensagem) {
    try {
      await knex('log_sincronizacao').insert({
        data_sincronizacao: new Date(),
        direcao: tipo,
        status: status,
        mensagem: mensagem,
        entidade: 'PAGAMENTO',
        origem: 'WEB'
      });
    } catch (error) {
      console.error('Erro ao registrar log de sincronização:', error);
    }
  }

  // Calcular parcelas baseado na condição de pagamento
  async calcularParcelas(codigoCondicao, valorTotal) {
    try {
      // Buscar detalhes da condição de pagamento no banco local
      const condicao = await knex('cond_pagto')
        .where({
          'codigo': codigoCondicao,
          'cod_status': 1
        })
        .select('*')
        .first();

      if (!condicao) {
        throw new Error('Condição de pagamento não encontrada');
      }

      const parcelas = [];
      const hoje = new Date();
      const numParcelas = condicao.parcelas || 1;
      const valorParcela = valorTotal / numParcelas;

      // Gerar parcelas usando os campos p1 até p24
      for (let i = 1; i <= numParcelas; i++) {
        const prazoDias = condicao[`p${i}`] || 0;
        const dataVencimento = new Date(hoje);
        dataVencimento.setDate(dataVencimento.getDate() + prazoDias);

        parcelas.push({
          numero: i,
          vencimento: dataVencimento,
          valor: i === numParcelas 
            ? valorTotal - (valorParcela * (numParcelas - 1)) // última parcela recebe o resto
            : valorParcela
        });
      }

      return parcelas;
    } catch (error) {
      console.error('Erro ao calcular parcelas:', error);
      return [{
        numero: 1,
        vencimento: new Date(),
        valor: valorTotal
      }];
    }
  }

  async convertToSalesOrder(quotationId) {
    try {
      // Buscar dados do orçamento com todas as informações necessárias
      const quotation = await knex('orcamentos')
        .where('orcamentos.codigo', quotationId)
        .select(
          'orcamentos.*',
          'clientes.razao as cliente_nome',
          'vendedores.nome as vendedor_nome',
          'formas_pagto.descricao as forma_pagto_descricao',
          'cond_pagto.descricao as cond_pagto_descricao'
        )
        .leftJoin('clientes', 'clientes.codigo', 'orcamentos.cod_cliente')
        .leftJoin('vendedores', 'vendedores.codigo', 'orcamentos.cod_vendedor')
        .leftJoin('formas_pagto', 'formas_pagto.codigo', 'orcamentos.form_pagto')
        .leftJoin('cond_pagto', 'cond_pagto.codigo', 'orcamentos.cond_pagto')
        .first();

      if (!quotation) {
        throw new Error('Orçamento não encontrado');
      }

      // Buscar itens do orçamento
      const itens = await knex('orcamentos_itens')
        .where('orcamento_codigo', quotationId)
        .select('*');

      // Criar pedido no ERP
      const result = await erpConnection.transaction(async trx => {
        // Inserir cabeçalho do pedido no ERP
        const [pedidoCodigo] = await trx('pedidos').insert({
          dt_pedido: new Date(),
          cod_empresa: 1,
          cod_cliente: quotation.cod_cliente,
          cod_vendedor: quotation.cod_vendedor,
          cod_forma_pagto: quotation.form_pagto,
          cod_cond_pagto: quotation.cond_pagto,
          vl_produtos: quotation.vl_produtos,
          vl_total: quotation.vl_total,
          observacoes: quotation.observacoes,
          cod_status: 1
        }).returning('codigo');

        // Inserir itens do pedido no ERP
        await Promise.all(
          itens.map(item =>
            trx('pedidos_itens').insert({
              pedido_codigo: pedidoCodigo,
              produto_codigo: item.produto_codigo,
              quantidade: item.quantidade,
              valor_unitario: item.valor_unitario,
              valor_total: item.valor_total,
              cod_status: 1,
              cod_empresa: 1
            })
          )
        );

        // Calcular e inserir parcelas no ERP
        const parcelas = await this.calcularParcelas(quotation.cond_pagto, quotation.vl_total);
        await Promise.all(
          parcelas.map(parcela =>
            trx('pedidos_parcelas').insert({
              pedido_codigo: pedidoCodigo,
              numero: parcela.numero,
              vencimento: parcela.vencimento,
              valor: parcela.valor,
              cod_forma_pagto: quotation.form_pagto,
              cod_status: 1,
              cod_empresa: 1
            })
          )
        );

        // Marcar orçamento como convertido
        await knex('orcamentos')
          .where('codigo', quotationId)
          .update({
            cod_status: 2, // Status de convertido
            dt_alt: new Date()
          });

        return { pedidoCodigo };
      });

      return {
        success: true,
        message: 'Orçamento convertido em pedido com sucesso',
        pedidoCodigo: result.pedidoCodigo
      };
    } catch (error) {
      console.error('Erro ao converter orçamento em pedido:', error);
      throw error;
    }
  }

  // Buscar formas de pagamento do banco local em vez do ERP
  async getPaymentMethods() {
    try {
      // Verificar se as tabelas existem
      const formasTableExists = await knex.schema.hasTable('formas_pagto');
      const formTableExists = await knex.schema.hasTable('form_pagto');
      
      // Determinar qual tabela usar
      const tableName = formTableExists ? 'form_pagto' : 'formas_pagto';
      
      console.log(`[INFO] Buscando formas de pagamento da tabela ${tableName}`);
      
      const formasPagamento = await knex(tableName)
        .select(
          'codigo',
          'descricao'
        )
        .orderBy('codigo');

      // Filtrar apenas as formas de pagamento válidas
      const formasFiltradas = formasPagamento
        .filter(forma => forma.descricao && forma.descricao.trim() !== '')
        .map(forma => ({
          codigo: forma.codigo,
          descricao: forma.descricao.trim()
        }));

      console.log(`[INFO] Encontradas ${formasFiltradas.length} formas de pagamento válidas`);
      return formasFiltradas;
    } catch (error) {
      console.error('Erro ao buscar formas de pagamento do banco local:', error);
      
      // Retornar formas de pagamento padrão em caso de erro
      console.log('[INFO] Retornando formas de pagamento padrão devido a erro');
      return [
        { codigo: 1, descricao: 'DINHEIRO' },
        { codigo: 4, descricao: 'CARTAO CREDITO' },
        { codigo: 5, descricao: 'CARTAO DEBITO' },
        { codigo: 7, descricao: 'BOLETO BANCARIO' },
        { codigo: 12, descricao: 'PIX' }
      ];
    }
  }

  // Buscar condições de pagamento do banco local em vez do ERP
  async getPaymentTerms() {
    try {
      const condicoesPagamento = await knex('cond_pagto')
        .select(
          'codigo',
          'descricao'
        )
        .orderBy('codigo');

      // Mapear e formatar as condições de pagamento
      const condicoesFiltradas = condicoesPagamento
        .filter(cond => cond.descricao && cond.descricao.trim() !== '')
        .map(cond => ({
          codigo: cond.codigo,
          descricao: cond.descricao.trim()
        }));

      return condicoesFiltradas;
    } catch (error) {
      console.error('Erro ao buscar condições de pagamento do banco local:', error);
      return [
        { codigo: 1, descricao: 'A VISTA' },
        { codigo: 3, descricao: '30 D' },
        { codigo: 4, descricao: '30/60 D' },
        { codigo: 5, descricao: '30/60/90 D' }
      ];
    }
  }

  // Buscar formas de pagamento diretamente do ERP (usado apenas para sincronização)
  async getFormasFromERP() {
    try {
      console.log('[INFO] Buscando formas de pagamento do ERP...');
      let formasPagamento = [];
      
      // Primeiro tenta a tabela FORM_PAGTO
      try {
        console.log('[INFO] Tentando acessar tabela FORM_PAGTO...');
        // Verificar se a tabela existe
        const hasFormPagto = await erpConnection.schema.hasTable('FORM_PAGTO');
        console.log(`[INFO] Tabela FORM_PAGTO existe: ${hasFormPagto}`);
        
        if (hasFormPagto) {
          // Tentar sem filtro por COD_STATUS que pode não existir
          formasPagamento = await erpConnection('FORM_PAGTO')
            .select(
              'CODIGO as codigo',
              'DESCRICAO as descricao'
            );
          
          console.log(`[INFO] Encontradas ${formasPagamento.length} formas de pagamento na tabela FORM_PAGTO`);
          
          // Se não encontrou registros, pode ser que a tabela esteja em outro formato
          if (formasPagamento.length === 0) {
            console.log('[INFO] Tentando consulta alternativa em FORM_PAGTO...');
            formasPagamento = await erpConnection.raw('SELECT * FROM "FORM_PAGTO" LIMIT 10');
            console.log(`[INFO] Consulta raw retornou ${formasPagamento.rows?.length || 0} registros`);
            
            if (formasPagamento.rows && formasPagamento.rows.length > 0) {
              // Mapear os campos com base nos dados recebidos
              formasPagamento = formasPagamento.rows.map(row => {
                // Verificar os nomes das colunas recebidas
                const colunas = Object.keys(row);
                console.log(`[INFO] Colunas encontradas: ${colunas.join(', ')}`);
                
                // Localizar os campos correspondentes, independente de maiúsculas/minúsculas
                const codigoField = colunas.find(c => c.toUpperCase() === 'CODIGO');
                const descricaoField = colunas.find(c => c.toUpperCase() === 'DESCRICAO');
                
                return {
                  codigo: row[codigoField] || '',
                  descricao: row[descricaoField] || 'Sem descrição'
                };
              });
            }
          }
        }
      } catch (error) {
        console.log(`[INFO] Erro ao acessar FORM_PAGTO: ${error.message}`);
      }
      
      // Se não encontrou, tenta a tabela FORMAS_PAGTO
      if (formasPagamento.length === 0) {
        try {
          console.log('[INFO] Tentando tabela alternativa FORMAS_PAGTO...');
          const hasFormasPagto = await erpConnection.schema.hasTable('FORMAS_PAGTO');
          console.log(`[INFO] Tabela FORMAS_PAGTO existe: ${hasFormasPagto}`);
          
          if (hasFormasPagto) {
            formasPagamento = await erpConnection('FORMAS_PAGTO')
              .select(
                'CODIGO as codigo',
                'DESCRICAO as descricao'
              );
            
            console.log(`[INFO] Encontradas ${formasPagamento.length} formas de pagamento na tabela FORMAS_PAGTO`);
          }
        } catch (error) {
          console.log(`[INFO] Erro ao acessar FORMAS_PAGTO: ${error.message}`);
        }
      }
      
      // Se ainda não encontrou, tentar com letras minúsculas
      if (formasPagamento.length === 0) {
        try {
          console.log('[INFO] Tentando tabelas com nomes em letras minúsculas...');
          
          const hasFormPagtoLower = await erpConnection.schema.hasTable('form_pagto');
          if (hasFormPagtoLower) {
            console.log('[INFO] Tabela form_pagto (minúsculas) encontrada, tentando consulta...');
            formasPagamento = await erpConnection('form_pagto')
              .select(
                'codigo',
                'descricao'
              );
            
            console.log(`[INFO] Encontradas ${formasPagamento.length} formas de pagamento na tabela form_pagto`);
          }
          
          if (formasPagamento.length === 0) {
            const hasFormasPagtoLower = await erpConnection.schema.hasTable('formas_pagto');
            if (hasFormasPagtoLower) {
              console.log('[INFO] Tabela formas_pagto (minúsculas) encontrada, tentando consulta...');
              formasPagamento = await erpConnection('formas_pagto')
                .select(
                  'codigo',
                  'descricao'
                );
              
              console.log(`[INFO] Encontradas ${formasPagamento.length} formas de pagamento na tabela formas_pagto`);
            }
          }
        } catch (error) {
          console.log(`[INFO] Erro ao acessar tabelas em minúsculas: ${error.message}`);
        }
      }
      
      // Formatar os resultados
      const formasFiltradas = formasPagamento.map(f => ({
        codigo: f.codigo,
        descricao: f.descricao?.trim() || 'Sem descrição',
        cod_empresa: 1
      }));
      
      console.log(`[INFO] Formas de pagamento filtradas: ${formasFiltradas.length}`);
      return formasFiltradas;
    } catch (error) {
      console.error('[ERRO] Falha ao buscar formas de pagamento do ERP:', error);
      return [];
    }
  }
  
  // Buscar condições de pagamento diretamente do ERP (usado apenas para sincronização)
  async getCondPagtoFromERP() {
    try {
      console.log('[INFO] Buscando condições de pagamento do ERP...');
      let condicoesPagamento = [];
      
      // Tentar buscar na tabela COND_PAGTO
      try {
        console.log('[INFO] Tentando acessar tabela COND_PAGTO...');
        const hasCondPagto = await erpConnection.schema.hasTable('COND_PAGTO');
        console.log(`[INFO] Tabela COND_PAGTO existe: ${hasCondPagto}`);
        
        if (hasCondPagto) {
          // Tentar consulta sem filtro por COD_STATUS
          condicoesPagamento = await erpConnection('COND_PAGTO')
            .select(
              'CODIGO as codigo',
              'DESCRICAO as descricao',
              'NUM_PARCELAS as parcelas'
            );
          
          console.log(`[INFO] Encontradas ${condicoesPagamento.length} condições de pagamento na tabela COND_PAGTO`);
          
          // Se não encontrou, tentar consulta raw
          if (condicoesPagamento.length === 0) {
            console.log('[INFO] Tentando consulta alternativa em COND_PAGTO...');
            const result = await erpConnection.raw('SELECT * FROM "COND_PAGTO" LIMIT 10');
            
            if (result.rows && result.rows.length > 0) {
              console.log(`[INFO] Consulta raw retornou ${result.rows.length} registros`);
              
              // Mapear os campos com base nos dados recebidos
              condicoesPagamento = result.rows.map(row => {
                // Verificar os nomes das colunas recebidas
                const colunas = Object.keys(row);
                console.log(`[INFO] Colunas encontradas: ${colunas.join(', ')}`);
                
                // Localizar os campos correspondentes, independente de maiúsculas/minúsculas
                const codigoField = colunas.find(c => c.toUpperCase() === 'CODIGO');
                const descricaoField = colunas.find(c => c.toUpperCase() === 'DESCRICAO');
                const parcelasField = colunas.find(c => c.toUpperCase() === 'NUM_PARCELAS');
                
                return {
                  codigo: row[codigoField] || '',
                  descricao: row[descricaoField] || 'Sem descrição',
                  parcelas: row[parcelasField] || 1
                };
              });
            }
          }
        }
      } catch (error) {
        console.log(`[INFO] Erro ao acessar COND_PAGTO: ${error.message}`);
      }
      
      // Se não encontrou, tentar com letras minúsculas
      if (condicoesPagamento.length === 0) {
        try {
          console.log('[INFO] Tentando tabela cond_pagto (minúsculas)...');
          const hasCondPagtoLower = await erpConnection.schema.hasTable('cond_pagto');
          
          if (hasCondPagtoLower) {
            condicoesPagamento = await erpConnection('cond_pagto')
              .select(
                'codigo',
                'descricao',
                'parcelas'
              );
            
            console.log(`[INFO] Encontradas ${condicoesPagamento.length} condições na tabela cond_pagto (minúsculas)`);
          }
        } catch (error) {
          console.log(`[INFO] Erro ao acessar cond_pagto (minúsculas): ${error.message}`);
        }
      }
      
      // Formatar os resultados
      const condicoesFiltradas = condicoesPagamento.map(c => ({
        codigo: c.codigo,
        descricao: c.descricao?.trim() || 'Sem descrição',
        parcelas: c.parcelas || 1,
        cod_empresa: 1
      }));
      
      console.log(`[INFO] Condições de pagamento filtradas: ${condicoesFiltradas.length}`);
      return condicoesFiltradas;
    } catch (error) {
      console.error('[ERRO] Falha ao buscar condições de pagamento do ERP:', error);
      return [];
    }
  }
  
  // Atualizar métodos de pagamento no banco local
  async updatePaymentMethods(formasPagamento, condicoesPagamento) {
    try {
      console.log(`[INFO] Iniciando atualização de métodos de pagamento...`);
      console.log(`[INFO] Formas de pagamento a inserir/atualizar: ${formasPagamento.length}`);
      console.log(`[INFO] Condições de pagamento a inserir/atualizar: ${condicoesPagamento.length}`);
      
      // Verificar se as tabelas existem
      const formasTableExists = await knex.schema.hasTable('formas_pagto');
      const formTableExists = await knex.schema.hasTable('form_pagto');
      const condTableExists = await knex.schema.hasTable('cond_pagto');
      
      console.log(`[INFO] Tabela 'formas_pagto' existe: ${formasTableExists}`);
      console.log(`[INFO] Tabela 'form_pagto' existe: ${formTableExists}`);
      console.log(`[INFO] Tabela 'cond_pagto' existe: ${condTableExists}`);
      
      // Determinar qual tabela usar para formas de pagamento
      const formasTable = formTableExists ? 'form_pagto' : 'formas_pagto';
      
      // Processar formas de pagamento usando método upsert (atualizar ou inserir)
      if (formasPagamento.length > 0) {
        console.log(`[INFO] Usando método de upsert para formas de pagamento na tabela ${formasTable}...`);
        
        // Buscar formas existentes
        const formasExistentes = await knex(formasTable).select('codigo');
        const codigosExistentes = formasExistentes.map(f => f.codigo);
        
        console.log(`[INFO] Encontradas ${formasExistentes.length} formas de pagamento existentes.`);
        
        // Contadores para estatísticas
        let atualizados = 0;
        let inseridos = 0;
        
        // Processar cada forma de pagamento
        for (const forma of formasPagamento) {
          try {
            if (codigosExistentes.includes(forma.codigo)) {
              // Atualiza registro existente (apenas a descrição, que é o campo comum)
              await knex(formasTable)
                .where('codigo', forma.codigo)
                .update({
                  descricao: forma.descricao?.trim() || 'Sem descrição'
                });
              atualizados++;
            } else {
              // Insere novo registro (apenas com os campos básicos)
              await knex(formasTable).insert({
                codigo: forma.codigo,
                descricao: forma.descricao?.trim() || 'Sem descrição',
                cod_empresa: forma.cod_empresa || null
              });
              inseridos++;
            }
          } catch (error) {
            console.error(`[ERRO] Falha ao processar forma ${forma.codigo}: ${error.message}`);
          }
        }
        console.log(`[INFO] Formas de pagamento: ${atualizados} atualizadas, ${inseridos} inseridas.`);
      }
      
      // Processar condições de pagamento usando método upsert
      if (condTableExists && condicoesPagamento.length > 0) {
        console.log(`[INFO] Usando método de upsert para condições de pagamento...`);
        
        // Buscar condições existentes
        const condicoesExistentes = await knex('cond_pagto').select('codigo');
        const codigosExistentes = condicoesExistentes.map(c => c.codigo);
        
        console.log(`[INFO] Encontradas ${condicoesExistentes.length} condições de pagamento existentes.`);
        
        // Contadores para estatísticas
        let atualizados = 0;
        let inseridos = 0;
        
        // Processar cada condição de pagamento
        for (const condicao of condicoesPagamento) {
          try {
            if (codigosExistentes.includes(condicao.codigo)) {
              // Atualiza registro existente
              await knex('cond_pagto')
                .where('codigo', condicao.codigo)
                .update({
                  descricao: condicao.descricao,
                  parcelas: condicao.parcelas || 1,
                  cod_status: condicao.cod_status || 1,
                  cod_empresa: condicao.cod_empresa || 1
                });
              atualizados++;
            } else {
              // Insere novo registro
              await knex('cond_pagto').insert({
                codigo: condicao.codigo,
                descricao: condicao.descricao?.trim() || 'Sem descrição',
                parcelas: condicao.parcelas || 1,
                cod_status: condicao.cod_status || 1,
                cod_empresa: condicao.cod_empresa || 1
              });
              inseridos++;
            }
          } catch (error) {
            console.error(`[ERRO] Falha ao processar condição ${condicao.codigo}: ${error.message}`);
          }
        }
        console.log(`[INFO] Condições de pagamento: ${atualizados} atualizadas, ${inseridos} inseridas.`);
      }
      
      // Verificar se os dados foram atualizados
      console.log(`[INFO] Verificando resultado da atualização...`);
      
      const formasInseridas = await knex(formasTable).select('*');
      console.log(`[INFO] Formas de pagamento na tabela ${formasTable}: ${formasInseridas.length}`);
      
      if (condTableExists) {
        const condicoesInseridas = await knex('cond_pagto').select('*');
        console.log(`[INFO] Condições de pagamento na tabela cond_pagto: ${condicoesInseridas.length}`);
      }
      
      // Registrar log de sincronização
      console.log(`[INFO] Registrando log de sincronização...`);
      try {
        await this.logSync('PAYMENT_METHODS', 'CONCLUIDO', 
          `Sincronização concluída: ${formasPagamento.length} formas de pagamento e ${condicoesPagamento.length} condições de pagamento`);
      } catch (logError) {
        console.error(`[ERRO] Falha ao registrar log: ${logError.message}`);
      }
      
      console.log(`[INFO] Métodos de pagamento atualizados com sucesso.`);
      return true;
    } catch (error) {
      console.error(`[ERRO] Falha na atualização de métodos de pagamento: ${error.message}`);
      
      // Registrar erro no log
      try {
        await this.logSync('PAYMENT_METHODS', 'ERRO', `Erro na sincronização: ${error.message}`);
      } catch (logError) {
        console.error(`[ERRO] Falha ao registrar log de erro: ${logError.message}`);
      }
      
      throw error;
    }
  }

  // Buscar vendedores com filtro
  async searchSellers(termo) {
    try {
      // Normaliza o termo de busca para insensitive case
      const termoBusca = termo.toLowerCase();
      
      // Busca vendedores no banco local que correspondem ao termo de busca
      const vendedores = await knex('vendedores')
        .select('*')
        .whereRaw('LOWER(nome) LIKE ?', [`%${termoBusca}%`])
        .orWhereRaw('LOWER(codigo) LIKE ?', [`%${termoBusca}%`])
        .orderBy('nome')
        .limit(20);
      
      return vendedores;
    } catch (error) {
      console.error('Erro ao buscar vendedores:', error);
      return [];
    }
  }

  // Buscar produto por ID
  async getProductById(id) {
    try {
      return await knex('produtos')
        .select('*')
        .where('codigo', id)
        .first();
    } catch (error) {
      console.error(`Erro ao buscar produto ${id}:`, error);
      throw error;
    }
  }
  
  // Buscar regras fiscais do produto
  async getFiscalRules(codRegraIcms) {
    try {
      console.log(`Buscando regras fiscais para código: ${codRegraIcms}`);
      
      if (!codRegraIcms) {
        console.warn('Código de regra fiscal não informado');
        return [];
      }
      
      // Buscar as regras ICMS
      const regras = await knex('regras_icms_itens')
        .select('*')
        .where('cod_regra_icms', codRegraIcms);
      
      console.log(`Encontradas ${regras.length} regras fiscais para código ${codRegraIcms}`);
      
      // Se não encontrou regras, retornar uma regra padrão
      if (regras.length === 0) {
        console.warn(`Nenhuma regra encontrada para código ${codRegraIcms}, retornando regra padrão`);
        return [{
          cod_regra_icms: codRegraIcms,
          uf: 'SP',
          st_icms: '00',
          aliq_icms: 18,
          red_icms: 0,
          st_icms_contr: '00',
          aliq_icms_contr: 18,
          red_icms_contr: 0,
          icms_st: 'N',
          icms_st_reg_sn: 'N',
          st_icms_contr_reg_sn: '00',
          aliq_icms_contr_reg_sn: 18,
          red_icms_contr_reg_sn: 0
        }];
      }
      
      return regras;
    } catch (error) {
      console.error(`Erro ao buscar regras fiscais:`, error);
      // Retornar uma regra padrão em caso de erro
      return [{
        cod_regra_icms: codRegraIcms,
        uf: 'SP',
        st_icms: '00',
        aliq_icms: 18,
        red_icms: 0,
        st_icms_contr: '00',
        aliq_icms_contr: 18,
        red_icms_contr: 0,
        icms_st: 'N',
        icms_st_reg_sn: 'N',
        st_icms_contr_reg_sn: '00',
        aliq_icms_contr_reg_sn: 18,
        red_icms_contr_reg_sn: 0
      }];
    }
  }

  // Criar produto
  async createProduct(productData) {
    try {
      // Mapear campo preco para preco_venda e remover campos inexistentes
      const produtoProcessado = {
        ...productData,
        preco_venda: productData.preco, // Usar preco_venda em vez de preco
        cod_empresa: 1,
        // Garantir que os novos campos estejam presentes
        unidade: productData.unidade || 'UN',
        unidade2: productData.unidade2 || 'UN',
        fator_conversao: productData.fator_conv_estoque || 1,
        // Campos fiscais
        class_fiscal: productData.class_fiscal || '',
        ncm: productData.ncm || '',
        aliq_ipi: productData.aliq_ipi || 0,
        aliq_icms: productData.aliq_icms || 0,
        cod_regra_icms: productData.cod_regra_icms || 0,
        cod_origem_prod: productData.cod_origem_prod || '0'
      };
      
      // Remover campos que não existem na tabela
      delete produtoProcessado.preco;
      delete produtoProcessado.precoPromocional;
      delete produtoProcessado.precoCusto;
      delete produtoProcessado.estoqueMinimo; // Campo inexistente
      delete produtoProcessado.percentualIpi; // Usar aliq_ipi
      delete produtoProcessado.percentualIcms; // Usar aliq_icms
      delete produtoProcessado.categoria; // Campo inexistente
      delete produtoProcessado.ativo; // Campo inexistente
      delete produtoProcessado.imagemUrl; // Campo inexistente
      delete produtoProcessado.observacoes; // Campo inexistente
      delete produtoProcessado.fornecedor; // Campo inexistente
      
      // Se o código não foi fornecido, gerar um novo
      if (!produtoProcessado.codigo) {
        // Obter o maior código atual e incrementar
        const maxCodigo = await knex('produtos')
          .max('codigo as maxCodigo')
          .first();
          
        // Se for um código numérico, incrementar, senão gerar um novo código
        let novoCodigo;
        if (maxCodigo && maxCodigo.maxCodigo && !isNaN(Number(maxCodigo.maxCodigo))) {
          novoCodigo = String(Number(maxCodigo.maxCodigo) + 1).padStart(4, '0');
        } else {
          novoCodigo = '0001';
        }
        
        produtoProcessado.codigo = novoCodigo;
      }
      
      // Inserir o produto
      const [insertedId] = await knex('produtos').insert(produtoProcessado, ['codigo']);
      
      // Retornar o produto inserido
      return this.getProductById(insertedId || produtoProcessado.codigo);
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      throw error;
    }
  }
  
  // Atualiza um produto existente
  async updateProduct(id, productData) {
    try {
      // Verificar se o produto existe
      const existingProduct = await this.getProductById(id);
      if (!existingProduct) {
        return null;
      }
      
      // Mapear campos do frontend para colunas do banco, remover campos que não existem na tabela
      const dadosBanco = {
        codigo: productData.codigo,
        descricao: productData.descricao,
        unidade: productData.unidade || 'UN',
        unidade2: productData.unidade2 || 'UN',
        fator_conv_estoque: productData.fator_conv_estoque || 1,
        preco_venda: productData.preco, // Usar preco_venda, não preco
        estoque: productData.estoque,
        // estoqueMinimo: REMOVIDO - não existe na tabela
        // categoria: REMOVIDO - não existe na tabela
        // percentualIpi e percentualIcms: REMOVIDOS - usar aliq_ipi e aliq_icms
        // ativo: REMOVIDO - não existe na tabela
        // imagemUrl: REMOVIDO - não existe na tabela
        // observacoes: REMOVIDO - não existe na tabela
        // fornecedor: REMOVIDO - não existe na tabela
        //marca: productData.marca,
        //localizacao: productData.localizacao,
        //peso: productData.peso,
        //altura: productData.altura,
        //largura: productData.largura,
        //profundidade: productData.profundidade,
        //fator_conversao: productData.fator_conv_estoque || 1,
        // Campos fiscais
        class_fiscal: productData.class_fiscal || existingProduct.class_fiscal || '',
        aliq_ipi: productData.aliq_ipi || existingProduct.aliq_ipi || 0,
        aliq_icms: productData.aliq_icms || existingProduct.aliq_icms || 0,
        cod_regra_icms: productData.cod_regra_icms || existingProduct.cod_regra_icms || 0,
        //cod_origem_prod: productData.cod_origem_prod || existingProduct.cod_origem_prod || '0'
      };
      
      // Atualizar o produto
      await knex('produtos')
        .where('codigo', id)
        .where('cod_empresa', 1)
        .update(dadosBanco);
      
      // Retornar o produto atualizado
      return this.getProductById(id);
    } catch (error) {
      console.error(`Erro ao atualizar produto ${id}:`, error);
      throw error;
    }
  }
  
  // Exclui um produto
  async deleteProduct(id) {
    try {
      // Verificar se o produto existe
      const existingProduct = await this.getProductById(id);
      if (!existingProduct) {
        return false;
      }
      
      // Excluir o produto
      await knex('produtos')
        .where('codigo', id)
        .where('cod_empresa', 1)
        .delete();
      
      return true;
    } catch (error) {
      console.error(`Erro ao excluir produto ${id}:`, error);
      throw error;
    }
  }

  // Sincronizar estados (UF)
  async syncEstados() {
    try {
      console.log('[INFO] Iniciando sincronização de estados (UF)...');
      
      // Array de possíveis nomes de tabelas que podem conter dados de estados no ERP
      const possibleTables = ['ESTADOS', 'UF', 'UNIDADES_FEDERATIVAS', 'ESTADO', 'UFS'];
      let estadosERP = [];
      let tableFound = false;
      
      // Tentar cada tabela possível
      for (const tableName of possibleTables) {
        try {
          // Verificar se a tabela existe
          const hasTable = await erpConnection.schema.hasTable(tableName);
          
          if (hasTable) {
            console.log(`[INFO] Tabela '${tableName}' encontrada no ERP, tentando buscar estados...`);
            
            // Tentar diferentes possíveis estruturas de colunas
            try {
              // Tentativa 1: Padrão UF, NOME
              estadosERP = await erpConnection(tableName)
                .select('UF as uf', 'NOME as nome', 'CODIGO_IBGE as codigo_ibge')
                .whereNotNull('UF');
            } catch (err) {
              console.log(`[INFO] Erro na estrutura 1: ${err.message}`);
              
              try {
                // Tentativa 2: Padrão SIGLA, DESCRICAO
                estadosERP = await erpConnection(tableName)
                  .select('SIGLA as uf', 'DESCRICAO as nome', 'CODIGO_IBGE as codigo_ibge')
                  .whereNotNull('SIGLA');
              } catch (err) {
                console.log(`[INFO] Erro na estrutura 2: ${err.message}`);
                
                try {
                  // Tentativa 3: Padrão CODIGO, DESCRICAO (onde CODIGO é a sigla)
                  estadosERP = await erpConnection(tableName)
                    .select('CODIGO as uf', 'DESCRICAO as nome', 'CODIGO_IBGE as codigo_ibge')
                    .whereRaw('LENGTH(CODIGO) = 2')
                    .whereNotNull('CODIGO');
                } catch (err) {
                  console.log(`[INFO] Erro na estrutura 3: ${err.message}`);
                  
                  try {
                    // Tentativa 4: Nomes de colunas em minúsculas
                    estadosERP = await erpConnection(tableName)
                      .select('uf', 'nome', 'codigo_ibge');
                  } catch (err) {
                    console.log(`[INFO] Erro na estrutura 4: ${err.message}`);
                  }
                }
              }
            }
            
            // Se encontrou registros, interromper a busca
            if (estadosERP && estadosERP.length > 0) {
              console.log(`[INFO] Encontrados ${estadosERP.length} estados na tabela '${tableName}'`);
              tableFound = true;
              break;
            }
          }
        } catch (error) {
          console.log(`[INFO] Erro ao verificar tabela '${tableName}': ${error.message}`);
        }
      }
      
      if (!tableFound || estadosERP.length === 0) {
        console.log('[INFO] Nenhuma tabela de estados válida encontrada no ERP, usando estados padrão...');
        return;
      }
      
      // Processar os dados obtidos para garantir consistência
      const estadosProcessados = estadosERP.map(estado => {
        // Garantir que UF esteja em maiúsculas e tenha exatamente 2 caracteres
        const uf = (estado.uf || '').trim().toUpperCase();
        
        // Só considerar registros com UF válida (2 caracteres)
        if (uf.length !== 2) {
          return null;
        }
        
        return {
          uf,
          nome: (estado.nome || '').trim(),
          codigo_ibge: estado.codigo_ibge || null,
          ativo: true,
          dt_alt: new Date()
        };
      }).filter(estado => estado !== null);
      
      if (estadosProcessados.length === 0) {
        console.log('[INFO] Nenhum estado válido encontrado no ERP, usando estados padrão...');
        return;
      }
      
      console.log(`[INFO] Salvando ${estadosProcessados.length} estados do ERP no banco local...`);
      
      // Atualizar estados existentes e inserir novos usando upsert
      for (const estado of estadosProcessados) {
        await knex('estados')
          .insert(estado)
          .onConflict('uf')
          .merge({
            nome: estado.nome,
            codigo_ibge: estado.codigo_ibge,
            ativo: true,
            dt_alt: new Date()
          });
      }
      
      console.log('[INFO] Sincronização de estados concluída com sucesso!');
      
      // Registrar log de sincronização
      await this.logSync('ESTADOS', 'CONCLUIDO', `Sincronização de estados concluída: ${estadosProcessados.length} estados atualizados`);
      
    } catch (error) {
      console.error('[ERRO] Falha na sincronização de estados:', error);
      
      // Registrar erro no log
      await this.logSync('ESTADOS', 'ERRO', `Erro na sincronização de estados: ${error.message}`);
    }
  }

  // Sincronizar clientes do ERP
  async syncClientes() {
    try {
      console.log('[INFO] Sincronizando clientes...');
      
      // Determinar o limite de registros para sincronização
      const sincLimitRecords = 1000; // Limitar para evitar problemas de memória

      // Carregar tabela de estados para referência
      const estados = await knex('estados').select('uf', 'nome');
      const estadosMap = {};
      estados.forEach(estado => {
        estadosMap[estado.uf] = estado.nome;
        // Também mapear o nome para a UF para pesquisa reversa
        estadosMap[estado.nome.toUpperCase()] = estado.uf;
      });
      
      console.log(`[INFO] Carregados ${estados.length} estados para referência`);

      // Verificar colunas disponíveis na tabela IBGE
      let colunasMunicipio = ['municipio', 'nome_municipio', 'descricao', 'NOME'];
      let colunaMunicipioEncontrada = '';
      let ibgeData = [];
      
      try {
        // Verificar quais colunas existem na tabela IBGE
        const colunas = await knex('ibge').columnInfo();
        const colunasDisponiveis = Object.keys(colunas);
        console.log(`[INFO] Colunas disponíveis na tabela IBGE: ${colunasDisponiveis.join(', ')}`);
        
        // Encontrar a coluna que representa o nome do município
        for (const coluna of colunasMunicipio) {
          if (colunasDisponiveis.includes(coluna)) {
            colunaMunicipioEncontrada = coluna;
            console.log(`[INFO] Usando coluna '${coluna}' para o nome do município`);
            break;
          }
        }
        
        if (!colunaMunicipioEncontrada) {
          console.log(`[ERRO] Nenhuma coluna de nome de município encontrada na tabela IBGE. Usando fallback.`);
          // Se não encontrar uma coluna para nome, usar um fallback
          colunaMunicipioEncontrada = colunasDisponiveis[1] || 'municipio'; // Usar segunda coluna ou 'municipio'
        }
        
        // Carregar dados IBGE com a coluna correta
        const query = knex('ibge').select('codigo', 'uf');
        query.select(colunaMunicipioEncontrada + ' as municipio'); // Alias para municipio
        ibgeData = await query;
        
        console.log(`[INFO] Carregados ${ibgeData.length} municípios IBGE para referência`);
      } catch (err) {
        console.error(`[ERRO] Falha ao carregar dados IBGE: ${err.message}`);
        // Continuar com ibgeData vazio para não bloquear a sincronização
        ibgeData = [];
      }
      
      // Criar mapas para busca eficiente
      const ibgeMapByCode = {};
      const ibgeMapByNomeUF = {};
      
      ibgeData.forEach(cidade => {
        ibgeMapByCode[cidade.codigo] = { 
          municipio: cidade.municipio, 
          uf: cidade.uf 
        };
        // Chave composta de nome + UF para busca reversa
        if (cidade.municipio && cidade.uf) {
          const chave = `${cidade.municipio.toUpperCase()}_${cidade.uf}`;
          ibgeMapByNomeUF[chave] = cidade.codigo;
        }
      });
      
      // Verificar nomes de tabelas disponíveis no ERP
      const possibleClientsTables = [
        'CLIENTES', 'clientes', 'Clientes',
        'CLIENTE', 'cliente', 'Cliente',
        'CUSTOMERS', 'customers', 'Customers',
        'CADASTRO_CLIENTES', 'cadastro_clientes'
      ];
      
      let clientesTableName = '';
      let clienteColumns = [];
      
      console.log('[INFO] Verificando tabelas de clientes no ERP...');
      
      try {
        // Verificar todas as tabelas disponíveis
        const tableResults = await erpConnection.raw(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `);
        
        const availableTables = tableResults.rows.map(row => row.table_name);
        console.log('[INFO] Tabelas disponíveis no ERP:', availableTables.join(', '));
        
        // Encontrar qual tabela de clientes usar
        for (const tableName of possibleClientsTables) {
          if (availableTables.includes(tableName)) {
            clientesTableName = tableName;
            console.log(`[INFO] Tabela de clientes encontrada: ${tableName}`);
            
            // Verificar colunas disponíveis
            const columnsResult = await erpConnection.raw(`
              SELECT column_name 
              FROM information_schema.columns 
              WHERE table_name = ?
            `, [tableName]);
            
            clienteColumns = columnsResult.rows.map(row => row.column_name);
            console.log(`[INFO] Colunas disponíveis na tabela ${tableName}:`, clienteColumns.join(', '));
            
            break;
          }
        }
        
        if (!clientesTableName) {
          console.log('[ERRO] Nenhuma tabela de clientes encontrada no ERP');
          return 0;
        }
      } catch (error) {
        console.error('[ERRO] Falha ao verificar tabelas no ERP:', error.message);
        // Tentar continuar com os nomes padrão
        clientesTableName = 'clientes';
      }
      
      // Buscar clientes do ERP
      let clientesERP = [];
      try {
        // Construir consulta dinamicamente com base nas colunas disponíveis
        const query = erpConnection(clientesTableName);
        
        // Mapear colunas com fallbacks
        const columnMappings = {
          codigo: ['CODIGO', 'codigo', 'ID', 'id', 'COD_CLIENTE', 'cod_cliente'],
          razao: ['RAZAO', 'razao', 'RAZAO_SOCIAL', 'razao_social', 'NOME_COMPLETO', 'nome_completo'],
          nome: ['NOME', 'nome', 'FANTASIA', 'fantasia', 'NOME_FANTASIA', 'nome_fantasia'],
          cnpj: ['CGC', 'cgc', 'CNPJ', 'cnpj', 'CNPJ_CPF', 'cnpj_cpf', 'CPF_CNPJ', 'cpf_cnpj'],
          municipio: ['MUNICIPIO', 'municipio', 'CITY', 'city'],
          uf: ['UF', 'uf', 'ESTADO', 'estado', 'STATE', 'state'],
          insc_est: ['INSC_EST', 'insc_est', 'INSCRICAO_ESTADUAL', 'inscricao_estadual', 'IE', 'ie'],
          uf_insc_rg: ['UF_INSC_RG', 'uf_insc_rg', 'UF_IE', 'uf_ie', 'UF_INSCRICAO', 'uf_inscricao'],
          insc_mun: ['INSC_MUNICIPAL', 'insc_mun', 'INSCRICAO_MUNICIPAL', 'inscricao_municipal', 'IM', 'im'],
          cep: ['CEP', 'cep', 'CODIGO_POSTAL', 'codigo_postal', 'ZIP', 'zip'],
          logradouro: ['ENDERECO', 'endereco', 'LOGRADOURO', 'logradouro', 'ADDRESS', 'address'],
          logradouro_num: ['NUMERO', 'numero', 'NUM', 'num', 'NUMBER', 'number'],
          complemento: ['COMPLEMENTO', 'complemento', 'COMP', 'comp'],
          bairro: ['BAIRRO', 'bairro', 'NEIGHBORHOOD', 'neighborhood'],
          cod_ibge: ['COD_IBGE', 'cod_ibge', 'CODIGO_IBGE', 'codigo_ibge'],
          contribuinte: ['CONTRIBUINTE', 'contribuinte', 'IS_CONTRIBUINTE', 'is_contribuinte']
        };
        
        // Adicionar colunas à consulta, usando o primeiro nome disponível para cada campo
        const finalSelectColumns = {};
        
        for (const [fieldName, possibleColumns] of Object.entries(columnMappings)) {
          const foundColumn = possibleColumns.find(col => clienteColumns.includes(col));
          if (foundColumn) {
            finalSelectColumns[fieldName] = foundColumn;
          }
        }
        
        console.log('[INFO] Mapeamento de colunas para consulta:', JSON.stringify(finalSelectColumns));
        
        // Construir a consulta de forma dinâmica
        for (const [fieldName, columnName] of Object.entries(finalSelectColumns)) {
          query.select(`${columnName} as ${fieldName}`);
        }
        
        // Adicionar filtros (adaptados para as colunas disponíveis)
        if (clienteColumns.includes('SITUACAO')) {
          query.whereRaw('SITUACAO = ?', ['A']);
        } else if (clienteColumns.includes('situacao')) {
          query.whereRaw('situacao = ?', ['A']);
        } else if (clienteColumns.includes('COD_STATUS')) {
          query.whereRaw('COD_STATUS = ?', [1]);
        } else if (clienteColumns.includes('cod_status')) {
          query.whereRaw('cod_status = ?', [1]);
        } else if (clienteColumns.includes('ativo')) {
          query.whereRaw('ativo = ?', [true]);
        }
        
        query.limit(sincLimitRecords);
        
        // Executar a consulta
        console.log(`[INFO] Executando consulta na tabela ${clientesTableName}...`);
        clientesERP = await query;
        
        console.log(`[INFO] ${clientesERP.length} clientes encontrados no ERP.`);
      } catch (err) {
        console.log(`[ERRO] Falha ao buscar clientes do ERP: ${err.message}`);
        return 0;
      }
      
      if (clientesERP.length === 0) {
        console.log('[INFO] Nenhum cliente no ERP para sincronizar.');
        return 0;
      }
      
      // O restante do código permanece o mesmo
      // Preparar clientes para inserção com campos adicionais
      const clientesFormatados = await Promise.all(clientesERP.map(async cliente => {
        // Normalizar os campos para evitar problemas
        const originalUF = (cliente.uf || '').trim().toUpperCase();
        const originalMunicipio = (cliente.municipio || '').trim();
        
        // Processar município e UF
        let municipio = originalMunicipio;
        let uf = originalUF;
        
        let cod_ibge = cliente.cod_ibge || '';
        
        // Log detalhado para depuração
        console.log(`[DEBUG] Cliente ${cliente.codigo} - UF original: '${originalUF}', Município original: '${originalMunicipio}', Código IBGE original: '${cod_ibge}'`);
        
        // Validar UF
        if (!uf || uf.length !== 2 || !estadosMap[uf]) {
          // UF inválida ou não encontrada
          console.log(`[WARN] Cliente ${cliente.codigo} com UF inválida: '${uf}'`);
          
          // Tentar derivar UF do município se disponível
          if (municipio) {
            // Verificar se algum município IBGE corresponde ao nome
            const municipiosSimiliares = ibgeData.filter(
              ibge => ibge.municipio && ibge.municipio.toUpperCase() === municipio.toUpperCase()
            );
            
            if (municipiosSimiliares.length === 1) {
              // Se temos apenas um município com esse nome, usar sua UF
              uf = municipiosSimiliares[0].uf;
              console.log(`[INFO] UF derivada do município '${municipio}': ${uf}`);
            } else if (municipiosSimiliares.length > 1) {
              // Se existem vários, usar SP como fallback padrão
              uf = 'SP';
              console.log(`[INFO] Múltiplos municípios chamados '${municipio}', usando UF padrão: SP`);
            } else {
              // Nenhum município encontrado, usar SP como fallback
              uf = 'SP';
              console.log(`[INFO] Nenhum município chamado '${municipio}' encontrado, usando UF padrão: SP`);
            }
          } else {
            // Se não temos o município, usar SP como fallback
            uf = 'SP';
            console.log(`[INFO] Cliente ${cliente.codigo} sem município e com UF inválida, usando UF padrão: SP`);
          }
        }
        
        // Validar e corrigir código IBGE
        if (cod_ibge) {
          // Tentar formatar o código IBGE se for numérico
          if (!isNaN(cod_ibge)) {
            cod_ibge = String(cod_ibge).padStart(7, '0');
          }
          
          // Verificar se o código IBGE existe no nosso mapa
          if (ibgeMapByCode[cod_ibge]) {
            // Usar os dados do IBGE para garantir consistência
            uf = ibgeMapByCode[cod_ibge].uf;
            municipio = ibgeMapByCode[cod_ibge].municipio;
            console.log(`[INFO] Dados IBGE encontrados para código ${cod_ibge}: ${municipio}/${uf}`);
          } else {
            console.log(`[WARN] Código IBGE '${cod_ibge}' não encontrado na base de referência`);
            // Manter o cod_ibge, mas buscar novamente pelo município e UF
            cod_ibge = '';
          }
        }
        
        // Se não temos código IBGE válido, mas temos município e UF, buscar o código
        if (!cod_ibge && municipio && uf) {
          // Criar chave de busca
          const chave = `${municipio.toUpperCase()}_${uf}`;
          
          if (ibgeMapByNomeUF[chave]) {
            cod_ibge = ibgeMapByNomeUF[chave];
            console.log(`[INFO] Código IBGE encontrado para ${municipio}/${uf}: ${cod_ibge}`);
          } else {
            // Tentar busca aproximada
            try {
              const ibgeCidade = await knex('ibge')
                .whereRaw('UPPER(' + colunaMunicipioEncontrada + ') LIKE ? AND uf = ?', [`${municipio.toUpperCase()}%`, uf])
                .first();
                
              if (ibgeCidade) {
                cod_ibge = ibgeCidade.codigo;
                municipio = ibgeCidade[colunaMunicipioEncontrada]; // Usar o nome correto da base IBGE
                console.log(`[INFO] Código IBGE aproximado para ${municipio}/${uf}: ${cod_ibge}`);
              } else {
                console.log(`[WARN] Nenhum código IBGE encontrado para ${municipio}/${uf}`);
              }
            } catch (ibgeError) {
              console.log(`[ERRO] Falha ao buscar IBGE para ${municipio}/${uf}: ${ibgeError.message}`);
            }
          }
        }
        
        // Determinar se é contribuinte
        let contribuinte = false;
        if (cliente.contribuinte !== undefined && cliente.contribuinte !== null) {
          // Se o campo existe, verificar valor
          if (typeof cliente.contribuinte === 'string') {
            contribuinte = cliente.contribuinte.toUpperCase() === 'S' || 
                           cliente.contribuinte === '1' || 
                           cliente.contribuinte.toUpperCase() === 'SIM';
          } else if (typeof cliente.contribuinte === 'number') {
            contribuinte = cliente.contribuinte === 1;
          } else if (typeof cliente.contribuinte === 'boolean') {
            contribuinte = cliente.contribuinte;
          }
        } else {
          // Inferir pelo CNPJ e inscrição estadual
          const temCNPJ = cliente.cnpj && cliente.cnpj.length > 11; // CNPJ tem mais de 11 dígitos
          const temIE = cliente.insc_est && cliente.insc_est.trim() !== '';
          contribuinte = temCNPJ && temIE;
        }
        
        // Garantir CEP válido
        let cep = (cliente.cep || '').replace(/\D/g, ''); // Remover não-dígitos
        if (cep.length > 8) cep = cep.substring(0, 8);
        
        // Log das informações finais
        console.log(`[DEBUG] Cliente ${cliente.codigo} - Dados finais: UF: '${uf}', Município: '${municipio}', Código IBGE: '${cod_ibge}', Contribuinte: ${contribuinte}`);
        
        // Limitar o tamanho dos campos de acordo com a definição da tabela
        return {
          codigo: cliente.codigo,
          razao: (cliente.razao || '').substring(0, 100),
          nome: (cliente.nome || '').substring(0, 60),
          cnpj: cliente.cnpj || '',
          municipio: municipio.substring(0, 60),
          uf: uf.substring(0, 2).toUpperCase(),
          insc_est: cliente.insc_est || '',
          uf_insc_rg: (cliente.uf_insc_rg || '').substring(0, 2).toUpperCase(),
          insc_mun: (cliente.insc_mun || '').substring(0, 10),
          cep: cep.substring(0, 8),
          logradouro: (cliente.logradouro || '').substring(0, 90),
          logradouro_num: (cliente.logradouro_num || '').substring(0, 10),
          complemento: (cliente.complemento || '').substring(0, 200),
          bairro: (cliente.bairro || '').substring(0, 200),
          cod_ibge: cod_ibge.substring(0, 50),
          municipio: municipio.substring(0, 60),
          contribuinte: contribuinte ? 1 : 0,
          cod_empresa: 1,
          dt_inc: knex.fn.now(),
          cod_status: 1
        };
      }));
      
      // Verificar as colunas disponíveis na tabela clientes
      const tabelaClientesColunas = await knex('clientes').columnInfo();
      const colunasDisponiveis = Object.keys(tabelaClientesColunas);
      console.log(`[INFO] Colunas disponíveis na tabela clientes: ${colunasDisponiveis.join(', ')}`);
      
      // Inserir ou atualizar clientes no banco local
      let countInserted = 0;
      let countUpdated = 0;
      
      for (const clienteCompleto of clientesFormatados) {
        // Filtrar apenas as colunas que existem na tabela
        const cliente = {};
        for (const [campo, valor] of Object.entries(clienteCompleto)) {
          if (colunasDisponiveis.includes(campo)) {
            cliente[campo] = valor;
          } else {
            console.log(`[WARN] Campo '${campo}' ignorado porque não existe na tabela clientes`);
          }
        }
        
        // Verificar se o cliente já existe
        const clienteExistente = await knex('clientes')
          .where('codigo', cliente.codigo)
          .first();
        
        if (clienteExistente) {
          // Atualizar cliente existente
          // Adicionar o campo dt_alt se existir na tabela
          if (colunasDisponiveis.includes('dt_alt')) {
            cliente.dt_alt = knex.fn.now();
          } else if (colunasDisponiveis.includes('updated_at')) {
            cliente.updated_at = knex.fn.now();
          }
          
          await knex('clientes')
            .where('codigo', cliente.codigo)
            .update(cliente);
          countUpdated++;
        } else {
          // Inserir novo cliente
          // Adicionar campos de data se existirem na tabela
          if (colunasDisponiveis.includes('created_at')) {
            cliente.created_at = knex.fn.now();
          }
          if (colunasDisponiveis.includes('updated_at')) {
            cliente.updated_at = knex.fn.now();
          }
          
          await knex('clientes').insert(cliente);
          countInserted++;
        }
      }
      
      console.log(`[INFO] Clientes sincronizados: ${countInserted} inseridos, ${countUpdated} atualizados.`);
      return countInserted + countUpdated;
    } catch (error) {
      console.error('[ERRO] Falha ao sincronizar clientes:', error);
      throw error;
    }
  }

  // Sincronizar dados fiscais do ERP
  async syncFiscalData() {
    try {
      console.log('[INFO] Iniciando sincronização de dados fiscais...');
      
      // 1. Sincronizar regras de ICMS
      console.log('[INFO] Sincronizando regras de ICMS...');
      const regrasFiscais = await this.syncRegrasIcms();
      
      // 2. Sincronizar dados de classificação fiscal (NCM e CEST)
      console.log('[INFO] Sincronizando classificações fiscais...');
      const classeFiscal = await this.syncClasseFiscal();
      
      // 3. Sincronizar tributações fiscais (CEST e IVA) - NOVO
      console.log('[INFO] Sincronizando tributações fiscais (CEST e IVA)...');
      const tributacoesFiscais = await this.syncTributacoesFiscais();
      
      // 4. Sincronizar regras fiscais dos produtos
      console.log('[INFO] Sincronizando regras fiscais dos produtos...');
      const regrasProdutos = await this.syncRegrasFiscaisProdutos();
      
      // 5. Atualizar produtos com dados fiscais
      console.log('[INFO] Atualizando produtos com dados fiscais...');
      const produtosAtualizados = await this.updateProductsFiscalData();
      
      return {
        regrasFiscais,
        classeFiscal,
        tributacoesFiscais,
        regrasProdutos,
        produtosAtualizados
      };
    } catch (error) {
      console.error('[ERRO] Falha ao sincronizar dados fiscais:', error);
      throw error;
    }
  }

  // Sincronizar tributações fiscais (CEST e IVA)
  async syncTributacoesFiscais() {
    try {
      console.log('[INFO] Buscando tributações fiscais no ERP...');
      
      // Limite para não sobrecarregar com muitos registros
      const MAX_TRIBUTACOES = 5000;
      
      // Verificar se a tabela existe no ERP
      let erpTributacoes = [];
      try {
        const hasTable = await erpConnection.schema.hasTable('class_fiscal_tributacoes');
        if (hasTable) {
          // Buscar dados da tabela - limitar para não causar timeout
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
            .from('class_fiscal_tributacoes')
            .limit(MAX_TRIBUTACOES);
            
          console.log(`[INFO] Encontradas ${erpTributacoes.length} tributações fiscais no ERP (limitado a ${MAX_TRIBUTACOES})`);
          } else {
          // Tentar buscar dados de tabela alternativa
          const hasAlternativeTable = await erpConnection.schema.hasTable('CEST');
          if (hasAlternativeTable) {
            console.log('[INFO] Tabela CEST encontrada, verificando dados...');
            
            // Buscar dados da tabela CEST com limite
            const cestData = await erpConnection
              .select(
                'CEST.CODIGO as cest',
                'CEST.DESCRICAO as descricao',
                'CEST.COD_NCM as cod_ncm'
              )
              .from('CEST')
              .limit(1000); // Limitar para evitar sobrecarga
              
            console.log(`[INFO] Encontrados ${cestData.length} códigos CEST na tabela CEST`);
            
            // Converter para formato compatível com class_fiscal_tributacoes
            // Primeiro, precisamos buscar as classificações fiscais para associar NCM com cod_class_fiscal
            const classFiscal = await knex('class_fiscal').select('codigo', 'cod_ncm');
            
            // Mapeamento de NCM para código de classificação fiscal
            const ncmToClassFiscal = {};
            classFiscal.forEach(cf => {
              if (cf.cod_ncm) {
                ncmToClassFiscal[cf.cod_ncm] = cf.codigo;
              }
            });
            
            // Usar apenas UFs principais para reduzir volume de dados
            const ufs = ["SP", "RJ", "MG", "RS", "PR", "SC", "BA"];
            
            // Converter dados CEST para o formato de tributações - limitando para não exceder MAX_TRIBUTACOES
            let count = 0;
            for (const cest of cestData) {
              if (count >= MAX_TRIBUTACOES) break;
              
              if (cest.cod_ncm && ncmToClassFiscal[cest.cod_ncm]) {
                const codClassFiscal = ncmToClassFiscal[cest.cod_ncm];
                
                for (const uf of ufs) {
                  if (count >= MAX_TRIBUTACOES) break;
                  
                  erpTributacoes.push({
                    cod_class_fiscal: codClassFiscal,
                    uf: uf,
                    cest: cest.cest,
                    iva: 0,  // Valor padrão
                    aliq_interna: 0,  // Valor padrão
                    iva_importado: 0,  // Valor padrão
                    aliq_importado: 0  // Valor padrão
                  });
                  
                  count++;
                }
              }
            }
            
            console.log(`[INFO] Convertidos ${erpTributacoes.length} registros de tributações fiscais`);
          }
        }
      } catch (error) {
        console.error('[ERRO] Falha ao buscar tributações fiscais do ERP:', error);
      }
      
      if (erpTributacoes.length === 0) {
        console.log('[INFO] Nenhuma tributação fiscal encontrada para sincronização');
        return 0;
      }
      
      // Inserir ou atualizar tributações fiscais no banco local
      let count = 0;
      
      // Verificar se a tabela existe no banco local
      const hasLocalTable = await knex.schema.hasTable('class_fiscal_tributacoes');
      if (!hasLocalTable) {
        console.log('[INFO] Criando tabela class_fiscal_tributacoes no banco local...');
        
        try {
          await knex.schema.createTable('class_fiscal_tributacoes', table => {
            table.increments('codigo').primary(); // Adicionar coluna codigo como chave primária autoincrement
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
          
          console.log('[INFO] Tabela class_fiscal_tributacoes criada com sucesso');
        } catch (error) {
          console.error('[ERRO] Falha ao criar tabela class_fiscal_tributacoes:', error);
          return 0;
        }
          } else {
        // Verificar se a tabela tem a estrutura correta
        try {
          console.log('[INFO] Verificando estrutura da tabela class_fiscal_tributacoes...');
          const hasCodigoColumn = await knex.schema.hasColumn('class_fiscal_tributacoes', 'codigo');
          
          if (!hasCodigoColumn) {
            console.log('[INFO] A coluna codigo não existe. Alterando a tabela...');
            // Tentar adicionar a coluna codigo
            try {
              await knex.schema.table('class_fiscal_tributacoes', table => {
                table.dropPrimary(); // Remover a chave primária atual
                table.increments('codigo').primary(); // Adicionar coluna codigo como chave primária
              });
              console.log('[INFO] Coluna codigo adicionada com sucesso');
            } catch (alterError) {
              console.error('[ERRO] Não foi possível alterar a tabela:', alterError);
              console.log('[INFO] Tentando recriar a tabela...');
              
              try {
                // Backup dos dados existentes
                const dadosExistentes = await knex('class_fiscal_tributacoes').select('*');
                console.log(`[INFO] Backup de ${dadosExistentes.length} registros realizado`);
                
                // Dropar e recriar a tabela
                await knex.schema.dropTable('class_fiscal_tributacoes');
                await knex.schema.createTable('class_fiscal_tributacoes', table => {
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
                
                // Restaurar dados (se existirem)
                if (dadosExistentes.length > 0) {
                  const dadosSemCodigo = dadosExistentes.map(({ codigo, ...resto }) => resto);
                  await knex('class_fiscal_tributacoes').insert(dadosSemCodigo);
                  console.log(`[INFO] ${dadosSemCodigo.length} registros restaurados`);
                }
                
                console.log('[INFO] Tabela recriada com sucesso');
              } catch (recreateError) {
                console.error('[ERRO] Falha ao recriar tabela:', recreateError);
                return 0;
              }
            }
          }
        } catch (checkError) {
          console.error('[ERRO] Falha ao verificar estrutura da tabela:', checkError);
        }
      }
      
      // Limpar tabela existente para evitar conflitos e melhorar performance
      try {
        console.log('[INFO] Limpando tabela class_fiscal_tributacoes para inserção otimizada...');
        await knex('class_fiscal_tributacoes').truncate();
        console.log('[INFO] Tabela limpa com sucesso');
      } catch (truncateError) {
        console.error('[ERRO] Falha ao limpar tabela class_fiscal_tributacoes:', truncateError);
        // Continuar mesmo com erro
      }
      
      // Inserir dados em lotes para melhor performance
      const batchSize = 500; // Maior tamanho de lote para inserção mais rápida
      
      for (let i = 0; i < erpTributacoes.length; i += batchSize) {
        try {
          const batch = erpTributacoes.slice(i, i + batchSize);
          
          // Inserir lote inteiro de uma vez
          await knex('class_fiscal_tributacoes').insert(batch);
          count += batch.length;
          
          console.log(`[INFO] Processados ${Math.min(count, erpTributacoes.length)} de ${erpTributacoes.length} tributações fiscais`);
        } catch (batchError) {
          console.error(`[ERRO] Falha ao inserir lote de tributações fiscais:`, batchError);
          
          // Em caso de falha no lote, tentar inserir um por um
          console.log('[INFO] Tentando inserir registros individualmente...');
          const batch = erpTributacoes.slice(i, i + batchSize);
          for (const tributacao of batch) {
            try {
              await knex('class_fiscal_tributacoes').insert(tributacao);
              count++;
            } catch (singleError) {
              console.error(`[ERRO] Falha ao inserir tributação individual:`, singleError);
            }
          }
        }
      }
      
      console.log(`[INFO] Sincronização de tributações fiscais concluída: ${count} registros processados`);
      return count;
    } catch (error) {
      console.error('[ERRO] Falha ao sincronizar tributações fiscais:', error);
      return 0;
    }
  }
  
  // Sincronizar regras de ICMS
  async syncRegrasIcms() {
    try {
      // Buscar regras fiscais dos produtos no ERP
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
          'i.icms_st_reg_sn',
          'i.cod_empresa' // IMPORTANTE: Adicionar seleção do campo cod_empresa
        )
        .from('regras_icms_cadastro as r')
        .join('regras_icms_itens as i', 'r.codigo', 'i.cod_regra_icms')
        .whereNull('r.dt_exc');
        
      console.log(`[INFO] Encontradas ${erpFiscalRules.length} regras fiscais no ERP`);
      
      if (erpFiscalRules.length === 0) {
        return 0;
      }
      
      // Separar dados do cadastro de regras e itens
      const regrasCadastro = [...new Set(erpFiscalRules.map(r => r.codigo))].map(codigo => ({
        codigo,
        acrescimo_icms: erpFiscalRules.find(r => r.codigo === codigo)?.acrescimo_icms || 'N',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      }));
      
      // Inserir/atualizar cadastro de regras
      let countRegras = 0;
      for (const regra of regrasCadastro) {
        await knex('regras_icms_cadastro')
          .insert(regra)
          .onConflict('codigo')
          .merge({
            acrescimo_icms: regra.acrescimo_icms,
            updated_at: knex.fn.now()
          });
        countRegras++;
      }
      
      // Mapear itens de regras para inserir
      const regrasItens = erpFiscalRules.map(r => ({
        codigo: knex.raw("nextval('regras_icms_itens_id_seq')"), // Usar sequência para gerar ID
        cod_regra_icms: r.codigo,
        uf: r.uf,
        st_icms: r.st_icms,
        aliq_icms: r.aliq_icms,
        red_icms: r.red_icms,
        cod_convenio: r.cod_convenio,
        st_icms_contr: r.st_icms_contr,
        aliq_icms_contr: r.aliq_icms_contr,
        red_icms_contr: r.red_icms_contr,
        cod_convenio_contr: r.cod_convenio_contr,
        icms_st: r.icms_st,
        cod_aliquota: r.cod_aliquota,
        aliq_interna: r.aliq_interna,
        aliq_ecf: r.aliq_ecf,
        aliq_dif_icms_contr: r.aliq_dif_icms_contr,
        aliq_dif_icms_cons: r.aliq_dif_icms_cons,
        reducao_somente_icms_proprio: r.reducao_somente_icms_proprio,
        cod_cbnef: r.cod_cbnef,
        st_icms_contr_reg_sn: r.st_icms_contr_reg_sn,
        aliq_icms_contr_reg_sn: r.aliq_icms_contr_reg_sn,
        red_icms_contr_reg_sn: r.red_icms_contr_reg_sn,
        aliq_dif_icms_contr_reg_sn: r.aliq_dif_icms_contr_reg_sn,
        cod_convenio_contr_reg_sn: r.cod_convenio_contr_reg_sn,
        icms_st_reg_sn: r.icms_st_reg_sn,
        cod_empresa: r.cod_empresa || 1 // IMPORTANTE: Incluir cod_empresa, default para 1 se não existir
      }));
      
      // Mostrar um resumo das regras por empresa para debug
      const empresas = [...new Set(regrasItens.map(r => r.cod_empresa))];
      for (const empresa of empresas) {
        const count = regrasItens.filter(r => r.cod_empresa === empresa).length;
        console.log(`[INFO] Regras fiscais para empresa ${empresa}: ${count} registros`);
      }
      
      // Limpar registros existentes se necessário
      try {
        console.log('[INFO] Limpando tabela de regras ICMS itens...');
        await knex('regras_icms_itens').delete();
      } catch (error) {
        console.error('[ERRO] Falha ao limpar tabela de regras ICMS itens:', error);
      }
      
      // Verificar a estrutura da tabela regras_icms_itens
      let tableInfo = await knex('regras_icms_itens').columnInfo();
      const hasCodigo = !!tableInfo.codigo;
      const hasCodEmpresa = !!tableInfo.cod_empresa;
      
      if (!hasCodigo) {
        // Se não existir a coluna 'codigo', precisamos adicionar
        try {
          console.log('[INFO] Adicionando coluna codigo à tabela regras_icms_itens...');
          await knex.schema.table('regras_icms_itens', table => {
            table.increments('codigo').primary();
          });
          console.log('[INFO] Coluna codigo adicionada com sucesso');
        } catch (error) {
          console.error('[ERRO] Falha ao adicionar coluna codigo:', error);
          // Se falhar, vamos usar um ID genérico para cada item
          regrasItens.forEach((item, index) => {
            item.codigo = index + 1;
          });
        }
      }
      
      // Verificar e adicionar a coluna 'cod_empresa' se necessário
      if (!hasCodEmpresa) {
        try {
          console.log('[INFO] Adicionando coluna cod_empresa à tabela regras_icms_itens...');
          await knex.schema.table('regras_icms_itens', table => {
            table.integer('cod_empresa').defaultTo(1);
          });
          console.log('[INFO] Coluna cod_empresa adicionada com sucesso');
        } catch (error) {
          console.error('[ERRO] Falha ao adicionar coluna cod_empresa:', error);
        }
      }
      
      // Inserir em lotes menores para melhor performance e evitar erros
      const chunkSize = 10; // Reduzir o tamanho do lote para evitar erros
      let countItens = 0;
      
      for (let i = 0; i < regrasItens.length; i += chunkSize) {
        try {
          const chunk = regrasItens.slice(i, i + chunkSize);
          await knex('regras_icms_itens').insert(chunk);
          countItens += chunk.length;
          console.log(`[INFO] Inseridos ${countItens}/${regrasItens.length} itens de regras ICMS`);
        } catch (error) {
          console.error(`[ERRO] Falha ao inserir lote de regras ICMS (itens ${i} a ${i + chunkSize}):`, error.message);
          // Tentar inserir um por um
          try {
            for (const item of regrasItens.slice(i, i + chunkSize)) {
              try {
                await knex('regras_icms_itens').insert(item);
                countItens++;
              } catch (itemError) {
                console.error(`[ERRO] Falha ao inserir item de regra ICMS:`, itemError.message);
              }
            }
          } catch (batchError) {
            console.error('[ERRO] Falha ao processar lote individualmente:', batchError);
          }
        }
      }
      
      console.log(`[INFO] Sincronização de regras fiscais concluída: ${countRegras} regras e ${countItens} itens`);
      return countItens;
    } catch (error) {
      console.error('[ERRO] Falha ao sincronizar regras ICMS:', error);
      return 0;
    }
  }
  
  // Sincronizar classificação fiscal
  async syncClasseFiscal() {
    try {
      // Buscar classificações fiscais no ERP
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
        
      console.log(`[INFO] Encontradas ${erpFiscalClasses.length} classificações fiscais no ERP`);
      
      if (erpFiscalClasses.length === 0) {
        return 0;
      }
      
      // Separar dados da classificação fiscal e dados específicos por UF
      const classFiscal = [...new Set(erpFiscalClasses.map(c => c.codigo))].map(codigo => {
        const item = erpFiscalClasses.find(c => c.codigo === codigo);
        return {
          codigo,
          cod_ncm: item.cod_ncm || ''
        };
      });
      
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
      
      // Inserir/atualizar classificações fiscais
      let countClass = 0;
      for (const cf of classFiscal) {
        await knex('class_fiscal')
          .insert(cf)
          .onConflict('codigo')
          .merge({
            cod_ncm: cf.cod_ncm
          });
        countClass++;
      }
      
      // Inserir/atualizar dados de classificação fiscal por UF
      let countDados = 0;
      for (const cfd of classFiscalDados) {
        try {
          await knex('class_fiscal_dados')
            .insert(cfd)
            .onConflict(['cod_class_fiscal', 'uf'])
            .merge({
              aliq_fcp: cfd.aliq_fcp,
              aliq_fcpst: cfd.aliq_fcpst,
              aliq_pst: cfd.aliq_pst,
              iva: cfd.iva,
              aliq_interna: cfd.aliq_interna,
              iva_diferenciado: cfd.iva_diferenciado,
              cest: cfd.cest,
              iva_importado: cfd.iva_importado,
              aliq_importado: cfd.aliq_importado
            });
          countDados++;
        } catch (error) {
          console.error(`[ERRO] Falha ao inserir dados de classificação fiscal ${cfd.cod_class_fiscal} UF ${cfd.uf}:`, error);
        }
      }
      
      console.log(`[INFO] Sincronização de classificações fiscais concluída: ${countClass} classes e ${countDados} dados por UF`);
      return countClass + countDados;
    } catch (error) {
      console.error('[ERRO] Falha ao sincronizar classificações fiscais:', error);
      return 0;
    }
  }
  
  // Sincronizar regras fiscais dos produtos
  async syncRegrasFiscaisProdutos() {
    try {
      // Buscar regras fiscais dos produtos no ERP
      const erpProdutoRegras = await erpConnection
        .select(
          'prod.codigo as cod_produto',
          'prod.cod_regra_icms',
          'prod.class_fiscal',
          'prod.cod_origem_prod',
          'prod.aliq_ipi', // Mantemos na consulta para uso posterior
          'cf.cod_ncm',
          'ri.icms_st' // Adicionar informação de ST
        )
        .from('produtos as prod')
        .leftJoin('class_fiscal as cf', erpConnection.raw('CAST(prod.class_fiscal AS INTEGER)'), 'cf.codigo')
        .leftJoin('regras_icms_itens as ri', function() {
          this.on('ri.cod_regra_icms', '=', 'prod.cod_regra_icms')
            .andOn('ri.uf', '=', erpConnection.raw("'SP'")) // Filtramos para SP
        })
        .whereNotNull('prod.cod_regra_icms')
        .andWhere('prod.cod_status', 1); // Apenas produtos ativos
        
      console.log(`[INFO] Encontradas ${erpProdutoRegras.length} regras fiscais de produtos no ERP`);
      
      if (erpProdutoRegras.length === 0) {
        return 0;
      }
      
      // Verificar se existe a tabela class_fiscal_dados
      let ivaField = 0;
      let aliqInternaField = 18;
      
      try {
        // Verificar se a tabela e as colunas existem
        const hasTable = await erpConnection.schema.hasTable('class_fiscal_dados');
        if (hasTable) {
          // Buscar dados para SP se disponíveis
          const cfDados = await erpConnection('class_fiscal_dados')
            .select('cod_class_fiscal', 'iva', 'aliq_interna')
            .where('uf', 'SP')
                .first();
                
          if (cfDados) {
            ivaField = cfDados.iva;
            aliqInternaField = cfDados.aliq_interna;
          }
        }
      } catch (error) {
        console.log('[INFO] Tabela class_fiscal_dados não encontrada ou erro ao acessar:', error.message);
      }
      
      // Criamos um mapa para armazenar as alíquotas de IPI por produto
      const erpProdutosIpiMap = new Map();
      
      // Criamos um mapa para armazenar informações de ST por produto
      const erpProdutosSTMap = new Map();
      
      // Armazena as alíquotas IPI e informações de ST para uso posterior na atualização dos produtos
      for (const produto of erpProdutoRegras) {
        erpProdutosIpiMap.set(produto.cod_produto, parseFloat(produto.aliq_ipi) || 0);
        
        // Para ST, usamos 1 para 'S' e 0 para 'N' ou null (numérico)
        erpProdutosSTMap.set(produto.cod_produto, produto.icms_st === 'S' ? 1 : 0);
      }
      
      // Mapear regras fiscais para inserir/atualizar
      const regrasFiscaisProdutos = erpProdutoRegras.map(p => ({
        cod_produto: p.cod_produto,
        cod_regra_icms: p.cod_regra_icms || 1,
        class_fiscal: p.class_fiscal || p.cod_ncm || '',
        cest: '', // Campo fixo já que não existe na tabela
        iva: ivaField,
        aliq_interna: aliqInternaField,
        pauta_icms_st: 0,
        cod_origem_prod: p.cod_origem_prod || '0',
        ativo: true,
        cod_empresa: 1,
        dt_inc: knex.fn.now()
      }));
      
      // Inserir/atualizar regras fiscais dos produtos
      let count = 0;
      for (const regra of regrasFiscaisProdutos) {
        try {
          // Verificar se já existe uma regra para este produto
          const regraExistente = await knex('regras_fiscais_produtos')
            .where({
              cod_produto: regra.cod_produto,
              ativo: true
            })
            .first();
            
          if (regraExistente) {
            // Inativar regra anterior
            await knex('regras_fiscais_produtos')
              .where('id', regraExistente.id)
              .update({
                ativo: false,
                dt_alt: knex.fn.now()
              });
          }
          
          // Inserir nova regra
          await knex('regras_fiscais_produtos').insert(regra);
          count++;
          
          // Atualizar diretamente a tabela produtos com o valor do IPI e ST do ERP
          try {
            const ipiValue = erpProdutosIpiMap.get(regra.cod_produto);
            const stValue = erpProdutosSTMap.get(regra.cod_produto);
            
            const updateData = {
              // Garantir que o produto use a mesma regra fiscal do ERP em vez de valor padrão
              cod_regra_icms: regra.cod_regra_icms,
              aliq_ipi: ipiValue
            };
            
            // Adicionar ST apenas se tivermos o valor
            if (stValue !== undefined) {
              updateData.subs_trib = stValue;
            }
            
            await knex('produtos')
              .where('codigo', regra.cod_produto)
              .update(updateData);
          } catch (error) {
            console.error(`[ERRO] Falha ao atualizar dados fiscais do produto ${regra.cod_produto}:`, error.message);
          }
          
          // Log a cada 100 registros para não sobrecarregar o console
          if (count % 100 === 0) {
            console.log(`[INFO] Processados ${count}/${regrasFiscaisProdutos.length} regras fiscais de produtos`);
          }
        } catch (error) {
          console.error(`[ERRO] Falha ao inserir regra fiscal para produto ${regra.cod_produto}:`, error.message);
        }
      }
      
      console.log(`[INFO] Sincronização de regras fiscais de produtos concluída: ${count} regras`);
      return count;
    } catch (error) {
      console.error('[ERRO] Falha ao sincronizar regras fiscais de produtos:', error);
      return 0;
    }
  }
  
  // Atualizar produtos com dados fiscais
  async updateProductsFiscalData() {
    try {
      console.log('[INFO] Iniciando atualização de dados fiscais dos produtos...');
      
      // 1. Primeiro, vamos buscar TODOS os produtos do ERP com suas alíquotas de IPI
      console.log('[INFO] Buscando alíquotas de IPI de todos os produtos no ERP...');
      const erpipiValues = await erpConnection('produtos')
        .select('codigo', 'aliq_ipi');
        
      // Criar mapa para facilitar o acesso aos valores de IPI
      const ipiMap = new Map();
      erpipiValues.forEach(p => {
        ipiMap.set(p.codigo, parseFloat(p.aliq_ipi) || 0);
      });
      
      console.log(`[INFO] Obtidos ${erpipiValues.length} valores de IPI do ERP`);
      
      // 2. Buscar todos os produtos no sistema local para atualizar IPI
      console.log('[INFO] Atualizando IPI para todos os produtos do sistema...');
      const todosProdutos = await knex('produtos').select('codigo');
      let countIpiUpdated = 0;
      
      // Atualizar IPI em lotes
      const batchSize = 50;
      for (let i = 0; i < todosProdutos.length; i += batchSize) {
        const lote = todosProdutos.slice(i, i + batchSize);
        
        for (const produto of lote) {
          try {
            const ipiValue = ipiMap.get(produto.codigo);
            
            if (ipiValue !== undefined) {
              await knex('produtos')
                .where('codigo', produto.codigo)
                .update({
                  aliq_ipi: ipiValue
                });
              countIpiUpdated++;
            }
          } catch (error) {
            console.error(`[ERRO] Falha ao atualizar IPI do produto ${produto.codigo}:`, error.message);
          }
        }
        
        if (i % 200 === 0 || i + batchSize >= todosProdutos.length) {
          console.log(`[INFO] Atualizados valores de IPI para ${countIpiUpdated} produtos`);
        }
      }
      
      // 2.1 Buscar informações de substituição tributária (ST)
      console.log('[INFO] Buscando informações de substituição tributária (ST) das regras fiscais...');
      
      // Buscar todas as regras com informação de ST
      const regrasItensComST = await erpConnection
        .select('cod_regra_icms', 'uf', 'icms_st')
        .from('regras_icms_itens')
        .whereIn('uf', ['SP', 'GERAL']) // Filtramos apenas para SP e GERAL para simplificar
        .orderBy('cod_regra_icms')
        .orderBy('uf');
        
      // Criar um mapa de regras para verificação rápida
      const stPorRegra = {};
      
      // Priorizar UF específica (SP) sobre regra geral
      for (const regra of regrasItensComST) {
        // Se já existe uma entrada para esta regra e a UF atual é SP, sobrescrever
        if (!stPorRegra[regra.cod_regra_icms] || regra.uf === 'SP') {
          stPorRegra[regra.cod_regra_icms] = regra.icms_st === 'S' ? 1 : 0;
        }
      }
      
      console.log(`[INFO] Obtidas informações de ST para ${Object.keys(stPorRegra).length} regras fiscais`);
      
      // 2.2 Atualizar substituição tributária em todos os produtos
      console.log('[INFO] Atualizando informações de substituição tributária (ST) nos produtos...');
      let countStUpdated = 0;
      
      for (let i = 0; i < todosProdutos.length; i += batchSize) {
        const lote = todosProdutos.slice(i, i + batchSize);
        
        // Buscar as regras fiscais associadas aos produtos
        const produtosComRegras = await knex('produtos')
          .select('codigo', 'cod_regra_icms')
          .whereIn('codigo', lote.map(p => p.codigo))
          .whereNotNull('cod_regra_icms');
          
        for (const produto of produtosComRegras) {
          try {
            const regraIcms = produto.cod_regra_icms;
            
            // Verificar se temos informação de ST para esta regra
            if (stPorRegra[regraIcms] !== undefined) {
              await knex('produtos')
                .where('codigo', produto.codigo)
                .update({
                  subs_trib: stPorRegra[regraIcms] // Valor numérico: 1 para ST ativa, 0 para inativa
                });
              countStUpdated++;
            }
          } catch (error) {
            console.error(`[ERRO] Falha ao atualizar ST do produto ${produto.codigo}:`, error.message);
          }
        }
        
        if (i % 200 === 0 || i + batchSize >= todosProdutos.length) {
          console.log(`[INFO] Atualizadas informações de ST para ${countStUpdated} produtos`);
        }
      }
      
      // 3. Agora continuamos com a atualização normal dos outros dados fiscais
      // Buscar produtos que precisam ser atualizados
      const produtos = await knex('produtos')
        .select('codigo')
        .where(function() {
          this.whereNull('class_fiscal')
            .orWhere('class_fiscal', '')
            .orWhereNull('cod_regra_icms')
            .orWhere('cod_regra_icms', 0)
            .orWhere('cod_regra_icms', '0');
        });
        
      console.log(`[INFO] Encontrados ${produtos.length} produtos para atualizar outros dados fiscais`);
      
      if (produtos.length === 0) {
        // Se não encontrou produtos sem regras, verificar se existem produtos no sistema
        const totalProdutos = await knex('produtos').count('* as count').first();
        console.log(`[INFO] Total de produtos no sistema: ${totalProdutos?.count || 0}`);
        
        // Verificar produtos sem class_fiscal válido
        console.log('[INFO] Verificando produtos sem class_fiscal válido...');
        const produtosSemClassFiscal = await knex('produtos')
          .select('codigo')
          .whereNull('class_fiscal')
          .orWhere('class_fiscal', '');
          
        console.log(`[INFO] Encontrados ${produtosSemClassFiscal.length} produtos sem class_fiscal válido`);
        
        if (produtosSemClassFiscal.length > 0) {
          for (const produto of produtosSemClassFiscal) {
            // Atualizar produtos sem class_fiscal com valor padrão
            await knex('produtos')
              .where('codigo', produto.codigo)
              .update({
                class_fiscal: '72131000' // class_fiscal padrão
              });
          }
          console.log(`[INFO] ${produtosSemClassFiscal.length} produtos atualizados com class_fiscal padrão`);
        }
        
        return countIpiUpdated + countStUpdated;
      }
      
      // Verificar se as regras fiscais estão disponíveis
      const regrasFiscaisDisponiveis = await knex('regras_icms_cadastro')
        .select('codigo')
        .limit(1);
        
      // Dados fiscais padrão para produtos
      const dadosFiscaisPadrao = {
        class_fiscal: '72131000', // NCM para ferro/aço (exemplo)
        aliq_icms: 18,            // Alíquota padrão SP
        cod_regra_icms: regrasFiscaisDisponiveis.length > 0 ? regrasFiscaisDisponiveis[0].codigo : 1,  // Primeira regra disponível ou 1
        cod_origem_prod: '0'      // Produto nacional
      };
      
      console.log('[INFO] Dados fiscais padrão:', dadosFiscaisPadrao);
      
      // Contador de produtos atualizados
      let count = 0;
      
      // Atualizar cada produto em lotes para melhor performance
      for (let i = 0; i < produtos.length; i += batchSize) {
        const lote = produtos.slice(i, i + batchSize);
        
        for (const produto of lote) {
          try {
            // Tentar buscar regras fiscais específicas do produto
            const regraFiscal = await knex('regras_fiscais_produtos')
              .where({
                cod_produto: produto.codigo,
                ativo: true
              })
              .first();
              
            // Dados para atualização (NÃO incluímos aliq_ipi e subs_trib aqui pois já foram atualizados anteriormente)
            const dadosAtualizacao = {
              class_fiscal: regraFiscal?.class_fiscal || dadosFiscaisPadrao.class_fiscal,
              aliq_icms: regraFiscal?.aliq_interna || dadosFiscaisPadrao.aliq_icms,
              cod_regra_icms: regraFiscal?.cod_regra_icms || dadosFiscaisPadrao.cod_regra_icms,
              cod_origem_prod: regraFiscal?.cod_origem_prod || dadosFiscaisPadrao.cod_origem_prod
            };
            
            // Atualizar o produto
            await knex('produtos')
              .where('codigo', produto.codigo)
              .update(dadosAtualizacao);
              
            count++;
          } catch (error) {
            console.error(`[ERRO] Falha ao atualizar dados fiscais do produto ${produto.codigo}:`, error.message);
          }
        }
        
        console.log(`[INFO] Processados ${Math.min(count, i + batchSize)}/${produtos.length} produtos`);
      }
      
      console.log(`[INFO] Atualização de dados fiscais concluída: ${count} produtos atualizados, ${countIpiUpdated} com IPI atualizado, ${countStUpdated} com ST atualizado`);
      return count + countIpiUpdated + countStUpdated;
    } catch (error) {
      console.error('[ERRO] Falha ao atualizar dados fiscais dos produtos:', error);
      return 0;
    }
  }
}

module.exports = new SyncService(); 