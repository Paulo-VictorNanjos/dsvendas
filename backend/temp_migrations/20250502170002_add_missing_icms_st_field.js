exports.up = function(knex) {
  return knex.schema.hasColumn('orcamentos_itens', 'icms_st').then(function(exists) {
    if (!exists) {
      return knex.schema.table('orcamentos_itens', function(table) {
        table.decimal('icms_st', 10, 2).defaultTo(0);
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.hasColumn('orcamentos_itens', 'icms_st').then(function(exists) {
    if (exists) {
      return knex.schema.table('orcamentos_itens', function(table) {
        table.dropColumn('icms_st');
      });
    }
  });
}; 