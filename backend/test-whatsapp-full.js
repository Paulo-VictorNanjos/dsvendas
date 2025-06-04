const axios = require('axios');

async function testWhatsAppPdf() {
  try {
    console.log('🧪 [Teste] Testando sistema completo de WhatsApp + PDF');
    
    const baseUrl = 'http://localhost:3001';
    
    // 1. Primeiro, vamos listar os orçamentos para pegar um ID válido
    console.log('\n1️⃣ Buscando orçamentos...');
    const orcamentosResponse = await axios.get(`${baseUrl}/api/orcamentos`, {
      headers: {
        'Authorization': 'Bearer token-mock' // Você pode precisar de um token real
      }
    });
    
    if (!orcamentosResponse.data.data || orcamentosResponse.data.data.length === 0) {
      console.log('❌ Nenhum orçamento encontrado');
      return;
    }
    
    const primeiroOrcamento = orcamentosResponse.data.data[0];
    console.log(`✅ Usando orçamento: ${primeiroOrcamento.codigo}`);
    
    // 2. Testar geração do link WhatsApp
    console.log('\n2️⃣ Gerando link do WhatsApp...');
    const whatsappResponse = await axios.post(`${baseUrl}/api/orcamentos/${primeiroOrcamento.codigo}/whatsapp`, {
      phoneNumber: '11999999999',
      customMessage: 'Teste'
    }, {
      headers: {
        'Authorization': 'Bearer token-mock'
      }
    });
    
    if (!whatsappResponse.data.success) {
      console.log('❌ Erro ao gerar link WhatsApp:', whatsappResponse.data.message);
      return;
    }
    
    console.log('✅ Link WhatsApp gerado:');
    console.log('- Web URL:', whatsappResponse.data.data.webUrl);
    console.log('- Mobile URL:', whatsappResponse.data.data.mobileUrl);
    console.log('- PDF URL:', whatsappResponse.data.data.pdfDownloadUrl);
    console.log('- Token:', whatsappResponse.data.data.pdfToken);
    
    // 3. Testar download do PDF
    console.log('\n3️⃣ Testando download do PDF...');
    const pdfUrl = whatsappResponse.data.data.pdfDownloadUrl;
    const pdfToken = whatsappResponse.data.data.pdfToken;
    
    try {
      const pdfResponse = await axios.get(pdfUrl, {
        responseType: 'arraybuffer'
      });
      
      console.log('✅ PDF baixado com sucesso!');
      console.log('- Status:', pdfResponse.status);
      console.log('- Tamanho:', pdfResponse.data.length, 'bytes');
      console.log('- Content-Type:', pdfResponse.headers['content-type']);
      
      // Salvar PDF para verificação manual
      const fs = require('fs');
      fs.writeFileSync('teste-whatsapp.pdf', pdfResponse.data);
      console.log('📄 PDF salvo como teste-whatsapp.pdf');
      
    } catch (pdfError) {
      console.log('❌ Erro ao baixar PDF:');
      console.log('- Status:', pdfError.response?.status);
      console.log('- Data:', pdfError.response?.data?.toString());
    }
    
    // 4. Verificar estado dos PDFs temporários
    console.log('\n4️⃣ Verificando PDFs temporários...');
    try {
      const statusResponse = await axios.get(`${baseUrl}/api/debug/temp-pdfs`);
      console.log('📊 Status dos PDFs temporários:', statusResponse.data);
    } catch (debugError) {
      console.log('⚠️ Endpoint de debug não disponível');
    }
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
    if (error.response) {
      console.log('- Status:', error.response.status);
      console.log('- Data:', error.response.data);
    }
  }
}

testWhatsAppPdf(); 