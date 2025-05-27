exports.up = function(knex) {
  return knex.schema
    // Enable UUID extension
    .raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    // Create usuarios table
    .createTable('usuarios', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('nome').notNullable();
      table.string('email').notNullable().unique();
      table.string('senha').notNullable();
      table.string('role').notNullable().defaultTo('user');
      table.boolean('ativo').notNullable().defaultTo(true);
      table.timestamp('dt_inc').notNullable().defaultTo(knex.fn.now());
      table.timestamp('dt_alt');
      table.timestamp('ultimo_login');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('usuarios')
    .raw('DROP EXTENSION IF EXISTS "uuid-ossp"');
}; 