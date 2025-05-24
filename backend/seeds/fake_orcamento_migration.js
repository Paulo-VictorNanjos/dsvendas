/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Registrar a migração como concluída
  const migration = await knex('knex_migrations')
    .where({ name: '20240427_create_orcamentos.js' })
    .first();
  
  if (!migration) {
    await knex('knex_migrations').insert({
      name: '20240427_create_orcamentos.js',
      batch: 2,
      migration_time: new Date()
    });
    console.log('Migração 20240427_create_orcamentos.js registrada como concluída.');
  } else {
    console.log('Migração 20240427_create_orcamentos.js já está registrada.');
  }

  // Executar a segunda migração para remover as constraints
  try {
    await knex.schema.alterTable('orcamentos', function(table) {
      // Verificar se existem as constraints e remove-las
      try {
        table.dropForeign(['cod_cliente']);
        console.log('Constraint cod_cliente removida com sucesso.');
      } catch (e) {
        console.log('Constraint cod_cliente não existe ou já foi removida:', e.message);
      }
      
      try {
        table.dropForeign(['cod_vendedor']);
        console.log('Constraint cod_vendedor removida com sucesso.');
      } catch (e) {
        console.log('Constraint cod_vendedor não existe ou já foi removida:', e.message);
      }
    });
  } catch (e) {
    console.log('Erro ao tentar remover constraints:', e.message);
  }

  // Registrar a segunda migração como concluída
  const migration2 = await knex('knex_migrations')
    .where({ name: '20240429_fix_orcamentos.js' })
    .first();
  
  if (!migration2) {
    await knex('knex_migrations').insert({
      name: '20240429_fix_orcamentos.js',
      batch: 2,
      migration_time: new Date()
    });
    console.log('Migração 20240429_fix_orcamentos.js registrada como concluída.');
  } else {
    console.log('Migração 20240429_fix_orcamentos.js já está registrada.');
  }
};
