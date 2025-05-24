// Esta migration é usada apenas para marcar as tabelas existentes como migradas
exports.up = function(knex) {
  // As tabelas já existem, então não precisamos criar
  return Promise.resolve();
};
 
exports.down = function(knex) {
  // Não fazemos nada no rollback também
  return Promise.resolve();
}; 