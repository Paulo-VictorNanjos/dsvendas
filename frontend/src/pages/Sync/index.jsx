import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Card, 
  Button, 
  Row, 
  Col, 
  Alert,
  Spinner,
  Badge,
  Table,
  Tabs,
  Tab
} from 'react-bootstrap';
import { FaSync, FaDownload, FaUpload, FaExchangeAlt, FaCreditCard, FaCalculator } from 'react-icons/fa';
import { syncService } from '../../services/syncService';
import { toast } from 'react-toastify';
import SidebarLayout from '../../components/layouts/SidebarLayout';
import './styles.css';

const Sync = () => {
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState({
    fromERP: false,
    toERP: false,
    status: false,
    paymentMethods: false,
    fiscalData: false
  });
  const [lastSyncLogs, setLastSyncLogs] = useState([]);
  const [paymentMethodsLogs, setPaymentMethodsLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('general');

  const fetchSyncStatus = async () => {
    try {
      setLoading(prev => ({ ...prev, status: true }));
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
      
      // Buscar logs de sincronização
      const logs = await syncService.getSyncLogs(10);
      setLastSyncLogs(logs);
      
      // Buscar logs específicos de métodos de pagamento
      const paymentLogs = await syncService.getPaymentMethodsLogs(10);
      setPaymentMethodsLogs(paymentLogs);
    } catch (error) {
      toast.error('Erro ao buscar status da sincronização');
      console.error(error);
    } finally {
      setLoading(prev => ({ ...prev, status: false }));
    }
  };

  const handleSyncFromERP = async () => {
    try {
      setLoading(prev => ({ ...prev, fromERP: true }));
      await syncService.syncFromERP();
      toast.success('Dados sincronizados do ERP com sucesso!');
      fetchSyncStatus();
    } catch (error) {
      toast.error('Erro ao sincronizar dados do ERP');
      console.error(error);
    } finally {
      setLoading(prev => ({ ...prev, fromERP: false }));
    }
  };

  const handleSyncToERP = async () => {
    try {
      setLoading(prev => ({ ...prev, toERP: true }));
      await syncService.syncToERP();
      toast.success('Dados enviados para o ERP com sucesso!');
      fetchSyncStatus();
    } catch (error) {
      toast.error('Erro ao enviar dados para o ERP');
      console.error(error);
    } finally {
      setLoading(prev => ({ ...prev, toERP: false }));
    }
  };

  const handleSyncAll = async () => {
    try {
      setLoading({ fromERP: true, toERP: true, status: true, paymentMethods: false, fiscalData: false });
      await Promise.all([
        syncService.syncFromERP(),
        syncService.syncToERP()
      ]);
      toast.success('Sincronização bidirecional completa realizada com sucesso!');
      fetchSyncStatus();
    } catch (error) {
      toast.error('Erro ao realizar sincronização completa');
      console.error(error);
    } finally {
      setLoading({ fromERP: false, toERP: false, status: false, paymentMethods: false, fiscalData: false });
    }
  };
  
  const handleSyncPaymentMethods = async () => {
    try {
      setLoading(prev => ({ ...prev, paymentMethods: true }));
      await syncService.syncPaymentMethods();
      toast.success('Métodos de pagamento sincronizados com sucesso!');
      fetchSyncStatus();
    } catch (error) {
      toast.error('Erro ao sincronizar métodos de pagamento');
      console.error(error);
    } finally {
      setLoading(prev => ({ ...prev, paymentMethods: false }));
    }
  };
  
  const handleSyncFiscalData = async () => {
    try {
      setLoading(prev => ({ ...prev, fiscalData: true }));
      await syncService.syncFiscalData();
      toast.success('Dados fiscais sincronizados com sucesso!');
      fetchSyncStatus();
    } catch (error) {
      toast.error('Erro ao sincronizar dados fiscais');
      console.error(error);
    } finally {
      setLoading(prev => ({ ...prev, fiscalData: false }));
    }
  };

  useEffect(() => {
    fetchSyncStatus();
    // Simular atualização periódica a cada 5 minutos
    const interval = setInterval(fetchSyncStatus, 300000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUCCESS':
      case 'CONCLUIDO':
        return <Badge bg="success">Concluído</Badge>;
      case 'ERROR':
      case 'ERRO':
        return <Badge bg="danger">Erro</Badge>;
      case 'IN_PROGRESS':
      case 'INICIADO':
        return <Badge bg="warning">Em Progresso</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const getDirectionBadge = (direction) => {
    switch (direction) {
      case 'FROM_ERP':
        return <Badge bg="info">ERP → Web</Badge>;
      case 'TO_ERP':
        return <Badge bg="primary">Web → ERP</Badge>;
      case 'PAYMENT_METHODS':
        return <Badge bg="success">Métodos de Pagamento</Badge>;
      default:
        return <Badge bg="secondary">{direction}</Badge>;
    }
  };

  return (
    <SidebarLayout>
      <Container className="py-4">
        <h1 className="mb-4">Sincronização</h1>
        
        <Row className="mb-4">
          <Col>
            <Alert variant="info">
              <Alert.Heading>Centro de Sincronização</Alert.Heading>
              <p>
                Utilize as opções abaixo para sincronizar seus dados com o ERP.
                A última sincronização foi realizada em: 
                {syncStatus?.lastSync ? (
                  <Badge bg="primary" className="ms-2">
                    {new Date(syncStatus.lastSync).toLocaleString()}
                  </Badge>
                ) : (
                  <Badge bg="warning" className="ms-2">Nunca</Badge>
                )}
              </p>
              <p>
                Status atual: 
                {syncStatus?.syncInProgress ? (
                  <Badge bg="warning" className="ms-2">
                    Sincronização em andamento
                  </Badge>
                ) : (
                  <Badge bg="success" className="ms-2">Pronto para sincronizar</Badge>
                )}
              </p>
            </Alert>
          </Col>
        </Row>

        <h3 className="mb-3">Ações de Sincronização</h3>
        <Row className="mb-5 g-4">
          <Col md={3}>
            <Card className="shadow-sm card-hover h-100">
              <Card.Body className="d-flex flex-column">
                <div className="text-center p-3 mb-3">
                  <FaDownload className="text-primary" size={40} />
                </div>
                <Card.Title className="text-center">Download do ERP</Card.Title>
                <Card.Text className="text-center mb-4">
                  Traga dados do sistema ERP para este sistema web.
                  Atualiza produtos, clientes e mais.
                </Card.Text>
                <div className="mt-auto">
                  <Button 
                    variant="primary" 
                    className="w-100"
                    onClick={handleSyncFromERP}
                    disabled={loading.fromERP || syncStatus?.syncInProgress}
                  >
                    {loading.fromERP ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-2" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <FaDownload className="me-2" /> Baixar do ERP
                      </>
                    )}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="shadow-sm card-hover h-100">
              <Card.Body className="d-flex flex-column">
                <div className="text-center p-3 mb-3">
                  <FaUpload className="text-success" size={40} />
                </div>
                <Card.Title className="text-center">Upload para ERP</Card.Title>
                <Card.Text className="text-center mb-4">
                  Envie dados deste sistema para o ERP.
                  Atualiza informações de produtos e clientes.
                </Card.Text>
                <div className="mt-auto">
                  <Button 
                    variant="success" 
                    className="w-100"
                    onClick={handleSyncToERP}
                    disabled={loading.toERP || syncStatus?.syncInProgress}
                  >
                    {loading.toERP ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-2" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <FaUpload className="me-2" /> Enviar para ERP
                      </>
                    )}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="shadow-sm card-hover h-100">
              <Card.Body className="d-flex flex-column">
                <div className="text-center p-3 mb-3">
                  <FaSync className="text-danger" size={40} />
                </div>
                <Card.Title className="text-center">Sincronização Completa</Card.Title>
                <Card.Text className="text-center mb-4">
                  Sincronização bidirecional completa.
                  Atualiza todos os dados em ambos os sistemas.
                </Card.Text>
                <div className="mt-auto">
                  <Button 
                    variant="danger" 
                    className="w-100"
                    onClick={handleSyncAll}
                    disabled={(loading.fromERP || loading.toERP) || syncStatus?.syncInProgress}
                  >
                    {(loading.fromERP || loading.toERP) ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-2" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <FaSync className="me-2" /> Sincronização Total
                      </>
                    )}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="shadow-sm card-hover h-100">
              <Card.Body className="d-flex flex-column">
                <div className="text-center p-3 mb-3">
                  <FaCreditCard className="text-warning" size={40} />
                </div>
                <Card.Title className="text-center">Formas de Pagamento</Card.Title>
                <Card.Text className="text-center mb-4">
                  Sincronize formas e condições de pagamento do ERP.
                  Mantenha as opções de pagamento atualizadas.
                </Card.Text>
                <div className="mt-auto">
                  <Button 
                    variant="warning" 
                    className="w-100"
                    onClick={handleSyncPaymentMethods}
                    disabled={loading.paymentMethods || syncStatus?.syncInProgress}
                  >
                    {loading.paymentMethods ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-2" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <FaCreditCard className="me-2" /> Sincronizar Pagamentos
                      </>
                    )}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={3}>
            <Card className="shadow-sm card-hover h-100">
              <Card.Body className="d-flex flex-column">
                <div className="text-center p-3 mb-3">
                  <FaCalculator className="text-info" size={40} />
                </div>
                <Card.Title className="text-center">Dados Fiscais</Card.Title>
                <Card.Text className="text-center mb-4">
                  Sincronize regras fiscais, classificações e impostos do ERP.
                  Garante o cálculo correto de impostos nos orçamentos.
                </Card.Text>
                <div className="mt-auto">
                  <Button 
                    variant="info" 
                    className="w-100"
                    onClick={handleSyncFiscalData}
                    disabled={loading.fiscalData || syncStatus?.syncInProgress}
                  >
                    {loading.fiscalData ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-2" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <FaCalculator className="me-2" /> Sincronizar Dados Fiscais
                      </>
                    )}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-3"
          id="sync-tabs"
        >
          <Tab eventKey="general" title="Logs Gerais">
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Últimas Sincronizações</h5>
              </Card.Header>
              <Card.Body>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Status</th>
                      <th>Mensagem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastSyncLogs.length > 0 ? (
                      lastSyncLogs.map((log, index) => (
                        <tr key={index}>
                          <td>{new Date(log.data_sincronizacao).toLocaleString()}</td>
                          <td>{log.tipo}</td>
                          <td>
                            <Badge bg={
                              log.status === 'CONCLUIDO' ? 'success' : 
                              log.status === 'INICIADO' ? 'warning' : 
                              'danger'
                            }>
                              {log.status}
                            </Badge>
                          </td>
                          <td>{log.mensagem}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center">Nenhum log de sincronização disponível</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab>
          <Tab eventKey="payment" title="Logs de Pagamento">
            <Card>
              <Card.Header>
                <h5 className="mb-0">Sincronizações de Métodos de Pagamento</h5>
              </Card.Header>
              <Card.Body>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Status</th>
                      <th>Mensagem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentMethodsLogs.length > 0 ? (
                      paymentMethodsLogs.map((log, index) => (
                        <tr key={index}>
                          <td>{new Date(log.data_sincronizacao).toLocaleString()}</td>
                          <td>
                            <Badge bg={
                              log.status === 'CONCLUIDO' ? 'success' : 
                              log.status === 'INICIADO' ? 'warning' : 
                              'danger'
                            }>
                              {log.status}
                            </Badge>
                          </td>
                          <td>{log.mensagem}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="text-center">Nenhum log de sincronização de pagamentos disponível</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab>
        </Tabs>
      </Container>
    </SidebarLayout>
  );
};

export default Sync; 