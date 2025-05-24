import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText, 
  DialogActions, 
  Button,
  Typography
} from '@mui/material';
import { InfoOutlined, WarningAmber, ErrorOutline } from '@mui/icons-material';

const AlertDialog = ({ 
  open, 
  onClose, 
  title, 
  message, 
  confirmLabel = 'OK', 
  cancelLabel = 'Cancelar',
  type = 'info', // 'info', 'warning', 'error'
  onConfirm = null,
  showCancel = false
}) => {
  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <WarningAmber fontSize="large" color="warning" />;
      case 'error':
        return <ErrorOutline fontSize="large" color="error" />;
      case 'info':
      default:
        return <InfoOutlined fontSize="large" color="info" />;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      PaperProps={{
        sx: {
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          maxWidth: '500px',
          width: '100%'
        }
      }}
    >
      <DialogTitle id="alert-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        {getIcon()}
        <Typography variant="h6" component="span">
          {title}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <DialogContentText id="alert-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {showCancel && (
          <Button onClick={onClose} color="inherit" variant="outlined">
            {cancelLabel}
          </Button>
        )}
        <Button onClick={handleConfirm} color="primary" variant="contained" autoFocus>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AlertDialog; 