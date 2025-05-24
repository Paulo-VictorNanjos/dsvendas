/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('orcamentos', function(table) {
    // Remover as restrições de chave estrangeira existentes
    table.dropForeign(['cod_cliente']);
    table.dropForeign(['cod_vendedor']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('orcamentos', function(table) {
    // Recriar as restrições de chave estrangeira
    table.foreign('cod_cliente').references('codigo').inTable('clientes');
    table.foreign('cod_vendedor').references('codigo').inTable('vendedores');
  });
}; 