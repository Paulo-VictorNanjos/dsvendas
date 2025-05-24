exports.up = function(knex) {
    return knex.schema.alterTable('clientes', function(table) {
        // Adicionar coluna uf
        table.string('uf', 2).defaultTo('SP');
        table.string('municipio').nullable();
    });
};

exports.down = function(knex) {
    return knex.schema.alterTable('clientes', function(table) {
        table.dropColumn('uf');
        table.dropColumn('municipio');
    });
}; 