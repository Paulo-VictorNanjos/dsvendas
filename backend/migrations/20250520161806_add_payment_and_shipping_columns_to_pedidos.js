/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('pedidos', table => {
    // Adicionar coluna para código da condição de pagamento
    table.string('cod_cond_pagto').nullable();
    
    // Adicionar coluna para código da forma de pagamento
    table.string('cod_forma_pagto').nullable();
    
    // Adicionar coluna para código da transportadora (se ainda não existir)
    if (!table.hasColumn('cod_transportadora')) {
      table.string('cod_transportadora').nullable();
    }
    
    // Adicionar coluna para nome da transportadora (informação adicional útil)
    table.string('nome_transportadora').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('pedidos', table => {
    // Remover as colunas adicionadas
    table.dropColumn('cod_cond_pagto');
    table.dropColumn('cod_forma_pagto');
    table.dropColumn('cod_transportadora');
    table.dropColumn('nome_transportadora');
  });
};
