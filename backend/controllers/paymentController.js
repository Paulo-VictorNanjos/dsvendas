const connection = require('../database/connection');
const logger = require('../utils/logger');

class PaymentController {
  // Listar todas as formas de pagamento
  async getFormasPagamento(req, res) {
    try {
      // Verificar qual tabela existe
      const hasFormasPagto = await connection.schema.hasTable('formas_pagto');
      const hasFormPagto = await connection.schema.hasTable('form_pagto');
      
      let tableName = '';
      if (hasFormPagto) {
        tableName = 'form_pagto';
      } else if (hasFormasPagto) {
        tableName = 'formas_pagto';
      } else {
        logger.error('Nenhuma tabela de formas de pagamento encontrada');
        return res.status(500).json({ error: 'Tabela de formas de pagamento não encontrada' });
      }
      
      logger.info(`Buscando formas de pagamento da tabela ${tableName}`);
      
      const formasPagamento = await connection(tableName)
        .select('*')
        .orderBy('descricao');

      res.json(formasPagamento);
    } catch (error) {
      logger.error('Erro ao buscar formas de pagamento:', error);
      res.status(500).json({ error: 'Erro ao buscar formas de pagamento' });
    }
  }

  // Listar todas as condições de pagamento
  async getCondicoesPagamento(req, res) {
    try {
      // Verificar se a tabela existe
      const hasCondPagto = await connection.schema.hasTable('cond_pagto');
      
      if (!hasCondPagto) {
        logger.error('Tabela de condições de pagamento não encontrada');
        return res.status(500).json({ error: 'Tabela de condições de pagamento não encontrada' });
      }
      
      const condicoesPagamento = await connection('cond_pagto')
        .select('*')
        .orderBy('num_parcelas');

      res.json(condicoesPagamento);
    } catch (error) {
      logger.error('Erro ao buscar condições de pagamento:', error);
      res.status(500).json({ error: 'Erro ao buscar condições de pagamento' });
    }
  }
}

module.exports = new PaymentController(); 