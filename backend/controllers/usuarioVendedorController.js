const db = require('../database/connection');
const logger = require('../utils/logger');

module.exports = {
  async listarVinculos(req, res) {
    try {
      // Apenas admins podem listar todos os vínculos
      if (req.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acesso não autorizado'
        });
      }

      const vinculos = await db('usuario_vendedor')
        .join('usuarios', 'usuario_vendedor.usuario_id', 'usuarios.id')
        .join('vendedores', 'usuario_vendedor.vendedor_codigo', 'vendedores.codigo')
        .select(
          'usuarios.id as usuario_id',
          'usuarios.nome as usuario_nome',
          'usuarios.email as usuario_email',
          'vendedores.codigo as vendedor_codigo',
          'vendedores.nome as vendedor_nome',
          'usuario_vendedor.dt_inc'
        );

      return res.json({
        success: true,
        data: vinculos
      });
    } catch (error) {
      console.error('Erro ao listar vínculos:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  async criarVinculo(req, res) {
    try {
      // Apenas admins podem criar vínculos
      if (req.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acesso não autorizado'
        });
      }

      const { usuario_id, vendedor_codigo } = req.body;

      // Validar se usuário existe
      const usuario = await db('usuarios')
        .where('id', usuario_id)
        .first();

      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Validar se vendedor existe
      const vendedor = await db('vendedores')
        .where('codigo', vendedor_codigo)
        .first();

      if (!vendedor) {
        return res.status(404).json({
          success: false,
          message: 'Vendedor não encontrado'
        });
      }

      // Verificar se vínculo já existe
      const vinculoExistente = await db('usuario_vendedor')
        .where({
          usuario_id,
          vendedor_codigo
        })
        .first();

      if (vinculoExistente) {
        return res.status(400).json({
          success: false,
          message: 'Vínculo já existe'
        });
      }

      // Criar vínculo
      await db('usuario_vendedor').insert({
        usuario_id,
        vendedor_codigo
      });

      return res.status(201).json({
        success: true,
        message: 'Vínculo criado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar vínculo:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  async removerVinculo(req, res) {
    try {
      // Apenas admins podem remover vínculos
      if (req.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acesso não autorizado'
        });
      }

      const { usuario_id, vendedor_codigo } = req.params;

      // Verificar se vínculo existe
      const vinculo = await db('usuario_vendedor')
        .where({
          usuario_id,
          vendedor_codigo
        })
        .first();

      if (!vinculo) {
        return res.status(404).json({
          success: false,
          message: 'Vínculo não encontrado'
        });
      }

      // Remover vínculo
      await db('usuario_vendedor')
        .where({
          usuario_id,
          vendedor_codigo
        })
        .delete();

      return res.json({
        success: true,
        message: 'Vínculo removido com sucesso'
      });
    } catch (error) {
      console.error('Erro ao remover vínculo:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  async buscarVinculoUsuario(req, res) {
    try {
      const usuario_id = req.userId; // Usar ID do usuário autenticado

      const vinculo = await db('usuario_vendedor')
        .where('usuario_id', usuario_id)
        .join('vendedores', 'usuario_vendedor.vendedor_codigo', 'vendedores.codigo')
        .select('vendedores.*')
        .first();

      return res.json({
        success: true,
        data: vinculo || null
      });
    } catch (error) {
      console.error('Erro ao buscar vínculo do usuário:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  async buscarVendedorPorUsuarioId(req, res) {
    try {
      const { id } = req.params;
      
      logger.info(`Buscando vendedor vinculado ao usuário ID: ${id}`);

      if (!id) {
        logger.error('ID do usuário não fornecido');
        return res.status(400).json({
          success: false,
          message: 'ID do usuário não fornecido'
        });
      }

      const vinculo = await db('usuario_vendedor')
        .where('usuario_id', id)
        .join('vendedores', 'usuario_vendedor.vendedor_codigo', 'vendedores.codigo')
        .select(
          'vendedores.codigo as vendedor_codigo',
          'vendedores.nome as vendedor_nome',
          'vendedores.email as vendedor_email',
          'vendedores.telefone',
          'vendedores.cod_status'
        )
        .first();

      if (!vinculo) {
        logger.warn(`Nenhum vendedor vinculado encontrado para o usuário ID: ${id}`);
        return res.status(404).json({
          success: false,
          message: 'Nenhum vendedor vinculado encontrado para este usuário'
        });
      }

      logger.info(`Vendedor encontrado para o usuário ID ${id}: ${vinculo.vendedor_codigo} - ${vinculo.vendedor_nome}`);
      return res.json({
        success: true,
        data: vinculo
      });
    } catch (error) {
      logger.error(`Erro ao buscar vendedor vinculado ao usuário ID ${req.params.id}:`, error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}; 