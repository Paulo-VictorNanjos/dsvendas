import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  Chip,
  Alert, 
  CircularProgress, 
  Box, 
  Grid, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
  Paper
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { verificarSubstituicaoTributaria, formatarValorFiscal, obterDescricaoCST } from '../utils/fiscalUtils';

/**
 * Componente para exibir informações fiscais de um produto, com foco em Substituição Tributária
 */
const FiscalInfo = ({ codigoProduto, uf, showDetails = false }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stInfo, setStInfo] = useState(null);

  // Carregar informações de ST quando o componente montar ou quando mudar o produto/UF
  useEffect(() => {
    const carregarInfoST = async () => {
      if (!codigoProduto || !uf) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const resultado = await verificarSubstituicaoTributaria(codigoProduto, uf);
        setStInfo(resultado);
      } catch (err) {
        console.error('Erro ao carregar informações de ST:', err);
        setError('Não foi possível verificar informações de ST para este produto.');
      } finally {
        setLoading(false);
      }
    };
    
    carregarInfoST();
  }, [codigoProduto, uf]);

  // Renderizar indicador de carregamento
  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" my={2}>
        <CircularProgress size={20} sx={{ mr: 1 }} />
        <Typography variant="body2" color="text.secondary">
          Verificando informações fiscais...
        </Typography>
      </Box>
    );
  }

  // Renderizar mensagem de erro
  if (error) {
    return <Alert severity="warning">{error}</Alert>;
  }

  // Se não tiver informações ainda, não renderizar nada
  if (!stInfo) return null;

  // Renderizar informação básica de ST (chip)
  const renderChipST = () => {
    if (stInfo.temST) {
      return (
        <Chip 
          color="error" 
          icon={<WarningIcon />}
          label="Produto com ST" 
          sx={{ fontWeight: 'bold' }}
        />
      );
    } else {
      return (
        <Chip 
          color="success"
          label="Produto sem ST" 
          variant="outlined"
        />
      );
    }
  };

  // Renderizar detalhes da regra fiscal se solicitado
  const renderDetalhes = () => {
    if (!showDetails || !stInfo.detalhes) return null;

    const { cstIcms, aliqIcms, redIcms, margemSt, aliqIcmsSt } = stInfo.detalhes;

    return (
      <Paper variant="outlined" sx={{ mt: 2 }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Detalhes Fiscais
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>CST</TableCell>
                  <TableCell>
                    {cstIcms} - {obterDescricaoCST(cstIcms)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Alíquota ICMS</TableCell>
                  <TableCell>{formatarValorFiscal(aliqIcms)}</TableCell>
                </TableRow>
                {redIcms > 0 && (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Redução BC</TableCell>
                    <TableCell>{formatarValorFiscal(redIcms)}</TableCell>
                  </TableRow>
                )}
                {stInfo.temST && margemSt > 0 && (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Margem ST (MVA)</TableCell>
                    <TableCell>{formatarValorFiscal(margemSt)}</TableCell>
                  </TableRow>
                )}
                {stInfo.temST && aliqIcmsSt > 0 && (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Alíquota ICMS ST</TableCell>
                    <TableCell>{formatarValorFiscal(aliqIcmsSt)}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Código Regra ICMS</TableCell>
                  <TableCell>{stInfo.codRegraIcms || '-'}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>
    );
  };

  return (
    <Box className="fiscal-info">
      <Grid container>
        <Grid item xs={12}>
          <Box display="flex" alignItems="center">
            <Typography variant="body2" mr={1}>Situação Tributária:</Typography>
            {renderChipST()}
            {stInfo.temST && (
              <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                Atenção! Este produto possui substituição tributária.
              </Typography>
            )}
          </Box>
        </Grid>
      </Grid>
      {renderDetalhes()}
    </Box>
  );
};

export default FiscalInfo; 