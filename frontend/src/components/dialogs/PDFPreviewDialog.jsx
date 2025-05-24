import React from 'react';
import PropTypes from 'prop-types';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button,
  Typography,
  Box
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import MaterialPDFDownloadButton from '../MaterialPDFDownloadButton';
import OrcamentoPDF from '../OrcamentoPDF';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 12,
    maxWidth: '800px',
    width: '100%',
  },
}));

const DialogHeader = styled(DialogTitle)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2, 3),
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const CloseButton = styled(Button)(({ theme }) => ({
  minWidth: 'auto',
  padding: theme.spacing(0.5),
}));

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}));

const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

/**
 * Modal de pré-visualização de PDF usando Material UI
 */
const PDFPreviewDialog = ({
  open,
  onClose,
  orcamento,
  cliente,
  vendedor,
  formasPagamento,
  condicoesPagamento,
}) => {
  if (!orcamento || !orcamento.cod_cliente) return null;

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
    >
      <DialogHeader disableTypography>
        <Typography variant="h6" component="div">
          Visualizar PDF
        </Typography>
        <CloseButton onClick={onClose} color="inherit" aria-label="close">
          <CloseIcon />
        </CloseButton>
      </DialogHeader>
      <StyledDialogContent>
        <Typography variant="body1" color="textSecondary" paragraph align="center">
          O PDF será gerado com os dados atuais do orçamento.
        </Typography>
        
        <Box sx={{ my: 3 }}>
          <MaterialPDFDownloadButton 
            document={
              <OrcamentoPDF 
                orcamento={orcamento} 
                cliente={cliente} 
                vendedor={vendedor}
                formasPagamento={formasPagamento}
                condicoesPagamento={condicoesPagamento}
              />
            } 
            fileName={`orcamento-${orcamento.codigo || 'novo'}.pdf`}
            buttonLabel="Baixar PDF"
            variant="contained"
            color="primary"
            size="large"
          />
        </Box>
        
        <Typography variant="body2" color="textSecondary" align="center">
          Clique no botão acima para baixar o PDF.
        </Typography>
      </StyledDialogContent>
      <StyledDialogActions>
        <Button onClick={onClose} color="inherit">
          Fechar
        </Button>
      </StyledDialogActions>
    </StyledDialog>
  );
};

PDFPreviewDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  orcamento: PropTypes.object,
  cliente: PropTypes.object,
  vendedor: PropTypes.object,
  formasPagamento: PropTypes.array,
  condicoesPagamento: PropTypes.array,
};

export default PDFPreviewDialog; 