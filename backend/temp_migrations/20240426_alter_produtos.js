exports.up = function(knex) {
    return knex.schema.alterTable('produtos', function(table) {
        // Adicionando coluna cod_status
        table.integer('cod_status').defaultTo(1);
    });
};

exports.down = function(knex) {
    return knex.schema.alterTable('produtos', function(table) {
        table.dropColumn('cod_status');
    });
}; 