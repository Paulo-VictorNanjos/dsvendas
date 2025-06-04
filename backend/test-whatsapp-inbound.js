const axios = require('axios');

async function testWhatsAppInbound() {
  console.log('🧪 [Teste] Sistema de WhatsApp Inbound - Busca por Código do Cliente');
  console.log('');

  const baseUrl = 'http://localhost:3001';

  // Cenários de teste
  const testCases = [
    {
      name: 'Cliente com código específico',
      phoneNumber: '5518996334304',
      message: 'Código: 12345',
      expected: 'Buscar orçamentos do cliente 12345'
    },
    {
      name: 'Cliente digitando só o número',
      phoneNumber: '5518996334304',
      message: '54321',
      expected: 'Buscar orçamentos do cliente 54321'
    },
    {
      name: 'Cliente pedindo orçamento específico',
      phoneNumber: '5518996334304',
      message: 'Orçamento 67890',
      expected: 'Buscar orçamento específico 67890'
    },
    {
      name: 'Cliente sem código',
      phoneNumber: '5518996334304',
      message: 'Oi, quero meu orçamento',
      expected: 'Enviar instruções de uso'
    },
    {
      name: 'Cliente formato completo',
      phoneNumber: '5518996334304',
      message: 'Cliente 99999 orçamento 12345',
      expected: 'Buscar cliente 99999 e orçamento 12345'
    }
  ];

  try {
    // 1. Verificar se o webhook está funcionando
    console.log('1️⃣ Verificando status do webhook...');
    
    try {
      const statusResponse = await axios.get(`${baseUrl}/api/webhook/whatsapp/status`);
      
      if (statusResponse.data.success) {
        console.log('✅ Webhook funcionando!');
        console.log('📋 Endpoints disponíveis:');
        Object.entries(statusResponse.data.endpoints).forEach(([key, endpoint]) => {
          console.log(`   - ${key}: ${endpoint}`);
        });
      }
    } catch (error) {
      console.log('❌ Erro ao verificar webhook:', error.message);
      console.log('💡 Certifique-se que o servidor está rodando!');
      return;
    }

    console.log('');

    // 2. Testar cada cenário
    console.log('2️⃣ Testando cenários de mensagens...');
    console.log('');

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      console.log(`📱 Teste ${i + 1}: ${testCase.name}`);
      console.log(`   📞 Número: ${testCase.phoneNumber}`);
      console.log(`   💬 Mensagem: "${testCase.message}"`);
      console.log(`   🎯 Esperado: ${testCase.expected}`);
      
      try {
        const response = await axios.post(`${baseUrl}/api/webhook/whatsapp/test`, {
          phoneNumber: testCase.phoneNumber,
          message: testCase.message
        });

        if (response.data.success) {
          console.log(`   ✅ Processado com sucesso!`);
        } else {
          console.log(`   ❌ Erro: ${response.data.message}`);
        }

      } catch (error) {
        console.log(`   ❌ Erro na requisição: ${error.response?.data?.message || error.message}`);
      }

      console.log('');
      
      // Aguardar um pouco entre os testes
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 3. Exemplo de uso real
    console.log('3️⃣ Exemplo de uso real...');
    console.log('');
    
    console.log('💡 **Como configurar o webhook no Facebook/WhatsApp:**');
    console.log('');
    console.log('📋 1. Acesse Facebook Developers:');
    console.log('   https://developers.facebook.com/apps/');
    console.log('');
    console.log('📋 2. Vá em WhatsApp > Configuration > Webhook:');
    console.log(`   Callback URL: https://seudominio.com/api/webhook/whatsapp`);
    console.log(`   Verify Token: DSVENDAS_WEBHOOK_TOKEN`);
    console.log('');
    console.log('📋 3. Subscribe to: messages');
    console.log('');
    console.log('🔧 4. Adicione no .env:');
    console.log('   WHATSAPP_VERIFY_TOKEN=DSVENDAS_WEBHOOK_TOKEN');
    console.log('');

    // 4. Fluxo completo de exemplo
    console.log('4️⃣ Fluxo completo de exemplo:');
    console.log('');
    console.log('👤 Cliente: "Código: 12345"');
    console.log('🔍 Sistema: Busca cliente 12345 no banco');
    console.log('📋 Sistema: Busca orçamentos do cliente 12345');
    console.log('🤖 Sistema: Envia lista ou orçamento automaticamente');
    console.log('📄 Cliente: Recebe PDF anexado diretamente!');
    console.log('');
    
    console.log('🎯 **Vantagens:**');
    console.log('✅ Cliente inicia a conversa = GRATUITO (Service conversation)');
    console.log('✅ Busca automática por código do cliente');
    console.log('✅ PDF anexado diretamente');
    console.log('✅ Experiência profissional e automatizada');
    console.log('✅ Sem intervenção manual necessária');

  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
  }
}

// Executar teste
if (require.main === module) {
  testWhatsAppInbound();
}

module.exports = { testWhatsAppInbound }; 