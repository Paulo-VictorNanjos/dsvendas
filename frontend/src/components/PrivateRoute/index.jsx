import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SidebarLayout from '../layouts/SidebarLayout';

const PrivateRoute = ({ children }) => {
  const { signed } = useAuth();
  const location = useLocation();

  if (!signed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <SidebarLayout>{children}</SidebarLayout>;
};

export default PrivateRoute; 