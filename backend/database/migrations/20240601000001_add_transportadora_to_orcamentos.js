exports.up = function(knex) {
  return knex.schema.table('orcamentos', function(table) {
    table.string('cod_transportadora').comment('Código da transportadora selecionada');
    table.string('nome_transportadora').comment('Nome da transportadora para referência rápida');
  });
};

exports.down = function(knex) {
  return knex.schema.table('orcamentos', function(table) {
    table.dropColumn('cod_transportadora');
    table.dropColumn('nome_transportadora');
  });
}; 