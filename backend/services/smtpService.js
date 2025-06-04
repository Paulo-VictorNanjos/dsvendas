const knex = require('../database/connection');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Chave para criptografia (em produção, deve vir do .env)
const ENCRYPTION_KEY_RAW = process.env.SMTP_ENCRYPTION_KEY || 'dsvendas-smtp-key-32-chars-long!!';
const ALGORITHM = 'aes-256-cbc';

// Garantir que a chave tenha exatamente 32 bytes para AES-256
function getEncryptionKey() {
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY_RAW).digest();
  return key;
}

class SmtpService {
  /**
   * Criptografa uma string
   */
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.error(`Erro ao criptografar: ${error.message}`);
      throw error;
    }
  }

  /**
   * Descriptografa uma string
   */
  decrypt(text) {
    try {
      const textParts = text.split(':');
      const iv = Buffer.from(textParts.shift(), 'hex');
      const encryptedText = textParts.join(':');
      const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error(`Erro ao descriptografar: ${error.message}`);
      throw error;
    }
  }

  /**
   * Salva ou atualiza configuração SMTP do usuário
   */
  async saveUserSmtpConfig(userId, config) {
    try {
      // Verificar se já existe configuração para este usuário
      const existingConfig = await knex('user_smtp_config')
        .where('user_id', userId)
        .first();

      const smtpConfig = {
        user_id: userId,
        smtp_host: config.smtp_host,
        smtp_port: config.smtp_port,
        smtp_secure: config.smtp_secure,
        smtp_user: config.smtp_user,
        from_name: config.from_name,
        from_email: config.from_email,
        active: config.active !== undefined ? config.active : true,
        updated_at: knex.fn.now()
      };

      // Criptografar a senha apenas se foi fornecida
      if (config.smtp_password) {
        smtpConfig.smtp_password = this.encrypt(config.smtp_password);
      }

      if (existingConfig) {
        // Atualizar configuração existente
        await knex('user_smtp_config')
          .where('user_id', userId)
          .update(smtpConfig);
      } else {
        // Inserir nova configuração
        smtpConfig.created_at = knex.fn.now();
        await knex('user_smtp_config').insert(smtpConfig);
      }

      return { success: true, message: 'Configuração SMTP salva com sucesso' };
    } catch (error) {
      logger.error(`Erro ao salvar configuração SMTP: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtém configuração SMTP do usuário
   */
  async getUserSmtpConfig(userId) {
    try {
      const config = await knex('user_smtp_config')
        .where('user_id', userId)
        .where('active', true)
        .first();

      if (!config) {
        return null;
      }

      // Descriptografar a senha
      config.smtp_password = this.decrypt(config.smtp_password);

      return config;
    } catch (error) {
      logger.error(`Erro ao obter configuração SMTP: ${error.message}`);
      throw error;
    }
  }

  /**
   * Testa a configuração SMTP
   */
  async testSmtpConfig(config) {
    try {
      const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_secure,
        auth: {
          user: config.smtp_user,
          pass: config.smtp_password
        }
      });

      // Verificar a conexão
      await transporter.verify();
      return { success: true, message: 'Configuração SMTP válida' };
    } catch (error) {
      logger.error(`Erro ao testar SMTP: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Envia email usando a configuração do usuário
   */
  async sendEmail(userId, emailData) {
    try {
      const smtpConfig = await this.getUserSmtpConfig(userId);
      
      if (!smtpConfig) {
        throw new Error('Configuração SMTP não encontrada para este usuário');
      }

      const transporter = nodemailer.createTransport({
        host: smtpConfig.smtp_host,
        port: smtpConfig.smtp_port,
        secure: smtpConfig.smtp_secure,
        auth: {
          user: smtpConfig.smtp_user,
          pass: smtpConfig.smtp_password
        }
      });

      const mailOptions = {
        from: `"${smtpConfig.from_name}" <${smtpConfig.from_email}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        attachments: emailData.attachments || []
      };

      const result = await transporter.sendMail(mailOptions);
      
      logger.info(`Email enviado com sucesso para ${emailData.to}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error(`Erro ao enviar email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove configuração SMTP do usuário
   */
  async deleteUserSmtpConfig(userId) {
    try {
      await knex('user_smtp_config')
        .where('user_id', userId)
        .del();

      return { success: true, message: 'Configuração SMTP removida com sucesso' };
    } catch (error) {
      logger.error(`Erro ao remover configuração SMTP: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new SmtpService(); 