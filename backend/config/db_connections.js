/**
 * Configuração de conexões com bancos de dados
 * Permite conectar ao banco de dados do sistema ERP para sincronização direta
 */

const knex = require('knex');
require('dotenv').config();

// Conexão com o banco de dados local
const db = require('../database');

// Importar a conexão ERP pré-configurada
const erp_db = require('../database/erpConnection');

console.log('Conexão com banco de dados do ERP estabelecida via erpConnection');

module.exports = {
    db,
    erp_db
}; 