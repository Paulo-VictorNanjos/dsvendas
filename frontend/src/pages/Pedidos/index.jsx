import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Button, Table, Spinner, Badge, Form, Row, Col, InputGroup } from 'react-bootstrap';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaSearch, FaFilter, FaEye, FaFileExport } from 'react-icons/fa';
import api from '../../services/api';
import SidebarLayout from '../../components/layouts/SidebarLayout';
import { useAuth } from '../../contexts/AuthContext';
import './styles.css';

const Pedidos = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredPedidos, setFilteredPedidos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [vendedorId, setVendedorId] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const filterPedidos = useCallback(() => {
    if (!searchTerm.trim()) {
      setFilteredPedidos(pedidos);
      return;
    }

    const filtered = pedidos.filter(pedido => 
      (pedido.codigo && pedido.codigo.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pedido.cod_cliente && pedido.cod_cliente.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pedido.cod_vendedor && pedido.cod_vendedor.toString().toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    setFilteredPedidos(filtered);
  }, [searchTerm, pedidos]);

  useEffect(() => {
    // Obter ID do vendedor do contexto de autenticação e também verificar localStorage
    const storedUser = JSON.parse(localStorage.getItem('usuario')) || {};
    const vendedorCodigo = user?.vendedor_codigo || storedUser.vendedor_codigo;
    
    setVendedorId(vendedorCodigo);
    
    if (vendedorCodigo) {
      fetchPedidos();
    } else {
      // Caso não tenha o código do vendedor, tentar usar o ID do usuário
      if (user?.id) {
        // Tentar buscar o código do vendedor pelo ID do usuário
        api.get(`/usuarios/${user.id}/vendedor`)
          .then(response => {
            if (response.data && response.data.data && response.data.data.vendedor_codigo) {
              setVendedorId(response.data.data.vendedor_codigo);
              fetchPedidos();
            } else {
              fetchPedidos(); // Mesmo sem vendedor, buscar pedidos gerais
              
              // Mostrar alerta apenas se o usuário não for admin
              if (user?.role !== 'admin') {
                toast.warning('Você não possui um vendedor vinculado. Entre em contato com o administrador para configurar seu acesso a pedidos específicos.');
              }
            }
          })
          .catch(err => {
            console.error('Erro ao buscar vendedor vinculado:', err);
            fetchPedidos(); // Mesmo com erro, buscar pedidos gerais
            
            // Mostrar alerta apenas se o usuário não for admin
            if (user?.role !== 'admin') {
              toast.error('Erro ao identificar vendedor. Alguns pedidos podem não estar visíveis.');
            }
          });
      } else {
        fetchPedidos();
      }
    }
  }, [user]);

  useEffect(() => {
    filterPedidos();
  }, [searchTerm, pedidos, filterPedidos]);

  const fetchPedidos = async () => {
    try {
      setLoading(true);
      let response;
      
      // Se tiver ID de vendedor e o usuário não for admin, filtrar por vendedor
      if (vendedorId && user?.role !== 'admin') {
        console.log('Buscando pedidos do vendedor:', vendedorId);
        response = await api.get(`/pedidos/vendedor/${vendedorId}`);
      } else {
        response = await api.get('/pedidos');
      }
      
      // Verificar a estrutura da resposta para compatibilidade
      const pedidosData = Array.isArray(response.data) ? response.data : 
                        (response.data.data ? response.data.data : []);
      
      setPedidos(pedidosData);
      setFilteredPedidos(pedidosData);
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      toast.error('Erro ao carregar pedidos!');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (id) => {
    navigate(`/pedidos/${id}`);
  };

  const handleSyncWithERP = async (id) => {
    try {
      await api.post(`/pedidos/${id}/sincronizar`);
      toast.success('Pedido sincronizado com sucesso!');
      fetchPedidos();
    } catch (error) {
      console.error('Erro ao sincronizar pedido:', error);
      toast.error('Erro ao sincronizar pedido com o ERP!');
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

  const getPedidoStatusBadge = (status) => {
    switch (status) {
      case 1:
        return <Badge bg="warning">Aguardando Aprovação</Badge>;
      case 2:
        return <Badge bg="success">Aprovado</Badge>;
      case 3:
        return <Badge bg="info">Em Faturamento</Badge>;
      case 4:
        return <Badge bg="primary">Faturado</Badge>;
      case 5:
        return <Badge bg="danger">Cancelado</Badge>;
      default:
        return <Badge bg="secondary">Desconhecido</Badge>;
    }
  };

  const getSyncStatusBadge = (syncStatus) => {
    if (syncStatus === true) {
      return <Badge bg="success">Sincronizado</Badge>;
    } else if (syncStatus === false) {
      return <Badge bg="warning">Pendente</Badge>;
    } else {
      return <Badge bg="secondary">Desconhecido</Badge>;
    }
  };

  return (
    <SidebarLayout>
      <Container fluid>
        <Row className="mb-4 align-items-center">
          <Col>
            <h4 className="mb-0 page-title">Pedidos de Venda</h4>
          </Col>
        </Row>

        <Card className="shadow-sm border-0 mb-4">
          <Card.Body>
            <Row className="mb-3">
              <Col md={9}>
                <InputGroup>
                  <Form.Control
                    placeholder="Buscar por código, cliente ou vendedor..."
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
                    <Form.Label>Status</Form.Label>
                    <Form.Select>
                      <option value="">Todos</option>
                      <option value="1">Aguardando Aprovação</option>
                      <option value="2">Aprovado</option>
                      <option value="3">Em Faturamento</option>
                      <option value="4">Faturado</option>
                      <option value="5">Cancelado</option>
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
                <p className="mt-2">Carregando pedidos...</p>
              </div>
            ) : filteredPedidos.length === 0 ? (
              <div className="text-center my-5">
                <p className="text-muted">Nenhum pedido encontrado.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover className="table-modern mb-0">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Data</th>
                      <th>Cliente</th>
                      <th>Vendedor</th>
                      <th>Valor Total</th>
                      <th>Status</th>
                      <th>Sincronização</th>
                      <th className="text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPedidos.map((pedido) => (
                      <tr key={pedido.codigo} className="align-middle">
                        <td>{pedido.codigo}</td>
                        <td>{formatDate(pedido.dt_pedido)}</td>
                        <td>{pedido.cod_cliente}</td>
                        <td>{pedido.cod_vendedor}</td>
                        <td className="highlight-value">{formatCurrency(pedido.vl_total)}</td>
                        <td>{getPedidoStatusBadge(pedido.cod_status)}</td>
                        <td>{getSyncStatusBadge(pedido.sync_status)}</td>
                        <td>
                          <div className="d-flex justify-content-center gap-2">
                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              onClick={() => handleViewDetails(pedido.codigo)}
                              title="Visualizar Detalhes"
                            >
                              <FaEye />
                            </Button>
                            
                            {/* Mostrar botão de sincronização apenas se o pedido não estiver sincronizado */}
                            {pedido.sync_status === false && (
                              <Button 
                                variant="outline-success" 
                                size="sm"
                                onClick={() => handleSyncWithERP(pedido.codigo)}
                                title="Sincronizar com ERP"
                              >
                                <FaFileExport />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>
    </SidebarLayout>
  );
};

export default Pedidos; 