exports.up = function(knex) {
  return knex.schema.table('orcamentos', function(table) {
    table.string('cod_forma_pagto').references('codigo').inTable('formas_pagto');
    table.string('cod_cond_pagto').references('codigo').inTable('cond_pagto');
  });
};

exports.down = function(knex) {
  return knex.schema.table('orcamentos', function(table) {
    table.dropColumn('cod_forma_pagto');
    table.dropColumn('cod_cond_pagto');
  });
}; 