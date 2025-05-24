exports.up = function(knex) {
  return knex.schema
    .dropTableIfExists('regras_icms_cadastro')
    .dropTableIfExists('class_fiscal')
    .dropTableIfExists('class_fiscal_dados')
    .dropTableIfExists('regras_icms');
};

exports.down = function(knex) {
  return Promise.resolve();
}; 