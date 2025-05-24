exports.up = function(knex) {
    return knex.schema
        // Drop all tables in correct order (if they exist)
        .raw('DROP TABLE IF EXISTS orcamentos_itens CASCADE')
        .raw('DROP TABLE IF EXISTS orcamentos CASCADE')
        .raw('DROP TABLE IF EXISTS produtos CASCADE')
        .raw('DROP TABLE IF EXISTS vendedores CASCADE')
        .raw('DROP TABLE IF EXISTS clientes CASCADE')
        .raw('DROP TABLE IF EXISTS empresas CASCADE')
        // Create empresas table
        .createTable('empresas', function(table) {
            table.increments('id').primary();
            table.integer('codigo').notNullable().unique();
            table.string('razao').notNullable();
            table.string('nome').notNullable();
            table.string('cnpj');
            table.timestamps(true, true);
        })
        // Create clientes table
        .createTable('clientes', function(table) {
            table.increments('id').primary();
            table.string('codigo').notNullable().unique();
            table.string('razao').notNullable();
            table.string('nome').notNullable();
            table.string('fantasia');
            table.string('cnpj');
            table.string('email');
            table.string('telefone');
            table.string('logradouro', 90);
            table.string('logradouro_num', 10);
            table.string('complemento', 30);
            table.string('bairro', 60);
            table.string('municipio', 60);
            table.string('uf', 2);
            table.integer('cod_status').defaultTo(1);
            table.integer('cod_empresa').notNullable();
            table.timestamps(true, true);
        })
        // Create vendedores table
        .createTable('vendedores', function(table) {
            table.increments('id').primary();
            table.string('codigo').notNullable().unique();
            table.string('nome').notNullable();
            table.string('email');
            table.string('telefone');
            table.decimal('comissao', 14, 2);
            table.integer('cod_status').defaultTo(1);
            table.integer('cod_empresa').notNullable();
            table.timestamps(true, true);
        })
        // Create produtos table
        .createTable('produtos', function(table) {
            table.increments('id').primary();
            table.string('codigo').notNullable().unique();
            table.string('descricao').notNullable();
            table.decimal('preco_venda', 14, 2);
            table.decimal('estoque', 14, 2);
            table.integer('cod_status').defaultTo(1);
            table.integer('cod_empresa').notNullable();
            table.timestamps(true, true);
        })
        // Create orcamentos table
        .createTable('orcamentos', function(table) {
            table.increments('id').primary();
            table.string('codigo').notNullable().unique();
            table.date('dt_orcamento').notNullable();
            table.date('dt_inc');
            table.date('dt_alt');
            table.integer('cod_usr_inc');
            table.integer('cod_usr_alt');
            table.integer('cod_empresa').notNullable();
            table.integer('cod_status').defaultTo(1);
            table.integer('cod_vendedor').references('id').inTable('vendedores');
            table.integer('cod_cliente').references('id').inTable('clientes');
            table.decimal('vl_produtos', 14, 2);
            table.decimal('vl_servicos', 14, 2);
            table.decimal('vl_frete', 14, 2);
            table.decimal('vl_desconto', 14, 2);
            table.decimal('vl_total', 14, 2);
            table.text('observacoes');
            table.string('cliente_nome');
            table.string('cliente_email');
            table.string('cliente_telefone');
            table.string('logradouro', 90);
            table.string('logradouro_num', 10);
            table.string('complemento', 30);
            table.string('bairro', 60);
            table.string('municipio', 60);
            table.string('uf', 2);
            table.string('ponto_referencia', 100);
            table.timestamps(true, true);
        })
        // Create orcamentos_itens table
        .createTable('orcamentos_itens', function(table) {
            table.increments('id').primary();
            table.string('codigo').notNullable().unique();
            table.string('orcamento_codigo').references('codigo').inTable('orcamentos');
            table.string('produto_codigo').references('codigo').inTable('produtos');
            table.decimal('quantidade', 14, 2);
            table.decimal('valor_unitario', 14, 2);
            table.decimal('valor_total', 14, 2);
            table.integer('cod_status').defaultTo(1);
            table.integer('cod_empresa').notNullable();
            table.timestamps(true, true);
        })
        // Create log_sincronizacao table
        .createTable('log_sincronizacao', function(table) {
            table.increments('id').primary();
            table.timestamp('data_sincronizacao').defaultTo(knex.fn.now());
            table.string('direcao').notNullable();
            table.string('status').notNullable();
            table.timestamps(true, true);
        })
        // Insert initial data
        .then(async function() {
            // Insert default company
            await knex('empresas').insert({
                codigo: 1,
                razao: 'Empresa Padrão',
                nome: 'Empresa Padrão',
                cnpj: '00000000000000'
            });

            // Insert default seller
            await knex('vendedores').insert({
                codigo: '1',
                nome: 'Vendedor Padrão',
                comissao: 0,
                cod_status: 1,
                cod_empresa: 1
            });

            // Insert default client
            await knex('clientes').insert({
                codigo: '1',
                razao: 'Cliente Padrão',
                nome: 'Cliente Padrão',
                fantasia: 'Cliente Padrão',
                cod_status: 1,
                cod_empresa: 1
            });

            // Insert example product
            await knex('produtos').insert({
                codigo: '001',
                descricao: 'Produto de Exemplo',
                preco_venda: 100.00,
                estoque: 10.00,
                cod_status: 1,
                cod_empresa: 1
            });
        });
};

exports.down = function(knex) {
    return knex.schema
        .raw('DROP TABLE IF EXISTS orcamentos_itens CASCADE')
        .raw('DROP TABLE IF EXISTS orcamentos CASCADE')
        .raw('DROP TABLE IF EXISTS produtos CASCADE')
        .raw('DROP TABLE IF EXISTS vendedores CASCADE')
        .raw('DROP TABLE IF EXISTS clientes CASCADE')
        .raw('DROP TABLE IF EXISTS empresas CASCADE')
        .raw('DROP TABLE IF EXISTS log_sincronizacao CASCADE');
}; 