const smtpService = require('../services/smtpService');
const whatsappService = require('../services/whatsappService');
const pdfService = require('../services/pdfService');
const orcamentoController = require('./orcamentoController');
const knex = require('../database/connection');

class SmtpController {
  /**
   * Obtém configuração SMTP do usuário logado
   */
  async getUserSmtpConfig(req, res) {
    try {
      const userId = req.userId;
      const config = await smtpService.getUserSmtpConfig(userId);

      if (!config) {
        return res.json({
          success: true,
          data: null,
          message: 'Nenhuma configuração SMTP encontrada'
        });
      }

      // Remover a senha da resposta por segurança
      delete config.smtp_password;

      return res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('Erro ao obter configuração SMTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao obter configuração SMTP'
      });
    }
  }

  /**
   * Salva configuração SMTP do usuário
   */
  async saveUserSmtpConfig(req, res) {
    try {
      const userId = req.userId;
      const {
        smtp_host,
        smtp_port,
        smtp_secure,
        smtp_user,
        smtp_password,
        from_name,
        from_email,
        active
      } = req.body;

      // Verificar se já existe configuração para este usuário
      const existingConfig = await smtpService.getUserSmtpConfig(userId);

      // Validar campos obrigatórios
      if (!smtp_host || !smtp_port || !smtp_user || !from_name || !from_email) {
        return res.status(400).json({
          success: false,
          message: 'Campos obrigatórios: Host, Porta, Usuário, Nome e E-mail'
        });
      }

      // Se não tem senha e não existe configuração, senha é obrigatória
      if (!smtp_password && !existingConfig) {
        return res.status(400).json({
          success: false,
          message: 'Senha é obrigatória para nova configuração'
        });
      }

      const configData = {
        smtp_host,
        smtp_port: parseInt(smtp_port),
        smtp_secure: Boolean(smtp_secure),
        smtp_user,
        from_name,
        from_email,
        active: active !== undefined ? Boolean(active) : true
      };

      // Só incluir senha se foi fornecida
      if (smtp_password) {
        configData.smtp_password = smtp_password;
      }

      const result = await smtpService.saveUserSmtpConfig(userId, configData);

      return res.json(result);
    } catch (error) {
      console.error('Erro ao salvar configuração SMTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao salvar configuração SMTP'
      });
    }
  }

  /**
   * Testa configuração SMTP
   */
  async testSmtpConfig(req, res) {
    try {
      const {
        smtp_host,
        smtp_port,
        smtp_secure,
        smtp_user,
        smtp_password
      } = req.body;

      if (!smtp_host || !smtp_port || !smtp_user) {
        return res.status(400).json({
          success: false,
          message: 'Host, Porta e Usuário são obrigatórios para o teste'
        });
      }

      let passwordToTest = smtp_password;

      // Se não foi fornecida senha para teste, tentar usar a senha existente do usuário
      if (!smtp_password || smtp_password === 'senha_existente_no_servidor') {
        const userId = req.userId;
        const existingConfig = await smtpService.getUserSmtpConfig(userId);
        
        if (!existingConfig || !existingConfig.smtp_password) {
          return res.status(400).json({
            success: false,
            message: 'Senha é necessária para testar a conexão'
          });
        }
        
        passwordToTest = existingConfig.smtp_password;
      }

      const result = await smtpService.testSmtpConfig({
        smtp_host,
        smtp_port: parseInt(smtp_port),
        smtp_secure: Boolean(smtp_secure),
        smtp_user,
        smtp_password: passwordToTest
      });

      return res.json(result);
    } catch (error) {
      console.error('Erro ao testar configuração SMTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao testar configuração SMTP'
      });
    }
  }

  /**
   * Remove configuração SMTP do usuário
   */
  async deleteUserSmtpConfig(req, res) {
    try {
      const userId = req.userId;
      const result = await smtpService.deleteUserSmtpConfig(userId);
      return res.json(result);
    } catch (error) {
      console.error('Erro ao remover configuração SMTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao remover configuração SMTP'
      });
    }
  }

  /**
   * Envia orçamento por email
   */
  async sendOrcamentoEmail(req, res) {
    try {
      const { id } = req.params;
      const { clienteEmail, customMessage } = req.body;
      const userId = req.userId;

      // Verificar se tem configuração SMTP
      const smtpConfig = await smtpService.getUserSmtpConfig(userId);
      if (!smtpConfig) {
        return res.status(400).json({
          success: false,
          message: 'Configure suas configurações de email antes de enviar'
        });
      }

      // Criar um objeto de resposta mockado para o generatePdf
      const mockRes = {
        json: (data) => data,
        status: () => mockRes
      };

      // Buscar dados do orçamento usando o controller existente
      const dadosResponse = await orcamentoController.generatePdf({
        params: { id },
        userId: userId,
        userRole: req.userRole,
        vendedor: req.vendedor
      }, mockRes);

      if (!dadosResponse || !dadosResponse.success) {
        return res.status(404).json({
          success: false,
          message: 'Orçamento não encontrado'
        });
      }

      const dadosOrcamento = dadosResponse.data;
      
      // Preparar email
      const cliente = dadosOrcamento.cliente;
      const orcamento = dadosOrcamento.orcamento;
      const vendedor = dadosOrcamento.vendedor;

      const emailTo = clienteEmail || cliente.contato?.email;
      if (!emailTo) {
        return res.status(400).json({
          success: false,
          message: 'Email do cliente não informado'
        });
      }

      // Gerar PDF do orçamento
      const pdfBuffer = await pdfService.generateOrcamentoPdf(dadosOrcamento);

      const emailSubject = `Orçamento #${orcamento.codigo} - DSVENDAS`;
      const emailHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Orçamento ${orcamento.codigo}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background-color: #f5f9fc;
                }
                
                .email-container {
                    max-width: 650px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                }
                
                .header {
                    background: linear-gradient(135deg, #224f8f 0%, #014DB8 50%, #0984e3 100%);
                    padding: 40px 30px;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                }
                
                .header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: linear-gradient(90deg, #F58634, #F47920);
                }
                
                .header::after {
                    content: '';
                    position: absolute;
                    top: -50%;
                    right: -20%;
                    width: 200px;
                    height: 200px;
                    background: rgba(245, 134, 52, 0.1);
                    border-radius: 50%;
                }
                
                .company-logo {
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 50%;
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 32px;
                    font-weight: bold;
                    color: white;
                    letter-spacing: 2px;
                    backdrop-filter: blur(10px);
                    border: 2px solid rgba(245, 134, 52, 0.3);
                }
                
                .company-name {
                    color: white;
                    font-size: 28px;
                    font-weight: 700;
                    margin-bottom: 8px;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                }
                
                .document-type {
                    color: rgba(255, 255, 255, 0.9);
                    font-size: 16px;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                
                .content {
                    padding: 40px 30px;
                }
                
                .greeting {
                    font-size: 18px;
                    color: #2c3e50;
                    margin-bottom: 25px;
                    font-weight: 500;
                }
                
                .greeting strong {
                    color: #224f8f;
                }
                
                .intro-text {
                    font-size: 16px;
                    color: #5a6c7d;
                    margin-bottom: 30px;
                    line-height: 1.5;
                }
                
                .orcamento-details {
                    background: linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%);
                    border-radius: 12px;
                    padding: 25px;
                    margin: 30px 0;
                    border-left: 4px solid #F58634;
                    position: relative;
                }
                
                .orcamento-details::before {
                    content: '📄';
                    position: absolute;
                    top: -10px;
                    right: 20px;
                    font-size: 24px;
                    background: white;
                    border-radius: 50%;
                    padding: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }
                
                .detail-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                    border-bottom: 1px solid rgba(52, 73, 94, 0.1);
                }
                
                .detail-row:last-child {
                    border-bottom: none;
                    font-weight: 600;
                    font-size: 18px;
                    color: #224f8f;
                    margin-top: 10px;
                    padding-top: 15px;
                    border-top: 2px solid #F58634;
                }
                
                .detail-label {
                    color: #5a6c7d;
                    font-weight: 500;
                }
                
                .detail-value {
                    color: #2c3e50;
                    font-weight: 600;
                }
                
                .custom-message {
                    background: rgba(245, 134, 52, 0.1);
                    border-left: 4px solid #F58634;
                    padding: 20px;
                    margin: 25px 0;
                    border-radius: 8px;
                    font-style: italic;
                    color: #5a6c7d;
                }
                
                .custom-message::before {
                    content: '"';
                    font-size: 24px;
                    color: #F58634;
                    font-weight: bold;
                }
                
                .custom-message::after {
                    content: '"';
                    font-size: 24px;
                    color: #F58634;
                    font-weight: bold;
                }
                
                .footer-message {
                    background: linear-gradient(135deg, #224f8f 0%, #014DB8 100%);
                    color: white;
                    padding: 25px;
                    border-radius: 8px;
                    margin-top: 30px;
                    text-align: center;
                }
                
                .footer-message p {
                    margin-bottom: 15px;
                    font-size: 16px;
                }
                
                .signature {
                    font-weight: 600;
                    font-size: 18px;
                    color: #F58634;
                }
                
                .footer {
                    background: #2c3e50;
                    color: #bdc3c7;
                    padding: 25px 30px;
                    text-align: center;
                    font-size: 14px;
                }
                
                .footer-links {
                    margin-bottom: 15px;
                }
                
                .footer-links a {
                    color: #F58634;
                    text-decoration: none;
                    margin: 0 10px;
                    font-weight: 500;
                }
                
                .footer-links a:hover {
                    text-decoration: underline;
                }
                
                .attachment-notice {
                    background: rgba(0, 184, 148, 0.1);
                    border: 1px solid rgba(0, 184, 148, 0.3);
                    border-radius: 8px;
                    padding: 15px;
                    margin: 20px 0;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                
                .attachment-icon {
                    background: #00b894;
                    color: white;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                }
                
                .attachment-text {
                    color: #2c3e50;
                    font-weight: 500;
                }
                
                @media (max-width: 600px) {
                    .email-container {
                        margin: 10px;
                        border-radius: 8px;
                    }
                    
                    .header, .content, .footer {
                        padding: 20px;
                    }
                    
                    .company-name {
                        font-size: 24px;
                    }
                    
                    .detail-row {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 5px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <!-- Cabeçalho -->
                <div class="header">
                    <div class="company-logo">DS</div>
                    <div class="company-name">DSVENDAS</div>
                    <div class="document-type">Orçamento Digital</div>
                </div>
                
                <!-- Conteúdo -->
                <div class="content">
                    <div class="greeting">
                        Olá <strong>${cliente.nome || cliente.razao}</strong>,
                    </div>
                    
                    <div class="intro-text">
                        Segue em anexo o orçamento solicitado. Analisamos cuidadosamente suas necessidades e elaboramos uma proposta personalizada para você.
                    </div>
                    
                    <!-- Detalhes do Orçamento -->
                    <div class="orcamento-details">
                        <div class="detail-row">
                            <span class="detail-label">📋 Orçamento:</span>
                            <span class="detail-value">#${orcamento.codigo}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">📅 Data:</span>
                            <span class="detail-value">${new Date(orcamento.dt_orcamento).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">⏰ Validade:</span>
                            <span class="detail-value">${orcamento.dt_validade ? new Date(orcamento.dt_validade).toLocaleDateString('pt-BR') : 'Não informada'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">👤 Vendedor:</span>
                            <span class="detail-value">${vendedor.nome}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">💰 Valor Total:</span>
                            <span class="detail-value">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.totais?.valor_total || 0)}</span>
                        </div>
                    </div>
                    
                    <!-- Aviso sobre anexo -->
                    <div class="attachment-notice">
                        <div class="attachment-icon">📎</div>
                        <div class="attachment-text">
                            <strong>Orçamento em PDF anexado</strong> - Documento completo com todos os detalhes, itens e condições.
                        </div>
                    </div>
                    
                    ${customMessage ? `
                    <div class="custom-message">
                        ${customMessage}
                    </div>
                    ` : ''}
                    
                    <!-- Mensagem final -->
                    <div class="footer-message">
                        <p>🤝 Estamos à disposição para esclarecer qualquer dúvida!</p>
                        <p>Nossa equipe está pronta para atendê-lo com excelência.</p>
                        <div class="signature">Equipe DSVENDAS</div>
                    </div>
                </div>
                
                <!-- Rodapé -->
                <div class="footer">
                    <div class="footer-links">
                        <a href="mailto:contato@dsvendas.com.br">✉️ Contato</a>
                        <a href="tel:+5511999999999">📞 Telefone</a>
                        <a href="https://dsvendas.com.br">🌐 Website</a>
                    </div>
                    <p>© ${new Date().getFullYear()} DSVENDAS - Sistema de Gestão de Vendas</p>
                    <p>Este é um e-mail automático, mas você pode responder para falar conosco!</p>
                </div>
            </div>
        </body>
        </html>
      `;

      const emailData = {
        to: emailTo,
        subject: emailSubject,
        html: emailHtml,
        attachments: [
          {
            filename: `Orcamento_${orcamento.codigo}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      // Enviar email com PDF anexado
      await smtpService.sendEmail(userId, emailData);

      return res.json({
        success: true,
        message: `Orçamento enviado com sucesso para ${emailTo}`
      });

    } catch (error) {
      console.error('Erro ao enviar orçamento por email:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar orçamento por email'
      });
    }
  }

  /**
   * Gera URL para envio via WhatsApp com PDF (método original com preview bonito)
   */
  async generateWhatsAppUrl(req, res) {
    try {
      const { id } = req.params;
      const { phoneNumber, customMessage, usePreview = true } = req.body;
      const userId = req.userId;

      // Criar um objeto de resposta mockado para o generatePdf
      const mockRes = {
        json: (data) => data,
        status: () => mockRes
      };

      // Buscar dados do orçamento usando o controller existente
      const dadosResponse = await orcamentoController.generatePdf({
        params: { id },
        userId: userId,
        userRole: req.userRole,
        vendedor: req.vendedor
      }, mockRes);

      if (!dadosResponse || !dadosResponse.success) {
        return res.status(404).json({
          success: false,
          message: 'Orçamento não encontrado'
        });
      }

      const dadosOrcamento = dadosResponse.data;
      const orcamento = dadosOrcamento.orcamento;
      const cliente = dadosOrcamento.cliente;
      const vendedor = dadosOrcamento.vendedor;

      // Usar número fornecido ou extrair do cliente
      let phone = phoneNumber;
      if (!phone) {
        const clientPhones = whatsappService.extractClientPhones(cliente);
        if (clientPhones.length > 0) {
          phone = clientPhones[0].full;
        } else {
          return res.status(400).json({
            success: false,
            message: 'Número de telefone não encontrado para este cliente'
          });
        }
      }

      // Gerar PDF do orçamento
      console.log('📄 [WhatsApp] Gerando PDF do orçamento...');
      const pdfBuffer = await pdfService.generateOrcamentoPdf(dadosOrcamento);
      console.log(`✅ [WhatsApp] PDF gerado: ${pdfBuffer.length} bytes`);

      // Criar um token único para este PDF
      const pdfToken = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      console.log(`🔑 [WhatsApp] Token gerado: ${pdfToken}`);
      
      // Salvar PDF temporariamente (em memória por 24 horas)
      global.tempPdfs = global.tempPdfs || new Map();
      global.tempPdfs.set(pdfToken, {
        buffer: pdfBuffer,
        filename: `Orcamento_${orcamento.codigo}.pdf`,
        createdAt: Date.now(),
        orcamentoCodigo: orcamento.codigo
      });

      console.log(`💾 [WhatsApp] PDF salvo temporariamente. Total de PDFs: ${global.tempPdfs.size}`);

      // Limpar PDFs antigos
      SmtpController.cleanExpiredPdfs();

      // Criar URLs
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
      const pdfDownloadUrl = `${baseUrl}/api/download-pdf/${pdfToken}`;
      const previewUrl = `${baseUrl}/api/orcamentos/${id}/preview/${pdfToken}`;
      
      console.log(`🔗 [WhatsApp] URL do PDF: ${pdfDownloadUrl}`);
      console.log(`🖼️ [WhatsApp] URL do Preview: ${previewUrl}`);

      // Escolher qual URL usar na mensagem
      const linkParaCompartilhar = usePreview ? previewUrl : pdfDownloadUrl;

      // Gerar mensagem com link do preview (como Facebook faz)
      const defaultMessage = `🏢 *DSVENDAS* - Orçamento Digital

Olá *${cliente.nome || cliente.razao}*! 👋

📋 *Orçamento #${orcamento.codigo}*
📅 Data: ${new Date(orcamento.dt_orcamento).toLocaleDateString('pt-BR')}
💰 Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.totais?.valor_total || 0)}
👨‍💼 Vendedor: ${vendedor.nome}

${usePreview ? '🖼️ *VER E BAIXAR ORÇAMENTO:*' : '📄 *BAIXAR ORÇAMENTO EM PDF:*'}
${linkParaCompartilhar}

${usePreview ? 
'💡 *Preview inteligente:*\n1️⃣ Clique no link para ver o preview\n2️⃣ Baixe o PDF diretamente da página\n3️⃣ Link válido por 24 horas' : 
'💡 *Como baixar:*\n1️⃣ Clique no link acima\n2️⃣ O PDF será baixado automaticamente\n3️⃣ Válido por 24 horas'}

📞 Dúvidas? Entre em contato conosco!

Atenciosamente,
*Equipe DSVENDAS* ✨`.trim();

      const message = customMessage || defaultMessage;

      // Gerar URLs do WhatsApp
      const webUrl = whatsappService.generateWhatsAppUrl(phone, message);
      const mobileUrl = whatsappService.generateWhatsAppMobileUrl(phone, message);

      return res.json({
        success: true,
        data: {
          phone: whatsappService.formatBrazilianPhone(phone),
          message,
          webUrl: webUrl.url,
          mobileUrl: mobileUrl.url,
          pdfDownloadUrl,
          previewUrl,
          pdfToken,
          shareMethod: usePreview ? 'preview' : 'direct',
          linkUsado: linkParaCompartilhar
        }
      });

    } catch (error) {
      console.error('Erro ao gerar URL do WhatsApp:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao gerar URL do WhatsApp'
      });
    }
  }

  /**
   * Gerar URL do WhatsApp com opções avançadas de compartilhamento
   */
  async generateWhatsAppUrlAdvanced(req, res) {
    try {
      const { id } = req.params;
      const { phoneNumber, customMessage, shareType = 'link' } = req.body;
      const userId = req.userId;

      // Criar um objeto de resposta mockado para o generatePdf
      const mockRes = {
        json: (data) => data,
        status: () => mockRes
      };

      // Buscar dados do orçamento usando o controller existente
      const dadosResponse = await orcamentoController.generatePdf({
        params: { id },
        userId: userId,
        userRole: req.userRole,
        vendedor: req.vendedor
      }, mockRes);

      if (!dadosResponse || !dadosResponse.success) {
        return res.status(404).json({
          success: false,
          message: 'Orçamento não encontrado'
        });
      }

      const dadosOrcamento = dadosResponse.data;
      const orcamento = dadosOrcamento.orcamento;
      const cliente = dadosOrcamento.cliente;
      const vendedor = dadosOrcamento.vendedor;

      // Usar número fornecido ou extrair do cliente
      let phone = phoneNumber;
      if (!phone) {
        const clientPhones = whatsappService.extractClientPhones(cliente);
        if (clientPhones.length > 0) {
          phone = clientPhones[0].full;
        } else {
          return res.status(400).json({
            success: false,
            message: 'Número de telefone não encontrado para este cliente'
          });
        }
      }

      // Gerar PDF do orçamento
      console.log('📄 [WhatsApp Advanced] Gerando PDF do orçamento...');
      const pdfBuffer = await pdfService.generateOrcamentoPdf(dadosOrcamento);
      console.log(`✅ [WhatsApp Advanced] PDF gerado: ${pdfBuffer.length} bytes`);

      // Criar um token único para este PDF
      const pdfToken = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      console.log(`🔑 [WhatsApp Advanced] Token gerado: ${pdfToken}`);
      
      // Salvar PDF temporariamente (em memória por 24 horas)
      global.tempPdfs = global.tempPdfs || new Map();
      global.tempPdfs.set(pdfToken, {
        buffer: pdfBuffer,
        filename: `Orcamento_${orcamento.codigo}.pdf`,
        createdAt: Date.now(),
        orcamentoCodigo: orcamento.codigo
      });

      console.log(`💾 [WhatsApp Advanced] PDF salvo temporariamente. Total de PDFs: ${global.tempPdfs.size}`);

      // Limpar PDFs antigos
      SmtpController.cleanExpiredPdfs();

      // Criar URL para download do PDF
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
      const pdfDownloadUrl = `${baseUrl}/api/download-pdf/${pdfToken}`;
      console.log(`🔗 [WhatsApp Advanced] URL do PDF: ${pdfDownloadUrl}`);

      // Criar dados base64 do PDF para compartilhamento nativo
      const pdfBase64 = pdfBuffer.toString('base64');

      // Mensagens diferentes baseadas no tipo de compartilhamento
      let message;
      if (shareType === 'native') {
        // Mensagem mais simples para compartilhamento nativo
        message = `📋 *Orçamento #${orcamento.codigo}* - DSVENDAS

Olá *${cliente.nome || cliente.razao}*! 👋

📅 Data: ${new Date(orcamento.dt_orcamento).toLocaleDateString('pt-BR')}
💰 Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.totais?.valor_total || 0)}
👨‍💼 Vendedor: ${vendedor.nome}

📄 Orçamento em anexo

Atenciosamente,
*Equipe DSVENDAS* ✨`.trim();
      } else {
        // Mensagem com link para compartilhamento web
        message = customMessage || `🏢 *DSVENDAS* - Orçamento Digital

Olá *${cliente.nome || cliente.razao}*! 👋

📋 *Orçamento #${orcamento.codigo}*
📅 Data: ${new Date(orcamento.dt_orcamento).toLocaleDateString('pt-BR')}
💰 Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.totais?.valor_total || 0)}
👨‍💼 Vendedor: ${vendedor.nome}

📄 *BAIXAR ORÇAMENTO EM PDF:*
${pdfDownloadUrl}

💡 *Como baixar:*
1️⃣ Clique no link acima
2️⃣ O PDF será baixado automaticamente
3️⃣ Válido por 24 horas

📞 Dúvidas? Entre em contato conosco!

Atenciosamente,
*Equipe DSVENDAS* ✨`.trim();
      }

      // Gerar URLs do WhatsApp
      const webUrl = whatsappService.generateWhatsAppUrl(phone, message);
      const mobileUrl = whatsappService.generateWhatsAppMobileUrl(phone, message);

      return res.json({
        success: true,
        data: {
          phone: whatsappService.formatBrazilianPhone(phone),
          message,
          webUrl: webUrl.url,
          mobileUrl: mobileUrl.url,
          pdfDownloadUrl,
          pdfToken,
          // Dados para compartilhamento nativo
          nativeShare: {
            filename: `Orcamento_${orcamento.codigo}.pdf`,
            mimeType: 'application/pdf',
            base64: shareType === 'native' ? pdfBase64 : null,
            size: pdfBuffer.length
          },
          shareOptions: {
            canUseNativeShare: true,
            preferredMethod: shareType
          }
        }
      });

    } catch (error) {
      console.error('Erro ao gerar URL avançada do WhatsApp:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao gerar URL do WhatsApp'
      });
    }
  }

  /**
   * Limpa PDFs temporários expirados (mais de 24 horas)
   */
  static cleanExpiredPdfs() {
    if (!global.tempPdfs) {
      console.log('📋 [Cleanup] global.tempPdfs não inicializado');
      return;
    }

    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000); // 24 horas
    const totalBefore = global.tempPdfs.size;
    let removedCount = 0;
    
    for (const [token, pdfData] of global.tempPdfs.entries()) {
      if (pdfData.createdAt < twentyFourHoursAgo) {
        global.tempPdfs.delete(token);
        removedCount++;
        console.log(`🗑️ [Cleanup] PDF expirado removido: ${token} (${pdfData.filename})`);
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 [Cleanup] Limpeza concluída: ${removedCount} PDFs removidos de ${totalBefore}. Total atual: ${global.tempPdfs.size}`);
    } else {
      console.log(`✅ [Cleanup] Nenhum PDF expirado encontrado. Total atual: ${global.tempPdfs.size}`);
    }
  }

  /**
   * Download de PDF temporário
   */
  async downloadTempPdf(req, res) {
    try {
      const { token } = req.params;
      
      console.log(`🔍 [PDF Download] Tentando baixar PDF com token: ${token}`);
      console.log(`📊 [PDF Download] PDFs temporários disponíveis: ${global.tempPdfs ? global.tempPdfs.size : 0}`);

      if (!global.tempPdfs) {
        console.log('❌ [PDF Download] global.tempPdfs não inicializado');
        global.tempPdfs = new Map();
      }

      if (!global.tempPdfs.has(token)) {
        console.log('❌ [PDF Download] Token não encontrado:', token);
        console.log('📋 [PDF Download] Tokens disponíveis:', Array.from(global.tempPdfs.keys()));
        
        return res.status(404).json({
          success: false,
          message: 'PDF não encontrado ou expirado. Por favor, gere um novo link.'
        });
      }

      const pdfData = global.tempPdfs.get(token);
      console.log(`✅ [PDF Download] PDF encontrado: ${pdfData.filename}, tamanho: ${pdfData.buffer.length} bytes`);

      // Verificar se não expirou (24 horas)
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
      if (pdfData.createdAt < twentyFourHoursAgo) {
        console.log('⏰ [PDF Download] PDF expirado, removendo...');
        global.tempPdfs.delete(token);
        return res.status(404).json({
          success: false,
          message: 'PDF expirado (válido por 24 horas). Por favor, gere um novo link.'
        });
      }

      console.log('📄 [PDF Download] Enviando PDF para download...');

      // Configurar headers para download
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfData.filename}"`,
        'Content-Length': pdfData.buffer.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      // Enviar o PDF
      res.send(pdfData.buffer);
      console.log('✅ [PDF Download] PDF enviado com sucesso!');

    } catch (error) {
      console.error('❌ [PDF Download] Erro ao fazer download do PDF:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao processar download'
      });
    }
  }

  /**
   * Debug - Verificar estado dos PDFs temporários
   */
  async debugTempPdfs(req, res) {
    try {
      if (!global.tempPdfs) {
        return res.json({
          success: true,
          data: {
            initialized: false,
            total: 0,
            pdfs: []
          }
        });
      }

      const pdfs = [];
      for (const [token, pdfData] of global.tempPdfs.entries()) {
        pdfs.push({
          token: token.substring(0, 10) + '...', // Mostrar apenas parte do token
          filename: pdfData.filename,
          size: pdfData.buffer.length,
          createdAt: new Date(pdfData.createdAt).toISOString(),
          orcamentoCodigo: pdfData.orcamentoCodigo,
          expired: pdfData.createdAt < (Date.now() - (24 * 60 * 60 * 1000)), // 24 horas
          expiresAt: new Date(pdfData.createdAt + (24 * 60 * 60 * 1000)).toISOString()
        });
      }

      return res.json({
        success: true,
        data: {
          initialized: true,
          total: global.tempPdfs.size,
          pdfs: pdfs
        }
      });
    } catch (error) {
      console.error('Erro no debug de PDFs temporários:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao verificar PDFs temporários'
      });
    }
  }

  /**
   * Teste - Criar PDF de teste para debugging
   */
  async createTestPdf(req, res) {
    try {
      // Inicializar global.tempPdfs se necessário
      global.tempPdfs = global.tempPdfs || new Map();
      
      // Criar token único
      const testToken = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Criar PDF de teste
      const testPdfContent = Buffer.from(`%PDF-1.4
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
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Teste PDF WhatsApp) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
299
%%EOF`);
      
      // Armazenar PDF
      global.tempPdfs.set(testToken, {
        buffer: testPdfContent,
        filename: 'Orcamento_TESTE.pdf',
        createdAt: Date.now(),
        orcamentoCodigo: 'TESTE'
      });
      
      console.log(`🧪 [Teste] PDF de teste criado com token: ${testToken}`);
      console.log(`📊 [Teste] Total de PDFs: ${global.tempPdfs.size}`);
      
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
      const pdfDownloadUrl = `${baseUrl}/api/download-pdf/${testToken}`;
      
      return res.json({
        success: true,
        data: {
          token: testToken,
          downloadUrl: pdfDownloadUrl,
          filename: 'Orcamento_TESTE.pdf',
          size: testPdfContent.length,
          totalPdfs: global.tempPdfs.size
        }
      });
    } catch (error) {
      console.error('Erro ao criar PDF de teste:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao criar PDF de teste'
      });
    }
  }

  /**
   * Gerar apenas link de download do PDF para teste
   */
  async generatePdfDownloadLink(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      // Criar um objeto de resposta mockado para o generatePdf
      const mockRes = {
        json: (data) => data,
        status: () => mockRes
      };

      // Buscar dados do orçamento usando o controller existente
      const dadosResponse = await orcamentoController.generatePdf({
        params: { id },
        userId: userId,
        userRole: req.userRole,
        vendedor: req.vendedor
      }, mockRes);

      if (!dadosResponse || !dadosResponse.success) {
        return res.status(404).json({
          success: false,
          message: 'Orçamento não encontrado'
        });
      }

      const dadosOrcamento = dadosResponse.data;
      const orcamento = dadosOrcamento.orcamento;

      // Gerar PDF do orçamento
      console.log('📄 [PDF Link] Gerando PDF do orçamento...');
      const pdfBuffer = await pdfService.generateOrcamentoPdf(dadosOrcamento);
      console.log(`✅ [PDF Link] PDF gerado: ${pdfBuffer.length} bytes`);

      // Criar um token único para este PDF
      const pdfToken = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      console.log(`🔑 [PDF Link] Token gerado: ${pdfToken}`);
      
      // Salvar PDF temporariamente (em memória por 24 horas)
      global.tempPdfs = global.tempPdfs || new Map();
      global.tempPdfs.set(pdfToken, {
        buffer: pdfBuffer,
        filename: `Orcamento_${orcamento.codigo}.pdf`,
        createdAt: Date.now(),
        orcamentoCodigo: orcamento.codigo
      });

      console.log(`💾 [PDF Link] PDF salvo temporariamente. Total de PDFs: ${global.tempPdfs.size}`);

      // Limpar PDFs antigos
      SmtpController.cleanExpiredPdfs();

      // Criar URL para download do PDF
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
      const pdfDownloadUrl = `${baseUrl}/api/download-pdf/${pdfToken}`;
      console.log(`🔗 [PDF Link] URL do PDF: ${pdfDownloadUrl}`);

      return res.json({
        success: true,
        data: {
          orcamentoCodigo: orcamento.codigo,
          pdfDownloadUrl,
          pdfToken,
          filename: `Orcamento_${orcamento.codigo}.pdf`,
          expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(),
          message: 'PDF gerado com sucesso! Link válido por 24 horas.'
        }
      });

    } catch (error) {
      console.error('Erro ao gerar link do PDF:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao gerar link do PDF'
      });
    }
  }

  /**
   * Gerar página de preview do orçamento para compartilhamento (estilo Facebook)
   */
  async generateOrcamentoPreview(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      // Criar um objeto de resposta mockado para o generatePdf
      const mockRes = {
        json: (data) => data,
        status: () => mockRes
      };

      // Buscar dados do orçamento usando o controller existente
      const dadosResponse = await orcamentoController.generatePdf({
        params: { id },
        userId: userId,
        userRole: req.userRole,
        vendedor: req.vendedor
      }, mockRes);

      if (!dadosResponse || !dadosResponse.success) {
        return res.status(404).json({
          success: false,
          message: 'Orçamento não encontrado'
        });
      }

      const dadosOrcamento = dadosResponse.data;
      const orcamento = dadosOrcamento.orcamento;
      const cliente = dadosOrcamento.cliente;
      const vendedor = dadosOrcamento.vendedor;

      // Gerar PDF do orçamento
      console.log('📄 [Preview] Gerando PDF do orçamento...');
      const pdfBuffer = await pdfService.generateOrcamentoPdf(dadosOrcamento);
      console.log(`✅ [Preview] PDF gerado: ${pdfBuffer.length} bytes`);

      // Criar um token único para este PDF
      const pdfToken = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      console.log(`🔑 [Preview] Token gerado: ${pdfToken}`);
      
      // Salvar PDF temporariamente
      global.tempPdfs = global.tempPdfs || new Map();
      global.tempPdfs.set(pdfToken, {
        buffer: pdfBuffer,
        filename: `Orcamento_${orcamento.codigo}.pdf`,
        createdAt: Date.now(),
        orcamentoCodigo: orcamento.codigo
      });

      // Limpar PDFs antigos
      SmtpController.cleanExpiredPdfs();

      // Criar URLs
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
      const pdfDownloadUrl = `${baseUrl}/api/download-pdf/${pdfToken}`;
      const previewUrl = `${baseUrl}/api/orcamentos/${id}/preview/${pdfToken}`;

      console.log(`🔗 [Preview] URL de preview: ${previewUrl}`);

      return res.json({
        success: true,
        data: {
          orcamento: {
            codigo: orcamento.codigo,
            data: new Date(orcamento.dt_orcamento).toLocaleDateString('pt-BR'),
            valor: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.totais?.valor_total || 0),
            cliente: cliente.nome || cliente.razao,
            vendedor: vendedor.nome
          },
          previewUrl,
          pdfDownloadUrl,
          pdfToken,
          shareData: {
            title: `Orçamento #${orcamento.codigo} - DSVENDAS`,
            description: `Orçamento para ${cliente.nome || cliente.razao} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.totais?.valor_total || 0)}`,
            image: `${baseUrl}/public/dsvendas-logo.svg`,
            url: previewUrl
          }
        }
      });

    } catch (error) {
      console.error('Erro ao gerar preview do orçamento:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao gerar preview do orçamento'
      });
    }
  }

  /**
   * Servir página de preview do orçamento (como Facebook)
   */
  async serveOrcamentoPreview(req, res) {
    try {
      const { id, token } = req.params;

      // Verificar se o PDF existe
      if (!global.tempPdfs || !global.tempPdfs.has(token)) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html><head><title>Preview Expirado</title></head>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>⏰ Preview Expirado</h1>
            <p>Este link de preview expirou (válido por 24 horas).</p>
            <p>Solicite um novo orçamento.</p>
          </body></html>
        `);
      }

      const pdfData = global.tempPdfs.get(token);
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
      const pdfDownloadUrl = `${baseUrl}/api/download-pdf/${token}`;

      // Página HTML com meta tags para preview (como Facebook faz)
      const previewHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            
            <!-- Meta tags para WhatsApp/Facebook preview -->
            <meta property="og:title" content="📋 Orçamento #${pdfData.orcamentoCodigo} - DSVENDAS">
            <meta property="og:description" content="Orçamento digital da DSVENDAS. Clique para visualizar e baixar o PDF.">
            <meta property="og:type" content="website">
            <meta property="og:url" content="${req.protocol}://${req.get('host')}${req.originalUrl}">
            <meta property="og:image" content="${baseUrl}/public/dsvendas-logo.svg">
            
            <!-- Meta tags para Twitter -->
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="📋 Orçamento #${pdfData.orcamentoCodigo} - DSVENDAS">
            <meta name="twitter:description" content="Orçamento digital da DSVENDAS. Clique para visualizar e baixar o PDF.">
            
            <title>📋 Orçamento #${pdfData.orcamentoCodigo} - DSVENDAS</title>
            
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .container {
                    background: white;
                    border-radius: 15px;
                    padding: 40px;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.1);
                    max-width: 500px;
                    width: 100%;
                }
                .logo { font-size: 3em; margin-bottom: 20px; }
                h1 { color: #333; margin-bottom: 10px; }
                .subtitle { color: #666; margin-bottom: 30px; }
                .download-btn {
                    background: linear-gradient(135deg, #25d366 0%, #128c7e 100%);
                    color: white;
                    padding: 15px 30px;
                    border: none;
                    border-radius: 50px;
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    text-decoration: none;
                    display: inline-block;
                    transition: transform 0.3s;
                    box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3);
                }
                .download-btn:hover { transform: translateY(-2px); }
                .info { 
                    background: #f8f9fa; 
                    padding: 20px; 
                    border-radius: 10px; 
                    margin: 20px 0; 
                    border-left: 4px solid #25d366;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">📋</div>
                <h1>Orçamento #${pdfData.orcamentoCodigo}</h1>
                <p class="subtitle">DSVENDAS - Sistema de Gestão</p>
                
                <div class="info">
                    <p><strong>📄 Arquivo:</strong> ${pdfData.filename}</p>
                    <p><strong>📏 Tamanho:</strong> ${(pdfData.buffer.length / 1024).toFixed(1)} KB</p>
                    <p><strong>🕒 Válido até:</strong> ${new Date(pdfData.createdAt + (24 * 60 * 60 * 1000)).toLocaleString('pt-BR')}</p>
                </div>
                
                <a href="${pdfDownloadUrl}" class="download-btn">
                    📥 Baixar PDF
                </a>
                
                <p style="margin-top: 20px; color: #666; font-size: 14px;">
                    Este orçamento será baixado automaticamente quando você clicar no botão acima.
                </p>
            </div>
        </body>
        </html>
      `;

      res.send(previewHtml);

    } catch (error) {
      console.error('Erro ao servir preview do orçamento:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }

  /**
   * Gerar WhatsApp com simulação de preview (para demonstração local)
   */
  async generateWhatsAppWithPreviewDemo(req, res) {
    try {
      const { id } = req.params;
      const { phoneNumber } = req.body;
      const userId = req.userId;

      // Criar um objeto de resposta mockado para o generatePdf
      const mockRes = {
        json: (data) => data,
        status: () => mockRes
      };

      // Buscar dados do orçamento usando o controller existente
      const dadosResponse = await orcamentoController.generatePdf({
        params: { id },
        userId: userId,
        userRole: req.userRole,
        vendedor: req.vendedor
      }, mockRes);

      if (!dadosResponse || !dadosResponse.success) {
        return res.status(404).json({
          success: false,
          message: 'Orçamento não encontrado'
        });
      }

      const dadosOrcamento = dadosResponse.data;
      const orcamento = dadosOrcamento.orcamento;
      const cliente = dadosOrcamento.cliente;
      const vendedor = dadosOrcamento.vendedor;

      // Usar número fornecido ou extrair do cliente
      let phone = phoneNumber;
      if (!phone) {
        const clientPhones = whatsappService.extractClientPhones(cliente);
        if (clientPhones.length > 0) {
          phone = clientPhones[0].full;
        } else {
          return res.status(400).json({
            success: false,
            message: 'Número de telefone não encontrado para este cliente'
          });
        }
      }

      // Gerar PDF do orçamento
      console.log('📄 [WhatsApp Demo] Gerando PDF do orçamento...');
      const pdfBuffer = await pdfService.generateOrcamentoPdf(dadosOrcamento);
      console.log(`✅ [WhatsApp Demo] PDF gerado: ${pdfBuffer.length} bytes`);

      // Criar um token único para este PDF
      const pdfToken = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      console.log(`🔑 [WhatsApp Demo] Token gerado: ${pdfToken}`);
      
      // Salvar PDF temporariamente
      global.tempPdfs = global.tempPdfs || new Map();
      global.tempPdfs.set(pdfToken, {
        buffer: pdfBuffer,
        filename: `Orcamento_${orcamento.codigo}.pdf`,
        createdAt: Date.now(),
        orcamentoCodigo: orcamento.codigo
      });

      // Limpar PDFs antigos
      SmtpController.cleanExpiredPdfs();

      // Criar URLs (em produção seria sua URL pública)
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
      const pdfDownloadUrl = `${baseUrl}/api/download-pdf/${pdfToken}`;
      
      // ⚠️ PROBLEMA: localhost não funciona para preview no WhatsApp
      // Em produção, seria algo como: https://seudominio.com.br/api/orcamentos/123/preview/token
      const previewUrl = `${baseUrl}/api/orcamentos/${id}/preview/${pdfToken}`;
      
      console.log(`🔗 [WhatsApp Demo] URL do PDF: ${pdfDownloadUrl}`);
      console.log(`🖼️ [WhatsApp Demo] URL do Preview: ${previewUrl}`);
      console.log(`⚠️ [WhatsApp Demo] ATENÇÃO: localhost não funciona para preview no WhatsApp!`);

      // Para demonstração local, vamos explicar o que aconteceria em produção
      const exemploProdução = {
        previewUrlReal: `https://seudominio.com.br/api/orcamentos/${orcamento.codigo}/preview/${pdfToken}`,
        comoFuncionaEmProdução: [
          "1. Sistema gera URL pública (não localhost)",
          "2. WhatsApp acessa a URL e lê as meta tags",
          "3. Mostra preview bonito com título, descrição e imagem",
          "4. Cliente clica no preview (não no link feio)",
          "5. Vai para página bonita e baixa PDF"
        ],
        problemasComLocalhost: [
          "❌ WhatsApp não consegue acessar localhost",
          "❌ Preview não aparece",
          "❌ Fica só texto simples"
        ]
      };

      // Gerar mensagem para teste local (sem preview, só link direto)
      const mensagemTeste = `🏢 *DSVENDAS* - Orçamento Digital

Olá *${cliente.nome || cliente.razao}*! 👋

📋 *Orçamento #${orcamento.codigo}*
📅 Data: ${new Date(orcamento.dt_orcamento).toLocaleDateString('pt-BR')}
💰 Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.totais?.valor_total || 0)}
👨‍💼 Vendedor: ${vendedor.nome}

📄 *BAIXAR ORÇAMENTO EM PDF:*
${pdfDownloadUrl}

💡 *Como baixar:*
1️⃣ Clique no link acima
2️⃣ O PDF será baixado automaticamente
3️⃣ Válido por 24 horas

📞 Dúvidas? Entre em contato conosco!

Atenciosamente,
*Equipe DSVENDAS* ✨

⚠️ *Nota:* Em produção, este link mostraria um preview bonito!`.trim();

      // Gerar mensagem que funcionaria em produção (com preview)
      const mensagemProdução = `🏢 *DSVENDAS* - Orçamento Digital

Olá *${cliente.nome || cliente.razao}*! 👋

📋 *Orçamento #${orcamento.codigo}*
📅 Data: ${new Date(orcamento.dt_orcamento).toLocaleDateString('pt-BR')}
💰 Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.totais?.valor_total || 0)}
👨‍💼 Vendedor: ${vendedor.nome}

🖼️ *VER E BAIXAR ORÇAMENTO:*
${exemploProdução.previewUrlReal}

💡 *Preview inteligente:*
1️⃣ Clique no link para ver o preview
2️⃣ WhatsApp mostra título, descrição e imagem
3️⃣ Baixe o PDF diretamente da página

📞 Dúvidas? Entre em contato conosco!

Atenciosamente,
*Equipe DSVENDAS* ✨`.trim();

      // Gerar URLs do WhatsApp
      const webUrlTeste = whatsappService.generateWhatsAppUrl(phone, mensagemTeste);
      const mobileUrlTeste = whatsappService.generateWhatsAppMobileUrl(phone, mensagemTeste);
      
      const webUrlProdução = whatsappService.generateWhatsAppUrl(phone, mensagemProdução);

      return res.json({
        success: true,
        data: {
          phone: whatsappService.formatBrazilianPhone(phone),
          orcamento: {
            codigo: orcamento.codigo,
            cliente: cliente.nome || cliente.razao,
            valor: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.totais?.valor_total || 0)
          },
          teste_local: {
            mensagem: mensagemTeste,
            webUrl: webUrlTeste.url,
            mobileUrl: mobileUrlTeste.url,
            observacao: "Este funciona agora, mas sem preview bonito (devido ao localhost)"
          },
          exemplo_produção: {
            mensagem: mensagemProdução,
            webUrl: webUrlProdução.url,
            previewUrl: exemploProdução.previewUrlReal,
            comoFunciona: exemploProdução.comoFuncionaEmProdução,
            observacao: "Este é como funcionaria em produção com domínio real"
          },
          pdfDownloadUrl,
          pdfToken,
          explicação: {
            problema: "localhost não é acessível pelo WhatsApp para preview",
            solução: "Em produção, usar domínio público (https://seudominio.com.br)",
            resultado: "WhatsApp conseguirá acessar a URL e mostrar preview bonito"
          }
        }
      });

    } catch (error) {
      console.error('Erro ao gerar demo WhatsApp com preview:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao gerar demo WhatsApp'
      });
    }
  }

  /**
   * Enviar orçamento via WhatsApp Cloud API (anexo direto - SOLUÇÃO DEFINITIVA!)
   */
  async sendOrcamentoWhatsAppCloudAPI(req, res) {
    try {
      const { id } = req.params;
      const { phoneNumber, customMessage } = req.body;
      const userId = req.userId;

      console.log('🚀 [WhatsApp Cloud API] Iniciando envio de orçamento via API oficial...');

      // Importar o serviço da API Cloud
      const whatsappCloudService = require('../services/whatsappCloudService');

      // Verificar se a API está configurada
      if (!whatsappCloudService.isConfigured()) {
        return res.status(400).json({
          success: false,
          message: 'WhatsApp Cloud API não configurada. Configure WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN no arquivo .env',
          instructions: {
            step1: 'Acesse https://developers.facebook.com/apps/',
            step2: 'Crie uma aplicação WhatsApp Business',
            step3: 'Obtenha o Phone Number ID e Access Token',
            step4: 'Configure no .env: WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN'
          }
        });
      }

      // Criar um objeto de resposta mockado para o generatePdf
      const mockRes = {
        json: (data) => data,
        status: () => mockRes
      };

      // Buscar dados do orçamento usando o controller existente
      const dadosResponse = await orcamentoController.generatePdf({
        params: { id },
        userId: userId,
        userRole: req.userRole,
        vendedor: req.vendedor
      }, mockRes);

      if (!dadosResponse || !dadosResponse.success) {
        return res.status(404).json({
          success: false,
          message: 'Orçamento não encontrado'
        });
      }

      const dadosOrcamento = dadosResponse.data;
      const orcamento = dadosOrcamento.orcamento;
      const cliente = dadosOrcamento.cliente;
      const vendedor = dadosOrcamento.vendedor;

      // Usar número fornecido ou extrair do cliente
      let phone = phoneNumber;
      if (!phone) {
        const clientPhones = whatsappService.extractClientPhones(cliente);
        if (clientPhones.length > 0) {
          phone = clientPhones[0].full;
        } else {
          return res.status(400).json({
            success: false,
            message: 'Número de telefone não encontrado para este cliente'
          });
        }
      }

      // Gerar PDF do orçamento
      console.log('📄 [WhatsApp Cloud API] Gerando PDF do orçamento...');
      const pdfBuffer = await pdfService.generateOrcamentoPdf(dadosOrcamento);
      console.log(`✅ [WhatsApp Cloud API] PDF gerado: ${pdfBuffer.length} bytes`);

      // Enviar via WhatsApp Cloud API (ANEXO DIRETO!)
      console.log(`📱 [WhatsApp Cloud API] Enviando para: ${phone}`);
      const result = await whatsappCloudService.sendOrcamento(phone, dadosOrcamento, pdfBuffer);

      if (!result.success) {
        console.error('❌ [WhatsApp Cloud API] Falha no envio:', result.error);
        return res.status(500).json({
          success: false,
          message: 'Erro ao enviar orçamento via WhatsApp',
          error: result.error,
          details: result.details
        });
      }

      console.log('🎉 [WhatsApp Cloud API] Orçamento enviado com sucesso!');

      return res.json({
        success: true,
        message: `Orçamento #${orcamento.codigo} enviado com sucesso via WhatsApp Cloud API!`,
        data: {
          phone: result.phone,
          orcamento: {
            codigo: orcamento.codigo,
            cliente: cliente.nome || cliente.razao,
            valor: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.totais?.valor_total || 0),
            vendedor: vendedor.nome
          },
          whatsapp: {
            messageId: result.results.message.messageId,
            documentId: result.results.document.messageId,
            mediaId: result.results.document.mediaId,
            filename: result.results.document.filename
          },
          advantages: [
            '✅ PDF anexado diretamente (como app nativo!)',
            '✅ Não precisa abrir WhatsApp Web',
            '✅ Envio automático e profissional',
            '✅ Funciona com localhost',
            '✅ Status de entrega disponível'
          ]
        }
      });

    } catch (error) {
      console.error('❌ [WhatsApp Cloud API] Erro inesperado:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno ao enviar orçamento via WhatsApp Cloud API',
        error: error.message
      });
    }
  }

  /**
   * Testar configuração da WhatsApp Cloud API
   */
  async testWhatsAppCloudAPI(req, res) {
    try {
      const whatsappCloudService = require('../services/whatsappCloudService');

      console.log('🧪 [WhatsApp Cloud API] Testando configuração...');

      if (!whatsappCloudService.isConfigured()) {
        return res.status(400).json({
          success: false,
          message: 'WhatsApp Cloud API não configurada',
          configured: false,
          missing: {
            WHATSAPP_PHONE_NUMBER_ID: !process.env.WHATSAPP_PHONE_NUMBER_ID,
            WHATSAPP_ACCESS_TOKEN: !process.env.WHATSAPP_ACCESS_TOKEN
          },
          instructions: {
            '1': 'Acesse https://developers.facebook.com/apps/',
            '2': 'Crie uma aplicação WhatsApp Business',
            '3': 'Configure webhook (opcional para envio)',
            '4': 'Obtenha Phone Number ID e Access Token',
            '5': 'Adicione no .env: WHATSAPP_PHONE_NUMBER_ID=123456789',
            '6': 'Adicione no .env: WHATSAPP_ACCESS_TOKEN=EAAxxxxx...'
          }
        });
      }

      // Testar obtenção de informações da conta
      const accountInfo = await whatsappCloudService.getAccountInfo();

      if (!accountInfo.success) {
        return res.status(400).json({
          success: false,
          message: 'Erro ao conectar com WhatsApp Cloud API',
          configured: true,
          error: accountInfo.error,
          details: accountInfo.details
        });
      }

      console.log('✅ [WhatsApp Cloud API] Configuração válida!');

      return res.json({
        success: true,
        message: 'WhatsApp Cloud API configurada e funcionando!',
        configured: true,
        account: accountInfo.account,
        capabilities: [
          'Enviar mensagens de texto',
          'Enviar documentos (PDF, DOC, etc.)',
          'Enviar imagens e vídeos',
          'Receber webhooks (opcional)',
          'Verificar status de entrega',
          'Anexar arquivos diretamente'
        ]
      });

    } catch (error) {
      console.error('❌ [WhatsApp Cloud API] Erro no teste:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno ao testar WhatsApp Cloud API',
        error: error.message
      });
    }
  }
}

module.exports = new SmtpController(); 