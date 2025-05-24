/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('orcamentos_itens', function(table) {
    // Verificar se a coluna já existe antes de adicioná-la
    return knex.schema.hasColumn('orcamentos_itens', 'class_fiscal')
      .then(function(exists) {
        if (!exists) {
          table.string('class_fiscal', 20).nullable();
          console.log('Coluna class_fiscal adicionada à tabela orcamentos_itens');
        } else {
          console.log('Coluna class_fiscal já existe na tabela orcamentos_itens');
        }
      });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('orcamentos_itens', function(table) {
    table.dropColumn('class_fiscal');
  });
}; 