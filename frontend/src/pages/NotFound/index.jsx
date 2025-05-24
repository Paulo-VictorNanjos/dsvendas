import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import SidebarLayout from '../../components/layouts/SidebarLayout';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <SidebarLayout>
      <Container fluid>
        <Row className="justify-content-center align-items-center" style={{ minHeight: '70vh' }}>
          <Col xs={12} md={6} className="text-center">
            <h1 className="display-1 mb-4">404</h1>
            <h2 className="h4 mb-4">Página não encontrada</h2>
            <p className="text-muted mb-4">
              A página que você está procurando não existe ou foi movida.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/')}
              className="px-4"
            >
              Voltar para a página inicial
            </Button>
          </Col>
        </Row>
      </Container>
    </SidebarLayout>
  );
};

export default NotFound; 