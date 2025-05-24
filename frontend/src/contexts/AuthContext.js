import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authService from '../services/authService';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = useCallback(async () => {
    authService.logout();
    setUser(null);
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedUser = authService.getUser();
        if (savedUser) {
          const isValid = await authService.verifyToken();
          if (isValid) {
            setUser(savedUser);
            authService.setupApiToken();
          } else {
            await handleLogout();
          }
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [handleLogout]);

  const handleLogin = async (email, senha) => {
    const result = await authService.login(email, senha);
    
    if (result.success) {
      setUser(result.user);
      navigate('/');
      return { success: true };
    }
    
    return { success: false, message: result.message };
  };

  const handleRegister = async (nome, email, senha) => {
    const result = await authService.register(nome, email, senha);
    
    if (result.success) {
      setUser(result.user);
      navigate('/');
      return { success: true };
    }
    
    return { success: false, message: result.message };
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <AuthContext.Provider
      value={{
        signed: !!user,
        user,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}; 