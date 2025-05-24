import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaFileInvoice, 
  FaClipboardList, 
  FaAngleRight,
  FaCog,
  FaSync,
  FaLink,
  FaUserCircle,
  FaTachometerAlt,
  FaSignOutAlt
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = ({ collapsed, isMobile, mobileOpen }) => {
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

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') {
      return true;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const menuItems = [
    { path: '/', icon: <FaTachometerAlt />, label: 'Dashboard' },
    { path: '/orcamentos', icon: <FaFileInvoice />, label: 'Orçamentos' },
    { path: '/pedidos-workflow', icon: <FaClipboardList />, label: 'Status de Pedidos' },
  ];

  const configItems = [
    {
      path: '/configuracoes',
      icon: <FaCog />,
      label: 'Configurações',
      admin: true
    },
    {
      path: '/sync',
      icon: <FaSync />,
      label: 'Sincronização',
      admin: true
    },
    { 
      path: '/configuracoes/usuario-vendedor', 
      icon: <FaLink />, 
      label: 'Vínculo Usuário',
      admin: true
    },
    {
      path: '/configuracoes/token-vendedor',
      icon: <FaLink />,
      label: 'Tokens de Vendedor',
      admin: true
    },
    {
      path: '/configuracoes/vincular-vendedor',
      icon: <FaUserCircle />,
      label: 'Vincular Vendedor',
      admin: false
    }
  ];

  return (
    <aside 
      className={`modern-sidebar ${collapsed ? 'collapsed' : ''} ${isMobile ? 'mobile' : ''} ${mobileOpen ? 'open' : ''}`}
    >
      <div className="sidebar-inner">
        {/* Informações do Usuário */}
        {(!collapsed || (isMobile && mobileOpen)) && (
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar">
              {getUserInitials(user?.nome)}
            </div>
            <div className="sidebar-user-details">
              <div className="sidebar-user-name">{user?.nome || 'Usuário'}</div>
              <div className="sidebar-user-role">{user?.role || 'usuário'}</div>
            </div>
          </div>
        )}

        {/* Menu Principal */}
        {menuItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`sidebar-item ${active ? 'active' : ''}`}
            >
              <div className="sidebar-icon">
                {item.icon}
              </div>
              {(!collapsed || (isMobile && mobileOpen)) && (
                <span className="sidebar-label">{item.label}</span>
              )}
              {(!collapsed || (isMobile && mobileOpen)) && active && (
                <FaAngleRight className="active-indicator" />
              )}
            </Link>
          );
        })}

        {/* Separador */}
        {(!collapsed || (isMobile && mobileOpen)) && (
          <div className="sidebar-separator">Configurações</div>
        )}

        {/* Menu de Configurações */}
        {configItems.map((item) => {
          // Mostrar item apenas se não for restrito a admin ou se o usuário for admin
          if (!item.admin || user?.role === 'admin') {
            const active = isActive(item.path);
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`sidebar-item ${active ? 'active' : ''}`}
              >
                <div className="sidebar-icon">
                  {item.icon}
                </div>
                {(!collapsed || (isMobile && mobileOpen)) && (
                  <span className="sidebar-label">{item.label}</span>
                )}
                {(!collapsed || (isMobile && mobileOpen)) && active && (
                  <FaAngleRight className="active-indicator" />
                )}
              </Link>
            );
          }
          return null;
        })}

        {/* Botão de Logout */}
        <button
          onClick={handleLogout}
          className="logout-button"
        >
          <div className="sidebar-icon">
            <FaSignOutAlt />
          </div>
          {(!collapsed || (isMobile && mobileOpen)) && (
            <span className="sidebar-label">Sair</span>
          )}
        </button>
      </div>

      {/* Footer com versão */}
      {(!collapsed || (isMobile && mobileOpen)) && (
        <div className="sidebar-footer">
          <div className="app-version">v1.2.0</div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar; 