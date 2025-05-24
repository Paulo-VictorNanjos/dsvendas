/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .hasTable('orcamentos')
    .then(function(exists) {
      if (exists) {
        return knex.schema.alterTable('orcamentos', function(table) {
          // Verificar se existem as constraints e remove-las 
          // (pode ser que elas não existam se a tabela foi criada sem elas)
          try {
            table.dropForeign(['cod_cliente']);
          } catch (e) {
            console.log('Constraint cod_cliente não existe ou já foi removida');
          }
          
          try {
            table.dropForeign(['cod_vendedor']);
          } catch (e) {
            console.log('Constraint cod_vendedor não existe ou já foi removida');
          }
        });
      }
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .hasTable('orcamentos')
    .then(function(exists) {
      if (exists) {
        return knex.schema.alterTable('orcamentos', function(table) {
          // Readicionar as constraints
          table.foreign('cod_cliente').references('codigo').inTable('clientes');
          table.foreign('cod_vendedor').references('codigo').inTable('vendedores');
        });
      }
    });
}; 