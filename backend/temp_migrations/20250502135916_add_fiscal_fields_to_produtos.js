/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('produtos', table => {
    // Campos fiscais
    table.string('class_fiscal').nullable().comment('Código da classificação fiscal (NCM)');
    table.integer('cod_regra_icms').nullable().comment('Código da regra de ICMS');
    table.decimal('aliq_ipi', 10, 2).nullable().comment('Alíquota de IPI');
    table.decimal('aliq_icms', 10, 2).nullable().comment('Alíquota de ICMS padrão');
    table.string('ncm', 8).nullable().comment('Código NCM do produto');
    table.string('cod_origem_prod', 1).nullable().comment('Código de origem do produto (0-7)');
    table.string('cest', 7).nullable().comment('Código CEST do produto');
    table.decimal('iva', 10, 2).nullable().comment('Índice de Valor Agregado para ICMS-ST');
    table.decimal('aliq_interna', 10, 2).nullable().comment('Alíquota interna para ICMS-ST');
    table.decimal('pauta_icms_st', 14, 2).nullable().comment('Valor de pauta para ICMS-ST');
    table.string('unidade', 6).nullable().comment('Unidade de medida do produto');
    table.string('unidade_tributacao', 6).nullable().comment('Unidade de tributação do produto');
    table.decimal('fator_conversao', 14, 4).defaultTo(1).comment('Fator de conversão entre unidades');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('produtos', table => {
    table.dropColumn('class_fiscal');
    table.dropColumn('cod_regra_icms');
    table.dropColumn('aliq_ipi');
    table.dropColumn('aliq_icms');
    table.dropColumn('ncm');
    table.dropColumn('cod_origem_prod');
    table.dropColumn('cest');
    table.dropColumn('iva');
    table.dropColumn('aliq_interna');
    table.dropColumn('pauta_icms_st');
    table.dropColumn('unidade');
    table.dropColumn('unidade_tributacao');
    table.dropColumn('fator_conversao');
  });
};
