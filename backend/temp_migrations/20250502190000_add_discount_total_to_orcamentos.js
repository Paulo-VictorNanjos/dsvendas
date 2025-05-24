exports.up = function(knex) {
  return knex.schema.hasColumn('orcamentos', 'vl_desconto').then(function(exists) {
    if (!exists) {
      return knex.schema.table('orcamentos', function(table) {
        table.decimal('vl_desconto', 10, 2).defaultTo(0);
        table.decimal('vl_com_desconto', 10, 2).defaultTo(0);
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.table('orcamentos', function(table) {
    table.dropColumn('vl_desconto');
    table.dropColumn('vl_com_desconto');
  });
}; 