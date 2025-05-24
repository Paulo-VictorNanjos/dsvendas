/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('orcamentos_itens', function(table) {
    // Adicionar campo para armazenar a unidade utilizada
    table.string('unidade', 10).nullable();
    // Adicionar campo para indicar se está usando unidade2
    table.boolean('is_unidade2').defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('orcamentos_itens', function(table) {
    table.dropColumn('unidade');
    table.dropColumn('is_unidade2');
  });
}; 