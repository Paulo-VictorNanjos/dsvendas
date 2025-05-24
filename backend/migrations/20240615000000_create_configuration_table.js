/**
 * Cria a tabela de configurações
 */
exports.up = function(knex) {
  return knex.schema.createTable('system_configurations', function(table) {
    table.increments('id').primary();
    table.string('key').notNullable().unique();
    table.string('value').notNullable();
    table.string('description').notNullable();
    table.string('type').notNullable().defaultTo('string'); // string, boolean, number
    table.integer('cod_empresa').defaultTo(1);
    table.timestamps(true, true);
  })
  .then(function() {
    // Inserir configuração padrão para validação de estoque
    return knex('system_configurations').insert([
      {
        key: 'validate_stock_in_quotations',
        value: 'false',
        description: 'Validar estoque disponível ao criar orçamentos',
        type: 'boolean',
        cod_empresa: 1
      },
      {
        key: 'validate_stock_in_orders',
        value: 'true',
        description: 'Validar estoque disponível ao converter orçamentos em pedidos',
        type: 'boolean',
        cod_empresa: 1
      }
    ]);
  });
};

/**
 * Remove a tabela de configurações
 */
exports.down = function(knex) {
  return knex.schema.dropTable('system_configurations');
}; 