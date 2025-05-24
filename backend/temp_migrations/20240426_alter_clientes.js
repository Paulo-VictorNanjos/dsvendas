exports.up = function(knex) {
    return knex.schema.alterTable('clientes', function(table) {
        // Adicionando colunas que faltam
        table.string('cnpj').nullable();
        table.string('fantasia').nullable();
        table.integer('cod_status').defaultTo(1);
    });
};

exports.down = function(knex) {
    return knex.schema.alterTable('clientes', function(table) {
        table.dropColumn('cnpj');
        table.dropColumn('fantasia');
        table.dropColumn('cod_status');
    });
}; 