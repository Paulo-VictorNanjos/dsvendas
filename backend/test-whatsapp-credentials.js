const axios = require('axios');
const whatsappConfig = require('./config/whatsapp');

async function testWhatsAppCredentials() {
  try {
    console.log('🧪 [Teste] Verificando credenciais do WhatsApp Cloud API...');
    console.log('');
    
    // Mostrar configuração
    console.log('📋 Configuração atual:');
    console.log(`   - Phone Number ID: ${whatsappConfig.WHATSAPP_PHONE_NUMBER_ID}`);
    console.log(`   - Access Token: ${whatsappConfig.WHATSAPP_ACCESS_TOKEN.substring(0, 20)}...`);
    console.log(`   - API Version: ${whatsappConfig.WHATSAPP_API_VERSION}`);
    console.log('');
    
    // Teste 1: Verificar se o token está válido
    console.log('1️⃣ Testando validade do token...');
    const baseURL = `https://graph.facebook.com/${whatsappConfig.WHATSAPP_API_VERSION}`;
    
    try {
      const response = await axios.get(
        `${baseURL}/${whatsappConfig.WHATSAPP_PHONE_NUMBER_ID}`,
        {
          headers: {
            'Authorization': `Bearer ${whatsappConfig.WHATSAPP_ACCESS_TOKEN}`
          }
        }
      );
      
      console.log('✅ Token válido! Informações da conta:');
      console.log(`   - Nome: ${response.data.display_phone_number || 'N/A'}`);
      console.log(`   - Status: ${response.data.verified_name || 'Verificado'}`);
      console.log(`   - ID: ${response.data.id}`);
      
    } catch (error) {
      console.log('❌ Erro ao verificar token:', error.response?.data?.error?.message || error.message);
      return false;
    }
    
    console.log('');
    
    // Teste 2: Enviar mensagem de teste (template hello_world)
    console.log('2️⃣ Testando envio de mensagem template...');
    
    try {
      const templateResponse = await axios.post(
        `${baseURL}/${whatsappConfig.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: '5518996334304', // Seu número
          type: 'template',
          template: {
            name: 'hello_world',
            language: {
              code: 'en_US'
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${whatsappConfig.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Mensagem template enviada com sucesso!');
      console.log(`   - Message ID: ${templateResponse.data.messages[0].id}`);
      console.log(`   - Status: ${templateResponse.data.messages[0].message_status || 'sent'}`);
      
    } catch (error) {
      console.log('❌ Erro ao enviar template:', error.response?.data?.error?.message || error.message);
      if (error.response?.data?.error?.error_data?.details) {
        console.log('   Detalhes:', error.response.data.error.error_data.details);
      }
    }
    
    console.log('');
    
    // Teste 3: Verificar configuração do servidor local
    console.log('3️⃣ Testando servidor local...');
    
    try {
      const serverResponse = await axios.get('http://localhost:3001/api/whatsapp-api/test');
      
      if (serverResponse.data.success) {
        console.log('✅ Servidor local configurado corretamente!');
        console.log('   - API funcionando');
        console.log('   - Credenciais carregadas');
      } else {
        console.log('❌ Problema no servidor local:', serverResponse.data.message);
      }
      
    } catch (error) {
      console.log('⚠️ Servidor local não está rodando ou não configurado');
      console.log('   Para testar: npm start e acesse http://localhost:3001/api/whatsapp-api/test');
    }
    
    console.log('');
    console.log('🎉 Teste concluído! Se os passos 1 e 2 funcionaram, sua API está configurada corretamente.');
    console.log('📱 Você deve ter recebido uma mensagem "Hello World" no WhatsApp!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
    return false;
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  testWhatsAppCredentials();
}

module.exports = { testWhatsAppCredentials }; 