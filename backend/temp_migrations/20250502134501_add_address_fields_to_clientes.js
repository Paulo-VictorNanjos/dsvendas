/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('clientes', table => {
    // Campos de endereço
    table.string('uf_insc_rg', 2).nullable().comment('UF da inscrição estadual/RG');
    table.string('insc_mun', 10).nullable().comment('Inscrição municipal');
    table.string('cep', 8).nullable().comment('CEP');
    table.string('logradouro', 90).nullable().comment('Logradouro/Rua');
    table.string('logradouro_num', 10).nullable().comment('Número do logradouro');
    table.string('complemento', 200).nullable().comment('Complemento do endereço');
    table.string('bairro', 200).nullable().comment('Bairro');
    table.string('cod_ibge', 50).nullable().comment('Código IBGE do município');
    table.string('municipio', 60).nullable().comment('Nome do município');
    // Nota: a coluna 'uf' já deve ter sido adicionada em uma migração anterior
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('clientes', table => {
    table.dropColumn('uf_insc_rg');
    table.dropColumn('insc_mun');
    table.dropColumn('cep');
    table.dropColumn('logradouro');
    table.dropColumn('logradouro_num');
    table.dropColumn('complemento');
    table.dropColumn('bairro');
    table.dropColumn('cod_ibge');
    table.dropColumn('municipio');
    // Não remover a coluna 'uf' pois ela pode ter sido adicionada em outra migração
  });
};
