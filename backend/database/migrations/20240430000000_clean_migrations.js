exports.up = function(knex) {
  return knex.raw(`
    DROP TABLE IF EXISTS knex_migrations CASCADE;
    DROP TABLE IF EXISTS knex_migrations_lock CASCADE;
  `);
};

exports.down = function(knex) {
  return Promise.resolve();
}; 