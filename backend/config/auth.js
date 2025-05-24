module.exports = {
  jwt: {
    secret: process.env.JWT_SECRET || '34649813',
    expiresIn: '1d' // Token expira em 1 dia
  },
  
  // Configurações de senha
  password: {
    saltRounds: 10 // Número de rounds para o bcrypt
  }
}; 