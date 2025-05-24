/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.raw('ALTER TABLE orcamentos_itens ALTER COLUMN icms_st TYPE VARCHAR(5)');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.raw('ALTER TABLE orcamentos_itens ALTER COLUMN icms_st TYPE NUMERIC USING (CASE WHEN icms_st = \'N\' THEN 0 WHEN icms_st = \'S\' THEN 1 ELSE 0 END)');
}; 