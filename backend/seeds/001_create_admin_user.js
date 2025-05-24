const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Verificar se já existe algum usuário admin
  const adminExists = await knex('usuarios')
    .where('role', 'admin')
    .first();

  if (!adminExists) {
    const senha = await bcrypt.hash('admin123', 10);
    
    await knex('usuarios').insert({
      id: uuidv4(),
      nome: 'Administrador',
      email: 'admin@dsvendas.com',
      senha: senha,
      role: 'admin',
      ativo: true,
      dt_inc: new Date()
    });
    
    console.log('Usuário admin criado com sucesso!');
    console.log('Email: admin@dsvendas.com');
    console.log('Senha: admin123');
  }
}; 