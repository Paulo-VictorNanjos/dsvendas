exports.up = function(knex) {
  return knex.schema.hasColumn('orcamentos_itens', 'codigo').then(async function(exists) {
    if (!exists) {
      // Primeiro, adicionar a coluna como nullable
      await knex.schema.table('orcamentos_itens', function(table) {
        table.uuid('codigo');
      });

      // Atualizar registros existentes com UUIDs
      await knex.raw('UPDATE orcamentos_itens SET codigo = uuid_generate_v4()');

      // Definir a coluna como não-nula depois de preencher os valores
      return knex.schema.alterTable('orcamentos_itens', function(table) {
        table.uuid('codigo').notNullable().alter();
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.hasColumn('orcamentos_itens', 'codigo').then(function(exists) {
    if (exists) {
      return knex.schema.table('orcamentos_itens', function(table) {
        table.dropColumn('codigo');
      });
    }
  });
}; 