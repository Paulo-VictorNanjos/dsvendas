const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');
const db = require('../database/connection');

// Middleware para autenticar token
const authenticateToken = async (req, res, next) => {
  try {
    // Pegar o token do header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token não fornecido' 
      });
    }

    // Formato do token: Bearer <token>
    const [, token] = authHeader.split(' ');

    try {
      // Verificar se o token é válido
      const decoded = jwt.verify(token, authConfig.jwt.secret);

      // Adicionar o ID do usuário ao request
      req.userId = decoded.id;
      req.userRole = decoded.role;

      // Buscar vendedor vinculado ao usuário
      const vendedorVinculo = await db('usuario_vendedor')
        .where('usuario_id', decoded.id)
        .join('vendedores', 'usuario_vendedor.vendedor_codigo', 'vendedores.codigo')
        .select('vendedores.*')
        .first();

      if (vendedorVinculo) {
        req.vendedor = vendedorVinculo;
      }

      return next();
    } catch (err) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token inválido' 
      });
    }
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Middleware para verificar se o usuário é administrador
const isAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acesso não autorizado. Apenas administradores podem realizar esta ação.'
    });
  }
  
  return next();
};

module.exports = {
  authenticateToken,
  isAdmin
}; 