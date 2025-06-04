const { OrcamentoPDF, pdf } = require('../components/OrcamentoPDF');
const logger = require('../utils/logger');

class PdfService {
  /**
   * Gera PDF do orçamento usando o mesmo componente do frontend
   */
  async generateOrcamentoPdf(dadosOrcamento) {
    try {
      // Criar o documento PDF usando o componente React
      const document = OrcamentoPDF({ dados: dadosOrcamento });
      
      // Gerar o buffer do PDF
      const pdfBuffer = await pdf(document).toBuffer();
      
      return pdfBuffer;
    } catch (error) {
      logger.error(`Erro ao gerar PDF: ${error.message}`, error);
      throw new Error(`Erro ao gerar PDF: ${error.message}`);
    }
  }
}

module.exports = new PdfService(); 