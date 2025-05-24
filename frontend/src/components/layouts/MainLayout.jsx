import React from 'react';
import { Container, Navbar, Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const MainLayout = ({ children }) => {
  return (
    <>
      <Navbar bg="primary" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand as={Link} to="/">DS Vendas</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/orcamentos">Orçamentos</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      
      <main className="py-3">
        {children}
      </main>
      
      <footer className="bg-light py-3 mt-5">
        <Container className="text-center">
          <p className="mb-0">DS Vendas &copy; {new Date().getFullYear()}</p>
        </Container>
      </footer>
    </>
  );
};

export default MainLayout; 