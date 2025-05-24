import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText, 
  DialogActions, 
  Button,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';
import { WarningAmber } from '@mui/icons-material';
import { FaTruck } from 'react-icons/fa';

const ConversionDialog = ({ 
  open, 
  onClose, 
  onConfirm,
  loading = false,
  title = 'Converter em Pedido de Venda',
  message = 'Deseja realmente converter este orçamento em pedido de venda?',
  confirmLabel = 'Converter',
  cancelLabel = 'Cancelar'
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <WarningAmber color="warning" />
        <Typography variant="h6" component="span">
          {title}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 1 }}>
          <DialogContentText>
            Você está prestes a converter este orçamento em um pedido de venda no sistema ERP.
          </DialogContentText>
          <DialogContentText>
            Esta ação não pode ser desfeita e o orçamento não poderá mais ser editado após a conversão.
          </DialogContentText>
          <DialogContentText sx={{ fontWeight: 'bold' }}>
            Deseja continuar?
          </DialogContentText>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={onClose} 
          color="inherit" 
          variant="outlined"
          disabled={loading}
        >
          {cancelLabel}
        </Button>
        <Button 
          onClick={onConfirm} 
          color="success" 
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <FaTruck />}
        >
          {loading ? 'Processando...' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConversionDialog; 