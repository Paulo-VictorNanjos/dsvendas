// Configuração para o react-pdf
import { pdfjs } from 'react-pdf';

// Configuração para PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Exportamos o objeto pdfConfig para futuras configurações adicionais
export const pdfConfig = {
  // Outras configurações podem ser adicionadas aqui conforme necessário
};

export default pdfjs; 