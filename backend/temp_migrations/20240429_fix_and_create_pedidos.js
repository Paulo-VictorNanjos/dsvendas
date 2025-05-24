exports.up = function(knex) {
  return knex.schema
    // Primeiro remove a migração antiga do log_sincronizacao da tabela knex_migrations
    .raw(`DELETE FROM knex_migrations WHERE name = '20240318_create_tables.js'`)
    .then(function() {
      // Agora cria as tabelas de pedidos se não existirem
      return knex.schema.hasTable('pedidos').then(function(exists) {
        if (!exists) {
          return knex.schema.createTable('pedidos', function(table) {
            table.string('codigo').primary();
            table.timestamp('dt_pedido').notNullable();
            table.integer('cod_cliente').notNullable();
            table.integer('cod_vendedor').notNullable();
            table.text('observacoes');
            table.decimal('vl_total', 15, 2).notNullable();
            table.string('orcamento_origem').notNullable();
            table.integer('cod_status').defaultTo(1);
            table.timestamp('dt_inc').defaultTo(knex.fn.now());
            table.boolean('sync_pendente').defaultTo(false);
            table.decimal('vl_produtos', 15, 2);
            table.decimal('vl_servicos', 15, 2);
            table.decimal('vl_frete', 15, 2);
            table.decimal('vl_desconto', 15, 2);
            table.integer('cod_empresa').defaultTo(1);
            
            // Índices para melhor performance
            table.index('orcamento_origem');
            table.index('cod_cliente');
            table.index('cod_vendedor');
            table.index('cod_status');
          });
        }
      })
      .then(function() {
        return knex.schema.hasTable('pedidos_itens').then(function(exists) {
          if (!exists) {
            return knex.schema.createTable('pedidos_itens', function(table) {
              table.increments('id').primary();
              table.string('pedido_codigo').notNullable();
              table.string('produto_codigo').notNullable();
              table.decimal('quantidade', 15, 3).notNullable();
              table.decimal('valor_unitario', 15, 4).notNullable();
              table.decimal('valor_total', 15, 2).notNullable();
              table.integer('cod_empresa').defaultTo(1);
              
              // Chave estrangeira para pedidos
              table.foreign('pedido_codigo')
                .references('codigo')
                .inTable('pedidos')
                .onDelete('CASCADE');
              
              // Índices para melhor performance
              table.index('pedido_codigo');
              table.index('produto_codigo');
            });
          }
        });
      });
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('pedidos_itens')
    .dropTableIfExists('pedidos')
    .then(function() {
      // Restaura a entrada da migração antiga
      return knex('knex_migrations').insert({
        name: '20240318_create_tables.js',
        batch: 1,
        migration_time: new Date()
      });
    });
}; 