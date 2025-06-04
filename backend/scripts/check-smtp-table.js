const knex = require('../database/connection');

async function checkAndCreateSmtpTable() {
  try {
    console.log('🔍 Verificando se a tabela user_smtp_config existe...');
    
    const tableExists = await knex.schema.hasTable('user_smtp_config');
    
    if (tableExists) {
      console.log('✅ Tabela user_smtp_config já existe!');
      return;
    }
    
    console.log('📝 Criando tabela user_smtp_config...');
    
    await knex.schema.createTable('user_smtp_config', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable('usuarios').onDelete('CASCADE');
      table.string('smtp_host').notNullable();
      table.integer('smtp_port').notNullable().defaultTo(587);
      table.boolean('smtp_secure').defaultTo(false);
      table.string('smtp_user').notNullable();
      table.string('smtp_password').notNullable(); // Será criptografado
      table.string('from_name').notNullable();
      table.string('from_email').notNullable();
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
      
      // Índice único para garantir uma configuração por usuário
      table.unique(['user_id']);
    });
    
    console.log('✅ Tabela user_smtp_config criada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao verificar/criar tabela user_smtp_config:', error);
  } finally {
    await knex.destroy();
  }
}

checkAndCreateSmtpTable(); 