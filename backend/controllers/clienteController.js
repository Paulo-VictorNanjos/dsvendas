const db = require('../database/connection');

module.exports = {
  /**
   * Lista todos os clientes
   * @param {*} req Requisição
   * @param {*} res Resposta
   * @returns {Array} Lista de clientes
   */
  async listar(req, res) {
    try {
      const clientes = await db('clientes')
        .select('*')
        .orderBy('razao');

      return res.json(clientes);
    } catch (error) {
      console.error('Erro ao listar clientes:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Busca cliente por ID
   * @param {*} req Requisição
   * @param {*} res Resposta
   * @returns {Object} Cliente encontrado
   */
  async buscarPorId(req, res) {
    const { id } = req.params;

    try {
      const cliente = await db('clientes')
        .where('id', id)
        .first();

      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente não encontrado'
        });
      }

      return res.json({
        success: true,
        data: cliente
      });
    } catch (error) {
      console.error('Erro ao buscar cliente por ID:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Busca cliente por código
   * @param {*} req Requisição
   * @param {*} res Resposta
   * @returns {Object} Cliente encontrado
   */
  async buscarPorCodigo(req, res) {
    const { codigo } = req.params;

    try {
      const cliente = await db('clientes')
        .where('codigo', codigo)
        .first();

      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente não encontrado'
        });
      }

      return res.json({
        success: true,
        data: cliente
      });
    } catch (error) {
      console.error('Erro ao buscar cliente por código:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Busca clientes por vendedor usando o campo cod_vendedor1
   * @param {*} req Requisição
   * @param {*} res Resposta
   * @returns {Array} Lista de clientes do vendedor
   */
  async buscarPorVendedor(req, res) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID do vendedor é obrigatório'
      });
    }

    try {
      console.log(`[clienteController] Buscando clientes para o vendedor: ${id}`);
      
      // Verificar se o vendedor existe
      const vendedor = await db('vendedores')
        .where('codigo', id)
        .first();
        
      if (!vendedor) {
        console.warn(`[clienteController] Vendedor com ID ${id} não encontrado.`);
        return res.json({
          success: true,
          data: [],
          message: `Vendedor com ID ${id} não encontrado.`
        });
      }
      
      console.log(`[clienteController] Vendedor encontrado: ${vendedor.nome} (ID: ${id})`);
      
      // Consultar diretamente na tabela clientes do ERP
      const erpConnection = require('../database/erpConnection');
      
      // Consulta para verificar se existem clientes com o vendedor informado
      const countQuery = erpConnection('clientes')
        .count('* as total')
        .where('cod_vendedor1', id)
        .whereNull('dt_exc'); // Apenas clientes não excluídos
      
      console.log(`[clienteController] Query para contar clientes: ${countQuery.toString()}`);
      
      const countResult = await countQuery.first();
      const total = parseInt(countResult?.total || '0');
      
      console.log(`[clienteController] Total de clientes encontrados na contagem: ${total}`);
      
      if (total === 0) {
        return res.json({
          success: true,
          data: [],
          message: `Nenhum cliente encontrado para o vendedor ${vendedor.nome} (ID: ${id}).`,
          debug: {
            vendedor: vendedor,
            contagem: total,
            query: countQuery.toString()
          }
        });
      }
      
      // Buscar os clientes no ERP
      const query = erpConnection('clientes')
        .select(
          'codigo', 
          'razao', 
          'nome',
          'cnpj',
          'municipio',
          'cod_status',
          'uf',
          'uf_insc_rg',
          'insc_mun',
          'insc_est',
          'cep',
          'logradouro',
          'logradouro_num',
          'complemento',
          'bairro',
          'cod_ibge',
          'municipio',
          'cod_vendedor1'
        )
        .where('cod_vendedor1', id)
        .whereNull('dt_exc') // Apenas clientes não excluídos
        .orderBy('razao');
      
      console.log(`[clienteController] Query para buscar clientes: ${query.toString()}`);
      
      const clientes = await query;
      
      console.log(`[clienteController] Clientes retornados pela consulta: ${clientes.length}`);
      
      // Exibir os primeiros 3 clientes para depuração
      if (clientes.length > 0) {
        console.log(`[clienteController] Primeiros clientes encontrados:`, 
          clientes.slice(0, 3).map(c => ({ 
            codigo: c.codigo, 
            razao: c.razao, 
            cod_vendedor1: c.cod_vendedor1 
          }))
        );
      }

      return res.json({
        success: true,
        data: clientes,
        message: clientes.length > 0 
          ? `${clientes.length} clientes encontrados para o vendedor ${vendedor.nome}.`
          : `Nenhum cliente encontrado para o vendedor ${vendedor.nome} (ID: ${id}).`,
        debug: {
          vendedor: vendedor,
          contagem: total,
          clientesEncontrados: clientes.length
        }
      });
    } catch (error) {
      console.error('[clienteController] Erro ao buscar clientes por vendedor:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
        error: error.toString()
      });
    }
  }
};