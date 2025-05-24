exports.up = function(knex) {
  return knex.schema.table('orcamentos', function(table) {
    table.string('status').defaultTo('PENDENTE');
    table.timestamp('data_aprovacao').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('orcamentos', function(table) {
    table.dropColumn('data_aprovacao');
    table.dropColumn('status');
  });
}; 