import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute/index';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import OrcamentosList from './pages/Orcamentos';
import OrcamentoFiscal from './pages/Orcamentos/OrcamentoFiscal';
import ProdutosList from './pages/Produtos';
import ProdutoForm from './pages/Produtos/Form';
import NotFound from './pages/NotFound';
// Importando as páginas de configurações
import Configuracoes from './pages/Configuracoes';
import UsuarioVendedor from './pages/Configuracoes/UsuarioVendedor';
import TokenVendedor from './pages/Configuracoes/TokenVendedor';
import VincularVendedor from './pages/Configuracoes/VincularVendedor';
// Importando as páginas de pedidos com workflow
import PedidosWorkflow from './pages/Pedidos/PedidosWorkflow';
import PedidoWorkflowDetalhe from './pages/Pedidos/PedidoWorkflowDetalhe';

const AppRoutes = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Redirecionar / para /login se não estiver autenticado */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        
        {/* Rotas protegidas */}
        <Route
          path="/orcamentos"
          element={
            <PrivateRoute>
              <OrcamentosList />
            </PrivateRoute>
          }
        />
        <Route
          path="/orcamentos/novo"
          element={
            <PrivateRoute>
              <OrcamentoFiscal />
            </PrivateRoute>
          }
        />
        <Route
          path="/orcamentos/:id"
          element={
            <PrivateRoute>
              <OrcamentoFiscal />
            </PrivateRoute>
          }
        />
        
        <Route
          path="/produtos"
          element={
            <PrivateRoute>
              <ProdutosList />
            </PrivateRoute>
          }
        />
        <Route
          path="/produtos/novo"
          element={
            <PrivateRoute>
              <ProdutoForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/produtos/:id"
          element={
            <PrivateRoute>
              <ProdutoForm />
            </PrivateRoute>
          }
        />
        
        {/* Rotas de Pedidos com Workflow */}
        <Route
          path="/pedidos-workflow"
          element={
            <PrivateRoute>
              <PedidosWorkflow />
            </PrivateRoute>
          }
        />
        <Route
          path="/pedidos/workflow/:id"
          element={
            <PrivateRoute>
              <PedidoWorkflowDetalhe />
            </PrivateRoute>
          }
        />
        
        {/* Configurações */}
        <Route
          path="/configuracoes"
          element={
            <PrivateRoute>
              <Configuracoes />
            </PrivateRoute>
          }
        />
        <Route
          path="/configuracoes/usuario-vendedor"
          element={
            <PrivateRoute>
              <UsuarioVendedor />
            </PrivateRoute>
          }
        />
        <Route
          path="/configuracoes/token-vendedor"
          element={
            <PrivateRoute>
              <TokenVendedor />
            </PrivateRoute>
          }
        />
        <Route
          path="/configuracoes/vincular-vendedor"
          element={
            <PrivateRoute>
              <VincularVendedor />
            </PrivateRoute>
          }
        />
        
        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        
        {/* Teste Cálculo ST */}
        <Route
          path="/teste-calculo-st"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
        
        {/* Rota 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
};

export default AppRoutes; 