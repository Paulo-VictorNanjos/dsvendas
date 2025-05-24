exports.up = function(knex) {
  return knex.schema
    // Tabela de produtos
    .createTable('produtos', function(table) {
      table.increments('id').primary();
      table.string('codigo').unique().notNullable();
      table.string('descricao').notNullable();
      table.decimal('preco_venda', 10, 2);
      table.decimal('estoque', 10, 2);
      table.timestamps(true, true);
    })
    // Tabela de clientes
    .createTable('clientes', function(table) {
      table.increments('id').primary();
      table.string('codigo').unique().notNullable();
      table.string('razao').notNullable();
      table.string('fantasia');
      table.string('cnpj');
      table.integer('cod_status').defaultTo(1);
      table.timestamps(true, true);
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
    .dropTable('sync_log')
    .dropTable('clientes')
    .dropTable('produtos');
}; 