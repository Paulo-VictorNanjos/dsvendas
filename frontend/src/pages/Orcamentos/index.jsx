import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Button, Table, Spinner, Badge, Form, Row, Col, InputGroup } from 'react-bootstrap';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  FaPlus, FaSearch, FaFilter, FaEdit, FaTrash, FaFilePdf, 
  FaUser, FaUserTie, FaMoneyBillWave,
  FaTable, FaTh, FaCheck, FaSpinner, FaCopy
} from 'react-icons/fa';
import { ButtonGroup, Tooltip } from '@mui/material';
import api from '../../services/api';
import { getUser } from '../../services/authService';
import OrcamentoPDF from '../../components/OrcamentoPDF';
import { formatOrcamentoCodigo } from '../../utils';
import { pdf } from '@react-pdf/renderer';
import './styles.css';

const Orcamentos = () => {
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredOrcamentos, setFilteredOrcamentos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [condicoesPagamento, setCondicoesPagamento] = useState([]);
  const [viewMode, setViewMode] = useState('cards');
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [loadingPdfData, setLoadingPdfData] = useState({});
  const navigate = useNavigate();

  // Detectar se é dispositivo móvel
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Adicionar listener para mudanças de tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      // Se for mobile, força o modo card
      if (window.innerWidth < 768 && viewMode === 'table') {
        setViewMode('cards');
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Verificar no carregamento inicial
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [viewMode]);

  // Carregar usuário logado
  useEffect(() => {
    const user = getUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setUsuarioLogado(user);
  }, [navigate]);

  const filterOrcamentos = useCallback(() => {
    if (!orcamentos) return;

    let filtered = [...orcamentos];

    // Filtrar por vendedor se não for admin
    if (usuarioLogado && usuarioLogado.vendedor && usuarioLogado.role !== 'admin') {
      filtered = filtered.filter(orc => orc.cod_vendedor === usuarioLogado.vendedor.codigo);
    }

    // Aplicar filtro de busca
    if (searchTerm.trim()) {
      filtered = filtered.filter(orcamento => {
      const cliente = clientes.find(c => c.codigo === orcamento.cod_cliente);
      const vendedor = vendedores.find(v => v.codigo === orcamento.cod_vendedor);
      
      const clienteNome = cliente ? (cliente.razao || cliente.nome || '').toLowerCase() : '';
      const vendedorNome = vendedor ? (vendedor.nome || '').toLowerCase() : '';
      
      return orcamento.codigo.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        orcamento.cod_cliente.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        orcamento.cod_vendedor.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        clienteNome.includes(searchTerm.toLowerCase()) ||
        vendedorNome.includes(searchTerm.toLowerCase());
    });
    }
    
    setFilteredOrcamentos(filtered);
  }, [searchTerm, orcamentos, clientes, vendedores, usuarioLogado]);

  // Função para buscar todos os dados necessários
  const fetchData = async () => {
    try {
      setLoading(true);
      const [orcamentosRes, clientesRes, vendedoresRes, formasPagtoRes, condPagtoRes] = await Promise.all([
        api.get('/orcamentos'),
        api.get('/clientes'),
        api.get('/vendedores'),
        api.get('/formas-pagamento'),
        api.get('/condicoes-pagamento')
      ]);
      
      // Acessar a propriedade data da resposta
      const orcamentosData = orcamentosRes.data.data || [];
      setOrcamentos(orcamentosData);
      setClientes(clientesRes.data || []);
      setVendedores(vendedoresRes.data || []);
      setFormasPagamento(formasPagtoRes.data || []);
      setCondicoesPagamento(condPagtoRes.data || []);

      // A filtragem será feita pelo filterOrcamentos
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (usuarioLogado) {
    fetchData();
    }
  }, [usuarioLogado]);

  useEffect(() => {
    filterOrcamentos();
  }, [searchTerm, orcamentos, filterOrcamentos]);

  // Verificar permissão para ações
  const temPermissao = (orcamento) => {
    if (!usuarioLogado) return false;
    if (usuarioLogado.role === 'admin') return true;
    if (usuarioLogado.vendedor) {
      return orcamento.cod_vendedor === usuarioLogado.vendedor.codigo;
    }
    return false;
  };

  const handleNewOrcamento = () => {
    navigate('/orcamentos/novo');
  };

  const handleEdit = (id) => {
    const orcamento = orcamentos.find(o => o.codigo === id);
    if (orcamento && !temPermissao(orcamento)) {
      toast.error('Você não tem permissão para editar este orçamento.');
      return;
    }
    navigate(`/orcamentos/${id}`);
  };

  const handleDelete = async (id) => {
    const orcamento = orcamentos.find(o => o.codigo === id);
    if (orcamento && !temPermissao(orcamento)) {
      toast.error('Você não tem permissão para excluir este orçamento.');
      return;
    }

    if (window.confirm('Tem certeza que deseja excluir este orçamento?')) {
      try {
        await api.delete(`/orcamentos/${id}`);
        toast.success('Orçamento excluído com sucesso!');
        fetchData();
      } catch (error) {
        console.error('Erro ao excluir orçamento:', error);
        toast.error('Erro ao excluir orçamento!');
      }
    }
  };
  
  const handleApprove = async (id) => {
    const orcamento = orcamentos.find(o => o.codigo === id);
    if (orcamento && !temPermissao(orcamento)) {
      toast.error('Você não tem permissão para aprovar este orçamento.');
      return;
    }

    if (window.confirm('Tem certeza que deseja aprovar este orçamento?')) {
      try {
        await api.post(`/orcamentos/${id}/aprovar`);
        toast.success('Orçamento aprovado com sucesso!');
        fetchData();
      } catch (error) {
        console.error('Erro ao aprovar orçamento:', error);
        toast.error('Erro ao aprovar orçamento!');
      }
    }
  };
  
  const handleDuplicate = async (id) => {
    const orcamento = orcamentos.find(o => o.codigo === id);
    if (orcamento && !temPermissao(orcamento)) {
      toast.error('Você não tem permissão para duplicar este orçamento.');
      return;
    }

    if (window.confirm('Tem certeza que deseja duplicar este orçamento?')) {
      try {
        const response = await api.orcamentos.duplicar(id);
        const novoCodigo = response.data?.codigo || 'novo';
        toast.success(`Orçamento duplicado com sucesso! Código: ${novoCodigo}`);
        fetchData();
      } catch (error) {
        console.error('Erro ao duplicar orçamento:', error);
        toast.error('Erro ao duplicar orçamento!');
      }
    }
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
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleGeneratePdf = async (orcamento) => {
    try {
      setLoadingPdfData(prev => ({ ...prev, [orcamento.codigo]: true }));
      
      // Buscar os dados necessários para o PDF
      const response = await api.get(`/orcamentos/${orcamento.codigo}/pdf`);
      const dadosPDF = response.data.data;
      
      // Gerar o PDF usando o componente OrcamentoPDF
      const blob = await pdf(<OrcamentoPDF dados={dadosPDF} />).toBlob();
      const url = URL.createObjectURL(blob);
      
      // Criar link e fazer download
      const link = document.createElement('a');
      link.href = url;
      link.download = `orcamento_${formatOrcamentoCodigo(orcamento.codigo)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF!');
    } finally {
      setLoadingPdfData(prev => ({ ...prev, [orcamento.codigo]: false }));
    }
  };

  // Função para obter nome do cliente a partir do código
  const getClienteName = (codCliente) => {
    const cliente = clientes.find(c => c.codigo === codCliente);
    return cliente ? (cliente.razao || cliente.nome) : codCliente;
  };

  // Função para obter nome do vendedor a partir do código
  const getVendedorName = (codVendedor) => {
    const vendedor = vendedores.find(v => v.codigo === codVendedor);
    return vendedor ? vendedor.nome : codVendedor;
  };

  // Função para obter a cor do status
  const getStatusColor = (status) => {
    switch (status) {
      case 'APROVADO':
      case 'CONVERTIDO':
        return 'success';
      case 'CANCELADO':
        return 'danger';
      default:
        return 'warning';
    }
  };
    
  // Função para renderizar a tabela de orçamentos
  const renderTable = () => {
    if (loading) {
      return (
        <div className="text-center p-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </Spinner>
        </div>
      );
    }

    if (!filteredOrcamentos || filteredOrcamentos.length === 0) {
      return (
        <div className="text-center p-5">
          <p>Nenhum orçamento encontrado.</p>
        </div>
      );
    }

    return (
      <div className="table-responsive-new">
        <Table striped hover responsive="sm" className="align-middle mobile-optimized">
          <thead>
            <tr>
              <th>Código</th>
              <th>Data</th>
              <th>Cliente</th>
              <th>Vendedor</th>
              <th>Valor Total</th>
              <th>Status</th>
              <th className="actions-column">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrcamentos.map(orcamento => {
              const isLoading = loadingPdfData[orcamento.codigo];

              return (
                <tr key={orcamento.codigo}>
                  <td>{formatOrcamentoCodigo(orcamento.codigo)}</td>
                  <td>{formatDate(orcamento.dt_orcamento)}</td>
                  <td className="cliente-col">{getClienteName(orcamento.cod_cliente)}</td>
                  <td>{getVendedorName(orcamento.cod_vendedor)}</td>
                  <td>{formatCurrency(orcamento.vl_total || 0)}</td>
                  <td>
                    <Badge bg={getStatusColor(orcamento.status)}>
                      {orcamento.status === 'CONVERTIDO' ? 'APROVADO' : (orcamento.status || 'PENDENTE')}
                    </Badge>
                  </td>
                  <td>
                    <ButtonGroup size="small" variant="outlined" className="action-buttons">
                      <Tooltip title="Editar">
                        <Button
                          onClick={() => handleEdit(orcamento.codigo)}
                          color="primary"
                          size="sm"
                        >
                          <FaEdit />
                        </Button>
                      </Tooltip>
                      
                      <Tooltip title="Duplicar">
                        <Button
                          onClick={() => handleDuplicate(orcamento.codigo)}
                          color="secondary"
                          size="sm"
                        >
                          <FaCopy />
                        </Button>
                      </Tooltip>
                      
                      <Tooltip title="Excluir">
                        <Button
                          onClick={() => handleDelete(orcamento.codigo)}
                          color="error"
                          size="sm"
                        >
                          <FaTrash />
                        </Button>
                      </Tooltip>
                      
                      <Tooltip title="Aprovar">
                        <Button
                          onClick={() => handleApprove(orcamento.codigo)}
                          color="success"
                          size="sm"
                          disabled={orcamento.status === 'APROVADO' || orcamento.status === 'CONVERTIDO'}
                        >
                          <FaCheck />
                        </Button>
                      </Tooltip>
                      
                      <Tooltip title="Baixar PDF">
                        <Button
                          onClick={() => handleGeneratePdf(orcamento)}
                          color="info"
                          size="sm"
                          disabled={isLoading}
                        >
                          {isLoading ? <FaSpinner className="fa-spin" /> : <FaFilePdf />}
                        </Button>
                      </Tooltip>
                    </ButtonGroup>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    );
  };

  return (
    <Container fluid className="py-3 mobile-container">
      <Card className="shadow-sm border-0 mb-3">
        <Card.Body>
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
            <h4 className="mb-2 mb-md-0">Orçamentos</h4>
            <div className="d-flex gap-2">
              {!isMobile && (
                <>
                  <Button 
                    variant={viewMode === 'table' ? 'primary' : 'outline-primary'}
                    onClick={() => setViewMode('table')}
                    title="Visualização em Tabela"
                    className="view-toggle-btn"
                  >
                    <FaTable />
                  </Button>
                  <Button 
                    variant={viewMode === 'cards' ? 'primary' : 'outline-primary'}
                    onClick={() => setViewMode('cards')}
                    title="Visualização em Cards"
                    className="view-toggle-btn"
                  >
                    <FaTh />
                  </Button>
                </>
              )}
              <Button variant="success" onClick={handleNewOrcamento} className="new-btn">
                <FaPlus className={isMobile ? '' : 'me-2'} />
                {!isMobile && 'Novo Orçamento'}
              </Button>
            </div>
          </div>

          <Row className="mb-3">
            <Col xs={12}>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Buscar orçamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button variant="outline-secondary">
                  <FaSearch />
                </Button>
                <Button 
                  variant="outline-secondary"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <FaFilter />
                </Button>
              </InputGroup>
            </Col>
          </Row>
            
          {showFilters && (
            <Row className="filters-section g-2">
              <Col xs={12} md={3}>
                <Form.Group>
                  <Form.Label>Cliente</Form.Label>
                  <Form.Select>
                    <option value="">Todos</option>
                    {clientes.map(cliente => (
                      <option key={cliente.codigo} value={cliente.codigo}>
                        {cliente.razao || cliente.nome}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={3}>
                <Form.Group>
                  <Form.Label>Vendedor</Form.Label>
                  <Form.Select>
                    <option value="">Todos</option>
                    {vendedores.map(vendedor => (
                      <option key={vendedor.codigo} value={vendedor.codigo}>
                        {vendedor.nome}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={3}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select>
                    <option value="">Todos</option>
                    <option value="PENDENTE">Pendente</option>
                    <option value="APROVADO">Aprovado</option>
                    <option value="CANCELADO">Cancelado</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          )}
        </Card.Body>
      </Card>

      {viewMode === 'table' && !isMobile ? (
        renderTable()
      ) : (
        <Row className="g-3">
          {filteredOrcamentos.map(orcamento => {
            const isLoading = loadingPdfData[orcamento.codigo];

            return (
              <Col key={orcamento.codigo} xs={12} sm={6} md={4} lg={4}>
                <Card className="h-100 shadow-sm border-0 orcamento-card">
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h5 className="mb-1">{formatOrcamentoCodigo(orcamento.codigo)}</h5>
                        <small className="text-muted">
                          {formatDate(orcamento.dt_orcamento)}
                        </small>
                      </div>
                      <Badge bg={getStatusColor(orcamento.status)} className="mobile-badge">
                        {orcamento.status === 'CONVERTIDO' ? 'APROVADO' : (orcamento.status || 'PENDENTE')}
                      </Badge>
                    </div>

                    <div className="mb-3">
                      <div className="d-flex align-items-center mb-2">
                        <FaUser className="me-2 text-muted" />
                        <div className="text-truncate">
                          <small className="text-muted d-block">Cliente</small>
                          <div className="mobile-text-client">{getClienteName(orcamento.cod_cliente)}</div>
                        </div>
                      </div>
                      <div className="d-flex align-items-center mb-2">
                        <FaUserTie className="me-2 text-muted" />
                        <div>
                          <small className="text-muted d-block">Vendedor</small>
                          <div>{getVendedorName(orcamento.cod_vendedor)}</div>
                        </div>
                      </div>
                      <div className="d-flex align-items-center">
                        <FaMoneyBillWave className="me-2 text-muted" />
                        <div>
                          <small className="text-muted d-block">Valor Total</small>
                          <div className="fw-bold">{formatCurrency(orcamento.vl_total || 0)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-end gap-2 mobile-actions">
                      <Button 
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleEdit(orcamento.codigo)}
                        title="Editar"
                        className="action-btn"
                      >
                        <FaEdit />
                      </Button>
                      <Button 
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => handleDuplicate(orcamento.codigo)}
                        title="Duplicar"
                        className="action-btn"
                      >
                        <FaCopy />
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm" 
                        onClick={() => handleDelete(orcamento.codigo)}
                        title="Excluir"
                        className="action-btn"
                      >
                        <FaTrash />
                      </Button>
                      <Button 
                        variant="outline-success" 
                        size="sm"
                        onClick={() => handleApprove(orcamento.codigo)}
                        title="Aprovar"
                        disabled={orcamento.status === 'APROVADO' || orcamento.status === 'CONVERTIDO'}
                        className="action-btn"
                      >
                        <FaCheck />
                      </Button>
                      <Button 
                        variant="outline-info"
                        size="sm"
                        onClick={() => handleGeneratePdf(orcamento)}
                        title="Baixar PDF"
                        disabled={isLoading}
                        className="action-btn"
                      >
                        {isLoading ? <FaSpinner className="fa-spin" /> : <FaFilePdf />}
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </Container>
  );
};

export default Orcamentos; 