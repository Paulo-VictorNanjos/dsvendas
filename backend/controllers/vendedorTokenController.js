const db = require('../database/connection');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * Função auxiliar para gerar um token seguro
 * @param {Number} length Comprimento do token
 * @returns {String} Token seguro
 */
function gerarTokenSeguro(length = 12) {
  // Gerar um token aleatório com letras e números, fácil de digitar
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
  let token = '';
  
  // Gerar bytes aleatórios
  const randomBytes = crypto.randomBytes(length);
  
  // Usar cada byte para selecionar um caractere do conjunto
  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] % caracteres.length;
    token += caracteres.charAt(randomIndex);
  }
  
  return token;
}

/**
 * Função auxiliar para determinar o status do token
 * @param {Object} token Token
 * @returns {String} Status do token
 */
function getStatusToken(token) {
  if (!token.ativo) return 'INATIVO';
  if (token.dt_uso) return 'UTILIZADO';
  if (token.dt_expiracao && new Date(token.dt_expiracao) < new Date()) return 'EXPIRADO';
  return 'ATIVO';
}

module.exports = {
  /**
   * Lista todos os tokens de vendedores (apenas para administradores)
   * @param {*} req Requisição
   * @param {*} res Resposta
   * @returns {Array} Lista de tokens
   */
  async listarTokens(req, res) {
    try {
      // Apenas administradores podem listar tokens
      if (req.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acesso não autorizado'
        });
      }

      const tokens = await db('vendedor_token')
        .select(
          'vendedor_token.*',
          'vendedores.nome as vendedor_nome'
        )
        .leftJoin('vendedores', 'vendedor_token.vendedor_codigo', 'vendedores.codigo')
        .orderBy('vendedor_token.dt_inc', 'desc');

      // Mapear os tokens para o formato adequado
      const tokensFormatados = tokens.map(token => ({
        id: token.id,
        vendedor: {
          codigo: token.vendedor_codigo,
          nome: token.vendedor_nome
        },
        token: token.token,
        ativo: token.ativo,
        expiracao: token.dt_expiracao,
        criado_em: token.dt_inc,
        usado_em: token.dt_uso,
        status: getStatusToken(token),
        gerado_por: token.gerado_por,
        descricao: token.descricao
      }));

      return res.json({
        success: true,
        data: tokensFormatados
      });
    } catch (error) {
      console.error('Erro ao listar tokens de vendedores:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Gera um novo token para um vendedor
   * @param {*} req Requisição
   * @param {*} res Resposta
   * @returns {Object} Token gerado
   */
  async gerarToken(req, res) {
    try {
      // Apenas administradores podem gerar tokens
      if (req.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acesso não autorizado'
        });
      }

      const { vendedor_codigo, dias_validade = 30, descricao } = req.body;

      if (!vendedor_codigo) {
        return res.status(400).json({
          success: false,
          message: 'Código do vendedor é obrigatório'
        });
      }

      // Verificar se o vendedor existe
      const vendedor = await db('vendedores')
        .where('codigo', vendedor_codigo)
        .first();

      if (!vendedor) {
        return res.status(404).json({
          success: false,
          message: 'Vendedor não encontrado'
        });
      }

      // Gerar um token aleatório e seguro (12 caracteres)
      const token = gerarTokenSeguro(12);

      // Calcular data de expiração
      const dataExpiracao = new Date();
      dataExpiracao.setDate(dataExpiracao.getDate() + parseInt(dias_validade));

      // Buscar informações do usuário gerador
      const usuario = await db('usuarios')
        .where('id', req.userId)
        .first();

      const nomeGerador = usuario ? usuario.nome : 'Sistema';

      // Gerar o ID do token usando uuid v4
      const tokenId = uuidv4();
      console.log('Token ID gerado:', tokenId);

      // Inserir o token no banco de dados
      await db('vendedor_token').insert({
        id: tokenId,
        vendedor_codigo,
        token,
        ativo: true,
        dt_expiracao: dataExpiracao,
        gerado_por: nomeGerador,
        descricao: descricao || `Token para vendedor ${vendedor_codigo}`
      });
      
      // Buscar o token completo para retornar
      const tokenCompleto = await db('vendedor_token')
        .select(
          'vendedor_token.*',
          'vendedores.nome as vendedor_nome'
        )
        .leftJoin('vendedores', 'vendedor_token.vendedor_codigo', 'vendedores.codigo')
        .where('vendedor_token.id', tokenId)
        .first();

      // Formatar resposta
      const tokenFormatado = {
        id: tokenCompleto.id,
        vendedor: {
          codigo: tokenCompleto.vendedor_codigo,
          nome: tokenCompleto.vendedor_nome
        },
        token: tokenCompleto.token,
        ativo: tokenCompleto.ativo,
        expiracao: tokenCompleto.dt_expiracao,
        criado_em: tokenCompleto.dt_inc,
        status: 'ATIVO',
        gerado_por: tokenCompleto.gerado_por,
        descricao: tokenCompleto.descricao
      };

      return res.status(201).json({
        success: true,
        data: tokenFormatado,
        message: 'Token gerado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao gerar token para vendedor:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Valida um token de vendedor durante o registro
   * @param {*} req Requisição
   * @param {*} res Resposta
   * @returns {Object} Dados do vendedor vinculado ao token
   */
  async validarToken(req, res) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token é obrigatório'
        });
      }

      // Buscar token no banco de dados
      const tokenData = await db('vendedor_token')
        .where('token', token)
        .first();

      if (!tokenData) {
        return res.status(404).json({
          success: false,
          message: 'Token inválido ou inexistente'
        });
      }

      // Verificar se o token está ativo
      if (!tokenData.ativo) {
        return res.status(400).json({
          success: false,
          message: 'Token inativo'
        });
      }

      // Verificar se o token expirou
      if (tokenData.dt_expiracao && new Date(tokenData.dt_expiracao) < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Token expirado'
        });
      }

      // Buscar informações do vendedor
      const vendedor = await db('vendedores')
        .where('codigo', tokenData.vendedor_codigo)
        .first();

      if (!vendedor) {
        return res.status(404).json({
          success: false,
          message: 'Vendedor não encontrado'
        });
      }

      return res.json({
        success: true,
        data: {
          token: tokenData.token,
          vendedor: {
            codigo: vendedor.codigo,
            nome: vendedor.nome
          }
        },
        message: 'Token válido'
      });
    } catch (error) {
      console.error('Erro ao validar token de vendedor:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Usar um token para vincular um usuário a um vendedor
   * @param {*} req Requisição
   * @param {*} res Resposta
   * @returns {Object} Resultado do uso do token
   */
  async usarToken(req, res) {
    try {
      const { token } = req.body;
      const usuario_id = req.userId; // Usuário que está usando o token

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token é obrigatório'
        });
      }

      // Buscar token no banco de dados
      const tokenData = await db('vendedor_token')
        .where('token', token)
        .first();

      if (!tokenData) {
        return res.status(404).json({
          success: false,
          message: 'Token inválido ou inexistente'
        });
      }

      // Verificar se o token está ativo
      if (!tokenData.ativo) {
        return res.status(400).json({
          success: false,
          message: 'Token inativo'
        });
      }

      // Verificar se o token expirou
      if (tokenData.dt_expiracao && new Date(tokenData.dt_expiracao) < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Token expirado'
        });
      }

      // Verificar se o usuário já está vinculado a um vendedor
      const vinculoExistente = await db('usuario_vendedor')
        .where('usuario_id', usuario_id)
        .first();

      if (vinculoExistente) {
        return res.status(400).json({
          success: false,
          message: 'Usuário já está vinculado a um vendedor'
        });
      }

      // Iniciar transação
      await db.transaction(async trx => {
        // Criar vínculo entre usuário e vendedor
        await trx('usuario_vendedor').insert({
          usuario_id,
          vendedor_codigo: tokenData.vendedor_codigo
        });

        // Atualizar token como usado
        await trx('vendedor_token')
          .where('id', tokenData.id)
          .update({
            ativo: false,
            dt_uso: new Date()
          });
      });

      // Buscar informações do vendedor
      const vendedor = await db('vendedores')
        .where('codigo', tokenData.vendedor_codigo)
        .first();

      return res.json({
        success: true,
        data: {
          vendedor: {
            codigo: vendedor.codigo,
            nome: vendedor.nome
          }
        },
        message: 'Token utilizado com sucesso. Seu usuário foi vinculado ao vendedor.'
      });
    } catch (error) {
      console.error('Erro ao usar token de vendedor:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Desativar um token específico (apenas administradores)
   * @param {*} req Requisição
   * @param {*} res Resposta
   * @returns {Object} Resultado da desativação
   */
  async desativarToken(req, res) {
    try {
      // Apenas administradores podem desativar tokens
      if (req.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acesso não autorizado'
        });
      }

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID do token é obrigatório'
        });
      }

      // Verificar se o token existe
      const token = await db('vendedor_token')
        .where('id', id)
        .first();

      if (!token) {
        return res.status(404).json({
          success: false,
          message: 'Token não encontrado'
        });
      }

      // Atualizar token como inativo
      await db('vendedor_token')
        .where('id', id)
        .update({
          ativo: false
        });

      return res.json({
        success: true,
        message: 'Token desativado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao desativar token de vendedor:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}; 