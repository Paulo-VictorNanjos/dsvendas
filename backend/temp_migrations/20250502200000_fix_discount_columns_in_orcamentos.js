exports.up = async function(knex) {
  // Verificar se a coluna vl_desconto já existe
  const hasVlDesconto = await knex.schema.hasColumn('orcamentos', 'vl_desconto');
  // Verificar se a coluna vl_com_desconto já existe
  const hasVlComDesconto = await knex.schema.hasColumn('orcamentos', 'vl_com_desconto');
  
  // Se ambas as colunas já existem, não fazer nada
  if (hasVlDesconto && hasVlComDesconto) {
    return Promise.resolve();
  }
  
  // Alterar a tabela para adicionar as colunas que não existem
  return knex.schema.alterTable('orcamentos', function(table) {
    if (!hasVlDesconto) {
      table.decimal('vl_desconto', 10, 2).defaultTo(0);
    }
    if (!hasVlComDesconto) {
      table.decimal('vl_com_desconto', 10, 2).defaultTo(0);
    }
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('orcamentos', function(table) {
    table.dropColumn('vl_desconto');
    table.dropColumn('vl_com_desconto');
  });
}; 