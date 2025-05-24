import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ToastContainer } from 'react-toastify';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import 'react-toastify/dist/ReactToastify.css';
import './utils/pdfConfig'; // Importar configuração do PDF

// Tema da aplicação
import theme from './theme';

// Rotas da aplicação
import AppRoutes from './routes';

// Cria o cliente de queries para React Query
const queryClient = new QueryClient();

function App() {
  return (
    <BrowserRouter>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <QueryClientProvider client={queryClient}>
            <SnackbarProvider maxSnack={3}>
              <ToastContainer position="top-right" autoClose={3000} />
              <AppRoutes />
            </SnackbarProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </StyledEngineProvider>
    </BrowserRouter>
  );
}

export default App; 