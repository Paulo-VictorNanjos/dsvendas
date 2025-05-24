import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { FaFileInvoice, FaBox, FaUsers } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Home = () => {
  const { user } = useAuth();

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h4 className="page-title">Bem-vindo ao DSVendas</h4>
          <p className="text-muted">Olá, {user?.nome}! O que você gostaria de fazer hoje?</p>
        </Col>
      </Row>

      <Row>
        <Col md={4} className="mb-4">
          <Link to="/orcamentos" className="text-decoration-none">
            <Card className="h-100 shadow-sm border-0">
              <Card.Body>
                <div className="d-flex align-items-center mb-3">
                  <div className="icon-wrapper">
                    <FaFileInvoice className="text-primary" size={24} />
                  </div>
                </div>
                <h5 className="card-title">Orçamentos</h5>
                <p className="card-text text-muted">
                  Gerencie seus orçamentos, crie novos e acompanhe o status.
                </p>
              </Card.Body>
            </Card>
          </Link>
        </Col>

        <Col md={4} className="mb-4">
          <Link to="/produtos" className="text-decoration-none">
            <Card className="h-100 shadow-sm border-0">
              <Card.Body>
                <div className="d-flex align-items-center mb-3">
                  <div className="icon-wrapper">
                    <FaBox className="text-primary" size={24} />
                  </div>
                </div>
                <h5 className="card-title">Produtos</h5>
                <p className="card-text text-muted">
                  Consulte o catálogo de produtos, preços e estoque.
                </p>
              </Card.Body>
            </Card>
          </Link>
        </Col>

        <Col md={4} className="mb-4">
          <Link to="/clientes" className="text-decoration-none">
            <Card className="h-100 shadow-sm border-0">
              <Card.Body>
                <div className="d-flex align-items-center mb-3">
                  <div className="icon-wrapper">
                    <FaUsers className="text-primary" size={24} />
                  </div>
                </div>
                <h5 className="card-title">Clientes</h5>
                <p className="card-text text-muted">
                  Gerencie sua carteira de clientes e histórico de vendas.
                </p>
              </Card.Body>
            </Card>
          </Link>
        </Col>
      </Row>
    </Container>
  );
};

export default Home; 