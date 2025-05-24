exports.up = async function(knex) {
  // Primeiro verifica se a tabela knex_migrations existe
  const hasMigrationsTable = await knex.schema.hasTable('knex_migrations');
  
  if (!hasMigrationsTable) {
    // Se não existir, cria a tabela
    await knex.schema.createTable('knex_migrations', function(table) {
      table.increments();
      table.string('name');
      table.integer('batch');
      table.timestamp('migration_time').defaultTo(knex.fn.now());
    });

    await knex.schema.createTable('knex_migrations_lock', function(table) {
      table.increments();
      table.integer('index');
      table.integer('is_locked');
    });
  }

  // Agora vamos criar as tabelas de pedidos diretamente
  const hasPedidos = await knex.schema.hasTable('pedidos');
  if (!hasPedidos) {
    await knex.schema.createTable('pedidos', function(table) {
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
      
      table.index('orcamento_origem');
      table.index('cod_cliente');
      table.index('cod_vendedor');
      table.index('cod_status');
    });
  }

  const hasPedidosItens = await knex.schema.hasTable('pedidos_itens');
  if (!hasPedidosItens) {
    await knex.schema.createTable('pedidos_itens', function(table) {
      table.increments('id').primary();
      table.string('pedido_codigo').notNullable();
      table.string('produto_codigo').notNullable();
      table.decimal('quantidade', 15, 3).notNullable();
      table.decimal('valor_unitario', 15, 4).notNullable();
      table.decimal('valor_total', 15, 2).notNullable();
      table.integer('cod_empresa').defaultTo(1);
      
      table.foreign('pedido_codigo')
        .references('codigo')
        .inTable('pedidos')
        .onDelete('CASCADE');
      
      table.index('pedido_codigo');
      table.index('produto_codigo');
    });
  }

  // Marca todas as migrações anteriores como concluídas
  const migrations = [
    '20240318_create_sync_log.js',
    '20240318_create_tables.js',
    '20240318_mark_existing.js',
    '20240426_alter_clientes.js',
    '20240426_alter_produtos.js',
    '20240426_fix_all_tables.js',
    '20240427_create_orcamentos.js',
    '20240429_fix_orcamentos.js',
    '20240429_remove_fk_constraints.js'
  ].map(name => ({
    name,
    batch: 1,
    migration_time: new Date()
  }));

  await knex('knex_migrations').insert(migrations);
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('pedidos_itens')
    .dropTableIfExists('pedidos')
    .dropTableIfExists('knex_migrations')
    .dropTableIfExists('knex_migrations_lock');
}; 