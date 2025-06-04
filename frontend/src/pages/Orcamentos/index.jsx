import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Button, Table, Spinner, Badge, Form, Row, Col, InputGroup, Modal } from 'react-bootstrap';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  FaPlus, FaSearch, FaEdit, FaTrash, FaFilePdf, 
  FaCheck, FaSpinner, FaCopy, FaEnvelope, FaTable, FaTh,
  FaUser, FaUserTie, FaMoneyBillWave, FaWhatsapp
} from 'react-icons/fa';
import api from '../../services/api';
import { getUser } from '../../services/authService';
import OrcamentoPDF from '../../components/OrcamentoPDF';
import { formatOrcamentoCodigo } from '../../utils';
import { pdf } from '@react-pdf/renderer';
import './styles.css';

const Orcamentos = () => {
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredOrcamentos, setFilteredOrcamentos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientes, setClientes] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [loadingPdfData, setLoadingPdfData] = useState({});
  const [viewMode, setViewMode] = useState('table');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showWhatsAppCloudModal, setShowWhatsAppCloudModal] = useState(false);
  const [showWhatsAppResultModal, setShowWhatsAppResultModal] = useState(false);
  const [whatsappResult, setWhatsappResult] = useState(null);
  const [selectedOrcamento, setSelectedOrcamento] = useState(null);
  const [emailData, setEmailData] = useState({ email: '', message: '' });
  const [whatsappData, setWhatsappData] = useState({ phone: '', message: '' });
  const [whatsappCloudData, setWhatsappCloudData] = useState({ phone: '', message: '' });
  const [sendingEmail, setSendingEmail] = useState(false);
  const navigate = useNavigate();

  // Detectar se é dispositivo móvel
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Adicionar listener para mudanças de tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      // Se for mobile, força o modo card
      if (window.innerWidth < 768 && viewMode === 'table') {
        setViewMode('cards');
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Verificar no carregamento inicial
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [viewMode]);

  // Carregar usuário logado
  useEffect(() => {
    const user = getUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setUsuarioLogado(user);
  }, [navigate]);

  const filterOrcamentos = useCallback(() => {
    if (!orcamentos) return;

    let filtered = [...orcamentos];

    // Filtrar por vendedor se não for admin
    if (usuarioLogado && usuarioLogado.vendedor && usuarioLogado.role !== 'admin') {
      filtered = filtered.filter(orc => orc.cod_vendedor === usuarioLogado.vendedor.codigo);
    }

    // Aplicar filtro de busca
    if (searchTerm.trim()) {
      filtered = filtered.filter(orcamento => {
      const cliente = clientes.find(c => c.codigo === orcamento.cod_cliente);
      const vendedor = vendedores.find(v => v.codigo === orcamento.cod_vendedor);
      
      const clienteNome = cliente ? (cliente.razao || cliente.nome || '').toLowerCase() : '';
      const vendedorNome = vendedor ? (vendedor.nome || '').toLowerCase() : '';
      
      return orcamento.codigo.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        orcamento.cod_cliente.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        orcamento.cod_vendedor.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        clienteNome.includes(searchTerm.toLowerCase()) ||
        vendedorNome.includes(searchTerm.toLowerCase());
    });
    }
    
    setFilteredOrcamentos(filtered);
  }, [searchTerm, orcamentos, clientes, vendedores, usuarioLogado]);

  // Função para buscar todos os dados necessários
  const fetchData = async () => {
    try {
      setLoading(true);
      const [orcamentosRes, clientesRes, vendedoresRes] = await Promise.all([
        api.get('/orcamentos'),
        api.get('/clientes'),
        api.get('/vendedores')
      ]);
      
      const orcamentosData = orcamentosRes.data.data || [];
      setOrcamentos(orcamentosData);
      setClientes(clientesRes.data || []);
      setVendedores(vendedoresRes.data || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (usuarioLogado) {
    fetchData();
    }
  }, [usuarioLogado]);

  useEffect(() => {
    filterOrcamentos();
  }, [searchTerm, orcamentos, filterOrcamentos]);

  // Verificar permissão para ações
  const temPermissao = (orcamento) => {
    if (!usuarioLogado) return false;
    if (usuarioLogado.role === 'admin') return true;
    if (usuarioLogado.vendedor) {
      return orcamento.cod_vendedor === usuarioLogado.vendedor.codigo;
    }
    return false;
  };

  const handleNewOrcamento = () => {
    navigate('/orcamentos/novo');
  };

  const handleEdit = (id) => {
    const orcamento = orcamentos.find(o => o.codigo === id);
    if (orcamento && !temPermissao(orcamento)) {
      toast.error('Você não tem permissão para editar este orçamento.');
      return;
    }
    navigate(`/orcamentos/${id}`);
  };

  const handleDelete = async (id) => {
    const orcamento = orcamentos.find(o => o.codigo === id);
    if (orcamento && !temPermissao(orcamento)) {
      toast.error('Você não tem permissão para excluir este orçamento.');
      return;
    }

    if (window.confirm('Tem certeza que deseja excluir este orçamento?')) {
      try {
        await api.delete(`/orcamentos/${id}`);
        toast.success('Orçamento excluído com sucesso!');
        fetchData();
      } catch (error) {
        console.error('Erro ao excluir orçamento:', error);
        toast.error('Erro ao excluir orçamento!');
      }
    }
  };
  
  const handleApprove = async (id) => {
    const orcamento = orcamentos.find(o => o.codigo === id);
    if (orcamento && !temPermissao(orcamento)) {
      toast.error('Você não tem permissão para aprovar este orçamento.');
      return;
    }

    if (window.confirm('Tem certeza que deseja aprovar este orçamento?')) {
      try {
        await api.post(`/orcamentos/${id}/aprovar`);
        toast.success('Orçamento aprovado com sucesso!');
        fetchData();
      } catch (error) {
        console.error('Erro ao aprovar orçamento:', error);
        toast.error('Erro ao aprovar orçamento!');
      }
    }
  };
  
  const handleDuplicate = async (id) => {
    const orcamento = orcamentos.find(o => o.codigo === id);
    if (orcamento && !temPermissao(orcamento)) {
      toast.error('Você não tem permissão para duplicar este orçamento.');
      return;
    }

    if (window.confirm('Tem certeza que deseja duplicar este orçamento?')) {
      try {
        const response = await api.orcamentos.duplicar(id);
        const novoCodigo = response.data?.codigo || 'novo';
        toast.success(`Orçamento duplicado com sucesso! Código: ${novoCodigo}`);
        fetchData();
      } catch (error) {
        console.error('Erro ao duplicar orçamento:', error);
        toast.error('Erro ao duplicar orçamento!');
      }
    }
  };
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleGeneratePdf = async (orcamento) => {
    try {
      setLoadingPdfData(prev => ({ ...prev, [orcamento.codigo]: true }));
      
      const response = await api.get(`/orcamentos/${orcamento.codigo}/pdf`);
      const dadosPDF = response.data.data;
      
      const blob = await pdf(<OrcamentoPDF dados={dadosPDF} />).toBlob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `orcamento_${formatOrcamentoCodigo(orcamento.codigo)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF!');
    } finally {
      setLoadingPdfData(prev => ({ ...prev, [orcamento.codigo]: false }));
    }
  };

  const getClienteName = (codCliente) => {
    const cliente = clientes.find(c => c.codigo === codCliente);
    return cliente ? (cliente.razao || cliente.nome) : codCliente;
  };

  const getVendedorName = (codVendedor) => {
    const vendedor = vendedores.find(v => v.codigo === codVendedor);
    return vendedor ? vendedor.nome : codVendedor;
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'APROVADO':
      case 'CONVERTIDO':
        return 'status-aprovado';
      case 'CANCELADO':
        return 'status-cancelado';
      default:
        return 'status-pendente';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'CONVERTIDO':
        return 'Processado';
      case 'APROVADO':
        return 'Aprovado';
      case 'CANCELADO':
        return 'Cancelado';
      default:
        return 'Pendente';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APROVADO':
      case 'CONVERTIDO':
        return 'success';
      case 'CANCELADO':
        return 'danger';
      default:
        return 'warning';
    }
  };
    
  // Função para enviar orçamento por email
  const handleSendEmail = async (orcamento) => {
    try {
      // Buscar dados do cliente
      const cliente = clientes.find(c => c.codigo === orcamento.cod_cliente);
      
      setSelectedOrcamento(orcamento);
      setEmailData({
        email: cliente?.email || '',
        message: ''
      });
      setShowEmailModal(true);
    } catch (error) {
      console.error('Erro ao preparar envio de email:', error);
      toast.error('Erro ao preparar envio de email');
    }
  };

  const confirmSendEmail = async () => {
    if (!emailData.email) {
      toast.error('E-mail do cliente é obrigatório');
      return;
    }

    try {
      setSendingEmail(true);
      const response = await api.post(`/orcamentos/${selectedOrcamento.codigo}/email`, {
        clienteEmail: emailData.email,
        customMessage: emailData.message
      });

      if (response.data.success) {
        toast.success('Orçamento enviado por e-mail com sucesso!');
        setShowEmailModal(false);
        setEmailData({ email: '', message: '' });
      } else {
        toast.error(response.data.message || 'Erro ao enviar e-mail');
      }
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      if (error.response?.status === 400) {
        toast.error('Configure suas configurações de e-mail antes de enviar. Vá em Configurações > E-mail');
      } else {
        toast.error('Erro ao enviar e-mail');
      }
    } finally {
      setSendingEmail(false);
    }
  };

  // Função para enviar orçamento via WhatsApp
  const handleSendWhatsApp = async (orcamento) => {
    try {
      // Buscar dados do cliente
      const cliente = clientes.find(c => c.codigo === orcamento.cod_cliente);
      
      setSelectedOrcamento(orcamento);
      setWhatsappData({
        phone: cliente?.telefone || cliente?.celular || '',
        message: ''
      });
      setShowWhatsAppModal(true);
    } catch (error) {
      console.error('Erro ao preparar envio via WhatsApp:', error);
      toast.error('Erro ao preparar envio via WhatsApp');
    }
  };

  const confirmSendWhatsApp = async () => {
    try {
      const response = await api.post(`/orcamentos/${selectedOrcamento.codigo}/whatsapp`, {
        phoneNumber: whatsappData.phone,
        customMessage: whatsappData.message
      });

      if (response.data.success) {
        const { webUrl, mobileUrl, pdfDownloadUrl } = response.data.data;
        
        // Detectar se é mobile e usar a URL apropriada
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const urlToOpen = isMobileDevice ? mobileUrl : webUrl;
        
        // Salvar resultado para mostrar no modal
        setWhatsappResult({
          webUrl,
          mobileUrl,
          pdfDownloadUrl,
          urlToOpen,
          isMobile: isMobileDevice,
          orcamento: selectedOrcamento
        });

        // Fechar modal de configuração e abrir modal de resultado
        setShowWhatsAppModal(false);
        setShowWhatsAppResultModal(true);
        setWhatsappData({ phone: '', message: '' });
      } else {
        toast.error(response.data.message || 'Erro ao gerar link do WhatsApp');
      }
    } catch (error) {
      console.error('Erro ao gerar link do WhatsApp:', error);
      toast.error('Erro ao gerar link do WhatsApp');
    }
  };

  // Função para abrir WhatsApp
  const openWhatsApp = () => {
    if (!whatsappResult) return;
    
    // Tentar reutilizar aba existente do WhatsApp Web
    const whatsappWindow = window.open('', 'whatsapp_window');
    if (whatsappWindow) {
      whatsappWindow.location.href = whatsappResult.urlToOpen;
      whatsappWindow.focus();
    } else {
      // Fallback para nova aba se não conseguir reutilizar
      window.open(whatsappResult.urlToOpen, 'whatsapp_window');
    }
    
    toast.success('Redirecionando para o WhatsApp...');
    setShowWhatsAppResultModal(false);
  };

  // Função para copiar link
  const copyWhatsAppLink = async () => {
    if (!whatsappResult) return;
    
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(whatsappResult.urlToOpen);
        toast.success('Link copiado! Cole no WhatsApp manualmente.');
      } else {
        // Fallback para browsers antigos
        const textArea = document.createElement('textarea');
        textArea.value = whatsappResult.urlToOpen;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('Link copiado! Cole no WhatsApp manualmente.');
      }
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  // Função para testar download do PDF
  const testPdfDownload = () => {
    if (!whatsappResult) return;
    
    window.open(whatsappResult.pdfDownloadUrl, '_blank');
    toast.info('Abrindo PDF para teste...');
  };

  // Função para enviar orçamento via WhatsApp Cloud API (ANEXO DIRETO!)
  const handleSendWhatsAppCloudAPI = async (orcamento) => {
    try {
      // Buscar dados do cliente
      const cliente = clientes.find(c => c.codigo === orcamento.cod_cliente);
      
      setSelectedOrcamento(orcamento);
      setWhatsappCloudData({
        phone: cliente?.telefone || cliente?.celular || cliente?.whatsapp || '',
        message: ''
      });
      setShowWhatsAppCloudModal(true);
    } catch (error) {
      console.error('Erro ao preparar envio via WhatsApp Cloud API:', error);
      toast.error('Erro ao preparar envio via WhatsApp Cloud API');
    }
  };

  // Função para confirmar envio via WhatsApp Cloud API
  const confirmSendWhatsAppCloudAPI = async () => {
    try {
      if (!whatsappCloudData.phone) {
        toast.error('Número de telefone é obrigatório');
        return;
      }

      // Limpar formatação do número
      const phoneNumber = whatsappCloudData.phone.replace(/\D/g, '');
      
      if (!phoneNumber || phoneNumber.length < 10) {
        toast.error('Número de telefone inválido');
        return;
      }

      // Fechar o modal
      setShowWhatsAppCloudModal(false);

      toast.info('📤 Enviando orçamento via WhatsApp Cloud API...');

      const response = await api.post(`/orcamentos/${selectedOrcamento.codigo}/whatsapp-api`, {
        phoneNumber: phoneNumber,
        customMessage: whatsappCloudData.message
      });

      if (response.data.success) {
        const data = response.data.data;
        
        toast.success(
          `🎉 Orçamento enviado com sucesso!\n\n` +
          `📱 Cliente: ${data.orcamento.cliente}\n` +
          `📞 Telefone: ${data.phone}\n` +
          `📄 PDF anexado diretamente no WhatsApp\n` +
          `💌 Message ID: ${data.whatsapp.messageId.substring(0, 20)}...`,
          { autoClose: 8000 }
        );

        console.log('✅ [WhatsApp Cloud API] Detalhes do envio:', {
          phone: data.phone,
          orcamento: data.orcamento.codigo,
          messageId: data.whatsapp.messageId,
          documentId: data.whatsapp.documentId,
          advantages: data.advantages
        });

        // Limpar dados
        setWhatsappCloudData({ phone: '', message: '' });

      } else {
        toast.error(`❌ Erro: ${response.data.message}`);
      }

    } catch (error) {
      console.error('❌ Erro ao enviar via WhatsApp Cloud API:', error);
      
      if (error.response?.status === 400 && error.response?.data?.message?.includes('não configurada')) {
        toast.error(
          '🔧 WhatsApp Cloud API não configurada!\n\n' +
          'Configure as credenciais no backend:\n' +
          '• WHATSAPP_PHONE_NUMBER_ID\n' +
          '• WHATSAPP_ACCESS_TOKEN',
          { autoClose: 10000 }
        );
      } else {
        toast.error('❌ Erro ao enviar via WhatsApp Cloud API');
      }
    }
  };

  // Renderizar visualização em tabela (desktop)
  const renderTable = () => {
    return (
      <div className="orcamentos-table-container">
        {loading ? (
          <div className="loading-container">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 mb-0">Carregando orçamentos...</p>
          </div>
        ) : filteredOrcamentos.length === 0 ? (
          <div className="empty-state">
            <h5>Nenhum orçamento encontrado</h5>
            <p>Não há orçamentos cadastrados ou que correspondam aos filtros aplicados.</p>
          </div>
        ) : (
          <>
            <Table className="orcamentos-table" hover>
          <thead>
            <tr>
                  <th>Número</th>
                  <th>Emissão</th>
                  <th>Validade</th>
              <th>Vendedor</th>
                  <th>Cliente Razão Social</th>
              <th>Valor Total</th>
              <th>Status</th>
                  <th>Envio</th>
                  <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrcamentos.map(orcamento => {
              const isLoading = loadingPdfData[orcamento.codigo];

              return (
                <tr key={orcamento.codigo}>
                      <td className="orcamento-numero">{formatOrcamentoCodigo(orcamento.codigo)}</td>
                      <td className="orcamento-data">{formatDate(orcamento.dt_orcamento)}</td>
                      <td className="orcamento-data">{formatDate(orcamento.dt_validade)}</td>
                      <td className="orcamento-vendedor">{getVendedorName(orcamento.cod_vendedor)}</td>
                      <td className="orcamento-cliente">{getClienteName(orcamento.cod_cliente)}</td>
                      <td className="orcamento-valor">{formatCurrency(orcamento.vl_total || 0)}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(orcamento.status)}`}>
                          {getStatusText(orcamento.status)}
                        </span>
                  </td>
                  <td>
                        <div className="acoes-lista">
                          <button 
                            className="btn-acao btn-email" 
                            onClick={() => handleSendEmail(orcamento)}
                            title="Enviar por E-mail"
                          >
                            <FaEnvelope />
                          </button>
                          <button 
                            className="btn-acao btn-whatsapp" 
                            onClick={() => handleSendWhatsApp(orcamento)}
                            title="Enviar via WhatsApp (Link)"
                            style={{ backgroundColor: '#25d366', color: 'white' }}
                          >
                            <FaWhatsapp />
                          </button>
                          <button 
                            className="btn-acao btn-whatsapp-api" 
                            onClick={() => handleSendWhatsAppCloudAPI(orcamento)}
                            title="Enviar via WhatsApp (PDF Anexado Diretamente)"
                            style={{ 
                              backgroundColor: '#128c7e', 
                              color: 'white',
                              marginLeft: '2px'
                            }}
                          >
                            <FaWhatsapp />
                            <span style={{ fontSize: '8px', marginLeft: '2px' }}>📎</span>
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="acoes-lista">
                          <button 
                            className="btn-acao btn-editar" 
                          onClick={() => handleEdit(orcamento.codigo)}
                            title="Editar"
                        >
                          <FaEdit />
                          </button>
                          
                          <button 
                            className="btn-acao btn-duplicar" 
                            onClick={() => handleDuplicate(orcamento.codigo)}
                            title="Duplicar"
                          >
                            <FaCopy />
                          </button>
                          
                          <button 
                            className="btn-acao btn-aprovar" 
                          onClick={() => handleApprove(orcamento.codigo)}
                            title="Aprovar"
                          disabled={orcamento.status === 'APROVADO' || orcamento.status === 'CONVERTIDO'}
                        >
                          <FaCheck />
                          </button>
                      
                          <button 
                            className="btn-acao btn-pdf" 
                          onClick={() => handleGeneratePdf(orcamento)}
                            title="Baixar PDF"
                          disabled={isLoading}
                        >
                          {isLoading ? <FaSpinner className="fa-spin" /> : <FaFilePdf />}
                          </button>
                          
                          <button 
                            className="btn-acao btn-excluir" 
                            onClick={() => handleDelete(orcamento.codigo)}
                            title="Excluir"
                          >
                            <FaTrash />
                          </button>
                        </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
            
            {/* Paginação */}
            <div className="pagination-container">
              <div className="pagination-info">
                Itens por Página: 25 | Total: {filteredOrcamentos.length} | Página 1 de 1
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Renderizar visualização em cards (mobile)
  const renderCards = () => {
    if (loading) {
  return (
        <div className="text-center p-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </Spinner>
            </div>
      );
    }

    if (!filteredOrcamentos || filteredOrcamentos.length === 0) {
      return (
        <div className="text-center p-5">
          <p>Nenhum orçamento encontrado.</p>
          </div>
      );
    }

    return (
        <Row className="g-3">
          {filteredOrcamentos.map(orcamento => {
            const isLoading = loadingPdfData[orcamento.codigo];

            return (
              <Col key={orcamento.codigo} xs={12} sm={6} md={4} lg={4}>
                <Card className="h-100 shadow-sm border-0 orcamento-card">
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h5 className="mb-1">{formatOrcamentoCodigo(orcamento.codigo)}</h5>
                        <small className="text-muted">
                          {formatDate(orcamento.dt_orcamento)}
                        </small>
                      </div>
                      <Badge bg={getStatusColor(orcamento.status)} className="mobile-badge">
                      {orcamento.status === 'CONVERTIDO' ? 'PROCESSADO' : (orcamento.status || 'PENDENTE')}
                      </Badge>
                    </div>

                    <div className="mb-3">
                      <div className="d-flex align-items-center mb-2">
                        <FaUser className="me-2 text-muted" />
                        <div className="text-truncate">
                          <small className="text-muted d-block">Cliente</small>
                          <div className="mobile-text-client">{getClienteName(orcamento.cod_cliente)}</div>
                        </div>
                      </div>
                      <div className="d-flex align-items-center mb-2">
                        <FaUserTie className="me-2 text-muted" />
                        <div>
                          <small className="text-muted d-block">Vendedor</small>
                          <div>{getVendedorName(orcamento.cod_vendedor)}</div>
                        </div>
                      </div>
                      <div className="d-flex align-items-center">
                        <FaMoneyBillWave className="me-2 text-muted" />
                        <div>
                          <small className="text-muted d-block">Valor Total</small>
                          <div className="fw-bold">{formatCurrency(orcamento.vl_total || 0)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-end gap-2 mobile-actions">
                      <Button 
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleEdit(orcamento.codigo)}
                        title="Editar"
                        className="action-btn"
                      >
                        <FaEdit />
                      </Button>
                    <Button 
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => handleDuplicate(orcamento.codigo)}
                      title="Duplicar"
                      className="action-btn"
                    >
                      <FaCopy />
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm" 
                        onClick={() => handleDelete(orcamento.codigo)}
                        title="Excluir"
                        className="action-btn"
                      >
                        <FaTrash />
                      </Button>
                      <Button 
                        variant="outline-success" 
                        size="sm"
                        onClick={() => handleApprove(orcamento.codigo)}
                        title="Aprovar"
                        disabled={orcamento.status === 'APROVADO' || orcamento.status === 'CONVERTIDO'}
                        className="action-btn"
                      >
                        <FaCheck />
                      </Button>
                      <Button 
                        variant="outline-info"
                        size="sm"
                        onClick={() => handleGeneratePdf(orcamento)}
                        title="Baixar PDF"
                        disabled={isLoading}
                        className="action-btn"
                      >
                        {isLoading ? <FaSpinner className="fa-spin" /> : <FaFilePdf />}
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleSendEmail(orcamento)}
                        title="Enviar por E-mail"
                        className="action-btn"
                        style={{ backgroundColor: '#007bff', color: 'white', border: 'none' }}
                      >
                        <FaEnvelope />
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleSendWhatsApp(orcamento)}
                        title="Enviar via WhatsApp (Link)"
                        className="action-btn"
                        style={{ backgroundColor: '#25d366', color: 'white', border: 'none' }}
                      >
                        <FaWhatsapp />
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleSendWhatsAppCloudAPI(orcamento)}
                        title="Enviar via WhatsApp (PDF Anexado)"
                        className="action-btn"
                        style={{ backgroundColor: '#128c7e', color: 'white', border: 'none' }}
                      >
                        <FaWhatsapp />
                        <span style={{ fontSize: '8px', marginLeft: '2px' }}>📎</span>
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
    );
  };

  return (
    <div className="orcamentos-container">
      {/* Cabeçalho */}
      <div className="orcamentos-header d-flex justify-content-between align-items-center">
        <h1 className="orcamentos-title">Orçamentos</h1>
        <div className="orcamentos-actions">
          {!isMobile && (
            <>
              <Button 
                variant={viewMode === 'table' ? 'primary' : 'outline-primary'}
                onClick={() => setViewMode('table')}
                title="Visualização em Tabela"
                className="view-toggle-btn"
              >
                <FaTable />
              </Button>
              <Button 
                variant={viewMode === 'cards' ? 'primary' : 'outline-primary'}
                onClick={() => setViewMode('cards')}
                title="Visualização em Cards"
                className="view-toggle-btn"
              >
                <FaTh />
              </Button>
            </>
          )}
          <button className="btn btn-novo-orcamento" onClick={handleNewOrcamento}>
            <FaPlus className="me-2" />
            {isMobile ? 'Novo' : 'Incluir Orçamento'}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="orcamentos-filters">
        <Row className="align-items-center">
          <Col md={6}>
            <div className="search-box">
              <FaSearch className="search-icon" />
              <Form.Control
                type="text"
                placeholder="Buscar orçamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </Col>
        </Row>
      </div>

      {/* Conteúdo - Tabela ou Cards */}
      {viewMode === 'table' && !isMobile ? renderTable() : renderCards()}

      {/* Modal para envio por e-mail */}
      <Modal show={showEmailModal} onHide={() => setShowEmailModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Enviar Orçamento por E-mail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>E-mail do Cliente *</Form.Label>
              <Form.Control
                type="email"
                value={emailData.email}
                onChange={(e) => setEmailData({...emailData, email: e.target.value})}
                placeholder="cliente@exemplo.com"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Mensagem Personalizada (opcional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={emailData.message}
                onChange={(e) => setEmailData({...emailData, message: e.target.value})}
                placeholder="Adicione uma mensagem personalizada..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEmailModal(false)}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={confirmSendEmail}
            disabled={sendingEmail || !emailData.email}
          >
            {sendingEmail ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Enviando...
              </>
            ) : (
              <>
                <FaEnvelope className="me-2" />
                Enviar E-mail
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para envio via WhatsApp */}
      <Modal show={showWhatsAppModal} onHide={() => setShowWhatsAppModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Enviar via WhatsApp</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Número do WhatsApp</Form.Label>
              <Form.Control
                type="tel"
                value={whatsappData.phone}
                onChange={(e) => setWhatsappData({...whatsappData, phone: e.target.value})}
                placeholder="(11) 99999-9999"
              />
              <Form.Text className="text-muted">
                Deixe em branco para usar o telefone cadastrado do cliente
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Mensagem Personalizada (opcional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={whatsappData.message}
                onChange={(e) => setWhatsappData({...whatsappData, message: e.target.value})}
                placeholder="Deixe em branco para usar a mensagem padrão..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowWhatsAppModal(false)}>
            Cancelar
          </Button>
          <Button 
            variant="success" 
            onClick={confirmSendWhatsApp}
          >
            <FaWhatsapp className="me-2" />
            Abrir WhatsApp
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para envio via WhatsApp Cloud API (PDF Anexado) */}
      <Modal show={showWhatsAppCloudModal} onHide={() => setShowWhatsAppCloudModal(false)}>
        <Modal.Header closeButton style={{ backgroundColor: '#128c7e', color: 'white' }}>
          <Modal.Title>
            <FaWhatsapp className="me-2" />
            <span style={{ fontSize: '8px', marginLeft: '2px' }}>📎</span>
            Enviar via WhatsApp Cloud API
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-info" role="alert">
            <h6 className="alert-heading">
              🚀 WhatsApp Cloud API - PDF Anexado Diretamente!
            </h6>
            <ul className="mb-0">
              <li>✅ PDF será anexado diretamente na conversa</li>
              <li>✅ Experiência idêntica aos apps nativos</li>
              <li>✅ Cliente não precisa baixar arquivo</li>
              <li>✅ Funciona mesmo com localhost</li>
            </ul>
          </div>
          
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Número do WhatsApp *</Form.Label>
              <Form.Control
                type="tel"
                value={whatsappCloudData.phone}
                onChange={(e) => setWhatsappCloudData({...whatsappCloudData, phone: e.target.value})}
                placeholder="(11) 99999-9999 ou 5511999999999"
              />
              <Form.Text className="text-muted">
                Inclua o código do país (55 para Brasil). Ex: 5511999999999
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Mensagem Personalizada (opcional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={whatsappCloudData.message}
                onChange={(e) => setWhatsappCloudData({...whatsappCloudData, message: e.target.value})}
                placeholder="Deixe em branco para usar a mensagem padrão..."
              />
              <Form.Text className="text-muted">
                Se deixar em branco, será enviada uma mensagem profissional padrão
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowWhatsAppCloudModal(false)}>
            Cancelar
          </Button>
          <Button 
            variant="success" 
            onClick={confirmSendWhatsAppCloudAPI}
            disabled={!whatsappCloudData.phone}
            style={{ backgroundColor: '#128c7e', borderColor: '#128c7e' }}
          >
            <FaWhatsapp className="me-2" />
            <span style={{ fontSize: '8px', marginLeft: '2px' }}>📎</span>
            Enviar PDF Anexado
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de resultado do envio via WhatsApp */}
      <Modal show={showWhatsAppResultModal} onHide={() => setShowWhatsAppResultModal(false)} size="lg">
        <Modal.Header closeButton style={{ backgroundColor: '#25d366', color: 'white' }}>
          <Modal.Title>
            <FaWhatsapp className="me-2" />
            Link do WhatsApp Gerado com Sucesso!
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {whatsappResult && (
            <div>
              <div className="alert alert-success" role="alert">
                <h5 className="alert-heading">
                  ✅ Pronto para enviar!
                </h5>
                <p className="mb-0">
                  O orçamento <strong>#{whatsappResult.orcamento.codigo}</strong> foi preparado com PDF anexado.
                </p>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="card mb-3">
                    <div className="card-header">
                      <FaWhatsapp className="me-2" style={{ color: '#25d366' }} />
                      <strong>WhatsApp {whatsappResult.isMobile ? 'Mobile' : 'Web'}</strong>
                    </div>
                    <div className="card-body">
                      <p className="card-text">
                        Clique em "Abrir WhatsApp" para {whatsappResult.isMobile ? 'abrir o app' : 'ir para o WhatsApp Web'} 
                        com a mensagem já pronta.
                      </p>
                      <div className="d-grid gap-2">
                        <Button variant="success" onClick={openWhatsApp} size="lg">
                          <FaWhatsapp className="me-2" />
                          Abrir WhatsApp {whatsappResult.isMobile ? 'App' : 'Web'}
                        </Button>
                        <Button variant="outline-info" onClick={copyWhatsAppLink} size="sm">
                          <FaCopy className="me-2" />
                          Copiar Link
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="card mb-3">
                    <div className="card-header">
                      <FaFilePdf className="me-2" style={{ color: '#dc3545' }} />
                      <strong>PDF do Orçamento</strong>
                    </div>
                    <div className="card-body">
                      <p className="card-text">
                        O PDF será baixado automaticamente quando o cliente clicar no link na mensagem.
                      </p>
                      <div className="d-grid">
                        <Button variant="outline-danger" onClick={testPdfDownload} size="sm">
                          <FaFilePdf className="me-2" />
                          Testar Download
                        </Button>
                      </div>
                      <small className="text-muted mt-2 d-block">
                        ⏰ Link válido por 1 hora
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="alert alert-info" role="alert">
                <h6 className="alert-heading">
                  💡 Como funciona:
                </h6>
                <ul className="mb-0">
                  <li>A mensagem já inclui o link para download do PDF</li>
                  <li>O cliente receberá a mensagem com os detalhes do orçamento</li>
                  <li>Ao clicar no link, o PDF será baixado automaticamente</li>
                  <li>O link do PDF expira em 1 hora por segurança</li>
                </ul>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowWhatsAppResultModal(false)}>
            <i className="fas fa-times me-2"></i>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Orcamentos; 