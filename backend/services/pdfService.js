const OrcamentoPDF = require('../components/OrcamentoPDF');
const logger = require('../utils/logger');

class PdfService {
  /**
   * Gera PDF do orçamento usando PDFKit
   */
  async generateOrcamentoPdf(dadosOrcamento) {
    try {
      // Gerar o buffer do PDF usando PDFKit
      const pdfBuffer = await OrcamentoPDF.generatePDF(dadosOrcamento);
      
      return pdfBuffer;
    } catch (error) {
      logger.error(`Erro ao gerar PDF: ${error.message}`, error);
      throw new Error(`Erro ao gerar PDF: ${error.message}`);
    }
  }
}

module.exports = new PdfService(); 