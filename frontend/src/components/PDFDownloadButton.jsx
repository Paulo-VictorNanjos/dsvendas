import React, { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { FaFilePdf, FaDownload } from 'react-icons/fa';

// Botão estilizado do Material UI
const StyledButton = styled(Button)(({ theme }) => ({
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

const PDFDownloadButton = ({ 
  document, 
  fileName, 
  buttonLabel = "Download PDF",
  variant = "contained",
  color = "primary",
  ...props 
}) => {
  const [isClient, setIsClient] = useState(false);

  // Garantir que o componente só renderize o link de download no lado do cliente
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <StyledButton
        variant={variant}
        color={color}
        disabled
        startIcon={<CircularProgress size={16} color="inherit" />}
        {...props}
      >
        Carregando...
      </StyledButton>
    );
  }

  return (
    <PDFDownloadLink 
      document={document} 
      fileName={fileName}
      className="text-decoration-none"
    >
      {({ blob, url, loading, error }) => 
        loading ? (
          <StyledButton
            variant={variant}
            color={color}
            disabled
            startIcon={<CircularProgress size={16} color="inherit" />}
            {...props}
          >
            Preparando download...
          </StyledButton>
        ) : (
          <StyledButton
            variant={variant}
            color={color}
            startIcon={<FaDownload />}
            {...props}
          >
            {buttonLabel}
          </StyledButton>
        )
      }
    </PDFDownloadLink>
  );
};

export default PDFDownloadButton; 