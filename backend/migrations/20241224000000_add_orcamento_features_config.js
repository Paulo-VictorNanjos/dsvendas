exports.up = function(knex) {
  return knex('system_configurations').insert([
    {
      key: 'enable_orcamento_email',
      value: 'true',
      description: 'Habilitar envio de orçamentos por email',
      type: 'boolean',
      cod_empresa: 1
    },
    {
      key: 'enable_orcamento_whatsapp',
      value: 'true',
      description: 'Habilitar envio de orçamentos por WhatsApp',
      type: 'boolean',
      cod_empresa: 1
    }
  ]);
};

exports.down = function(knex) {
  return knex('system_configurations')
    .whereIn('key', ['enable_orcamento_email', 'enable_orcamento_whatsapp'])
    .del();
}; 