import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './SidebarLayout.css';

const SidebarLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // Impedir rolagem do body quando menu mobile estiver aberto
    if (isMobile && mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      if (!mobile && mobileOpen) {
        setMobileOpen(false);
      }
      
      // Em telas maiores, restaurar rolagem
      if (!mobile) {
        document.body.style.overflow = 'auto';
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.body.style.overflow = 'auto';
    };
  }, [mobileOpen, isMobile]);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  return (
    <div className="layout-wrapper">
      {/* Overlay para fechar o menu mobile */}
      {isMobile && mobileOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      <Navbar toggleSidebar={toggleSidebar} />

      <div className="content-wrapper">
        <Sidebar 
          collapsed={collapsed}
          isMobile={isMobile}
          mobileOpen={mobileOpen}
        />
        
        <main className={`main-content ${collapsed ? 'expanded' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default SidebarLayout; 