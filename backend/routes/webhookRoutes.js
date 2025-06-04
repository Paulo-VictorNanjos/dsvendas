const express = require('express');
const router = express.Router();
const whatsappInboundService = require('../services/whatsappInboundService');

/**
 * Verificação do webhook (Facebook/WhatsApp exige)
 */
router.get('/whatsapp', (req, res) => {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'DSVENDAS_WEBHOOK_TOKEN';
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('🔐 [Webhook] Verificação recebida:', { mode, token });

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ [Webhook] Token verificado com sucesso!');
    res.status(200).send(challenge);
  } else {
    console.log('❌ [Webhook] Token inválido!');
    res.sendStatus(403);
  }
});

/**
 * Receber mensagens do WhatsApp
 */
router.post('/whatsapp', async (req, res) => {
  try {
    console.log('📥 [Webhook] Mensagem recebida:', JSON.stringify(req.body, null, 2));

    const { entry } = req.body;

    if (entry && entry[0] && entry[0].changes && entry[0].changes[0]) {
      const change = entry[0].changes[0];
      
      if (change.field === 'messages' && change.value.messages) {
        const messages = change.value.messages;
        
        for (const message of messages) {
          await processMessage(message);
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ [Webhook] Erro ao processar mensagem:', error);
    res.status(500).send('Error');
  }
});

/**
 * Processar mensagem individual
 */
async function processMessage(message) {
  try {
    const { from, text, type } = message;
    
    console.log(`📱 [Webhook] Processando mensagem de ${from}:`, { type, text: text?.body });

    // Só processar mensagens de texto
    if (type === 'text' && text && text.body) {
      const phoneNumber = from;
      const messageText = text.body;

      // Processar via serviço de entrada
      await whatsappInboundService.processIncomingMessage(phoneNumber, messageText);
    } else {
      console.log(`⏭️ [Webhook] Tipo de mensagem ignorado: ${type}`);
    }

  } catch (error) {
    console.error('❌ [Webhook] Erro ao processar mensagem individual:', error);
  }
}

/**
 * Testar processamento manual (para desenvolvimento)
 */
router.post('/whatsapp/test', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        message: 'phoneNumber e message são obrigatórios'
      });
    }

    console.log(`🧪 [Webhook Test] Testando processamento: ${phoneNumber} → "${message}"`);

    await whatsappInboundService.processIncomingMessage(phoneNumber, message);

    res.json({
      success: true,
      message: 'Mensagem processada com sucesso!',
      data: { phoneNumber, message }
    });

  } catch (error) {
    console.error('❌ [Webhook Test] Erro no teste:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar teste',
      error: error.message
    });
  }
});

/**
 * Status do webhook
 */
router.get('/whatsapp/status', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook WhatsApp funcionando!',
    timestamp: new Date().toISOString(),
    endpoints: {
      verification: 'GET /api/webhook/whatsapp',
      messages: 'POST /api/webhook/whatsapp',
      test: 'POST /api/webhook/whatsapp/test'
    },
    example: {
      test: {
        url: '/api/webhook/whatsapp/test',
        method: 'POST',
        body: {
          phoneNumber: '5511999999999',
          message: 'Código: 12345'
        }
      }
    }
  });
});

module.exports = router; 