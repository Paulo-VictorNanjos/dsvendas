exports.up = function(knex) {
  return knex.schema.createTable('usuario_vendedor', function(table) {
    table.uuid('usuario_id').references('id').inTable('usuarios').onDelete('CASCADE');
    table.string('vendedor_codigo').references('codigo').inTable('vendedores').onDelete('CASCADE');
    table.timestamp('dt_inc').defaultTo(knex.fn.now());
    table.primary(['usuario_id', 'vendedor_codigo']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('usuario_vendedor');
}; 