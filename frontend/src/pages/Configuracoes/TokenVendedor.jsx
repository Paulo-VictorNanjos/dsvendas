import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  ContentCopy as ContentCopyIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { vendedorTokenAPI, vendedoresAPI } from '../../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TokenVendedor = () => {
  const [tokens, setTokens] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendedorSelecionado, setVendedorSelecionado] = useState('');
  const [diasValidade, setDiasValidade] = useState(30);
  const [descricao, setDescricao] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [tokenGerado, setTokenGerado] = useState(null);
  const [copied, setCopied] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      try {
        // Carregar tokens
        const responseTokens = await vendedorTokenAPI.listar();
        if (responseTokens?.data?.data) {
          setTokens(responseTokens.data.data);
        }

        // Carregar vendedores
        const responseVendedores = await vendedoresAPI.listar();
        if (responseVendedores?.data) {
          setVendedores(responseVendedores.data);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError('Erro ao carregar dados. Por favor, tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  // Gerar um novo token
  const handleGerarToken = async () => {
    if (!vendedorSelecionado) {
      setError('Selecione um vendedor para gerar o token');
      return;
    }

    setLoadingAction(true);
    setError('');
    setSuccess('');

    try {
      const response = await vendedorTokenAPI.gerar(
        vendedorSelecionado,
        diasValidade,
        descricao
      );

      if (response?.data?.success) {
        setSuccess('Token gerado com sucesso!');
        setTokenGerado(response.data.data);
        
        // Adicionar o novo token à lista
        setTokens(prevTokens => [response.data.data, ...prevTokens]);
        
        // Limpar campos do formulário
        setVendedorSelecionado('');
        setDiasValidade(30);
        setDescricao('');
      } else {
        setError(response?.data?.message || 'Erro ao gerar token');
      }
    } catch (error) {
      console.error('Erro ao gerar token:', error);
      setError('Erro ao gerar token. Por favor, tente novamente.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Desativar um token
  const handleDesativarToken = async (id) => {
    setLoadingAction(true);
    setError('');
    setSuccess('');

    try {
      const response = await vendedorTokenAPI.desativar(id);

      if (response?.data?.success) {
        setSuccess('Token desativado com sucesso!');
        
        // Atualizar o status do token na lista
        setTokens(prevTokens =>
          prevTokens.map(token =>
            token.id === id ? { ...token, ativo: false, status: 'INATIVO' } : token
          )
        );
      } else {
        setError(response?.data?.message || 'Erro ao desativar token');
      }
    } catch (error) {
      console.error('Erro ao desativar token:', error);
      setError('Erro ao desativar token. Por favor, tente novamente.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Copiar token para a área de transferência
  const handleCopyToken = (token) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(token);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback para navegadores que não suportam clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = token;
        
        // Evita scrolling para o elemento
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          console.error('Falha ao copiar texto');
          setError('Não foi possível copiar o token. Por favor, selecione e copie manualmente.');
        }
        
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('Erro ao copiar para área de transferência:', err);
      setError('Não foi possível copiar o token. Por favor, selecione e copie manualmente.');
    }
  };

  // Formatar data
  const formatarData = (data) => {
    if (!data) return 'N/A';
    return format(new Date(data), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  // Obter cor do status
  const getStatusColor = (status) => {
    switch (status) {
      case 'ATIVO':
        return 'success';
      case 'UTILIZADO':
        return 'info';
      case 'INATIVO':
        return 'error';
      case 'EXPIRADO':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="600">
          Tokens de Vinculação de Vendedor
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Gere tokens para permitir que vendedores se registrem e sejam automaticamente vinculados ao seu perfil.
        </Typography>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3, borderRadius: 2 }} 
          onClose={() => setError('')}
          variant="filled"
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 3, borderRadius: 2 }} 
          onClose={() => setSuccess('')}
          variant="filled"
        >
          {success}
        </Alert>
      )}

      {/* Token recém-gerado */}
      {tokenGerado && (
        <Card variant="outlined" sx={{ 
          mb: 4, 
          background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)', 
          position: 'relative',
          borderRadius: 2,
          boxShadow: '0 4px 20px rgba(76, 175, 80, 0.3)'
        }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" component="div" gutterBottom color="white" fontWeight="600">
              Token Gerado com Sucesso!
            </Typography>
            <Divider sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.3)' }} />
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={6}>
                <Typography variant="body2" sx={{ mb: 1, color: 'white' }}>
                  <strong>Vendedor:</strong> {tokenGerado.vendedor.nome} ({tokenGerado.vendedor.codigo})
                </Typography>
                <Typography variant="body2" sx={{ mb: 1, color: 'white' }}>
                  <strong>Validade:</strong> {formatarData(tokenGerado.expiracao)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <Typography variant="h5" component="div" sx={{ 
                    bgcolor: 'white', 
                    p: 2, 
                    borderRadius: 1,
                    letterSpacing: 2,
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    color: '#2E7D32',
                    textAlign: 'center',
                    width: '100%',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                  }}>
                    {tokenGerado.token}
                  </Typography>
                  <Tooltip title={copied ? "Copiado!" : "Copiar Token"}>
                    <IconButton 
                      color="inherit" 
                      onClick={() => handleCopyToken(tokenGerado.token)}
                      sx={{ 
                        ml: 1, 
                        bgcolor: 'white', 
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.8)' },
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    >
                      {copied ? <CheckCircleIcon color="success" /> : <ContentCopyIcon />}
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'white' }}>
                  Compartilhe este token com o vendedor para que ele possa se vincular ao sistema.
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Formulário de geração de token */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
        <Typography variant="h6" gutterBottom fontWeight="600">
          Gerar Novo Token
        </Typography>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="vendedor-label">Vendedor</InputLabel>
              <Select
                labelId="vendedor-label"
                id="vendedor-select"
                value={vendedorSelecionado}
                label="Vendedor"
                onChange={(e) => setVendedorSelecionado(e.target.value)}
                disabled={loadingAction}
              >
                <MenuItem value="">
                  <em>Selecione um vendedor</em>
                </MenuItem>
                {vendedores.map((vendedor) => (
                  <MenuItem key={vendedor.codigo} value={vendedor.codigo}>
                    {vendedor.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Dias de Validade"
              type="number"
              value={diasValidade}
              onChange={(e) => setDiasValidade(parseInt(e.target.value))}
              inputProps={{ min: 1, max: 365 }}
              disabled={loadingAction}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Descrição (opcional)"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Finalidade do token..."
              disabled={loadingAction}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={loadingAction ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
              onClick={handleGerarToken}
              disabled={loadingAction || !vendedorSelecionado}
              sx={{ 
                height: '56px',
                textTransform: 'none',
                fontWeight: 'medium',
                fontSize: '1rem'
              }}
            >
              Gerar Token
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Lista de tokens */}
      <Paper sx={{ width: '100%', borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderBottom: '1px solid rgba(0,0,0,0.12)',
          bgcolor: 'background.paper'
        }}>
          <Typography variant="h6" fontWeight="600">
            Tokens Gerados
          </Typography>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={() => window.location.reload()}
            sx={{ textTransform: 'none' }}
          >
            Atualizar
          </Button>
        </Box>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : tokens.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Nenhum token encontrado.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Token</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Vendedor</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Validade</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Criado em</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Usado em</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tokens.map((token) => (
                  <TableRow 
                    key={token.id} 
                    hover
                    sx={{ '&:nth-of-type(odd)': { bgcolor: 'rgba(0,0,0,0.02)' } }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace', 
                            fontWeight: 'bold',
                            bgcolor: 'rgba(0,0,0,0.05)',
                            p: 0.8,
                            borderRadius: 1,
                            letterSpacing: 1
                          }}
                        >
                          {token.token}
                        </Typography>
                        {token.status === 'ATIVO' && (
                          <Tooltip title="Copiar Token">
                            <IconButton 
                              size="small" 
                              onClick={() => handleCopyToken(token.token)}
                              color="primary"
                              sx={{ ml: 1 }}
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {token.vendedor.nome}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={token.status} 
                        size="small"
                        color={getStatusColor(token.status)}
                        sx={{ fontWeight: 'medium' }}
                      />
                    </TableCell>
                    <TableCell>{formatarData(token.expiracao)}</TableCell>
                    <TableCell>{formatarData(token.criado_em)}</TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        color={token.usado_em ? 'text.primary' : 'text.secondary'}
                        fontStyle={token.usado_em ? 'normal' : 'italic'}
                      >
                        {token.usado_em ? formatarData(token.usado_em) : 'Não utilizado'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {token.status === 'ATIVO' && (
                        <Tooltip title="Desativar Token">
                          <IconButton 
                            color="error" 
                            size="small"
                            onClick={() => handleDesativarToken(token.id)}
                            disabled={loadingAction}
                          >
                            <BlockIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default TokenVendedor; 