// Configuração para o react-pdf
import { pdfjs } from 'react-pdf';

// Configuração do worker do PDF.js com fallback
const configureWorker = () => {
  try {
    // Tentar CDN primeiro
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    
    // Fallback para jsdelivr
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
    }
  } catch (error) {
    console.error('[PDFConfig] Erro ao configurar worker:', error);
    // Fallback manual
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
  }
};

// Executar configuração
configureWorker();

// Configuração adicional para melhor compatibilidade
export const pdfConfig = {
  // Configurações para react-pdf
  options: {
    cMapUrl: `//cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `//cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
    // Configurações adicionais para melhor compatibilidade
    isEvalSupported: false,
    isOffscreenCanvasSupported: false,
    maxImageSize: 16777216, // 16MB
    verbosity: 1 // Nível de log reduzido
  },
  
  // Configurações de renderização
  pageOptions: {
    renderTextLayer: false,
    renderAnnotationLayer: false,
    renderInteractiveForms: false
  }
};

// Log de debug
console.log('[PDFConfig] Worker configurado:', pdfjs.GlobalWorkerOptions.workerSrc);
console.log('[PDFConfig] Versão PDF.js:', pdfjs.version);

export default pdfjs; 