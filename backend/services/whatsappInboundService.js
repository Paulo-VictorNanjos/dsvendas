const db = require('../database/connection');
const whatsappCloudService = require('./whatsappCloudService');
const pdfService = require('./pdfService');
const orcamentoController = require('../controllers/orcamentoController');

class WhatsAppInboundService {
  
  /**
   * Processar mensagem recebida do cliente
   */
  async processIncomingMessage(phoneNumber, messageText) {
    try {
      console.log(`📱 [WhatsApp Inbound] Mensagem recebida de ${phoneNumber}: "${messageText}"`);

      // Extrair código do cliente da mensagem
      const codigoCliente = this.extractCodigoCliente(messageText);
      
      if (codigoCliente) {
        await this.processarPedidoComCodigo(phoneNumber, codigoCliente, messageText);
      } else {
        await this.enviarInstrucoes(phoneNumber);
      }

    } catch (error) {
      console.error('❌ [WhatsApp Inbound] Erro ao processar mensagem:', error);
      await this.enviarMensagemErro(phoneNumber);
    }
  }

  /**
   * Extrair código do cliente da mensagem
   */
  extractCodigoCliente(messageText) {
    // Padrões para extrair código do cliente:
    // "Código: 12345", "codigo 12345", "cliente 12345", "12345"
    const patterns = [
      /(?:código|codigo|cliente|cod)[\s:]*(\d+)/i,  // "Código: 12345"
      /^(\d{4,6})$/,                                 // "12345" (só números)
      /cliente[\s]*(\d+)/i,                         // "cliente 12345"
      /cod[\s]*(\d+)/i                              // "cod 12345"
    ];

    for (const pattern of patterns) {
      const match = messageText.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Processar pedido com código do cliente
   */
  async processarPedidoComCodigo(phoneNumber, codigoCliente, messageOriginal) {
    try {
      console.log(`🔍 [WhatsApp Inbound] Buscando orçamentos para cliente: ${codigoCliente}`);

      // 1. Verificar se cliente existe
      const cliente = await this.buscarCliente(codigoCliente);
      
      if (!cliente) {
        await this.enviarClienteNaoEncontrado(phoneNumber, codigoCliente);
        return;
      }

      // 2. Buscar orçamentos do cliente
      const orcamentos = await this.buscarOrcamentosCliente(codigoCliente);

      if (orcamentos.length === 0) {
        await this.enviarSemOrcamentos(phoneNumber, cliente.nome || cliente.razao);
        return;
      }

      // 3. Verificar se tem código específico de orçamento na mensagem
      const codigoOrcamento = this.extractCodigoOrcamento(messageOriginal);
      
      if (codigoOrcamento) {
        // Cliente pediu orçamento específico
        const orcamentoEspecifico = orcamentos.find(o => 
          o.codigo.toString().includes(codigoOrcamento) ||
          o.codigo.toString().endsWith(codigoOrcamento)
        );
        
        if (orcamentoEspecifico) {
          await this.enviarOrcamentoEspecifico(phoneNumber, orcamentoEspecifico, cliente);
          return;
        }
      }

      // 4. Decisão baseada na quantidade de orçamentos
      if (orcamentos.length === 1) {
        // Enviar automaticamente o único orçamento
        await this.enviarOrcamentoEspecifico(phoneNumber, orcamentos[0], cliente);
      } else {
        // Listar orçamentos para escolha
        await this.enviarListaOrcamentos(phoneNumber, orcamentos, cliente);
      }

    } catch (error) {
      console.error('❌ [WhatsApp Inbound] Erro ao processar pedido:', error);
      await this.enviarMensagemErro(phoneNumber);
    }
  }

  /**
   * Extrair código específico do orçamento
   */
  extractCodigoOrcamento(messageText) {
    // Padrões: "orçamento 123", "ORC-123", "orcamento ORC-123"
    const patterns = [
      /(?:orçamento|orcamento|orc)[\s-]*(\d+)/i,
      /orc[_-]?(\d+)/i
    ];

    for (const pattern of patterns) {
      const match = messageText.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Buscar dados do cliente
   */
  async buscarCliente(codigo) {
    try {
      const result = await db('clientes')
        .select('codigo', 'nome', 'razao', 'cnpj', 'uf', 'municipio')
        .where('codigo', codigo)
        .first();
      
      return result || null;
    } catch (error) {
      console.error('❌ Erro ao buscar cliente:', error);
      return null;
    }
  }

  /**
   * Buscar orçamentos do cliente
   */
  async buscarOrcamentosCliente(codigoCliente) {
    try {
      const result = await db('orcamentos as o')
        .leftJoin('vendedores as v', 'o.cod_vendedor', 'v.codigo')
        .select(
          'o.codigo',
          'o.dt_orcamento',
          'o.vl_total',
          'o.cod_status',
          'o.cod_vendedor',
          'v.nome as vendedor_nome'
        )
        .where('o.cod_cliente', codigoCliente)
        .whereIn('o.cod_status', [1, 2, 3]) // Status ativos 
        .orderBy('o.dt_orcamento', 'desc')
        .limit(10);
      
      return result || [];
    } catch (error) {
      console.error('❌ Erro ao buscar orçamentos:', error);
      return [];
    }
  }

  /**
   * Enviar orçamento específico
   */
  async enviarOrcamentoEspecifico(phoneNumber, orcamento, cliente) {
    try {
      console.log(`📤 [WhatsApp Inbound] Enviando orçamento ${orcamento.codigo} para ${phoneNumber}`);

      // Buscar dados completos do orçamento usando o controller
      const mockReq = {
        params: { id: orcamento.codigo },
        userId: 1, // Sistema automático
        userRole: 'admin',
        vendedor: null
      };

      const mockRes = {
        json: (data) => data,
        status: () => mockRes
      };

      const dadosResponse = await orcamentoController.generatePdf(mockReq, mockRes);

      if (!dadosResponse || !dadosResponse.success) {
        throw new Error('Não foi possível gerar os dados do orçamento');
      }

      const dadosOrcamento = dadosResponse.data;

      // Gerar PDF
      const pdfBuffer = await pdfService.generateOrcamentoPdf(dadosOrcamento);

      // Enviar via WhatsApp
      const result = await whatsappCloudService.sendOrcamento(phoneNumber, dadosOrcamento, pdfBuffer);

      if (result.success) {
        console.log(`✅ [WhatsApp Inbound] Orçamento ${orcamento.codigo} enviado com sucesso!`);
      } else {
        console.error(`❌ [WhatsApp Inbound] Erro ao enviar orçamento:`, result.error);
      }

    } catch (error) {
      console.error('❌ [WhatsApp Inbound] Erro ao enviar orçamento específico:', error);
      
      // Enviar mensagem de erro amigável
      const message = `
🚫 Desculpe, houve um erro ao enviar seu orçamento.

📞 Entre em contato conosco:
• WhatsApp: (18) 99999-9999
• Email: contato@dsvendas.com

Nossa equipe resolverá rapidamente! 🤝
      `.trim();

      await whatsappCloudService.sendTextMessage(phoneNumber, message);
    }
  }

  /**
   * Enviar lista de orçamentos para escolha
   */
  async enviarListaOrcamentos(phoneNumber, orcamentos, cliente) {
    try {
      const nomeCliente = cliente.nome || cliente.razao || 'Cliente';
      
      let message = `👋 Olá *${nomeCliente}*!\n\n`;
      message += `📋 Encontrei *${orcamentos.length} orçamentos* para você:\n\n`;

      orcamentos.forEach((orc, index) => {
        const data = new Date(orc.dt_orcamento).toLocaleDateString('pt-BR');
        const valor = new Intl.NumberFormat('pt-BR', { 
          style: 'currency', 
          currency: 'BRL' 
        }).format(orc.vl_total || 0);

        message += `${index + 1}️⃣ *Orçamento #${orc.codigo}*\n`;
        message += `   📅 ${data}\n`;
        message += `   💰 ${valor}\n`;
        message += `   👨‍💼 ${orc.vendedor_nome || 'Vendedor'}\n\n`;
      });

      message += `🎯 *Para receber um orçamento:*\n`;
      message += `Digite: *"Orçamento ${orcamentos[0].codigo}"*\n\n`;
      message += `📱 Ou responda com o número do orçamento (1, 2, 3...)`;

      await whatsappCloudService.sendTextMessage(phoneNumber, message);

    } catch (error) {
      console.error('❌ Erro ao enviar lista de orçamentos:', error);
    }
  }

  /**
   * Enviar instruções de uso
   */
  async enviarInstrucoes(phoneNumber) {
    const message = `
🤖 *DSVENDAS - Orçamentos Automáticos*

Para receber seu orçamento, envie uma mensagem com seu *código de cliente*:

💬 *Exemplos:*
• "Código: 12345"
• "Cliente 12345" 
• "12345"

🎯 *Para orçamento específico:*
• "Orçamento 67890"
• "Quero orçamento ORC-67890"

📞 *Precisa de ajuda?*
Entre em contato: (18) 99999-9999

Estamos aqui para ajudar! 😊
    `.trim();

    await whatsappCloudService.sendTextMessage(phoneNumber, message);
  }

  /**
   * Enviar mensagem quando cliente não é encontrado
   */
  async enviarClienteNaoEncontrado(phoneNumber, codigo) {
    const message = `
❌ Cliente não encontrado com código: *${codigo}*

🔍 *Verifique se:*
• O código está correto
• Você é cliente da DSVENDAS
• O cadastro está ativo

📞 *Entre em contato:*
• WhatsApp: (18) 99999-9999
• Email: contato@dsvendas.com

Nossa equipe verificará seu cadastro! 🤝
    `.trim();

    await whatsappCloudService.sendTextMessage(phoneNumber, message);
  }

  /**
   * Enviar mensagem quando não há orçamentos
   */
  async enviarSemOrcamentos(phoneNumber, nomeCliente) {
    const message = `
📋 Olá *${nomeCliente}*!

Não encontrei orçamentos pendentes para você no momento.

💡 *Quer solicitar um novo orçamento?*
Entre em contato conosco:
• WhatsApp: (18) 99999-9999
• Email: contato@dsvendas.com

Ficaremos felizes em atendê-lo! 😊
    `.trim();

    await whatsappCloudService.sendTextMessage(phoneNumber, message);
  }

  /**
   * Enviar mensagem de erro genérica
   */
  async enviarMensagemErro(phoneNumber) {
    const message = `
🚫 Ops! Ocorreu um erro temporário.

📞 Entre em contato conosco:
• WhatsApp: (18) 99999-9999
• Email: contato@dsvendas.com

Resolveremos rapidamente! 🔧
    `.trim();

    await whatsappCloudService.sendTextMessage(phoneNumber, message);
  }
}

module.exports = new WhatsAppInboundService(); 