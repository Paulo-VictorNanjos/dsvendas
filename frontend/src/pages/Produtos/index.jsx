import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Button, Table, Spinner, Badge, Form, Row, Col, InputGroup, Modal, Pagination } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  FaPlus, FaSearch, FaFilter, FaEdit, FaTrash, FaSync, 
  FaBarcode, FaBraille, FaBox, FaTags, FaPercent,
  FaTable, FaTh, FaDollarSign, FaArchive, FaBoxOpen,
  FaAngleLeft, FaAngleRight, FaEllipsisH, FaCalculator
} from 'react-icons/fa';
import api, { produtosAPI } from '../../services/api';
import SidebarLayout from '../../components/layouts/SidebarLayout';
import { syncService } from '../../services/syncService';
import './styles.css';

const Produtos = () => {
  console.log("Componente Produtos sendo renderizado");
  
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredProdutos, setFilteredProdutos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' ou 'cards'
  const [categorias, setCategorias] = useState([]);
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [error, setError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const navigate = useNavigate();

  const filterProdutos = useCallback(() => {
    let filtered = [...produtos];
    
    // Filtrar por termo de busca
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(produto => 
        (produto.codigo && produto.codigo.toString().includes(searchLower)) ||
        (produto.descricao && produto.descricao.toLowerCase().includes(searchLower)) ||
        (produto.referencia && produto.referencia.toLowerCase().includes(searchLower))
      );
    }
    
    // Filtrar por categoria
    if (filterCategoria) {
      filtered = filtered.filter(produto => produto.categoria === filterCategoria);
    }
    
    // Filtrar por status
    if (filterStatus) {
      const ativo = filterStatus === 'ativo';
      filtered = filtered.filter(produto => produto.ativo === ativo);
    }
    
    setFilteredProdutos(filtered);
    // Resetar para a primeira página quando filtrar
    setCurrentPage(1);
  }, [searchTerm, produtos, filterCategoria, filterStatus]);

  // Função para buscar todos os produtos
  const fetchProdutos = async () => {
    try {
      setLoading(true);
      setError(false);
      console.log("Tentando buscar produtos da API");
      const [produtosRes, categoriasRes] = await Promise.all([
        api.get('/produtos'),
        api.get('/categorias')
      ]);
      
      console.log("Produtos recebidos:", produtosRes.data);
      setProdutos(produtosRes.data);
      setFilteredProdutos(produtosRes.data);
      setCategorias(categoriasRes.data);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      setError(true);
      toast.error('Erro ao carregar produtos!');
    } finally {
      setLoading(false);
    }
  };

  // Paginação
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProdutos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProdutos.length / itemsPerPage);

  // Função para gerar os itens de paginação
  const renderPaginationItems = () => {
    const items = [];
    
    // Sempre mostrar a primeira página
    items.push(
      <Pagination.Item 
        key={1} 
        active={currentPage === 1}
        onClick={() => setCurrentPage(1)}
      >
        1
      </Pagination.Item>
    );
    
    // Lógica para mostrar reticências e páginas próximas à atual
    if (totalPages > 1) {
      if (currentPage > 3) {
        items.push(<Pagination.Ellipsis key="ellipsis-1" />);
      }
      
      // Mostrar até 2 páginas antes e depois da atual, limitando a 4 páginas no total
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(startPage + 2, totalPages);
      
      for (let i = startPage; i <= endPage; i++) {
        if (i <= totalPages && items.length < 4) {
          items.push(
            <Pagination.Item 
              key={i} 
              active={currentPage === i}
              onClick={() => setCurrentPage(i)}
            >
              {i}
            </Pagination.Item>
          );
        }
      }
      
      // Mostrar reticências se houver mais páginas
      if (endPage < totalPages - 1) {
        items.push(<Pagination.Ellipsis key="ellipsis-2" />);
      }
      
      // Sempre mostrar a última página se não for a única
      if (totalPages > 1 && !items.some(item => item.key === totalPages.toString())) {
        items.push(
          <Pagination.Item 
            key={totalPages} 
            active={currentPage === totalPages}
            onClick={() => setCurrentPage(totalPages)}
          >
            {totalPages}
          </Pagination.Item>
        );
      }
    }
    
    return items;
  };

  useEffect(() => {
    fetchProdutos();
  }, []);

  useEffect(() => {
    filterProdutos();
  }, [searchTerm, produtos, filterCategoria, filterStatus, filterProdutos]);

  const handleNewProduto = () => {
    navigate('/produtos/novo');
  };

  const handleEdit = (id) => {
    navigate(`/produtos/${id}`);
  };

  const handleDeleteClick = (produto) => {
    setSelectedProduto(produto);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!selectedProduto) return;
    
    try {
      await api.delete(`/produtos/${selectedProduto.codigo}`);
      toast.success('Produto excluído com sucesso!');
      fetchProdutos();
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast.error('Erro ao excluir produto!');
    }
  };
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleSyncProdutos = async () => {
    try {
      setLoading(true);
      toast.info('Sincronizando produtos...');
      await api.post('/sync/produtos');
      toast.success('Produtos sincronizados com sucesso!');
      fetchProdutos();
    } catch (error) {
      console.error('Erro ao sincronizar produtos:', error);
      toast.error('Erro ao sincronizar produtos!');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFiscalData = async () => {
    try {
      setLoading(true);
      toast.info('Sincronizando dados fiscais de produtos...');
      await syncService.syncFiscalData();
      toast.success('Dados fiscais sincronizados com sucesso!');
      fetchProdutos(); // Recarregar produtos com dados fiscais atualizados
    } catch (error) {
      console.error('Erro ao sincronizar dados fiscais:', error);
      toast.error('Erro ao sincronizar dados fiscais!');
    } finally {
      setLoading(false);
    }
  };

  // Componente do Modal de Confirmação de Exclusão
  const DeleteConfirmationModal = () => {
    return (
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Exclusão</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProduto && (
            <p>
              Tem certeza que deseja excluir o produto <strong>{selectedProduto.descricao}</strong>?
              <br />
              Esta ação não pode ser desfeita.
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Excluir
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  // Componente de Paginação
  const PaginationComponent = () => {
    if (filteredProdutos.length <= itemsPerPage) return null;
    
    return (
      <div className="d-flex justify-content-center mt-4">
        <Pagination>
          <Pagination.Prev 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          >
            <FaAngleLeft />
          </Pagination.Prev>
          
          {renderPaginationItems()}
          
          <Pagination.Next 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          >
            <FaAngleRight />
          </Pagination.Next>
        </Pagination>
      </div>
    );
  };

  return (
    <SidebarLayout>
      <Container fluid>
        <Row className="mb-4 align-items-center">
          <Col>
            <h4 className="mb-0 page-title">Produtos</h4>
          </Col>
          <Col xs="auto">
            <Button
              variant="primary"
              className="d-flex align-items-center"
              onClick={handleNewProduto}
            >
              <FaPlus className="me-2" /> Novo Produto
            </Button>
          </Col>
        </Row>

        {error ? (
          <Card className="shadow-sm border-0">
            <Card.Body>
              <div className="text-center my-5">
                <p className="text-danger">Erro ao carregar produtos. Verifique se a API está funcionando.</p>
                <Button variant="primary" onClick={fetchProdutos} className="mt-2">
                  Tentar novamente
                </Button>
              </div>
            </Card.Body>
          </Card>
        ) : (
          <>
            <Card className="shadow-sm border-0 mb-4">
              <Card.Body>
                <Row className="mb-3">
                  <Col md={9}>
                    <InputGroup>
                      <Form.Control
                        placeholder="Buscar por código, descrição ou referência..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <Button variant="outline-secondary">
                        <FaSearch />
                      </Button>
                    </InputGroup>
                  </Col>
                  <Col md={3} className="d-flex justify-content-end gap-2">
                    <Button 
                      variant={viewMode === 'table' ? 'primary' : 'outline-primary'}
                      onClick={() => setViewMode('table')}
                      title="Visualização em Tabela"
                    >
                      <FaTable />
                    </Button>
                    <Button 
                      variant={viewMode === 'cards' ? 'primary' : 'outline-primary'}
                      onClick={() => setViewMode('cards')}
                      title="Visualização em Cards"
                    >
                      <FaTh />
                    </Button>
                    <Button 
                      variant="outline-secondary"
                      onClick={() => setShowFilters(!showFilters)}
                      className="d-flex align-items-center"
                    >
                      <FaFilter className="me-2" />
                      {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                    </Button>
                    <Button 
                      variant="outline-success"
                      onClick={handleSyncProdutos}
                      className="d-flex align-items-center"
                      title="Sincronizar produtos com o ERP"
                    >
                      <FaSync className="me-1" /> Produtos
                    </Button>
                    <Button 
                      variant="outline-info"
                      onClick={handleSyncFiscalData}
                      className="d-flex align-items-center"
                      title="Sincronizar dados fiscais dos produtos"
                    >
                      <FaCalculator className="me-1" /> Dados Fiscais
                    </Button>
                  </Col>
                </Row>
                
                {showFilters && (
                  <Row className="mb-3">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Categoria</Form.Label>
                        <Form.Select
                          value={filterCategoria}
                          onChange={(e) => setFilterCategoria(e.target.value)}
                        >
                          <option value="">Todas</option>
                          {categorias.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.nome}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Status</Form.Label>
                        <Form.Select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                        >
                          <option value="">Todos</option>
                          <option value="ativo">Ativo</option>
                          <option value="inativo">Inativo</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4} className="d-flex align-items-end">
                      <Button 
                        variant="outline-secondary" 
                        onClick={() => {
                          setFilterCategoria('');
                          setFilterStatus('');
                          setSearchTerm('');
                        }}
                        className="w-100"
                      >
                        Limpar Filtros
                      </Button>
                    </Col>
                  </Row>
                )}
              </Card.Body>
            </Card>

            {loading ? (
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <div className="text-center my-5">
                    <Spinner animation="border" role="status" className="spinner-border-custom">
                      <span className="visually-hidden">Carregando...</span>
                    </Spinner>
                    <p className="mt-2">Carregando produtos...</p>
                  </div>
                </Card.Body>
              </Card>
            ) : filteredProdutos.length === 0 ? (
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <div className="text-center my-5">
                    <p className="text-muted">Nenhum produto encontrado.</p>
                    <Button variant="primary" onClick={handleNewProduto} className="mt-2">
                      Cadastrar primeiro produto
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            ) : viewMode === 'table' ? (
              <Card className="shadow-sm border-0">
                <Card.Body className="p-0">
                  <div className="table-responsive">
                    <Table hover className="table-modern mb-0">
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Descrição</th>
                          <th>Categoria</th>
                          <th>Preço Venda</th>
                          <th>Estoque</th>
                          <th>Status</th>
                          <th className="text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentItems.map((produto) => (
                          <tr key={produto.codigo} className="align-middle">
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="avatar-circle bg-light-primary me-2 text-primary">
                                  <FaBarcode />
                                </div>
                                <span>{produto.codigo}</span>
                              </div>
                            </td>
                            <td>
                              <div className="d-flex flex-column">
                                <span className="fw-bold">{produto.descricao}</span>
                                {produto.referencia && (
                                  <small className="text-muted">Ref: {produto.referencia}</small>
                                )}
                              </div>
                            </td>
                            <td>
                              <Badge bg="info" pill>
                                {produto.categoria || 'Sem categoria'}
                              </Badge>
                            </td>
                            <td>
                              <div className="d-flex align-items-center">
                                <FaDollarSign className="me-1 text-success" />
                                <span className="fw-bold">{formatCurrency(produto.preco_venda)}</span>
                              </div>
                            </td>
                            <td>
                              <Badge 
                                bg={Number(produto.estoque) > 0 ? 'success' : 'danger'} 
                                className="d-flex align-items-center" 
                                style={{ width: 'fit-content' }}
                              >
                                {Number(produto.estoque) > 0 ? <FaBoxOpen className="me-1" /> : <FaArchive className="me-1" />}
                                {produto.estoque || '0'}
                              </Badge>
                            </td>
                            <td>
                              <Badge 
                                bg={produto.ativo ? 'success' : 'secondary'}
                                className="status-badge"
                              >
                                {produto.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </td>
                            <td className="text-center">
                              <div className="d-flex justify-content-center gap-2">
                                <Button 
                                  variant="outline-primary" 
                                  size="sm"
                                  onClick={() => handleEdit(produto.codigo)}
                                  title="Editar"
                                  className="btn-icon"
                                >
                                  <FaEdit />
                                </Button>
                                <Button 
                                  variant="outline-danger" 
                                  size="sm" 
                                  onClick={() => handleDeleteClick(produto)}
                                  title="Excluir"
                                  className="btn-icon"
                                >
                                  <FaTrash />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                  
                  {/* Paginação e informação de páginas */}
                  {filteredProdutos.length > itemsPerPage && (
                    <div className="p-3">
                      <div className="d-flex justify-content-between align-items-center flex-wrap">
                        <div className="text-muted small">
                          Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredProdutos.length)} de {filteredProdutos.length} produtos
                        </div>
                        <PaginationComponent />
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            ) : (
              <>
                <Row>
                  {currentItems.map((produto) => (
                    <Col lg={4} md={6} className="mb-4" key={produto.codigo}>
                      <Card className="shadow-sm border-0 h-100 produto-card">
                        <Card.Header className="bg-transparent d-flex justify-content-between align-items-center">
                          <Badge bg="secondary" className="me-2">#{produto.codigo}</Badge>
                          <Badge 
                            bg={produto.ativo ? 'success' : 'secondary'}
                            className="status-badge"
                          >
                            {produto.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </Card.Header>
                        <Card.Body>
                          <h5 className="mb-3">{produto.descricao}</h5>
                          
                          <div className="d-flex flex-column gap-2 mb-3">
                            {produto.referencia && (
                              <div className="d-flex align-items-center">
                                <div className="avatar-circle bg-light-info me-2 text-info">
                                  <FaBraille />
                                </div>
                                <div>
                                  <small className="text-muted">Referência:</small>
                                  <div>{produto.referencia}</div>
                                </div>
                              </div>
                            )}
                            
                            <div className="d-flex align-items-center">
                              <div className="avatar-circle bg-light-warning me-2 text-warning">
                                <FaTags />
                              </div>
                              <div>
                                <small className="text-muted">Categoria:</small>
                                <div>{produto.categoria || 'Sem categoria'}</div>
                              </div>
                            </div>
                            
                            <div className="d-flex align-items-center">
                              <div className="avatar-circle bg-light-success me-2 text-success">
                                <FaDollarSign />
                              </div>
                              <div>
                                <small className="text-muted">Preço:</small>
                                <div className="fw-bold">{formatCurrency(produto.preco_venda)}</div>
                              </div>
                            </div>
                            
                            <div className="d-flex align-items-center">
                              <div className="avatar-circle bg-light-primary me-2 text-primary">
                                <FaBox />
                              </div>
                              <div>
                                <small className="text-muted">Estoque:</small>
                                <div className={Number(produto.estoque) > 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                                  {produto.estoque || '0'} unidades
                                </div>
                              </div>
                            </div>
                            
                            {produto.desconto > 0 && (
                              <div className="d-flex align-items-center">
                                <div className="avatar-circle bg-light-danger me-2 text-danger">
                                  <FaPercent />
                                </div>
                                <div>
                                  <small className="text-muted">Desconto:</small>
                                  <div className="text-danger">{produto.desconto}%</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </Card.Body>
                        <Card.Footer className="bg-transparent">
                          <div className="d-flex justify-content-between">
                            <Button 
                              variant="primary" 
                              size="sm"
                              onClick={() => handleEdit(produto.codigo)}
                              className="d-flex align-items-center"
                            >
                              <FaEdit className="me-1" /> Editar
                            </Button>
                            <Button 
                              variant="outline-danger" 
                              size="sm" 
                              onClick={() => handleDeleteClick(produto)}
                              className="d-flex align-items-center"
                            >
                              <FaTrash className="me-1" /> Excluir
                            </Button>
                          </div>
                        </Card.Footer>
                      </Card>
                    </Col>
                  ))}
                </Row>
                
                {/* Paginação e informação de páginas para modo Card */}
                {filteredProdutos.length > itemsPerPage && (
                  <div className="mt-3 mb-4">
                    <div className="d-flex justify-content-between align-items-center flex-wrap">
                      <div className="text-muted small">
                        Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredProdutos.length)} de {filteredProdutos.length} produtos
                      </div>
                      <PaginationComponent />
                    </div>
                  </div>
                )}
              </>
            )}

            <DeleteConfirmationModal />
          </>
        )}
      </Container>
    </SidebarLayout>
  );
};

export default Produtos; 