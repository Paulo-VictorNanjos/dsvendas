/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('regras_fiscais_produtos', table => {
    table.increments('id').primary();
    table.string('cod_produto').notNullable().comment('Código do produto');
    table.integer('cod_regra_icms').notNullable().comment('Código da regra de ICMS');
    table.string('class_fiscal').nullable().comment('Classificação fiscal (NCM)');
    table.string('cest', 7).nullable().comment('Código CEST');
    table.decimal('iva', 10, 2).nullable().comment('Índice de Valor Agregado para cálculo de ST');
    table.decimal('aliq_interna', 10, 2).nullable().comment('Alíquota interna para ICMS-ST');
    table.decimal('pauta_icms_st', 14, 2).nullable().comment('Valor de pauta para ICMS-ST');
    table.string('cod_origem_prod', 1).nullable().comment('Código de origem do produto (0-7)');
    table.boolean('ativo').defaultTo(true).comment('Indica se a regra está ativa');
    table.integer('cod_empresa').notNullable().defaultTo(1).comment('Código da empresa');
    table.timestamp('dt_inc').defaultTo(knex.fn.now()).comment('Data de inclusão');
    table.timestamp('dt_alt').nullable().comment('Data de alteração');
    
    // Criar índices para otimizar a busca
    table.index('cod_produto');
    table.index('cod_regra_icms');
    table.index(['cod_produto', 'ativo']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('regras_fiscais_produtos');
};
