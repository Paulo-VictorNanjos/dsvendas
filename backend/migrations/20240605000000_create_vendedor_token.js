exports.up = function(knex) {
  return knex.schema.createTable('vendedor_token', function(table) {
    table.uuid('id').primary();
    table.string('vendedor_codigo').references('codigo').inTable('vendedores').onDelete('CASCADE');
    table.string('token', 64).notNullable().unique();
    table.boolean('ativo').defaultTo(true);
    table.timestamp('dt_expiracao');
    table.timestamp('dt_inc').defaultTo(knex.fn.now());
    table.timestamp('dt_uso').nullable();
    table.string('gerado_por').nullable();
    table.string('descricao').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('vendedor_token');
}; 