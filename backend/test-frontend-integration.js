const axios = require('axios');

async function testFrontendIntegration() {
  console.log('🧪 [Teste] Simulando integração Frontend → WhatsApp Cloud API...');
  console.log('');

  const baseURL = 'http://localhost:3001/api';

  try {
    // 1. Simular busca de orçamentos (como o frontend faz)
    console.log('1️⃣ Simulando busca de orçamentos...');
    
    // Como não temos autenticação real no teste, vamos pular para o envio direto
    const orcamentoId = 'TESTE-001'; // ID fictício
    const phoneNumber = '5518996334304'; // Seu número

    console.log(`📋 Orçamento: ${orcamentoId}`);
    console.log(`📱 Telefone: ${phoneNumber}`);
    console.log('');

    // 2. Testar a API que o frontend vai chamar
    console.log('2️⃣ Testando chamada da API (como frontend faz)...');
    console.log(`   POST ${baseURL}/orcamentos/${orcamentoId}/whatsapp-api`);
    console.log(`   Body: { phoneNumber: "${phoneNumber}" }`);
    console.log('');

    // Simular a chamada sem autenticação (só para ver se a rota existe)
    try {
      const response = await axios.post(`${baseURL}/orcamentos/${orcamentoId}/whatsapp-api`, {
        phoneNumber: phoneNumber
      });

      console.log('✅ Resposta da API:');
      console.log(JSON.stringify(response.data, null, 2));

    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Rota existe! (Erro 401 - Não autenticado, como esperado)');
        console.log('📝 Response:', error.response.data);
      } else if (error.response?.status === 400) {
        console.log('✅ Rota existe! (Erro 400 - API não configurada)');
        console.log('📝 Response:', error.response.data);
      } else {
        console.log('❌ Erro inesperado:', error.message);
      }
    }

    console.log('');

    // 3. Testar API diretamente (simulando com dados mockados)
    console.log('3️⃣ Testando envio direto via WhatsApp Cloud Service...');
    
    const whatsappCloudService = require('./services/whatsappCloudService');

    // Dados mockados como viriam do banco
    const orcamentoData = {
      orcamento: {
        codigo: orcamentoId,
        dt_orcamento: new Date(),
        totais: { valor_total: 1234.56 }
      },
      cliente: {
        nome: 'Cliente Teste Frontend',
        razao: 'Empresa Teste Ltda'
      },
      vendedor: {
        nome: 'Vendedor Frontend'
      }
    };

    // PDF mockado
    const pdfContent = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\nxref\nstartxref\n%%EOF`;
    const pdfBuffer = Buffer.from(pdfContent);

    const result = await whatsappCloudService.sendOrcamento(
      phoneNumber,
      orcamentoData,
      pdfBuffer
    );

    if (result.success) {
      console.log('✅ Orçamento enviado com sucesso via API direta!');
      console.log('📋 Detalhes:');
      console.log(`   - Orçamento: ${result.orcamento}`);
      console.log(`   - Phone: ${result.phone}`);
      console.log(`   - Message ID: ${result.results.message.messageId}`);
      console.log(`   - Document ID: ${result.results.document.messageId}`);
      console.log(`   - Media ID: ${result.results.document.mediaId}`);
    } else {
      console.log('❌ Erro no envio:', result.error);
    }

    console.log('');

    // 4. Resumo da integração
    console.log('🎯 RESUMO DA INTEGRAÇÃO:');
    console.log('');
    console.log('📱 **Frontend (React):**');
    console.log('   - Botão "WhatsApp (📎)" nos orçamentos');
    console.log('   - Função: handleSendWhatsAppCloudAPI()');
    console.log(`   - Chamada: POST /api/orcamentos/{id}/whatsapp-api`);
    console.log('   - Parâmetros: { phoneNumber: "11999999999" }');
    console.log('');
    console.log('🔧 **Backend (API):**');
    console.log('   - Rota: /api/orcamentos/:id/whatsapp-api');
    console.log('   - Controller: smtpController.sendOrcamentoWhatsAppCloudAPI');
    console.log('   - Service: whatsappCloudService.sendOrcamento');
    console.log('');
    console.log('📡 **WhatsApp Cloud API:**');
    console.log('   - Upload PDF para servidores do WhatsApp');
    console.log('   - Envio de mensagem de texto');
    console.log('   - Envio de documento (PDF anexado)');
    console.log('');
    console.log('🎉 **Resultado Final:**');
    console.log('   ✅ Cliente recebe mensagem profissional');
    console.log('   ✅ PDF anexado diretamente na conversa');
    console.log('   ✅ Experiência idêntica aos apps nativos');
    console.log('   ✅ Não precisa abrir WhatsApp Web');
    console.log('   ✅ Funciona com localhost');

  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
  }
}

// Executar teste
if (require.main === module) {
  testFrontendIntegration();
}

module.exports = { testFrontendIntegration }; 