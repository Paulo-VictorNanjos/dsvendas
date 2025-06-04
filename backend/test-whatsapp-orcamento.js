const axios = require('axios');
const whatsappConfig = require('./config/whatsapp');

async function testWhatsAppOrcamento() {
  console.log('🧪 [Teste] Testando envio de orçamento via WhatsApp Cloud API...');
  console.log('');

  // Dados mockados de um orçamento
  const orcamentoData = {
    orcamento: {
      codigo: 'TESTE-001',
      dt_orcamento: new Date(),
      totais: {
        valor_total: 1500.75
      }
    },
    cliente: {
      nome: 'João Silva',
      razao: 'João Silva Empresa'
    },
    vendedor: {
      nome: 'Paulo - Vendedor'
    }
  };

  // PDF de teste (simulado)
  const pdfContent = `
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/Contents 5 0 R
>>
endobj

4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

5 0 obj
<<
/Length 60
>>
stream
BT
/F1 12 Tf
100 700 Td
(Orçamento TESTE-001 - DSVENDAS) Tj
ET
endstream
endobj

xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000110 00000 n 
0000000273 00000 n 
0000000343 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
456
%%EOF`;

  const pdfBuffer = Buffer.from(pdfContent);

  try {
    // Importar o serviço
    const whatsappCloudService = require('./services/whatsappCloudService');

    console.log('📋 Dados do teste:');
    console.log(`   - Orçamento: ${orcamentoData.orcamento.codigo}`);
    console.log(`   - Cliente: ${orcamentoData.cliente.nome}`);
    console.log(`   - Valor: R$ ${orcamentoData.orcamento.totais.valor_total.toFixed(2)}`);
    console.log(`   - PDF: ${pdfBuffer.length} bytes`);
    console.log('');

    // Teste 1: Enviar mensagem simples
    console.log('1️⃣ Testando envio de mensagem simples...');
    const messageResult = await whatsappCloudService.sendTextMessage(
      '5518996334304',
      '🧪 *Teste DSVENDAS*\n\nEste é um teste da integração WhatsApp Cloud API!\n\n✅ Funcionando perfeitamente!'
    );

    if (messageResult.success) {
      console.log('✅ Mensagem enviada com sucesso!');
      console.log(`   - Message ID: ${messageResult.messageId}`);
    } else {
      console.log('❌ Erro ao enviar mensagem:', messageResult.error);
    }

    console.log('');

    // Teste 2: Enviar PDF
    console.log('2️⃣ Testando envio de PDF...');
    const documentResult = await whatsappCloudService.sendDocument(
      '5518996334304',
      pdfBuffer,
      'Teste_Orcamento_DSVENDAS.pdf',
      '📄 Teste de orçamento - DSVENDAS'
    );

    if (documentResult.success) {
      console.log('✅ PDF enviado com sucesso!');
      console.log(`   - Message ID: ${documentResult.messageId}`);
      console.log(`   - Media ID: ${documentResult.mediaId}`);
      console.log(`   - Filename: ${documentResult.filename}`);
    } else {
      console.log('❌ Erro ao enviar PDF:', documentResult.error);
    }

    console.log('');

    // Teste 3: Enviar orçamento completo
    console.log('3️⃣ Testando envio de orçamento completo...');
    const orcamentoResult = await whatsappCloudService.sendOrcamento(
      '5518996334304',
      orcamentoData,
      pdfBuffer
    );

    if (orcamentoResult.success) {
      console.log('✅ Orçamento completo enviado com sucesso!');
      console.log(`   - Orçamento: ${orcamentoResult.orcamento}`);
      console.log(`   - Phone: ${orcamentoResult.phone}`);
      console.log(`   - Message ID: ${orcamentoResult.results.message.messageId}`);
      console.log(`   - Document ID: ${orcamentoResult.results.document.messageId}`);
    } else {
      console.log('❌ Erro ao enviar orçamento:', orcamentoResult.error);
    }

    console.log('');
    console.log('🎉 Teste concluído!');
    console.log('📱 Verifique seu WhatsApp para ver as mensagens enviadas!');
    console.log('');
    console.log('💡 Próximos passos:');
    console.log('   1. Integrar com o frontend');
    console.log('   2. Testar com orçamentos reais');
    console.log('   3. Configurar webhooks (opcional)');

  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
    console.error('   Stack:', error.stack);
  }
}

// Executar teste
if (require.main === module) {
  testWhatsAppOrcamento();
}

module.exports = { testWhatsAppOrcamento }; 