const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../database/connection');
const authConfig = require('../config/auth');

module.exports = {
  async register(req, res) {
    try {
      const { nome, email, senha } = req.body;

      // Validar dados de entrada
      if (!nome || !email || !senha) {
        return res.status(400).json({
          success: false,
          message: 'Nome, email e senha são obrigatórios'
        });
      }

      // Verificar se o email já está em uso
      const usuarioExistente = await db('usuarios')
        .where('email', email)
        .first();

      if (usuarioExistente) {
        return res.status(400).json({
          success: false,
          message: 'Este email já está em uso'
        });
      }

      // Criptografar a senha
      const salt = await bcrypt.genSalt(10);
      const senhaCriptografada = await bcrypt.hash(senha, salt);

      // Inserir o novo usuário
      const [usuarioId] = await db('usuarios').insert({
        nome,
        email,
        senha: senhaCriptografada,
        role: 'vendedor', // Role padrão para novos usuários
        ativo: true,
        dt_inc: db.fn.now()
      }, ['id']);

      // Buscar o usuário recém criado
      const novoUsuario = await db('usuarios')
        .where('id', usuarioId.id || usuarioId)
        .first();

      // Remover a senha do objeto de retorno
      delete novoUsuario.senha;

      // Gerar token JWT
      const token = jwt.sign(
        { 
          id: novoUsuario.id,
          nome: novoUsuario.nome,
          email: novoUsuario.email,
          role: novoUsuario.role
        },
        authConfig.jwt.secret,
        { expiresIn: authConfig.jwt.expiresIn }
      );

      return res.status(201).json({
        success: true,
        message: 'Usuário registrado com sucesso',
        usuario: novoUsuario,
        token
      });
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  async login(req, res) {
    try {
      const { email, senha } = req.body;

      // Validar dados de entrada
      if (!email || !senha) {
        return res.status(400).json({
          success: false,
          message: 'Email e senha são obrigatórios'
        });
      }

      // Buscar usuário pelo email
      const usuario = await db('usuarios')
        .where('email', email)
        .first();

      if (!usuario) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Verificar se a senha está correta
      const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

      if (!senhaCorreta) {
        return res.status(401).json({
          success: false,
          message: 'Senha incorreta'
        });
      }

      // Buscar vendedor vinculado
      const vendedor = await db('usuario_vendedor')
        .where('usuario_id', usuario.id)
        .join('vendedores', 'usuario_vendedor.vendedor_codigo', 'vendedores.codigo')
        .select('vendedores.*')
        .first();

      // Gerar token JWT
      const token = jwt.sign(
        { 
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          role: usuario.role,
          vendedor_codigo: vendedor ? vendedor.codigo : null
        },
        authConfig.jwt.secret,
        { expiresIn: authConfig.jwt.expiresIn }
      );

      // Atualizar último login
      await db('usuarios')
        .where('id', usuario.id)
        .update({
          ultimo_login: db.fn.now(),
          dt_alt: db.fn.now()
        });

      // Remover senha do objeto de retorno
      delete usuario.senha;

      return res.json({
        success: true,
        usuario: {
          ...usuario,
          vendedor: vendedor || null
        },
        token
      });
    } catch (error) {
      console.error('Erro no login:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  async verificarToken(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token não fornecido'
        });
      }

      try {
        // Verificar se o token é válido
        const decoded = jwt.verify(token, authConfig.jwt.secret);

        // Buscar usuário com vendedor vinculado
        const usuario = await db('usuarios')
          .where('usuarios.id', decoded.id)
          .leftJoin('usuario_vendedor', 'usuarios.id', 'usuario_vendedor.usuario_id')
          .leftJoin('vendedores', 'usuario_vendedor.vendedor_codigo', 'vendedores.codigo')
          .select(
            'usuarios.*',
            'vendedores.codigo as vendedor_codigo',
            'vendedores.nome as vendedor_nome'
          )
          .first();

        if (!usuario) {
          return res.status(401).json({
            success: false,
            message: 'Usuário não encontrado'
          });
        }

        // Remover senha do objeto de retorno
        delete usuario.senha;

        // Estruturar objeto de vendedor se existir
        const vendedor = usuario.vendedor_codigo ? {
          codigo: usuario.vendedor_codigo,
          nome: usuario.vendedor_nome
        } : null;

        // Remover campos do vendedor do objeto principal
        delete usuario.vendedor_codigo;
        delete usuario.vendedor_nome;

        return res.json({
          success: true,
          usuario: {
            ...usuario,
            vendedor
          }
        });
      } catch (err) {
        return res.status(401).json({
          success: false,
          message: 'Token inválido'
        });
      }
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}; 