const axios = require('axios');

async function testFinalWhatsApp() {
  try {
    console.log('🧪 [Teste Final] Testando sistema WhatsApp completo\n');
    
    const baseUrl = 'http://localhost:3001';
    
    // 1. Verificar estado inicial
    console.log('1️⃣ Estado inicial dos PDFs...');
    const initialState = await axios.get(`${baseUrl}/api/debug/temp-pdfs`);
    console.log('Estado inicial:', initialState.data);
    
    // 2. Criar PDF de teste no servidor
    console.log('\n2️⃣ Criando PDF de teste no servidor...');
    const createResponse = await axios.post(`${baseUrl}/api/debug/create-test-pdf`);
    console.log('PDF criado:', createResponse.data);
    
    const { token, downloadUrl } = createResponse.data.data;
    
    // 3. Verificar se foi armazenado
    console.log('\n3️⃣ Verificando armazenamento...');
    const afterCreate = await axios.get(`${baseUrl}/api/debug/temp-pdfs`);
    console.log('Estado após criação:', afterCreate.data);
    
    // 4. Testar download
    console.log('\n4️⃣ Testando download...');
    console.log(`URL: ${downloadUrl}`);
    
    try {
      const pdfResponse = await axios.get(downloadUrl, {
        responseType: 'arraybuffer'
      });
      
      console.log('✅ PDF baixado com sucesso!');
      console.log('- Status:', pdfResponse.status);
      console.log('- Tamanho:', pdfResponse.data.length, 'bytes');
      console.log('- Content-Type:', pdfResponse.headers['content-type']);
      
      // Salvar para verificação
      const fs = require('fs');
      fs.writeFileSync('teste-final-whatsapp.pdf', pdfResponse.data);
      console.log('📄 PDF salvo como teste-final-whatsapp.pdf');
      
    } catch (downloadError) {
      console.log('❌ Erro no download:');
      console.log('- Status:', downloadError.response?.status);
      console.log('- Data:', downloadError.response?.data);
    }
    
    // 5. Estado final
    console.log('\n5️⃣ Estado final...');
    const finalState = await axios.get(`${baseUrl}/api/debug/temp-pdfs`);
    console.log('Estado final:', finalState.data);
    
    console.log('\n✅ Teste final concluído!');
    
  } catch (error) {
    console.error('❌ Erro no teste final:', error.message);
    if (error.response) {
      console.log('- Status:', error.response.status);
      console.log('- Data:', error.response.data);
    }
  }
}

testFinalWhatsApp(); 