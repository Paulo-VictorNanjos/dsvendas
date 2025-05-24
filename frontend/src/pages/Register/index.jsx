import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import './styles.css';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validações
    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem');
      return;
    }

    if (senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const result = await register(nome, email, senha);
      
      if (!result.success) {
        setError(result.message);
        return;
      }

      navigate('/');
    } catch (err) {
      setError('Ocorreu um erro ao tentar registrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div className="register-container">
      <div className="register-row">
        {/* Lado Esquerdo - Formulário */}
        <div className="register-form-container">
          <div className="register-form-content">
            <div className="brand-logo">DS</div>
            <h1 className="register-title">DSVendas</h1>
            <p className="register-subtitle">Crie sua conta</p>
            
            {error && (
              <div className="register-error">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="register-form">
              <div className="form-group">
                <label htmlFor="nome">Nome Completo</label>
                <input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  disabled={loading}
                  className="register-input"
                />
              </div>
              
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
                  className="register-input"
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
                    placeholder="Crie uma senha"
                    required
                    disabled={loading}
                    className="register-input"
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
              
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmar Senha</label>
                <div className="password-input-container">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="Confirme sua senha"
                    required
                    disabled={loading}
                    className="register-input"
                  />
                  <button 
                    type="button" 
                    className="password-toggle"
                    onClick={handleToggleConfirmPassword}
                  >
                    {showConfirmPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={loading}
                className="register-button"
              >
                {loading ? 'Registrando...' : 'Criar Conta'}
              </button>
              
              <div className="register-footer">
                Já tem uma conta?{' '}
                <Link to="/login" className="register-link">
                  Faça login
                </Link>
              </div>
            </form>
          </div>
        </div>
        
        {/* Lado Direito - Imagem */}
        <div className="register-image-container">
          <div className="register-overlay">
            <h2 className="register-welcome"></h2>
            <p className="register-message">

            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register; 