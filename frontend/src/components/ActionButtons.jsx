import React from 'react';
import { Button, Stack, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { FaFilePdf, FaExchangeAlt, FaSync, FaCreditCard } from 'react-icons/fa';

// Styled Material UI Button with consistent styling
const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 8,
  textTransform: 'none',
  padding: '8px 16px',
  fontWeight: 500,
  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px',
  transition: 'all 0.2s ease-in-out',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: 'rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.06) 0px 2px 4px -1px',
  },
}));

/**
 * PDF Generator Button Component
 */
export const PdfButton = ({ onClick, disabled = false }) => (
  <ActionButton
    variant="outlined"
    color="primary"
    onClick={onClick}
    disabled={disabled}
    startIcon={<FaFilePdf />}
  >
    Gerar PDF
  </ActionButton>
);

/**
 * Convert to Order Button Component
 */
export const ConvertToOrderButton = ({ onClick, disabled = false }) => (
  <ActionButton
    variant="outlined"
    color="success"
    onClick={onClick}
    disabled={disabled}
    startIcon={<FaExchangeAlt />}
  >
    Converter em Pedido
  </ActionButton>
);

/**
 * Sync Payment Methods Button Component
 */
export const SyncPaymentMethodsButton = ({ onClick, loading = false, disabled = false }) => (
  <ActionButton
    variant="outlined"
    color="secondary"
    onClick={onClick}
    disabled={disabled || loading}
    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <FaCreditCard />}
  >
    {loading ? 'Sincronizando...' : 'Sincronizar Métodos de Pagamento'}
  </ActionButton>
);

/**
 * Action Buttons Group
 */
export const ActionButtonsGroup = ({ 
  onPdfClick, 
  onConvertClick, 
  onSyncClick,
  showPdf = true,
  showConvert = true,
  syncLoading = false,
  disabled = false
}) => (
  <Stack direction="row" spacing={2}>
    {showPdf && <PdfButton onClick={onPdfClick} disabled={disabled} />}
    {showConvert && <ConvertToOrderButton onClick={onConvertClick} disabled={disabled} />}
    <SyncPaymentMethodsButton onClick={onSyncClick} loading={syncLoading} disabled={disabled} />
  </Stack>
);

export default ActionButtonsGroup; 