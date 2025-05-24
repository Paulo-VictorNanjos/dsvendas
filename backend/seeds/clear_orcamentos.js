/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Primeiro limpa a tabela de itens devido à chave estrangeira
  await knex('orcamentos_itens').del();
  
  // Depois limpa a tabela de orçamentos
  await knex('orcamentos').del();
  
  console.log('Todas as tabelas de orçamentos foram limpas com sucesso!');
}; 