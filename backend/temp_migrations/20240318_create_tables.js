exports.up = function(knex) {
  return knex.schema
    .createTable('log_sincronizacao', table => {
      table.increments('id').primary();
      table.timestamp('data_sincronizacao').notNullable();
      table.string('direcao').notNullable();
      table.string('status').notNullable();
      table.text('mensagem');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('log_sincronizacao');
}; 