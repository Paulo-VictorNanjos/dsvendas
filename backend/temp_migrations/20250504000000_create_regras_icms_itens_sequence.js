/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.raw(`CREATE SEQUENCE IF NOT EXISTS regras_icms_itens_id_seq`);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.raw(`DROP SEQUENCE IF EXISTS regras_icms_itens_id_seq`);
}; 