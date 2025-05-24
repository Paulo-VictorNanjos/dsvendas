import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Divider,
  Stack
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { 
  CheckCircle as CheckCircleIcon,
  Store as StoreIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { vendedorTokenAPI, usuarioVendedorAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const VincularVendedor = () => {
  const { user, refreshUserInfo } = useAuth();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [vinculoExistente, setVinculoExistente] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tokenInfo, setTokenInfo] = useState(null);
  const [validating, setValidating] = useState(false);
  const [tokenValidated, setTokenValidated] = useState(false);

  // Verificar se o usuário já está vinculado a um vendedor
  useEffect(() => {
    const verificarVinculo = async () => {
      try {
        const response = await usuarioVendedorAPI.obterVinculoUsuario();
        if (response?.data?.data) {
          setVinculoExistente(response.data.data);
        }
      } catch (error) {
        console.error('Erro ao verificar vínculo:', error);
      }
    };

    verificarVinculo();
  }, []);

  // Validar token ao digitar
  useEffect(() => {
    // Limpar validação ao modificar o token
    if (token && token.length > 5) {
      const delayDebounce = setTimeout(() => {
        validarToken();
      }, 800);

      return () => clearTimeout(delayDebounce);
    } else {
      setTokenInfo(null);
      setTokenValidated(false);
    }
  }, [token]);

  // Validar token
  const validarToken = async () => {
    if (!token) return;
    
    setValidating(true);
    setError('');
    setTokenInfo(null);
    
    try {
      const response = await vendedorTokenAPI.validar(token);
      if (response?.data?.success) {
        setTokenInfo(response.data.data);
        setTokenValidated(true);
      } else {
        setTokenInfo(null);
        setTokenValidated(false);
        setError(response?.data?.message || 'Token inválido');
      }
    } catch (error) {
      console.error('Erro ao validar token:', error);
      setTokenInfo(null);
      setTokenValidated(false);
      setError('Token inválido ou expirado. Verifique se digitou corretamente.');
    } finally {
      setValidating(false);
    }
  };

  // Usar token para vinculação
  const usarToken = async () => {
    if (!token) {
      setError('Digite um token válido');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await vendedorTokenAPI.usar(token);
      if (response?.data?.success) {
        setSuccess('Vinculação realizada com sucesso!');
        setVinculoExistente(response.data.data.vendedor);
        
        // Atualizar informações do usuário no contexto de autenticação
        if (refreshUserInfo) {
          await refreshUserInfo();
        }
      } else {
        setError(response?.data?.message || 'Erro ao vincular com o vendedor');
      }
    } catch (error) {
      console.error('Erro ao usar token:', error);
      setError('Erro ao vincular com o vendedor. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Se o usuário já está vinculado a um vendedor, exibir as informações
  if (vinculoExistente) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Vinculação de Vendedor
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Aqui você pode visualizar as informações do vendedor vinculado ao seu usuário.
        </Typography>

        <Card sx={{ maxWidth: 600, mx: 'auto', mb: 3, borderColor: 'success.light', borderWidth: 1, borderStyle: 'solid' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CheckCircleIcon sx={{ color: 'success.main', fontSize: 40, mr: 2 }} />
              <Typography variant="h5" color="success.main">
                Você já está vinculado a um vendedor
              </Typography>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1" gutterBottom>
                  Código do Vendedor
                </Typography>
                <Typography variant="body1">
                  {vinculoExistente.codigo}
                </Typography>
              </Grid>
              <Grid item xs={12} md={8}>
                <Typography variant="subtitle1" gutterBottom>
                  Nome do Vendedor
                </Typography>
                <Typography variant="body1">
                  {vinculoExistente.nome}
                </Typography>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Seu usuário está vinculado a este vendedor. Para alterar esta vinculação, entre em contato com o administrador do sistema.
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ textAlign: 'center' }}>
          <Button 
            component={RouterLink} 
            to="/home" 
            variant="contained" 
            color="primary"
          >
            Voltar para a Página Inicial
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Vincular a um Vendedor
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Insira o token fornecido pelo administrador para vincular seu usuário a um vendedor.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Token de Vinculação"
            value={token}
            onChange={(e) => setToken(e.target.value.toUpperCase())}
            placeholder="Digite o token fornecido pelo administrador"
            variant="outlined"
            autoFocus
            inputProps={{ 
              style: { 
                fontFamily: 'monospace', 
                letterSpacing: '2px', 
                textTransform: 'uppercase' 
              } 
            }}
            disabled={loading}
            error={!!error}
            helperText={validating ? 'Validando token...' : (error || '')}
            InputProps={{
              endAdornment: validating ? <CircularProgress size={20} /> : null,
            }}
          />
        </Box>

        {tokenInfo && tokenValidated && (
          <Card variant="outlined" sx={{ mb: 3, bgcolor: 'rgba(0, 200, 83, 0.1)' }}>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                Token Válido!
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <StoreIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="body1">
                    <strong>Vendedor:</strong> {tokenInfo.vendedor.nome} ({tokenInfo.vendedor.codigo})
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Ao confirmar, seu usuário será vinculado a este vendedor e você terá acesso aos recursos exclusivos.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Button
            variant="outlined"
            component={RouterLink}
            to="/home"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={usarToken}
            disabled={loading || !tokenValidated}
            startIcon={loading && <CircularProgress size={20} color="inherit" />}
          >
            {loading ? 'Vinculando...' : 'Vincular ao Vendedor'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default VincularVendedor; 