/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Verificar se a tabela de orçamentos já existe
    .hasTable('orcamentos')
    .then(function(exists) {
      if (!exists) {
        return knex.schema.createTable('orcamentos', function(table) {
          table.string('codigo').primary();
          table.date('dt_orcamento').notNullable();
          table.date('dt_inc').notNullable();
          table.date('dt_alt').nullable();
          table.integer('cod_empresa').notNullable();
          table.integer('cod_status').notNullable();
          table.string('cod_cliente').notNullable();
          table.string('cod_vendedor').notNullable();
          table.decimal('vl_produtos', 12, 2).defaultTo(0);
          table.decimal('vl_total', 12, 2).defaultTo(0);
          table.text('observacoes').nullable();
          
          // Sem restrições de chave estrangeira, já que clientes e vendedores vêm do sistema externo
        });
      }
    })
    // Verificar se a tabela de itens de orçamentos já existe
    .hasTable('orcamentos_itens')
    .then(function(exists) {
      if (!exists) {
        return knex.schema.createTable('orcamentos_itens', function(table) {
          table.string('codigo').primary();
          table.string('orcamento_codigo').notNullable();
          table.string('produto_codigo').notNullable();
          table.decimal('quantidade', 12, 3).notNullable();
          table.decimal('valor_unitario', 12, 2).notNullable();
          table.decimal('valor_total', 12, 2).notNullable();
          table.integer('cod_status').notNullable();
          table.integer('cod_empresa').notNullable();
          
          table.foreign('orcamento_codigo').references('codigo').inTable('orcamentos');
          // Sem restrição para produto_codigo, já que os produtos vêm do sistema externo
        });
      }
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('orcamentos_itens')
    .dropTableIfExists('orcamentos');
}; 