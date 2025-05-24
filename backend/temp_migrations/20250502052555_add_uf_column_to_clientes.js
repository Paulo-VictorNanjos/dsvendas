/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.hasColumn('clientes', 'uf').then(exists => {
    if (!exists) {
      return knex.schema.alterTable('clientes', function(table) {
        // Adicionar coluna uf se não existir
        table.string('uf', 2).defaultTo('SP');
      });
    }
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.hasColumn('clientes', 'uf').then(exists => {
    if (exists) {
      return knex.schema.alterTable('clientes', function(table) {
        table.dropColumn('uf');
      });
    }
  });
};
