import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { getUser } from '../../services/authService';
import {
  Grid,
  Typography,
  TextField,
  Button,
  Paper,
  Box,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardHeader,
  Autocomplete,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Snackbar,
  Tooltip,
  Chip,
  FormHelperText,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  Tabs,
  Tab,
  Badge,
  Avatar,
  SwipeableDrawer,
  useTheme,
  useMediaQuery,
  Collapse
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  ShoppingCart as ShoppingCartIcon,
  Warning as WarningIcon,
  AccountCircle as AccountCircleIcon,
  Storefront as StorefrontIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  LocalOffer as LocalOfferIcon,
  Calculate as CalculateIcon,
  ProductionQuantityLimits as ProductionQuantityLimitsIcon,
  ShoppingBasket as ShoppingBasketIcon,
  PointOfSale as PointOfSaleIcon,
  CreditCard as CreditCardIcon,
  Search as SearchIcon,
  CategoryOutlined as CategoryIcon,
  Inventory2Outlined as InventoryIcon,
  ShoppingBasketOutlined as CartIcon,
  AddCircleOutline as AddCircleIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  ArrowBack as ArrowBackIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Description as DescriptionIcon,
  LocalShipping as LocalShippingIcon,
  Edit as EditIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { FaSearch } from 'react-icons/fa';
import { PDFDownloadLink } from '@react-pdf/renderer';
import OrcamentoPDF from '../../components/OrcamentoPDF';

// Componentes e serviços
import { 
  clientesAPI, 
  produtosAPI, 
  fiscalAPI,
  vendedoresAPI, 
  pagamentosAPI, 
  orcamentosAPI,
  configurationAPI
} from '../../services/api';
import api from '../../services/api';
import itemService from '../../services/itemService';
import transportadoraService from '../../services/transportadoraService';
import DuplicateItemModal from '../../components/DuplicateItemModal';

// Componente de Informações Fiscais
import FiscalInfo from '../../components/FiscalInfo';

// Importar as funções de cálculo fiscal
import { calcularTributos } from '../../utils/calculoFiscal';
import { formatOrcamentoCodigo } from '../../utils';

// Importar o SweetAlert2
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import 'animate.css';

// Função de arredondamento para evitar problemas de precisão de ponto flutuante
const arredondar = (valor, casas = 2) => {
  // Converter para número e verificar se é válido
  const numeroValido = Number(valor);
  
  if (numeroValido === 0 || isNaN(numeroValido)) {
    return 0;
  }
  
  // Converter para string com número fixo de casas decimais e converter de volta para número
  // Isso garante que não haja valores como 235.10000000000002
  const valorString = numeroValido.toFixed(casas);
  return parseFloat(valorString);
};

// Formatador de números com arredondamento seguro
const formatCurrency = (value) => {
  if (!value && value !== 0) return '';
  const valueFormatted = arredondar(value, 2);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valueFormatted);
};

const formatPercent = (value) => {
  if (!value && value !== 0) return '';
  const valueFormatted = arredondar(value, 2);
  return `${valueFormatted}%`;
};

// Adicionar esta função após as definições de formatadores
const debounce = (func, delay) => {
  let timeoutId;
  return function(...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

// Adicionar após a definição de debounce uma função de debug
const logDebugInfo = (titulo, dados) => {
  console.log(`================ DEBUG INFO: ${titulo} ================`);
  console.table(dados);
  console.log('========================================================');
};

// Componentes estilizados modernos
const StyledSection = styled(Paper)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius * 2,
  overflow: 'hidden',
  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
  marginBottom: theme.spacing(3),
  transition: 'box-shadow 0.3s ease',
      '&:hover': {
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.08)',
      }
}));

const SectionHeader = styled(Box)(({ theme, bgcolor = 'primary.main' }) => ({
  padding: theme.spacing(2),
  background: `linear-gradient(90deg, ${theme.palette[bgcolor.split('.')[0]][bgcolor.split('.')[1]]} 0%, ${alpha(theme.palette[bgcolor.split('.')[0]][bgcolor.split('.')[1]], 0.8)} 100%)`,
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2)
}));

const SectionContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: '10px',
  padding: '10px 24px',
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.95rem',
  boxShadow: 'none',
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0))',
    opacity: 0,
    transition: 'opacity 0.3s ease',
  },
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
    '&::after': {
      opacity: 1,
    },
  },
  '&:active': {
    transform: 'translateY(0)',
  },
  '&.Mui-disabled': {
    backgroundColor: '#e0e0e0',
    color: '#9e9e9e',
  },
  // Variantes de cor
  '&.primary': {
    background: 'linear-gradient(45deg, #1976d2, #2196f3)',
    color: 'white',
    '&:hover': {
      background: 'linear-gradient(45deg, #1565c0, #1976d2)',
    },
  },
  '&.success': {
    background: 'linear-gradient(45deg, #2e7d32, #43a047)',
    color: 'white',
    '&:hover': {
      background: 'linear-gradient(45deg, #1b5e20, #2e7d32)',
    },
  },
  '&.warning': {
    background: 'linear-gradient(45deg, #f57c00, #ff9800)',
    color: 'white',
    '&:hover': {
      background: 'linear-gradient(45deg, #e65100, #f57c00)',
    },
  },
  '&.error': {
    background: 'linear-gradient(45deg, #d32f2f, #f44336)',
    color: 'white',
    '&:hover': {
      background: 'linear-gradient(45deg, #c62828, #d32f2f)',
    },
  },
  '&.outlined': {
    background: 'transparent',
    border: '2px solid',
    borderColor: theme.palette.primary.main,
    color: theme.palette.primary.main,
    '&:hover': {
      background: 'rgba(25, 118, 210, 0.04)',
      borderColor: theme.palette.primary.dark,
    },
  },
  // Tamanhos
  '&.small': {
    padding: '6px 16px',
    fontSize: '0.875rem',
  },
  '&.large': {
    padding: '12px 32px',
    fontSize: '1rem',
  },
  // Estilo para botões com ícones
  '& .MuiSvgIcon-root': {
    marginRight: '8px',
    fontSize: '1.2em',
    transition: 'transform 0.2s ease',
  },
  '&:hover .MuiSvgIcon-root': {
    transform: 'scale(1.1)',
  },
  // Estilo para loading
  '& .MuiCircularProgress-root': {
    marginRight: '8px',
    color: 'inherit',
  },
}));

// Botão de Ação Principal
const ActionButton = styled(StyledButton)(({ theme }) => ({
  width: '100%',
  marginBottom: theme.spacing(2),
  minHeight: '48px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(1),
  '& .button-content': {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
}));

// Botão de Adicionar Item
// Botão de Adicionar Item com estilo condicional
const AddItemButton = styled(StyledButton)(({ theme }) => ({
  height: 56,
  width: '100%',
  '&.modoEdicao': {
    background: 'linear-gradient(45deg, #2196f3, #1976d2)', // Azul para edição
    '&:hover': {
      background: 'linear-gradient(45deg, #1976d2, #0d47a1)', // Azul escuro para hover em edição
    },
  },
  '&.modoAdicao': {
    background: 'linear-gradient(45deg, #9c27b0, #7b1fa2)', // Roxo para adição
    '&:hover': {
      background: 'linear-gradient(45deg, #7b1fa2, #6a1b9a)', // Roxo escuro para hover em adição
    },
  },
  '&.Mui-disabled': {
    background: '#e0e0e0',
    color: '#9e9e9e',
  },
}));

// Styled input fields
const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: theme.shape.borderRadius * 1.5,
    transition: 'box-shadow 0.3s',
    '&:hover': {
      boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)'
    },
    '&.Mui-focused': {
      boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.3)'
    }
  }
}));

// Card com status
const StatusCard = styled(Card)(({ theme, status }) => {
  const colors = {
    APROVADO: theme.palette.success.light,
    PENDENTE: theme.palette.warning.light,
    CONVERTIDO: theme.palette.info.light,
    CANCELADO: theme.palette.error.light
  };
  
  return {
    border: `1px solid ${colors[status] || theme.palette.divider}`,
    borderLeft: `4px solid ${colors[status] || theme.palette.primary.main}`,
    borderRadius: theme.shape.borderRadius * 1.5,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    transition: 'all 0.3s ease',
    '&:hover': {
      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
      transform: 'translateY(-2px)'
    }
  };
});

// Componente para indicar se um produto tem ST
const STBadge = ({ temST, showDetails = false }) => {
  if (temST) {
    return (
      <Tooltip title="Este produto possui Substituição Tributária (ST). O imposto já foi recolhido em etapa anterior da cadeia.">
        <Chip 
          color="error" 
          size="small"
          icon={<WarningIcon fontSize="small" />}
          label="ST" 
          sx={{ 
            fontWeight: 'bold',
            fontSize: '0.75rem',
            height: 24,
            animation: showDetails ? 'pulse 1.5s infinite' : 'none',
            '@keyframes pulse': {
              '0%': { boxShadow: '0 0 0 0 rgba(211, 47, 47, 0.4)' },
              '70%': { boxShadow: '0 0 0 6px rgba(211, 47, 47, 0)' },
              '100%': { boxShadow: '0 0 0 0 rgba(211, 47, 47, 0)' }
            }
          }}
        />
      </Tooltip>
    );
  }
  
  return showDetails ? (
    <Tooltip title="Produto sem Substituição Tributária. Aplicação normal de ICMS.">
      <Chip 
        color="success" 
        size="small"
        label="Normal" 
        variant="outlined"
        sx={{
          fontSize: '0.75rem',
          height: 24
        }}
      />
    </Tooltip>
  ) : null;
};

// Componente de detalhes fiscais
const DetalheFiscal = ({ label, valor, isPercentage = false, isHighlighted = false }) => (
  <Box 
    display="flex" 
    justifyContent="space-between" 
    mb={1}
    p={0.5}
    sx={{
      borderRadius: 1,
      backgroundColor: isHighlighted ? 'rgba(0, 0, 0, 0.03)' : 'transparent',
      '&:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
      }
    }}
  >
    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400 }}>
      {label}:
    </Typography>
    <Typography 
      variant="body2" 
      sx={{ 
        fontWeight: isHighlighted ? 600 : 500,
        color: isHighlighted ? 'primary.main' : 'text.primary'
      }}
    >
      {isPercentage 
        ? formatPercent(valor)
        : valor}
    </Typography>
  </Box>
);

// Componente principal de vendas
const TelaVendas = () => {
  // Estados para transportadora
  const [transportadoras, setTransportadoras] = useState([]);
  const [transportadoraSelecionada, setTransportadoraSelecionada] = useState(null);
  const [searchTransportadoraTerm, setSearchTransportadoraTerm] = useState('');
  const [searchingTransportadora, setSearchingTransportadora] = useState(false);
  const [transportadoraFilter, setTransportadoraFilter] = useState('');
  const [selectMenuOpen, setSelectMenuOpen] = useState(false);
  
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  
  // Adicionar estados específicos para diferentes tipos de loading
  const [loadingProduto, setLoadingProduto] = useState(false);
  const [loadingFiscal, setLoadingFiscal] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  
  // Adicionar estados específicos para diferentes tipos de loading
  const [loadingApprove, setLoadingApprove] = useState(false);
  const [loadingConvert, setLoadingConvert] = useState(false);
  
  // Estados para dados
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [condicoesPagamento, setCondicoesPagamento] = useState([]);
  
  // Estados para o formulário
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [vendedorSelecionado, setVendedorSelecionado] = useState(null);
  const [formaPagamentoSelecionada, setFormaPagamentoSelecionada] = useState('');
  const [condicaoPagamentoSelecionada, setCondicaoPagamentoSelecionada] = useState('');
  const [observacoes, setObservacoes] = useState('');
  
  // Estado para itens do orçamento
  const [itensOrcamento, setItensOrcamento] = useState([]);
  const [produtoTemp, setProdutoTemp] = useState(null);
  const [quantidadeTemp, setQuantidadeTemp] = useState(1);
  const [valorUnitarioTemp, setValorUnitarioTemp] = useState(0);
  const [descontoTemp, setDescontoTemp] = useState(0);
  
  // Estado para controlar a edição de item existente
  const [itemEditandoIndex, setItemEditandoIndex] = useState(null);
  const [modoEdicaoItem, setModoEdicaoItem] = useState(false);
  
  // Estado para totais
  const [totais, setTotais] = useState({
    valorProdutos: 0,
    valorDesconto: 0,
    valorComDesconto: 0,
    valorIpi: 0,
    valorSt: 0,
    valorTotal: 0
  });
  
  // Estado para dados fiscais
  const [dadosFiscais, setDadosFiscais] = useState(null);
  
  // Novo estado para substituição tributária
  const [infoST, setInfoST] = useState(null);
  const [verificandoST, setVerificandoST] = useState(false);
  
  // Novo estado para estoque do produto
  const [estoqueProduto, setEstoqueProduto] = useState(null);
  const [carregandoEstoque, setCarregandoEstoque] = useState(false);
  
  // Novo estado para indicar se é edição
  const [isEdicao, setIsEdicao] = useState(false);
  const [orcamentoCodigo, setOrcamentoCodigo] = useState(null);
  
  // Adicionar os estados que estão faltando
  const [dadosOrcamento, setDadosOrcamento] = useState({});
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  
  // Novo estado para filtragem de produtos
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [inputValue, setInputValue] = useState('');
  const autocompleteOpen = useRef(false);
  const cacheResultados = useRef({});
  
  // Novo estado para controlar a conversão do orçamento em pedido
  const [convertendoOrcamento, setConvertendoOrcamento] = useState(false);
  
  // Adicionar um novo estado para controlar o loading de filtragem de produtos
  const [filtrando, setFiltrando] = useState(false);
  
  // Adicionar estado para dados do PDF
  const [dadosPDF, setDadosPDF] = useState(null);
  const [loadingPDF, setLoadingPDF] = useState(false);
  
  // Adicionar um estado de busca de cliente e cache para melhorar performance
  const [clienteSearchTerm, setClienteSearchTerm] = useState('');
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const clientesCache = useRef({});
  const prevVendedorId = useRef(null);
  
  // Estado para controlar a validação de estoque
  const [validateStockInQuotations, setValidateStockInQuotations] = useState(false);
  
  // Estados para o modal de itens duplicados
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateItem, setDuplicateItem] = useState(null);
  const [newItem, setNewItem] = useState(null);
  
  // Adicionar um cache para transportadoras
  const transportadorasCache = useRef({});
  const transportadorasTodasCache = useRef([]);
  
  // Carregar dados iniciais
  useEffect(() => {
    const user = getUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setUsuarioLogado(user);

    // Se for vendedor, já definir o vendedor selecionado
    if (user.vendedor) {
      setVendedorSelecionado(user.vendedor);
      // Carregar os clientes deste vendedor automaticamente
      carregarClientesPorVendedor(user.vendedor.codigo);
        }

    // Carregar dados gerais
    carregarDados();
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Verificar permissão para acessar o orçamento
  const verificarPermissaoAcesso = useCallback((orcamento) => {
    if (!usuarioLogado) return false;
    
    // Se for admin, tem acesso a tudo
    if (usuarioLogado.role === 'admin') return true;
    
    // Se for vendedor, só pode ver seus próprios orçamentos
    if (usuarioLogado.vendedor && orcamento) {
      const temPermissao = usuarioLogado.vendedor.codigo === orcamento.cod_vendedor;
      if (!temPermissao) {
        console.log(`Vendedor ${usuarioLogado.vendedor.codigo} não tem permissão para acessar orçamento do vendedor ${orcamento.cod_vendedor}`);
      }
      return temPermissao;
      }
    
    return false;
  }, [usuarioLogado]);
  
  // Função para carregar orçamento existente (para edição)
  const carregarOrcamento = async (id) => {
    setLoading(true);
    try {
      const response = await orcamentosAPI.obterPorId(id);
      if (response && response.data) {
        const orcamento = response.data;
        console.log('Orçamento carregado:', orcamento);
        
        // Atualizar estado com dados do orçamento
        setDadosOrcamento(orcamento);
        setOrcamentoCodigo(orcamento.codigo);
        setObservacoes(orcamento.observacoes || '');
        
        // Importante: setar explicitamente os valores das formas e condições de pagamento
        console.log(`Forma de pagamento do orçamento: ${orcamento.form_pagto}`);
        console.log(`Condição de pagamento do orçamento: ${orcamento.cond_pagto}`);
        
        setFormaPagamentoSelecionada(orcamento.form_pagto);
        setCondicaoPagamentoSelecionada(orcamento.cond_pagto);
        
        // Carregar os detalhes das formas e condições para o cache se necessário
        if (orcamento.form_pagto) {
          await handleFormaPagamentoSelect(orcamento.form_pagto);
        }
        
        if (orcamento.cond_pagto) {
          await handleCondicaoPagamentoSelect(orcamento.cond_pagto);
        }
        
        // Verificar se há transportadora selecionada no orçamento
        if (orcamento.cod_transportadora) {
          setTransportadoraSelecionada({
            codigo: orcamento.cod_transportadora,
            nome: orcamento.nome_transportadora || 'Transportadora'
          });
        }
        
        // Se o orçamento tiver itens, atualizá-los
        if (orcamento.itens && orcamento.itens.length > 0) {
          console.log('Itens do orçamento:', orcamento.itens);
          setItensOrcamento(orcamento.itens);
        }
        
        // Se o orçamento tiver vendedor, carregá-lo primeiro e seus clientes vinculados
        if (orcamento.cod_vendedor) {
          console.log('Carregando vendedor do orçamento:', orcamento.cod_vendedor);
            
          // Buscar e selecionar o vendedor primeiro
          await handleVendedorSelect(orcamento.cod_vendedor);
          
          // Aguardar um momento para garantir que os clientes foram carregados pelo vendedor
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Depois de selecionar o vendedor e carregar seus clientes, selecionar o cliente do orçamento
          if (orcamento.cod_cliente) {
            console.log('Carregando cliente do orçamento:', orcamento.cod_cliente);
            try {
              // Buscar cliente diretamente para garantir que temos todos os dados
              const clienteCompleto = await buscarClientePorCodigo(orcamento.cod_cliente);
              console.log('Cliente completo carregado:', clienteCompleto);
              
              if (clienteCompleto) {
                // Estruturar os dados do cliente para o formato esperado pelo componente
                const clienteProcessado = {
                  ...clienteCompleto,
                  // Criar objeto endereco com os campos de endereço
                  endereco: {
                    logradouro: clienteCompleto.logradouro || '',
                    numero: clienteCompleto.logradouro_num || '',
                    complemento: clienteCompleto.complemento || '',
                    bairro: clienteCompleto.bairro || '',
                    cidade: clienteCompleto.municipio || '',
                    uf: clienteCompleto.uf || '',
                    cep: clienteCompleto.cep || ''
                  },
                  // Criar objeto contato com os campos de contato
                  contato: {
                    telefone: clienteCompleto.ddd_fone1 && clienteCompleto.fone1 ? 
                      `(${clienteCompleto.ddd_fone1}) ${clienteCompleto.fone1}` : '',
                    celular: clienteCompleto.ddd_celular && clienteCompleto.celular ? 
                      `(${clienteCompleto.ddd_celular}) ${clienteCompleto.celular}` : '',
                    email: clienteCompleto.email || ''
                  },
                  _dadosCompletos: true
                };
                
                console.log('Cliente processado para o orçamento:', clienteProcessado);
                setClienteSelecionado(clienteProcessado);
              } else {
                console.error(`Cliente ${orcamento.cod_cliente} não encontrado`);
                exibirNotificacao(`Cliente do orçamento não encontrado (código ${orcamento.cod_cliente})`, 'warning');
              }
            } catch (clienteError) {
              console.error('Erro ao carregar cliente do orçamento:', clienteError);
              exibirNotificacao('Erro ao carregar cliente do orçamento', 'error');
            }
          }
        } else {
          // Se não tiver vendedor, tentar carregar o cliente diretamente
          if (orcamento.cod_cliente) {
            console.log('Carregando cliente do orçamento sem vendedor:', orcamento.cod_cliente);
            await handleClienteSelect(orcamento.cod_cliente);
          }
        }
          
        // Atualizar totais
        if (orcamento.totais) {
          console.log('Totais do orçamento:', orcamento.totais);
          setTotais({
            valorProdutos: orcamento.totais.valor_produtos || 0,
            valorDesconto: orcamento.totais.valor_descontos || 0,
            valorComDesconto: orcamento.totais.valor_liquido || 0,
            valorIpi: orcamento.totais.valor_ipi || 0,
            valorSt: orcamento.totais.valor_st || 0,
            valorTotal: orcamento.totais.valor_total || 0
          });
        } else if (orcamento.itens && orcamento.itens.length > 0) {
          // Se não tiver totais, mas tiver itens, calcular totais
          atualizarTotais(orcamento.itens);
        }
        
        // Log para verificar se os dados foram carregados corretamente
        console.log('Estado após carregar orçamento:', {
          clienteSelecionado,
          vendedorSelecionado,
          formaPagamentoSelecionada,
          condicaoPagamentoSelecionada,
          itensOrcamento: itensOrcamento.length
        });
      } else {
        setError('Orçamento não encontrado ou sem dados');
      }
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error);
      setError(`Erro ao carregar orçamento: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Buscar dados fiscais quando selecionar um produto
  useEffect(() => {
    const buscarDadosFiscais = async () => {
      if (!produtoTemp) {
        setDadosFiscais(null);
        setInfoST(null);
        return;
      }
      
      setLoadingFiscal(true);
      try {
        console.log(`Buscando dados fiscais para o produto ${produtoTemp.codigo}...`);
        
        // Chamar a API para buscar dados fiscais
        const responseFiscal = await fiscalAPI.buscarDadosFiscaisProdutoResiliente(produtoTemp.codigo);
        
        console.log('Resposta completa fiscal:', responseFiscal);
        
        // Processar dados fiscais - extrair dados corretamente conforme formato da resposta
        let dadosFiscaisProcessados = null;
        
        if (responseFiscal && responseFiscal.success) {
          // Se tivermos dados no formato .data
          dadosFiscaisProcessados = responseFiscal.data;
        } else if (responseFiscal && responseFiscal.data) {
          // Se for o formato antigo onde response.data contém os dados diretos
          dadosFiscaisProcessados = responseFiscal.data;
          
          // Se tiver outro nível de aninhamento com success/data
          if (responseFiscal.data.success && responseFiscal.data.data) {
            dadosFiscaisProcessados = responseFiscal.data.data;
          }
        }
        
        console.log('Dados fiscais processados:', dadosFiscaisProcessados);
        
        if (dadosFiscaisProcessados) {
          setDadosFiscais(dadosFiscaisProcessados);
          setError(null);
        } else {
          console.log('Sem dados fiscais para este produto');
          setDadosFiscais(null);
          setInfoST(null);
          setError('Não foram encontrados dados fiscais para este produto.');
        }
      } catch (error) {
        console.error('Erro ao buscar dados fiscais:', error);
        setError(`Falha ao buscar dados fiscais do produto: ${error.message}`);
      } finally {
        setLoadingFiscal(false);
      }
    };
    
    if (produtoTemp) {
      buscarDadosFiscais();
    }
  }, [produtoTemp]);
  
  // Adicionar um novo useEffect para verificar ST quando o cliente mudar
  useEffect(() => {
    const verificarSTParaClienteSelecionado = async () => {
      // Verificar Substituição Tributária apenas se tivermos cliente e produto selecionados
      if (produtoTemp && clienteSelecionado && clienteSelecionado.uf) {
        // Determinar o tipo do cliente para verificação ST
        const tipoCliente = determinarContribuinteCliente(clienteSelecionado) ? '1' : '0';
        
        await verificarSubstituicaoTributaria(produtoTemp.codigo, clienteSelecionado.uf, tipoCliente);
      } else {
        // Se não temos cliente ou produto, limpar informações de ST
        if (!clienteSelecionado || !produtoTemp) {
          setInfoST(null);
        }
      }
    };
    
    verificarSTParaClienteSelecionado();
  }, [clienteSelecionado, produtoTemp]);
  
  // Buscar posição de estoque quando um produto é selecionado
  useEffect(() => {
    const buscarEstoqueProduto = async () => {
      if (!produtoTemp) {
        setEstoqueProduto(null);
        return;
      }
      
      setCarregandoEstoque(true);
      try {
        console.log(`Buscando posição de estoque para o produto ${produtoTemp.codigo}...`);
        
        // Chamar a API para buscar posição de estoque
        const responseEstoque = await produtosAPI.obterPosicaoEstoque(produtoTemp.codigo);
        
        console.log('Resposta posição de estoque:', responseEstoque);
        
        if (responseEstoque && responseEstoque.data) {
          // Processar e mostrar os dados recebidos
          console.log('Definindo estoque do produto:', responseEstoque.data);
          setEstoqueProduto(responseEstoque.data);
        } else {
          console.log('Nenhum dado de estoque disponível');
          setEstoqueProduto(null);
        }
      } catch (error) {
        console.error('Erro ao buscar posição de estoque:', error);
        setEstoqueProduto(null);
      } finally {
        setCarregandoEstoque(false);
      }
    };
    
    buscarEstoqueProduto();
  }, [produtoTemp]);
  
  // Função para verificar substituição tributária
  const verificarSubstituicaoTributaria = async (codigoProduto, uf, tipoCliente) => {
    if (!codigoProduto || !uf) return;
    
    setVerificandoST(true);
    try {
      console.log(`Verificando ST para produto ${codigoProduto} na UF ${uf}, tipo cliente: ${tipoCliente}`);
      
      // Chamar a API com o parâmetro tipo_cliente
      const responseST = await fiscalAPI.verificarSubstituicaoTributaria(
        codigoProduto, 
        uf, 
        tipoCliente
      );
      
      console.log('Resposta da verificação de ST:', responseST);
      
      if (responseST && responseST.success !== false) {
        // CORREÇÃO: Identificar ST apenas por icms_st='S' ou CSTs específicos
        // Inicializar temST como false
        responseST.temST = false;
        
        // Verificar de onde veio a informação de ST e como interpretá-la
        if (responseST.detalhes) {
          console.log(`Origem da informação de ST: ${responseST.detalhes.origem || 'desconhecida'}`);
          
          // Se o campo icms_st for 'S', isso indica que tem ST
          if (responseST.detalhes.icmsSt === 'S') {
            responseST.temST = true;
            console.log('Produto tem ST baseado no campo icms_st="S"');
          }
          
          // CSTs que indicam Substituição Tributária
          const cstsComST = ['10', '30', '60', '70', '201', '202', '203'];
          
          // Verificar também pelo CST
          if (responseST.detalhes.cstIcms && cstsComST.includes(responseST.detalhes.cstIcms)) {
            responseST.temST = true;
            console.log(`Produto tem ST baseado no CST ${responseST.detalhes.cstIcms}`);
          }
          
          // Verificação adicional para produtos específicos
          const produtosEspeciaisComST = ['26/A', '60/B', '99/C']; // Exemplos fictícios
          if (produtosEspeciaisComST.includes(codigoProduto)) {
            responseST.temST = true;
            console.log(`Produto ${codigoProduto} é um caso especial que tem ST independente de outras configurações`);
          }
          
          // Verificar se o produto é importado
          if (responseST.detalhes.isImportado) {
            console.log(`Produto ${codigoProduto} é importado. Usando IVA importado se disponível.`);
            responseST.detalhes.isImportado = true;
          }
          
          // Remover verificação baseada em IVA e alíquota interna
          console.log(`Status final de ST para produto ${codigoProduto} em ${uf}: ${responseST.temST ? 'TEM ST' : 'NÃO TEM ST'}`);
        }
        
        setInfoST(responseST);
      } else {
        setInfoST(null);
      }
    } catch (error) {
      console.error('Erro ao verificar ST:', error);
      setInfoST(null);
    } finally {
      setVerificandoST(false);
    }
  };
  
  // Adicionar uma função auxiliar para determinar se um cliente é contribuinte
  // Esta função será usada para inferir o status de contribuinte sem depender do campo na tabela
  const determinarContribuinteCliente = (cliente) => {
    // Se já temos a informação explícita de contribuinte
    if (cliente.contribuinte !== undefined && cliente.contribuinte !== null) {
      // Verificar diferentes formatos
      if (typeof cliente.contribuinte === 'string') {
        return cliente.contribuinte.toUpperCase() === 'S' || 
               cliente.contribuinte === '1' || 
               cliente.contribuinte.toUpperCase() === 'SIM';
      } else if (typeof cliente.contribuinte === 'number') {
        return cliente.contribuinte === 1;
      } else if (typeof cliente.contribuinte === 'boolean') {
        return cliente.contribuinte;
      }
    }
    
    // Inferir pelo CNPJ e Inscrição Estadual
    const temCNPJ = cliente.cnpj && cliente.cnpj.length > 11; // CNPJ tem mais de 11 dígitos
    const temIE = cliente.insc_est && cliente.insc_est.trim() !== '';
    return temCNPJ && temIE;
  };
  
  // Função para adicionar um item ao orçamento
  const adicionarItem = async () => {
    if (!produtoTemp) {
      setError('Selecione um produto para adicionar ao orçamento');
      return;
    }
    
    if (!quantidadeTemp || quantidadeTemp <= 0) {
      setError('A quantidade deve ser maior que zero');
      return;
    }
    
    if (!valorUnitarioTemp || valorUnitarioTemp <= 0) {
      setError('O valor unitário deve ser maior que zero');
      return;
    }
    
    try {
      setLoadingProduto(true);
      
      // Determinar qual unidade está sendo usada (unidade ou unidade2)
      const isUsingUnidade2 = produtoTemp.preco_venda2 && 
                              parseFloat(valorUnitarioTemp) === parseFloat(produtoTemp.preco_venda2);
      
      const unidadeUtilizada = isUsingUnidade2 ? produtoTemp.unidade2 : produtoTemp.unidade;
      
      // DEBUG: Verificar UF do cliente para logging
      if (clienteSelecionado && clienteSelecionado.uf) {
        console.log(`DEBUG: Cliente do estado ${clienteSelecionado.uf} detectado. Aplicando regras fiscais específicas.`);
      }
      
      // Verificar estoque disponível apenas se a validação estiver ativada
      if (validateStockInQuotations) {
        const estoqueResponse = await produtosAPI.obterPosicaoEstoque(produtoTemp.codigo);
        const estoqueDisponivel = parseFloat(estoqueResponse.data?.qtd_disponivel) || 0;
        
        // Verificar se há estoque suficiente
        if (quantidadeTemp > estoqueDisponivel) {
          setError(`Estoque insuficiente para o produto ${produtoTemp.codigo}. Disponível: ${estoqueDisponivel}, Solicitado: ${quantidadeTemp}`);
          setLoadingProduto(false);
          return;
        }
      }
      
      // Continuar com a busca de dados fiscais
      // 1. Buscar dados fiscais completos do produto
      const dadosFiscaisResponse = await fiscalAPI.buscarDadosFiscaisProdutoResiliente(produtoTemp.codigo);
      let dadosFiscais = null;
      
      console.log('Resposta dos dados fiscais resilientes:', dadosFiscaisResponse);
      
      if (dadosFiscaisResponse && dadosFiscaisResponse.success) {
        dadosFiscais = dadosFiscaisResponse.data;
      } else if (dadosFiscaisResponse && dadosFiscaisResponse.data) {
        dadosFiscais = dadosFiscaisResponse.data;
        
        if (dadosFiscaisResponse.data.success && dadosFiscaisResponse.data.data) {
          dadosFiscais = dadosFiscaisResponse.data.data;
        }
      }
      
      if (!dadosFiscais) {
        setError(`Não foi possível obter dados fiscais para o produto ${produtoTemp.codigo}`);
        setLoadingProduto(false);
        return;
      }
      
      // 2. Verificar se o produto tem ST
      let temST = false;
      let dadosClassificacao = null;
      let isImportado = false; // Adicionar flag para produtos importados
      
      if (clienteSelecionado && clienteSelecionado.uf) {
        // Se ainda não verificamos ST para este produto, verificar agora
        if (!infoST) {
          await verificarSubstituicaoTributaria(
            produtoTemp.codigo, 
            clienteSelecionado.uf, 
            determinarContribuinteCliente(clienteSelecionado) ? '1' : '0'
          );
        }
        
        // Usar a informação de ST que já temos
        if (infoST) {
          temST = infoST.temST || false;
          
          // Verificar se o produto é importado
          if (infoST.detalhes && infoST.detalhes.isImportado) {
            isImportado = true;
            console.log(`Produto ${produtoTemp.codigo} é importado. Flag isImportado definida.`);
          }
          
          // Verificar também pelas informações detalhadas, para manter consistência com o backend
          if (infoST.detalhes) {
            // Se o campo icms_st for 'S', isso indica que tem ST
            if (infoST.detalhes.icmsSt === 'S' && !temST) {
              temST = true;
              console.log('Produto tem ST baseado no campo icms_st="S" (adicionarItem)');
            }
            
            // Salvar outras informações úteis dos detalhes para o cálculo
            if (infoST.detalhes.aliqIcms) {
              dadosFiscais.aliq_icms = infoST.detalhes.aliqIcms;
            }
            
            if (infoST.detalhes.cstIcms) {
              dadosFiscais.st_icms = infoST.detalhes.cstIcms;
            }
            
            // Salvar o campo icms_st no objeto de dados fiscais
            dadosFiscais.icms_st = infoST.detalhes.icmsSt || 'N';
          }
        }
        
        // 3. Se tem ST ou se tem código de NCM, buscar dados de classificação fiscal
        if ((temST || dadosFiscais.class_fiscal) && clienteSelecionado.uf) {
          try {
            const classResponse = await fiscalAPI.buscarClassificacaoFiscal({
              ncm: dadosFiscais.class_fiscal,
              uf: clienteSelecionado.uf,
              ufEmpresa: 'SP', // UF padrão da empresa
              incluirTributacoes: true, // Para obter IVA e CEST
              isImportado: isImportado // Passar flag de produto importado
            });
            
            console.log('Dados de classificação fiscal:', classResponse);
            
            if (classResponse && classResponse.success && classResponse.data) {
              dadosClassificacao = classResponse.data;
              
              // Se for produto importado, usar iva_importado em vez de iva padrão
              if (isImportado && dadosClassificacao.iva_importado !== undefined && dadosClassificacao.iva_importado > 0) {
                console.log(`Usando IVA importado (${dadosClassificacao.iva_importado}) em vez do IVA padrão (${dadosClassificacao.iva})`);
                dadosClassificacao.iva_original = dadosClassificacao.iva;
                dadosClassificacao.iva = dadosClassificacao.iva_importado;
              }
            }
          } catch (classError) {
            console.error('Erro ao buscar dados de classificação fiscal:', classError);
            // Continuar sem os dados de classificação
          }
        }
      } else {
        // Se não temos cliente selecionado, exibir aviso mas permitir adicionar o item
        console.warn('Cliente não selecionado. Os cálculos fiscais serão realizados com configurações padrão.');
        exibirNotificacao('Cliente não selecionado. Os cálculos fiscais podem não estar corretos.', 'warning');
      }
      
      // Garantir que aliq_ipi seja um número válido
      const aliqIpi = parseFloat(dadosFiscais.aliq_ipi);
      dadosFiscais.aliq_ipi = isNaN(aliqIpi) ? 0 : aliqIpi;
      
      console.log('Dados fiscais processados para adicionar item:', {
        produto: produtoTemp.codigo,
        aliq_icms: dadosFiscais.aliq_icms,
        aliq_ipi: dadosFiscais.aliq_ipi,
        temST,
        isImportado,
        dadosClassificacao
      });
      
      // 4. Calcular tributos usando a nova função
      const itemTemp = {
        produto_codigo: produtoTemp.codigo,
        quantidade: quantidadeTemp,
        valor_unitario: valorUnitarioTemp,
        desconto: descontoTemp,
        isImportado // Adicionar flag de produto importado ao item
      };
      
      let dadosTributos = {
        aliq_icms: parseFloat(dadosFiscais.aliq_icms) || 0,
        aliq_ipi: parseFloat(dadosFiscais.aliq_ipi) || 0,
        valor_icms: 0,
        valor_ipi: 0,
        valor_icms_st: 0,
        isImportado // Adicionar flag de produto importado
      };
      
      // Usar nova função de cálculo se tivermos cliente e dados fiscais
      if (clienteSelecionado && clienteSelecionado.uf) {
        // Calcular usando a função local
        if (dadosFiscais) {
          const resultadoCalculo = calcularTributos(
            itemTemp, 
            dadosFiscais, 
            dadosClassificacao, 
            clienteSelecionado.uf, 
            'SP', // UF padrão da empresa
            isImportado // Passar flag de produto importado
          );
          
          console.log('Resultado do cálculo de tributos local:', resultadoCalculo);
          
          // Atualizar dados de tributos com base no cálculo local
          dadosTributos = {
            aliq_icms: resultadoCalculo.aliqIcms,
            aliq_ipi: resultadoCalculo.aliqIpi,
            valor_icms: resultadoCalculo.valorIcms,
            valor_ipi: resultadoCalculo.valorIpi,
            valor_icms_st: resultadoCalculo.valorIcmsSt + resultadoCalculo.valorFcpSt,
            isImportado // Manter flag de produto importado
          };
          
          // Atualizar flag temST com base no cálculo
          temST = resultadoCalculo.temST;
        }
        
        // Como backup, também chamar a API para cálculo de tributos
        try {
        const calculoResponse = await fiscalAPI.calcularTributosResiliente({
          produto_codigo: produtoTemp.codigo,
          uf_destino: clienteSelecionado.uf || 'SP',
          quantidade: quantidadeTemp,
          valor_unitario: valorUnitarioTemp,
          isImportado // Passar flag de produto importado
        });
        
          console.log('Resposta do cálculo de tributos API:', calculoResponse);
        
          // Usar dados da API se o cálculo local não retornou ST mas a API sim
        if (calculoResponse && calculoResponse.success && calculoResponse.data) {
            // Se nosso cálculo local não retornou ST mas a API retornou valor de ST, usar os dados da API
            if (dadosTributos.valor_icms_st === 0 && calculoResponse.data.valor_icms_st > 0) {
          dadosTributos = calculoResponse.data;
              temST = true;
              // Preservar a flag isImportado
              dadosTributos.isImportado = isImportado;
            }
            // Se ambos calcularam ST, manter o que tiver maior valor de ST para segurança
            else if (dadosTributos.valor_icms_st < calculoResponse.data.valor_icms_st) {
              dadosTributos = calculoResponse.data;
              // Preservar a flag isImportado
              dadosTributos.isImportado = isImportado;
            }
          
          // Garantir que os valores sejam números
          dadosTributos.aliq_icms = parseFloat(dadosTributos.aliq_icms) || 0;
          dadosTributos.aliq_ipi = parseFloat(dadosTributos.aliq_ipi) || 0;
          dadosTributos.valor_icms = parseFloat(dadosTributos.valor_icms) || 0;
          dadosTributos.valor_ipi = parseFloat(dadosTributos.valor_ipi) || 0;
          dadosTributos.valor_icms_st = parseFloat(dadosTributos.valor_icms_st) || 0;
        }
        } catch (calculoError) {
          console.error('Erro ao calcular tributos via API:', calculoError);
          // Continuar com o cálculo local em caso de erro
        }
        
        // Verificar se precisa calcular ST
        // CORREÇÃO: Apenas verificar o campo icms_st='S' ou CSTs específicos
        let deveCalcularST = false;

        // 1. Verificar pela flag icms_st do objeto infoST
        if (infoST && infoST.temST) {
          deveCalcularST = true;
          console.log('ST detectado por flag temST');
        }
        
        // 2. Se infoST existe e tem detalhes, verificar o campo icms_st
        if (infoST && infoST.detalhes && infoST.detalhes.icmsSt === 'S') {
          deveCalcularST = true;
          console.log('ST detectado por campo icmsSt = S');
        }
        
        // 3. Verificar se o CST indica ST
        if (infoST && infoST.detalhes && infoST.detalhes.cstIcms) {
          const cstsComST = ['10', '30', '60', '70', '201', '202', '203'];
          if (cstsComST.includes(infoST.detalhes.cstIcms)) {
            deveCalcularST = true;
            console.log('ST detectado por CST', infoST.detalhes.cstIcms);
          }
        }
        
        // Verificação secundária baseada nos dados fiscais
        if (!deveCalcularST && dadosFiscais) {
          // Verificar se icms_st='S' nos dados fiscais
          if (dadosFiscais.icms_st === 'S') {
            deveCalcularST = true;
            console.log('ST detectado por icms_st=S nos dados fiscais');
          }
          
          // Verificar CST nos dados fiscais
          const cstsComST = ['10', '30', '60', '70', '201', '202', '203'];
          if (cstsComST.includes(dadosFiscais.st_icms)) {
            deveCalcularST = true;
            console.log('ST detectado por CST', dadosFiscais.st_icms, 'nos dados fiscais');
          }
        }

        console.log('Verificação final ST para produto', produtoTemp.codigo, 'resultado:', deveCalcularST);
        
        // Sempre tentar calcular o ST e usar o resultado se retornar valor > 0
        try {
          console.log('Tentando calcular ICMS-ST para', produtoTemp.codigo);
          
          // Calcular o valor do desconto corretamente usando arredondamento
          const valorProdutoSemDesconto = arredondar(valorUnitarioTemp * quantidadeTemp, 4);
          const valorDescontoCalculado = arredondar((valorProdutoSemDesconto * descontoTemp) / 100, 4);
          const valorComDesconto = arredondar(valorProdutoSemDesconto - valorDescontoCalculado, 4);
          
          const icmsStResponse = await fiscalAPI.calcularIcmsST({
            codigoProduto: produtoTemp.codigo,
            ufDestino: clienteSelecionado.uf,
            valorProduto: valorProdutoSemDesconto, // Valor bruto arredondado
            valorIpi: arredondar(dadosTributos.valor_ipi, 4),
            tipoContribuinte: determinarContribuinteCliente(clienteSelecionado),
            valorDesconto: valorDescontoCalculado, // Valor do desconto arredondado
            isImportado: isImportado // Adicionar flag de produto importado
          });
          
          console.log('Resposta do cálculo de ICMS-ST:', icmsStResponse);
          console.log('Parâmetros enviados para cálculo:', {
            codigoProduto: produtoTemp.codigo,
            valorProduto: valorProdutoSemDesconto,
            valorDesconto: valorDescontoCalculado,
            descontoPercentual: descontoTemp,
            valorFinal: valorComDesconto,
            isImportado
          });
          
          if (icmsStResponse && icmsStResponse.success) {
            // Se retornou temST=true na resposta ou valor > 0, usar esses valores
            const valorST = parseFloat(icmsStResponse.valorICMSST) || 0;
            const valorFcpST = parseFloat(icmsStResponse.valorFCPST) || 0;
            
            if (icmsStResponse.temST || valorST > 0 || valorFcpST > 0) {
              // Produto tem ST baseado no resultado do cálculo
              temST = true;
              
              // Substituir o valor de ICMS-ST calculado
              dadosTributos.valor_icms_st = valorST + valorFcpST;
              
              // Se tiver base de ICMS-ST, também armazenar
              if (icmsStResponse.baseICMSST) {
                dadosTributos.base_icms_st = parseFloat(icmsStResponse.baseICMSST) || 0;
              }
              
              console.log(`ICMS-ST calculado com precisão: ${dadosTributos.valor_icms_st}`);
            } else if (!deveCalcularST) {
              // Se não deve calcular ST e o valor retornado foi zero, garantir zero
              dadosTributos.valor_icms_st = 0;
              console.log('Produto não tem ST, garantindo valor zerado.');
            }
          }
        } catch (stError) {
          console.error('Erro ao calcular ICMS-ST específico:', stError);
          // Se tiver erro, mas sabemos que deve ter ST, mostrar um aviso
          if (deveCalcularST && dadosTributos.valor_icms_st === 0) {
            console.warn('ATENÇÃO: Produto deveria ter ST mas falhou ao calcular.');
          }
        }
      } else {
        // Se não temos cliente, calcular apenas valores básicos
        // Usar alíquotas padrão para a UF de SP
        dadosTributos.aliq_icms = parseFloat(dadosFiscais.aliq_icms) || 18; // Padrão para SP
        dadosTributos.valor_icms = (valorUnitarioTemp * quantidadeTemp * dadosTributos.aliq_icms) / 100;
        
        if (dadosFiscais.aliq_ipi) {
          dadosTributos.aliq_ipi = parseFloat(dadosFiscais.aliq_ipi);
          dadosTributos.valor_ipi = (valorUnitarioTemp * quantidadeTemp * dadosTributos.aliq_ipi) / 100;
        }
        
        console.log('Cálculos fiscais com valores padrão (cliente não selecionado):', dadosTributos);
      }
      
      console.log('Dados de tributos finais calculados:', dadosTributos);
      
      // Calcular valores
      const valorBruto = quantidadeTemp * valorUnitarioTemp;
      const valorDesconto = (valorBruto * descontoTemp) / 100;
      const valorLiquido = valorBruto - valorDesconto;
      
      // CORREÇÃO PARA GOIÁS: Forçar sem ST e alíquota de 7%
      if (clienteSelecionado && clienteSelecionado.uf === 'GO') {
        temST = false;
        dadosTributos.valor_icms_st = 0;
        dadosTributos.aliq_icms = 7;
        dadosTributos.valor_icms = (valorLiquido * 7) / 100;
        console.log('CORREÇÃO APLICADA: Produto para Goiás (GO) - Sem ST, ICMS 7%');
      }
      
      // Preparar item para adicionar à lista
      const novoItem = {
        produto: produtoTemp,
        produto_codigo: produtoTemp.codigo,
        produto_descricao: produtoTemp.nome,
        quantidade: quantidadeTemp,
        valor_unitario: valorUnitarioTemp,
        desconto: descontoTemp,
        valor_bruto: valorBruto,
        valor_desconto: valorDesconto,
        valor_liquido: valorLiquido,
        aliq_icms: dadosTributos.aliq_icms,
        aliq_ipi: dadosTributos.aliq_ipi,
        valor_icms: dadosTributos.valor_icms,
        valor_ipi: dadosTributos.valor_ipi,
        valor_icms_st: dadosTributos.valor_icms_st,
        temST, // Adicionar informação de ST ao item
        isImportado, // Adicionar flag de produto importado ao item
        unidade: unidadeUtilizada, // Adicionar a unidade utilizada no item
        isUnidade2: isUsingUnidade2 // Flag para indicar se está usando a unidade2
      };
      
      console.log('Novo item sendo adicionado:', novoItem);
      
      // Verificar se o item já existe usando o serviço de validação de itens duplicados
      // Primeiro verificamos localmente se há um item com o mesmo código de produto
      const itemDuplicado = itensOrcamento.find(item => item.produto_codigo === produtoTemp.codigo);
      
      if (itemDuplicado) {
        // Item duplicado encontrado, mostrar modal de confirmação
        setDuplicateItem(itemDuplicado);
        setNewItem(novoItem);
        setShowDuplicateModal(true);
        setLoadingProduto(false);
        return;
      }
      
      // Se não encontramos duplicados, adicionar normalmente
      // Adicionar à lista de itens
      setItensOrcamento([...itensOrcamento, novoItem]);
      
      // Limpar formulário temporário
      setProdutoTemp(null);
      setQuantidadeTemp(1);
      setValorUnitarioTemp(0);
      setDescontoTemp(0);
      setInfoST(null);
      
      // Atualizar totais
      atualizarTotais([...itensOrcamento, novoItem]);
      
      setError(null);
    } catch (err) {
      console.error('Erro ao adicionar item:', err);
      setError(`Erro ao adicionar item: ${err.message}`);
    } finally {
      setLoadingProduto(false);
    }
  };
  
  // Função para lidar com a resolução de itens duplicados - somar quantidades
  const handleMergeItems = () => {
    if (!duplicateItem || !newItem) return;
    
    // Criar uma cópia da lista de itens
    const novosItens = [...itensOrcamento];
    
    // Encontrar o índice do item duplicado
    const index = novosItens.findIndex(item => item.produto_codigo === duplicateItem.produto_codigo);
    
    if (index !== -1) {
      try {
        // Atualizar a quantidade e recalcular os valores
        const itemAtualizado = { ...novosItens[index] };
        const novaQuantidade = parseFloat(itemAtualizado.quantidade) + parseFloat(newItem.quantidade);
        
        // Atualizar quantidade
        itemAtualizado.quantidade = novaQuantidade;
        
        // Recalcular valores
        itemAtualizado.valor_bruto = novaQuantidade * parseFloat(itemAtualizado.valor_unitario);
        itemAtualizado.valor_desconto = (itemAtualizado.valor_bruto * parseFloat(itemAtualizado.desconto)) / 100;
        itemAtualizado.valor_liquido = itemAtualizado.valor_bruto - itemAtualizado.valor_desconto;
        
        // Recalcular impostos
        const baseCalculo = itemAtualizado.valor_liquido;
        itemAtualizado.valor_icms = (baseCalculo * parseFloat(itemAtualizado.aliq_icms)) / 100;
        itemAtualizado.valor_ipi = (baseCalculo * parseFloat(itemAtualizado.aliq_ipi)) / 100;
        
        // Recalcular ST proporcionalmente
        if (itemAtualizado.temST && parseFloat(duplicateItem.valor_icms_st) > 0) {
          // Calcular o valor de ST por unidade no item original
          const stPorUnidade = parseFloat(duplicateItem.valor_icms_st) / parseFloat(duplicateItem.quantidade);
          
          // Aplicar o valor de ST por unidade à nova quantidade total
          itemAtualizado.valor_icms_st = arredondar(stPorUnidade * novaQuantidade, 2);
          
          console.log('Recalculando ST para item somado:', {
            stPorUnidade,
            quantidadeOriginal: duplicateItem.quantidade,
            novaQuantidade,
            stOriginal: duplicateItem.valor_icms_st,
            stRecalculado: itemAtualizado.valor_icms_st
          });
        }
        
        // Atualizar o item na lista
        novosItens[index] = itemAtualizado;
        
        // Atualizar a lista de itens e os totais
        setItensOrcamento(novosItens);
        atualizarTotais(novosItens);
        
        // Limpar estados temporários
        setDuplicateItem(null);
        setNewItem(null);
        setShowDuplicateModal(false);
        
        // Limpar formulário temporário
        setProdutoTemp(null);
        setQuantidadeTemp(1);
        setValorUnitarioTemp(0);
        setDescontoTemp(0);
        setInfoST(null);
        
        // Mostrar mensagem de sucesso
        setSuccess('Quantidades somadas com sucesso!');
      } catch (error) {
        console.error('Erro ao somar quantidades:', error);
        setError(`Erro ao somar quantidades: ${error.message}`);
      }
    }
  };
  
  // Função para lidar com a resolução de itens duplicados - adicionar como novo
  const handleAddNewItem = () => {
    if (!newItem) return;
    
    try {
      // Adicionar à lista de itens
      setItensOrcamento([...itensOrcamento, newItem]);
      
      // Atualizar totais
      atualizarTotais([...itensOrcamento, newItem]);
      
      // Limpar estados temporários
      setDuplicateItem(null);
      setNewItem(null);
      setShowDuplicateModal(false);
      
      // Limpar formulário temporário
      setProdutoTemp(null);
      setQuantidadeTemp(1);
      setValorUnitarioTemp(0);
      setDescontoTemp(0);
      setInfoST(null);
      
      // Mostrar mensagem de sucesso
      setSuccess('Novo item adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar novo item:', error);
      setError(`Erro ao adicionar novo item: ${error.message}`);
    }
  };
  
  // Função para remover um item do orçamento
  const removerItem = (index) => {
    const novosItens = [...itensOrcamento];
    novosItens.splice(index, 1);
    setItensOrcamento(novosItens);
    atualizarTotais(novosItens);
  };
  
  // Função para iniciar a edição de um item existente
  const iniciarEdicaoItem = (index) => {
    const item = itensOrcamento[index];
    
    // Carregar os dados do item nos campos temporários
    setProdutoTemp(item.produto);
    // Também definir o valor de entrada para exibir o nome do produto
    setInputValue(item.produto ? `${item.produto.codigo} - ${item.produto.nome}` : '');
    setQuantidadeTemp(item.quantidade);
    setValorUnitarioTemp(item.valor_unitario);
    setDescontoTemp(item.desconto);
    
    // Definir o estado de edição
    setItemEditandoIndex(index);
    setModoEdicaoItem(true);
    
    // Definir cliente se não estiver selecionado
    if (!clienteSelecionado && dadosOrcamento.cliente) {
      handleClienteSelect(dadosOrcamento.cliente.codigo);
    }
    
         // Quando entrar no modo de edição, definir o produto atual para acionar a busca automática de dados fiscais
     // O useEffect associado ao produtoTemp cuidará de buscar os dados fiscais
    
    // Exibir mensagem informativa
    setSuccess(`Editando item: ${item.produto_descricao}`);
    
    // Rolar até o formulário de adição/edição
    const formularioElement = document.getElementById('formulario-item');
    if (formularioElement) {
      formularioElement.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Função para cancelar a edição
  const cancelarEdicaoItem = () => {
    // Limpar formulário temporário
    setProdutoTemp(null);
    setQuantidadeTemp(1);
    setValorUnitarioTemp(0);
    setDescontoTemp(0);
    setInfoST(null);
    
    // Resetar o estado de edição
    setItemEditandoIndex(null);
    setModoEdicaoItem(false);
  };
  
  // Função para atualizar um item existente
  const atualizarItem = async () => {
    if (itemEditandoIndex === null || !modoEdicaoItem) return;
    
    try {
      setLoadingProduto(true);
      
      // Obter o item atual
      const itemAtual = itensOrcamento[itemEditandoIndex];
      
      // Verificar se temos produto selecionado
      if (!produtoTemp) {
        setError("Selecione um produto para continuar");
        setLoadingProduto(false);
        return;
      }
      
      // Se não temos cliente selecionado, não podemos calcular impostos corretamente
      if (!clienteSelecionado) {
        setError("Selecione um cliente para calcular impostos corretamente");
        setLoadingProduto(false);
        return;
      }
      
      // 1. Buscar dados fiscais atualizados do produto
      console.log('Buscando dados fiscais do produto para atualização:', produtoTemp.codigo);
      
      // Buscar dados fiscais do produto usando a API
      try {
        const response = await fiscalAPI.buscarDadosFiscaisProdutoResiliente(produtoTemp.codigo);
        if (response.success && response.data) {
          setDadosFiscais(response.data);
          console.log('Dados fiscais obtidos para atualização:', response.data);
        } else {
          console.error('Falha ao obter dados fiscais:', response);
          setError("Erro ao buscar dados fiscais do produto");
        }
      } catch (error) {
        console.error('Erro ao buscar dados fiscais:', error);
      }
      
      // 2. Verificar ST para o cliente selecionado
      console.log('Verificando ST para o cliente:', clienteSelecionado.codigo);
      
      // Verificar ST para o cliente e produto
      try {
        const resultadoST = await fiscalAPI.verificarSubstituicaoTributaria(
          produtoTemp.codigo,
          clienteSelecionado.uf,
          determinarContribuinteCliente(clienteSelecionado)
        );
        
        setInfoST(resultadoST);
        console.log('Informações de ST para edição:', resultadoST);
        
        if (resultadoST.temST) {
          setSuccess(`Produto com Substituição Tributária para ${clienteSelecionado.uf}`);
        }
      } catch (error) {
        console.error('Erro ao verificar ST:', error);
      }
      
      // 3. Determinar se é produto importado
      const classificacao = produtoTemp.classificacao_fiscal || '';
      const isImportado = classificacao.includes("IMPORTADO") || classificacao.includes("IMPRT");
      
      // 4. Manter a mesma unidade que estava sendo usada
      const isUsingUnidade2 = itemAtual.isUnidade2 || false;
      const unidadeUtilizada = isUsingUnidade2 
        ? (produtoTemp.unidade2 || produtoTemp.unidade) 
        : produtoTemp.unidade;
      
      // 5. Calcular valores básicos
      const valorBruto = arredondar(quantidadeTemp * valorUnitarioTemp, 2);
      const valorDesconto = arredondar((valorBruto * descontoTemp) / 100, 2);
      const valorLiquido = arredondar(valorBruto - valorDesconto, 2);
      
      // 6. Preparar item temporário para cálculo de tributos
      const itemTemp = {
        produto_codigo: produtoTemp.codigo,
        quantidade: quantidadeTemp,
        valor_unitario: valorUnitarioTemp,
        desconto: descontoTemp,
        isImportado
      };
      
      // Usar cálculo fiscal existente
      let temST = false;
      let dadosTributos = {
        aliq_icms: dadosFiscais ? parseFloat(dadosFiscais.aliq_icms) || 0 : 0,
        aliq_ipi: dadosFiscais ? parseFloat(dadosFiscais.aliq_ipi) || 0 : 0,
        valor_icms: 0,
        valor_ipi: 0,
        valor_icms_st: 0,
        isImportado
      };
      
      // 7. Calcular tributos usando a função existente
      if (clienteSelecionado && dadosFiscais) {
        try {
          console.log('Calculando tributos usando calcularTributos para o item atualizado');
          
          // Determinar o contribuinte do cliente
          const tipoContribuinte = determinarContribuinteCliente(clienteSelecionado);
          
          // Verificar substituição tributária
          const resultadoST = await verificarSubstituicaoTributaria(
            produtoTemp.codigo,
            clienteSelecionado.uf,
            tipoContribuinte
          );
          temST = resultadoST.temST;
          
          // Preparar os dados para cálculo de tributos
          const dadosCalculo = {
            produto_codigo: produtoTemp.codigo,
            uf_cliente: clienteSelecionado.uf,
            tipo_cliente: tipoContribuinte,
            valor_unitario: valorUnitarioTemp,
            quantidade: quantidadeTemp,
            desconto: descontoTemp,
            valor_bruto: valorBruto,
            valor_liquido: valorLiquido,
            isImportado
          };
          
          // Calcular tributos usando a API fiscal
          const calculoResponse = await fiscalAPI.calcularTributosResiliente(dadosCalculo);
          const resultadoTributos = calculoResponse.success && calculoResponse.data ? calculoResponse.data : null;
          
          if (resultadoTributos) {
            dadosTributos = resultadoTributos;
            console.log('Resultado do cálculo de tributos:', dadosTributos);
          }
          
          // Correção para Goiás
          if (clienteSelecionado.uf === 'GO') {
            temST = false;
            dadosTributos.valor_icms_st = 0;
            dadosTributos.aliq_icms = 7;
            dadosTributos.valor_icms = arredondar((valorLiquido * 7) / 100, 2);
            console.log('CORREÇÃO APLICADA: Produto para Goiás (GO) - Sem ST, ICMS 7%');
          }
        } catch (error) {
          console.error('Erro ao calcular tributos:', error);
          // Usar cálculo básico em caso de erro
          dadosTributos.valor_icms = arredondar((valorLiquido * dadosTributos.aliq_icms) / 100, 2);
          dadosTributos.valor_ipi = arredondar((valorLiquido * dadosTributos.aliq_ipi) / 100, 2);
        }
      } else {
        // Cálculo básico se não tiver cliente ou dados fiscais
        dadosTributos.valor_icms = arredondar((valorLiquido * dadosTributos.aliq_icms) / 100, 2);
        dadosTributos.valor_ipi = arredondar((valorLiquido * dadosTributos.aliq_ipi) / 100, 2);
      }
      
      // 8. Criar o item atualizado
      const itemAtualizado = {
        produto: produtoTemp,
        produto_codigo: produtoTemp.codigo,
        produto_descricao: produtoTemp.nome,
        quantidade: quantidadeTemp,
        valor_unitario: valorUnitarioTemp,
        desconto: descontoTemp,
        valor_bruto: valorBruto,
        valor_desconto: valorDesconto,
        valor_liquido: valorLiquido,
        aliq_icms: dadosTributos.aliq_icms,
        aliq_ipi: dadosTributos.aliq_ipi,
        valor_icms: dadosTributos.valor_icms,
        valor_ipi: dadosTributos.valor_ipi,
        valor_icms_st: dadosTributos.valor_icms_st || 0,
        temST,
        isImportado,
        unidade: unidadeUtilizada,
        isUnidade2: isUsingUnidade2
      };
      
      console.log('Item atualizado com sucesso:', itemAtualizado);
      
      // 9. Atualizar o item na lista
      const novosItens = [...itensOrcamento];
      novosItens[itemEditandoIndex] = itemAtualizado;
      setItensOrcamento(novosItens);
      
      // 10. Atualizar totais
      atualizarTotais(novosItens);
      
      // 11. Limpar formulário e sair do modo edição
      cancelarEdicaoItem();
      
      // 12. Mostrar mensagem de sucesso
      setSuccess('Item atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      setError(`Erro ao atualizar item: ${error.message}`);
    } finally {
      setLoadingProduto(false);
    }
  };
  
  // Função para atualizar os totais do orçamento
  const atualizarTotais = (itens) => {
    // Inicializar totais
    let valorProdutos = 0;
    let valorDesconto = 0;
    let valorComDesconto = 0;
    let valorIpi = 0;
    let valorSt = 0;
    let valorTotal = 0;
    
    console.log('Atualizando totais para', itens.length, 'itens');
    
    // Se não houver itens, zerar os totais
    if (!itens || itens.length === 0) {
      setTotais({
        valorProdutos: 0,
        valorDesconto: 0,
        valorComDesconto: 0,
        valorIpi: 0,
        valorSt: 0,
        valorTotal: 0
      });
      return;
    }
    
    // Calcular valores
    itens.forEach((item, index) => {
      // Garantir que todos os valores sejam numéricos e arredondados corretamente
      const valorBruto = arredondar(parseFloat(item.valor_bruto) || 0, 4);
      const valorDescItem = arredondar(parseFloat(item.valor_desconto) || 0, 4);
      const valorIpiItem = arredondar(parseFloat(item.valor_ipi) || 0, 4);
      const valorStItem = arredondar(parseFloat(item.valor_icms_st) || 0, 4);
      
      console.log(`Item ${index + 1}:`, {
        codigo: item.produto_codigo,
        descricao: item.produto_descricao,
        valorBruto,
        valorDescItem,
        valorIpiItem,
        valorStItem,
        aliqIpi: arredondar(item.aliq_ipi, 4)
      });
      
      // Valores brutos
      valorProdutos += valorBruto;
      valorDesconto += valorDescItem;
      
      // Valores com impostos
      valorIpi += valorIpiItem;
      valorSt += valorStItem;
    });
    
    // Calcular totais finais com arredondamento adequado
    valorProdutos = arredondar(valorProdutos, 2);
    valorDesconto = arredondar(valorDesconto, 2);
    valorComDesconto = arredondar(valorProdutos - valorDesconto, 2);
    valorIpi = arredondar(valorIpi, 2);
    valorSt = arredondar(valorSt, 2);
    valorTotal = arredondar(valorComDesconto + valorIpi + valorSt, 2);
    
    console.log('Totais calculados:', {
      valorProdutos,
      valorDesconto,
      valorComDesconto,
      valorIpi,
      valorSt,
      valorTotal
    });
    
    // Verificar se os cálculos resultaram em valores zerados mas há itens no orçamento
    // Isso pode indicar um problema no cálculo
    if (itens.length > 0 && valorTotal === 0 && totais.valorTotal > 0) {
      console.warn('ATENÇÃO: Os cálculos resultaram em valores zerados mas há itens no orçamento. Mantendo os valores originais.');
      return; // Manter os valores originais, não atualizando o estado
    }
    
    // Atualizar estado de totais
    setTotais({
      valorProdutos,
      valorDesconto,
      valorComDesconto,
      valorIpi,
      valorSt,
      valorTotal
    });
  };
  
  // Adicionar uma função calcularTotais - esta precisa ser adicionada antes da função salvarOrcamento
  const calcularTotais = () => {
    // Recalcular os totais usando a função existente atualizarTotais
    atualizarTotais(itensOrcamento);
  };
  
  // Definir uma função para exibir mensagens de notificação em vez de usar toast
  const exibirNotificacao = (mensagem, severidade = "error") => {
    setSnackbarMessage(mensagem);
    setSnackbarSeverity(severidade);
    setSnackbarOpen(true);
  };
  
  // Função para mostrar confirmação
  const showConfirmation = async (options) => {
    const result = await Swal.fire({
      title: options.title,
      text: options.text,
      icon: options.icon || 'warning',
      showCancelButton: true,
      confirmButtonColor: options.confirmButtonColor || '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: options.confirmButtonText || 'Sim',
      cancelButtonText: 'Cancelar',
      background: '#fff',
      customClass: {
        popup: 'swal2-rounded',
        confirmButton: 'swal2-confirm',
        cancelButton: 'swal2-cancel'
      },
      showClass: {
        popup: 'animate__animated animate__fadeInDown'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutUp'
      }
    });

    return result.isConfirmed;
  };

  // Função para mostrar mensagem de sucesso
  const showSuccess = (message) => {
    Swal.fire({
      title: 'Sucesso!',
      text: message,
      icon: 'success',
      timer: 2000,
      timerProgressBar: true,
      showConfirmButton: false,
      background: '#fff',
      customClass: {
        popup: 'swal2-rounded'
      },
      showClass: {
        popup: 'animate__animated animate__fadeInDown'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutUp'
      }
    });
  };

  // Função para mostrar erro
  const showError = (message) => {
    Swal.fire({
      title: 'Erro!',
      text: message,
      icon: 'error',
      confirmButtonColor: '#d33',
      background: '#fff',
      customClass: {
        popup: 'swal2-rounded',
        confirmButton: 'swal2-confirm'
      },
      showClass: {
        popup: 'animate__animated animate__fadeInDown'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutUp'
      }
    });
  };
  
  // Função para salvar o orçamento - atualizar para suportar edição
  const handleSalvarOrcamento = async () => {
    if (!clienteSelecionado) {
      showError('É necessário selecionar um cliente');
      return;
    }
    
    if (!vendedorSelecionado) {
      showError('É necessário selecionar um vendedor');
      return;
    }
    
    if (itensOrcamento.length === 0) {
      showError('É necessário adicionar pelo menos um item ao orçamento');
      return;
    }
    
    setLoadingSave(true);
    setError('');
    setSuccess('');
    
    try {
      console.log(`Preparando para salvar orçamento. Modo de edição: ${isEdicao ? 'SIM' : 'NÃO'}, Código: ${orcamentoCodigo || 'Novo'}`);
      console.log(`Forma de pagamento selecionada: ${formaPagamentoSelecionada}`);
      console.log(`Condição de pagamento selecionada: ${condicaoPagamentoSelecionada}`);
      
      // Preparar dados para salvar
      const dadosOrcamento = {
        dt_orcamento: new Date().toISOString().split('T')[0],
        cod_cliente: clienteSelecionado.codigo,
        cod_vendedor: vendedorSelecionado.codigo, // Garantir que o código do vendedor é enviado
        cod_transportadora: transportadoraSelecionada?.codigo || null,
        nome_transportadora: transportadoraSelecionada?.nome || null,
        observacoes,
        form_pagto: formaPagamentoSelecionada,
        cond_pagto: condicaoPagamentoSelecionada,
        itens: itensOrcamento.map(item => ({
            produto_codigo: item.produto_codigo,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_bruto: item.valor_bruto,
          valor_desconto: item.valor_desconto,
          valor_liquido: item.valor_liquido,
          valor_total: item.valor_liquido + (parseFloat(item.valor_ipi) || 0) + (parseFloat(item.valor_icms_st) || 0),
          desconto: item.desconto || 0,
          aliq_icms: item.aliq_icms || 0,
          valor_icms: item.valor_icms || 0,
          st_icms: item.st_icms || 'N',
          valor_icms_st: item.valor_icms_st || 0,
          aliq_ipi: item.aliq_ipi || 0,
          valor_ipi: item.valor_ipi || 0,
          unidade: item.unidade || item.produto?.unidade || '', // Adicionar unidade do item
          isUnidade2: item.isUnidade2 || false // Adicionar flag indicando se usa unidade2
        }))
      };
      
      // Log para debug
      logDebugInfo('ORÇAMENTO PARA SALVAR', {
        cod_cliente: dadosOrcamento.cod_cliente,
        cliente_nome: clienteSelecionado?.nome || clienteSelecionado?.razao,
        cod_vendedor: dadosOrcamento.cod_vendedor,
        vendedor_nome: vendedorSelecionado?.nome,
        form_pagto: dadosOrcamento.form_pagto,
        cond_pagto: dadosOrcamento.cond_pagto,
        itens_quantidade: dadosOrcamento.itens.length,
        totais: totais
      });
      
      console.log('Dados do orçamento para envio:', dadosOrcamento);
      
      let response;
      
      // Se estamos editando, atualizar o orçamento existente
      if (isEdicao && orcamentoCodigo) {
        console.log(`Atualizando orçamento existente com código ${orcamentoCodigo}`);
        dadosOrcamento.codigo = orcamentoCodigo; // Adicionar o código para atualização
        response = await orcamentosAPI.atualizar(orcamentoCodigo, dadosOrcamento);
      } else {
        // Criar um novo orçamento
        console.log('Criando novo orçamento');
        response = await orcamentosAPI.criar(dadosOrcamento);
      }
      
      if (response && response.data) {
        const responseData = response.data.data || response.data;
        const codigoOrcamento = responseData.codigo || orcamentoCodigo || 'Novo';
        const mensagem = isEdicao 
          ? `Orçamento #${codigoOrcamento} atualizado com sucesso!` 
          : `Orçamento #${codigoOrcamento} salvo com sucesso!`;
        
        logDebugInfo('RESPOSTA DO SERVIDOR', response.data);
        
        showSuccess(mensagem);
        
        // Limpar formulário após salvar
        setClienteSelecionado(null);
        setVendedorSelecionado(null);
        setTransportadoraSelecionada(null);
        setFormaPagamentoSelecionada('');
        setCondicaoPagamentoSelecionada('');
        setObservacoes('');
        setItensOrcamento([]);
        setProdutoTemp(null);
        setQuantidadeTemp(1);
        setValorUnitarioTemp(0);
        setDescontoTemp(0);
        setTotais({
          valorProdutos: 0,
          valorDesconto: 0,
          valorComDesconto: 0,
          valorIpi: 0,
          valorSt: 0,
          valorTotal: 0
        });
        
        // Navegar para lista de orçamentos após 2 segundos
        setTimeout(() => {
          navigate('/orcamentos');
        }, 2000);
      }
    } catch (err) {
      console.error('Erro ao salvar orçamento:', err);
      showError(`Erro ao salvar orçamento: ${err.message || 'Ocorreu um erro inesperado'}`);
    } finally {
      setLoadingSave(false);
    }
  };
  
  // Nova função para filtrar produtos com debounce
  const filtrarProdutos = useCallback(
    debounce((termo) => {
      setFiltrando(true);
      if (!termo || termo.length < 2) {
        setProdutosFiltrados(produtos.slice(0, 30));
        setFiltrando(false);
        return;
      }

      // Verificar cache primeiro
      const cacheKey = termo.toLowerCase();
      if (cacheResultados.current[cacheKey]) {
        setProdutosFiltrados(cacheResultados.current[cacheKey]);
        setFiltrando(false);
        return;
      }

      // Converter para minúsculas para busca case-insensitive
      const termoBusca = termo.toLowerCase();
      
      // Primeiramente, tentar encontrar por código exato - prioridade máxima
      const resultadoCodigoExato = produtos.find(p => 
        p.codigo.toLowerCase() === termoBusca
      );
      
      if (resultadoCodigoExato) {
        const resultado = [resultadoCodigoExato];
        setProdutosFiltrados(resultado);
        cacheResultados.current[cacheKey] = resultado;
        setFiltrando(false);
        return;
      }
      
      // Em seguida, buscar produtos que comecem com o termo (tanto código como descrição)
      const resultadosInicioCodigo = produtos.filter(p => 
        p.codigo && p.codigo.toLowerCase().startsWith(termoBusca)
      ).slice(0, 15);
      
      const resultadosInicioDescricao = produtos.filter(p => 
        p.nome && p.nome.toLowerCase().startsWith(termoBusca) && 
        !resultadosInicioCodigo.includes(p)
      ).slice(0, 15);
      
      // Por fim, buscar produtos que contenham o termo em qualquer parte
      const resultadosContemCodigo = produtos.filter(p => 
        p.codigo && p.codigo.toLowerCase().includes(termoBusca) && 
        !p.codigo.toLowerCase().startsWith(termoBusca) &&
        !resultadosInicioCodigo.includes(p)
      ).slice(0, 10);
      
      const resultadosContemDescricao = produtos.filter(p => 
        p.nome && p.nome.toLowerCase().includes(termoBusca) && 
        !p.nome.toLowerCase().startsWith(termoBusca) &&
        !resultadosInicioDescricao.includes(p) &&
        !resultadosInicioCodigo.includes(p) &&
        !resultadosContemCodigo.includes(p)
      ).slice(0, 10);
      
      // Combinar resultados na ordem de relevância
      const resultadosCombinados = [
        ...resultadosInicioCodigo,
        ...resultadosInicioDescricao,
        ...resultadosContemCodigo,
        ...resultadosContemDescricao
      ].slice(0, 30);
      
      // Guardar no cache e atualizar estado
      cacheResultados.current[cacheKey] = resultadosCombinados;
      setProdutosFiltrados(resultadosCombinados);
      setFiltrando(false);
    }, 300),
    [produtos]
  );
  
  // Efeito para inicializar produtos filtrados quando a lista de produtos mudar
  useEffect(() => {
    if (produtos.length > 0) {
      setProdutosFiltrados(produtos.slice(0, 30));
    }
  }, [produtos]);
  
  // Efeito para aplicar filtro quando o termo de busca mudar
  useEffect(() => {
    if (termoBusca !== null && termoBusca !== undefined) {
      filtrarProdutos(termoBusca);
    }
  }, [termoBusca, filtrarProdutos]);
  
  // Função para converter orçamento em pedido de venda
  const converterEmPedidoVenda = async () => {
    if (!orcamentoCodigo) {
      showError('É necessário salvar o orçamento antes de convertê-lo em pedido de venda');
      return;
    }

    // Verificar se forma e condição de pagamento foram selecionadas
    if (!formaPagamentoSelecionada) {
      showError('É necessário selecionar uma forma de pagamento antes de converter em pedido');
      return;
    }

    if (!condicaoPagamentoSelecionada) {
      showError('É necessário selecionar uma condição de pagamento antes de converter em pedido');
      return;
    }

    // Validar se os valores são números válidos
    const codFormaPagto = parseInt(formaPagamentoSelecionada);
    const codCondPagto = parseInt(condicaoPagamentoSelecionada);

    if (isNaN(codFormaPagto) || codFormaPagto <= 0) {
      showError('Forma de pagamento inválida');
      return;
    }

    if (isNaN(codCondPagto) || codCondPagto <= 0) {
      showError('Condição de pagamento inválida');
      return;
    }

    const confirmed = await showConfirmation({
      title: 'Converter em Pedido',
      text: 'Tem certeza que deseja converter este orçamento em pedido de venda?',
      icon: 'question',
      confirmButtonColor: '#17a2b8',
      confirmButtonText: 'Sim, Converter'
    });

    if (!confirmed) return;

    try {
      setConvertendoOrcamento(true);
      setLoadingConvert(true);
      
      // Obter a configuração de validação de estoque em pedidos
      const stockValidationSettings = await configurationAPI.getStockValidationSettings();
      const validateStockInOrders = stockValidationSettings.data?.validate_stock_in_orders ?? true;
      
      // Verificar estoque apenas se a validação estiver ativada
      if (validateStockInOrders) {
        const itensComEstoque = await Promise.all(
          itensOrcamento.map(async (item) => {
            const estoqueResponse = await produtosAPI.obterPosicaoEstoque(item.produto_codigo);
            const estoqueDisponivel = estoqueResponse.data?.qtd_disponivel || 0;
            const quantidadeSolicitada = parseFloat(item.quantidade) || 0;
            
            return {
              ...item,
              estoqueDisponivel,
              estoqueValido: estoqueDisponivel >= quantidadeSolicitada
            };
          })
        );
        
        const itensComEstoqueInsuficiente = itensComEstoque.filter(item => !item.estoqueValido);
        
        if (itensComEstoqueInsuficiente.length > 0) {
          const mensagemErro = itensComEstoqueInsuficiente.map(item => 
            `- ${item.produto_codigo} (${item.produto_descricao}): Disponível: ${item.estoqueDisponivel}, Necessário: ${item.quantidade}`
          ).join('\n');
          
          showError(`Estoque insuficiente para os seguintes produtos:\n${mensagemErro}`);
          setConvertendoOrcamento(false);
          setLoadingConvert(false);
          return;
        }
      }
      
      // Preparar dados de pagamento com valores numéricos
      const dadosPagamento = {
        cod_forma_pagto: formaPagamentoSelecionada.toString().trim(),
        cod_cond_pagto: condicaoPagamentoSelecionada.toString().trim(),
        cod_transportadora: transportadoraSelecionada?.codigo || null
      };

      // Log detalhado para debug
      console.log('Dados de pagamento para conversão:', {
        ...dadosPagamento,
        formaPagamentoOriginal: formaPagamentoSelecionada,
        condicaoPagamentoOriginal: condicaoPagamentoSelecionada,
        transportadoraOriginal: transportadoraSelecionada
      });

      // Adicionar forma e condição de pagamento na conversão
      const response = await orcamentosAPI.converterEmPedidoVenda(orcamentoCodigo, dadosPagamento);

      if (response && response.data && response.data.success) {
        showSuccess('Orçamento convertido em pedido de venda com sucesso!');
        
        setTimeout(() => {
          navigate('/orcamentos');
        }, 2000);
      } else {
        const mensagemErro = response.data?.message || 'Não foi possível converter o orçamento em pedido de venda';
        showError(`Erro ao converter orçamento: ${mensagemErro}`);
      }
    } catch (err) {
      console.error('Erro ao converter orçamento em pedido de venda:', err);
      
      // Verificar se é erro de duplicidade
      if (err.response?.data?.error?.includes('duplicate key value violates unique constraint') ||
          err.message?.includes('duplicate key value violates unique constraint')) {
        
        await Swal.fire({
          title: 'Pedido já existe',
          text: 'Este orçamento já foi convertido em pedido anteriormente.',
          icon: 'warning',
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'OK',
          footer: '<a href="/pedidos">Ir para lista de pedidos</a>',
          showClass: {
            popup: 'animate__animated animate__fadeInDown'
          },
          hideClass: {
            popup: 'animate__animated animate__fadeOutUp'
          }
        });

        // Atualizar o status do orçamento na interface
        setDadosOrcamento(prev => ({
          ...prev,
          status: 'CONVERTIDO'
        }));

        return;
      }

      // Para outros tipos de erro
      const mensagemErro = err.response?.data?.message || err.message || 'Ocorreu um erro inesperado';
      showError(`Erro ao converter orçamento em pedido de venda: ${mensagemErro}`);
    } finally {
      setLoadingConvert(false);
      setConvertendoOrcamento(false);
    }
  };
  
  // Modificar a função aprovarOrcamento para tratar corretamente as notificações e atualização de estado
  const aprovarOrcamento = async () => {
    if (!id) return;

    const confirmed = await showConfirmation({
      title: 'Aprovar Orçamento',
      text: 'Tem certeza que deseja aprovar este orçamento?',
      icon: 'question',
      confirmButtonColor: '#28a745',
      confirmButtonText: 'Sim, Aprovar'
    });

    if (!confirmed) return;

    try {
      setLoadingApprove(true);
      setError(null);

      const response = await api.post(`/orcamentos/${id}/aprovar`);

      if (response.data && response.data.success) {
        setDadosOrcamento({
          ...dadosOrcamento,
          status: 'APROVADO'
        });
        
        showSuccess('Orçamento aprovado com sucesso!');
        
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error('Erro ao aprovar orçamento:', error);
      showError('Erro ao aprovar orçamento. Verifique os dados e tente novamente.');
    } finally {
      setLoadingApprove(false);
    }
  };
  
  // Função para obter a cor de status para mostrar visualmente na interface
  const getStatusColor = (status) => {
    switch(status) {
      case 'APROVADO': return 'success';
      case 'CONVERTIDO': return 'info';
      case 'CANCELADO': return 'error';
      default: return 'warning';
    }
  };

  // Função para obter o texto de status para exibição
  const getStatusText = (status) => {
    return status || 'PENDENTE';
  };
  
  // Modificar o carregamento de dados
  const carregarDados = async () => {
    setLoading(true);
    setDataLoading(true);
    try {
      console.log('Iniciando carregamento de dados...');

      // Se for vendedor, já definir o vendedor selecionado
      if (usuarioLogado?.vendedor) {
        setVendedorSelecionado(usuarioLogado.vendedor);
      }

      // Carregar formas de pagamento
      console.log('Buscando formas de pagamento...');
      const responseFormas = await pagamentosAPI.listarFormas();
      console.log('Resposta Formas de Pagamento:', responseFormas);
      if (responseFormas?.data) {
        console.log('Formas de pagamento encontradas:', responseFormas.data);
        setFormasPagamento(responseFormas.data);
      }

      // Carregar condições de pagamento
      console.log('Buscando condições de pagamento...');
      const responseCondicoes = await pagamentosAPI.listarCondicoes();
      console.log('Resposta Condições de Pagamento:', responseCondicoes);
      if (responseCondicoes?.data) {
        console.log('Condições de pagamento encontradas:', responseCondicoes.data);
        setCondicoesPagamento(responseCondicoes.data);
      }

      // Carregar vendedores (apenas se for admin)
      if (usuarioLogado?.role === 'admin') {
        console.log('Buscando vendedores...');
        const responseVendedores = await vendedoresAPI.listar();
        console.log('Resposta Vendedores:', responseVendedores);
        if (responseVendedores?.data) {
          console.log('Vendedores encontrados:', responseVendedores.data);
          setVendedores(responseVendedores.data);
        }
      } else {
        // Se não for admin, garantir que a lista de vendedores só tenha o vendedor do usuário
        if (usuarioLogado?.vendedor) {
          console.log('Definindo lista de vendedores apenas com o vendedor atual');
          setVendedores([usuarioLogado.vendedor]);
        }
      }
      
      // Buscar produtos
      console.log('Buscando produtos...');
      const responseProd = await produtosAPI.listar();
      console.log('Resposta Produtos:', responseProd);
      if (responseProd?.data) {
        console.log('Produtos encontrados:', responseProd.data);
        setProdutos(responseProd.data);
      }

      // Se temos um ID, buscar dados do orçamento existente
      if (id && id !== 'novo') {
        console.log('Buscando dados do orçamento:', id);
        await carregarOrcamento(id);
      } else if (usuarioLogado?.vendedor) {
        // Se for um novo orçamento e já temos um vendedor, carregar seus clientes
        await carregarClientesPorVendedor(usuarioLogado.vendedor.codigo);
      }

      console.log('Carregamento de dados concluído com sucesso!');
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      exibirNotificacao('Erro ao carregar dados. Por favor, verifique o console para mais detalhes.', 'error');
    } finally {
      setLoading(false);
      setDataLoading(false);
    }
  };
  
  // Corrigir a função carregarClientesPorVendedor para usar o endpoint correto
  const carregarClientesPorVendedor = async (codVendedor) => {
    if (!codVendedor) {
      exibirNotificacao('Código do vendedor não informado!', 'warning');
      return;
    }
    
    // Se for o mesmo vendedor que já foi carregado, não recarregar
    if (prevVendedorId.current === codVendedor && clientes.length > 0) {
      console.log(`Usando clientes em cache para vendedor ${codVendedor}`);
      return;
    }
    
    setLoadingClientes(true);
    setClientes([]); // Limpar lista de clientes ao iniciar nova busca
    
    try {
      console.log(`🔍 Buscando clientes para o vendedor ${codVendedor}...`);
      
      // Usar o endpoint padrão que sabemos que funciona
      const responseCli = await api.get(`/clientes/vendedor/${codVendedor}`);
      
      console.log('Resposta da API:', responseCli.data);
      
      if (responseCli?.data?.success) {
        const clientesDoVendedor = responseCli.data.data || [];
        
        console.log(`✅ Encontrados ${clientesDoVendedor.length} clientes para o vendedor ${codVendedor}`);
        
        if (clientesDoVendedor.length > 0) {
          // Garantir campos mínimos para todos os clientes e estruturar os dados
          const clientesProcessados = clientesDoVendedor.map(cliente => ({
            ...cliente,
            razao: cliente.razao || cliente.nome || `Cliente ${cliente.codigo}`,
            nome: cliente.nome || cliente.razao || `Cliente ${cliente.codigo}`,
            // Criar objeto endereco com os campos de endereço
            endereco: {
              logradouro: cliente.logradouro || '',
              numero: cliente.logradouro_num || '',
              complemento: cliente.complemento || '',
              bairro: cliente.bairro || '',
              cidade: cliente.municipio || '',
              uf: cliente.uf || '',
              cep: cliente.cep || ''
            },
            // Criar objeto contato com os campos de contato
            contato: {
              telefone: cliente.ddd_fone1 && cliente.fone1 ? 
                `(${cliente.ddd_fone1}) ${cliente.fone1}` : '',
              celular: cliente.ddd_celular && cliente.celular ? 
                `(${cliente.ddd_celular}) ${cliente.celular}` : '',
              email: cliente.email || ''
            },
            // Assume que os dados estão completos (virão do backend)
            _dadosCompletos: true
          }));
          
          console.log('Clientes processados com dados estruturados:', clientesProcessados.slice(0, 2));
          
          setClientes(clientesProcessados);
          setClientesFiltrados(clientesProcessados.slice(0, 20)); // Inicializar com os primeiros 20
          prevVendedorId.current = codVendedor;
        } else {
          exibirNotificacao(`Não foram encontrados clientes para o vendedor ${codVendedor}`, 'info');
        }
      } else {
        console.error('❌ Erro na resposta da API:', responseCli.data);
        exibirNotificacao(`Erro ao carregar clientes: ${responseCli.data?.message || 'Resposta inválida da API'}`, 'error');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar clientes:', error);
      exibirNotificacao(`Erro ao carregar clientes: ${error.message}`, 'error');
    } finally {
      setLoadingClientes(false);
    }
  };
  
  // Nova função para buscar cliente por código (sob demanda)
  const buscarClientePorCodigo = async (codigo) => {
    if (!codigo) return null;
    
    // Verificar se já temos o cliente no cache
    if (clientesCache.current[codigo]) {
      return clientesCache.current[codigo];
    }
    
    try {
      console.log(`Buscando cliente com código ${codigo}...`);
      const response = await clientesAPI.buscarPorCodigo(codigo);
      console.log('Resposta da API de cliente por código:', response);
      
      if (response && response.data) {
        // A API pode retornar dados diretamente ou dentro de um objeto data
        const cliente = response.data.data || response.data;
        if (cliente) {
          console.log('Dados do cliente recebidos:', cliente);
          // Adicionar ao cache
          clientesCache.current[codigo] = {
            ...cliente,
            razao: cliente.razao || cliente.nome || `Cliente ${cliente.codigo}`,
            nome: cliente.nome || cliente.razao || `Cliente ${cliente.codigo}`,
            _dadosCompletos: true
          };
          return clientesCache.current[codigo];
        }
      }
      return null;
    } catch (error) {
      console.error(`Erro ao buscar cliente ${codigo}:`, error);
      return null;
    }
  };
  
  // Atualizar a função handleClienteSelect para usar o cache
  const handleClienteSelect = async (id) => {
    if (!id) {
      setClienteSelecionado(null);
      return;
    }

    setLoading(true);
    try {
      // Verificar se já temos o cliente no estado atual
      const clienteLocal = clientes.find(c => c.codigo.toString() === id.toString());
      
      if (clienteLocal && clienteLocal._dadosCompletos) {
        setClienteSelecionado(clienteLocal);
        return;
      }
      
      // Não temos dados completos, buscar do servidor
      const clienteCompleto = await buscarClientePorCodigo(id);
      
      if (clienteCompleto) {
        // Estruturar os dados do cliente para o formato esperado pelo componente
        const clienteProcessado = {
          ...clienteCompleto,
          // Criar objeto endereco com os campos de endereço
          endereco: {
            logradouro: clienteCompleto.logradouro || '',
            numero: clienteCompleto.logradouro_num || '',
            complemento: clienteCompleto.complemento || '',
            bairro: clienteCompleto.bairro || '',
            cidade: clienteCompleto.municipio || '',
            uf: clienteCompleto.uf || '',
            cep: clienteCompleto.cep || ''
          },
          // Criar objeto contato com os campos de contato
          contato: {
            telefone: clienteCompleto.ddd_fone1 && clienteCompleto.fone1 ? 
              `(${clienteCompleto.ddd_fone1}) ${clienteCompleto.fone1}` : '',
            celular: clienteCompleto.ddd_celular && clienteCompleto.celular ? 
              `(${clienteCompleto.ddd_celular}) ${clienteCompleto.celular}` : '',
            email: clienteCompleto.email || ''
          },
          _dadosCompletos: true
        };
        
        console.log('Cliente processado com dados estruturados:', clienteProcessado);
        
        setClienteSelecionado(clienteProcessado);
        
        // Atualizar na lista de clientes se já existir
        if (clienteLocal) {
          setClientes(prevClientes => 
            prevClientes.map(c => 
              c.codigo.toString() === id.toString() ? clienteProcessado : c
            )
          );
        }
      } else {
        // Se não conseguir buscar, usar o cliente local mesmo incompleto
        if (clienteLocal) {
          setClienteSelecionado(clienteLocal);
        } else {
          // Criar um cliente temporário
          setClienteSelecionado({
            codigo: id,
            nome: `Cliente ${id}`,
            razao: `Cliente ${id}`,
            uf: 'SP'
          });
        }
      }
    } catch (error) {
      console.error(`Erro ao selecionar cliente ${id}:`, error);
      exibirNotificacao('Erro ao buscar dados completos do cliente.', 'warning');
    } finally {
      setLoading(false);
    }
  };
  
  // Adicionar uma função otimizada para filtrar clientes
  const filtrarClientes = useCallback(debounce((termo) => {
    if (!termo || termo.length < 2) {
      setClientesFiltrados(clientes.slice(0, 20));
      return;
    }
    
    // Chave de cache para evitar recálculos desnecessários
    const cacheKey = `${termo}-${prevVendedorId.current}`;
    
    // Verificar cache
    if (clientesCache.current[cacheKey]) {
      setClientesFiltrados(clientesCache.current[cacheKey]);
      return;
    }
    
    const termoLower = termo.toLowerCase();
    
    // Filtrar por código exato
    const porCodigoExato = clientes.filter(c => 
      c.codigo && c.codigo.toString() === termo
    );
    
    if (porCodigoExato.length > 0) {
      setClientesFiltrados(porCodigoExato);
      clientesCache.current[cacheKey] = porCodigoExato;
      return;
    }
    
    // Filtros por relevância
    const porCodigo = clientes.filter(c => 
      c.codigo && c.codigo.toString().startsWith(termo)
    ).slice(0, 20);
    
    const porNome = clientes.filter(c => 
      c.nome && c.nome.toLowerCase().includes(termoLower) ||
      c.razao && c.razao.toLowerCase().includes(termoLower)
    ).slice(0, 20);
    
    // Combinar resultados sem duplicação
    const combinados = [...new Set([...porCodigo, ...porNome])];
    
    // Garantir que todos os clientes filtrados tenham a estrutura correta
    const combinadosProcessados = combinados.map(cliente => {
      // Se o cliente já tem a estrutura correta, retorná-lo como está
      if (cliente.endereco && cliente.contato) {
        return cliente;
      }
      
      // Caso contrário, adicionar a estrutura necessária
      return {
        ...cliente,
        endereco: cliente.endereco || {
          logradouro: cliente.logradouro || '',
          numero: cliente.logradouro_num || '',
          complemento: cliente.complemento || '',
          bairro: cliente.bairro || '',
          cidade: cliente.municipio || '',
          uf: cliente.uf || '',
          cep: cliente.cep || ''
        },
        contato: cliente.contato || {
          telefone: cliente.ddd_fone1 && cliente.fone1 ? 
            `(${cliente.ddd_fone1}) ${cliente.fone1}` : '',
          celular: cliente.ddd_celular && cliente.celular ? 
            `(${cliente.ddd_celular}) ${cliente.celular}` : '',
          email: cliente.email || ''
        }
      };
    });
    
    // Salvar no cache e atualizar estado
    clientesCache.current[cacheKey] = combinadosProcessados;
    setClientesFiltrados(combinadosProcessados);
  }, 200), [clientes]);
  
  // Efeito para inicializar clientes filtrados quando a lista de clientes mudar
  useEffect(() => {
    if (clientes.length > 0) {
      if (clienteSearchTerm.length >= 2) {
        filtrarClientes(clienteSearchTerm);
      } else {
        setClientesFiltrados(clientes.slice(0, 20));
      }
    } else {
      setClientesFiltrados([]);
    }
  }, [clientes, filtrarClientes]);
  
  // Efeito para aplicar filtro quando o termo de busca mudar
  useEffect(() => {
    if (clienteSearchTerm.length >= 2) {
      filtrarClientes(clienteSearchTerm);
    } else if (clienteSearchTerm.length === 0) {
      setClientesFiltrados(clientes.slice(0, 20));
    }
  }, [clienteSearchTerm, filtrarClientes]);
  
  // Adicionar função para buscar dados do PDF
  const buscarDadosPDF = async () => {
    if (!orcamentoCodigo) return;
    
    setLoadingPDF(true);
    try {
      const response = await orcamentosAPI.gerarPDF(orcamentoCodigo);
      if (response && response.data && response.data.success) {
        console.log('Dados recebidos para o PDF:', response.data.data);
        
        // Se os dados contiverem itens, verificar a informação de unidade
        if (response.data.data && response.data.data.itens) {
          // Garantir que todos os itens tenham informação de unidade
          response.data.data.itens = response.data.data.itens.map(item => {
            // Se não tiver unidade definida, mas tiver a flag isUnidade2, usar produto.unidade2
            if (!item.unidade && item.isUnidade2 && item.produto && item.produto.unidade2) {
              return { ...item, unidade: item.produto.unidade2 };
            }
            // Se não tiver unidade definida e não for unidade2, usar produto.unidade
            else if (!item.unidade && item.produto && item.produto.unidade) {
              return { ...item, unidade: item.produto.unidade };
            }
            
            return item;
          });
          
          console.log('Itens no PDF após ajuste de unidades:', response.data.data.itens.map(item => ({
            codigo: item.produto_codigo,
            descricao: item.produto_descricao,
            unidade: item.unidade,
            isUnidade2: item.isUnidade2
          })));
        }
        
        setDadosPDF(response.data.data);
      } else {
        exibirNotificacao('Erro ao gerar PDF do orçamento', 'error');
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      exibirNotificacao('Erro ao gerar PDF do orçamento', 'error');
    } finally {
      setLoadingPDF(false);
    }
  };
  
  // Atualizar carregamento quando usuário logado mudar
  useEffect(() => {
    if (usuarioLogado) {
      carregarDados();
    }
  }, [usuarioLogado, id]);
  
  // Adicionar este novo useEffect para proteção extra
  useEffect(() => {
    // Se o usuário não for admin, garantir que o vendedor selecionado seja sempre o vendedor do usuário
    if (usuarioLogado && usuarioLogado.role !== 'admin' && usuarioLogado.vendedor) {
      // Se o vendedor selecionado for diferente do vendedor do usuário, redefini-lo
      if (vendedorSelecionado && vendedorSelecionado.codigo !== usuarioLogado.vendedor.codigo) {
        console.warn('Tentativa de alterar vendedor detectada. Restaurando vendedor original.');
        setVendedorSelecionado(usuarioLogado.vendedor);
      }
    }
  }, [usuarioLogado, vendedorSelecionado]);
  
  // Efeito para verificar se estamos no modo de edição
  useEffect(() => {
    if (id && id !== 'novo') {
      setIsEdicao(true);
      setOrcamentoCodigo(id);
    } else {
      setIsEdicao(false);
      setOrcamentoCodigo(null);
    }
  }, [id]);
  
  // Efeito para carregar clientes quando o componente montar ou o vendedor mudar
  useEffect(() => {
    const codVendedor = vendedorSelecionado?.codigo || usuarioLogado?.vendedor?.codigo;
    
    if (codVendedor) {
      console.log(`🚀 Efeito acionado: carregando clientes para vendedor ${codVendedor}`);
      carregarClientesPorVendedor(codVendedor);
    }
  }, [vendedorSelecionado, usuarioLogado?.vendedor?.codigo]);
  
  // Restaurar a função handleVendedorSelect que foi removida
  const handleVendedorSelect = async (id) => {
    if (!id) {
      setVendedorSelecionado(null);
      return;
    }

    // Verificar se já temos o vendedor no estado
    const vendedorExistente = vendedores.find(v => v.codigo.toString() === id.toString());
    if (vendedorExistente) {
      console.log('Vendedor selecionado (do cache):', vendedorExistente);
      setVendedorSelecionado(vendedorExistente);
      
      // Carregar clientes vinculados a este vendedor
      await carregarClientesPorVendedor(id);
      return;
    }

    // Se não encontrou, buscar da API
    setLoading(true);
    try {
      const response = await vendedoresAPI.obterPorId(id);
      if (response && response.data) {
        const vendedor = response.data.data || response.data;
        console.log('Vendedor selecionado (da API):', vendedor);
        setVendedorSelecionado(vendedor);
        
        // Carregar clientes vinculados a este vendedor
        await carregarClientesPorVendedor(id);
        
        // Adicionar ao cache
        setVendedores(prevVendedores => [...prevVendedores, vendedor]);
      } else {
        // Se não encontrar, criar um objeto vendedor básico
        const vendedorBasico = {
          codigo: id,
          nome: `Vendedor #${id}`
        };
        console.log('Vendedor básico criado:', vendedorBasico);
        setVendedorSelecionado(vendedorBasico);
        
        // Carregar clientes vinculados a este vendedor
        await carregarClientesPorVendedor(id);
      }
    } catch (error) {
      console.error(`Erro ao buscar vendedor ${id}:`, error);
      exibirNotificacao('Erro ao buscar dados do vendedor.');
    } finally {
      setLoading(false);
    }
  };

  // Restaurar a função handleFormaPagamentoSelect
  const handleFormaPagamentoSelect = async (id) => {
    if (!id) {
      setFormaPagamentoSelecionada(null);
      return;
    }

    // Verificar se já temos a forma de pagamento no estado
    const formaExistente = formasPagamento.find(f => f.codigo.toString() === id.toString());
    if (formaExistente) {
      console.log('Forma de pagamento selecionada (do cache):', formaExistente);
      setFormaPagamentoSelecionada(id);
      return;
    }

    // Se não encontrou, buscar da API
    setLoading(true);
    try {
      const response = await pagamentosAPI.buscarFormaPorId(id);
      if (response && response.data) {
        const formaPagto = response.data.data || response.data;
        console.log('Forma de pagamento selecionada (da API):', formaPagto);
        // Adicionar ao array local para futuras referências
        setFormasPagamento(prevFormas => {
          // Verificar se já não foi adicionado enquanto esperávamos a resposta
          const jaExiste = prevFormas.some(f => f.codigo === formaPagto.codigo);
          return jaExiste ? prevFormas : [...prevFormas, formaPagto];
        });
        setFormaPagamentoSelecionada(id);
      } else {
        exibirNotificacao(`Não foi possível carregar a forma de pagamento com código ${id}`);
        setFormaPagamentoSelecionada(null);
      }
    } catch (error) {
      console.error('Erro ao buscar forma de pagamento:', error);
      exibirNotificacao(`Erro ao buscar forma de pagamento: ${error.message}`);
      setFormaPagamentoSelecionada(null);
    } finally {
      setLoading(false);
    }
  };

  // Restaurar a função handleCondicaoPagamentoSelect
  const handleCondicaoPagamentoSelect = async (id) => {
    if (!id) {
      setCondicaoPagamentoSelecionada(null);
      return;
    }

    // Verificar se já temos a condição de pagamento no estado
    const condicaoExistente = condicoesPagamento.find(c => c.codigo.toString() === id.toString());
    if (condicaoExistente) {
      console.log('Condição de pagamento selecionada (do cache):', condicaoExistente);
      setCondicaoPagamentoSelecionada(id);
      return;
    }

    // Se não encontrou, buscar da API
    setLoading(true);
    try {
      const response = await pagamentosAPI.buscarCondicaoPorId(id);
      if (response && response.data) {
        const condPagto = response.data.data || response.data;
        console.log('Condição de pagamento selecionada (da API):', condPagto);
        // Adicionar ao array local para futuras referências
        setCondicoesPagamento(prevCondicoes => {
          // Verificar se já não foi adicionado enquanto esperávamos a resposta
          const jaExiste = prevCondicoes.some(c => c.codigo === condPagto.codigo);
          return jaExiste ? prevCondicoes : [...prevCondicoes, condPagto];
        });
        setCondicaoPagamentoSelecionada(id);
      } else {
        exibirNotificacao(`Não foi possível carregar a condição de pagamento com código ${id}`);
        setCondicaoPagamentoSelecionada(null);
      }
    } catch (error) {
      console.error('Erro ao buscar condição de pagamento:', error);
      exibirNotificacao(`Erro ao buscar condição de pagamento: ${error.message}`);
      setCondicaoPagamentoSelecionada(null);
    } finally {
      setLoading(false);
    }
  };
  
  // Adicionar um componente estilizado para os botões
  const StyledButton = styled(Button)(({ theme }) => ({
    borderRadius: '10px',
    padding: '10px 24px',
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.95rem',
    boxShadow: 'none',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'linear-gradient(rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0))',
      opacity: 0,
      transition: 'opacity 0.3s ease',
    },
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
      '&::after': {
        opacity: 1,
      },
    },
    '&:active': {
      transform: 'translateY(0)',
    },
    '&.Mui-disabled': {
      backgroundColor: '#e0e0e0',
      color: '#9e9e9e',
    },
    // Variantes de cor
    '&.primary': {
      background: 'linear-gradient(45deg, #1976d2, #2196f3)',
      color: 'white',
      '&:hover': {
        background: 'linear-gradient(45deg, #1565c0, #1976d2)',
      },
    },
    '&.success': {
      background: 'linear-gradient(45deg, #2e7d32, #43a047)',
      color: 'white',
      '&:hover': {
        background: 'linear-gradient(45deg, #1b5e20, #2e7d32)',
      },
    },
    '&.warning': {
      background: 'linear-gradient(45deg, #f57c00, #ff9800)',
      color: 'white',
      '&:hover': {
        background: 'linear-gradient(45deg, #e65100, #f57c00)',
      },
    },
    '&.error': {
      background: 'linear-gradient(45deg, #d32f2f, #f44336)',
      color: 'white',
      '&:hover': {
        background: 'linear-gradient(45deg, #c62828, #d32f2f)',
      },
    },
    '&.outlined': {
      background: 'transparent',
      border: '2px solid',
      borderColor: theme.palette.primary.main,
      color: theme.palette.primary.main,
      '&:hover': {
        background: 'rgba(25, 118, 210, 0.04)',
        borderColor: theme.palette.primary.dark,
      },
    },
    // Tamanhos
    '&.small': {
      padding: '6px 16px',
      fontSize: '0.875rem',
    },
    '&.large': {
      padding: '12px 32px',
      fontSize: '1rem',
    },
    // Estilo para botões com ícones
    '& .MuiSvgIcon-root': {
      marginRight: '8px',
      fontSize: '1.2em',
      transition: 'transform 0.2s ease',
    },
    '&:hover .MuiSvgIcon-root': {
      transform: 'scale(1.1)',
    },
    // Estilo para loading
    '& .MuiCircularProgress-root': {
      marginRight: '8px',
      color: 'inherit',
    },
  }));

  // Botão de Ação Principal
  const ActionButton = styled(StyledButton)(({ theme }) => ({
    width: '100%',
    marginBottom: theme.spacing(2),
    minHeight: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
    '& .button-content': {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
    },
  }));
  
  // Botão de Adicionar Item
  const AddItemButton = styled(StyledButton)(({ theme }) => ({
    height: 56,
    width: '100%',
    background: modoEdicaoItem => 
      modoEdicaoItem 
        ? 'linear-gradient(45deg, #2196f3, #1976d2)' // Azul para edição
        : 'linear-gradient(45deg, #9c27b0, #7b1fa2)', // Roxo para adição
    '&:hover': {
      background: modoEdicaoItem => 
      modoEdicaoItem 
        ? 'linear-gradient(45deg, #1976d2, #0d47a1)' // Azul escuro para hover em edição
        : 'linear-gradient(45deg, #7b1fa2, #6a1b9a)', // Roxo escuro para hover em adição
    },
    '&.Mui-disabled': {
      background: '#e0e0e0',
      color: '#9e9e9e',
    },
  }));
  
  // Carregar configurações de validação de estoque
  useEffect(() => {
    const loadStockValidationSettings = async () => {
      try {
        const response = await configurationAPI.getStockValidationSettings();
        if (response.success && response.data) {
          setValidateStockInQuotations(response.data.validate_stock_in_quotations);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações de validação de estoque:', error);
      }
    };
    
    loadStockValidationSettings();
    
    // Pré-carregar transportadoras quando o componente montar
    const preloadTransportadoras = async () => {
      try {
        console.log('Pré-carregando lista de transportadoras...');
        setSearchingTransportadora(true);
        
        const response = await transportadoraService.getAll();
        if (response && response.success) {
          const transportadorasData = response.data || [];
          console.log('Transportadoras pré-carregadas com sucesso:', transportadorasData.length);
          
          // Armazenar no cache e no estado
          transportadorasTodasCache.current = transportadorasData;
          setTransportadoras(transportadorasData);
        } else {
          console.error('Erro na resposta da API ao pré-carregar transportadoras:', response);
          setTransportadoras([]);
        }
      } catch (error) {
        console.error('Erro ao pré-carregar transportadoras:', error);
        // Dados de fallback para garantir que algo seja exibido
        const dadosTeste = [
          { codigo: '1001', nome: 'TRANSPORTADORA TESTE 1' },
          { codigo: '1002', nome: 'TRANSPORTADORA TESTE 2' },
          { codigo: '1003', nome: 'TRANSPORTADORA TESTE 3' }
        ];
        transportadorasTodasCache.current = dadosTeste;
        setTransportadoras(dadosTeste);
      } finally {
        setSearchingTransportadora(false);
      }
    };
    
    preloadTransportadoras();
  }, []);
  
  // Função otimizada para buscar transportadoras que usa cache
  const buscarTransportadoras = async (termo) => {
    console.log('Buscando transportadoras com termo:', termo);
    setSearchingTransportadora(true);
    
    try {
      // Verificar se é uma busca sem termo (todas as transportadoras)
      if (!termo || termo.trim() === '') {
        // Verificar se já temos todas as transportadoras em cache
        if (transportadorasTodasCache.current.length > 0) {
          console.log('Usando transportadoras em cache:', transportadorasTodasCache.current.length);
          setTransportadoras(transportadorasTodasCache.current);
          setSearchingTransportadora(false);
          return;
        }
        
        // Se não estiver em cache, buscar da API
        console.log('Buscando todas as transportadoras do servidor');
        const response = await transportadoraService.getAll();
        
        if (response && response.success) {
          const transportadorasData = response.data || [];
          console.log('Transportadoras encontradas:', transportadorasData.length);
          
          // Salvar no cache e no estado
          transportadorasTodasCache.current = transportadorasData;
          setTransportadoras(transportadorasData);
        } else {
          console.error('Erro na resposta da API:', response);
          setTransportadoras([]);
        }
      } else {
        // Busca com termo - verificar cache primeiro
        const termoLower = termo.toLowerCase();
        const cacheKey = `termo_${termoLower}`;
        
        if (transportadorasCache.current[cacheKey]) {
          console.log('Usando resultado de busca em cache para:', termo);
          setTransportadoras(transportadorasCache.current[cacheKey]);
          setSearchingTransportadora(false);
          return;
        }
        
        // Se não tiver em cache, primeiro tentar filtrar do cache completo local
        if (transportadorasTodasCache.current.length > 0) {
          console.log('Filtrando transportadoras do cache local para:', termo);
          
          const resultadosFiltrados = transportadorasTodasCache.current.filter(t => 
            t.codigo?.toString().toLowerCase().includes(termoLower) || 
            t.nome?.toLowerCase().includes(termoLower)
          );
          
          if (resultadosFiltrados.length > 0) {
            console.log('Transportadoras filtradas localmente:', resultadosFiltrados.length);
            transportadorasCache.current[cacheKey] = resultadosFiltrados;
            setTransportadoras(resultadosFiltrados);
            setSearchingTransportadora(false);
            return;
          }
        }
        
        // Se não encontrou filtro local, buscar da API
        console.log('Buscando transportadoras no servidor com filtro:', termo);
        const response = await transportadoraService.search(termo);
        
        if (response && response.success) {
          const transportadorasData = response.data || [];
          console.log('Transportadoras encontradas da API:', transportadorasData.length);
          
          // Salvar no cache e no estado
          transportadorasCache.current[cacheKey] = transportadorasData;
          setTransportadoras(transportadorasData);
        } else {
          console.error('Erro na resposta da API:', response);
          setTransportadoras([]);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar transportadoras:', error);
      
      // Se já temos dados em cache, usar mesmo com erro
      if (transportadorasTodasCache.current.length > 0) {
        setTransportadoras(transportadorasTodasCache.current);
      } else {
        // Dados de fallback se não tiver cache
        const dadosTeste = [
          { codigo: '1001', nome: 'TRANSPORTADORA TESTE 1' },
          { codigo: '1002', nome: 'TRANSPORTADORA TESTE 2' },
          { codigo: '1003', nome: 'TRANSPORTADORA TESTE 3' }
        ];
        setTransportadoras(dadosTeste);
        transportadorasTodasCache.current = dadosTeste;
      }
    } finally {
      setSearchingTransportadora(false);
    }
  };
  
  // Processador de busca imediata para termos curtos
  const processarBuscaTransportadora = useCallback((termo) => {
    setSearchingTransportadora(true);
    
    // Se termo for vazio ou muito curto, mostrar todas as transportadoras em cache
    if (!termo || termo.length < 2) {
      if (transportadorasTodasCache.current.length > 0) {
        setTransportadoras(transportadorasTodasCache.current);
        setSearchingTransportadora(false);
      } else {
        // Se não tiver cache, buscar todas
        buscarTransportadoras('');
      }
      return;
    }
    
    // Para termos de busca, tentar filtrar localmente primeiro (resposta instantânea)
    const termoLower = termo.toLowerCase();
    const cacheKey = `termo_${termoLower}`;
    
    if (transportadorasCache.current[cacheKey]) {
      setTransportadoras(transportadorasCache.current[cacheKey]);
      setSearchingTransportadora(false);
    } else if (transportadorasTodasCache.current.length > 0) {
      // Filtrar do cache local antes de ir ao servidor
      const resultadosFiltrados = transportadorasTodasCache.current.filter(t => 
        t.codigo?.toString().toLowerCase().includes(termoLower) || 
        t.nome?.toLowerCase().includes(termoLower)
      );
      
      if (resultadosFiltrados.length > 0) {
        transportadorasCache.current[cacheKey] = resultadosFiltrados;
        setTransportadoras(resultadosFiltrados);
        setSearchingTransportadora(false);
      } else {
        // Se não encontrou localmente, buscar do servidor
        buscarTransportadoras(termo);
      }
    } else {
      // Se não tem cache local, buscar do servidor
      buscarTransportadoras(termo);
    }
  }, []);
  
  // Criar debouncedSearchTransportadora para buscas com mais de 2 caracteres
  const debouncedSearchTransportadora = useCallback(
    debounce((value) => {
      if (value.length >= 2) {
        console.log('Executando debounce para busca de transportadora:', value);
        buscarTransportadoras(value);
      }
    }, 300), // Reduzido o tempo de debounce
    [] // Não adicionamos buscarTransportadoras como dependência para evitar loops
  );
  
  // Efeito para executar a busca de transportadoras quando o termo de busca mudar
  useEffect(() => {
    if (searchTransportadoraTerm !== undefined) {
      console.log('Termo de busca transportadora alterado:', searchTransportadoraTerm);
      
      // Processamento imediato para termos curtos
      processarBuscaTransportadora(searchTransportadoraTerm);
      
      // Para termos mais longos, também aplicar debounce para busca no servidor
      if (searchTransportadoraTerm.length >= 2) {
        debouncedSearchTransportadora(searchTransportadoraTerm);
      }
    }
  }, [searchTransportadoraTerm, processarBuscaTransportadora, debouncedSearchTransportadora]);
  
  // Detectar se é dispositivo móvel
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <div className="mobile-container">
      <Box sx={{ mb: isMobile ? 2 : 3 }}>
        <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} justifyContent="space-between" alignItems={isMobile ? "flex-start" : "center"} mb={isMobile ? 2 : 3}>
          <Typography variant={isMobile ? "h5" : "h4"} className={isMobile ? "mobile-fiscal-text" : ""}>
            {isEdicao ? `Editar Orçamento #${orcamentoCodigo}` : 'Novo Orçamento de Vendas'}
          </Typography>
          <ActionButton
            className={`outlined small ${isMobile ? 'action-button-mobile' : ''}`}
            onClick={() => navigate('/orcamentos')}
            sx={{ 
              minWidth: 'auto',
              px: isMobile ? 2 : 3,
              py: 1,
              mt: isMobile ? 1 : 0,
              borderColor: 'divider',
              color: 'text.secondary',
              '&:hover': {
                borderColor: 'primary.main',
                color: 'primary.main',
                backgroundColor: 'rgba(25, 118, 210, 0.04)'
              }
            }}
          >
            <div className="button-content">
              <ArrowBackIcon />
              <span>Voltar para Orçamentos</span>
            </div>
          </ActionButton>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
        
        {dataLoading ? (
          <Paper sx={{ p: 5 }}>
            <Box display="flex" justifyContent="center" alignItems="center">
              <CircularProgress />
              <Typography variant="body1" sx={{ ml: 2 }}>
                Carregando dados...
              </Typography>
            </Box>
          </Paper>
        ) : (
          <>
            {/* Cabeçalho do Orçamento - Cliente e Vendedor */}
            <Paper sx={{ p: 0, mb: 3, overflow: 'hidden', boxShadow: 2 }}>
              <Box sx={{ p: 2, backgroundColor: 'primary.main', color: 'white' }}>
                <Typography variant="h6" fontWeight="500">
                  Dados do Orçamento {isEdicao && orcamentoCodigo && (
                    <Chip 
                      label={getStatusText(dadosOrcamento.status)}
                      color={getStatusColor(dadosOrcamento.status)}
                      size="small"
                      sx={{ ml: 2, fontWeight: 'bold' }}
                    />
                  )}
                </Typography>
              </Box>
            </Paper>
            
            {/* Cliente - Seção separada */}
            <Paper 
              sx={{ 
                p: 0, 
                mb: 2,
                overflow: 'hidden', 
                boxShadow: 1, 
                borderRadius: 2
              }}
            >
              <Box sx={{ 
                p: 1.5, 
                background: 'linear-gradient(90deg, #1976d2 0%, #2196f3 100%)', 
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
              }}>
                <PersonIcon sx={{ fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight="500">
                  Cliente
                </Typography>
              </Box>
              
              <Box sx={{ p: 2 }}>
                {/* Adicionar alerta quando não houver clientes vinculados ao vendedor */}
                {vendedorSelecionado && clientes.length === 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Não há clientes vinculados ao vendedor {vendedorSelecionado.nome}.
                  </Alert>
                )}
                
                <Autocomplete
                  id="cliente-autocomplete"
                  options={clientesFiltrados}
                  getOptionLabel={(option) => `${option.codigo} - ${option.razao || option.nome}`}
                  isOptionEqualToValue={(option, value) => option.codigo === value.codigo}
                  value={clienteSelecionado}
                  onChange={(event, newValue) => {
                    if (newValue) {
                      handleClienteSelect(newValue.codigo);
                    } else {
                      setClienteSelecionado(null);
                    }
                  }}
                  onInputChange={(event, newInputValue) => {
                    setClienteSearchTerm(newInputValue);
                  }}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} sx={{ 
                      py: 1, 
                      px: 1,
                      borderBottom: '1px solid rgba(0,0,0,0.05)'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <PersonIcon sx={{ color: 'primary.main', mr: 1, fontSize: 20, flexShrink: 0 }} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
                          <Typography variant="body1" fontWeight="500" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {option.codigo} - {option.razao || option.nome}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {option.cnpj || option.cpf || ''} {option.cidade ? `- ${option.cidade}/${option.uf}` : option.uf || ''}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params} 
                      label="Selecione o Cliente"
                      placeholder="Digite código ou nome do cliente..."
                      variant="outlined"
                      fullWidth
                      required
                      disabled={!vendedorSelecionado}
                      helperText={!vendedorSelecionado ? "Selecione um vendedor primeiro" : (loadingClientes ? "Carregando clientes..." : "")}
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          padding: '4px 8px',
                          transition: 'box-shadow 0.3s',
                          '&:hover': {
                            boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)'
                          },
                          '&.Mui-focused': {
                            boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.3)'
                          }
                        },
                        '& .MuiInputLabel-root': {
                          transform: 'translate(14px, 14px) scale(1)'
                        },
                        '& .MuiInputLabel-shrink': {
                          transform: 'translate(14px, -6px) scale(0.75)'
                        }
                      }}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon color="primary" fontSize="medium" />
                            {params.InputProps.startAdornment}
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <>
                            {loadingClientes ? <CircularProgress color="inherit" size={24} sx={{ mr: 2 }} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                        sx: {
                          padding: '4px 4px'
                        }
                      }}
                    />
                  )}
                  noOptionsText={clienteSearchTerm.length < 2 ? "Digite pelo menos 2 caracteres" : "Nenhum cliente encontrado"}
                  ListboxProps={{
                    sx: { 
                      maxHeight: '300px'
                    }
                  }}
                  slotProps={{
                    popper: {
                      sx: { width: 'fit-content', minWidth: '450px', maxWidth: '95vw' }
                    }
                  }}
                  loading={loadingClientes}
                  loadingText="Carregando clientes..."
                  filterOptions={(x) => x} // Desabilitar filtro interno - já estamos filtrando manualmente
                  blurOnSelect
                  selectOnFocus
                  clearOnBlur={false}
                  disableListWrap
                  disablePortal={false}
                  openOnFocus
                />

                {/* Card de informações do cliente selecionado */}
                {clienteSelecionado && (
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      mt: 2,
                      borderRadius: 2, 
                      boxShadow: 'rgb(0 0 0 / 5%) 0px 1px 8px',
                      transition: 'all 0.3s ease-in-out',
                      '&:hover': {
                        boxShadow: 'rgb(0 0 0 / 10%) 0px 4px 12px'
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="subtitle1" fontWeight="600" color="primary.main" sx={{ display: 'flex', alignItems: 'center' }}>
                          <PersonIcon sx={{ mr: 0.5, fontSize: 18 }} />
                          {clienteSelecionado.razao || clienteSelecionado.nome}
                        </Typography>
                        <Chip 
                          size="small" 
                          label={clienteSelecionado.uf || "UF não informada"}
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                      
                      <Grid container spacing={1}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Código
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {clienteSelecionado.codigo}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Documento
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {clienteSelecionado.cnpj || clienteSelecionado.cpf || "Não informado"}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Cidade
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {clienteSelecionado.cidade || "Não informada"}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Telefone
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {clienteSelecionado.telefone || 
                            (clienteSelecionado.contato && clienteSelecionado.contato.telefone) || 
                            clienteSelecionado.celular || 
                            (clienteSelecionado.contato && clienteSelecionado.contato.celular) || 
                            "Não informado"}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">
                            Endereço
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {clienteSelecionado.endereco ? (
                              `${clienteSelecionado.endereco.logradouro || ''}, ${clienteSelecionado.endereco.numero || ''} ${clienteSelecionado.endereco.bairro ? `- ${clienteSelecionado.endereco.bairro}` : ''}`
                            ) : (
                              clienteSelecionado.logradouro ? (
                                `${clienteSelecionado.logradouro}, ${clienteSelecionado.numero || ''} ${clienteSelecionado.bairro ? `- ${clienteSelecionado.bairro}` : ''}`
                              ) : "Não informado"
                            )}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                )}
              </Box>
            </Paper>
            
            {/* Seção de Transportadora, Pagamento, Observações */}
            <Paper 
              sx={{ 
                p: 0, 
                mb: 2,
                overflow: 'hidden', 
                boxShadow: '0 2px 10px rgba(0,0,0,0.08)', 
                borderRadius: 2,
                border: '1px solid rgba(0,0,0,0.05)'
              }}
              elevation={0}
            >
              <Box sx={{ 
                p: 1.5, 
                background: 'linear-gradient(90deg, #1565c0 0%, #2196f3 100%)', 
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
              }}>
                <LocalOfferIcon sx={{ fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight="600">
                  Detalhes do Orçamento
                </Typography>
              </Box>
              
              <Box sx={{ p: 1.5 }}>
                <Grid container spacing={2}>
                  {/* Coluna Transportadora */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <LocalShippingIcon fontSize="small" sx={{ mr: 0.5, color: 'primary.main' }} />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Transportadora
                      </Typography>
                    </Box>
                    <FormControl fullWidth>
                      <Select
                        id="transportadora-select"
                        value={transportadoraSelecionada?.codigo || ''}
                        onChange={(e) => {
                          const codigo = e.target.value;
                          if (!codigo) {
                            setTransportadoraSelecionada(null);
                            return;
                          }
                          const transportadoraEncontrada = transportadoras.find(t => t.codigo === codigo);
                          if (transportadoraEncontrada) {
                            setTransportadoraSelecionada(transportadoraEncontrada);
                          }
                        }}
                        displayEmpty
                        size="medium"
                        disabled={dataLoading || dadosOrcamento.status === 'CONVERTIDO'}
                        renderValue={(selected) => {
                          if (!selected) {
                            return <em>Selecione a transportadora</em>;
                          }
                          const transportadora = transportadoras.find(t => t.codigo === selected);
                          return transportadora ? (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <LocalShippingIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                  {transportadora.nome}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Código: {transportadora.codigo}
                                </Typography>
                              </Box>
                            </Box>
                          ) : selected;
                        }}
                        sx={{
                          height: '52px',
                          borderRadius: 1,
                          fontSize: '0.95rem',
                          '&:hover': {
                            boxShadow: '0 0 0 1px rgba(0, 128, 0, 0.2)'
                          },
                          '&.Mui-focused': {
                            boxShadow: '0 0 0 2px rgba(0, 128, 0, 0.3)'
                          }
                        }}
                        onOpen={() => {
                          setSelectMenuOpen(true);
                          setTransportadoraFilter('');
                        }}
                        onClose={() => setSelectMenuOpen(false)}
                        MenuProps={{
                          PaperProps: {
                            style: {
                              maxHeight: 350,
                              width: 'auto',
                              minWidth: 300,
                              maxWidth: 600
                            },
                          },
                          MenuListProps: {
                            sx: { py: 0 },
                          }
                        }}
                      >
                        {selectMenuOpen && (
                          <Box
                            sx={{
                              position: 'sticky',
                              top: 0,
                              backgroundColor: '#fff',
                              zIndex: 1,
                              p: 1,
                              borderBottom: '1px solid rgba(0,0,0,0.1)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <TextField
                              size="small"
                              placeholder="Filtrar transportadoras..."
                              fullWidth
                              value={transportadoraFilter}
                              onChange={(e) => setTransportadoraFilter(e.target.value)}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                  </InputAdornment>
                                ),
                              }}
                              sx={{ 
                                '& .MuiOutlinedInput-root': { 
                                  borderRadius: 1,
                                  fontSize: '0.875rem'
                                }
                              }}
                            />
                          </Box>
                        )}
                        <MenuItem value="" sx={{ py: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <LocalShippingIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary', opacity: 0.7 }} />
                            <em>Selecione a transportadora</em>
                          </Box>
                        </MenuItem>
                        {transportadoras.map((transportadora) => (
                          <MenuItem 
                            key={transportadora.codigo} 
                            value={transportadora.codigo}
                            sx={{ 
                              py: 1.5,
                              borderBottom: '1px solid rgba(0,0,0,0.05)',
                              '&:last-child': { borderBottom: 'none' }
                            }}
                          >
                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                {transportadora.nome}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Código: {transportadora.codigo}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  {/* Coluna Pagamento */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Forma de Pagamento
                        </Typography>
                        <FormControl fullWidth variant="outlined" size="medium">
                          <Select
                            id="forma-pagamento"
                            value={formaPagamentoSelecionada || ''}
                            onChange={(e) => handleFormaPagamentoSelect(e.target.value)}
                            displayEmpty
                            disabled={dataLoading || dadosOrcamento.status === 'CONVERTIDO'}
                            sx={{
                              borderRadius: 1,
                              height: '48px',
                              fontSize: '0.95rem',
                              '&:hover': {
                                boxShadow: '0 0 0 1px rgba(0, 128, 0, 0.2)'
                              },
                              '&.Mui-focused': {
                                boxShadow: '0 0 0 2px rgba(0, 128, 0, 0.3)'
                              }
                            }}
                          >
                            <MenuItem value="">
                              <em>Selecione a forma de pagamento</em>
                            </MenuItem>
                            {formasPagamento.map(forma => (
                              <MenuItem key={forma.codigo} value={forma.codigo}>
                                {forma.descricao}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                      
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Condição de Pagamento
                        </Typography>
                        <FormControl fullWidth variant="outlined" size="medium">
                          <Select
                            id="condicao-pagamento"
                            value={condicaoPagamentoSelecionada || ''}
                            onChange={(e) => handleCondicaoPagamentoSelect(e.target.value)}
                            displayEmpty
                            disabled={dataLoading || dadosOrcamento.status === 'CONVERTIDO'}
                            sx={{
                              borderRadius: 1,
                              height: '48px',
                              fontSize: '0.95rem',
                              '&:hover': {
                                boxShadow: '0 0 0 1px rgba(0, 128, 0, 0.2)'
                              },
                              '&.Mui-focused': {
                                boxShadow: '0 0 0 2px rgba(0, 128, 0, 0.3)'
                              }
                            }}
                          >
                            <MenuItem value="">
                              <em>Selecione a condição de pagamento</em>
                            </MenuItem>
                            {condicoesPagamento.map(condicao => (
                              <MenuItem key={condicao.codigo} value={condicao.codigo}>
                                {condicao.descricao}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>
                  </Grid>
                  
                  {/* Coluna Observações */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Observações
                    </Typography>
                    <TextField
                      variant="outlined"
                      fullWidth
                      multiline
                      rows={3}
                      size="medium"
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      disabled={dataLoading || dadosOrcamento.status === 'CONVERTIDO'}
                      placeholder="Informações adicionais..."
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <DescriptionIcon color="primary" fontSize="medium" />
                          </InputAdornment>
                        ),
                        sx: {
                          fontSize: '0.95rem'
                        }
                      }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1,
                          transition: 'box-shadow 0.3s',
                          '&:hover': {
                            boxShadow: '0 0 0 1px rgba(128, 0, 128, 0.2)'
                          },
                          '&.Mui-focused': {
                            boxShadow: '0 0 0 2px rgba(128, 0, 128, 0.3)'
                          }
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Paper>
            
            {/* Vendedor - Seção separada */}
            <Paper 
              sx={{ 
                p: 0, 
                mb: 2,
                overflow: 'hidden', 
                boxShadow: 1, 
                borderRadius: 2
              }}
            >
              <Box sx={{ 
                p: 1.5, 
                background: 'linear-gradient(90deg, #7b1fa2 0%, #9c27b0 100%)', 
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
              }}>
                <AccountCircleIcon sx={{ fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight="500">
                  Vendedor
                </Typography>
              </Box>
              
              <Box sx={{ p: 2 }}>
                {/* Campo de Vendedor */}
                {usuarioLogado?.role === 'admin' ? (
                <Autocomplete
                  id="vendedor-autocomplete"
                  options={vendedores}
                  value={vendedorSelecionado}
                  isOptionEqualToValue={(option, value) => option.codigo === value.codigo}
                  getOptionLabel={(option) => option.nome || `${option.codigo}`}
                  loading={dataLoading}
                  disabled={dataLoading || dadosOrcamento.status === 'CONVERTIDO'}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} sx={{ py: 1, px: 1, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <StorefrontIcon sx={{ color: 'secondary.main', mr: 1.5, fontSize: 20 }} />
                        <Typography variant="body1" fontWeight="500">
                          {option.codigo} - {option.nome}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Vendedor"
                      variant="outlined"
                      required
                      error={!vendedorSelecionado && error ? true : false}
                      helperText={!vendedorSelecionado && error ? "Vendedor é obrigatório" : ""}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <InputAdornment position="start">
                              <StorefrontIcon color="inherit" fontSize="medium" />
                            </InputAdornment>
                            {params.InputProps.startAdornment}
                          </>
                        ),
                        endAdornment: (
                          <>
                            {dataLoading ? <CircularProgress color="inherit" size={24} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                        sx: {
                          padding: '4px 4px'
                        }
                      }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          padding: '4px 8px',
                          transition: 'box-shadow 0.3s',
                          '&:hover': {
                            boxShadow: '0 0 0 2px rgba(156, 39, 176, 0.2)'
                          },
                          '&.Mui-focused': {
                            boxShadow: '0 0 0 3px rgba(156, 39, 176, 0.3)'
                          }
                        },
                        '& .MuiInputLabel-root': {
                          transform: 'translate(14px, 14px) scale(1)'
                        },
                        '& .MuiInputLabel-shrink': {
                          transform: 'translate(14px, -6px) scale(0.75)'
                        }
                      }}
                    />
                  )}
                  onChange={(event, newValue) => {
                    if (newValue) {
                      handleVendedorSelect(newValue.codigo);
                    } else {
                      setVendedorSelecionado(null);
                    }
                  }}
                />
                ) : (
                  // Se não for admin, mostrar apenas um campo de texto não editável
                  <TextField
                    label="Vendedor"
                    value={vendedorSelecionado?.nome || ""}
                    variant="outlined"
                    fullWidth
                    disabled
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <StorefrontIcon color="inherit" fontSize="medium" />
                        </InputAdornment>
                      ),
                      readOnly: true,
                      sx: {
                        padding: '12px 14px',
                        height: '56px'
                      }
                    }}
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2
                      },
                      '& .MuiInputLabel-root': {
                        transform: 'translate(14px, 16px) scale(1)'
                      },
                      '& .MuiInputLabel-shrink': {
                        transform: 'translate(14px, -6px) scale(0.75)'
                      }
                    }}
                  />
                )}
                
                {/* Email e Telefone do vendedor */}
                {vendedorSelecionado && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, gap: 2 }}>
                    <TextField
                      label="Email"
                      value={vendedorSelecionado.email || "Não informado"}
                      disabled
                      sx={{ 
                        flexGrow: 1,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          height: '56px'
                        },
                        '& .MuiInputLabel-root': {
                          transform: 'translate(14px, 16px) scale(1)'
                        },
                        '& .MuiInputLabel-shrink': {
                          transform: 'translate(14px, -6px) scale(0.75)'
                        }
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon color="action" fontSize="medium" />
                          </InputAdornment>
                        ),
                        sx: {
                          padding: '12px 14px'
                        }
                      }}
                    />
                    <TextField
                      label="Telefone"
                      value={vendedorSelecionado.telefone || "Não informado"}
                      disabled
                      sx={{ 
                        flexGrow: 1,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          height: '56px'
                        },
                        '& .MuiInputLabel-root': {
                          transform: 'translate(14px, 16px) scale(1)'
                        },
                        '& .MuiInputLabel-shrink': {
                          transform: 'translate(14px, -6px) scale(0.75)'
                        }
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PhoneIcon color="action" fontSize="medium" />
                          </InputAdornment>
                        ),
                        sx: {
                          padding: '12px 14px'
                        }
                      }}
                    />
                  </Box>
                )}
              </Box>
            </Paper>
            
            {/* Adicionar Itens ao Orçamento */}
            <Paper sx={{ p: 0, mb: 2, overflow: 'hidden', boxShadow: 1, borderRadius: 2 }}>
              <Box sx={{ 
                p: 1.5, 
                background: modoEdicaoItem 
                  ? 'linear-gradient(90deg, #1976d2 0%, #2196f3 100%)' // Azul para edição 
                  : 'linear-gradient(90deg, #9c27b0 0%, #7b1fa2 100%)', // Roxo para adição
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {modoEdicaoItem ? <EditIcon sx={{ fontSize: 20 }} /> : <CartIcon sx={{ fontSize: 20 }} />}
                  <Typography variant="subtitle1" fontWeight="500">
                    {modoEdicaoItem ? "Editar Item" : "Adicionar Item"}
                  </Typography>
                </Box>
                
                {modoEdicaoItem && (
                  <>
                    <Chip 
                      label={`Editando item #${itemEditandoIndex + 1}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ 
                        color: 'white', 
                        borderColor: 'rgba(255,255,255,0.5)',
                        height: '24px'
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.7) 25%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.7) 75%)',
                        backgroundSize: '200% 100%',
                        animation: 'shine 2s infinite linear',
                        '@keyframes shine': {
                          '0%': { backgroundPosition: '200% 0' },
                          '100%': { backgroundPosition: '0 0' },
                        }
                      }}
                    />
                  </>
                )}
              </Box>
              
              <Box sx={{ p: 2 }} id="formulario-item">
                {/* Seleção de produto */}
                <Box sx={{ mb: 3 }}>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      mb: 1.5, 
                      display: 'flex', 
                      alignItems: 'center',
                      color: 'primary.dark',
                      fontWeight: 500
                    }}
                  >
                    <ProductionQuantityLimitsIcon sx={{ mr: 1 }} /> Produto
                  </Typography>
                  
                  <Autocomplete
                    options={produtosFiltrados}
                    getOptionLabel={(option) => `${option.codigo} - ${option.nome}`}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <InventoryIcon sx={{ color: 'primary.main', mr: 1.5, fontSize: 20 }} />
                            <Typography variant="body1" fontWeight="500">
                              {option.codigo} - {option.nome}
                            </Typography>
                          </Box>
                          <Box sx={{ ml: 5, mt: 0.5, display: 'flex', gap: 3 }}>
                            <Typography variant="body2" color="text.secondary">
                              Código de Barras: {option.cod_barras || 'N/A'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Unidade: {option.unidade}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Preço: R$ {option.preco_venda?.toFixed(2) || '0.00'}
                            </Typography>
                            {option.unidade2 && (
                              <Typography variant="body2" color="text.secondary">
                                Unidade2: {option.unidade2}
                              </Typography>
                            )}
                            {option.preco_venda2 && (
                              <Typography variant="body2" color="text.secondary">
                                Preço2: R$ {option.preco_venda2?.toFixed(2) || '0.00'}
                              </Typography>
                            )}
                            {option.estoque_disponivel && (
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: parseFloat(option.estoque_disponivel) > 0 ? 'success.main' : 'error.main',
                                  fontWeight: 500
                                }}
                              >
                                Estoque: {parseFloat(option.estoque_disponivel).toFixed(2)}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Selecione um produto"
                        placeholder="Digite código, nome ou referência do produto..."
                        variant="outlined"
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon color="action" />
                              {params.InputProps.startAdornment}
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <>
                              {filtrando ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                        fullWidth
                        sx={{ 
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            transition: 'all 0.3s',
                            '&:hover': {
                              boxShadow: '0 0 0 2px rgba(156, 39, 176, 0.2)'
                            },
                            '&.Mui-focused': {
                              boxShadow: '0 0 0 3px rgba(156, 39, 176, 0.3)'
                            }
                          }
                        }}
                      />
                    )}
                    value={produtoTemp}
                    onChange={(_, newValue) => {
                      setProdutoTemp(newValue);
                      if (newValue) {
                        // Usar o preço de venda da view
                        setValorUnitarioTemp(parseFloat(newValue.preco_venda) || 0);
                      } else {
                        setValorUnitarioTemp(0);
                      }
                    }}
                    inputValue={inputValue}
                    onInputChange={(_, newInputValue) => {
                      setInputValue(newInputValue);
                      setTermoBusca(newInputValue);
                    }}
                    onOpen={() => {
                      autocompleteOpen.current = true;
                    }}
                    onClose={() => {
                      autocompleteOpen.current = false;
                    }}
                    blurOnSelect={true}
                    clearOnBlur={false}
                    selectOnFocus
                    fullWidth
                    loading={filtrando}
                    loadingText="Carregando produtos..."
                    noOptionsText="Nenhum produto encontrado"
                    filterOptions={(x) => x} // Desabilita filtragem interna do Autocomplete - já fazemos isso manualmente
                  />
                  
                  {/* Exibição do Estoque */}
                  {produtoTemp && (
                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {/* Botão para alternar entre preço 1 e preço 2 */}
                      {produtoTemp.preco_venda2 && (
                        <Button
                          variant="outlined"
                          size="small"
                          color="secondary"
                          onClick={() => {
                            // Alternar entre preço 1 e preço 2
                            const isUsingPreco1 = parseFloat(valorUnitarioTemp) === parseFloat(produtoTemp.preco_venda);
                            const novoValor = isUsingPreco1 ? parseFloat(produtoTemp.preco_venda2) : parseFloat(produtoTemp.preco_venda);
                            setValorUnitarioTemp(novoValor);
                          }}
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          {parseFloat(valorUnitarioTemp) === parseFloat(produtoTemp.preco_venda) ? 
                            `Usar Preço 2: R$ ${parseFloat(produtoTemp.preco_venda2).toFixed(2)} (${produtoTemp.unidade2 || 'Un2'})` : 
                            `Usar Preço 1: R$ ${parseFloat(produtoTemp.preco_venda).toFixed(2)} (${produtoTemp.unidade})`}
                        </Button>
                      )}
                      
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {carregandoEstoque ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CircularProgress size={16} sx={{ mr: 1 }} />
                          <Typography variant="caption" color="text.secondary">
                            Carregando informações de estoque...
                          </Typography>
                        </Box>
                      ) : estoqueProduto ? (
                        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 3 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              color: parseFloat(estoqueProduto.qtd_disponivel || 0) > 0 ? 'success.main' : 'error.main',
                              fontWeight: 'bold'
                            }}
                          >
                            <InventoryIcon sx={{ mr: 0.5, fontSize: 18 }} />
                            Estoque Disponível: {parseFloat(estoqueProduto.qtd_disponivel || 0).toFixed(2)} {produtoTemp.unidade}
                              {produtoTemp.unidade2 && (
                                <> | {parseFloat(estoqueProduto.qtd_disponivel || 0).toFixed(2)} {produtoTemp.unidade2}</>
                              )}
                          </Typography>
                          {estoqueProduto.local_estoque && (
                            <Typography variant="body2" color="text.secondary">
                              Local: {estoqueProduto.local_estoque}
                            </Typography>
                          )}
                          {estoqueProduto.empresa && (
                            <Typography variant="body2" color="text.secondary">
                              Empresa: {estoqueProduto.empresa}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Informações de estoque não disponíveis
                        </Typography>
                      )}
                      </Box>
                    </Box>
                  )}
                  
                  {/* Status ST e informações fiscais */}
                  {produtoTemp && clienteSelecionado && (
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        mt: 1, 
                        p: 1.5, 
                        borderRadius: 2,
                        display: 'flex', 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        gap: 2,
                        background: 'linear-gradient(90deg, rgba(249, 250, 251, 1) 0%, rgba(242, 242, 247, 1) 100%)',
                        borderColor: 'divider'
                      }}
                    >
                      {verificandoST ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CircularProgress size={16} sx={{ mr: 1 }} />
                          <Typography variant="caption" color="text.secondary">
                            Verificando tributação...
                          </Typography>
                        </Box>
                      ) : (
                        <>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CategoryIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: 18 }} />
                            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                              Tributação:
                            </Typography>
                            {infoST && (
                              <STBadge temST={infoST.temST} showDetails={true} />
                            )}
                          </Box>
                          
                          {dadosFiscais && (
                            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                              {dadosFiscais.aliq_icms > 0 && (
                                <Chip 
                                  label={`ICMS: ${formatPercent(dadosFiscais.aliq_icms)}`} 
                                  size="small" 
                                  variant="outlined" 
                                  color="primary" 
                                />
                              )}
                              {dadosFiscais.aliq_ipi > 0 && (
                                <Chip 
                                  label={`IPI: ${formatPercent(dadosFiscais.aliq_ipi)}`} 
                                  size="small" 
                                  variant="outlined" 
                                  color="secondary" 
                                />
                              )}
                              {dadosFiscais.class_fiscal && (
                                <Chip 
                                  label={`NCM: ${dadosFiscais.class_fiscal}`} 
                                  size="small" 
                                  variant="outlined" 
                                />
                              )}
                            </Box>
                          )}
                        </>
                      )}
                    </Paper>
                  )}
                  
                  {/* Mensagem quando tem produto mas não cliente */}
                  {produtoTemp && !clienteSelecionado && dadosFiscais && (
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        mt: 1, 
                        p: 1.5, 
                        borderRadius: 2,
                        display: 'flex', 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        gap: 2,
                        background: 'linear-gradient(90deg, rgba(255, 243, 224, 0.5) 0%, rgba(255, 236, 179, 0.3) 100%)',
                        borderColor: 'warning.light'
                      }}
                    >
                      <WarningIcon sx={{ color: 'warning.main', fontSize: 18, mr: 0.5 }} />
                      <Typography variant="caption" color="text.secondary">
                        Selecione um cliente para verificar tributação específica (ICMS-ST)
                      </Typography>
                      
                      {dadosFiscais && (
                        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, ml: 'auto' }}>
                          {dadosFiscais.aliq_icms > 0 && (
                            <Chip 
                              label={`ICMS: ${formatPercent(dadosFiscais.aliq_icms)}`} 
                              size="small" 
                              variant="outlined" 
                              color="primary" 
                            />
                          )}
                          {dadosFiscais.aliq_ipi > 0 && (
                            <Chip 
                              label={`IPI: ${formatPercent(dadosFiscais.aliq_ipi)}`} 
                              size="small" 
                              variant="outlined" 
                              color="secondary" 
                            />
                          )}
                        </Box>
                      )}
                    </Paper>
                  )}
                </Box>

                {/* Grid para campos de valor */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {/* Quantidade */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        mb: 1, 
                        display: 'flex', 
                        alignItems: 'center',
                        color: 'text.secondary'
                      }}
                    >
                      <CalculateIcon sx={{ mr: 1, fontSize: '0.95rem' }} />
                      Quantidade
                    </Typography>
                    
                    <TextField
                      label="Quantidade"
                      type="number"
                      value={quantidadeTemp}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 1 : Number(e.target.value);
                        setQuantidadeTemp(Math.max(1, value));
                      }}
                      inputProps={{ step: "any", min: 1 }}
                      fullWidth
                      InputProps={{ 
                        startAdornment: <Box sx={{ width: 8 }} />
                      }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2
                        },
                        '& input': {
                          appearance: 'textfield'
                        }
                      }}
                    />
                  </Grid>
                  
                  {/* Valor Unitário */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        mb: 1, 
                        display: 'flex', 
                        alignItems: 'center',
                        color: 'text.secondary'
                      }}
                    >
                      <LocalOfferIcon sx={{ mr: 1, fontSize: '0.95rem' }} />
                      Valor Unitário
                    </Typography>
                    
                    <TextField
                      label="Valor Unitário"
                      type="number"
                      value={valorUnitarioTemp}
                      onChange={(e) => setValorUnitarioTemp(Math.max(0, parseFloat(e.target.value) || 0))}
                      fullWidth
                      InputProps={{ 
                        inputProps: { min: 0, step: 0.01 },
                        startAdornment: <Box sx={{ width: 8 }} />
                      }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2
                        }
                      }}
                    />
                  </Grid>
                  
                  {/* Desconto % */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        mb: 1, 
                        display: 'flex', 
                        alignItems: 'center',
                        color: 'text.secondary'
                      }}
                    >
                      <LocalOfferIcon sx={{ mr: 1, fontSize: '0.95rem' }} />
                      Desconto %
                    </Typography>
                    
                    <TextField
                      label="Desconto %"
                      type="number"
                      value={descontoTemp}
                      onChange={(e) => setDescontoTemp(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      fullWidth
                      InputProps={{ 
                        inputProps: { min: 0, max: 100, step: 0.01 },
                        startAdornment: <Box sx={{ width: 8 }} />
                      }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2
                        }
                      }}
                    />
                  </Grid>
                  
                  {/* Botão Adicionar */}
                  <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', alignItems: 'flex-end' }}>
                    <AddItemButton
                      onClick={modoEdicaoItem ? atualizarItem : adicionarItem}
                      disabled={!produtoTemp || loadingProduto || valorUnitarioTemp <= 0}
                      className={`large ${modoEdicaoItem ? 'modoEdicao' : 'modoAdicao'}`}
                    >
                      <div className="button-content">
                        {loadingProduto ? <CircularProgress size={24} color="inherit" /> : (modoEdicaoItem ? <SaveIcon /> : <AddCircleIcon />)}
                        <span>{
                          loadingProduto 
                            ? (modoEdicaoItem ? 'Atualizando...' : 'Adicionando...') 
                            : (modoEdicaoItem ? 'Atualizar Item' : 'Adicionar Item')
                        }</span>
                      </div>
                    </AddItemButton>
                  </Grid>
                </Grid>
                
                                  {modoEdicaoItem && (
                    <Box sx={{ mb: 1, mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <InfoIcon fontSize="small" color="info" />
                        Os tributos serão recalculados automaticamente quando você atualizar o item
                      </Typography>
                      <Button 
                        variant="outlined"
                        size="small" 
                        onClick={cancelarEdicaoItem}
                        startIcon={<CancelIcon />}
                        color="inherit"
                        sx={{ fontSize: '0.8rem' }}
                      >
                        Cancelar Edição
                      </Button>
                    </Box>
                  )}
                
                {/* Valores calculados */}
                {produtoTemp && valorUnitarioTemp > 0 && quantidadeTemp > 0 && (
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      borderRadius: 2,
                      backgroundColor: 'rgba(156, 39, 176, 0.04)', 
                      borderColor: 'rgba(156, 39, 176, 0.2)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 2,
                      justifyContent: 'space-between'
                    }}
                  >
                    <Box sx={{ minWidth: 140 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Valor Bruto
                      </Typography>
                      <Typography variant="body1" fontWeight="600">
                        {formatCurrency(quantidadeTemp * valorUnitarioTemp)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ minWidth: 140 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Desconto
                      </Typography>
                      <Typography variant="body1" fontWeight="600" color={descontoTemp > 0 ? "warning.main" : "text.disabled"}>
                        {formatCurrency((quantidadeTemp * valorUnitarioTemp * descontoTemp) / 100)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ minWidth: 140 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Valor Líquido
                      </Typography>
                      <Typography variant="body1" fontWeight="600" color="primary.main">
                        {formatCurrency(quantidadeTemp * valorUnitarioTemp * (1 - descontoTemp / 100))}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ minWidth: 140 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        {verificandoST ? "Calculando..." : (infoST && infoST.temST ? "ICMS-ST" : "ICMS")}
                      </Typography>
                      <Typography variant="body1" fontWeight="600" color={infoST && infoST.temST ? "error.main" : "text.primary"}>
                        {infoST && infoST.temST ? <STBadge temST={true} /> : 
                         (dadosFiscais ? formatPercent(dadosFiscais.aliq_icms) : "-")}
                      </Typography>
                    </Box>
                  </Paper>
                )}
                
                {/* Detalhes fiscais específicos */}
                {produtoTemp && clienteSelecionado && infoST && (
                  <Box mt={2}>
                    <FiscalInfo 
                      codigoProduto={produtoTemp.codigo}
                      uf={clienteSelecionado.uf}
                      showDetails={true}
                    />
                  </Box>
                )}
              </Box>
            </Paper>
            
            {/* Lista de Itens do Orçamento */}
            <Paper sx={{ p: 0, mb: 2, overflow: 'hidden', boxShadow: 1, borderRadius: 2 }}>
              <Box sx={{ 
                p: 1.5, 
                background: 'linear-gradient(90deg, #0277bd 0%, #0288d1 100%)', 
                color: 'white', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <ShoppingBasketIcon sx={{ fontSize: 20 }} />
                  <Typography variant="subtitle1" fontWeight="500">
                    Itens do Orçamento
                  </Typography>
                </Box>
                <Chip 
                  size="small" 
                  label={`${itensOrcamento.length} ${itensOrcamento.length === 1 ? 'item' : 'itens'}`} 
                  color="primary" 
                  variant="outlined" 
                  sx={{ 
                    color: 'white', 
                    borderColor: 'rgba(255,255,255,0.5)',
                    height: '24px'
                  }} 
                />
              </Box>
              
              <Box sx={{ p: 0 }}>
                {itensOrcamento.length === 0 ? (
                  <Box sx={{ 
                    p: 4, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.02)'
                  }}>
                    <ShoppingBasketIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary" align="center" gutterBottom>
                      Nenhum item adicionado ao orçamento.
                    </Typography>
                    <Typography variant="body2" color="text.disabled" align="center">
                      Utilize o formulário acima para adicionar produtos ao orçamento.
                    </Typography>
                  </Box>
                ) : (
                  // Exibição responsiva da tabela de itens
                  <Box sx={{ width: '100%', overflowX: 'auto' }} className="items-table-container">
                    {/* Versão para Desktop */}
                    <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                      <TableContainer className="mobile-table-container">
                        <Table size="small">
                          <TableHead sx={{ backgroundColor: 'rgba(0, 0, 0, 0.03)' }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 500 }}>Código</TableCell>
                              <TableCell sx={{ fontWeight: 500 }}>Descrição</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 500 }}>Qtd</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 500 }}>Valor Unit.</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 500 }}>Desc. %</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 500 }}>Valor Total</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 500, display: { xs: 'none', sm: 'table-cell' } }}>Impostos</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 500 }}>ST</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 500 }}>Ações</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {itensOrcamento.map((item, index) => (
                              <TableRow 
                                key={index}
                                sx={{ 
                                  '&:nth-of-type(odd)': { backgroundColor: 'rgba(0, 0, 0, 0.01)' },
                                  '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                                  transition: 'all 0.3s ease',
                                  ...(modoEdicaoItem && itemEditandoIndex === index && {
                                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                    boxShadow: '0 0 8px rgba(25, 118, 210, 0.3)',
                                    transform: 'scale(1.005)',
                                    position: 'relative',
                                    zIndex: 2
                                  })
                                }}
                              >
                                {/* Conteúdo da tabela para desktop (mantém o mesmo) */}
                                <TableCell 
                                  sx={{ 
                                    borderLeft: item.temST ? '3px solid #f44336' : 'none',
                                    fontFamily: 'monospace',
                                    fontSize: '0.875rem'
                                  }}
                                >
                                  {item.produto_codigo}
                                </TableCell>
                                <TableCell sx={{ fontWeight: 500 }}>{item.produto_descricao}</TableCell>
                                <TableCell align="center">
                                  {Number.isInteger(parseFloat(item.quantidade)) ? 
                                    parseInt(item.quantidade) : 
                                    parseFloat(item.quantidade).toFixed(2)} {item.unidade || (item.isUnidade2 ? item.produto?.unidade2 : item.produto?.unidade) || ''}
                                  {item.isUnidade2 && (
                                    <Tooltip title={`Usando unidade alternativa (${item.produto?.unidade2})`}>
                                      <Chip size="small" label="Un2" color="secondary" sx={{ ml: 0.5, height: 16, fontSize: '0.65rem' }} />
                                    </Tooltip>
                                  )}
                                </TableCell>
                                <TableCell align="right">{formatCurrency(item.valor_unitario)}</TableCell>
                                <TableCell align="center">
                                  {item.desconto > 0 ? (
                                    <Chip 
                                      label={`${item.desconto}%`}
                                      size="small"
                                      color="secondary"
                                      variant={item.desconto >= 10 ? "default" : "outlined"}
                                      sx={{ minWidth: 50 }}
                                    />
                                  ) : (
                                    <Typography variant="body2" color="text.disabled">-</Typography>
                                  )}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 500 }}>
                                  {formatCurrency(item.valor_liquido)}
                                </TableCell>
                                <TableCell align="right">
                                  <Tooltip title={
                                    <Box sx={{ p: 1 }}>
                                      <Typography variant="subtitle2" gutterBottom>Detalhes dos Impostos</Typography>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2">ICMS:</Typography>
                                        <Typography variant="body2">{formatPercent(item.aliq_icms)}</Typography>
                                      </Box>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2">IPI:</Typography>
                                        <Typography variant="body2">{formatPercent(item.aliq_ipi)}</Typography>
                                      </Box>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2">Valor ICMS:</Typography>
                                        <Typography variant="body2">{formatCurrency(item.valor_icms)}</Typography>
                                      </Box>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2">Valor IPI:</Typography>
                                        <Typography variant="body2">{formatCurrency(item.valor_ipi)}</Typography>
                                      </Box>
                                      {item.valor_icms_st > 0 && (
                                        <>
                                          <Divider sx={{ my: 1 }} />
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, fontWeight: 'bold' }}>
                                            <Typography variant="body2" fontWeight="bold">ICMS-ST:</Typography>
                                            <Typography variant="body2" fontWeight="bold" color="error.main">
                                              {formatCurrency(item.valor_icms_st)}
                                            </Typography>
                                          </Box>
                                        </>
                                      )}
                                    </Box>
                                  }>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                      {formatCurrency(parseFloat(item.valor_icms) + parseFloat(item.valor_ipi) + parseFloat(item.valor_icms_st))}
                                      {(item.temST || item.aliq_ipi > 0) && (
                                        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', ml: 0.5 }}>
                                          {item.temST && <small style={{ color: '#d32f2f', fontWeight: 'bold', marginRight: '2px' }}>(+ST)</small>}
                                          {item.aliq_ipi > 0 && <small>({formatPercent(item.aliq_ipi)})</small>}
                                        </Box>
                                      )}
                                    </Box>
                                  </Tooltip>
                                </TableCell>
                                <TableCell align="center">
                                  <STBadge temST={item.temST} />
                                </TableCell>
                                <TableCell align="center">
                                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                    <Tooltip title="Editar item">
                                      <IconButton 
                                        size="small" 
                                        color="primary"
                                        onClick={() => iniciarEdicaoItem(index)}
                                        sx={{ 
                                          mr: 1,
                                          '&:hover': { 
                                            backgroundColor: 'rgba(25, 118, 210, 0.1)' 
                                          }
                                        }}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Remover item">
                                      <IconButton 
                                        size="small" 
                                        color="error"
                                        onClick={() => removerItem(index)}
                                        sx={{ 
                                          '&:hover': { 
                                            backgroundColor: 'rgba(211, 47, 47, 0.1)' 
                                          }
                                        }}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                    
                    {/* Versão Mobile - Cards em vez de tabela */}
                    <Box sx={{ display: { xs: 'block', md: 'none' }, p: 1 }}>
                      {itensOrcamento.map((item, index) => (
                        <Card 
                          key={index} 
                          variant="outlined" 
                          sx={{ 
                            mb: 1.5, 
                            borderRadius: 2,
                            transition: 'all 0.3s ease',
                            ...(modoEdicaoItem && itemEditandoIndex === index && {
                              borderColor: 'primary.main',
                              boxShadow: '0 0 8px rgba(25, 118, 210, 0.4)',
                            }),
                            ...(item.temST && {
                              borderLeft: '4px solid #f44336',
                            })
                          }}
                        >
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Grid container spacing={1}>
                              <Grid item xs={9}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                  {item.produto_descricao}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', mt: 0.5, fontSize: '0.75rem' }}>
                                  Código: {item.produto_codigo}
                                </Typography>
                              </Grid>
                              <Grid item xs={3} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <STBadge temST={item.temST} />
                              </Grid>
                              
                              {/* Linha de valores */}
                              <Grid item xs={6} sx={{ mt: 1 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  Quantidade
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                  {Number.isInteger(parseFloat(item.quantidade)) ? 
                                    parseInt(item.quantidade) : 
                                    parseFloat(item.quantidade).toFixed(2)} {item.unidade || ''}
                                </Typography>
                              </Grid>
                              <Grid item xs={6} sx={{ mt: 1 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  Valor Unitário
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                  {formatCurrency(item.valor_unitario)}
                                </Typography>
                              </Grid>
                              
                              {/* Linha de descontos e valores finais */}
                              <Grid item xs={6} sx={{ mt: 1 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  Desconto
                                </Typography>
                                <Typography variant="body2" color={item.desconto > 0 ? "warning.main" : "text.disabled"} sx={{ fontSize: '0.85rem' }}>
                                  {item.desconto > 0 ? `${item.desconto}%` : '-'}
                                </Typography>
                              </Grid>
                              <Grid item xs={6} sx={{ mt: 1 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  Valor Total
                                </Typography>
                                <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                                  {formatCurrency(item.valor_liquido)}
                                </Typography>
                              </Grid>
                              
                              {/* Linha de impostos */}
                              <Grid item xs={12} sx={{ mt: 1 }}>
                                <Divider sx={{ my: 0.5 }} />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                    Impostos: {formatCurrency(parseFloat(item.valor_icms) + parseFloat(item.valor_ipi) + parseFloat(item.valor_icms_st))}
                                    {item.temST && <span style={{ color: '#d32f2f', fontWeight: 'bold', marginLeft: '2px' }}>(+ST)</span>}
                                  </Typography>
                                  <Box>
                                    <IconButton 
                                      size="small" 
                                      color="primary"
                                      onClick={() => iniciarEdicaoItem(index)}
                                      sx={{ mr: 0.5, padding: '4px' }}
                                    >
                                      <EditIcon sx={{ fontSize: '1rem' }} />
                                    </IconButton>
                                    <IconButton 
                                      size="small" 
                                      color="error"
                                      onClick={() => removerItem(index)}
                                      sx={{ padding: '4px' }}
                                    >
                                      <DeleteIcon sx={{ fontSize: '1rem' }} />
                                    </IconButton>
                                  </Box>
                                </Box>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            </Paper>
            
            {/* Totais e Finalização */}
            {itensOrcamento.length > 0 && (
              <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                  Resumo do Orçamento
              </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <Card variant="outlined">
                      <CardContent>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <DetalheFiscal 
                              label="Valor dos Produtos" 
                              valor={formatCurrency(totais.valorProdutos)} 
                            />
                            <DetalheFiscal 
                              label="Valor dos Descontos" 
                              valor={formatCurrency(totais.valorDesconto)} 
                            />
                            <DetalheFiscal 
                              label="Valor Líquido" 
                              valor={formatCurrency(totais.valorComDesconto)} 
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <DetalheFiscal 
                              label="Valor do IPI" 
                              valor={formatCurrency(totais.valorIpi)} 
                            />
                            <DetalheFiscal 
                              label="Valor do ICMS ST" 
                              valor={formatCurrency(totais.valorSt)} 
                            />
                            <Box mt={2}>
                              <Divider />
                              <Box mt={1}>
                                <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Valor Total:</span>
                                  <span>{formatCurrency(totais.valorTotal)}</span>
              </Typography>
                              </Box>
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <ActionButton
                      className="primary large"
                      onClick={handleSalvarOrcamento}
                      disabled={loadingSave || dadosOrcamento.status === 'CONVERTIDO'}
                    >
                      <div className="button-content">
                        {loadingSave ? <CircularProgress size={24} /> : <SaveIcon />}
                        <span>{loadingSave ? 'Salvando...' : 'Salvar Orçamento'}</span>
                      </div>
                    </ActionButton>

                    {isEdicao && orcamentoCodigo && (!dadosOrcamento.status || (dadosOrcamento.status !== 'APROVADO' && dadosOrcamento.status !== 'CONVERTIDO')) && (
                      <ActionButton
                        className="success large"
                        onClick={aprovarOrcamento}
                        disabled={loadingApprove}
                      >
                        <div className="button-content">
                          {loadingApprove ? <CircularProgress size={24} /> : <CheckCircleIcon />}
                          <span>{loadingApprove ? 'Aprovando...' : 'Aprovar Orçamento'}</span>
                        </div>
                      </ActionButton>
                    )}

                    {isEdicao && orcamentoCodigo && dadosOrcamento.status === 'APROVADO' && (
                      <ActionButton
                        className="warning large"
                        onClick={converterEmPedidoVenda}
                        disabled={loadingConvert}
                      >
                        <div className="button-content">
                          {loadingConvert ? <CircularProgress size={24} /> : <ShoppingCartIcon />}
                          <span>{loadingConvert ? 'Convertendo...' : 'Converter em Pedido'}</span>
                        </div>
                      </ActionButton>
                    )}

                    <ActionButton
                      className="outlined"
                      onClick={() => navigate('/orcamentos')}
                    >
                      <div className="button-content">
                        <ArrowBackIcon />
                        <span>Voltar</span>
                      </div>
                    </ActionButton>

                    {isEdicao && orcamentoCodigo && (
                      <>
                        <ActionButton
                          className="primary"
                          onClick={buscarDadosPDF}
                          disabled={loadingPDF}
                        >
                          <div className="button-content">
                            {loadingPDF ? <CircularProgress size={20} /> : <ReceiptIcon />}
                            <span>{loadingPDF ? 'Gerando PDF...' : 'Gerar PDF'}</span>
                          </div>
                        </ActionButton>

                        {dadosPDF && (
                          <PDFDownloadLink
                            document={<OrcamentoPDF dados={dadosPDF} />}
                            fileName={`orcamento_${orcamentoCodigo}.pdf`}
                            style={{ textDecoration: 'none' }}
                          >
                            {({ blob, url, loading, error }) => (
                              <ActionButton
                                className="success"
                                disabled={loading}
                              >
                                <div className="button-content">
                                  <ReceiptIcon />
                                  <span>{loading ? 'Preparando download...' : 'Baixar PDF'}</span>
                                </div>
                              </ActionButton>
                            )}
                          </PDFDownloadLink>
                        )}
                      </>
                    )}
                  </Grid>
                </Grid>
            </Paper>
            )}
          </>
        )}
        
        {/* Adicionar Snackbar para mensagens */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setSnackbarOpen(false)} 
            severity={snackbarSeverity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
        
        {/* Modal de confirmação para itens duplicados */}
        <DuplicateItemModal
          show={showDuplicateModal}
          onHide={() => setShowDuplicateModal(false)}
          duplicateItem={duplicateItem}
          newItem={newItem}
          onMerge={handleMergeItems}
          onAddNew={handleAddNewItem}
        />
      </Box>
    </div>
  );
};

// Manter o nome do componente como OrcamentoFiscal para não quebrar rotas existentes
const OrcamentoFiscal = TelaVendas;

export default OrcamentoFiscal; 
