/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.hasTable('orcamentos_itens').then(function(exists) {
    if (exists) {
      return knex.schema.alterTable('orcamentos_itens', function(table) {
        // Verificar e adicionar campos fiscais que não existem
        // ICMS
        knex.schema.hasColumn('orcamentos_itens', 'st_icms').then(function(exists) {
          if (!exists) {
            table.string('st_icms', 3).nullable();
          }
        });
        
        knex.schema.hasColumn('orcamentos_itens', 'aliq_icms').then(function(exists) {
          if (!exists) {
            table.decimal('aliq_icms', 15, 4).defaultTo(0);
          }
        });
        
        knex.schema.hasColumn('orcamentos_itens', 'valor_icms').then(function(exists) {
          if (!exists) {
            table.decimal('valor_icms', 15, 4).defaultTo(0);
          }
        });
        
        // ICMS-ST
        knex.schema.hasColumn('orcamentos_itens', 'icms_st').then(function(exists) {
          if (!exists) {
            table.string('icms_st', 1).defaultTo('N');
          }
        });
        
        // Já existe o campo valor_icms_st, mas vamos garantir
        knex.schema.hasColumn('orcamentos_itens', 'valor_icms_st').then(function(exists) {
          if (!exists) {
            table.decimal('valor_icms_st', 15, 4).defaultTo(0);
          }
        });
        
        // IPI
        knex.schema.hasColumn('orcamentos_itens', 'ipi').then(function(exists) {
          if (!exists) {
            table.decimal('ipi', 15, 4).defaultTo(0);
          }
        });
        
        // Já existe o campo valor_ipi, mas vamos garantir
        knex.schema.hasColumn('orcamentos_itens', 'valor_ipi').then(function(exists) {
          if (!exists) {
            table.decimal('valor_ipi', 15, 4).defaultTo(0);
          }
        });
        
        // Classificação fiscal
        knex.schema.hasColumn('orcamentos_itens', 'class_fiscal').then(function(exists) {
          if (!exists) {
            table.string('class_fiscal', 20).nullable();
          }
        });
        
        knex.schema.hasColumn('orcamentos_itens', 'ncm').then(function(exists) {
          if (!exists) {
            table.string('ncm', 20).nullable();
          }
        });
        
        // Origem do produto
        knex.schema.hasColumn('orcamentos_itens', 'cod_origem_prod').then(function(exists) {
          if (!exists) {
            table.string('cod_origem_prod', 1).defaultTo('0');
          }
        });
      });
    }
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.hasTable('orcamentos_itens').then(function(exists) {
    if (exists) {
      return knex.schema.alterTable('orcamentos_itens', function(table) {
        // Remover campos adicionados
        table.dropColumn('st_icms');
        table.dropColumn('aliq_icms');
        table.dropColumn('valor_icms');
        table.dropColumn('icms_st');
        table.dropColumn('class_fiscal');
        table.dropColumn('ncm');
        table.dropColumn('cod_origem_prod');
      });
    }
  });
};
