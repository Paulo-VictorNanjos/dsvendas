import api from './api';

// Constantes para chaves de localStorage
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const register = async (nome, email, senha) => {
  try {
    const response = await api.post('/auth/register', { nome, email, senha });
    
    if (response.data.success) {
      const { token, usuario } = response.data;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(usuario));
      api.defaults.headers.Authorization = `Bearer ${token}`;
      return { success: true, user: usuario };
    }
    
    return { success: false, message: 'Erro ao registrar usuário' };
  } catch (error) {
    return { 
      success: false, 
      message: error.response?.data?.message || 'Erro ao registrar usuário' 
    };
  }
};

export const login = async (email, senha) => {
  try {
    const response = await api.post('/auth/login', { email, senha });
    
    if (response.data.success) {
      const { token, usuario } = response.data;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(usuario));
      api.defaults.headers.Authorization = `Bearer ${token}`;
      return { success: true, user: usuario };
    }
    
    return { success: false, message: 'Credenciais inválidas' };
  } catch (error) {
    return { 
      success: false, 
      message: error.response?.data?.message || 'Erro ao realizar login' 
    };
  }
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  delete api.defaults.headers.Authorization;
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getUser = () => {
  try {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    
    const user = JSON.parse(userStr);
    console.log('Usuário carregado do localStorage:', user);
    return user;
  } catch (error) {
    console.error('Erro ao obter usuário do localStorage:', error);
    return null;
  }
};

export const isAuthenticated = () => {
  const token = getToken();
  return !!token;
};

export const verifyToken = async () => {
  try {
    const token = getToken();
    if (!token) return false;

    const response = await api.post('/auth/verificar-token', { token });
    return response.data.success;
  } catch {
    return false;
  }
};

export const setupApiToken = () => {
  const token = getToken();
  if (token) {
    api.defaults.headers.Authorization = `Bearer ${token}`;
  }
}; 