import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../../services/authService';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  SupervisorAccount as AdminIcon,
  PersonOutline as UserIcon
} from '@mui/icons-material';
import { FaUserCircle, FaTimes } from 'react-icons/fa';

import { usuarioVendedorAPI } from '../../services/api';
import { usuariosAPI } from '../../services/api';
import { vendedoresAPI } from '../../services/api';

const UsuarioVendedor = () => {
  const navigate = useNavigate();
  const usuarioLogado = getUser();
  const [vinculos, setVinculos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [carregandoVinculos, setCarregandoVinculos] = useState(true);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(true);
  const [carregandoVendedores, setCarregandoVendedores] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
  const [vendedorSelecionado, setVendedorSelecionado] = useState('');
  const [notificacao, setNotificacao] = useState({
    aberta: false,
    mensagem: '',
    tipo: 'info'
  });

  // Verificar se o usuário atual é administrador
  useEffect(() => {
    if (!usuarioLogado || usuarioLogado.role !== 'admin') {
      navigate('/');
    }
  }, [usuarioLogado, navigate]);

  // Buscar todos os vínculos existentes
  const carregarVinculos = async () => {
    setCarregandoVinculos(true);
    try {
      const response = await usuarioVendedorAPI.listarVinculos();
      if (response && response.data) {
        setVinculos(response.data.data || response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar vínculos:', error);
      setNotificacao({
        aberta: true,
        mensagem: 'Erro ao carregar vínculos: ' + (error.response?.data?.message || error.message),
        tipo: 'error'
      });
    } finally {
      setCarregandoVinculos(false);
    }
  };

  // Buscar todos os usuários
  const carregarUsuarios = async () => {
    setCarregandoUsuarios(true);
    try {
      const response = await usuariosAPI.listar();
      if (response && response.data) {
        setUsuarios(response.data.data || response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setNotificacao({
        aberta: true,
        mensagem: 'Erro ao carregar usuários: ' + (error.response?.data?.message || error.message),
        tipo: 'error'
      });
    } finally {
      setCarregandoUsuarios(false);
    }
  };

  // Buscar todos os vendedores
  const carregarVendedores = async () => {
    setCarregandoVendedores(true);
    try {
      const response = await vendedoresAPI.listar();
      if (response && response.data) {
        setVendedores(response.data.data || response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
      setNotificacao({
        aberta: true,
        mensagem: 'Erro ao carregar vendedores: ' + (error.response?.data?.message || error.message),
        tipo: 'error'
      });
    } finally {
      setCarregandoVendedores(false);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    carregarVinculos();
    carregarUsuarios();
    carregarVendedores();
  }, []);

  // Abrir dialog para criar novo vínculo
  const abrirDialogNovoVinculo = () => {
    setUsuarioSelecionado('');
    setVendedorSelecionado('');
    setDialogAberto(true);
  };

  // Fechar dialog
  const fecharDialog = () => {
    setDialogAberto(false);
  };

  // Criar novo vínculo
  const criarVinculo = async () => {
    if (!usuarioSelecionado || !vendedorSelecionado) {
      setNotificacao({
        aberta: true,
        mensagem: 'Selecione um usuário e um vendedor.',
        tipo: 'warning'
      });
      return;
    }

    try {
      await usuarioVendedorAPI.criarVinculo(usuarioSelecionado, vendedorSelecionado);
      setNotificacao({
        aberta: true,
        mensagem: 'Vínculo criado com sucesso!',
        tipo: 'success'
      });
      fecharDialog();
      carregarVinculos();
    } catch (error) {
      console.error('Erro ao criar vínculo:', error);
      setNotificacao({
        aberta: true,
        mensagem: 'Erro ao criar vínculo: ' + (error.response?.data?.message || error.message),
        tipo: 'error'
      });
    }
  };

  // Remover vínculo
  const removerVinculo = async (usuarioId, vendedorCodigo) => {
    if (!window.confirm('Tem certeza que deseja remover este vínculo?')) {
      return;
    }

    try {
      await usuarioVendedorAPI.removerVinculo(usuarioId, vendedorCodigo);
      setNotificacao({
        aberta: true,
        mensagem: 'Vínculo removido com sucesso!',
        tipo: 'success'
      });
      carregarVinculos();
    } catch (error) {
      console.error('Erro ao remover vínculo:', error);
      setNotificacao({
        aberta: true,
        mensagem: 'Erro ao remover vínculo: ' + (error.response?.data?.message || error.message),
        tipo: 'error'
      });
    }
  };

  // Fechar notificação
  const fecharNotificacao = () => {
    setNotificacao({
      ...notificacao,
      aberta: false
    });
  };

  // Obter nome do usuário pelo ID
  const obterNomeUsuario = (usuarioId) => {
    const usuario = usuarios.find(u => u.id === usuarioId);
    return usuario ? usuario.nome : 'Usuário não encontrado';
  };

  // Obter nome do vendedor pelo código
  const obterNomeVendedor = (vendedorCodigo) => {
    const vendedor = vendedores.find(v => v.codigo === vendedorCodigo);
    return vendedor ? vendedor.nome : 'Vendedor não encontrado';
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ mb: 4 }}>
          {/* Cabeçalho com título e descrição */}
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 2,
              mb: 1
            }}
          >
            <Box>
              <Typography 
                variant="h5" 
                component="h1" 
                sx={{ 
                  color: 'primary.main',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 1
                }}
              >
                <LinkIcon sx={{ fontSize: 28 }} />
                Vínculo Usuário-Vendedor
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 600 }}>
                Gerencie os vínculos entre usuários do sistema e vendedores. Cada usuário pode estar vinculado 
                a um vendedor, permitindo acesso aos dados e orçamentos específicos deste vendedor.
              </Typography>
            </Box>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={abrirDialogNovoVinculo}
              sx={{ 
                borderRadius: 2,
                px: 2.5,
                py: 1,
                boxShadow: 2,
                '&:hover': {
                  boxShadow: 4
                }
              }}
            >
              Novo Vínculo
            </Button>
          </Box>
          
          {/* Estatísticas resumidas */}
          <Box 
            sx={{ 
              display: 'flex', 
              mt: 3, 
              mb: 2,
              gap: 2,
              flexWrap: 'wrap'
            }}
          >
            <Paper 
              variant="outlined" 
              sx={{ 
                px: 2, 
                py: 1.5, 
                display: 'flex', 
                alignItems: 'center', 
                borderRadius: 2,
                minWidth: 200,
                borderColor: 'primary.lighter',
                borderWidth: 1
              }}
            >
              <Box sx={{ mr: 2, color: 'primary.main' }}>
                <UserIcon sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Usuários
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  {carregandoUsuarios ? (
                    <CircularProgress size={16} thickness={6} sx={{ mr: 1 }} />
                  ) : (
                    usuarios.length
                  )}
                </Typography>
              </Box>
            </Paper>
            
            <Paper 
              variant="outlined" 
              sx={{ 
                px: 2, 
                py: 1.5, 
                display: 'flex', 
                alignItems: 'center', 
                borderRadius: 2,
                minWidth: 200,
                borderColor: 'info.lighter',
                borderWidth: 1
              }}
            >
              <Box sx={{ mr: 2, color: 'info.main' }}>
                <FaUserCircle size={18} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Vendedores
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  {carregandoVendedores ? (
                    <CircularProgress size={16} thickness={6} sx={{ mr: 1 }} />
                  ) : (
                    vendedores.length
                  )}
                </Typography>
              </Box>
            </Paper>
            
            <Paper 
              variant="outlined" 
              sx={{ 
                px: 2, 
                py: 1.5, 
                display: 'flex', 
                alignItems: 'center', 
                borderRadius: 2,
                minWidth: 200,
                borderColor: 'success.lighter',
                borderWidth: 1
              }}
            >
              <Box sx={{ mr: 2, color: 'success.main' }}>
                <LinkIcon sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Vínculos Ativos
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  {carregandoVinculos ? (
                    <CircularProgress size={16} thickness={6} sx={{ mr: 1 }} />
                  ) : (
                    vinculos.length
                  )}
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Box>

        {carregandoVinculos ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : vinculos.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 5,
              px: 3,
              bgcolor: 'background.paper',
              borderRadius: 2,
              textAlign: 'center'
            }}
          >
            <LinkIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2, opacity: 0.3 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhum vínculo encontrado
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
              Não existem vínculos entre usuários e vendedores. Clique no botão "Novo Vínculo" para criar uma associação.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={abrirDialogNovoVinculo}
            >
              Novo Vínculo
            </Button>
          </Box>
        ) : (
          <Paper 
            variant="outlined" 
            sx={{ 
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: 'none'
            }}
          >
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.50' }}>
                    <TableCell 
                      sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        color: 'text.primary',
                        borderBottom: '2px solid',
                        borderColor: 'grey.200',
                        py: 2
                      }}
                    >
                      Usuário
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        color: 'text.primary',
                        borderBottom: '2px solid',
                        borderColor: 'grey.200',
                        py: 2
                      }}
                    >
                      Email
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        color: 'text.primary',
                        borderBottom: '2px solid',
                        borderColor: 'grey.200',
                        py: 2
                      }}
                    >
                      Tipo
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        color: 'text.primary',
                        borderBottom: '2px solid',
                        borderColor: 'grey.200',
                        py: 2
                      }}
                    >
                      Vendedor
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        color: 'text.primary',
                        borderBottom: '2px solid',
                        borderColor: 'grey.200',
                        py: 2
                      }}
                    >
                      Código
                    </TableCell>
                    <TableCell 
                      width="100"
                      align="center"
                      sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        color: 'text.primary',
                        borderBottom: '2px solid',
                        borderColor: 'grey.200',
                        py: 2
                      }}
                    >
                      Ações
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vinculos.map((vinculo, index) => (
                    <TableRow 
                      key={`${vinculo.usuario_id}-${vinculo.vendedor_codigo}`}
                      sx={{ 
                        backgroundColor: index % 2 === 0 ? 'white' : 'grey.50',
                        '&:hover': {
                          backgroundColor: 'primary.lighter',
                        },
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <TableCell 
                        sx={{ 
                          py: 1.8,
                          borderBottom: '1px solid',
                          borderColor: 'grey.100'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {usuarios.find(u => u.id === vinculo.usuario_id)?.role === 'admin' ? (
                            <AdminIcon fontSize="small" color="primary" />
                          ) : (
                            <UserIcon fontSize="small" color="action" />
                          )}
                          <Typography variant="body2" fontWeight={500}>
                            {obterNomeUsuario(vinculo.usuario_id)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell
                        sx={{ 
                          py: 1.8,
                          color: 'text.secondary',
                          borderBottom: '1px solid',
                          borderColor: 'grey.100'
                        }}
                      >
                        {usuarios.find(u => u.id === vinculo.usuario_id)?.email || 'N/A'}
                      </TableCell>
                      <TableCell
                        sx={{ 
                          py: 1.8,
                          borderBottom: '1px solid',
                          borderColor: 'grey.100'
                        }}
                      >
                        {usuarios.find(u => u.id === vinculo.usuario_id)?.role === 'admin' ? (
                          <Chip
                            icon={<AdminIcon fontSize="small" />}
                            label="Admin"
                            color="primary"
                            size="small"
                            sx={{ 
                              fontWeight: 500,
                              bgcolor: 'primary.lighter',
                              color: 'primary.dark',
                              '& .MuiChip-icon': { color: 'primary.main' }
                            }}
                          />
                        ) : (
                          <Chip
                            icon={<UserIcon fontSize="small" />}
                            label="Usuário"
                            size="small"
                            variant="outlined"
                            sx={{ 
                              fontWeight: 500,
                              '& .MuiChip-icon': { color: 'text.secondary' }
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell
                        sx={{ 
                          py: 1.8,
                          fontWeight: 500,
                          borderBottom: '1px solid',
                          borderColor: 'grey.100'
                        }}
                      >
                        {obterNomeVendedor(vinculo.vendedor_codigo)}
                      </TableCell>
                      <TableCell
                        sx={{ 
                          py: 1.8,
                          borderBottom: '1px solid',
                          borderColor: 'grey.100'
                        }}
                      >
                        <Chip
                          label={vinculo.vendedor_codigo}
                          color="info"
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600, minWidth: 40 }}
                        />
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ 
                          py: 1.8,
                          borderBottom: '1px solid',
                          borderColor: 'grey.100'
                        }}
                      >
                        <Tooltip title="Remover vínculo">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removerVinculo(vinculo.usuario_id, vinculo.vendedor_codigo)}
                            sx={{ 
                              backgroundColor: 'error.lighter',
                              '&:hover': {
                                backgroundColor: 'error.light',
                              },
                              transition: 'background-color 0.2s'
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Paper>

      {/* Dialog para criar novo vínculo */}
      <Dialog 
        open={dialogAberto} 
        onClose={fecharDialog} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 3,
          pb: 1,
          fontSize: '1.2rem',
          color: 'primary.main',
          fontWeight: 600
        }}>
          <LinkIcon color="primary" />
          Novo Vínculo Usuário-Vendedor
        </DialogTitle>
        
        <DialogContent sx={{ p: 3, pb: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Vincule um usuário do sistema a um vendedor para permitir acesso aos dados relacionados.
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl 
                fullWidth 
                variant="outlined"
                error={carregandoUsuarios ? false : usuarios.length === 0}
              >
                <InputLabel id="usuario-select-label">Usuário</InputLabel>
                <Select
                  labelId="usuario-select-label"
                  value={usuarioSelecionado}
                  onChange={(e) => setUsuarioSelecionado(e.target.value)}
                  label="Usuário"
                  disabled={carregandoUsuarios}
                  startAdornment={
                    <Box component="span" sx={{ mr: 1, display: 'flex', color: 'action.active' }}>
                      <UserIcon fontSize="small" />
                    </Box>
                  }
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(0, 0, 0, 0.15)'
                    }
                  }}
                >
                  {carregandoUsuarios ? (
                    <MenuItem disabled value="">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={20} thickness={5} />
                        <span>Carregando usuários...</span>
                      </Box>
                    </MenuItem>
                  ) : usuarios.length === 0 ? (
                    <MenuItem disabled value="">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
                        <span>Nenhum usuário disponível</span>
                      </Box>
                    </MenuItem>
                  ) : (
                    <>
                      <MenuItem disabled value="">
                        <em>Selecione um usuário</em>
                      </MenuItem>
                      {usuarios.map((usuario) => (
                        <MenuItem key={usuario.id} value={usuario.id}>
                          <Grid container alignItems="center" spacing={1}>
                            <Grid item>
                              {usuario.role === 'admin' ? (
                                <AdminIcon fontSize="small" color="primary" />
                              ) : (
                                <UserIcon fontSize="small" color="action" />
                              )}
                            </Grid>
                            <Grid item xs>
                              <Box>
                                <Typography variant="body2" component="span" fontWeight={500}>{usuario.nome}</Typography>
                                <Typography variant="body2" component="span" color="text.secondary"> ({usuario.email})</Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {usuario.role === 'admin' ? 'Administrador' : 'Usuário regular'}
                              </Typography>
                            </Grid>
                          </Grid>
                        </MenuItem>
                      ))}
                    </>
                  )}
                </Select>
                {usuarios.length === 0 && !carregandoUsuarios && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    Não há usuários cadastrados no sistema
                  </Typography>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl 
                fullWidth 
                variant="outlined"
                error={carregandoVendedores ? false : vendedores.length === 0}
              >
                <InputLabel id="vendedor-select-label">Vendedor</InputLabel>
                <Select
                  labelId="vendedor-select-label"
                  value={vendedorSelecionado}
                  onChange={(e) => setVendedorSelecionado(e.target.value)}
                  label="Vendedor"
                  disabled={carregandoVendedores}
                  startAdornment={
                    <Box component="span" sx={{ mr: 1, display: 'flex', color: 'action.active' }}>
                      <FaUserCircle size={16} />
                    </Box>
                  }
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(0, 0, 0, 0.15)'
                    }
                  }}
                >
                  {carregandoVendedores ? (
                    <MenuItem disabled value="">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={20} thickness={5} />
                        <span>Carregando vendedores...</span>
                      </Box>
                    </MenuItem>
                  ) : vendedores.length === 0 ? (
                    <MenuItem disabled value="">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
                        <span>Nenhum vendedor disponível</span>
                      </Box>
                    </MenuItem>
                  ) : (
                    <>
                      <MenuItem disabled value="">
                        <em>Selecione um vendedor</em>
                      </MenuItem>
                      {vendedores.map((vendedor) => (
                        <MenuItem key={vendedor.codigo} value={vendedor.codigo}>
                          <Grid container spacing={1} alignItems="center">
                            <Grid item>
                              <Chip 
                                size="small" 
                                label={vendedor.codigo} 
                                color="info" 
                                variant="outlined" 
                                sx={{ minWidth: 40, fontWeight: 'bold' }}
                              />
                            </Grid>
                            <Grid item xs>
                              <Typography variant="body2" fontWeight={500}>{vendedor.nome}</Typography>
                            </Grid>
                          </Grid>
                        </MenuItem>
                      ))}
                    </>
                  )}
                </Select>
                {vendedores.length === 0 && !carregandoVendedores && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    Não há vendedores cadastrados no sistema
                  </Typography>
                )}
              </FormControl>
            </Grid>
          </Grid>
          
          {usuarioSelecionado && vendedorSelecionado && (
            <Box 
              sx={{ 
                mt: 3, 
                p: 2, 
                backgroundColor: 'info.lighter',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'info.light',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
              }}
            >
              <LinkIcon color="info" />
              <Typography variant="body2" color="info.dark">
                <strong>Resumo do vínculo:</strong> {obterNomeUsuario(usuarioSelecionado)} será vinculado ao vendedor {obterNomeVendedor(vendedorSelecionado)} (código: {vendedorSelecionado})
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button 
            onClick={fecharDialog}
            variant="outlined"
            color="inherit"
            startIcon={<FaTimes />}
          >
            Cancelar
          </Button>
          <Button 
            onClick={criarVinculo} 
            variant="contained" 
            color="primary"
            disabled={!usuarioSelecionado || !vendedorSelecionado}
            startIcon={<LinkIcon />}
            sx={{
              borderRadius: '8px',
              px: 2,
              '&.Mui-disabled': {
                backgroundColor: 'action.disabledBackground',
                color: 'text.disabled'
              }
            }}
          >
            Criar Vínculo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notificações */}
      <Snackbar
        open={notificacao.aberta}
        autoHideDuration={6000}
        onClose={fecharNotificacao}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={fecharNotificacao} severity={notificacao.tipo} sx={{ width: '100%' }}>
          {notificacao.mensagem}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default UsuarioVendedor; 