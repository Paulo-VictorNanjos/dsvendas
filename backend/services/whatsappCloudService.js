const axios = require('axios');
const FormData = require('form-data');

// Importar configuração específica do WhatsApp
const whatsappConfig = require('../config/whatsapp');

class WhatsAppCloudService {
  constructor() {
    // Usar configuração específica primeiro, depois fallback para .env
    this.phoneNumberId = whatsappConfig.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = whatsappConfig.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
    this.version = whatsappConfig.WHATSAPP_API_VERSION || process.env.WHATSAPP_API_VERSION || 'v22.0';
    this.baseURL = `https://graph.facebook.com/${this.version}`;
    
    console.log(`🔧 [WhatsApp API] Configuração carregada:`);
    console.log(`   - Versão: ${this.version}`);
    console.log(`   - Phone Number ID: ${this.phoneNumberId ? '✅ Configurado' : '❌ Não configurado'}`);
    console.log(`   - Access Token: ${this.accessToken ? '✅ Configurado' : '❌ Não configurado'}`);
    console.log(`   - Base URL: ${this.baseURL}`);
  }

  /**
   * Verificar se a configuração está correta
   */
  isConfigured() {
    return !!(this.phoneNumberId && this.accessToken);
  }

  /**
   * Formatar número de telefone brasileiro para WhatsApp
   */
  formatPhoneNumber(phone) {
    // Remover caracteres especiais
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Se começar com 0, remove
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }
    
    // Se não tem código do país, adiciona 55 (Brasil)
    if (!cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone;
    }
    
    return cleanPhone;
  }

  /**
   * Enviar mensagem de texto simples
   */
  async sendTextMessage(to, message) {
    try {
      if (!this.isConfigured()) {
        throw new Error('WhatsApp Cloud API não configurada. Configure WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN no .env');
      }

      const formattedPhone = this.formatPhoneNumber(to);
      
      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: {
            body: message
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ [WhatsApp API] Mensagem enviada com sucesso:', response.data);
      
      return {
        success: true,
        messageId: response.data.messages[0].id,
        phone: formattedPhone,
        data: response.data
      };

    } catch (error) {
      console.error('❌ [WhatsApp API] Erro ao enviar mensagem:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Upload de mídia (PDF) para WhatsApp
   */
  async uploadMedia(buffer, filename, mimeType = 'application/pdf') {
    try {
      if (!this.isConfigured()) {
        throw new Error('WhatsApp Cloud API não configurada');
      }

      const formData = new FormData();
      formData.append('file', buffer, {
        filename: filename,
        contentType: mimeType
      });
      formData.append('type', mimeType);
      formData.append('messaging_product', 'whatsapp');

      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/media`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            ...formData.getHeaders()
          }
        }
      );

      console.log('✅ [WhatsApp API] Mídia uploadada com sucesso:', response.data);
      
      return {
        success: true,
        mediaId: response.data.id,
        data: response.data
      };

    } catch (error) {
      console.error('❌ [WhatsApp API] Erro ao fazer upload da mídia:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Enviar documento (PDF) via WhatsApp
   */
  async sendDocument(to, buffer, filename, caption = '') {
    try {
      console.log(`📄 [WhatsApp API] Iniciando envio de documento: ${filename}`);
      
      // 1. Fazer upload da mídia
      const uploadResult = await this.uploadMedia(buffer, filename);
      
      if (!uploadResult.success) {
        return uploadResult;
      }

      const mediaId = uploadResult.mediaId;
      console.log(`📤 [WhatsApp API] Mídia uploadada, ID: ${mediaId}`);

      // 2. Enviar documento
      const formattedPhone = this.formatPhoneNumber(to);
      
      const messageData = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'document',
        document: {
          id: mediaId,
          filename: filename
        }
      };

      // Adicionar caption se fornecido
      if (caption && caption.trim()) {
        messageData.document.caption = caption;
      }

      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        messageData,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ [WhatsApp API] Documento enviado com sucesso:', response.data);
      
      return {
        success: true,
        messageId: response.data.messages[0].id,
        mediaId: mediaId,
        phone: formattedPhone,
        filename: filename,
        data: response.data
      };

    } catch (error) {
      console.error('❌ [WhatsApp API] Erro ao enviar documento:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Enviar orçamento completo (mensagem + PDF anexado)
   */
  async sendOrcamento(to, orcamentoData, pdfBuffer) {
    try {
      const { orcamento, cliente, vendedor } = orcamentoData;
      
      console.log(`📋 [WhatsApp API] Enviando orçamento #${orcamento.codigo} para ${to}`);

      // 1. Preparar mensagem
      const message = `🏢 *DSVENDAS* - Orçamento Digital

Olá *${cliente.nome || cliente.razao}*! 👋

📋 *Orçamento #${orcamento.codigo}*
📅 Data: ${new Date(orcamento.dt_orcamento).toLocaleDateString('pt-BR')}
💰 Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.totais?.valor_total || 0)}
👨‍💼 Vendedor: ${vendedor.nome}

📄 Segue anexo o orçamento em PDF com todos os detalhes.

💡 *Dúvidas ou aprovação?*
Responda esta mensagem que nosso time estará pronto para atendê-lo!

Atenciosamente,
*Equipe DSVENDAS* ✨`;

      // 2. Enviar mensagem primeiro
      const messageResult = await this.sendTextMessage(to, message);
      
      if (!messageResult.success) {
        return {
          success: false,
          error: 'Erro ao enviar mensagem',
          details: messageResult
        };
      }

      // 3. Enviar PDF anexado
      const filename = `Orcamento_${orcamento.codigo}.pdf`;
      const caption = `📋 Orçamento #${orcamento.codigo} - DSVENDAS`;
      
      const documentResult = await this.sendDocument(to, pdfBuffer, filename, caption);
      
      if (!documentResult.success) {
        return {
          success: false,
          error: 'Erro ao enviar PDF',
          details: documentResult
        };
      }

      console.log('🎉 [WhatsApp API] Orçamento enviado com sucesso!');
      
      return {
        success: true,
        phone: documentResult.phone,
        orcamento: orcamento.codigo,
        results: {
          message: messageResult,
          document: documentResult
        }
      };

    } catch (error) {
      console.error('❌ [WhatsApp API] Erro ao enviar orçamento:', error);
      
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
  }

  /**
   * Verificar status de uma mensagem
   */
  async getMessageStatus(messageId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/${messageId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return {
        success: true,
        status: response.data
      };

    } catch (error) {
      console.error('❌ [WhatsApp API] Erro ao verificar status:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Obter informações da conta WhatsApp Business
   */
  async getAccountInfo() {
    try {
      const response = await axios.get(
        `${this.baseURL}/${this.phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return {
        success: true,
        account: response.data
      };

    } catch (error) {
      console.error('❌ [WhatsApp API] Erro ao obter informações da conta:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }
}

module.exports = new WhatsAppCloudService(); 