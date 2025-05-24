exports.up = function(knex) {
  return knex.schema.hasColumn('orcamentos_itens', 'ipi').then(function(exists) {
    if (!exists) {
      return knex.schema.table('orcamentos_itens', function(table) {
        table.decimal('ipi', 10, 2).defaultTo(0);
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.hasColumn('orcamentos_itens', 'ipi').then(function(exists) {
    if (exists) {
      return knex.schema.table('orcamentos_itens', function(table) {
        table.dropColumn('ipi');
      });
    }
  });
}; 