import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Form, Button, Alert, Spinner, Nav, Tab } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { configurationAPI } from '../../services/api';
import { getUser } from '../../services/authService';
import { toast } from 'react-toastify';
import { FaSave, FaCog, FaEnvelope, FaServer } from 'react-icons/fa';
import SmtpConfig from './SmtpConfig';

const Configuracoes = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [configurations, setConfigurations] = useState([]);
  const [activeTab, setActiveTab] = useState('sistema');
  
  // Configurações de estoque
  const [validateStockInQuotations, setValidateStockInQuotations] = useState(false);
  const [validateStockInOrders, setValidateStockInOrders] = useState(true);

  // Verificar se o usuário é admin para algumas configurações
  const user = getUser();
  const isAdmin = user?.role === 'admin';

  // Verificar permissão para acessar configurações
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
  }, [navigate, user]);

  // Carregar configurações
  useEffect(() => {
    const loadConfigurations = async () => {
      try {
        setLoading(true);
        
        if (isAdmin) {
        const response = await configurationAPI.listAll();
        if (response.success) {
          setConfigurations(response.data);
        } else {
          setError('Erro ao carregar configurações');
          }
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        setError('Erro ao carregar configurações');
      } finally {
        setLoading(false);
      }
    };

    const loadStockValidationSettings = async () => {
      try {
        if (isAdmin) {
        const response = await configurationAPI.getStockValidationSettings();
        if (response.success && response.data) {
          setValidateStockInQuotations(response.data.validate_stock_in_quotations);
          setValidateStockInOrders(response.data.validate_stock_in_orders);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar configurações de validação de estoque:', error);
      }
    };

    loadConfigurations();
    loadStockValidationSettings();
  }, [isAdmin]);

  // Salvar configurações de validação de estoque
  const handleSaveStockValidationSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await configurationAPI.updateStockValidationSettings({
        validate_quotations: validateStockInQuotations,
        validate_orders: validateStockInOrders
      });

      if (response.success) {
        setSuccess('Configurações salvas com sucesso');
        toast.success('Configurações salvas com sucesso');
      } else {
        setError('Erro ao salvar configurações');
        toast.error('Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setError('Erro ao salvar configurações');
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container fluid className="p-4">
      <h1 className="page-title mb-4">
        <FaCog className="me-2" /> Configurações
      </h1>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {loading ? (
        <div className="text-center p-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </Spinner>
        </div>
      ) : (
        <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
          <Card>
            <Card.Header>
              <Nav variant="tabs" className="card-header-tabs">
                <Nav.Item>
                  <Nav.Link eventKey="smtp">
                    <FaEnvelope className="me-2" />
                    Configurações de E-mail
                  </Nav.Link>
                </Nav.Item>
                {isAdmin && (
                  <Nav.Item>
                    <Nav.Link eventKey="sistema">
                      <FaServer className="me-2" />
                      Configurações do Sistema
                    </Nav.Link>
                  </Nav.Item>
                )}
              </Nav>
            </Card.Header>
            
            <Card.Body>
              <Tab.Content>
                <Tab.Pane eventKey="smtp">
                  <SmtpConfig />
                </Tab.Pane>
                
                {isAdmin && (
                  <Tab.Pane eventKey="sistema">
                    <h5 className="mb-4">Configurações de Estoque</h5>
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Check 
                        type="switch"
                        id="validate-stock-quotations"
                        label="Validar estoque disponível ao criar orçamentos"
                        checked={validateStockInQuotations}
                        onChange={(e) => setValidateStockInQuotations(e.target.checked)}
                      />
                      <Form.Text className="text-muted">
                        Se ativado, o sistema verificará se há estoque disponível para os produtos ao criar orçamentos.
                        Caso contrário, permitirá criar orçamentos mesmo sem estoque.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Check 
                        type="switch"
                        id="validate-stock-orders"
                        label="Validar estoque disponível ao converter orçamentos em pedidos"
                        checked={validateStockInOrders}
                        onChange={(e) => setValidateStockInOrders(e.target.checked)}
                      />
                      <Form.Text className="text-muted">
                        Se ativado, o sistema verificará se há estoque disponível para os produtos ao converter orçamentos em pedidos.
                        Caso contrário, permitirá converter orçamentos em pedidos mesmo sem estoque.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                <Button 
                  variant="primary" 
                  onClick={handleSaveStockValidationSettings}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <FaSave className="me-2" />
                      Salvar Configurações de Estoque
                    </>
                  )}
                </Button>
              </Form>
                  </Tab.Pane>
                )}
              </Tab.Content>
            </Card.Body>
          </Card>
        </Tab.Container>
      )}
      
      <div className="mt-4">
        <Button 
          variant="secondary" 
          onClick={() => navigate('/dashboard')}
        >
          Voltar para Dashboard
        </Button>
      </div>
    </Container>
  );
};

export default Configuracoes; 