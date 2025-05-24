exports.up = function(knex) {
  return knex.schema.hasColumn('orcamentos', 'vl_ipi').then(function(exists) {
    if (!exists) {
      return knex.schema.table('orcamentos', function(table) {
        table.decimal('vl_ipi', 10, 2).defaultTo(0);
        table.decimal('vl_st', 10, 2).defaultTo(0);
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.table('orcamentos', function(table) {
    table.dropColumn('vl_ipi');
    table.dropColumn('vl_st');
  });
}; 