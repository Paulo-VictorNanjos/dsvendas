const logger = require('../utils/logger');

class WhatsAppService {
  /**
   * Gera URL para enviar mensagem via WhatsApp Web
   */
  generateWhatsAppUrl(phoneNumber, message) {
    try {
      // Limpar o número de telefone (remover caracteres especiais)
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      
      // Adicionar código do país se necessário (Brasil = 55)
      let formattedPhone = cleanPhone;
      if (!formattedPhone.startsWith('55') && formattedPhone.length >= 10) {
        formattedPhone = '55' + formattedPhone;
      }

      // Codificar a mensagem para URL
      const encodedMessage = encodeURIComponent(message);

      // Gerar URL do WhatsApp Web
      const whatsappUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;

      return {
        success: true,
        url: whatsappUrl,
        formattedPhone: formattedPhone
      };
    } catch (error) {
      logger.error(`Erro ao gerar URL do WhatsApp: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Gera URL móvel para WhatsApp
   */
  generateWhatsAppMobileUrl(phoneNumber, message) {
    try {
      // Limpar o número de telefone
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      
      // Adicionar código do país se necessário
      let formattedPhone = cleanPhone;
      if (!formattedPhone.startsWith('55') && formattedPhone.length >= 10) {
        formattedPhone = '55' + formattedPhone;
      }

      // Codificar a mensagem para URL
      const encodedMessage = encodeURIComponent(message);

      // Gerar URL do WhatsApp móvel
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;

      return {
        success: true,
        url: whatsappUrl,
        formattedPhone: formattedPhone
      };
    } catch (error) {
      logger.error(`Erro ao gerar URL móvel do WhatsApp: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Formatar número de telefone brasileiro
   */
  formatBrazilianPhone(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length === 11) {
      // Celular: (11) 99999-9999
      return `(${cleanPhone.substring(0, 2)}) ${cleanPhone.substring(2, 7)}-${cleanPhone.substring(7)}`;
    } else if (cleanPhone.length === 10) {
      // Fixo: (11) 9999-9999
      return `(${cleanPhone.substring(0, 2)}) ${cleanPhone.substring(2, 6)}-${cleanPhone.substring(6)}`;
    }
    
    return phone;
  }

  /**
   * Validar número de telefone brasileiro
   */
  validateBrazilianPhone(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Deve ter 10 ou 11 dígitos
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return {
        valid: false,
        message: 'Número deve ter 10 ou 11 dígitos'
      };
    }

    // Verificar se começa com DDD válido (11-99)
    const ddd = parseInt(cleanPhone.substring(0, 2));
    if (ddd < 11 || ddd > 99) {
      return {
        valid: false,
        message: 'DDD inválido'
      };
    }

    return {
      valid: true,
      formattedPhone: this.formatBrazilianPhone(phone)
    };
  }

  /**
   * Gerar mensagem padrão para orçamento
   */
  generateOrcamentoMessage(orcamento, cliente, vendedor) {
    const message = `
🏢 *DSVENDAS*

Olá ${cliente.nome || cliente.razao}!

📋 *Orçamento #${orcamento.codigo}*
📅 Data: ${new Date(orcamento.dt_orcamento).toLocaleDateString('pt-BR')}
💰 Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.vl_total)}

👨‍💼 Vendedor: ${vendedor.nome}

Segue em anexo o orçamento detalhado para sua análise.

Ficamos à disposição para esclarecimentos!

Atenciosamente,
Equipe DSVENDAS
    `.trim();

    return message;
  }

  /**
   * Extrair números de telefone do cliente
   */
  extractClientPhones(cliente) {
    const phones = [];

    // Telefone principal
    if (cliente.fone1 && cliente.ddd_fone1) {
      phones.push({
        type: 'telefone',
        ddd: cliente.ddd_fone1,
        number: cliente.fone1,
        full: `${cliente.ddd_fone1}${cliente.fone1}`,
        formatted: this.formatBrazilianPhone(`${cliente.ddd_fone1}${cliente.fone1}`)
      });
    }

    // Celular
    if (cliente.celular && cliente.ddd_celular) {
      phones.push({
        type: 'celular',
        ddd: cliente.ddd_celular,
        number: cliente.celular,
        full: `${cliente.ddd_celular}${cliente.celular}`,
        formatted: this.formatBrazilianPhone(`${cliente.ddd_celular}${cliente.celular}`)
      });
    }

    // Telefone genérico
    if (cliente.telefone) {
      const validation = this.validateBrazilianPhone(cliente.telefone);
      if (validation.valid) {
        phones.push({
          type: 'telefone',
          full: cliente.telefone.replace(/\D/g, ''),
          formatted: validation.formattedPhone
        });
      }
    }

    return phones;
  }
}

module.exports = new WhatsAppService(); 