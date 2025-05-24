import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  TextField, 
  Grid, 
  Divider,
  FormControlLabel,
  Switch
} from '@mui/material';
import { calcularIcmsST } from '../utils/calculoFiscal';
import { executarTestesST } from '../utils/testarCalculoST';

/**
 * Componente para testar o cálculo de ICMS-ST
 */
const TesteCalculoST = () => {
  // Estado para os parâmetros de cálculo
  const [params, setParams] = useState({
    valorBruto: 1000,
    valorIpi: 50,
    aliqIcms: 12,
    aliqInterna: 18,
    iva: 40,
    redIcms: 0,
    aliqFcpSt: 2,
    temReducaoIcmsProprio: false
  });
  
  // Estado para o resultado do cálculo
  const [resultado, setResultado] = useState(null);
  
  // Estado para exibir resultados dos cenários de teste
  const [mostrarCenarios, setMostrarCenarios] = useState(false);
  const [resultadoCenarios, setResultadoCenarios] = useState('');
  
  // Função para atualizar os parâmetros
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setParams({
      ...params,
      [name]: type === 'checkbox' ? checked : parseFloat(value)
    });
  };
  
  // Função para calcular ST
  const calcular = () => {
    const resultado = calcularIcmsST(params);
    setResultado(resultado);
  };
  
  // Função para executar os cenários de teste
  const executarTestes = () => {
    const resultados = executarTestesST();
    setResultadoCenarios(resultados);
    setMostrarCenarios(true);
  };
  
  // Formatar valor monetário
  const formatarValor = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };
  
  // Formatar porcentagem
  const formatarPorcentagem = (valor) => {
    return `${parseFloat(valor).toFixed(2)}%`;
  };
  
  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h5" gutterBottom>
        Teste de Cálculo de ICMS-ST
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Parâmetros
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Valor Bruto"
              name="valorBruto"
              type="number"
              value={params.valorBruto}
              onChange={handleChange}
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Valor IPI"
              name="valorIpi"
              type="number"
              value={params.valorIpi}
              onChange={handleChange}
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Alíquota ICMS (%)"
              name="aliqIcms"
              type="number"
              value={params.aliqIcms}
              onChange={handleChange}
              InputProps={{ inputProps: { min: 0, max: 100, step: 0.01 } }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Alíquota Interna (%)"
              name="aliqInterna"
              type="number"
              value={params.aliqInterna}
              onChange={handleChange}
              InputProps={{ inputProps: { min: 0, max: 100, step: 0.01 } }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="IVA/MVA (%)"
              name="iva"
              type="number"
              value={params.iva}
              onChange={handleChange}
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Redução BC (%)"
              name="redIcms"
              type="number"
              value={params.redIcms}
              onChange={handleChange}
              InputProps={{ inputProps: { min: 0, max: 100, step: 0.01 } }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Alíquota FCP-ST (%)"
              name="aliqFcpSt"
              type="number"
              value={params.aliqFcpSt}
              onChange={handleChange}
              InputProps={{ inputProps: { min: 0, max: 100, step: 0.01 } }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={params.temReducaoIcmsProprio}
                  onChange={handleChange}
                  name="temReducaoIcmsProprio"
                />
              }
              label="Redução apenas ICMS próprio"
            />
          </Grid>
        </Grid>
        
        <Box mt={3}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={calcular}
          >
            Calcular ICMS-ST
          </Button>
          
          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={executarTestes}
            sx={{ ml: 2 }}
          >
            Executar Cenários de Teste
          </Button>
        </Box>
      </Paper>
      
      {resultado && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Resultado do Cálculo
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="subtitle1">Base ICMS:</Typography>
              <Typography variant="body1">{formatarValor(resultado.baseIcms)}</Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="subtitle1">Valor ICMS:</Typography>
              <Typography variant="body1">{formatarValor(resultado.valorIcms)}</Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="subtitle1">Base ICMS-ST:</Typography>
              <Typography variant="body1">{formatarValor(resultado.baseIcmsSt)}</Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="subtitle1">Valor ICMS-ST:</Typography>
              <Typography variant="body1" color={resultado.valorIcmsSt > 0 ? 'error.main' : 'text.primary'}>
                {formatarValor(resultado.valorIcmsSt)}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="subtitle1">Valor FCP-ST:</Typography>
              <Typography variant="body1">{formatarValor(resultado.valorFcpSt)}</Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="subtitle1">TOTAL ST:</Typography>
              <Typography variant="body1" fontWeight="bold" color={resultado.valorTotalSt > 0 ? 'error.main' : 'text.primary'}>
                {formatarValor(resultado.valorTotalSt)}
              </Typography>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          
          <Box>
            <Typography variant="subtitle1">
              Imposto Total: {formatarValor(resultado.valorIcms + resultado.valorTotalSt)}
            </Typography>
            <Typography variant="subtitle1">
              Carga Tributária Efetiva: {formatarPorcentagem((resultado.valorIcms + resultado.valorTotalSt) / params.valorBruto * 100)}
            </Typography>
          </Box>
        </Paper>
      )}
      
      {mostrarCenarios && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Resultados dos Cenários de Teste
          </Typography>
          
          <Box 
            component="pre" 
            sx={{ 
              whiteSpace: 'pre-wrap', 
              overflow: 'auto',
              bgcolor: 'grey.100',
              p: 2,
              borderRadius: 1,
              fontFamily: 'monospace'
            }}
          >
            {resultadoCenarios}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default TesteCalculoST; 