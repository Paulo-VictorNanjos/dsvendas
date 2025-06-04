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
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();

// Configurar timeout para requisições longas (5 minutos)
app.use((req, res, next) => {
  // Aumentar timeout para 5 minutos (300000ms)
  req.setTimeout(300000);
  res.setTimeout(300000);
  next();
});

// Configuração do CORS mais permissiva
app.use(cors({
  origin: true, // Permite todas as origens
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Parser JSON
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir arquivos estáticos
app.use('/public', express.static('public'));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Middleware para adicionar headers CORS em todas as respostas
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept');
  
  // Intercepta requisições OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }
  next();
});

// Rotas públicas primeiro (que não requerem autenticação)
app.use('/api/erp', erpRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/webhook', webhookRoutes);

// Rotas protegidas depois (com autenticação via apiRoutes)
app.use('/api', apiRoutes);
app.use('/api/fiscal', fiscalRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/notas-fiscais', notasFiscaisRoutes);

// Middleware para tratar rotas não encontradas
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada'
  });
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error(`Erro: ${err.message}`);
  console.error(err.stack);

  // Erro de validação
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Erro de validação',
      errors: err.errors
    });
  }

  // Erro de autenticação
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Não autorizado'
    });
  }

  // Erro interno do servidor
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Inicializar serviço de configurações
const configService = require('./services/configurationService');

// Inicializar sistema de PDFs temporários para WhatsApp
global.tempPdfs = global.tempPdfs || new Map();
console.log('📄 Sistema de PDFs temporários inicializado');

// Iniciar o servidor
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, async () => {
  console.log(`🚀 Servidor rodando em http://${HOST}:${PORT}`);
  console.log(`📝 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  
  // Inicializar serviço de configurações
  try {
    await configService.initialize();
    console.log('✅ Serviço de configurações inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar serviço de configurações:', error);
  }
}); 