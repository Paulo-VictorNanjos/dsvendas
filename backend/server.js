require('dotenv').config();
const express = require('express');
const cors = require('cors');
const syncRoutes = require('./routes/syncRoutes');
const apiRoutes = require('./routes/apiRoutes');
const fiscalRoutes = require('./routes/fiscalRoutes');
const pedidoRoutes = require('./routes/pedidoRoutes');
const itemRoutes = require('./routes/itemRoutes');
const erpRoutes = require('./routes/erpRoutes');
const notasFiscaisRoutes = require('./routes/notasFiscaisRoutes');

const app = express();

// Configurar timeout para requisições longas (5 minutos)
app.use((req, res, next) => {
  // Aumentar timeout para 5 minutos (300000ms)
  req.setTimeout(300000);
  res.setTimeout(300000);
  next();
});

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Rotas públicas primeiro (que não requerem autenticação)
app.use('/api/erp', erpRoutes);
app.use('/api/sync', syncRoutes);

// Rotas protegidas depois (com autenticação via apiRoutes)
app.use('/api', apiRoutes);
app.use('/api/fiscal', fiscalRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/notas-fiscais', notasFiscaisRoutes);

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Inicializar serviço de configurações
const configService = require('./services/configurationService');

// Iniciar o servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Servidor rodando na porta ${PORT} em todas as interfaces de rede`);
  
  // Inicializar serviço de configurações
  try {
    await configService.initialize();
    console.log('✅ Serviço de configurações inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar serviço de configurações:', error);
  }
}); 