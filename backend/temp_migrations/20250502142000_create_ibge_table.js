/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('ibge', table => {
    table.string('codigo', 7).primary().comment('Código IBGE do município');
    table.string('nome', 100).notNullable().comment('Nome do município');
    table.string('uf', 2).notNullable().comment('UF do município');
    table.string('regiao', 20).nullable().comment('Região do município');
    table.boolean('capital').defaultTo(false).comment('Indica se é capital');
    table.decimal('latitude', 10, 6).nullable().comment('Latitude');
    table.decimal('longitude', 10, 6).nullable().comment('Longitude');
    table.integer('altitude').nullable().comment('Altitude');
    table.string('ddd', 2).nullable().comment('DDD');
    table.string('codigo_siafi', 4).nullable().comment('Código SIAFI');
    table.boolean('ativo').defaultTo(true).comment('Indica se o registro está ativo');
    table.timestamp('dt_inc').defaultTo(knex.fn.now()).comment('Data de inclusão');
    table.timestamp('dt_alt').nullable().comment('Data de alteração');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('ibge');
};
