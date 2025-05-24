exports.up = function(knex) {
  return knex.schema
    // Tabela de regras de ICMS
    .createTable('regras_icms', function(table) {
      table.integer('codigo').primary();
      table.string('acrescimo_icms', 1);
      table.string('uf', 2).notNullable();
      table.string('st_icms', 3);
      table.decimal('aliq_icms', 10, 2);
      table.decimal('red_icms', 10, 2);
      table.integer('cod_convenio');
      table.string('st_icms_contr', 3);
      table.decimal('aliq_icms_contr', 10, 2);
      table.decimal('red_icms_contr', 10, 2);
      table.integer('cod_convenio_contr');
      table.string('icms_st', 1);
      table.integer('cod_aliquota');
      table.decimal('aliq_interna', 10, 2);
      table.string('aliq_ecf', 10);
      table.decimal('aliq_dif_icms_contr', 10, 2);
      table.decimal('aliq_dif_icms_cons', 10, 2);
      table.string('reducao_somente_icms_proprio', 1);
      table.string('cod_cbnef', 10);
      table.string('st_icms_contr_reg_sn', 3);
      table.decimal('aliq_icms_contr_reg_sn', 10, 2);
      table.decimal('red_icms_contr_reg_sn', 10, 2);
      table.decimal('aliq_dif_icms_contr_reg_sn', 10, 2);
      table.decimal('cod_convenio_contr_reg_sn', 10, 2);
      table.string('icms_st_reg_sn', 1);
      table.timestamps(true, true);
    })
    
    // Tabela de classificação fiscal
    .createTable('class_fiscal_dados', function(table) {
      table.integer('cod_class_fiscal').notNullable();
      table.string('cod_ncm').notNullable();
      table.string('uf', 2).notNullable();
      table.decimal('aliq_fcp', 10, 2);
      table.decimal('aliq_fcpst', 10, 2);
      table.decimal('aliq_pst', 10, 2);
      table.decimal('iva', 10, 2);
      table.decimal('aliq_interna', 10, 2);
      table.decimal('iva_diferenciado', 10, 2);
      table.string('cest', 7);
      table.decimal('iva_importado', 10, 2);
      table.decimal('aliq_importado', 10, 2);
      table.primary(['cod_class_fiscal', 'uf']);
      table.timestamps(true, true);
    })
    
    // Tabela de classificação fiscal
    .createTable('class_fiscal', function(table) {
      table.integer('codigo').primary();
      table.string('cod_ncm').notNullable();
      table.timestamp('dt_exc');
      table.timestamp('dt_alt');
      table.timestamps(true, true);
    })
    
    // Tabela de regras ICMS cadastro
    .createTable('regras_icms_cadastro', function(table) {
      table.integer('codigo').primary();
      table.string('acrescimo_icms', 1);
      table.timestamp('dt_exc');
      table.timestamp('dt_alt');
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('regras_icms_cadastro')
    .dropTable('class_fiscal')
    .dropTable('class_fiscal_dados')
    .dropTable('regras_icms');
}; 