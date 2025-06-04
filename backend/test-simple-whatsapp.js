// Teste simples dos componentes do WhatsApp sem autenticação
const express = require('express');

// Simular requisição mockada
function createMockRequest(params = {}, body = {}) {
  return {
    params,
    body,
    userId: 1,
    userRole: 'admin',
    vendedor: null
  };
}

function createMockResponse() {
  const res = {
    statusCode: 200,
    responseData: null,
    json: function(data) {
      this.responseData = data;
      console.log('📤 Resposta:', JSON.stringify(data, null, 2));
      return this;
    },
    status: function(code) {
      this.statusCode = code;
      console.log(`📊 Status Code: ${code}`);
      return this;
    },
    set: function(headers) {
      console.log('📋 Headers:', headers);
      return this;
    },
    send: function(data) {
      console.log(`📄 Enviando dados: ${data.length} bytes`);
      return this;
    }
  };
  return res;
}

async function testWhatsAppComponents() {
  try {
    console.log('🧪 [Teste] Testando componentes do WhatsApp diretamente\n');
    
    // Importar controlador
    const smtpController = require('./controllers/smtpController');
    
    // 1. Testar método debugTempPdfs
    console.log('1️⃣ Testando debug dos PDFs temporários...');
    const mockReq1 = createMockRequest();
    const mockRes1 = createMockResponse();
    
    await smtpController.debugTempPdfs(mockReq1, mockRes1);
    
    // 2. Verificar se global.tempPdfs existe
    console.log('\n2️⃣ Verificando global.tempPdfs...');
    console.log('- Inicializado:', global.tempPdfs ? 'Sim' : 'Não');
    console.log('- Tipo:', typeof global.tempPdfs);
    console.log('- Tamanho:', global.tempPdfs ? global.tempPdfs.size : 'N/A');
    
    // 3. Inicializar se necessário
    if (!global.tempPdfs) {
      console.log('\n3️⃣ Inicializando global.tempPdfs...');
      global.tempPdfs = new Map();
      console.log('✅ global.tempPdfs inicializado');
    }
    
    // 4. Testar criação de token e armazenamento
    console.log('\n4️⃣ Testando criação de token...');
    const testToken = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const testPdfData = {
      buffer: Buffer.from('PDF fake content for testing'),
      filename: 'teste-orcamento.pdf',
      createdAt: Date.now(),
      orcamentoCodigo: 123
    };
    
    global.tempPdfs.set(testToken, testPdfData);
    console.log(`✅ Token criado: ${testToken}`);
    console.log(`📊 PDFs armazenados: ${global.tempPdfs.size}`);
    
    // 5. Testar recuperação do PDF
    console.log('\n5️⃣ Testando recuperação do PDF...');
    const mockReq2 = createMockRequest({ token: testToken });
    const mockRes2 = createMockResponse();
    
    await smtpController.downloadTempPdf(mockReq2, mockRes2);
    
    // 6. Testar com token inválido
    console.log('\n6️⃣ Testando token inválido...');
    const mockReq3 = createMockRequest({ token: 'token-inexistente' });
    const mockRes3 = createMockResponse();
    
    await smtpController.downloadTempPdf(mockReq3, mockRes3);
    
    console.log('\n✅ Teste dos componentes concluído!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testWhatsAppComponents(); 