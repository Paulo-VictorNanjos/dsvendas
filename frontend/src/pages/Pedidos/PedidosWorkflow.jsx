import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Button, Table, Spinner, Badge, Form, Row, Col, InputGroup, Pagination, Collapse } from 'react-bootstrap';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaSearch, FaFilter, FaEye, FaClipboardList, FaChevronDown, FaChevronUp, FaFileInvoiceDollar } from 'react-icons/fa';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import DanfeViewer from '../../components/DanfeViewer';
import { buscarNotasFiscaisPorPedido, buscarXmlPorNumero } from '../../services/notasFiscaisService';
import './styles.css';

const PedidosWorkflow = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredPedidos, setFilteredPedidos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [vendedorId, setVendedorId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedPedido, setExpandedPedido] = useState(null);
  const [itensPedido, setItensPedido] = useState([]);
  const [loadingItens, setLoadingItens] = useState(false);
  // Estados para visualização da DANFE
  const [showDanfeViewer, setShowDanfeViewer] = useState(false);
  const [xmlNFe, setXmlNFe] = useState(null);
  const [chaveNFe, setChaveNFe] = useState(null);
  const [useChaveOnly, setUseChaveOnly] = useState(false);
  const [loadingNfe, setLoadingNfe] = useState(false);
  const [numeroNF, setNumeroNF] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    perPage: 5,
    hasMore: false
  });
  const navigate = useNavigate();
  const { user } = useAuth();

  const filterPedidos = useCallback(() => {
    if (!searchTerm.trim()) {
      setFilteredPedidos(pedidos);
      return;
    }

    const filtered = pedidos.filter(pedido => 
      (pedido.codigo && pedido.codigo.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pedido.cliente_nome && pedido.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pedido.status_workflow_descricao && pedido.status_workflow_descricao.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    setFilteredPedidos(filtered);
  }, [searchTerm, pedidos]);

  useEffect(() => {
    // Obter ID do vendedor do contexto de autenticação e também verificar localStorage
    const storedUser = JSON.parse(localStorage.getItem('usuario')) || {};
    const vendedorCodigo = user?.vendedor_codigo || storedUser.vendedor_codigo;
    
    setVendedorId(vendedorCodigo);
    
    if (vendedorCodigo) {
      fetchPedidos(vendedorCodigo);
    } else {
      // Caso não tenha o código do vendedor, tentar usar o ID do usuário
      if (user?.id) {
        // Tentar buscar o código do vendedor pelo ID do usuário
        api.get(`/usuarios/${user.id}/vendedor`)
          .then(response => {
            if (response.data && response.data.data && response.data.data.vendedor_codigo) {
              const vendedorCodigo = response.data.data.vendedor_codigo;
              setVendedorId(vendedorCodigo);
              fetchPedidos(vendedorCodigo);
              
              // Mostrar informação sobre o vendedor identificado
              const vendedorNome = response.data.data.vendedor_nome;
              if (vendedorNome) {
                toast.success(`Pedidos do vendedor: ${vendedorNome}`);
              }
            } else {
              setLoading(false);
              toast.error('Você não possui um vendedor vinculado. Entre em contato com o administrador para configurar seu acesso ao sistema.');
            }
          })
          .catch(err => {
            console.error('Erro ao buscar vendedor vinculado:', err);
            setLoading(false);
            toast.error('Erro ao identificar vendedor. Por favor, entre em contato com o suporte técnico.');
          });
      } else {
        setLoading(false);
        toast.error('Usuário não identificado. Por favor, faça login novamente.');
      }
    }
  }, [user]);

  useEffect(() => {
    filterPedidos();
  }, [searchTerm, pedidos, filterPedidos]);

  const fetchPedidos = async (id, page = 1) => {
    try {
      setLoading(true);
      console.log('Buscando pedidos para o vendedor:', id, 'página:', page);
      let response;
      
      try {
        // Primeira tentativa com workflow e paginação
        response = await api.get(`/pedidos/vendedor/${id}/pedidos-workflow`, {
          params: {
            page,
            limit: 5
          }
        });
        
        // Verificar se a resposta tem o novo formato com paginação
        if (response.data && response.data.pedidos) {
          // Adicionar um ID único para cada pedido para evitar duplicidade de chaves
          const pedidosComId = response.data.pedidos.map((pedido, index) => ({
            ...pedido,
            uniqueId: `${pedido.codigo}-${index}-${Date.now()}`
          }));
          setPedidos(pedidosComId);
          setFilteredPedidos(pedidosComId);
          setPagination(response.data.pagination);
        } else {
          // Caso a resposta não tenha o formato esperado, adaptar
          const pedidosData = Array.isArray(response.data) ? response.data : [];
          // Adicionar um ID único para cada pedido
          const pedidosComId = pedidosData.map((pedido, index) => ({
            ...pedido,
            uniqueId: `${pedido.codigo}-${index}-${Date.now()}`
          }));
          setPedidos(pedidosComId);
          setFilteredPedidos(pedidosComId);
          setPagination({
            total: pedidosData.length,
            totalPages: 1,
            currentPage: 1,
            perPage: pedidosData.length,
            hasMore: false
          });
        }
      } catch (workflowError) {
        console.warn('Erro ao buscar pedidos com workflow, tentando rota alternativa:', workflowError);
        
        // Fallback: tentar buscar usando a rota regular de pedidos por vendedor
        response = await api.get(`/pedidos/vendedor/${id}`);
        
        if (response.data && response.data.success && response.data.data) {
          const pedidosAdaptados = response.data.data.map((pedido, index) => ({
            ...pedido,
            cod_status_workflow: pedido.cod_status || 1,
            status_workflow_descricao: 'Status padrão',
            status_workflow_etapa: 'Em processamento',
            uniqueId: `${pedido.codigo}-${index}-${Date.now()}`
          }));
          
          setPedidos(pedidosAdaptados);
          setFilteredPedidos(pedidosAdaptados);
          setPagination({
            total: pedidosAdaptados.length,
            totalPages: 1,
            currentPage: 1,
            perPage: pedidosAdaptados.length,
            hasMore: false
          });
        }
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos com workflow:', error);
      toast.error('Erro ao carregar pedidos e informações de workflow!');
      setPedidos([]);
      setFilteredPedidos([]);
      setPagination({
        total: 0,
        totalPages: 0,
        currentPage: 1,
        perPage: 5,
        hasMore: false
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (id) => {
    navigate(`/pedidos/workflow/${id}`);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy');
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

  const handlePageChange = (page) => {
    setCurrentPage(page);
    if (vendedorId) {
      fetchPedidos(vendedorId, page);
    }
  };

  const getPageNumbers = () => {
    const totalPages = pagination.totalPages;
    const currentPage = pagination.currentPage;
    const maxVisiblePages = 5; // Número máximo de páginas visíveis
    const pages = [];

    if (totalPages <= maxVisiblePages) {
      // Se o total de páginas for menor que o máximo visível, mostrar todas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Sempre mostrar a primeira página
      pages.push(1);

      // Calcular o intervalo de páginas ao redor da página atual
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Ajustar o intervalo se estiver muito próximo do início ou fim
      if (currentPage <= 3) {
        end = Math.min(maxVisiblePages - 1, totalPages - 1);
      } else if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - (maxVisiblePages - 2));
      }

      // Adicionar reticências no início se necessário
      if (start > 2) {
        pages.push('...');
      }

      // Adicionar páginas do intervalo
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Adicionar reticências no final se necessário
      if (end < totalPages - 1) {
        pages.push('...');
      }

      // Sempre mostrar a última página
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const toggleItensPedido = async (pedidoId) => {
    if (expandedPedido === pedidoId) {
      // Se o pedido já está expandido, apenas fecha
      setExpandedPedido(null);
      setItensPedido([]);
      return;
    }

    setExpandedPedido(pedidoId);
    setLoadingItens(true);

    try {
      // Buscar itens do pedido
      const response = await api.get(`/pedidos/${pedidoId}/itens`);
      
      if (response.data && response.data.success && response.data.data) {
        setItensPedido(response.data.data);
      } else if (Array.isArray(response.data)) {
        setItensPedido(response.data);
      } else {
        setItensPedido([]);
        toast.warning('Nenhum item encontrado para este pedido');
      }
    } catch (error) {
      console.error('Erro ao buscar itens do pedido:', error);
      toast.error('Erro ao carregar itens do pedido');
      setItensPedido([]);
    } finally {
      setLoadingItens(false);
    }
  };

  const handleConsultarNFe = async (pedido) => {
    // Verifica se o pedido já foi faturado (status >= 6)
    if (parseInt(pedido.cod_status_workflow || 0) < 6) {
      toast.warning('Este pedido ainda não possui nota fiscal emitida');
      return;
    }

    setLoadingNfe(true);
    toast.info('Buscando notas fiscais, aguarde...', { autoClose: 2000 });

    try {
      // Buscar notas fiscais para o pedido
      const resultado = await buscarNotasFiscaisPorPedido(pedido.codigo);
      
      if (resultado.success && resultado.notasFiscais && resultado.notasFiscais.length > 0) {
        // Selecionar a primeira nota fiscal
        const notaSelecionada = resultado.notasFiscais[0];
        setNumeroNF(notaSelecionada.num_nota);
        
        // Buscar XML da nota fiscal
        const xmlResultado = await buscarXmlPorNumero(notaSelecionada.num_nota);
        
        if (xmlResultado.success) {
          if (xmlResultado.xml) {
            // Caso 1: Temos o XML
            setXmlNFe(xmlResultado.xml);
            setUseChaveOnly(false);
            setChaveNFe(null);
            setShowDanfeViewer(true);
          } else if (xmlResultado.useChaveOnly && xmlResultado.chaveNFe) {
            // Caso 2: Não temos o XML, mas temos a chave NFe
            setXmlNFe(null);
            setChaveNFe(xmlResultado.chaveNFe);
            setUseChaveOnly(true);
            setShowDanfeViewer(true);
            toast.info('XML não disponível. Usando chave de acesso para consultar o DANFE.');
          } else {
            toast.error('Dados insuficientes para gerar o DANFE');
          }
        } else {
          toast.error(xmlResultado.message || 'XML da nota fiscal não encontrado');
        }
      } else {
        toast.warning(resultado.message || 'Nenhuma nota fiscal encontrada para este pedido');
      }
    } catch (error) {
      console.error('Erro ao consultar nota fiscal:', error);
      toast.error('Erro ao buscar informações da nota fiscal');
    } finally {
      setLoadingNfe(false);
    }
  };

  const handleCloseDanfeViewer = () => {
    setShowDanfeViewer(false);
    setXmlNFe(null);
    setChaveNFe(null);
    setUseChaveOnly(false);
    setNumeroNF(null);
  };

  return (
    <Container fluid>
      <Row className="mb-4 align-items-center">
        <Col>
          <h4 className="mb-0 page-title">Pedidos de Venda - Status de Processamento</h4>
          <p className="text-muted">Visualize o status atual dos seus pedidos no fluxo operacional</p>
        </Col>
      </Row>

      <Card className="shadow-sm border-0 mb-4">
        <Card.Body>
          <Row className="mb-3">
            <Col md={9}>
              <InputGroup>
                <Form.Control
                  placeholder="Buscar por código, cliente ou status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button variant="outline-secondary">
                  <FaSearch />
                </Button>
              </InputGroup>
            </Col>
            <Col md={3} className="d-flex justify-content-end">
              <Button 
                variant="outline-secondary"
                onClick={() => setShowFilters(!showFilters)}
                className="d-flex align-items-center"
              >
                <FaFilter className="me-2" />
                {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
              </Button>
            </Col>
          </Row>
          
          {showFilters && (
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Data Inicial</Form.Label>
                  <Form.Control type="date" />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Data Final</Form.Label>
                  <Form.Control type="date" />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Status de Workflow</Form.Label>
                  <Form.Select>
                    <option value="">Todos</option>
                    <option value="1">Pendente</option>
                    <option value="2">Em Separação</option>
                    <option value="3">Conferido</option>
                    <option value="4">Despachado</option>
                    <option value="5">Faturado</option>
                    <option value="6">Nota Fiscal Emitida</option>
                    <option value="7">Entregue</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          )}
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center my-5">
              <Spinner animation="border" role="status" className="spinner-border-custom">
                <span className="visually-hidden">Carregando...</span>
              </Spinner>
            </div>
          ) : filteredPedidos.length === 0 ? (
            <div className="text-center my-5">
              <p className="text-muted mb-0">Nenhum pedido encontrado</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table responsive hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>Código</th>
                      <th>Data</th>
                      <th>Cliente</th>
                      <th>Valor Total</th>
                      <th>Status</th>
                      <th>Etapa</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPedidos.map(pedido => (
                      <React.Fragment key={pedido.uniqueId || `${pedido.codigo}-${Math.random().toString(36).substr(2, 9)}`}>
                        <tr>
                          <td>{pedido.codigo}</td>
                          <td>{formatDate(pedido.dt_pedido)}</td>
                          <td>{pedido.cliente_nome || '-'}</td>
                          <td>{formatCurrency(pedido.vl_total)}</td>
                          <td>
                            <div className="d-flex align-items-center">
                              {getWorkflowStatusBadge(pedido.cod_status_workflow)}
                              <small className="ms-2 text-muted">
                                {pedido.status_workflow_descricao}
                              </small>
                            </div>
                          </td>
                          <td>
                            <small>{pedido.status_workflow_etapa || '-'}</small>
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleViewDetails(pedido.codigo)}
                                className="d-flex align-items-center"
                                title="Ver detalhes completos"
                              >
                                <FaEye className="me-1" /> 
                                Detalhes
                              </Button>
                              <Button
                                variant="outline-info"
                                size="sm"
                                onClick={() => toggleItensPedido(pedido.codigo)}
                                className="d-flex align-items-center"
                                title="Ver itens do pedido"
                              >
                                <FaClipboardList className="me-1" />
                                {expandedPedido === pedido.codigo ? <FaChevronUp /> : <FaChevronDown />}
                              </Button>
                              {parseInt(pedido.cod_status_workflow || 0) >= 6 && (
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handleConsultarNFe(pedido)}
                                  className="d-flex align-items-center btn-visualizar-nfe"
                                  title="Consultar nota fiscal"
                                  disabled={loadingNfe}
                                >
                                  {loadingNfe ? (
                                    <Spinner as="span" animation="border" size="sm" role="status" className="me-1" />
                                  ) : (
                                    <FaFileInvoiceDollar className="me-1" />
                                  )}
                                  {loadingNfe ? 'Carregando...' : 'NFe'}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="7" className="p-0">
                            <Collapse in={expandedPedido === pedido.codigo}>
                              <div>
                                <Card className="border-0 rounded-0">
                                  <Card.Body className="bg-light">
                                    <h6 className="mb-3">Itens do Pedido #{pedido.codigo}</h6>
                                    {loadingItens ? (
                                      <div className="text-center py-3">
                                        <Spinner animation="border" size="sm" />
                                        <span className="ms-2">Carregando itens...</span>
                                      </div>
                                    ) : itensPedido.length === 0 ? (
                                      <p className="text-muted mb-0">Nenhum item encontrado para este pedido.</p>
                                    ) : (
                                      <>
                                        {/* Visualização em tabela para desktop */}
                                        <div className="table-responsive d-none d-md-block">
                                          <Table size="sm" className="mb-0">
                                            <thead>
                                              <tr>
                                                <th>Cód.</th>
                                                <th>Produto</th>
                                                <th className="text-center">Qtde</th>
                                                <th className="text-end">Valor Unit.</th>
                                                <th className="text-end">Valor Total</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {itensPedido.map((item, index) => (
                                                <tr key={`${item.seq || index}-${item.cod_produto}`}>
                                                  <td>{item.cod_produto}</td>
                                                  <td>{item.produto_descricao || `Produto ${item.cod_produto}`}</td>
                                                  <td className="text-center">{item.qtde}</td>
                                                  <td className="text-end">{formatCurrency(item.vl_unitario)}</td>
                                                  <td className="text-end">{formatCurrency(item.vl_total)}</td>
                                                </tr>
                                              ))}
                                              <tr className="border-top">
                                                <td colSpan="4" className="text-end fw-bold">Total:</td>
                                                <td className="text-end fw-bold">{formatCurrency(pedido.vl_total)}</td>
                                              </tr>
                                            </tbody>
                                          </Table>
                                        </div>

                                        {/* Visualização em cards para mobile */}
                                        <div className="d-md-none">
                                          {itensPedido.map((item, index) => (
                                            <Card key={`${item.seq || index}-${item.cod_produto}`} className="mb-2 item-card">
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
                                            <span className="fw-bold highlight-value">{formatCurrency(pedido.vl_total)}</span>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </Card.Body>
                                </Card>
                              </div>
                            </Collapse>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </Table>
              </div>
              
              {/* Container da paginação atualizado */}
              <div className="pagination-container">
                <div className="pagination-info">
                  Mostrando página {pagination.currentPage} de {pagination.totalPages} ({pagination.total} pedidos no total)
                </div>
                <Pagination>
                  <Pagination.First
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.currentPage === 1}
                  />
                  <Pagination.Prev
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                  />
                  
                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <Pagination.Ellipsis key={`ellipsis-${index}`} />
                    ) : (
                      <Pagination.Item
                        key={page}
                        active={page === pagination.currentPage}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Pagination.Item>
                    )
                  ))}
                  
                  <Pagination.Next
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                  />
                  <Pagination.Last
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={pagination.currentPage === pagination.totalPages}
                  />
                </Pagination>
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Modal para visualização do DANFE */}
      {showDanfeViewer && (
        <DanfeViewer
          xmlNFe={xmlNFe}
          chaveNFe={chaveNFe}
          useChaveOnly={useChaveOnly}
          numeroNF={numeroNF}
          onClose={handleCloseDanfeViewer}
          show={showDanfeViewer}
        />
      )}
    </Container>
  );
};

export default PedidosWorkflow; 