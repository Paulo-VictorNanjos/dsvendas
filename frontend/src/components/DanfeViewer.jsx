import React, { useState, useCallback } from 'react';
import { Modal, Button, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { Document, Page, pdfjs } from 'react-pdf';
import { FaDownload, FaEye, FaTimesCircle } from 'react-icons/fa';
import { consultarDanfeAPI } from '../services/notasFiscaisService';
import api from '../services/api';

// Importar a configuração PDF.js (já configurada)
import '../utils/pdfConfig';
import { pdfConfig } from '../utils/pdfConfig';

// Configurar o worker do PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

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
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [serviceStatus, setServiceStatus] = useState(null);

  const handleRequestDanfe = async (forceAttempt = false) => {
    setLoading(true);
    setError(null);
    
    try {
      // Se useChaveOnly for true, usamos a chave NFe em vez do XML
      const dataToSend = useChaveOnly ? chaveNFe : xmlNFe;
      console.log(`[DanfeViewer] Consultando com ${useChaveOnly ? 'chave NFe' : 'XML'}: ${useChaveOnly ? chaveNFe : 'XML disponível'}`);
      
      const result = await consultarDanfeAPI(dataToSend, useChaveOnly, forceAttempt);
      
      if (result.success && result.pdf) {
        setPdfData(result.pdf);
        setViewMode('view');
      } else {
        throw new Error(result.error || 'Não foi possível gerar o DANFE');
      }
    } catch (err) {
      console.error('Erro ao processar DANFE:', err);
      
      // Extrair informações mais detalhadas do erro quando disponíveis
      const responseData = err.response?.data?.data;
      const errorDetails = responseData?.detalhes;
      const statusCode = err.response?.status || responseData?.statusCode;
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao gerar DANFE';
      const sugestoes = responseData?.sugestoes || [];
      const xmlSize = responseData?.xmlSize;
      const alternativas = responseData?.alternativas || [];
      const xmlDisponivel = responseData?.xml_disponivel;
      const acaoSugerida = responseData?.acao_sugerida;
      
      // Construir mensagem de erro detalhada
      let detailedError = errorMessage;
      
      if (statusCode) {
        detailedError += ` (HTTP ${statusCode})`;
      }
      
      if (xmlSize) {
        detailedError += `\n📊 Tamanho do XML: ${xmlSize}`;
      }
      
      // Adicionar explicação específica para XMLs grandes
      if (statusCode === 413 || acaoSugerida === 'download_xml') {
        detailedError += '\n\n🚫 Limitação do Serviço Externo:';
        detailedError += '\nO serviço ws.meudanfe.com não consegue processar XMLs muito grandes.';
        detailedError += '\nEsta é uma limitação conhecida do serviço externo, não do nosso sistema.';
      }
      
      // Adicionar sugestões se disponíveis
      if (sugestoes && sugestoes.length > 0) {
        detailedError += '\n\n💡 Possíveis causas:';
        sugestoes.forEach((sugestao, index) => {
          detailedError += `\n  ${index + 1}. ${sugestao}`;
        });
      }
      
      // Adicionar alternativas se disponíveis
      if (alternativas && alternativas.length > 0) {
        detailedError += '\n\n🔧 Alternativas:';
        alternativas.forEach((alternativa, index) => {
          detailedError += `\n  • ${alternativa}`;
        });
      }
      
      // Adicionar detalhes técnicos se disponíveis (apenas em desenvolvimento)
      if (process.env.NODE_ENV === 'development' && errorDetails) {
        detailedError += `\n\n🔍 Detalhes técnicos:\n${JSON.stringify(errorDetails, null, 2)}`;
      }
      
      // Armazenar informações do erro com metadados para exibir botões especiais
      setError({
        message: detailedError,
        xmlDisponivel,
        acaoSugerida,
        statusCode
      });
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

  const checkServiceStatus = async () => {
    try {
      setCheckingStatus(true);
      const response = await api.get('/notas-fiscais/danfe/status');
      
      if (response.data.success) {
        setServiceStatus(response.data.data.servicoDanfe);
      }
    } catch (error) {
      console.error('Erro ao verificar status do serviço:', error);
      setServiceStatus({
        operacional: false,
        mensagem: 'Erro ao verificar status',
        erro: error.message
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleDownloadXml = () => {
    if (!xmlNFe) {
      console.error('XML não disponível para download');
      return;
    }
    
    // Criar um blob com o XML
    const blob = new Blob([xmlNFe], { type: 'application/xml' });
    const url = window.URL.createObjectURL(blob);
    
    // Criar um link para download
    const link = document.createElement('a');
    link.href = url;
    link.download = `NFe_${numeroNF || 'XML'}.xml`;
    document.body.appendChild(link);
    link.click();
    
    // Limpar
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleRequestDanfeLocal = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[DanfeViewer] Gerando DANFE com gerador próprio');
      
      const response = await api.post('/notas-fiscais/danfe/local', {
        xml: xmlNFe
      });
      
      if (response.data.success && response.data.data.pdf) {
        // Limpar dados base64 se necessário
        let pdfData = response.data.data.pdf;
        
        // Verificar se o PDF base64 está bem formado
        if (typeof pdfData === 'string') {
          // Remover prefixo data: se existir
          pdfData = pdfData.replace(/^data:application\/pdf;base64,/, '');
          
          // Verificar se é base64 válido
          try {
            atob(pdfData);
            console.log('[DanfeViewer] PDF base64 válido');
          } catch (base64Error) {
            console.error('[DanfeViewer] PDF base64 inválido:', base64Error);
            throw new Error('PDF gerado com formato inválido');
          }
        }
        
        setPdfData(pdfData);
        setViewMode('view');
        console.log('[DanfeViewer] DANFE gerada com sucesso usando gerador próprio');
      } else {
        throw new Error(response.data.message || 'Não foi possível gerar o DANFE');
      }
    } catch (err) {
      console.error('Erro ao gerar DANFE local:', err);
      
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao gerar DANFE';
      const sugestoes = err.response?.data?.data?.sugestoes || [];
      
      let detailedError = errorMessage;
      
      if (sugestoes && sugestoes.length > 0) {
        detailedError += '\n\n💡 Sugestões:';
        sugestoes.forEach((sugestao, index) => {
          detailedError += `\n  ${index + 1}. ${sugestao}`;
        });
      }
      
      setError({
        message: detailedError,
        statusCode: err.response?.status
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestBasicPDF = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[DanfeViewer] Testando geração básica de PDF...');
      
      const response = await api.get('/notas-fiscais/danfe/test-puppeteer');
      
      if (response.data.success && response.data.data.pdf) {
        const pdfData = response.data.data.pdf;
        
        // Verificar se é base64 válido
        try {
          atob(pdfData);
          console.log('[DanfeViewer] PDF de teste válido');
          setPdfData(pdfData);
          setViewMode('view');
          
          // Mostrar alerta de sucesso
          alert(`✅ Teste de PDF básico bem-sucedido!\nTamanho: ${response.data.data.tamanho}\nTipo: ${response.data.data.tipo}`);
        } catch (base64Error) {
          throw new Error('PDF de teste com formato inválido');
        }
      } else {
        throw new Error(response.data.message || 'Falha no teste básico');
      }
    } catch (err) {
      console.error('Erro no teste básico:', err);
      setError({
        message: `❌ Teste básico falhou:\n${err.response?.data?.message || err.message}`,
        statusCode: err.response?.status
      });
    } finally {
      setLoading(false);
    }
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
          <Alert variant="danger" className="mt-3">
            <h6>❌ Erro ao gerar DANFE</h6>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9em' }}>
              {error.message}
            </div>
            
            {/* Botão para verificar status do serviço */}
            <div className="mt-3">
              <Button 
                variant="outline-info" 
                size="sm" 
                onClick={checkServiceStatus}
                disabled={checkingStatus}
                className="me-2"
              >
                {checkingStatus ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-1" />
                    Verificando...
                  </>
                ) : (
                  '🔍 Verificar Status do Serviço'
                )}
              </Button>
              
              {/* Botão de teste básico de PDF */}
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={handleTestBasicPDF}
                disabled={loading}
                className="me-2"
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-1" />
                    Testando...
                  </>
                ) : (
                  '🧪 Teste PDF Básico'
                )}
              </Button>
              
              {/* Botão para usar gerador próprio */}
              {!useChaveOnly && xmlNFe && (error?.acaoSugerida === 'gerador_proprio' || error?.statusCode === 413) && (
                <Button 
                  variant="success" 
                  size="sm" 
                  onClick={() => {
                    setError(null);
                    handleRequestDanfeLocal();
                  }}
                  className="me-2"
                >
                  🏠 Usar Gerador Próprio
                </Button>
              )}
              
              {/* Botão para usar gerador próprio (sempre disponível quando há XML) */}
              {!useChaveOnly && xmlNFe && !(error?.acaoSugerida === 'gerador_proprio' || error?.statusCode === 413) && (
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  onClick={() => {
                    setError(null);
                    handleRequestDanfeLocal();
                  }}
                  className="me-2"
                >
                  🏠 Gerador Próprio
                </Button>
              )}
              
              {/* Botão de download do XML */}
              {(error?.acaoSugerida === 'download_xml' || error?.acaoSugerida === 'gerador_proprio') && xmlNFe && (
                <Button 
                  variant="outline-success" 
                  size="sm" 
                  onClick={handleDownloadXml}
                  className="me-2"
                >
                  📥 Baixar XML
                </Button>
              )}
              
              {/* Botão para tentar mesmo assim com serviço externo */}
              {error?.statusCode === 413 && (
                <Button 
                  variant="outline-warning" 
                  size="sm" 
                  onClick={() => {
                    setError(null);
                    handleRequestDanfe(true);
                  }}
                  className="me-2"
                >
                  ⚠️ Tentar Serviço Externo
                </Button>
              )}
              
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={() => {
                  setError(null);
                  setServiceStatus(null);
                }}
              >
                ✕ Fechar Erro
              </Button>
            </div>
            
            {/* Mostrar status do serviço se verificado */}
            {serviceStatus && (
              <Alert variant={serviceStatus.operacional ? 'success' : 'warning'} className="mt-3">
                <h6>
                  {serviceStatus.operacional ? '✅' : '⚠️'} Status do Serviço DANFE:
                </h6>
                <p className="mb-2">
                  <strong>Status:</strong> {serviceStatus.mensagem}
                </p>
                
                {/* Mostrar detalhes do diagnóstico se disponível */}
                {serviceStatus.detalhes && (
                  <div className="mt-2">
                    <small><strong>Detalhes do Diagnóstico:</strong></small>
                    <div className="mt-1">
                      {serviceStatus.detalhes.conectividade && (
                        <div className="d-flex align-items-center mb-1">
                          <span className={`me-2 ${serviceStatus.detalhes.conectividade.operacional ? 'text-success' : 'text-danger'}`}>
                            {serviceStatus.detalhes.conectividade.operacional ? '🔵' : '🔴'}
                          </span>
                          <small>
                            <strong>Conectividade:</strong> {serviceStatus.detalhes.conectividade.mensagem}
                            {serviceStatus.detalhes.conectividade.status && ` (HTTP ${serviceStatus.detalhes.conectividade.status})`}
                          </small>
                        </div>
                      )}
                      
                      {serviceStatus.detalhes.geracao && (
                        <div className="d-flex align-items-center mb-1">
                          <span className={`me-2 ${serviceStatus.detalhes.geracao.operacional ? 'text-success' : 'text-danger'}`}>
                            {serviceStatus.detalhes.geracao.operacional ? '🟢' : '🔴'}
                          </span>
                          <small>
                            <strong>Geração:</strong> {serviceStatus.detalhes.geracao.mensagem}
                            {serviceStatus.detalhes.geracao.status && ` (HTTP ${serviceStatus.detalhes.geracao.status})`}
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {serviceStatus.ultimaVerificacao && (
                  <small className="text-muted d-block mt-2">
                    📅 Verificado em: {new Date(serviceStatus.ultimaVerificacao).toLocaleString('pt-BR')}
                  </small>
                )}
                
                {/* Explicação sobre a diferença entre conectividade e geração */}
                {serviceStatus.detalhes && 
                 serviceStatus.detalhes.conectividade?.operacional && 
                 !serviceStatus.detalhes.geracao?.operacional && (
                  <Alert variant="info" className="mt-2 mb-0">
                    <small>
                      <strong>ℹ️ Explicação:</strong> O serviço está online (conectividade OK), 
                      mas não consegue processar XMLs no momento. Isso pode ser devido a:
                      sobrecarga, manutenção ou problemas específicos com XMLs grandes/complexos.
                    </small>
                  </Alert>
                )}
              </Alert>
            )}
          </Alert>
        )}

        {viewMode === 'download' && !loading && !error && (
          <div className="text-center p-4">
            <h5>Escolha o método de geração do DANFE</h5>
            <p className="text-muted mb-4">
              {useChaveOnly 
                ? 'Chave NFe disponível - apenas o serviço externo suporta geração por chave'
                : 'XML disponível - você pode usar nosso gerador próprio ou o serviço externo'
              }
            </p>
            
            <div className="d-flex gap-3 justify-content-center">
              {/* Gerador próprio - sempre primeira opção quando há XML */}
              {!useChaveOnly && xmlNFe && (
                <div className="text-center">
                  <Button 
                    variant="primary" 
                    size="lg" 
                    onClick={() => {
                      setError(null);
                      handleRequestDanfeLocal();
                    }}
                    className="mb-2"
                  >
                    🏠 Gerador Próprio
                  </Button>
                  <div className="small text-success">
                    ✅ Sem limitações<br/>
                    ✅ Mais rápido<br/>
                    ✅ Sempre disponível
                  </div>
                </div>
              )}
              
              {/* Serviço externo */}
              <div className="text-center">
                <Button 
                  variant={!useChaveOnly && xmlNFe ? "outline-secondary" : "primary"} 
                  size="lg" 
                  onClick={handleRequestDanfe}
                  className="mb-2"
                >
                  🌐 Serviço Externo
                </Button>
                <div className="small text-muted">
                  {useChaveOnly ? (
                    <>📋 Suporta chave NFe</>
                  ) : (
                    <>
                      ⚠️ Pode falhar com XMLs grandes<br/>
                      🔗 Depende de conectividade
                    </>
                  )}
                </div>
              </div>
              
              {/* Botão de teste - sempre disponível */}
              <div className="text-center">
                <Button 
                  variant="outline-info" 
                  size="lg" 
                  onClick={handleTestBasicPDF}
                  className="mb-2"
                >
                  🧪 Teste PDF
                </Button>
                <div className="small text-info">
                  🔧 Diagnóstico<br/>
                  📋 PDF Simples
                </div>
              </div>
            </div>
            
            {useChaveOnly && (
              <Alert variant="info" className="mt-3 text-start">
                <small>
                  <strong>Nota:</strong> Como apenas a chave NFe está disponível, será utilizado o serviço externo.
                  Se o XML estiver disponível, recomendamos usar nosso gerador próprio.
                </small>
              </Alert>
            )}
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
                onLoadError={(error) => {
                  console.error('[DanfeViewer] Erro ao carregar PDF:', error);
                  console.error('[DanfeViewer] Worker src:', pdfjs.GlobalWorkerOptions.workerSrc);
                  console.error('[DanfeViewer] Tamanho do PDF data:', pdfData?.length);
                  setError({
                    message: `Erro ao carregar PDF: ${error.message || 'Formato inválido'}`,
                    statusCode: 'PDF_LOAD_ERROR'
                  });
                  setViewMode('download');
                }}
                loading={<Spinner animation="border" />}
                error={
                  <Alert variant="danger">
                    <h6>❌ Erro ao carregar PDF</h6>
                    <p>O PDF gerado não pôde ser exibido. Tente baixar o arquivo.</p>
                    <div className="mt-2">
                      <Button 
                        variant="success" 
                        size="sm" 
                        onClick={handleDownload}
                        className="me-2"
                      >
                        📥 Baixar PDF
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        size="sm" 
                        onClick={resetViewer}
                      >
                        🔄 Tentar Novamente
                      </Button>
                    </div>
                  </Alert>
                }
                options={pdfConfig.options}
              >
                <Page 
                  pageNumber={pageNumber} 
                  width={window.innerWidth > 768 ? 600 : window.innerWidth - 100}
                  renderTextLayer={pdfConfig.pageOptions.renderTextLayer}
                  renderAnnotationLayer={pdfConfig.pageOptions.renderAnnotationLayer}
                  renderInteractiveForms={pdfConfig.pageOptions.renderInteractiveForms}
                  onRenderError={(error) => {
                    console.error('[DanfeViewer] Erro ao renderizar página:', error);
                  }}
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