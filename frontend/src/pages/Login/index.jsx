import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Alert,
  InputAdornment,
  IconButton,
  Link as MuiLink,
  Container
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import './styles.css';

const Login = () => {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, senha);
      
      if (!result.success) {
        setError(result.message);
        return;
      }

      const from = location.state?.from?.pathname || '/';
      navigate(from);
    } catch (err) {
      setError('Ocorreu um erro ao tentar fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-container">
      <div className="login-row">
        {/* Lado Esquerdo - Formulário */}
        <div className="login-form-container">
          <div className="login-form-content">
            <div className="brand-logo">DS</div>
            <h1 className="login-title">DSVendas</h1>
            <p className="login-subtitle">Faça login para continuar</p>
            
            {error && (
              <div className="login-error">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Seu email"
                  required
                  disabled={loading}
                  className="login-input"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Senha</label>
                <div className="password-input-container">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Sua senha"
                    required
                    disabled={loading}
                    className="login-input"
                  />
                  <button 
                    type="button" 
                    className="password-toggle"
                    onClick={handleTogglePassword}
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={loading}
                className="login-button"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
              
              <div className="login-footer">
                Não tem uma conta?{' '}
                <Link to="/register" className="login-link">
                  Registre-se
                </Link>
              </div>
            </form>
          </div>
        </div>
        
        {/* Lado Direito - Imagem */}
        <div className="login-image-container">
          <div className="login-overlay">
            <h2 className="login-welcome"></h2>
            <p className="login-message">
            
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 