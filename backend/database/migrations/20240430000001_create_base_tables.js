exports.up = function(knex) {
  return knex.schema
    // Tabela de empresas
    .createTable('empresas', function(table) {
      table.string('codigo').primary();
      table.string('razao').notNullable();
      table.string('nome');
      table.string('cnpj');
      table.timestamps(true, true);
    })
    // Tabela de produtos
    .createTable('produtos', function(table) {
      table.string('codigo').primary();
      table.string('descricao').notNullable();
      table.decimal('preco_venda', 10, 2);
      table.decimal('estoque', 10, 2);
      table.integer('cod_status').defaultTo(1);
      table.string('cod_empresa');
      table.timestamps(true, true);
    })
    // Tabela de clientes
    .createTable('clientes', function(table) {
      table.string('codigo').primary();
      table.string('razao').notNullable();
      table.string('nome');
      table.string('fantasia');
      table.string('cnpj');
      table.integer('cod_status').defaultTo(1);
      table.string('cod_empresa');
      table.timestamps(true, true);
    })
    // Tabela de vendedores
    .createTable('vendedores', function(table) {
      table.string('codigo').primary();
      table.string('nome').notNullable();
      table.string('email');
      table.string('telefone');
      table.integer('cod_status').defaultTo(1);
      table.string('cod_empresa');
      table.timestamps(true, true);
    })
    // Tabela de orçamentos
    .createTable('orcamentos', function(table) {
      table.string('codigo').primary();
      table.string('cod_empresa');
      table.string('cod_cliente');
      table.string('cod_vendedor');
      table.date('dt_orcamento');
      table.decimal('vl_total', 10, 2);
      table.integer('cod_status').defaultTo(1);
      table.text('observacoes');
      table.date('dt_inc');
      table.decimal('vl_produtos', 10, 2);
      table.decimal('vl_servicos', 10, 2);
      table.decimal('vl_frete', 10, 2);
      table.decimal('vl_desconto', 10, 2);
      table.string('cod_cond_pagto');
      table.string('cod_forma_pagto');
      table.timestamps(true, true);

      table.foreign('cod_cliente').references('codigo').inTable('clientes');
      table.foreign('cod_vendedor').references('codigo').inTable('vendedores');
    })
    // Tabela de itens de orçamento
    .createTable('orcamentos_itens', function(table) {
      table.string('codigo').primary();
      table.string('orcamento_codigo');
      table.string('produto_codigo');
      table.decimal('quantidade', 10, 3);
      table.decimal('valor_unitario', 10, 4);
      table.decimal('valor_total', 10, 2);
      table.string('cod_empresa');
      table.timestamps(true, true);

      table.foreign('orcamento_codigo').references('codigo').inTable('orcamentos');
      table.foreign('produto_codigo').references('codigo').inTable('produtos');
    })
    // Tabela de log de sincronização
    .createTable('sync_log', function(table) {
      table.increments('id').primary();
      table.string('tipo').notNullable();
      table.string('status').notNullable();
      table.text('mensagem');
      table.timestamp('data_sync').defaultTo(knex.fn.now());
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('sync_log')
    .dropTableIfExists('orcamentos_itens')
    .dropTableIfExists('orcamentos')
    .dropTableIfExists('vendedores')
    .dropTableIfExists('produtos')
    .dropTableIfExists('clientes')
    .dropTableIfExists('empresas');
};