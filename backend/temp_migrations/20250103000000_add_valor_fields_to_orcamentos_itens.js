/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('orcamentos_itens', function(table) {
    // Adicionar campos de valores calculados do frontend
    table.decimal('valor_bruto', 15, 4).defaultTo(0).comment('Valor bruto (quantidade * valor_unitario)');
    table.decimal('valor_desconto', 15, 4).defaultTo(0).comment('Valor do desconto aplicado');
    table.decimal('valor_liquido', 15, 4).defaultTo(0).comment('Valor líquido (valor_bruto - valor_desconto)');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('orcamentos_itens', function(table) {
    table.dropColumn('valor_bruto');
    table.dropColumn('valor_desconto');
    table.dropColumn('valor_liquido');
  });
}; 