import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { configurationAPI } from '../../services/api';
import { getUser } from '../../services/authService';
import { toast } from 'react-toastify';
import { FaSave, FaCog } from 'react-icons/fa';

const Configuracoes = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [configurations, setConfigurations] = useState([]);
  
  // Configurações de estoque
  const [validateStockInQuotations, setValidateStockInQuotations] = useState(false);
  const [validateStockInOrders, setValidateStockInOrders] = useState(true);

  // Verificar se o usuário é admin
  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Carregar configurações
  useEffect(() => {
    const loadConfigurations = async () => {
      try {
        setLoading(true);
        const response = await configurationAPI.listAll();
        if (response.success) {
          setConfigurations(response.data);
        } else {
          setError('Erro ao carregar configurações');
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
        const response = await configurationAPI.getStockValidationSettings();
        if (response.success && response.data) {
          setValidateStockInQuotations(response.data.validate_stock_in_quotations);
          setValidateStockInOrders(response.data.validate_stock_in_orders);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações de validação de estoque:', error);
      }
    };

    loadConfigurations();
    loadStockValidationSettings();
  }, []);

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
        <FaCog className="me-2" /> Configurações do Sistema
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
        <>
          <Card className="mb-4">
            <Card.Header as="h5">Configurações de Estoque</Card.Header>
            <Card.Body>
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
            </Card.Body>
          </Card>

          {/* Aqui poderiam ser adicionadas outras seções de configuração no futuro */}
        </>
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