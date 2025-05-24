exports.up = function(knex) {
  return knex.schema.createTable('sync_log', function(table) {
    table.increments('id').primary();
    table.timestamp('data_sync').defaultTo(knex.fn.now());
    table.string('tipo').notNullable();
    table.string('status').notNullable();
    table.text('mensagem');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('sync_log');
}; 