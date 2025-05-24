import React, { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { FaFilePdf, FaDownload } from 'react-icons/fa';

// Botão estilizado do Material UI com estilo consistente
const DownloadButton = styled(Button)(({ theme }) => ({
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

const MaterialPDFDownloadButton = ({ 
  document, 
  fileName, 
  buttonLabel = "Download PDF", 
  variant = "contained", 
  color = "primary", 
  ...props 
}) => {
  const [isClient, setIsClient] = useState(false);

  // Garante que o componente só renderize o link de download no lado do cliente
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <DownloadButton
        variant={variant}
        color={color}
        disabled
        startIcon={<CircularProgress size={16} color="inherit" />}
        {...props}
      >
        Carregando...
      </DownloadButton>
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
          <DownloadButton
            variant={variant}
            color={color}
            disabled
            startIcon={<CircularProgress size={16} color="inherit" />}
            {...props}
          >
            Carregando...
          </DownloadButton>
        ) : (
          <DownloadButton
            variant={variant}
            color={color}
            startIcon={<FaFilePdf />}
            {...props}
          >
            {buttonLabel}
          </DownloadButton>
        )
      }
    </PDFDownloadLink>
  );
};

export default MaterialPDFDownloadButton; 