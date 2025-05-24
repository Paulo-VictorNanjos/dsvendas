/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.hasTable('estados').then(exists => {
    if (!exists) {
      return knex.schema.createTable('estados', table => {
        table.string('uf', 2).primary().notNullable().comment('Sigla da unidade federativa');
        table.string('nome', 50).notNullable().comment('Nome do estado');
        table.integer('codigo_ibge').nullable().comment('Código IBGE do estado');
        table.boolean('ativo').defaultTo(true).comment('Indica se o estado está ativo');
        table.timestamp('dt_inc').defaultTo(knex.fn.now()).comment('Data de inclusão');
        table.timestamp('dt_alt').nullable().comment('Data de alteração');
      });
    }
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('estados');
};
