import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Table, Badge, Spinner, Button, Form } from 'react-bootstrap';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaBoxes, FaTruck, FaCheck, FaFileInvoiceDollar, FaUser, FaFileAlt, FaFilePdf } from 'react-icons/fa';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import DanfeViewer from '../../components/DanfeViewer';
import { buscarNotasFiscaisPorPedido, buscarXmlPorNumero } from '../../services/notasFiscaisService';
import './styles.css';

const PedidoWorkflowDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [pedido, setPedido] = useState(null);
  const [itens, setItens] = useState([]);
  const [historicoWorkflow, setHistoricoWorkflow] = useState([]);
  const [statusWorkflow, setStatusWorkflow] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingVendedor, setLoadingVendedor] = useState(false);
  const [vendedorInfo, setVendedorInfo] = useState(null);
  const { user } = useAuth();
  const [showDanfeViewer, setShowDanfeViewer] = useState(false);
  const [xmlNFe, setXmlNFe] = useState(null);
  const [loadingXml, setLoadingXml] = useState(false);
  const [notasFiscais, setNotasFiscais] = useState([]);
  const [notaSelecionada, setNotaSelecionada] = useState(null);
  const [chaveNFe, setChaveNFe] = useState(null);
  const [useChaveOnly, setUseChaveOnly] = useState(false);

  // Função para buscar informações do vendedor de forma otimizada
  const atualizarInformacaoVendedor = async (pedidoData) => {
    // Se já temos as informações completas do vendedor no pedido, não precisamos buscar
    if (pedidoData.vendedor_nome && pedidoData.vendedor_nome !== pedidoData.cod_vendedor) {
      return pedidoData;
    }

    try {
      // Verificar se temos o vendedor no localStorage
      const storedUser = JSON.parse(localStorage.getItem('usuario')) || {};
      if (storedUser.vendedor_codigo === pedidoData.cod_vendedor && storedUser.vendedor_nome) {
        return {
          ...pedidoData,
          vendedor_nome: storedUser.vendedor_nome
        };
      }

      // Se não temos no localStorage e temos o user.id, buscar da API
      if (user?.id) {
        const response = await api.get(`/usuarios/${user.id}/vendedor`);
        if (response.data?.success && response.data?.data) {
          const vendedorInfo = response.data.data;
          // Atualizar apenas se o vendedor do pedido corresponder ao vendedor encontrado
          if (vendedorInfo.codigo === pedidoData.cod_vendedor) {
            return {
              ...pedidoData,
              vendedor_nome: vendedorInfo.nome || vendedorInfo.vendedor_nome
            };
          }
        }
      }
    } catch (error) {
      console.warn('Erro ao buscar informações adicionais do vendedor:', error);
    }

    return pedidoData;
  };

  const fetchPedidoDetalhes = async () => {
    try {
      setLoading(true);
      let response;
      
      try {
        // Tentar primeiro com a rota de workflow
        response = await api.get(`/pedidos/workflow/${id}`);
      } catch (workflowError) {
        console.warn('Erro ao buscar detalhes do workflow do pedido, tentando rota alternativa:', workflowError);
        
        // Fallback: buscar usando a rota regular de detalhes do pedido
        response = await api.get(`/pedidos/${id}`);
        
        // Adaptar a resposta para ter a mesma estrutura esperada
        if (response.data && response.data.pedido) {
          response.data.historico_workflow = [];
          response.data.status_workflow_disponiveis = [
            { codigo: 1, descricao: 'Pendente', nome_etapa: 'Em processamento' }
          ];
          
          if (response.data.pedido.cod_status) {
            response.data.pedido.cod_status_workflow = response.data.pedido.cod_status;
            response.data.pedido.status_workflow_descricao = 'Status ERP';
            response.data.pedido.status_workflow_etapa = 'Em processamento';
          }
        }
      }

      // Atualizar informações do vendedor se necessário
      const pedidoAtualizado = await atualizarInformacaoVendedor(response.data.pedido);
      
      console.log('[DEBUG] Pedido atualizado:', pedidoAtualizado);
      console.log('[DEBUG] Status do pedido:', pedidoAtualizado.cod_status_workflow);
      
      setPedido(pedidoAtualizado);
      setItens(response.data.itens || []);
      setHistoricoWorkflow(response.data.historico_workflow || []);
      setStatusWorkflow(response.data.status_workflow_disponiveis || []);

      // Verificar se precisa abrir automaticamente a consulta de nota fiscal
      if (location.state?.consultarNFe && parseInt(pedidoAtualizado.cod_status_workflow || 0) >= 6) {
        buscarNotasFiscais(pedidoAtualizado.codigo, true);
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes do pedido:', error);
      toast.error('Erro ao carregar detalhes do pedido. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidoDetalhes();
  }, [id]);

  // Efeito adicional para buscar notas fiscais quando o pedido for carregado
  useEffect(() => {
    if (pedido && parseInt(pedido.cod_status_workflow || 0) >= 6) {
      console.log(`[DEBUG] Pedido ${pedido.codigo} com status ${pedido.cod_status_workflow} >= 6, buscando notas fiscais`);
      buscarNotasFiscais(pedido.codigo);
    } else if (pedido) {
      console.log(`[DEBUG] Pedido ${pedido.codigo} com status ${pedido.cod_status_workflow} < 6, não buscando notas fiscais`);
    }
  }, [pedido]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy HH:mm:ss');
    } catch (e) {
      return dateStr;
    }
  };

  const formatCurrency = (value) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getWorkflowStatusBadge = (status) => {
    if (!status) return <Badge bg="secondary">Não definido</Badge>;
    
    // Com base nos status encontrados no CSV
    switch (parseInt(status)) {
      case 1:
        return <Badge bg="info">Pendente</Badge>;
      case 2:
        return <Badge bg="primary">Em Separação</Badge>;
      case 3:
        return <Badge bg="warning">Conferido</Badge>;
      case 4:
        return <Badge bg="success">Despachado</Badge>;
      case 5:
        return <Badge bg="dark">Faturado</Badge>;
      case 6:
        return <Badge bg="secondary">Nota Fiscal Emitida</Badge>;
      case 7:
        return <Badge bg="success">Entregue</Badge>;
      default:
        return <Badge bg="secondary">Status {status}</Badge>;
    }
  };

  const getStatusIcon = (statusCode) => {
    switch (parseInt(statusCode)) {
      case 1:
        return <FaBoxes className="status-icon" />;
      case 2:
        return <FaBoxes className="status-icon" />;
      case 3:
        return <FaCheck className="status-icon" />;
      case 4:
        return <FaTruck className="status-icon" />;
      case 5:
        return <FaFileInvoiceDollar className="status-icon" />;
      case 6:
        return <FaFileInvoiceDollar className="status-icon" />;
      case 7:
        return <FaCheck className="status-icon" />;
      default:
        return <FaBoxes className="status-icon" />;
    }
  };

  const renderTimelineWorkflow = () => {
    if (!statusWorkflow || statusWorkflow.length === 0) {
      return <p>Nenhuma etapa de workflow disponível</p>;
    }

    // Identificar o status atual do pedido
    const statusAtual = pedido?.cod_status_workflow || 0;
    
    return (
      <div className="workflow-timeline">
        {statusWorkflow.map((status, index) => {
          // Verificar se esta etapa já foi concluída
          const etapaConcluida = parseInt(statusAtual) > parseInt(status.codigo);
          // Verificar se esta é a etapa atual
          const etapaAtual = parseInt(statusAtual) === parseInt(status.codigo);
          // Verificar se esta etapa está no histórico
          const historicoEtapa = historicoWorkflow.find(h => parseInt(h.codigo) === parseInt(status.codigo));

          return (
            <div 
              key={status.codigo} 
              className={`workflow-step ${etapaConcluida ? 'completed' : ''} ${etapaAtual ? 'current' : ''}`}
            >
              <div className="workflow-icon">
                {getStatusIcon(status.codigo)}
              </div>
              <div className="workflow-content">
                <h5>{status.descricao}</h5>
                <p>{status.nome_etapa}</p>
                {historicoEtapa && (
                  <small className="text-muted">
                    {formatDateTime(historicoEtapa.dt_status)}
                  </small>
                )}
              </div>
              <div className="workflow-line"></div>
            </div>
          );
        })}
      </div>
    );
  };

  const buscarNotasFiscais = async (pedidoId, abrirVisualizador = false) => {
    try {
      console.log(`[DEBUG] Buscando notas fiscais para o pedido ${pedidoId}`);
      
      // Exibir mensagem de loading
      toast.info('Buscando notas fiscais, aguarde...', { autoClose: 2000 });
      
      const resultado = await buscarNotasFiscaisPorPedido(pedidoId);
      
      console.log('[DEBUG] Resposta do serviço de notas fiscais:', resultado);
      
      if (resultado.success && resultado.notasFiscais && resultado.notasFiscais.length > 0) {
        console.log('[DEBUG] Notas fiscais encontradas:', resultado.notasFiscais);
        setNotasFiscais(resultado.notasFiscais);
        
        // Selecionar a primeira nota fiscal por padrão
        setNotaSelecionada(resultado.notasFiscais[0]);
        console.log('[DEBUG] Nota fiscal selecionada:', resultado.notasFiscais[0]);
        
        // Informar o usuário
        toast.success(`${resultado.notasFiscais.length} nota(s) fiscal(is) encontrada(s)`);

        // Se solicitado, abrir automaticamente o visualizador
        if (abrirVisualizador) {
          setTimeout(() => visualizarNFe(), 800);
        }
      } else {
        console.log('[DEBUG] Nenhuma nota fiscal encontrada para este pedido');
        setNotasFiscais([]);
        
        // Se houver uma mensagem de erro específica, mostrar para o usuário
        if (resultado.error) {
          toast.error(`Erro ao buscar notas fiscais: ${resultado.error}`);
        } else if (resultado.message) {
          toast.warning(resultado.message);
        } else {
          toast.warning('Nenhuma nota fiscal encontrada para este pedido');
        }
        
        // Se o erro foi 404 (Not Found), informar melhor o usuário
        if (resultado.statusCode === 404) {
          toast.info('O pedido pode não ter sido faturado ainda ou as notas fiscais não foram registradas no sistema');
        }
      }
    } catch (error) {
      console.error('[DEBUG] Erro ao buscar notas fiscais:', error);
      setNotasFiscais([]);
      toast.error('Falha ao buscar notas fiscais');
    }
  };

  const visualizarNFe = async () => {
    if (!notaSelecionada) {
      toast.warning('Selecione uma nota fiscal para visualizar');
      return;
    }
    
    try {
      setLoadingXml(true);
      const resultado = await buscarXmlPorNumero(notaSelecionada.num_nota);
      
      if (resultado.success) {
        if (resultado.xml) {
          setXmlNFe(resultado.xml);
          setShowDanfeViewer(true);
        } else if (resultado.useChaveOnly && resultado.chaveNFe) {
          setXmlNFe(null);
          setChaveNFe(resultado.chaveNFe);
          setUseChaveOnly(true);
          setShowDanfeViewer(true);
          toast.info('XML não disponível. Usando chave de acesso para consultar o DANFE.');
        } else {
          toast.error('Dados insuficientes para gerar o DANFE');
        }
      } else {
        toast.error(resultado.message || 'XML da nota fiscal não encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar XML da NF-e:', error);
      toast.error('Não foi possível obter o XML da nota fiscal');
    } finally {
      setLoadingXml(false);
    }
  };

  const handleCloseDanfeViewer = () => {
    setShowDanfeViewer(false);
    setUseChaveOnly(false);
    setChaveNFe(null);
  };

  // Componente para exibir seleção de notas fiscais
  const renderNotasFiscaisSelector = () => {
    console.log('[DEBUG] renderNotasFiscaisSelector - notasFiscais:', notasFiscais);
    
    if (!notasFiscais || notasFiscais.length === 0) {
      return (
        <Card className="shadow-sm border-0 mb-4">
          <Card.Header className="bg-light">
            <h5 className="mb-0">Notas Fiscais</h5>
          </Card.Header>
          <Card.Body>
            <p className="text-muted">Nenhuma nota fiscal encontrada para este pedido.</p>
            <div className="d-flex justify-content-end">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => buscarNotasFiscais(pedido.codigo)}
              >
                <FaFilePdf className="me-1" />
                Buscar Notas Fiscais
              </Button>
            </div>
          </Card.Body>
        </Card>
      );
    }

    return (
      <Card className="shadow-sm border-0 mb-4">
        <Card.Header className="bg-light">
          <h5 className="mb-0">Notas Fiscais</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Selecione a Nota Fiscal:</Form.Label>
                <Form.Select 
                  value={notaSelecionada ? notaSelecionada.num_nota : ''}
                  onChange={(e) => {
                    const selectedNF = notasFiscais.find(nf => nf.num_nota.toString() === e.target.value);
                    setNotaSelecionada(selectedNF);
                  }}
                >
                  {notasFiscais.map((nf) => (
                    <option key={nf.num_nota} value={nf.num_nota}>
                      NF-e {nf.num_nota} - Chave: {nf.chave_nfe.substring(0, 15)}...
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    );
  };

  if (loading) {
    return (
      <Container fluid>
        <div className="text-center my-5">
          <Spinner animation="border" role="status" className="spinner-border-custom">
            <span className="visually-hidden">Carregando...</span>
          </Spinner>
          <p className="mt-2">Carregando detalhes do pedido...</p>
        </div>
      </Container>
    );
  }

  if (!pedido) {
    return (
      <Container fluid>
        <div className="text-center my-5">
          <p className="text-muted">Pedido não encontrado.</p>
          <Button 
            variant="primary" 
            onClick={() => navigate('/pedidos-workflow')}
            className="mt-3"
          >
            <FaArrowLeft className="me-2" />
            Voltar para Lista de Pedidos
          </Button>
        </div>
      </Container>
    );
  }

  // Verificar se o pedido tem status para ter nota fiscal (status >= 6)
  const temNotaFiscal = parseInt(pedido.cod_status_workflow || 0) >= 6;

  return (
    <Container fluid>
      <Row className="mb-4 align-items-center">
        <Col>
          <h4 className="mb-0 page-title">Detalhes do Pedido #{pedido.codigo}</h4>
          <p className="text-muted">
            {pedido.status_workflow_descricao || 'Status'}: {pedido.status_workflow_etapa || '-'}
          </p>
        </Col>
        <Col xs="auto" className="d-flex gap-2">
          {temNotaFiscal && (
            <Button 
              variant="success"
              size="md"
              className="d-flex align-items-center btn-visualizar-nfe"
              onClick={visualizarNFe}
              disabled={loadingXml || !notaSelecionada}
            >
              {loadingXml ? (
                <Spinner as="span" animation="border" size="sm" role="status" className="me-2" />
              ) : (
                <FaFileInvoiceDollar className="me-2" />
              )}
              {loadingXml ? 'Carregando NFe...' : 'Visualizar NFe'}
            </Button>
          )}
          <Button 
            variant="outline-primary" 
            onClick={() => navigate('/pedidos-workflow')}
            className="d-flex align-items-center"
          >
            <FaArrowLeft className="me-2" />
            Voltar
          </Button>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={6}>
          <Card className="shadow-sm border-0 mb-4">
            <Card.Header className="bg-transparent border-0">
              <h5 className="mb-0">Informações do Pedido</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6} className="mb-3">
                  <p className="mb-1 text-muted small">Código</p>
                  <p className="mb-0 fw-bold">{pedido.codigo}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <p className="mb-1 text-muted small">Data do Pedido</p>
                  <p className="mb-0 fw-bold">{formatDate(pedido.dt_pedido)}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <p className="mb-1 text-muted small">Cliente</p>
                  <p className="mb-0 fw-bold">{pedido.cliente_nome || pedido.cod_cliente}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <p className="mb-1 text-muted small">Vendedor</p>
                  <p className="mb-0 fw-bold">
                    {pedido.vendedor_nome || pedido.cod_vendedor}
                  </p>
                </Col>
                <Col md={12} className="mb-3">
                  <p className="mb-1 text-muted small">Status Atual</p>
                  <div className="d-flex align-items-center">
                    {getWorkflowStatusBadge(pedido.cod_status_workflow)}
                    <span className="ms-2">{pedido.status_workflow_etapa || '-'}</span>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="shadow-sm border-0">
            <Card.Header className="bg-transparent border-0">
              <h5 className="mb-0">Valores</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6} className="mb-3">
                  <p className="mb-1 text-muted small">Valor dos Produtos</p>
                  <p className="mb-0 fw-bold highlight-value">{formatCurrency(pedido.vl_produtos)}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <p className="mb-1 text-muted small">Valor do Desconto</p>
                  <p className="mb-0 fw-bold">{formatCurrency(pedido.vl_desconto)}</p>
                </Col>
                <Col md={12}>
                  <p className="mb-1 text-muted small">Valor Total</p>
                  <p className="mb-0 fw-bold highlight-value h4">{formatCurrency(pedido.vl_total)}</p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-transparent border-0">
              <h5 className="mb-0">Status de Processamento</h5>
            </Card.Header>
            <Card.Body>
              {renderTimelineWorkflow()}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Seção de notas fiscais - Exibir primeiro se tiver nota fiscal emitida */}
      {temNotaFiscal && !loading && pedido && renderNotasFiscaisSelector()}

      <Card className="shadow-sm border-0 mb-4">
        <Card.Header className="bg-transparent border-0">
          <h5 className="mb-0">Histórico de Status</h5>
        </Card.Header>
        <Card.Body className="p-0">
          {historicoWorkflow && historicoWorkflow.length > 0 ? (
            <div className="table-responsive">
              <Table hover className="table-modern mb-0">
                <thead>
                  <tr>
                    <th>Sequência</th>
                    <th>Status</th>
                    <th>Etapa</th>
                    <th>Data/Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoWorkflow.map((status) => (
                    <tr key={status.seq} className="align-middle">
                      <td>{status.seq}</td>
                      <td>{getWorkflowStatusBadge(status.codigo)}</td>
                      <td>{status.nome_etapa || '-'}</td>
                      <td>{formatDateTime(status.dt_status)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center my-3">
              <p className="text-muted">Nenhum histórico de status disponível.</p>
            </div>
          )}
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0">
        <Card.Header className="bg-transparent border-0">
          <h5 className="mb-0">Itens do Pedido</h5>
        </Card.Header>
        <Card.Body className="p-0">
          {itens && itens.length > 0 ? (
            <>
              {/* Visualização em tabela para desktop */}
              <div className="table-responsive d-none d-md-block">
                <Table hover className="table-modern mb-0">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Produto</th>
                      <th className="text-center">Quantidade</th>
                      <th className="text-end">Valor Unitário</th>
                      <th className="text-end">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item) => (
                      <tr key={item.seq} className="align-middle">
                        <td>{item.cod_produto}</td>
                        <td>{item.produto_descricao || `Produto ${item.cod_produto}`}</td>
                        <td className="text-center">{item.qtde}</td>
                        <td className="text-end">{formatCurrency(item.vl_unitario)}</td>
                        <td className="text-end highlight-value">{formatCurrency(item.vl_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="text-end fw-bold">Total:</td>
                      <td className="text-end fw-bold highlight-value">{formatCurrency(pedido.vl_total)}</td>
                    </tr>
                  </tfoot>
                </Table>
              </div>

              {/* Visualização em cards para mobile */}
              <div className="d-md-none p-2">
                {itens.map((item) => (
                  <Card key={item.seq} className="mb-2 item-card">
                    <Card.Body className="p-2">
                      <div className="fw-bold mb-1">{item.produto_descricao || `Produto ${item.cod_produto}`}</div>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <small className="text-muted">Código:</small>
                        <span>{item.cod_produto}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <small className="text-muted">Quantidade:</small>
                        <span>{item.qtde}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <small className="text-muted">Valor Unit.:</small>
                        <span>{formatCurrency(item.vl_unitario)}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <small className="text-muted fw-bold">Total:</small>
                        <span className="fw-bold highlight-value">{formatCurrency(item.vl_total)}</span>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
                
                <div className="d-flex justify-content-between align-items-center p-2 mt-2 border-top">
                  <span className="fw-bold">Total do Pedido:</span>
                  <span className="fw-bold highlight-value h5 mb-0">{formatCurrency(pedido.vl_total)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center my-3">
              <p className="text-muted">Nenhum item encontrado para este pedido.</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Seção de notas fiscais - Exibir no final se não tiver nota emitida */}
      {!temNotaFiscal && !loading && pedido && renderNotasFiscaisSelector()}
      
      {/* Modal para visualização do DANFE */}
      {showDanfeViewer && (
        <DanfeViewer
          xmlNFe={xmlNFe}
          chaveNFe={chaveNFe}
          useChaveOnly={useChaveOnly}
          numeroNF={notaSelecionada?.num_nota}
          onClose={handleCloseDanfeViewer}
          show={showDanfeViewer}
        />
      )}
    </Container>
  );
};

export default PedidoWorkflowDetalhe; 