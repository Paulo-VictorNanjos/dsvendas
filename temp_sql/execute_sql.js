const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Criar interface de leitura para receber input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function promptPassword() {
  return new Promise((resolve) => {
    rl.question('Digite a senha do PostgreSQL: ', (password) => {
      resolve(password);
    });
  });
}

async function executeSQL() {
  // Obter a senha do usuário
  const password = await promptPassword();
  
  // Configuração do banco de dados
  const config = {
    host: 'localhost',
    user: 'postgres',
    database: 'dsvendas',
    port: 5434,
    password: password
  };

  const client = new Client(config);
  
  try {
    console.log('Conectando ao banco de dados...');
    await client.connect();
    
    console.log('Lendo arquivo SQL...');
    const sqlFilePath = path.join(__dirname, 'add_columns.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('Executando SQL...');
    await client.query(sql);
    
    console.log('SQL executado com sucesso!');
  } catch (error) {
    console.error('Erro ao executar SQL:', error);
  } finally {
    console.log('Fechando conexão...');
    await client.end();
    rl.close();
  }
}

executeSQL(); 