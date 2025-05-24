exports.up = function(knex) {
  return knex.schema.table('orcamentos_itens', function(table) {
    // Adiciona os campos se eles não existirem
    table.decimal('desconto', 10, 2).defaultTo(0);
    table.decimal('ipi', 10, 2).defaultTo(0);
    table.decimal('icms_st', 10, 2).defaultTo(0);
    table.decimal('valor_ipi', 10, 2).defaultTo(0);
    table.decimal('valor_icms_st', 10, 2).defaultTo(0);
  });
};

exports.down = function(knex) {
  return knex.schema.table('orcamentos_itens', function(table) {
    // Remove os campos adicionados
    table.dropColumn('desconto');
    table.dropColumn('ipi');
    table.dropColumn('icms_st');
    table.dropColumn('valor_ipi');
    table.dropColumn('valor_icms_st');
  });
}; 