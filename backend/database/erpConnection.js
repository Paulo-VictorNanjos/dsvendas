const knex = require('knex');
const dotenv = require('dotenv');

// Carrega variáveis de ambiente
dotenv.config();

console.log('Database Config:', {
  host: process.env.ERP_DB_HOST || 'localhost',
  user: process.env.ERP_DB_USER || 'postgres',
  database: process.env.ERP_DB_NAME || 'permak_test',
  port: process.env.ERP_DB_PORT || '5434'
});

// Configuração de pool de conexões otimizada para evitar timeouts
const erpConnection = knex({
  client: 'pg',
  connection: {
    host: process.env.ERP_DB_HOST || 'localhost',
    user: process.env.ERP_DB_USER || 'postgres',
    password: process.env.ERP_DB_PASSWORD || 'ds_due339',
    database: process.env.ERP_DB_NAME || 'permak_test',
    port: process.env.ERP_DB_PORT || 5434,
    // Aumentar o timeout para 60 segundos
    connectionTimeout: 60000,
    acquireConnectionTimeout: 60000
  },
  pool: {
    // Reduzir o número de conexões para evitar sobrecarga
    min: 0,
    max: 5,
    // Reduzir o tempo que uma conexão fica inativa antes de ser liberada
    idleTimeoutMillis: 10000,
    // Aumentar o tempo máximo de uso de uma conexão
    acquireTimeoutMillis: 60000,
    // Verificar conexões antes de usá-las
    afterCreate: (conn, done) => {
      conn.query('SELECT 1', (err) => {
        done(err, conn);
      });
    }
  },
  // Aumentar o timeout geral
  acquireConnectionTimeout: 60000
});

// Exporta a conexão
module.exports = erpConnection;

// Configuração de tabelas do ERP é feita sob demanda para evitar overhead
// na inicialização da conexão
async function setupErpTables() {
  try {
    // Verifica e cria a tabela empresas
    if (!(await erpConnection.schema.hasTable('empresas'))) {
      await erpConnection.schema.createTable('empresas', function(table) {
        table.string('codigo').primary();
        table.string('razao');
        table.string('fantasia');
        table.string('cgc');
        table.string('ativo');
      });

      // Insere dados de exemplo
      await erpConnection('empresas').insert([
        { codigo: '001', razao: 'Empresa 1 LTDA', fantasia: 'Empresa 1', cgc: '00000000000101', ativo: 'S' },
        { codigo: '002', razao: 'Empresa 2 LTDA', fantasia: 'Empresa 2', cgc: '00000000000102', ativo: 'S' }
      ]);
    }

    // Verifica e cria a tabela produtos
    if (!(await erpConnection.schema.hasTable('produtos'))) {
      await erpConnection.schema.createTable('produtos', function(table) {
        table.string('codigo').primary();
        table.string('descricao');
        table.decimal('preco_venda', 10, 2);
        table.decimal('estoque', 10, 2);
        table.string('ativo');
        // Campos fiscais
        table.string('class_fiscal');
        table.decimal('aliq_ipi', 10, 2).defaultTo(0);
        table.integer('cod_regra_icms').defaultTo(0);
        table.string('cod_origem_prod').defaultTo('0');
      });

      // Insere dados de exemplo
      await erpConnection('produtos').insert([
        { 
          codigo: '001', 
          descricao: 'Produto 1', 
          preco_venda: 100.00, 
          estoque: 10, 
          ativo: 'S',
          class_fiscal: '84713019',
          aliq_ipi: 5,
          cod_regra_icms: 1,
          cod_origem_prod: '0'
        },
        { 
          codigo: '002', 
          descricao: 'Produto 2', 
          preco_venda: 200.00, 
          estoque: 20, 
          ativo: 'S',
          class_fiscal: '85044090',
          aliq_ipi: 10,
          cod_regra_icms: 2,
          cod_origem_prod: '0'
        }
      ]);
    }

    // Verifica e cria a tabela vendedores
    if (!(await erpConnection.schema.hasTable('vendedores'))) {
      await erpConnection.schema.createTable('vendedores', function(table) {
        table.string('codigo').primary();
        table.string('nome');
        table.string('email');
        table.string('telefone');
        table.string('ativo');
      });

      // Insere dados de exemplo
      await erpConnection('vendedores').insert([
        { codigo: '001', nome: 'Vendedor 1', email: 'vendedor1@email.com', telefone: '1111111111', ativo: 'S' },
        { codigo: '002', nome: 'Vendedor 2', email: 'vendedor2@email.com', telefone: '2222222222', ativo: 'S' }
      ]);
    }

    // Verifica e cria a tabela orcamentos
    if (!(await erpConnection.schema.hasTable('orcamentos'))) {
      await erpConnection.schema.createTable('orcamentos', function(table) {
        table.string('codigo').primary();
        table.string('empresa_codigo').references('codigo').inTable('empresas');
        table.string('vendedor_codigo').references('codigo').inTable('vendedores');
        table.date('data');
        table.decimal('valor_total', 10, 2);
        table.string('status');
      });

      // Insere dados de exemplo
      await erpConnection('orcamentos').insert([
        { 
          codigo: '001', 
          empresa_codigo: '001', 
          vendedor_codigo: '001',
          data: new Date(),
          valor_total: 1000.00,
          status: 'PENDENTE'
        }
      ]);
    }

    // Verifica e cria a tabela orcamentos_itens
    if (!(await erpConnection.schema.hasTable('orcamentos_itens'))) {
      await erpConnection.schema.createTable('orcamentos_itens', function(table) {
        table.string('codigo').primary();
        table.string('orcamento_codigo').references('codigo').inTable('orcamentos');
        table.string('produto_codigo').references('codigo').inTable('produtos');
        table.decimal('quantidade', 10, 2);
        table.decimal('valor_unitario', 10, 2);
        table.decimal('valor_total', 10, 2);
      });

      // Insere dados de exemplo
      await erpConnection('orcamentos_itens').insert([
        { 
          codigo: '001',
          orcamento_codigo: '001',
          produto_codigo: '001',
          quantidade: 2,
          valor_unitario: 100.00,
          valor_total: 200.00
        }
      ]);
    }

    // TABELAS FISCAIS
    
    // Verifica e cria a tabela regras_icms_cadastro
    if (!(await erpConnection.schema.hasTable('regras_icms_cadastro'))) {
      await erpConnection.schema.createTable('regras_icms_cadastro', function(table) {
        table.integer('codigo').primary();
        table.string('descricao');
        table.string('acrescimo_icms').defaultTo('N');
        table.timestamp('dt_alt').defaultTo(erpConnection.fn.now());
        table.timestamp('dt_exc', { useTz: false }).nullable();
      });

      // Insere dados de exemplo
      await erpConnection('regras_icms_cadastro').insert([
        { codigo: 1, descricao: 'Padrão', acrescimo_icms: 'N' },
        { codigo: 2, descricao: 'Substituição Tributária', acrescimo_icms: 'N' }
      ]);
    }

    // Verifica e cria a tabela regras_icms_itens
    if (!(await erpConnection.schema.hasTable('regras_icms_itens'))) {
      await erpConnection.schema.createTable('regras_icms_itens', function(table) {
        table.increments('id').primary();
        table.integer('cod_regra_icms').references('codigo').inTable('regras_icms_cadastro');
        table.string('uf');
        table.string('st_icms').defaultTo('00');
        table.decimal('aliq_icms', 10, 2).defaultTo(0);
        table.decimal('red_icms', 10, 2).defaultTo(0);
        table.integer('cod_convenio').defaultTo(0);
        table.string('st_icms_contr').defaultTo('00');
        table.decimal('aliq_icms_contr', 10, 2).defaultTo(0);
        table.decimal('red_icms_contr', 10, 2).defaultTo(0);
        table.integer('cod_convenio_contr').defaultTo(0);
        table.string('icms_st').defaultTo('N');
        table.integer('cod_aliquota').defaultTo(0);
        table.decimal('aliq_interna', 10, 2).defaultTo(0);
        table.string('aliq_ecf').defaultTo('');
        table.decimal('aliq_dif_icms_contr', 10, 2).defaultTo(0);
        table.decimal('aliq_dif_icms_cons', 10, 2).defaultTo(0);
        table.string('reducao_somente_icms_proprio').defaultTo('N');
        table.string('cod_cbnef').defaultTo('');
        table.string('st_icms_contr_reg_sn').defaultTo('00');
        table.decimal('aliq_icms_contr_reg_sn', 10, 2).defaultTo(0);
        table.decimal('red_icms_contr_reg_sn', 10, 2).defaultTo(0);
        table.decimal('aliq_dif_icms_contr_reg_sn', 10, 2).defaultTo(0);
        table.integer('cod_convenio_contr_reg_sn').defaultTo(0);
        table.string('icms_st_reg_sn').defaultTo('N');
      });

      // Insere dados de exemplo para SP
      await erpConnection('regras_icms_itens').insert([
        { 
          cod_regra_icms: 1, 
          uf: 'SP', 
          st_icms: '00', 
          aliq_icms: 18, 
          red_icms: 0,
          st_icms_contr: '00',
          aliq_icms_contr: 18,
          red_icms_contr: 0,
          icms_st: 'N'
        },
        { 
          cod_regra_icms: 2, 
          uf: 'SP', 
          st_icms: '60', 
          aliq_icms: 18, 
          red_icms: 0,
          st_icms_contr: '10',
          aliq_icms_contr: 18,
          red_icms_contr: 0,
          icms_st: 'S',
          aliq_interna: 18
        }
      ]);

      // Insere dados de exemplo para RJ
      await erpConnection('regras_icms_itens').insert([
        { 
          cod_regra_icms: 1, 
          uf: 'RJ', 
          st_icms: '00', 
          aliq_icms: 20, 
          red_icms: 0,
          st_icms_contr: '00',
          aliq_icms_contr: 20,
          red_icms_contr: 0,
          icms_st: 'N'
        },
        { 
          cod_regra_icms: 2, 
          uf: 'RJ', 
          st_icms: '60', 
          aliq_icms: 20, 
          red_icms: 0,
          st_icms_contr: '10',
          aliq_icms_contr: 20,
          red_icms_contr: 0,
          icms_st: 'S',
          aliq_interna: 20
        }
      ]);
    }

    // Verifica e cria a tabela class_fiscal (NCM)
    if (!(await erpConnection.schema.hasTable('class_fiscal'))) {
      await erpConnection.schema.createTable('class_fiscal', function(table) {
        table.integer('codigo').primary();
        table.string('cod_ncm');
        table.string('descricao');
        table.timestamp('dt_alt').defaultTo(erpConnection.fn.now());
        table.timestamp('dt_exc', { useTz: false }).nullable();
      });

      // Insere dados de exemplo
      await erpConnection('class_fiscal').insert([
        { codigo: 1, cod_ncm: '84713019', descricao: 'MICROCOMPUTADORES' },
        { codigo: 2, cod_ncm: '85044090', descricao: 'FONTES DE ALIMENTAÇÃO' }
      ]);
    }

    // Verifica e cria a tabela class_fiscal_tributacoes
    if (!(await erpConnection.schema.hasTable('class_fiscal_tributacoes'))) {
      await erpConnection.schema.createTable('class_fiscal_tributacoes', function(table) {
        table.increments('id').primary();
        table.integer('cod_class_fiscal').references('codigo').inTable('class_fiscal');
        table.string('uf');
        table.decimal('iva', 10, 2).defaultTo(0);
        table.decimal('aliq_interna', 10, 2).defaultTo(0);
        table.decimal('iva_diferenciado', 10, 2).defaultTo(0);
        table.string('cest').defaultTo('');
        table.decimal('iva_importado', 10, 2).defaultTo(0);
        table.decimal('aliq_importado', 10, 2).defaultTo(0);
      });

      // Insere dados de exemplo
      await erpConnection('class_fiscal_tributacoes').insert([
        { 
          cod_class_fiscal: 1, 
          uf: 'SP', 
          iva: 40.9, 
          aliq_interna: 18,
          cest: '2103100'
        },
        { 
          cod_class_fiscal: 1, 
          uf: 'RJ', 
          iva: 42.5, 
          aliq_interna: 20,
          cest: '2103100'
        },
        { 
          cod_class_fiscal: 2, 
          uf: 'SP', 
          iva: 38.5, 
          aliq_interna: 18,
          cest: '2102200'
        },
        { 
          cod_class_fiscal: 2, 
          uf: 'RJ', 
          iva: 41.8, 
          aliq_interna: 20,
          cest: '2102200'
        }
      ]);
    }

    // Verifica e cria a tabela class_fiscal_fcp para FCP-ST
    if (!(await erpConnection.schema.hasTable('class_fiscal_fcp'))) {
      await erpConnection.schema.createTable('class_fiscal_fcp', function(table) {
        table.increments('id').primary();
        table.integer('cod_class_fiscal').references('codigo').inTable('class_fiscal');
        table.string('uf');
        table.decimal('aliq_fcp', 10, 2).defaultTo(0);
        table.decimal('aliq_fcpst', 10, 2).defaultTo(0);
        table.decimal('aliq_pst', 10, 2).defaultTo(0);
      });

      // Insere dados de exemplo para Fundo de Combate à Pobreza
      await erpConnection('class_fiscal_fcp').insert([
        { cod_class_fiscal: 1, uf: 'MG', aliq_fcp: 0, aliq_fcpst: 2, aliq_pst: 0 },
        { cod_class_fiscal: 2, uf: 'MG', aliq_fcp: 0, aliq_fcpst: 2, aliq_pst: 0 }
      ]);
    }

    console.log('Todas as tabelas do ERP foram configuradas com sucesso');
    console.log('Configuração do ERP concluída');
    return true;
  } catch (error) {
    console.error('Erro ao configurar tabelas do ERP:', error);
    return false;
  }
}

// Anexa a função setupErpTables ao objeto de conexão
erpConnection.setupErpTables = setupErpTables;

// Executa a configuração das tabelas
erpConnection.setupErpTables().catch(err => {
  console.error('Erro na configuração inicial do ERP:', err);
}); 