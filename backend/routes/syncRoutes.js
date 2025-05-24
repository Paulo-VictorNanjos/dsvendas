const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const connection = require('../database/connection');
const syncService = require('../services/syncService');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

// Rota para obter o status da sincronização
router.get('/status', async (req, res) => {
  try {
    const status = await syncService.getSyncStatus();
    return res.json(status);
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Rota para sincronizar dados do ERP para o sistema web
router.post('/from-erp', async (req, res) => {
  try {
    const result = await syncService.syncFromERP();
    return res.json(result);
  } catch (error) {
    console.error('Erro na sincronização:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Rota para sincronizar dados do sistema web para o ERP
router.post('/to-erp', async (req, res) => {
  try {
    const result = await syncService.syncToERP();
    return res.json(result);
  } catch (error) {
    console.error('Erro na sincronização:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Rota para executar script de sincronização fiscal
router.post('/fiscal', (req, res) => {
  const scriptPath = path.resolve(__dirname, '../scripts/sincronizar_regras_fiscais.js');
  
  console.log(`Executando script: ${scriptPath}`);
  
  exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Erro ao executar script: ${error.message}`);
      return res.status(500).json({ 
        success: false, 
        error: error.message,
        stdout,
        stderr
      });
    }
    
    return res.json({ 
      success: true, 
      message: 'Sincronização fiscal executada com sucesso',
      details: stdout
    });
  });
});

// Rota para verificar o status da sincronização fiscal
router.get('/fiscal/status', async (req, res) => {
  try {
    // Verificar dados nas tabelas fiscais
    const knex = require('../database/connection');
    const regrasFiscais = await knex('regras_icms').count('* as count').first();
    const classeFiscal = await knex('class_fiscal_dados').count('* as count').first();
    const regrasProdutos = await knex('regras_fiscais_produtos').count('* as count').first();
    
    // Obter últimos logs de sincronização
    const logs = await knex('log_sincronizacao')
      .where('entidade', 'FISCAL')
      .orderBy('data_sincronizacao', 'desc')
      .limit(5);
    
    return res.json({
      success: true,
      tabelas: {
        regras_icms: parseInt(regrasFiscais.count) || 0,
        class_fiscal_dados: parseInt(classeFiscal.count) || 0,
        regras_fiscais_produtos: parseInt(regrasProdutos.count) || 0
      },
      ultima_sincronizacao: logs.length > 0 ? logs[0].data_sincronizacao : null,
      logs
    });
  } catch (error) {
    console.error('Erro ao verificar status fiscal:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Rota para converter orçamento em pedido
router.post('/convert-to-order/:quotationId', syncController.convertToSalesOrder);

// Rota para obter logs de sincronização
router.get('/logs', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const logs = await connection('log_sincronizacao')
      .select('*')
      .orderBy('data_sincronizacao', 'desc')
      .limit(limit);
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter logs de sincronização',
      error: error.message
    });
  }
});

// Rota para obter logs de sincronização relacionados a métodos de pagamento
router.get('/logs/payment-methods', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const logs = await connection('log_sincronizacao')
      .select('*')
      .where('direcao', 'PAYMENT_METHODS')
      .orWhere('entidade', 'PAGAMENTO')
      .orderBy('data_sincronizacao', 'desc')
      .limit(limit);
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter logs de métodos de pagamento',
      error: error.message
    });
  }
});

// Rota para sincronizar apenas dados de pagamento (formas e condições)
router.post('/payment-methods', async (req, res) => {
  try {
    console.log('[INFO] Iniciando sincronização de métodos de pagamento');
    
    // Registrar início da sincronização no log
    await syncService.logSync('PAYMENT_METHODS', 'INICIADO', 'Iniciando sincronização de formas e condições de pagamento');
    
    // Verificar tabelas disponíveis no ERP
    let formasPagamento = [];
    try {
      formasPagamento = await syncService.getFormasFromERP();
    } catch (error) {
      console.log('[INFO] Erro ao buscar formas de pagamento do ERP:', error.message);
      await syncService.logSync('PAYMENT_METHODS', 'ERRO', `Erro ao buscar formas de pagamento: ${error.message}`);
    }

    // Inserir formas de pagamento (sempre inserir as padrão para garantir)
    const formasPadrao = [
      { codigo: 1, descricao: 'DINHEIRO', cod_status: 1, cod_empresa: 1 },
      { codigo: 4, descricao: 'CARTAO CREDITO', cod_status: 1, cod_empresa: 1 },
      { codigo: 5, descricao: 'CARTAO DEBITO', cod_status: 1, cod_empresa: 1 },
      { codigo: 7, descricao: 'BOLETO BANCARIO', cod_status: 1, cod_empresa: 1 },
      { codigo: 12, descricao: 'PIX', cod_status: 1, cod_empresa: 1 }
    ];

    // Combinar formas do ERP com as padrão
    const todasFormas = [...formasPagamento];
    formasPadrao.forEach(formaPadrao => {
      if (!todasFormas.find(f => String(f.codigo) === String(formaPadrao.codigo))) {
        todasFormas.push(formaPadrao);
      }
    });

    // Buscar condições de pagamento do ERP
    let condicoesPagamento = [];
    try {
      condicoesPagamento = await syncService.getCondPagtoFromERP();
    } catch (error) {
      console.log('[INFO] Erro ao buscar condições de pagamento do ERP:', error.message);
    }

    // Inserir condições de pagamento (sempre inserir as padrão para garantir)
    const condicoesPadrao = [
      { codigo: 1, descricao: 'A VISTA', parcelas: 1, cod_status: 1, cod_empresa: 1 },
      { codigo: 3, descricao: '30 DIAS', parcelas: 1, cod_status: 1, cod_empresa: 1 },
      { codigo: 4, descricao: '30/60 DIAS', parcelas: 2, cod_status: 1, cod_empresa: 1 },
      { codigo: 5, descricao: '30/60/90 DIAS', parcelas: 3, cod_status: 1, cod_empresa: 1 },
      { codigo: 6, descricao: '07/14/21 DIAS', parcelas: 3, cod_status: 1, cod_empresa: 1 },
      { codigo: 7, descricao: '30/45/60/75/90 DIAS', parcelas: 5, cod_status: 1, cod_empresa: 1 }
    ];

    // Combinar condições do ERP com as padrão
    const todasCondicoes = [...condicoesPagamento];
    condicoesPadrao.forEach(condicaoPadrao => {
      if (!todasCondicoes.find(c => String(c.codigo) === String(condicaoPadrao.codigo))) {
        todasCondicoes.push(condicaoPadrao);
      }
    });

    // Atualizar banco local
    await syncService.updatePaymentMethods(todasFormas, todasCondicoes);
    
    // Registrar conclusão da sincronização no log
    await syncService.logSync('PAYMENT_METHODS', 'CONCLUIDO', 
      `Sincronização concluída: ${todasFormas.length} formas de pagamento e ${todasCondicoes.length} condições de pagamento`);

    res.json({ 
      success: true, 
      message: 'Métodos de pagamento sincronizados com sucesso',
      formas: todasFormas.length,
      condicoes: todasCondicoes.length
    });
  } catch (error) {
    console.error('Erro ao sincronizar métodos de pagamento:', error);
    
    // Registrar erro no log
    await syncService.logSync('PAYMENT_METHODS', 'ERRO', `Erro na sincronização: ${error.message}`);
    
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao sincronizar métodos de pagamento',
      error: error.message
    });
  }
});

// Rota para sincronizar dados fiscais (regras ICMS, classificações fiscais, etc.)
router.post('/fiscal-data', async (req, res) => {
  try {
    console.log('[INFO] Iniciando sincronização de dados fiscais');
    
    // Registrar início da sincronização no log
    await syncService.logSync('FISCAL_DATA', 'INICIADO', 'Iniciando sincronização de dados fiscais');
    
    // Executar sincronização de dados fiscais
    const result = await syncService.syncFiscalData();
    
    // Registrar conclusão da sincronização no log
    await syncService.logSync('FISCAL_DATA', 'CONCLUIDO', 
      `Sincronização concluída: ${result.regrasFiscais} regras ICMS, ${result.classeFiscal} classificações fiscais, ${result.regrasProdutos} regras de produtos, ${result.produtosAtualizados} produtos atualizados`);
    
    res.json({
      success: true,
      message: 'Dados fiscais sincronizados com sucesso',
      result
    });
  } catch (error) {
    console.error('Erro ao sincronizar dados fiscais:', error);
    
    // Registrar erro no log
    await syncService.logSync('FISCAL_DATA', 'ERRO', `Erro na sincronização de dados fiscais: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Erro ao sincronizar dados fiscais',
      error: error.message
    });
  }
});

module.exports = router; 