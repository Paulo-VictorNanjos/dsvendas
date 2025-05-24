const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const syncController = require('./controllers/syncController');
const produtoRoutes = require('./routes/produtoRoutes');
const pedidoRoutes = require('./routes/pedidoRoutes');
const fiscalRoutes = require('./routes/fiscalRoutes');
const apiRoutes = require('./routes/apiRoutes');
const syncRoutes = require('./routes/syncRoutes');
const notasFiscaisRoutes = require('./routes/notasFiscaisRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api', apiRoutes);

// Feature-specific Routes
app.use('/api/produtos', produtoRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/fiscal', fiscalRoutes);
app.use('/api/notas-fiscais', notasFiscaisRoutes);

// Rotas de sincronização
app.use('/sync', syncRoutes);

// Rotas de sincronização (legacy - para manter compatibilidade)
app.get('/api/sync/status', syncController.getSyncStatus);
app.post('/api/sync/from-erp', syncController.syncFromERP);
app.post('/api/sync/to-erp', syncController.syncToERP);
app.post('/api/quotations/:quotationId/convert', syncController.convertToSalesOrder);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Erro não tratado:', err);
  res.status(500).json({ 
    success: false,
    error: 'Erro interno do servidor',
    message: err.message 
  });
});

module.exports = app; 