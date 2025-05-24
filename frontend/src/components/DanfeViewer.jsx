import React, { useState } from 'react';
import { Modal, Button, Spinner, Alert } from 'react-bootstrap';
import { Document, Page } from 'react-pdf';
import { FaDownload, FaEye, FaTimesCircle } from 'react-icons/fa';
import { consultarDanfeAPI } from '../services/notasFiscaisService';

// Importar a configuração PDF.js (já configurada)
import '../utils/pdfConfig';

/**
 * Componente para visualizar e baixar DANFE a partir do XML da NF-e
 * @param {Object} props Propriedades do componente
 * @param {string} props.xmlNFe XML da NF-e
 * @param {string} props.chaveNFe Chave de acesso da NF-e (44 dígitos)
 * @param {boolean} props.useChaveOnly Indica se deve usar apenas a chave NFe
 * @param {string} props.numeroNF Número da NF-e (para identificação)
 * @param {function} props.onClose Função chamada ao fechar o modal
 * @param {boolean} props.show Controla se o modal deve ser exibido
 */
const DanfeViewer = ({ xmlNFe, chaveNFe, useChaveOnly, numeroNF, onClose, show }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pdfData, setPdfData] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [viewMode, setViewMode] = useState('download'); // 'download' ou 'view'

  const handleRequestDanfe = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Se useChaveOnly for true, usamos a chave NFe em vez do XML
      const dataToSend = useChaveOnly ? chaveNFe : xmlNFe;
      console.log(`[DanfeViewer] Consultando com ${useChaveOnly ? 'chave NFe' : 'XML'}: ${useChaveOnly ? chaveNFe : 'XML disponível'}`);
      
      const result = await consultarDanfeAPI(dataToSend, useChaveOnly);
      
      if (result.success && result.pdf) {
        setPdfData(result.pdf);
        setViewMode('view');
      } else {
        throw new Error(result.error || 'Não foi possível gerar o DANFE');
      }
    } catch (err) {
      console.error('Erro ao processar DANFE:', err);
      
      // Extrair informações mais detalhadas do erro quando disponíveis
      const errorDetails = err.response?.data?.data?.detalhes;
      const statusCode = err.response?.status || err.response?.data?.data?.statusCode;
      const errorMessage = err.message || 'Erro ao gerar DANFE';
      const sugestao = err.response?.data?.data?.sugestao || err.sugestao;
      
      let detailedError = errorMessage;
      if (statusCode) {
        detailedError += ` (Status: ${statusCode})`;
      }
      
      // Verificar se temos detalhes específicos da API
      if (errorDetails) {
        detailedError += `\n\nDetalhes: ${JSON.stringify(errorDetails)}`;
      }
      
      // Adicionar a sugestão, se disponível
      if (sugestao) {
        detailedError += `\n\nSugestão: ${sugestao}`;
      }
      
      setError(detailedError);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfData) return;
    
    // Criar um link para download
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${pdfData}`;
    link.download = `DANFE_${numeroNF || 'NF'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const changePage = (offset) => {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  };

  const previousPage = () => changePage(-1);
  
  const nextPage = () => changePage(1);

  const resetViewer = () => {
    setPdfData(null);
    setViewMode('download');
    setError(null);
  };

  return (
    <Modal 
      show={show} 
      onHide={onClose}
      size={viewMode === 'view' ? 'lg' : 'md'}
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>
          {viewMode === 'download' ? 'Download DANFE' : `Visualização DANFE - NF ${numeroNF || ''}`}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger">
            <Alert.Heading>Erro ao gerar DANFE</Alert.Heading>
            <p style={{ whiteSpace: 'pre-line' }}>{error}</p>
            {error.includes('A API') && (
              <div className="mt-3">
                <Alert variant="info">
                  <strong>Informação:</strong> O serviço DANFe Rápida requer o XML completo da nota fiscal para gerar o DANFE. 
                  Para visualizar o documento, é necessário que o XML esteja disponível no sistema.
                </Alert>
              </div>
            )}
          </Alert>
        )}

        {viewMode === 'download' && !loading && !error && (
          <div className="text-center p-4">
            <h5>Clique no botão abaixo para gerar o DANFE</h5>
            <p className="text-muted">
              {useChaveOnly 
                ? 'O sistema tentará gerar o DANFE a partir da chave de acesso. Observe que o DANFe Rápida requer o XML da nota, então a operação só terá sucesso se o XML estiver disponível em nosso sistema.'
                : 'O DANFE será gerado a partir do XML da NF-e utilizando o serviço DANFe Rápida'
              }
            </p>
            {useChaveOnly && (
              <Alert variant="info" className="mb-3 text-start">
                <small>
                  <strong>Nota:</strong> Se o XML não estiver disponível, não será possível visualizar o DANFE apenas com a chave.
                  Neste caso, tente acessar o DANFE diretamente no portal da SEFAZ utilizando a chave de acesso.
                </small>
              </Alert>
            )}
            <Button 
              variant="primary" 
              size="lg" 
              onClick={handleRequestDanfe}
              className="mt-3"
            >
              <FaEye className="me-2" />
              Gerar DANFE
            </Button>
          </div>
        )}

        {loading && (
          <div className="text-center p-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Gerando DANFE, aguarde...</p>
          </div>
        )}

        {viewMode === 'view' && pdfData && (
          <>
            <div className="pdf-container" style={{ height: '60vh', overflow: 'auto' }}>
              <Document
                file={`data:application/pdf;base64,${pdfData}`}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<Spinner animation="border" />}
                error={<Alert variant="danger">Erro ao carregar PDF</Alert>}
              >
                <Page 
                  pageNumber={pageNumber} 
                  width={window.innerWidth > 768 ? 600 : window.innerWidth - 100}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
            </div>
            
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div>
                <Button 
                  variant="outline-secondary" 
                  onClick={previousPage} 
                  disabled={pageNumber <= 1}
                  size="sm"
                >
                  Anterior
                </Button>
                <span className="mx-2">
                  Página {pageNumber} de {numPages}
                </span>
                <Button 
                  variant="outline-secondary" 
                  onClick={nextPage} 
                  disabled={pageNumber >= numPages}
                  size="sm"
                >
                  Próxima
                </Button>
              </div>
              
              <div>
                <Button 
                  variant="outline-danger" 
                  onClick={resetViewer}
                  className="me-2"
                  size="sm"
                >
                  <FaTimesCircle className="me-1" />
                  Fechar
                </Button>
                <Button 
                  variant="success" 
                  onClick={handleDownload}
                  size="sm"
                >
                  <FaDownload className="me-1" />
                  Baixar PDF
                </Button>
              </div>
            </div>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default DanfeViewer; 