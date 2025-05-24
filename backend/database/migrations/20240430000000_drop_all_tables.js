exports.up = function(knex) {
  return knex.raw(`
    DROP TABLE IF EXISTS knex_migrations CASCADE;
    DROP TABLE IF EXISTS knex_migrations_lock CASCADE;
    DROP TABLE IF EXISTS orcamentos_itens CASCADE;
    DROP TABLE IF EXISTS orcamentos CASCADE;
    DROP TABLE IF EXISTS vendedores CASCADE;
    DROP TABLE IF EXISTS produtos CASCADE;
    DROP TABLE IF EXISTS clientes CASCADE;
    DROP TABLE IF EXISTS empresas CASCADE;
    DROP TABLE IF EXISTS sync_log CASCADE;
    DROP TABLE IF EXISTS formas_pagto CASCADE;
    DROP TABLE IF EXISTS cond_pagto CASCADE;
  `);
};

exports.down = function(knex) {
  return Promise.resolve();
};

