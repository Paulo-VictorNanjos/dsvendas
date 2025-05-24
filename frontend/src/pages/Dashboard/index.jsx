import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Divider,
  Button,
  Chip,
  Avatar,
  LinearProgress,
  useTheme,
  CircularProgress,
  Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  TrendingUp,
  ArrowUpward,
  ArrowDownward,
  MoreVert as MoreVertIcon,
  ShoppingCart,
  Description,
  CheckCircle,
  LocalOffer,
  ReceiptLong,
  PieChart,
  Refresh,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  CancelOutlined,
  AccessTime
} from '@mui/icons-material';
import Carousel from 'react-material-ui-carousel';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';
import { orcamentosAPI, api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// Banner personalizado com estilo moderno
const Banner = styled(Paper)(({ theme, imageurl }) => ({
  position: 'relative',
  backgroundImage: `url(${imageurl})`,
  backgroundSize: 'contain',
  backgroundPosition: 'center',
  height: '380px',
  borderRadius: '16px',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'flex-end',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0) 100%)',
    zIndex: 1
  }
}));

const BannerContent = styled(Box)(({ theme }) => ({
  position: 'relative',
  zIndex: 2,
  padding: theme.spacing(4),
  width: '100%',
  color: 'white'
}));

const StatCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
  }
}));

const StatCardHeader = styled(CardHeader)(({ theme }) => ({
  '& .MuiCardHeader-title': {
    fontSize: '1.1rem',
    fontWeight: 600
  }
}));

const StatValue = styled(Typography)(({ theme, trend }) => ({
  fontSize: '2rem',
  fontWeight: 700,
  color: trend === 'up' ? theme.palette.success.main : 
         trend === 'down' ? theme.palette.error.main : 
         theme.palette.text.primary
}));

const TrendIndicator = styled(Box)(({ theme, trend }) => ({
  display: 'flex',
  alignItems: 'center',
  color: trend === 'up' ? theme.palette.success.main : 
         trend === 'down' ? theme.palette.error.main : 
         theme.palette.text.secondary,
  '& .MuiSvgIcon-root': {
    fontSize: '1rem',
    marginRight: theme.spacing(0.5)
  }
}));

const ChartContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  height: '100%'
}));

const LoadingOverlay = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  width: '100%',
  position: 'absolute',
  top: 0,
  left: 0,
  backgroundColor: 'rgba(255,255,255,0.8)',
  zIndex: 10,
  borderRadius: '16px'
}));

const Dashboard = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  const [stats, setStats] = useState({
    totalOrcamentos: 0,
    orcamentosAprovados: 0,
    orcamentosConvertidos: 0,
    valorTotal: 0,
    percentualConversao: 0,
    ticketMedio: 0,
    mediaItensPorOrcamento: 0,
    taxaAprovacao: 0,
    tendenciaTotal: 'up',
    tendenciaConversao: 'up',
    variacaoTotal: 0,
    variacaoConversao: 0
  });
  
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [banners, setBanners] = useState([
    {
      id: 1,
      title: 'Bem-vindo ao Dashboard de Vendas',
      description: 'Visualize e analise seu desempenho de vendas em tempo real',
      imageUrl: 'https://i.ibb.co/v68YqVZ2/login-bg.jpg',
      buttonText: 'Ver Orçamentos',
      buttonLink: '/orcamentos',
      isInternalLink: true
    }
  ]);
  
  // Usaremos o BannerCarousel ao invés do estado local de banners
  // O BannerCarousel gerencia sua própria lógica de carregamento
  // Mantemos outras variáveis para compatibilidade com o código existente
  const [showAdminBanners, setShowAdminBanners] = useState(false);
  
  // Carregar banners quando o componente montar
  useEffect(() => {
    const fetchBanners = async () => {
      // Implementação futura ou código existente para carregar banners
      if (user && user.role === 'admin') {
        setShowAdminBanners(true);
        // Adicionar banners específicos para admin se necessário
        // Exemplo de estrutura de um banner que seria carregado:
        /*
        setBanners([
          {
            title: 'Orçamentos Pendentes',
            content: 'Você tem orçamentos aguardando aprovação.',
            buttonText: 'Saiba mais',
            buttonLink: '/orcamentos',
            isInternalLink: true
          }
        ]);
        */
      }
    };
    
    fetchBanners();
  }, [user]);
  
  // Cores para o gráfico de pizza
  const COLORS = ['#FF9800', '#4CAF50', '#2196F3', '#F44336'];
  
  // Status labels para o gráfico de pizza
  const STATUS_LABELS = {
    'PENDENTE': 'Pendentes',
    'APROVADO': 'Aprovados',
    'CONVERTIDO': 'Convertidos',
    'CANCELADO': 'Cancelados'
  };
  
  // Função para formatar valores monetários
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  // Função para calcular a tendência comparando com dados anteriores
  const calcularTendencia = (atual, anterior) => {
    if (!anterior || anterior === 0) return 'up';
    const diff = atual - anterior;
    return diff >= 0 ? 'up' : 'down';
  };
  
  // Função para calcular o percentual de variação
  const calcularVariacao = (atual, anterior) => {
    if (!anterior || anterior === 0) return 0;
    return ((atual - anterior) / anterior) * 100;
  };
  
  // Função para extrair o status real do orçamento, considerando diferentes estruturas possíveis
  const extrairStatus = (orc) => {
    if (!orc) return 'PENDENTE';
    
    // Verificar se o status está diretamente disponível
    if (orc.status) {
      return orc.status.toString().toUpperCase().trim();
    }
    
    // Verificar em campos aninhados
    if (orc.info && orc.info.status) {
      return orc.info.status.toString().toUpperCase().trim();
    }
    
    if (orc.situacao) {
      return orc.situacao.toString().toUpperCase().trim();
    }
    
    if (orc.estado) {
      return orc.estado.toString().toUpperCase().trim();
    }
    
    // Verificar por sinalizadores específicos
    if (orc.aprovado === true || orc.aprovado === 'true' || orc.aprovado === 1 || orc.aprovado === '1') {
      return 'APROVADO';
    }
    
    if (orc.convertido === true || orc.convertido === 'true' || orc.convertido === 1 || orc.convertido === '1') {
      return 'CONVERTIDO';
    }
    
    if (orc.cancelado === true || orc.cancelado === 'true' || orc.cancelado === 1 || orc.cancelado === '1') {
      return 'CANCELADO';
    }
    
    // Padrão
    return 'PENDENTE';
  };
  
  // Função para normalizar um orçamento, garantindo que tenha todos os campos necessários
  const normalizarOrcamento = (orc) => {
    if (!orc) return null;
    
    // Extrair o status real
    const statusOriginal = extrairStatus(orc);
    
    // Padronizar o status do orçamento
    let status = 'PENDENTE';
    
    // Mapear variações de status para os valores padrão
    if (['APROVADO', 'APROVADA', 'APPROVED'].includes(statusOriginal)) {
      status = 'APROVADO';
    } else if (['CONVERTIDO', 'CONVERTIDA', 'CONVERTED', 'PEDIDO', 'CONCLUIDO', 'CONCLUÍDA'].includes(statusOriginal)) {
      status = 'CONVERTIDO';
    } else if (['CANCELADO', 'CANCELADA', 'CANCELED', 'CANCELLED'].includes(statusOriginal)) {
      status = 'CANCELADO';
    } else if (['PENDENTE', 'PENDING', 'ABERTO', 'ABERTA', 'OPEN', 'EM ANÁLISE'].includes(statusOriginal)) {
      status = 'PENDENTE';
    } else {
      console.warn(`Status desconhecido encontrado: "${statusOriginal}", usando "PENDENTE" como padrão`);
    }
    
    // Identificar o código do vendedor corretamente
    let vendedor = null;
    if (orc.vendedor) {
      vendedor = orc.vendedor;
    } else if (orc.cod_vendedor) {
      vendedor = orc.cod_vendedor;
    } else if (orc.codigo_vendedor) {
      vendedor = orc.codigo_vendedor;
    } else if (orc.vendedor_codigo) {
      vendedor = orc.vendedor_codigo;
    } else if (user?.vendedor?.codigo) {
      vendedor = user.vendedor.codigo;
    } else {
      vendedor = '0';
    }
    
    // Normalizar o valor total
    let totais = { valor_total: '0' };
    if (orc.totais) {
      totais = orc.totais;
    } else if (orc.vl_total) {
      totais = { valor_total: orc.vl_total.toString() };
    }
    
    // Normalizar itens
    let itens = [];
    if (Array.isArray(orc.itens)) {
      itens = orc.itens;
    }
    
    // Garantir que o objeto tenha os campos necessários
    return {
      ...orc,
      status,
      dt_orcamento: orc.dt_orcamento || new Date().toISOString(),
      totais,
      itens,
      vendedor
    };
  };
  
  // Função para diagnosticar problemas com os dados de orçamentos
  const diagnosticarDados = (orcamentos) => {
    if (!orcamentos || !Array.isArray(orcamentos)) {
      console.error('Dados de orçamentos inválidos:', orcamentos);
      return;
    }
    
    console.log('=== DIAGNÓSTICO DE DADOS ===');
    console.log(`Total de orçamentos: ${orcamentos.length}`);
    
    // Verificar estrutura dos dados
    const estruturas = {};
    const campos = new Set();
    
    // Coletar todos os campos presentes nos orçamentos
    orcamentos.forEach(orc => {
      if (!orc) return;
      
      Object.keys(orc).forEach(campo => {
        campos.add(campo);
      });
      
      // Identificar a estrutura do orçamento
      const temStatus = !!orc.status;
      const temVendedor = !!orc.vendedor || !!orc.cod_vendedor;
      const temTotais = !!orc.totais || !!orc.vl_total;
      const temItens = !!orc.itens;
      
      const estruturaKey = `status:${temStatus},vendedor:${temVendedor},totais:${temTotais},itens:${temItens}`;
      estruturas[estruturaKey] = (estruturas[estruturaKey] || 0) + 1;
    });
    
    console.log('Campos encontrados:', Array.from(campos).sort());
    console.log('Estruturas encontradas:', estruturas);
    
    // Analisar campos de status
    const statusCounts = {};
    orcamentos.forEach(orc => {
      if (!orc) return;
      
      // Verificar status em diferentes formatos possíveis
      let status = 'undefined';
      if (orc.status) {
        status = orc.status;
      } else if (orc.cod_status) {
        status = orc.cod_status === 1 ? 'APROVADO' : 
                orc.cod_status === 2 ? 'CONVERTIDO' : 
                orc.cod_status === 3 ? 'CANCELADO' : 'PENDENTE';
      }
      
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log('Contagem de status:', statusCounts);
    
    // Analisar campos de vendedor
    const vendedorCounts = {};
    orcamentos.forEach(orc => {
      if (!orc) return;
      
      const vendedor = orc.vendedor || orc.cod_vendedor || 'undefined';
      vendedorCounts[vendedor] = (vendedorCounts[vendedor] || 0) + 1;
    });
    
    console.log('Contagem de vendedores:', vendedorCounts);
    
    // Analisar valores totais
    if (orcamentos.length > 0) {
      console.log('Análise de valores totais:');
      orcamentos.slice(0, 3).forEach((orc, idx) => {
        let valorTotal = 'N/A';
        if (orc.totais && orc.totais.valor_total !== undefined) {
          valorTotal = `${orc.totais.valor_total} (${typeof orc.totais.valor_total})`;
        } else if (orc.vl_total !== undefined) {
          valorTotal = `${orc.vl_total} (${typeof orc.vl_total})`;
        }
        
        console.log(`Orçamento #${idx + 1} - Valor Total: ${valorTotal}`);
      });
    }
    
    // Analisar os primeiros orçamentos em detalhes
    console.log('Primeiros 3 orçamentos em detalhes:');
    orcamentos.slice(0, 3).forEach((orc, idx) => {
      console.log(`Orçamento #${idx + 1}:`, JSON.stringify(orc, null, 2));
    });
    
    console.log('=== FIM DO DIAGNÓSTICO ===');
  };
  
  // Função para buscar dados do dashboard
  const fetchDashboardData = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    setError(null);
    
    try {
      console.log('Iniciando carregamento de dados do dashboard...');
      
      // 1. Buscar todos os orçamentos do vendedor ou todos se for admin
      let orcamentosResponse;
      let orcamentos = [];
      
      if (user?.role === 'admin') {
        // Administrador vê todos os orçamentos
        console.log('Buscando orçamentos como admin');
        try {
          orcamentosResponse = await orcamentosAPI.listar();
          console.log('Resposta da API (admin):', orcamentosResponse);
          
          if (orcamentosResponse?.data) {
            // CORREÇÃO: Verificar se a resposta tem a estrutura { success: true, data: [...] }
            if (orcamentosResponse.data.success && Array.isArray(orcamentosResponse.data.data)) {
              orcamentos = orcamentosResponse.data.data;
              console.log('Orçamentos extraídos da resposta:', orcamentos.length);
            } else {
              // Garantir que orcamentos é um array
              orcamentos = Array.isArray(orcamentosResponse.data) 
                ? orcamentosResponse.data 
                : [orcamentosResponse.data];
            }
              
            // Executar diagnóstico dos dados brutos
            console.log('Diagnóstico dos dados brutos (admin):');
            diagnosticarDados(orcamentos);
          }
        } catch (adminError) {
          console.error('Erro ao buscar orçamentos como admin:', adminError);
          throw new Error(`Falha ao buscar orçamentos: ${adminError.message}`);
        }
      } else if (user?.vendedor?.codigo) {
        console.log('Buscando orçamentos como vendedor:', user.vendedor.codigo);
        try {
          // Tentar usar o endpoint específico para vendedor
          orcamentosResponse = await orcamentosAPI.listarPorVendedor(user.vendedor.codigo);
          console.log('Resposta da API (vendedor específico):', orcamentosResponse);
          
          if (orcamentosResponse?.data) {
            // CORREÇÃO: Verificar se a resposta tem a estrutura { success: true, data: [...] }
            if (orcamentosResponse.data.success && Array.isArray(orcamentosResponse.data.data)) {
              orcamentos = orcamentosResponse.data.data;
              console.log('Orçamentos extraídos da resposta:', orcamentos.length);
            } else {
              // Garantir que orcamentos é um array
              orcamentos = Array.isArray(orcamentosResponse.data) 
                ? orcamentosResponse.data 
                : [orcamentosResponse.data];
            }
              
            // Executar diagnóstico dos dados brutos
            console.log('Diagnóstico dos dados brutos (vendedor específico):');
            diagnosticarDados(orcamentos);
          }
        } catch (vendedorError) {
          console.warn('Endpoint de vendedor não disponível, usando filtro manual:', vendedorError);
          
          // Se o endpoint específico falhar, tentar buscar usando parâmetros de consulta
          try {
            console.log('Tentando buscar orçamentos com parâmetros de consulta...');
            
            // Tentar com diferentes formatos de parâmetros
            const tentativas = [
              { vendedor: user.vendedor.codigo },
              { cod_vendedor: user.vendedor.codigo },
              { codigo_vendedor: user.vendedor.codigo },
              { vendedor_codigo: user.vendedor.codigo }
            ];
            
            // Tentar cada formato de parâmetro
            for (const params of tentativas) {
              try {
                console.log('Tentando com parâmetros:', params);
                orcamentosResponse = await orcamentosAPI.buscarTodos(params);
                
                if (orcamentosResponse?.data) {
                  // CORREÇÃO: Verificar se a resposta tem a estrutura { success: true, data: [...] }
                  if (orcamentosResponse.data.success && Array.isArray(orcamentosResponse.data.data)) {
                    orcamentos = orcamentosResponse.data.data;
                    console.log('Orçamentos extraídos da resposta:', orcamentos.length);
                    if (orcamentos.length > 0) {
                      break; // Sair do loop se encontrou orçamentos
                    }
                  } else if (Array.isArray(orcamentosResponse.data) ? 
                    orcamentosResponse.data.length > 0 : 
                    orcamentosResponse.data) {
                    
                    console.log('Encontrados orçamentos com parâmetros:', params);
                    orcamentos = Array.isArray(orcamentosResponse.data) 
                      ? orcamentosResponse.data 
                      : [orcamentosResponse.data];
                    
                    break; // Sair do loop se encontrou orçamentos
                  }
                }
              } catch (paramError) {
                console.warn('Erro ao buscar com parâmetros:', params, paramError);
              }
            }
            
            // Se ainda não encontrou orçamentos, buscar todos e filtrar manualmente
            if (orcamentos.length === 0) {
              console.log('Nenhum orçamento encontrado com parâmetros. Buscando todos e filtrando manualmente...');
              orcamentosResponse = await orcamentosAPI.listar();
              console.log('Resposta da API (todos os orçamentos):', orcamentosResponse);
              
              if (orcamentosResponse?.data) {
                // CORREÇÃO: Verificar se a resposta tem a estrutura { success: true, data: [...] }
                let todosOrcamentos;
                if (orcamentosResponse.data.success && Array.isArray(orcamentosResponse.data.data)) {
                  todosOrcamentos = orcamentosResponse.data.data;
                  console.log('Orçamentos extraídos da resposta:', todosOrcamentos.length);
                } else {
                  // Garantir que todosOrcamentos é um array antes de filtrar
                  todosOrcamentos = Array.isArray(orcamentosResponse.data) 
                    ? orcamentosResponse.data 
                    : [orcamentosResponse.data];
                }
                
                // Filtrar manualmente por vendedor
                console.log('Aplicando filtro manual por vendedor:', user.vendedor.codigo);
                
                const orcamentosAntesDoFiltro = todosOrcamentos.length;
                
                orcamentos = todosOrcamentos.filter(orc => {
                  if (!orc) return false;
                  
                  const vendedorCodigo = user.vendedor.codigo.toString();
                  
                  // Verificar em diferentes campos possíveis
                  if (orc.vendedor && orc.vendedor.toString() === vendedorCodigo) return true;
                  if (orc.cod_vendedor && orc.cod_vendedor.toString() === vendedorCodigo) return true;
                  if (orc.codigo_vendedor && orc.codigo_vendedor.toString() === vendedorCodigo) return true;
                  if (orc.vendedor_codigo && orc.vendedor_codigo.toString() === vendedorCodigo) return true;
                  
                  // Verificar em campos aninhados
                  if (orc.vendedor_info && orc.vendedor_info.codigo && 
                      orc.vendedor_info.codigo.toString() === vendedorCodigo) return true;
                  
                  return false;
                });
                
                console.log(`Filtro por vendedor: ${orcamentosAntesDoFiltro} -> ${orcamentos.length} orçamentos (${orcamentosAntesDoFiltro - orcamentos.length} removidos)`);
                
                // Verificar se algum orçamento foi encontrado após o filtro
                if (orcamentos.length === 0 && orcamentosAntesDoFiltro > 0) {
                  console.warn('Nenhum orçamento encontrado após filtro por vendedor. Verificando estrutura dos orçamentos...');
                  
                  // Analisar os primeiros orçamentos para debug
                  const amostra = todosOrcamentos.slice(0, 3);
                  console.log('Amostra de orçamentos antes do filtro:', 
                    amostra.map(orc => ({
                      id: orc.id || orc.codigo,
                      vendedor: orc.vendedor,
                      cod_vendedor: orc.cod_vendedor,
                      codigo_vendedor: orc.codigo_vendedor,
                      vendedor_codigo: orc.vendedor_codigo,
                      vendedor_info: orc.vendedor_info
                    }))
                  );
                }
              }
            }
          } catch (listarError) {
            console.error('Erro ao buscar todos os orçamentos:', listarError);
            throw new Error(`Falha ao buscar orçamentos: ${listarError.message}`);
          }
        }
      } else {
        throw new Error('Usuário sem permissões adequadas');
      }
      
      // Verificação adicional para garantir que orcamentos é um array válido
      if (!Array.isArray(orcamentos)) {
        console.error('Dados de orçamentos não estão em formato de array:', orcamentos);
        orcamentos = [];
      }
      
      // Verificar se há elementos nulos ou inválidos no array
      const orcamentosInvalidos = orcamentos.filter(orc => !orc || typeof orc !== 'object').length;
      if (orcamentosInvalidos > 0) {
        console.warn(`Detectados ${orcamentosInvalidos} orçamentos inválidos ou nulos. Filtrando...`);
        orcamentos = orcamentos.filter(orc => orc && typeof orc === 'object');
      }
      
      // Normalizar todos os orçamentos para garantir estrutura consistente
      orcamentos = orcamentos
        .map(normalizarOrcamento)
        .filter(orc => orc !== null); // Remover qualquer orçamento que não pôde ser normalizado
      
      console.log('Orçamentos carregados e normalizados:', orcamentos.length);
      
      // Diagnóstico após normalização
      console.log('Diagnóstico após normalização:');
      diagnosticarDados(orcamentos);
      
      // Verificar especificamente a estrutura dos totais
      const totaisEstrutura = {};
      orcamentos.forEach(orc => {
        if (!orc || !orc.totais) return;
        
        // Verificar os campos disponíveis em totais
        const camposTotais = Object.keys(orc.totais).sort().join(',');
        totaisEstrutura[camposTotais] = (totaisEstrutura[camposTotais] || 0) + 1;
        
        // Verificar o tipo de valor_total
        if (orc.totais.valor_total !== undefined) {
          const tipo = typeof orc.totais.valor_total;
          const valor = orc.totais.valor_total;
          console.log(`Exemplo de valor_total (${tipo}):`, valor);
        }
      });
      
      console.log('Estruturas de totais encontradas:', totaisEstrutura);
      
      // Adicionar log detalhado para debug
      console.log('Amostra dos primeiros orçamentos após normalização:', orcamentos.slice(0, 3));
      
      if (orcamentos.length === 0) {
        console.log('Nenhum orçamento encontrado. Definindo dados padrão.');
        setStats({
          totalOrcamentos: 0,
          orcamentosAprovados: 0,
          orcamentosConvertidos: 0,
          valorTotal: 0,
          percentualConversao: 0,
          ticketMedio: 0,
          mediaItensPorOrcamento: 0,
          taxaAprovacao: 0,
          tendenciaTotal: 'up',
          tendenciaConversao: 'up',
          variacaoTotal: 0,
          variacaoConversao: 0
        });
        setChartData([]);
        setPieData([]);
        
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // 2. Processar os dados para estatísticas
      const totalOrcamentos = orcamentos.length;
      const orcamentosAprovados = orcamentos.filter(orc => orc && orc.status === 'APROVADO').length;
      const orcamentosConvertidos = orcamentos.filter(orc => orc && orc.status === 'CONVERTIDO').length;
      const orcamentosPendentes = orcamentos.filter(orc => orc && (orc.status === 'PENDENTE' || !orc.status)).length;
      const orcamentosCancelados = orcamentos.filter(orc => orc && orc.status === 'CANCELADO').length;
      
      // Log detalhado dos status
      console.log('Contagem por status:', {
        total: totalOrcamentos,
        aprovados: orcamentosAprovados,
        convertidos: orcamentosConvertidos,
        pendentes: orcamentosPendentes,
        cancelados: orcamentosCancelados
      });
      
      // Verificar se todos os orçamentos têm status válidos
      const statusInvalidos = orcamentos.filter(orc => 
        !['APROVADO', 'CONVERTIDO', 'PENDENTE', 'CANCELADO'].includes(orc.status)
      );
      if (statusInvalidos.length > 0) {
        console.warn(`Detectados ${statusInvalidos.length} orçamentos com status inválidos:`, 
          statusInvalidos.map(orc => ({ id: orc.id || orc.codigo, status: orc.status }))
        );
      }
      
      // 3. Calcular valor total dos orçamentos convertidos
      let valorTotal = 0;
      let qtdItensTotal = 0;
      
      const orcamentosConvertidosDetalhes = orcamentos
        .filter(orc => orc && orc.status === 'CONVERTIDO');
        
      console.log(`Detalhes dos ${orcamentosConvertidosDetalhes.length} orçamentos convertidos:`, 
        orcamentosConvertidosDetalhes.map(orc => ({
          id: orc.id || orc.codigo,
          valor: orc.totais?.valor_total,
          itens: orc.itens?.length || 0
        }))
      );
      
      orcamentosConvertidosDetalhes.forEach(orc => {
        if (orc && orc.totais && orc.totais.valor_total) {
          const valorTotalNum = parseFloat(orc.totais.valor_total);
          if (!isNaN(valorTotalNum)) {
            valorTotal += valorTotalNum;
          }
        }
        
        // Contar quantidade de itens
        if (orc && orc.itens && Array.isArray(orc.itens)) {
          qtdItensTotal += orc.itens.length;
        }
      });
      
      // 4. Calcular percentual de conversão
      const percentualConversao = totalOrcamentos > 0 
        ? (orcamentosConvertidos / totalOrcamentos) * 100 
        : 0;
      
      // 5. Calcular ticket médio
      const ticketMedio = orcamentosConvertidos > 0 
        ? valorTotal / orcamentosConvertidos 
        : 0;
      
      // 6. Calcular média de itens por orçamento
      const mediaItensPorOrcamento = orcamentosConvertidos > 0 
        ? qtdItensTotal / orcamentosConvertidos 
        : 0;
        
      // 7. Calcular taxa de aprovação
      const taxaAprovacao = totalOrcamentos > 0
        ? ((orcamentosAprovados + orcamentosConvertidos) / totalOrcamentos) * 100
        : 0;
      
      // 8. Buscar dados históricos para comparação (mês anterior)
      const hoje = new Date();
      const mesAtual = hoje.getMonth();
      const anoAtual = hoje.getFullYear();
      
      // Filtrar orçamentos do mês atual
      const orcamentosMesAtual = orcamentos.filter(orc => {
        if (!orc || !orc.dt_orcamento) return false;
        try {
          const dataOrc = new Date(orc.dt_orcamento);
          return dataOrc.getMonth() === mesAtual && dataOrc.getFullYear() === anoAtual;
        } catch (err) {
          console.error('Erro ao processar data do orçamento:', err);
          return false;
        }
      });
      
      // Filtrar orçamentos do mês anterior
      const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
      const anoAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;
      
      const orcamentosMesAnterior = orcamentos.filter(orc => {
        if (!orc || !orc.dt_orcamento) return false;
        try {
          const dataOrc = new Date(orc.dt_orcamento);
          return dataOrc.getMonth() === mesAnterior && dataOrc.getFullYear() === anoAnterior;
        } catch (err) {
          console.error('Erro ao processar data do orçamento:', err);
          return false;
        }
      });
      
      // Calcular estatísticas do mês atual
      const totalOrcamentosMesAtual = orcamentosMesAtual.length;
      const convertidosMesAtual = orcamentosMesAtual.filter(orc => orc && orc.status === 'CONVERTIDO').length;
      
      // Calcular estatísticas do mês anterior
      const totalOrcamentosMesAnterior = orcamentosMesAnterior.length;
      const convertidosMesAnterior = orcamentosMesAnterior.filter(orc => orc && orc.status === 'CONVERTIDO').length;
      
      // Calcular tendências
      const tendenciaTotal = calcularTendencia(totalOrcamentosMesAtual, totalOrcamentosMesAnterior);
      const tendenciaConversao = calcularTendencia(convertidosMesAtual, convertidosMesAnterior);
      
      // Calcular variações percentuais
      const variacaoTotal = calcularVariacao(totalOrcamentosMesAtual, totalOrcamentosMesAnterior);
      const variacaoConversao = calcularVariacao(convertidosMesAtual, convertidosMesAnterior);
      
      // 9. Preparar dados para o gráfico de barras (últimos 6 meses)
      const ultimosMeses = [];
      
      for (let i = 5; i >= 0; i--) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        ultimosMeses.push({
          mes: data.toLocaleString('pt-BR', { month: 'short' }),
          mesNum: data.getMonth(),
          ano: data.getFullYear()
        });
      }
      
      // Agrupar orçamentos por mês
      const dadosPorMes = ultimosMeses.map(mesInfo => {
        // Verificar se mesInfo é válido
        if (!mesInfo || mesInfo.mesNum === undefined || mesInfo.ano === undefined) {
          return {
            mes: 'Desconhecido',
            orcamentos: 0,
            aprovados: 0,
            convertidos: 0,
            valor: 0
          };
        }
        
        const orcamentosMes = orcamentos.filter(orc => {
          if (!orc || !orc.dt_orcamento) return false;
          try {
            const dataOrc = new Date(orc.dt_orcamento);
            return dataOrc.getMonth() === mesInfo.mesNum && 
                   dataOrc.getFullYear() === mesInfo.ano;
          } catch (err) {
            console.error('Erro ao processar data do orçamento:', err);
            return false;
          }
        });
        
        // Calcular valor total dos orçamentos convertidos no mês
        let valorMes = 0;
        orcamentosMes
          .filter(orc => orc && orc.status === 'CONVERTIDO')
          .forEach(orc => {
            if (orc && orc.totais && orc.totais.valor_total) {
              const valorMesNum = parseFloat(orc.totais.valor_total);
              if (!isNaN(valorMesNum)) {
                valorMes += valorMesNum;
              }
            }
          });
        
        return {
          mes: mesInfo.mes ? mesInfo.mes.charAt(0).toUpperCase() + mesInfo.mes.slice(1) : 'Desconhecido',
          orcamentos: orcamentosMes.length,
          aprovados: orcamentosMes.filter(orc => orc && orc.status === 'APROVADO').length,
          convertidos: orcamentosMes.filter(orc => orc && orc.status === 'CONVERTIDO').length,
          valor: valorMes
        };
      });
      
      // 10. Preparar dados para o gráfico de pizza (status dos orçamentos)
      const dadosPizza = [
        { name: 'Pendentes', value: orcamentosPendentes },
        { name: 'Aprovados', value: orcamentosAprovados },
        { name: 'Convertidos', value: orcamentosConvertidos },
        { name: 'Cancelados', value: orcamentosCancelados }
      ].filter(item => item && item.value > 0);
      
      // 11. Atualizar estados com os dados processados
      setStats({
        totalOrcamentos,
        orcamentosAprovados,
        orcamentosConvertidos,
        valorTotal,
        percentualConversao,
        ticketMedio,
        mediaItensPorOrcamento,
        taxaAprovacao,
        tendenciaTotal,
        tendenciaConversao,
        variacaoTotal,
        variacaoConversao
      });
      
      setChartData(dadosPorMes);
      setPieData(dadosPizza);
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      setError(`Falha ao carregar dados: ${error.message || 'Erro desconhecido'}. Tente novamente mais tarde.`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Carregar dados iniciais
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        await fetchDashboardData();
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        if (isMounted) {
          setError(`Falha ao carregar dados: ${error.message || 'Erro desconhecido'}. Tente novamente mais tarde.`);
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [user]);
  
  // Função para atualizar os dados
  const handleRefresh = () => {
    fetchDashboardData(true);
  };
  
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Carrossel de Banners */}
      <Box sx={{ mb: 4 }}>
        <Carousel
          animation="slide"
          navButtonsAlwaysVisible
          autoPlay
          interval={6000}
          timeout={500}
          indicators={true}
          navButtonsProps={{
            style: {
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              color: '#494949',
              borderRadius: '50%',
              padding: '8px'
            }
          }}
          indicatorContainerProps={{
            style: {
              marginTop: '-32px',
              position: 'relative',
              zIndex: 10
            }
          }}
          indicatorIconButtonProps={{
            style: {
              color: 'rgba(255, 255, 255, 0.5)',
              padding: '5px'
            }
          }}
          activeIndicatorIconButtonProps={{
            style: {
              color: '#fff'
            }
          }}
          NextIcon={<KeyboardArrowRight />}
          PrevIcon={<KeyboardArrowLeft />}
        >
          {banners.map((banner) => (
            <Banner key={banner.id} imageurl={banner.imageUrl}>
              <BannerContent>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  {banner.title}
                </Typography>
                <Typography variant="subtitle1" sx={{ mb: 2, maxWidth: '600px' }}>
                  {banner.description}
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary" 
                  size="large"
                  sx={{ 
                    borderRadius: '8px', 
                    fontWeight: 'bold',
                    textTransform: 'none',
                    px: 3,
                    py: 1,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                    '&:hover': {
                      boxShadow: '0 6px 16px rgba(0, 0, 0, 0.3)',
                    }
                  }}
                  href={banner.buttonLink}
                >
                  {banner.buttonText}
                </Button>
              </BannerContent>
            </Banner>
          ))}
        </Carousel>
      </Box>
      
      {/* Cards de Estatísticas */}
      <Box sx={{ position: 'relative', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
          <TrendingUp sx={{ mr: 1.5, color: 'primary.main' }} />
          Visão Geral de Orçamentos
          <Button 
            startIcon={refreshing ? <CircularProgress size={20} color="inherit" /> : <Refresh />}
            sx={{ ml: 'auto' }} 
            variant="outlined"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </Typography>
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? 'Tentando...' : 'Tentar Novamente'}
              </Button>
            }
          >
            {error}
          </Alert>
        )}
        
        {loading && !refreshing && (
          <LoadingOverlay>
            <CircularProgress size={40} />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Carregando dados...
            </Typography>
          </LoadingOverlay>
        )}
      </Box>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total de Orçamentos */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard>
            <StatCardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'primary.light' }}>
                  <Description />
                </Avatar>
              }
              title="Total de Orçamentos"
              action={
                <IconButton aria-label="settings">
                  <MoreVertIcon />
                </IconButton>
              }
            />
            <CardContent>
              <StatValue variant="h4">
                {stats.totalOrcamentos}
              </StatValue>
              <TrendIndicator trend={stats.tendenciaTotal}>
                {stats.tendenciaTotal === 'up' ? <ArrowUpward /> : <ArrowDownward />}
                <Typography variant="body2">
                  {stats.variacaoTotal ? `${Math.abs(stats.variacaoTotal).toFixed(1)}% ${stats.tendenciaTotal === 'up' ? 'a mais' : 'a menos'}` : 'Sem dados anteriores'}
                </Typography>
              </TrendIndicator>
            </CardContent>
          </StatCard>
        </Grid>
        
        {/* Orçamentos Aprovados */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard>
            <StatCardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'success.light' }}>
                  <CheckCircle />
                </Avatar>
              }
              title="Orçamentos Aprovados"
              action={
                <IconButton aria-label="settings">
                  <MoreVertIcon />
                </IconButton>
              }
            />
            <CardContent>
              <StatValue variant="h4">
                {stats.orcamentosAprovados}
              </StatValue>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <TrendIndicator trend="up">
                  <ArrowUpward />
                  <Typography variant="body2">
                    Taxa de aprovação
                  </Typography>
                </TrendIndicator>
                <Chip 
                  label={`${stats.taxaAprovacao ? stats.taxaAprovacao.toFixed(1) : 0}%`} 
                  color="success" 
                  size="small"
                />
              </Box>
            </CardContent>
          </StatCard>
        </Grid>
        
        {/* Orçamentos Convertidos */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard>
            <StatCardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'info.light' }}>
                  <ShoppingCart />
                </Avatar>
              }
              title="Convertidos em Pedidos"
              action={
                <IconButton aria-label="settings">
                  <MoreVertIcon />
                </IconButton>
              }
            />
            <CardContent>
              <StatValue variant="h4">
                {stats.orcamentosConvertidos}
              </StatValue>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <TrendIndicator trend={stats.tendenciaConversao}>
                  {stats.tendenciaConversao === 'up' ? <ArrowUpward /> : <ArrowDownward />}
                  <Typography variant="body2">
                    {stats.variacaoConversao ? `${Math.abs(stats.variacaoConversao).toFixed(1)}% ${stats.tendenciaConversao === 'up' ? 'a mais' : 'a menos'}` : 'Sem dados anteriores'}
                  </Typography>
                </TrendIndicator>
                <Chip 
                  label={`${stats.percentualConversao ? stats.percentualConversao.toFixed(1) : 0}%`} 
                  color="info" 
                  size="small"
                />
              </Box>
            </CardContent>
          </StatCard>
        </Grid>
        
        {/* Valor Total */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard>
            <StatCardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'warning.light' }}>
                  <LocalOffer />
                </Avatar>
              }
              title="Valor Total Convertido"
              action={
                <IconButton aria-label="settings">
                  <MoreVertIcon />
                </IconButton>
              }
            />
            <CardContent>
              <StatValue variant="h4">
                {formatCurrency(stats.valorTotal)}
              </StatValue>
              <TrendIndicator trend="up">
                <Typography variant="body2" fontWeight="medium">
                  Ticket médio: {formatCurrency(stats.ticketMedio || 0)}
                </Typography>
              </TrendIndicator>
            </CardContent>
          </StatCard>
        </Grid>
      </Grid>
      
      {/* Taxa de Conversão */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ReceiptLong sx={{ color: 'primary.main', mr: 1.5 }} />
          <Typography variant="h6" fontWeight="bold">
            Taxa de Conversão de Orçamentos
          </Typography>
          <Chip 
            label={`${stats.percentualConversao ? stats.percentualConversao.toFixed(1) : 0}%`} 
            color="primary" 
            sx={{ ml: 2 }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Percentual de orçamentos que são convertidos em pedidos
        </Typography>
        <Box sx={{ mt: 1 }}>
          <LinearProgress 
            variant="determinate" 
            value={stats.percentualConversao || 0} 
            sx={{ 
              height: 10, 
              borderRadius: 5,
              backgroundColor: 'rgba(0,0,0,0.08)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                background: 'linear-gradient(90deg, #1976d2, #42a5f5)'
              }
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">0%</Typography>
            <Typography variant="caption" color="text.secondary">Meta: 50%</Typography>
            <Typography variant="caption" color="text.secondary">100%</Typography>
          </Box>
        </Box>
      </Paper>
      
      {/* Métricas Adicionais */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
              <TrendingUp sx={{ mr: 1.5, color: 'primary.main' }} />
              Métricas de Desempenho
            </Typography>
            
            <Grid container spacing={2}>
              {/* Ticket Médio */}
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Ticket Médio
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {formatCurrency(stats.ticketMedio || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Valor médio por orçamento convertido
                  </Typography>
                </Box>
              </Grid>
              
              {/* Média de Itens */}
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Média de Itens
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {stats.mediaItensPorOrcamento ? stats.mediaItensPorOrcamento.toFixed(1) : '0'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Itens por orçamento convertido
                  </Typography>
                </Box>
              </Grid>
              
              {/* Taxa de Aprovação */}
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Taxa de Aprovação
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {stats.taxaAprovacao ? `${stats.taxaAprovacao.toFixed(1)}%` : '0%'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Orçamentos aprovados ou convertidos
                  </Typography>
                </Box>
              </Grid>
              
              {/* Orçamentos Pendentes */}
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Orçamentos Pendentes
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="warning.main">
                    {pieData.find(item => item.name === 'Pendentes')?.value || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Aguardando aprovação do cliente
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Gráficos */}
      <Grid container spacing={3}>
        {/* Gráfico de Barras */}
        <Grid item xs={12} md={8}>
          <ChartContainer sx={{ position: 'relative', minHeight: 400 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
              <TrendingUp sx={{ mr: 1.5, color: 'primary.main' }} />
              Evolução de Orçamentos por Mês
            </Typography>
            <Box sx={{ height: 350 }}>
              {loading ? (
                <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                  <CircularProgress size={40} />
                </Box>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `R$ ${value/1000}k`} />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'valor') {
                          return [formatCurrency(value), 'Valor Convertido'];
                        }
                        return [value, name === 'orcamentos' ? 'Orçamentos' : 
                                      name === 'aprovados' ? 'Aprovados' : 'Convertidos'];
                      }}
                      contentStyle={{ 
                        borderRadius: '8px', 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        border: 'none'
                      }} 
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="orcamentos" name="Orçamentos" fill="#FF9800" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="aprovados" name="Aprovados" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="convertidos" name="Convertidos" fill="#2196F3" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="valor" name="Valor (R$)" fill="#9C27B0" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <AccessTime sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Não há dados suficientes para exibir o gráfico
                  </Typography>
                </Box>
              )}
            </Box>
          </ChartContainer>
        </Grid>
        
        {/* Gráfico de Pizza */}
        <Grid item xs={12} md={4}>
          <ChartContainer sx={{ position: 'relative', minHeight: 400 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
              <PieChart sx={{ mr: 1.5, color: 'primary.main' }} />
              Status dos Orçamentos
            </Typography>
            <Box sx={{ height: 350, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {loading ? (
                <CircularProgress size={40} />
              ) : pieData.some(item => item.value > 0) ? (
                <>
                  <ResponsiveContainer width="100%" height={250}>
                    <RePieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value} orçamentos`, 'Quantidade']}
                        contentStyle={{ 
                          borderRadius: '8px', 
                          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                          border: 'none'
                        }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1, mt: 2 }}>
                    {pieData.filter(entry => entry.value > 0).map((entry, index) => (
                      <Chip
                        key={`legend-${index}`}
                        label={`${entry.name}: ${entry.value}`}
                        sx={{ 
                          backgroundColor: COLORS[index % COLORS.length],
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    ))}
                  </Box>
                </>
              ) : (
                <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <CancelOutlined sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Não há dados para exibir
                  </Typography>
                </Box>
              )}
            </Box>
          </ChartContainer>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard; 