exports.up = function(knex) {
  return knex.schema.hasColumn('orcamentos_itens', 'desconto').then(function(exists) {
    if (!exists) {
      return knex.schema.table('orcamentos_itens', function(table) {
        table.decimal('desconto', 10, 2).defaultTo(0);
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.hasColumn('orcamentos_itens', 'desconto').then(function(exists) {
    if (exists) {
      return knex.schema.table('orcamentos_itens', function(table) {
        table.dropColumn('desconto');
      });
    }
  });
}; 