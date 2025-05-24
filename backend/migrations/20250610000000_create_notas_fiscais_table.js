/**
 * Criação da tabela de notas fiscais
 */
exports.up = function(knex) {
  return knex.schema.createTable('notas_fiscais', table => {
    table.increments('id').primary();
    table.string('numero').notNullable();
    table.string('serie').notNullable();
    table.string('chave_acesso', 44).notNullable();
    table.integer('codigo_pedido').unsigned().references('codigo').inTable('pedidos');
    table.text('xml', 'longtext').nullable();
    table.date('dt_emissao').notNullable();
    table.decimal('valor_total', 15, 2).defaultTo(0);
    table.decimal('valor_produtos', 15, 2).defaultTo(0);
    table.decimal('valor_icms', 15, 2).defaultTo(0);
    table.decimal('valor_icms_st', 15, 2).defaultTo(0);
    table.decimal('valor_frete', 15, 2).defaultTo(0);
    table.decimal('valor_seguro', 15, 2).defaultTo(0);
    table.decimal('valor_desconto', 15, 2).defaultTo(0);
    table.decimal('valor_ipi', 15, 2).defaultTo(0);
    table.decimal('valor_pis', 15, 2).defaultTo(0);
    table.decimal('valor_cofins', 15, 2).defaultTo(0);
    table.integer('status').defaultTo(1); // 1=Emitida, 2=Cancelada, 3=Denegada
    table.boolean('processada').defaultTo(false);
    table.string('protocolo', 30).nullable();
    table.string('cod_cliente').notNullable();
    table.timestamps(true, true);
    
    // Índices para melhorar performance
    table.index('numero');
    table.index('chave_acesso');
    table.index('codigo_pedido');
    table.index('cod_cliente');
  });
};

/**
 * Exclusão da tabela de notas fiscais
 */
exports.down = function(knex) {
  return knex.schema.dropTable('notas_fiscais');
}; 