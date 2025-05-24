import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Card, 
  Button, 
  Row, 
  Col, 
  Alert,
  Spinner
} from 'react-bootstrap';
import { syncService } from '../../services/syncService';
import { toast } from 'react-toastify';

const Sync = () => {
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState({
    fromERP: false,
    toERP: false,
    status: false
  });

  const fetchSyncStatus = async () => {
    try {
      setLoading(prev => ({ ...prev, status: true }));
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      toast.error('Erro ao buscar status da sincronização');
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
    } finally {
      setLoading(prev => ({ ...prev, toERP: false }));
    }
  };

  const handleSyncAll = async () => {
    try {
      setLoading({ fromERP: true, toERP: true, status: true });
      await Promise.all([
        syncService.syncFromERP(),
        syncService.syncToERP()
      ]);
      toast.success('Sincronização bidirecional completa realizada com sucesso!');
      fetchSyncStatus();
    } catch (error) {
      toast.error('Erro ao realizar sincronização completa');
    } finally {
      setLoading({ fromERP: false, toERP: false, status: false });
    }
  };

  useEffect(() => {
    fetchSyncStatus();
  }, []);

  return (
    <Container className="py-4">
      <h2 className="mb-4">Sincronização com ERP</h2>
      
      <Row className="mb-4">
        <Col>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Status da Sincronização</Card.Title>
              {loading.status ? (
                <div className="text-center">
                  <Spinner animation="border" />
                </div>
              ) : syncStatus ? (
                <Alert variant="info">
                  <p><strong>Última Sincronização:</strong> {' '}
                    {syncStatus.ultima_sync ? new Date(syncStatus.ultima_sync).toLocaleString() : 'Nunca'}
                  </p>
                  <p><strong>Status:</strong> {syncStatus.status}</p>
                </Alert>
              ) : null}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Importar do ERP</Card.Title>
              <Card.Text>
                Baixe os dados atualizados do ERP para o sistema web.
              </Card.Text>
              <Button 
                variant="primary" 
                onClick={handleSyncFromERP}
                disabled={loading.fromERP}
              >
                {loading.fromERP ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-2" />
                    Importando...
                  </>
                ) : 'Importar do ERP'}
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Exportar para ERP</Card.Title>
              <Card.Text>
                Envie os dados do sistema web para o ERP.
              </Card.Text>
              <Button 
                variant="primary" 
                onClick={handleSyncToERP}
                disabled={loading.toERP}
              >
                {loading.toERP ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-2" />
                    Exportando...
                  </>
                ) : 'Exportar para ERP'}
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Sincronização Bidirecional</Card.Title>
              <Card.Text>
                Sincronize dados em ambas as direções simultaneamente.
              </Card.Text>
              <Button 
                variant="success" 
                onClick={handleSyncAll}
                disabled={loading.fromERP || loading.toERP || loading.status}
              >
                {loading.fromERP || loading.toERP ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-2" />
                    Sincronizando...
                  </>
                ) : 'Sincronização Completa'}
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Sync; 