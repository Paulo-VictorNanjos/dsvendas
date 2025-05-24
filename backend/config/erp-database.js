/**
 * Configuração da conexão com o banco de dados do ERP
 * 
 * Este arquivo configura a conexão com o banco de dados do sistema ERP
 * para consultas diretas quando necessário.
 */

const knex = require('knex');
require('dotenv').config();

// Obtém as configurações do arquivo .env ou usa valores padrão
const config = {
  client: 'pg',
  connection: {
    host: process.env.ERP_DB_HOST || 'duesoft.permak.com.br',
    port: process.env.ERP_DB_PORT || 5434,
    user: process.env.ERP_DB_USER || 'postgres',
    password: process.env.ERP_DB_PASSWORD || 'ds_due339',
    database: process.env.ERP_DB_DATABASE || 'permak'
  },
  pool: {
    min: 0,
    max: 5,
    idleTimeoutMillis: 10000, // Tempo em milissegundos para encerrar conexões ociosas
    acquireTimeoutMillis: 15000 // Tempo em milissegundos para esperar uma conexão
  },
  acquireConnectionTimeout: 30000 // Timeout para adquirir uma conexão (30 segundos)
};

// Cria uma instância de conexão com o banco de dados do ERP
const erpConnection = knex(config);

// Tratamento de erro para a conexão
erpConnection.on('error', (err) => {
  console.error('Erro na conexão com o banco de dados do ERP:', err);
});

module.exports = erpConnection; 