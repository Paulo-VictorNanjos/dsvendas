import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Nav } from 'react-bootstrap';
import {
  FaHome,
  FaFileInvoiceDollar,
  FaBoxes,
  FaShoppingCart,
  FaClipboardList,
  FaCog,
  FaSignOutAlt,
  FaUser
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import './styles.css';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getUserInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <h2>DS Vendas</h2>
      </div>

      {/* Informações do Usuário */}
      <div className="sidebar-user">
        <div className="sidebar-user-avatar">
          {getUserInitials(user?.nome)}
        </div>
        <div className="sidebar-user-details">
          <div className="sidebar-user-name">{user?.nome || 'Usuário'}</div>
          <div className="sidebar-user-role">{user?.role || 'usuário'}</div>
        </div>
      </div>
      
      <Nav className="flex-column">
        <Nav.Item>
          <Nav.Link
            as={Link}
            to="/dashboard"
            className={`sidebar-link ${location.pathname === '/dashboard' || location.pathname === '/' ? 'active' : ''}`}
          >
            <div className="sidebar-icon">
              <FaHome />
            </div>
            <span>Dashboard</span>
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            as={Link}
            to="/orcamentos"
            className={`sidebar-link ${location.pathname.includes('/orcamentos') ? 'active' : ''}`}
          >
            <div className="sidebar-icon">
              <FaFileInvoiceDollar />
            </div>
            <span>Orçamentos</span>
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            as={Link}
            to="/produtos"
            className={`sidebar-link ${location.pathname.includes('/produtos') ? 'active' : ''}`}
          >
            <div className="sidebar-icon">
              <FaBoxes />
            </div>
            <span>Produtos</span>
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            as={Link}
            to="/pedidos-workflow"
            className={`sidebar-link ${location.pathname.includes('/pedidos-workflow') || location.pathname.includes('/pedidos/workflow/') ? 'active' : ''}`}
          >
            <div className="sidebar-icon">
              <FaShoppingCart />
            </div>
            <span>Pedidos</span>
          </Nav.Link>
        </Nav.Item>
        {user?.role === 'admin' && (
          <Nav.Item>
            <Nav.Link
              as={Link}
              to="/configuracoes"
              className={`sidebar-link ${location.pathname.includes('/configuracoes') ? 'active' : ''}`}
            >
              <div className="sidebar-icon">
                <FaCog />
              </div>
              <span>Configurações</span>
            </Nav.Link>
          </Nav.Item>
        )}
      </Nav>

      {/* Botão de Logout */}
      <button 
        className="sidebar-logout"
        onClick={handleLogout}
      >
        <div className="sidebar-icon">
          <FaSignOutAlt />
        </div>
        <span>Sair</span>
      </button>
    </div>
  );
};

export default Sidebar; 