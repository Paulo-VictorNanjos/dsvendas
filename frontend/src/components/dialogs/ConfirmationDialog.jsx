import React from 'react';
import PropTypes from 'prop-types';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText, 
  DialogActions, 
  Button,
  CircularProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 8,
    padding: theme.spacing(1),
  },
}));

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  fontSize: '1.25rem',
  fontWeight: 'bold',
  color: theme.palette.text.primary,
}));

/**
 * Componente de diálogo de confirmação usando Material UI
 */
const ConfirmationDialog = ({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  confirmIcon = null,
  loading = false,
  confirmButtonProps = {},
  cancelButtonProps = {},
  ...props
}) => {
  return (
    <StyledDialog
      open={open}
      onClose={onCancel}
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
      {...props}
    >
      <StyledDialogTitle id="confirmation-dialog-title">
        {title}
      </StyledDialogTitle>
      <DialogContent>
        <DialogContentText id="confirmation-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onCancel}
          color="inherit"
          disabled={loading}
          {...cancelButtonProps}
        >
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="primary"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : confirmIcon}
          {...confirmButtonProps}
        >
          {loading ? 'Processando...' : confirmLabel}
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

ConfirmationDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.node.isRequired,
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  confirmIcon: PropTypes.node,
  loading: PropTypes.bool,
  confirmButtonProps: PropTypes.object,
  cancelButtonProps: PropTypes.object,
};

export default ConfirmationDialog; 