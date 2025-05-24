import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  Box,
  Divider,
  Paper,
  IconButton,
  Slide,
  Tooltip,
  Chip,
  Avatar,
  Card,
  CardContent
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Close as CloseIcon,
  MergeType as MergeIcon,
  AddCircle as AddCircleIcon,
  Inventory as InventoryIcon,
  Calculate as CalculateIcon,
  PriceCheck as PriceCheckIcon,
  CompareArrows as CompareArrowsIcon
} from '@mui/icons-material';

// Transição para o modal aparecer deslizando de cima para baixo
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="down" ref={ref} {...props} />;
});

// Estilizando botões personalizados
const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: '12px',
  padding: '10px 20px',
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
  }
}));

// Componente para exibir informações do item
const ItemCard = styled(Card)(({ theme, type }) => ({
  position: 'relative',
  borderRadius: '16px',
  transition: 'all 0.3s ease',
  backgroundColor: type === 'existing' ? 'rgba(25, 118, 210, 0.04)' : 'rgba(76, 175, 80, 0.04)',
  border: `1px solid ${type === 'existing' ? theme.palette.primary.light : theme.palette.success.light}`,
  '&:hover': {
    boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
    transform: 'translateY(-4px)'
  }
}));

// Badge para destacar o tipo de item
const ItemBadge = styled(Chip)(({ theme, type }) => ({
  position: 'absolute',
  top: '12px',
  right: '12px',
  fontWeight: 'bold',
  backgroundColor: type === 'existing' ? theme.palette.primary.main : theme.palette.success.main,
  color: '#fff',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
}));

// Componente para exibir detalhes do item
const ItemDetail = ({ label, value, icon }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
    {icon}
    <Box sx={{ ml: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body1" fontWeight="500">
        {value}
      </Typography>
    </Box>
  </Box>
);

/**
 * Modal para confirmar ação quando um item duplicado é detectado
 * @param {Object} props - Propriedades do componente
 * @param {boolean} props.show - Controla a visibilidade do modal
 * @param {Function} props.onHide - Função para fechar o modal
 * @param {Object} props.duplicateItem - Item duplicado encontrado
 * @param {Object} props.newItem - Novo item que está sendo adicionado
 * @param {Function} props.onMerge - Função para somar as quantidades
 * @param {Function} props.onAddNew - Função para adicionar como novo item
 * @returns {JSX.Element} - Componente React
 */
const DuplicateItemModal = ({ 
  show, 
  onHide, 
  duplicateItem, 
  newItem, 
  onMerge, 
  onAddNew 
}) => {
  if (!duplicateItem || !newItem) return null;

  // Função para formatar valores monetários
  const formatCurrency = (value) => {
    if (!value && value !== 0) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(value));
  };

  // Calcular a quantidade total se somar
  const quantidadeTotal = Number(duplicateItem.quantidade) + Number(newItem.quantidade);
  
  // Calcular o valor total se somar (considerando o preço do item existente)
  const valorTotal = duplicateItem.valor_unitario * quantidadeTotal;

  return (
    <Dialog
      open={show}
      onClose={onHide}
      maxWidth="md"
      fullWidth
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 12px 24px rgba(0,0,0,0.15)'
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 2,
          px: 3
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CompareArrowsIcon sx={{ mr: 1.5, fontSize: 28 }} />
          <Typography variant="h6" fontWeight="bold">
            Item Duplicado Detectado
          </Typography>
        </Box>
        <IconButton 
          onClick={onHide} 
          sx={{ 
            color: 'white',
            '&:hover': { 
              backgroundColor: 'rgba(255,255,255,0.2)'
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ py: 4, px: 3 }}>
        <Typography variant="body1" paragraph sx={{ mb: 3, fontWeight: 500, fontSize: '1.05rem' }}>
          Este produto já existe no orçamento. Como você deseja proceder?
        </Typography>
        
        <Grid container spacing={3}>
          {/* Item Existente */}
          <Grid item xs={12} md={6}>
            <ItemCard type="existing">
              <ItemBadge 
                type="existing"
                label="Existente" 
                icon={<InventoryIcon fontSize="small" />} 
              />
              <CardContent sx={{ pt: 4, pb: 3 }}>
                <Typography variant="h6" color="primary.dark" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>
                  Item no Orçamento
                </Typography>
                
                <ItemDetail 
                  label="Produto" 
                  value={duplicateItem.produto_descricao || duplicateItem.produto_codigo} 
                  icon={<InventoryIcon color="primary" />} 
                />
                
                <ItemDetail 
                  label="Quantidade" 
                  value={duplicateItem.quantidade} 
                  icon={<CalculateIcon color="primary" />} 
                />
                
                <ItemDetail 
                  label="Valor Unitário" 
                  value={formatCurrency(duplicateItem.valor_unitario)} 
                  icon={<PriceCheckIcon color="primary" />} 
                />
                
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed rgba(0,0,0,0.1)' }}>
                  <ItemDetail 
                    label="Valor Total" 
                    value={formatCurrency(duplicateItem.valor_unitario * duplicateItem.quantidade)} 
                    icon={<PriceCheckIcon color="secondary" />} 
                  />
                </Box>
              </CardContent>
            </ItemCard>
          </Grid>
          
          {/* Novo Item */}
          <Grid item xs={12} md={6}>
            <ItemCard type="new">
              <ItemBadge 
                type="new" 
                label="Novo" 
                icon={<AddCircleIcon fontSize="small" />} 
              />
              <CardContent sx={{ pt: 4, pb: 3 }}>
                <Typography variant="h6" color="success.dark" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>
                  Novo Item
                </Typography>
                
                <ItemDetail 
                  label="Produto" 
                  value={newItem.produto_descricao || newItem.produto_codigo} 
                  icon={<InventoryIcon color="success" />} 
                />
                
                <ItemDetail 
                  label="Quantidade" 
                  value={newItem.quantidade} 
                  icon={<CalculateIcon color="success" />} 
                />
                
                <ItemDetail 
                  label="Valor Unitário" 
                  value={formatCurrency(newItem.valor_unitario)} 
                  icon={<PriceCheckIcon color="success" />} 
                />
                
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed rgba(0,0,0,0.1)' }}>
                  <ItemDetail 
                    label="Valor Total" 
                    value={formatCurrency(newItem.valor_unitario * newItem.quantidade)} 
                    icon={<PriceCheckIcon color="secondary" />} 
                  />
                </Box>
              </CardContent>
            </ItemCard>
          </Grid>
        </Grid>
        
        {/* Resultado da soma */}
        <Paper 
          elevation={0} 
          sx={{ 
            mt: 4, 
            p: 3, 
            borderRadius: '16px',
            background: 'linear-gradient(45deg, rgba(76, 175, 80, 0.05) 0%, rgba(25, 118, 210, 0.05) 100%)',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Box 
            sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '4px',
              background: 'linear-gradient(90deg, #4caf50, #2196f3)'
            }} 
          />
          
          <Typography variant="h6" color="text.primary" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <MergeIcon sx={{ mr: 1.5 }} color="primary" />
            <span>Resultado ao Somar Quantidades:</span>
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <CalculateIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Quantidade Total:
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary.dark">
                    {quantidadeTotal}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <PriceCheckIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Valor Unitário:
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.dark">
                    {formatCurrency(duplicateItem.valor_unitario)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                  <PriceCheckIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Valor Total:
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="secondary.dark">
                    {formatCurrency(valorTotal)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </DialogContent>
      
      <DialogActions 
        sx={{ 
          px: 3, 
          py: 3, 
          borderTop: '1px solid rgba(0, 0, 0, 0.08)',
          display: 'flex',
          justifyContent: 'space-between'
        }}
      >
        <Button 
          onClick={onHide} 
          color="inherit"
          sx={{ 
            borderRadius: '10px',
            fontWeight: 500,
            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.05)' }
          }}
          startIcon={<CloseIcon />}
        >
          Cancelar
        </Button>
        
        <Box>
          <Tooltip title="Adiciona como um novo item separado no orçamento">
            <ActionButton 
              onClick={onAddNew} 
              color="primary" 
              variant="outlined"
              sx={{ mr: 2 }}
              startIcon={<AddCircleIcon />}
            >
              Adicionar Como Novo
            </ActionButton>
          </Tooltip>
          
          <Tooltip title="Soma a quantidade do novo item ao item existente">
            <ActionButton 
              onClick={onMerge} 
              color="success" 
              variant="contained"
              startIcon={<MergeIcon />}
            >
              Somar Quantidades
            </ActionButton>
          </Tooltip>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default DuplicateItemModal; 