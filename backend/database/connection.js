require('dotenv').config();

// Debug log para verificar as variáveis de ambiente
console.log('Database Config:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT
});

const knex = require('knex');

const connection = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'dsvendas',
    password: process.env.DB_PASSWORD || 'ds_SpjCdAQB8yXL',
    database: process.env.DB_DATABASE || 'dsvendas',
    port: parseInt(process.env.DB_PORT || '5434')
  },
  pool: {
    min: 2,
    max: 10
  }
});

// Conexão específica para o banco de dados ERP
const erpConnection = knex({
  client: 'pg',
  connection: {
    host: process.env.ERP_DB_HOST || process.env.DB_HOST || 'duesoft.permak.com.br',
    user: process.env.ERP_DB_USER || process.env.DB_USER || 'postgres',
    password: process.env.ERP_DB_PASSWORD || process.env.DB_PASSWORD || 'ds_due339',
    database: process.env.ERP_DB_DATABASE || 'permak',
    port: parseInt(process.env.ERP_DB_PORT || process.env.DB_PORT || '5434')
  },
  pool: {
    min: 2,
    max: 10
  }
});

module.exports = connection;
module.exports.erpConnection = erpConnection;