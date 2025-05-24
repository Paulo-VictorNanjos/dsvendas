import React, { useState } from 'react';
import { Form, InputGroup, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaSearch, FaHeadset, FaBars } from 'react-icons/fa';
import logo from '../../assets/images/logo.png';
import './Navbar.css';
import '../../assets/styles/PermakLogo.css';

const Navbar = ({ toggleSidebar }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    // Implementar lógica de busca aqui
    console.log('Searching for:', searchQuery);
  };

  return (
    <div className="modern-navbar">
      <div className="navbar-content">
        {/* Logo e Busca */}
        <div className="navbar-left">
          <Link to="/" className="navbar-brand">
            <img src={logo} alt="Permak" className="permak-logo" />
          </Link>
          <div className="search-container">
            <Form onSubmit={handleSearch}>
              <InputGroup>
                <Form.Control
                  placeholder="Pesquisar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="modern-search"
                />
                <Button variant="link" type="submit" className="search-button">
                  <FaSearch />
                </Button>
              </InputGroup>
            </Form>
          </div>
        </div>

        {/* Botões de Acesso */}
        <div className="navbar-right">
          <Link to="/central-atendimento" className="nav-access-btn">
            <FaHeadset className="nav-icon" />
            <span className="nav-text">Central de<br />Atendimento</span>
          </Link>
          <button 
            className="sidebar-toggle-btn" 
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <FaBars />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar; 