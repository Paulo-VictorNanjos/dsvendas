exports.up = function(knex) {
  return knex.schema.table('orcamentos', function(table) {
    // Adicionar campo vl_impostos se não existir
    table.decimal('vl_impostos', 15, 2).defaultTo(0).comment('Valor dos impostos');
  });
};

exports.down = function(knex) {
  return knex.schema.table('orcamentos', function(table) {
    // Remover campo vl_impostos
    table.dropColumn('vl_impostos');
  });
}; 