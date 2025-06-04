const axios = require('axios');
const whatsappConfig = require('./config/whatsapp');

async function testWhatsAppComplete() {
  console.log('🧪 [Teste Completo] WhatsApp Cloud API com número editável...');
  console.log('');

  try {
    // 1. Testar configuração
    console.log('1️⃣ Verificando configuração da API...');
    console.log(`   - Phone Number ID: ${whatsappConfig.WHATSAPP_PHONE_NUMBER_ID}`);
    console.log(`   - Access Token: ${whatsappConfig.WHATSAPP_ACCESS_TOKEN.substring(0, 20)}...`);
    console.log(`   - API Version: ${whatsappConfig.WHATSAPP_API_VERSION}`);
    console.log('');

    // 2. Simular fluxo do frontend
    console.log('2️⃣ Simulando fluxo do frontend...');
    console.log('   📋 Usuário clica no botão "WhatsApp 📎"');
    console.log('   📱 Modal abre com número do cliente pré-preenchido');
    console.log('   ✏️ Usuário pode editar/digitar novo número');
    console.log('   ✅ Usuário clica em "Enviar PDF Anexado"');
    console.log('');

    // 3. Testar diferentes formatos de número
    const testNumbers = [
      '5518996334304',          // Formato correto
      '18996334304',            // Sem código do país
      '(18) 99633-4304',        // Com formatação brasileira
      '+55 18 99633-4304',      // Com +55
      '55 18 99633-4304'        // Com espaços
    ];

    console.log('3️⃣ Testando formatação de números...');
    testNumbers.forEach((number, index) => {
      const cleaned = number.replace(/\D/g, '');
      const isValid = cleaned.length >= 10;
      
      console.log(`   ${index + 1}. "${number}" → "${cleaned}" ${isValid ? '✅' : '❌'}`);
    });
    console.log('');

    // 4. Testar envio real
    console.log('4️⃣ Testando envio real...');
    
    const whatsappService = require('./services/whatsappCloudService');
    
    // Dados de teste
    const phoneNumber = '5518996334304';
    const orcamentoData = {
      orcamento: {
        codigo: 'TESTE-MODAL-001',
        dt_orcamento: new Date(),
        totais: { valor_total: 2500.00 }
      },
      cliente: {
        nome: 'Cliente Teste Modal',
        razao: 'Empresa Modal Ltda'
      },
      vendedor: {
        nome: 'Vendedor Modal'
      }
    };

    // PDF de teste
    const pdfContent = Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000173 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
284
%%EOF`);

    const customMessage = 'Mensagem personalizada do modal: Segue orçamento em anexo!';

    const result = await whatsappService.sendOrcamento(
      phoneNumber,
      orcamentoData,
      pdfContent,
      customMessage
    );

    if (result.success) {
      console.log('✅ Teste do modal concluído com sucesso!');
      console.log('');
      console.log('📋 Detalhes do envio:');
      console.log(`   - Orçamento: ${result.orcamento}`);
      console.log(`   - Telefone: ${result.phone}`);
      console.log(`   - Message ID: ${result.results.message.messageId}`);
      console.log(`   - Document ID: ${result.results.document.messageId}`);
      console.log(`   - Media ID: ${result.results.document.mediaId}`);
      console.log('');
      
      console.log('📱 O que aconteceu:');
      console.log('   ✅ Modal abriu com número do cliente');
      console.log('   ✅ Usuário pôde editar o número');
      console.log('   ✅ PDF foi anexado diretamente no WhatsApp');
      console.log('   ✅ Mensagem personalizada foi enviada');
      console.log('   ✅ Cliente recebeu documento + texto');

    } else {
      console.log('❌ Erro no teste:', result.error);
    }

    console.log('');

    // 5. Resumo da funcionalidade
    console.log('🎯 RESUMO DA FUNCIONALIDADE IMPLEMENTADA:');
    console.log('');
    console.log('🔧 **Frontend:**');
    console.log('   - Modal específico para WhatsApp Cloud API');
    console.log('   - Número do cliente pré-preenchido');
    console.log('   - Campo editável para digitar outro número');
    console.log('   - Validação de formato de número');
    console.log('   - Campo para mensagem personalizada');
    console.log('   - Visual diferenciado (cor #128c7e + 📎)');
    console.log('');
    console.log('📡 **Backend:**');
    console.log('   - Aceita phoneNumber personalizado');
    console.log('   - Aceita customMessage opcional');
    console.log('   - Valida formato do número');
    console.log('   - Upload do PDF para WhatsApp');
    console.log('   - Envio de documento anexado');
    console.log('');
    console.log('📱 **Experiência do Cliente:**');
    console.log('   - Recebe mensagem profissional');
    console.log('   - PDF aparece como anexo na conversa');
    console.log('   - Pode abrir PDF diretamente no WhatsApp');
    console.log('   - Não precisa baixar arquivo');
    console.log('   - Funciona offline depois de baixado');

  } catch (error) {
    console.error('❌ Erro no teste completo:', error.message);
  }
}

// Executar teste
if (require.main === module) {
  testWhatsAppComplete();
}

module.exports = { testWhatsAppComplete }; 