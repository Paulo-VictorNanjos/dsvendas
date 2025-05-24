import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Container, Row, Col, Card, Form, Button, 
  InputGroup, Nav, Alert, Spinner, Badge, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import { 
  FaSave, FaArrowLeft, FaBarcode, FaTag, 
  FaBoxOpen, FaMoneyBillWave, FaPercent, FaImage, 
  FaInfoCircle, FaTags, FaClipboardList, FaSync
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import CurrencyInput from 'react-currency-input-field';

import SidebarLayout from '../../../components/layouts/SidebarLayout';
import api, { fiscalAPI } from '../../../services/api';
import '../styles.css';

const ProdutoForm = () => {
  const { id: paramId, "*": restPath } = useParams();
  const navigate = useNavigate();
  
  const id = restPath ? `${paramId}/${restPath}` : paramId;
  const isEditing = !!id;
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  
  // Estado inicial do produto
  const [produto, setProduto] = useState({
    codigo: '',
    descricao: '',
    unidade: 'UN',
    unidade2: 'UN',
    fator_conv_estoque: 1,
    preco_venda: '',
    precoPromocional: '',
    precoCusto: '',
    estoque: 0,
    estoqueMinimo: 0,
    categoria: '',
    ncm: '',  // NCM - Nomenclatura Comum do Mercosul
    classiFiscal: '', // Classificação Fiscal específica do sistema
    percentualIpi: 0,
    percentualIcms: 0,
    codRegraIcms: '',
    codOrigemProd: '0', // 0 - Nacional por padrão
    ativo: true,
    imagem: null,
    imagemUrl: '',
    observacoes: '',
    fornecedor: '',
    marca: '',
    localizacao: '',
    peso: '',
    altura: '',
    largura: '',
    profundidade: '',
  });
  
  const [categorias, setCategorias] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [previewImage, setPreviewImage] = useState('');
  const [errors, setErrors] = useState({});
  
  // Adicionar estado para rastrear o carregamento de dados fiscais
  const [loadingFiscalData, setLoadingFiscalData] = useState(false);
  
  // Buscar categorias e fornecedores
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Tentar obter categorias
        let categoriasData = [];
      try {
        const categoriaResponse = await api.produtos.listarCategorias();
          if (categoriaResponse && categoriaResponse.data) {
            categoriasData = categoriaResponse.data;
          }
        } catch (catError) {
          console.error('Erro ao carregar categorias:', catError);
          toast.warning('Não foi possível carregar as categorias');
        }
        setCategorias(categoriasData);
        
        // Tentar obter fornecedores
        let fornecedoresData = [];
        try {
        const fornecedorResponse = await api.clientes.listar();
          if (fornecedorResponse && fornecedorResponse.data) {
            fornecedoresData = fornecedorResponse.data;
          }
        } catch (fornError) {
          console.error('Erro ao carregar fornecedores:', fornError);
          toast.warning('Não foi possível carregar a lista de fornecedores');
        }
        setFornecedores(fornecedoresData);

      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados necessários para o formulário');
      }
    };
    
    fetchData();
  }, []);
  
  // Carregar produto se estiver editando
  useEffect(() => {
    if (isEditing && id) {
      const fetchProduto = async () => {
        setLoading(true);
        try {
          if (!api.produtos || typeof api.produtos.obterPorId !== 'function') {
            throw new Error('API de produtos não disponível');
          }
          
          console.log("Buscando produto com ID:", id);
          const response = await api.produtos.obterPorId(id);
          if (response && response.data) {
            console.log("Produto encontrado:", response.data);
            // Criar um novo objeto com valores padrão para todos os campos
            const produtoData = {
              codigo: response.data.codigo || '',
              descricao: response.data.descricao || '',
              unidade: response.data.unidade || 'UN',
              unidade2: response.data.unidade2 || 'UN',
              fator_conv_estoque: response.data.fator_conv_estoque || 1,
              preco_venda: response.data.preco_venda || '',
              precoPromocional: response.data.precoPromocional || '',
              precoCusto: response.data.precoCusto || '',
              estoque: response.data.estoque != null ? response.data.estoque : 0,
              estoqueMinimo: response.data.estoqueMinimo != null ? response.data.estoqueMinimo : 0,
              categoria: response.data.categoria || '',
              ncm: response.data.ncm || response.data.class_fiscal || '',
              classiFiscal: response.data.classiFiscal || response.data.class_fiscal || '',
              percentualIpi: response.data.percentualIpi != null ? response.data.percentualIpi : (response.data.aliq_ipi != null ? response.data.aliq_ipi : 0),
              percentualIcms: response.data.percentualIcms != null ? response.data.percentualIcms : 0,
              codRegraIcms: response.data.codRegraIcms || response.data.cod_regra_icms || '',
              codOrigemProd: response.data.codOrigemProd || response.data.cod_origem_prod || '0', // 0 - Nacional por padrão
              ativo: response.data.ativo !== false,
              imagem: null,
              imagemUrl: response.data.imagemUrl || '',
              observacoes: response.data.observacoes || '',
              fornecedor: response.data.fornecedor || '',
              marca: response.data.marca || '',
              localizacao: response.data.localizacao || '',
              peso: response.data.peso || '',
              altura: response.data.altura || '',
              largura: response.data.largura || '',
              profundidade: response.data.profundidade || ''
            };
            
            setProduto(produtoData);
            
            if (response.data.imagemUrl) {
              setPreviewImage(response.data.imagemUrl);
            }

            // Buscar dados fiscais adicionais após carregar o produto
            fetchFiscalData(response.data.codigo);
          } else {
            console.log("Produto não encontrado, criando novo com ID:", id);
            // Se o produto não foi encontrado, definimos um estado de produto inicial com apenas o código preenchido
            setProduto(prevState => ({
              ...prevState,
              codigo: id
            }));
            toast.info(`Produto com código ${id} não encontrado. Criando um novo produto.`);
          }
        } catch (error) {
          console.error('Erro ao carregar produto:', error);
          
          // Verificar se é um erro 404 (produto não encontrado)
          if (error.response && error.response.status === 404) {
            console.log("Erro 404, criando novo produto com ID:", id);
            // Se for 404, mantemos o modo de criação com o código preenchido
            setProduto(prevState => ({
              ...prevState,
              codigo: id
            }));
            toast.info(`Produto com código ${id} não encontrado. Criando um novo produto.`);
          } else {
            // Para outros erros, exibimos uma mensagem mais genérica
            toast.error('Erro ao carregar dados do produto. Verifique se o backend está funcionando.');
          }
        } finally {
          setLoading(false);
        }
      };
      
      fetchProduto();
    }
  }, [id, isEditing, navigate]);
  
  // Nova função para buscar dados fiscais completos de um produto
  const fetchFiscalData = async (codigoProduto) => {
    try {
      setLoadingFiscalData(true);
      console.log('Buscando dados fiscais completos para o produto:', codigoProduto);
      
      // Tentar buscar dados fiscais através do serviço especial
      try {
        const dadosFiscaisResponse = await fiscalAPI.buscarDadosProduto(codigoProduto);
        
        if (dadosFiscaisResponse && dadosFiscaisResponse.success && dadosFiscaisResponse.data) {
          console.log('Dados fiscais recuperados:', dadosFiscaisResponse.data);
          
          // Atualizar produto com os dados fiscais recebidos
          setProduto(prevState => ({
            ...prevState,
            classiFiscal: dadosFiscaisResponse.data.class_fiscal || prevState.classiFiscal,
            ncm: dadosFiscaisResponse.data.class_fiscal || prevState.ncm,
            codRegraIcms: dadosFiscaisResponse.data.cod_regra_icms || prevState.codRegraIcms,
            percentualIpi: (dadosFiscaisResponse.data.aliq_ipi != null) ? 
              dadosFiscaisResponse.data.aliq_ipi : prevState.percentualIpi,
            codOrigemProd: dadosFiscaisResponse.data.cod_origem_prod || prevState.codOrigemProd
          }));
          
          toast.success('Dados fiscais carregados com sucesso!');
          return;
        }
      } catch (fiscalError) {
        console.warn('Erro ao buscar dados via fiscalAPI, tentando outras fontes:', fiscalError);
      }
      
      // Se falhar, tenta buscar pelo endpoint alternativo
      try {
        console.log('Tentando buscar dados fiscais por API alternativa...');
        const response = await api.get(`/produtos/dados-fiscais/${encodeURIComponent(codigoProduto)}`);
        
        if (response && response.data) {
          console.log('Dados fiscais encontrados por API alternativa:', response.data);
          setProduto(prevState => ({
            ...prevState,
            classiFiscal: response.data.class_fiscal || prevState.classiFiscal,
            ncm: response.data.class_fiscal || prevState.ncm, 
            codRegraIcms: response.data.cod_regra_icms || prevState.codRegraIcms,
            percentualIpi: (response.data.aliq_ipi != null) ? 
              response.data.aliq_ipi : prevState.percentualIpi,
            codOrigemProd: response.data.cod_origem_prod || prevState.codOrigemProd
          }));
          
          toast.success('Dados fiscais carregados com sucesso!');
          return;
        }
      } catch (alternativeError) {
        console.warn('Erro ao buscar dados fiscais por API alternativa:', alternativeError);
      }
      
      console.log('Não foi possível recuperar dados fiscais completos');
      
    } catch (error) {
      console.error('Erro ao buscar dados fiscais:', error);
      toast.warning('Não foi possível recuperar todos os dados fiscais do produto');
    } finally {
      setLoadingFiscalData(false);
    }
  };

  // Função para forçar atualização dos dados fiscais
  const handleRefreshFiscalData = async () => {
    if (!produto.codigo) {
      toast.warning('É necessário informar o código do produto para buscar dados fiscais');
      return;
    }
    
    await fetchFiscalData(produto.codigo);
  };
  
  // Manipulação de alterações nos campos
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProduto(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Limpar erro ao editar campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  // Manipulação de valores monetários
  const handleCurrencyChange = (value, name) => {
    setProduto(prev => ({
      ...prev,
      [name]: value || ''
    }));
    
    // Limpar erro ao editar campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  // Manipulação da imagem
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProduto(prev => ({
        ...prev,
        imagem: file
      }));
      
      // Criar URL para preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Validação do formulário
  const validateForm = () => {
    const newErrors = {};
    
    if (!produto.codigo) newErrors.codigo = 'Código é obrigatório';
    if (!produto.descricao) newErrors.descricao = 'Descrição é obrigatória';
    if (!produto.unidade) newErrors.unidade = 'Unidade é obrigatória';
    if (!produto.preco_venda) newErrors.preco_venda = 'Preço é obrigatório';
    
    // Validações fiscais
    if (produto.ncm) {
      // Remover caracteres não numéricos para validação
      const ncmNumerico = produto.ncm.replace(/\D/g, '');
      if (ncmNumerico.length !== 8) {
        newErrors.ncm = 'NCM deve conter 8 dígitos numéricos';
      }
    }
    
    // Verificar se a classificação fiscal está preenchida quando NCM estiver presente
    if (produto.ncm && !produto.classiFiscal) {
      // Se NCM está preenchido mas classiFiscal não, usar o próprio NCM
      setProduto(prev => ({
        ...prev,
        classiFiscal: produto.ncm
      }));
    }
    
    // Validar código de regra ICMS
    if (produto.codRegraIcms && isNaN(parseInt(produto.codRegraIcms))) {
      newErrors.codRegraIcms = 'Código da regra ICMS deve ser um número válido';
    }
    
    // Validar percentuais
    if (produto.percentualIpi !== undefined && produto.percentualIpi !== null) {
      const ipi = parseFloat(produto.percentualIpi);
      if (isNaN(ipi) || ipi < 0 || ipi > 100) {
        newErrors.percentualIpi = 'Percentual de IPI deve estar entre 0 e 100';
      }
    }
    
    if (produto.percentualIcms !== undefined && produto.percentualIcms !== null) {
      const icms = parseFloat(produto.percentualIcms);
      if (isNaN(icms) || icms < 0 || icms > 100) {
        newErrors.percentualIcms = 'Percentual de ICMS deve estar entre 0 e 100';
      }
    }
    
    // Validar código de origem
    if (!produto.codOrigemProd) {
      // Definir valor padrão para origem (0 = Nacional)
      setProduto(prev => ({
        ...prev,
        codOrigemProd: '0'
      }));
    } else if (isNaN(parseInt(produto.codOrigemProd)) || parseInt(produto.codOrigemProd) < 0 || parseInt(produto.codOrigemProd) > 8) {
      newErrors.codOrigemProd = 'Código de origem deve ser um valor entre 0 e 8';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Salvamento do produto
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.warning('Por favor, corrija os erros no formulário');
      return;
    }
    
    setSaving(true);
    
    try {
      if (!api.produtos || 
          (isEditing && typeof api.produtos.atualizar !== 'function') || 
          (!isEditing && typeof api.produtos.criar !== 'function')) {
        throw new Error('API de produtos não disponível');
      }

      // Normalizar dados fiscais antes de enviar
      const produtoNormalizado = {
        ...produto,
        // Garantir que valores numéricos fiscais sejam enviados como números
        percentualIpi: parseFloat(produto.percentualIpi) || 0,
        percentualIcms: parseFloat(produto.percentualIcms) || 0,
        // Garantir que campos de string fiscais não sejam undefined ou null
        ncm: produto.ncm || '',
        classiFiscal: produto.classiFiscal || produto.ncm || '',
        codRegraIcms: produto.codRegraIcms || '',
        codOrigemProd: produto.codOrigemProd || '0',
        // Adicionar campos adicionais com nomes alternativos para compatibilidade
        class_fiscal: produto.classiFiscal || produto.ncm || '',
        cod_regra_icms: produto.codRegraIcms || '',
        aliq_ipi: parseFloat(produto.percentualIpi) || 0,
        cod_origem_prod: produto.codOrigemProd || '0'
      };

      const formData = new FormData();
      
      // Adicionar todos os campos do produto normalizado ao FormData
      for (const key in produtoNormalizado) {
        if (key === 'imagem' && produtoNormalizado[key] instanceof File) {
          formData.append(key, produtoNormalizado[key]);
        } else if (produtoNormalizado[key] !== null && produtoNormalizado[key] !== undefined) {
          formData.append(key, produtoNormalizado[key]);
        }
      }
      
      console.log('Enviando dados do produto:', Object.fromEntries(formData));
      
      let response;
      if (isEditing) {
        response = await api.produtos.atualizar(id, formData);
      } else {
        response = await api.produtos.criar(formData);
      }
      
      if (response && (response.status === 200 || response.status === 201)) {
        toast.success(isEditing ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!');
        
        // Atualizar dados fiscais após salvar, se necessário
        if (response.data && response.data.codigo) {
          try {
            // Verificar se precisamos atualizar dados fiscais específicos
            const codigoProduto = response.data.codigo;
            console.log('Verificando se é necessário atualizar dados fiscais para:', codigoProduto);
            
            // Caso seja necessário atualizar regras fiscais específicas, podemos chamar uma API aqui
            // Por exemplo, caso tenhamos uma API para sincronizar dados fiscais
            if (fiscalAPI && typeof fiscalAPI.sincronizarRegrasFiscais === 'function') {
              try {
                await fiscalAPI.sincronizarRegrasFiscais();
                console.log('Regras fiscais sincronizadas após salvar produto');
              } catch (syncError) {
                console.warn('Aviso: Não foi possível sincronizar regras fiscais:', syncError);
              }
            }
          } catch (fiscalError) {
            console.warn('Aviso: Ocorreu um erro ao atualizar regras fiscais:', fiscalError);
          }
        }
        
        navigate('/produtos');
      } else {
        throw new Error('Resposta da API inválida');
      }
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast.error(`Erro ao salvar produto: ${error.message || 'Tente novamente mais tarde'}`);
    } finally {
      setSaving(false);
    }
  };
  
  // Cancelar e voltar
  const handleCancel = () => {
    navigate('/produtos');
  };

  // Renderização do conteúdo baseado na aba ativa
  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <div className="form-section-content">
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Código *</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><FaBarcode /></InputGroup.Text>
                    <Form.Control
                      type="text"
                      name="codigo"
                      value={produto.codigo}
                      onChange={handleChange}
                      isInvalid={!!errors.codigo}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.codigo}
                    </Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Descrição *</Form.Label>
              <Form.Control
                type="text"
                name="descricao"
                value={produto.descricao}
                onChange={handleChange}
                isInvalid={!!errors.descricao}
              />
              <Form.Control.Feedback type="invalid">
                {errors.descricao}
              </Form.Control.Feedback>
            </Form.Group>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Categoria</Form.Label>
                  <Form.Select
                    name="categoria"
                    value={produto.categoria}
                    onChange={handleChange}
                  >
                    <option value="">Selecione uma categoria</option>
                    {categorias.map(cat => (
                      <option key={cat.id || cat.codigo} value={cat.id || cat.codigo}>
                        {cat.nome || cat.descricao}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Unidade *</Form.Label>
                  <Form.Select
                    name="unidade"
                    value={produto.unidade}
                    onChange={handleChange}
                    isInvalid={!!errors.unidade}
                  >
                    <option value="UN">Unidade (UN)</option>
                    <option value="KG">Quilograma (KG)</option>
                    <option value="CX">Caixa (CX)</option>
                    <option value="PC">Peça (PC)</option>
                    <option value="MT">Metro (MT)</option>
                    <option value="LT">Litro (LT)</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.unidade}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <div className="status-switch">
                    <Form.Check
                      type="switch"
                      id="status-switch"
                      name="ativo"
                      checked={produto.ativo}
                      onChange={handleChange}
                      label=""
                    />
                    <span className={`status-label ${produto.ativo ? 'status-active' : 'status-inactive'}`}>
                      {produto.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Unidade Tributação</Form.Label>
                  <Form.Select
                    name="unidade2"
                    value={produto.unidade2}
                    onChange={handleChange}
                  >
                    <option value="UN">Unidade (UN)</option>
                    <option value="KG">Quilograma (KG)</option>
                    <option value="CX">Caixa (CX)</option>
                    <option value="PC">Peça (PC)</option>
                    <option value="MT">Metro (MT)</option>
                    <option value="LT">Litro (LT)</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Unidade utilizada para fins de tributação fiscal.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fator de Conversão</Form.Label>
                  <Form.Control
                    type="number"
                    name="fator_conv_estoque"
                    value={produto.fator_conv_estoque || 1}
                    onChange={handleChange}
                    min="0.001"
                    step="0.001"
                    placeholder="1"
                  />
                  <Form.Text className="text-muted">
                    Fator para converter unidade de venda em unidade de tributação.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </div>
        );
      
      case 'precos':
        return (
          <div className="form-section-content">
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Preço de Venda *</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><FaMoneyBillWave /></InputGroup.Text>
                    <CurrencyInput
                      id="preco"
                      name="preco_venda"
                      name="preco"
                      className={`form-control ${errors.preco ? 'is-invalid' : ''}`}
                      placeholder="0,00"
                      decimalsLimit={2}
                      decimalSeparator=","
                      groupSeparator="."
                      value={produto.preco}
                      onValueChange={(value) => handleCurrencyChange(value, 'preco')}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.preco}
                    </Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Preço Promocional</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><FaPercent /></InputGroup.Text>
                    <CurrencyInput
                      id="precoPromocional"
                      name="precoPromocional"
                      className="form-control"
                      placeholder="0,00"
                      decimalsLimit={2}
                      decimalSeparator=","
                      groupSeparator="."
                      value={produto.precoPromocional}
                      onValueChange={(value) => handleCurrencyChange(value, 'precoPromocional')}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Preço de Custo</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><FaMoneyBillWave /></InputGroup.Text>
                    <CurrencyInput
                      id="precoCusto"
                      name="precoCusto"
                      className="form-control"
                      placeholder="0,00"
                      decimalsLimit={2}
                      decimalSeparator=","
                      groupSeparator="."
                      value={produto.precoCusto}
                      onValueChange={(value) => handleCurrencyChange(value, 'precoCusto')}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Percentual de IPI</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><FaPercent /></InputGroup.Text>
                    <Form.Control
                      type="number"
                      name="percentualIpi"
                      value={produto.percentualIpi}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Percentual de ICMS</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><FaPercent /></InputGroup.Text>
                    <Form.Control
                      type="number"
                      name="percentualIcms"
                      value={produto.percentualIcms}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>NCM (Nomenclatura Comum do Mercosul)</Form.Label>
              <Form.Control
                type="text"
                name="ncm"
                value={produto.ncm}
                onChange={handleChange}
                placeholder="Ex: 8517.12.31"
              />
              <Form.Text className="text-muted">
                O NCM é utilizado para classificação fiscal de produtos.
              </Form.Text>
            </Form.Group>
          </div>
        );
      
      case 'estoque':
        return (
          <div className="form-section-content">
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Estoque Atual</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><FaBoxOpen /></InputGroup.Text>
                    <Form.Control
                      type="number"
                      name="estoque"
                      value={produto.estoque}
                      onChange={handleChange}
                      min="0"
                      step="1"
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Estoque Mínimo</Form.Label>
                  <Form.Control
                    type="number"
                    name="estoqueMinimo"
                    value={produto.estoqueMinimo}
                    onChange={handleChange}
                    min="0"
                    step="1"
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Fornecedor</Form.Label>
              <Form.Select
                name="fornecedor"
                value={produto.fornecedor}
                onChange={handleChange}
              >
                <option value="">Selecione um fornecedor</option>
                {fornecedores.map(forn => (
                  <option key={forn.id || forn.codigo} value={forn.id || forn.codigo}>
                    {forn.nome || forn.razao}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Localização no Estoque</Form.Label>
              <Form.Control
                type="text"
                name="localizacao"
                value={produto.localizacao}
                onChange={handleChange}
                placeholder="Ex: Prateleira A, Seção 3"
              />
            </Form.Group>
          </div>
        );
      
      case 'adicional':
        return (
          <div className="form-section-content">
            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Peso (kg)</Form.Label>
                  <Form.Control
                    type="number"
                    name="peso"
                    value={produto.peso}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Altura (cm)</Form.Label>
                  <Form.Control
                    type="number"
                    name="altura"
                    value={produto.altura}
                    onChange={handleChange}
                    min="0"
                    step="0.1"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Largura (cm)</Form.Label>
                  <Form.Control
                    type="number"
                    name="largura"
                    value={produto.largura}
                    onChange={handleChange}
                    min="0"
                    step="0.1"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Profundidade (cm)</Form.Label>
                  <Form.Control
                    type="number"
                    name="profundidade"
                    value={produto.profundidade}
                    onChange={handleChange}
                    min="0"
                    step="0.1"
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Marca</Form.Label>
              <Form.Control
                type="text"
                name="marca"
                value={produto.marca}
                onChange={handleChange}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Observações</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="observacoes"
                value={produto.observacoes}
                onChange={handleChange}
                placeholder="Informações adicionais sobre o produto"
              />
            </Form.Group>
          </div>
        );
      
      case 'imagem':
        return (
          <div className="form-section-content">
            <Row>
              <Col md={6}>
                <div className="product-image-preview">
                  {previewImage ? (
                    <img src={previewImage} alt="Preview do produto" />
                  ) : (
                    <div className="text-center text-muted">
                      <FaImage size={48} />
                      <p className="mt-2">Nenhuma imagem selecionada</p>
                    </div>
                  )}
                </div>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-4">
                  <Form.Label>Selecionar Imagem</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  <Form.Text className="text-muted">
                    Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 2MB.
                  </Form.Text>
                </Form.Group>
                
                {previewImage && (
                  <Button 
                    variant="outline-danger" 
                    className="mt-2"
                    onClick={() => {
                      setPreviewImage('');
                      setProduto(prev => ({ ...prev, imagem: null, imagemUrl: '' }));
                    }}
                  >
                    Remover Imagem
                  </Button>
                )}
              </Col>
            </Row>
          </div>
        );
      
      case 'fiscal':
        return (
          <Card.Body>
            <div className="d-flex justify-content-between mb-3">
              <Alert variant="info" className="mb-0 flex-grow-1 me-2">
                <span><FaInfoCircle className="me-2" /></span>
                <strong>Importante:</strong> Os dados fiscais completos são essenciais para o correto cálculo de impostos nos orçamentos e pedidos.
              </Alert>
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={handleRefreshFiscalData}
                disabled={loadingFiscalData || !produto.codigo}
              >
                {loadingFiscalData ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-1" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <FaSync className="me-1" /> Atualizar Dados Fiscais
                  </>
                )}
              </Button>
            </div>
          
            {loadingFiscalData && (
              <Alert variant="info">
                <Spinner animation="border" size="sm" className="me-2" />
                Carregando dados fiscais completos...
              </Alert>
            )}
            
            <Row className="mb-4">
              <Col md={12}>
                <Card className="bg-light">
                  <Card.Body>
                    <h6 className="mb-3"><span><FaInfoCircle className="me-2" /></span>Como os dados fiscais são utilizados?</h6>
                    <ul className="mb-0">
                      <li>Nos orçamentos, o <strong>NCM</strong> e a <strong>Classificação Fiscal</strong> determinam as alíquotas de impostos</li>
                      <li>O <strong>Código de Regra ICMS</strong> define como o ICMS será calculado, incluindo substituição tributária</li>
                      <li>O <strong>Percentual de IPI</strong> é aplicado automaticamente nos orçamentos e notas fiscais</li>
                      <li>A <strong>Origem do Produto</strong> é utilizada nas notas fiscais e obrigatória para o SPED Fiscal</li>
                    </ul>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    NCM (Nomenclatura Comum do Mercosul)
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip>
                          Código NCM de 8 dígitos obrigatório para classificação fiscal do produto.
                          Ex: 8517.12.31
                        </Tooltip>
                      }
                    >
                      <span><FaInfoCircle className="ms-2" /></span>
                    </OverlayTrigger>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="ncm"
                    value={produto.ncm}
                    onChange={handleChange}
                    isInvalid={!!errors.ncm}
                    placeholder="Ex: 85171231"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.ncm}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Digite apenas os números, sem pontos ou traços
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Classificação Fiscal Específica
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip>
                          Código interno para regras fiscais específicas do sistema.
                          Este código é usado para definir regras de tributação específicas.
                        </Tooltip>
                      }
                    >
                      <span><FaInfoCircle className="ms-2" /></span>
                    </OverlayTrigger>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="classiFiscal"
                    value={produto.classiFiscal}
                    onChange={handleChange}
                    isInvalid={!!errors.classiFiscal}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.classiFiscal}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Se não for informado, será usado o mesmo valor do NCM
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Origem do Produto
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip>
                          Indica a origem da mercadoria para fins de tributação.
                        </Tooltip>
                      }
                    >
                      <span><FaInfoCircle className="ms-2" /></span>
                    </OverlayTrigger>
                  </Form.Label>
                  <Form.Select
                    name="codOrigemProd"
                    value={produto.codOrigemProd}
                    onChange={handleChange}
                    isInvalid={!!errors.codOrigemProd}
                  >
                    <option value="0">0 - Nacional</option>
                    <option value="1">1 - Estrangeira (Importação direta)</option>
                    <option value="2">2 - Estrangeira (Adquirida no mercado interno)</option>
                    <option value="3">3 - Nacional (Mercadoria ou bem com Conteúdo de Importação superior a 40%)</option>
                    <option value="4">4 - Nacional (Produção conforme processos produtivos)</option>
                    <option value="5">5 - Nacional (Mercadoria ou bem com Conteúdo de Importação inferior ou igual a 40%)</option>
                    <option value="6">6 - Estrangeira (Importação direta, sem similar nacional)</option>
                    <option value="7">7 - Estrangeira (Adquirida no mercado interno, sem similar nacional)</option>
                    <option value="8">8 - Nacional (Mercadoria ou bem com Conteúdo de Importação superior a 70%)</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.codOrigemProd}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Código da Regra de ICMS
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip>
                          Código que define as regras de cálculo do ICMS para este produto.
                        </Tooltip>
                      }
                    >
                      <span><FaInfoCircle className="ms-2" /></span>
                    </OverlayTrigger>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="codRegraIcms"
                    value={produto.codRegraIcms}
                    onChange={handleChange}
                    isInvalid={!!errors.codRegraIcms}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.codRegraIcms}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Este código define as regras de ICMS e ST aplicáveis
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Percentual IPI
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip>
                          Alíquota do Imposto sobre Produtos Industrializados.
                        </Tooltip>
                      }
                    >
                      <span><FaInfoCircle className="ms-2" /></span>
                    </OverlayTrigger>
                  </Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="number"
                      step="0.01"
                      name="percentualIpi"
                      value={produto.percentualIpi}
                      onChange={handleChange}
                      isInvalid={!!errors.percentualIpi}
                    />
                    <InputGroup.Text>%</InputGroup.Text>
                  </InputGroup>
                  <Form.Control.Feedback type="invalid">
                    {errors.percentualIpi}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Este valor será aplicado automaticamente nos orçamentos
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Percentual ICMS
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip>
                          Alíquota do Imposto sobre Circulação de Mercadorias e Serviços.
                        </Tooltip>
                      }
                    >
                      <span><FaInfoCircle className="ms-2" /></span>
                    </OverlayTrigger>
                  </Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="number"
                      step="0.01"
                      name="percentualIcms"
                      value={produto.percentualIcms}
                      onChange={handleChange}
                      isInvalid={!!errors.percentualIcms}
                    />
                    <InputGroup.Text>%</InputGroup.Text>
                  </InputGroup>
                  <Form.Control.Feedback type="invalid">
                    {errors.percentualIcms}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Utilizado como base para cálculos quando a regra de ICMS não é encontrada
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            
            <Row className="mt-4">
              <Col md={12}>
                <Alert variant="warning">
                  <strong>Atenção:</strong> Certifique-se de que os dados fiscais estão corretos para evitar problemas com a emissão de notas fiscais e cálculos tributários nos orçamentos.
                </Alert>
              </Col>
            </Row>
          </Card.Body>
        );
        
      default:
        return null;
    }
  };
  
  if (loading) {
    return (
      <SidebarLayout>
        <Container className="py-4">
          <div className="text-center py-5">
            <Spinner animation="border" className="spinner-border-custom" />
            <p className="mt-3">Carregando dados do produto...</p>
          </div>
        </Container>
      </SidebarLayout>
    );
  }
  
  return (
    <SidebarLayout>
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="page-title">
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
          </h1>
          <Button
            variant="outline-secondary"
            className="d-flex align-items-center"
            onClick={handleCancel}
          >
            <FaArrowLeft className="me-2" /> Voltar
          </Button>
        </div>
        
        <Form onSubmit={handleSubmit}>
          <Card className="form-card mb-4">
            <Card.Header className="d-flex align-items-center">
              <FaTag className="me-2" /> Informações do Produto
            </Card.Header>
            <Card.Body className="p-0">
              <Nav className="product-tabs border-bottom" onSelect={setActiveTab}>
                <Nav.Item>
                  <Nav.Link eventKey="info" active={activeTab === 'info'}>
                    <span><FaInfoCircle className="me-1" /></span> Informações Básicas
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="precos" active={activeTab === 'precos'}>
                    <FaMoneyBillWave className="me-1" /> Preços e Impostos
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="estoque" active={activeTab === 'estoque'}>
                    <FaBoxOpen className="me-1" /> Estoque
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="adicional" active={activeTab === 'adicional'}>
                    <FaClipboardList className="me-1" /> Dados Adicionais
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="imagem" active={activeTab === 'imagem'}>
                    <FaImage className="me-1" /> Imagem
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="fiscal" active={activeTab === 'fiscal'}>
                    <FaTags className="me-1" /> Fiscal
                  </Nav.Link>
                </Nav.Item>
              </Nav>
              
              {renderTabContent()}
            </Card.Body>
          </Card>
          
          <div className="action-buttons">
            <Button
              variant="outline-secondary"
              className="action-button"
              onClick={handleCancel}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="action-button"
              type="submit"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <FaSave className="me-2" />
                  Salvar Produto
                </>
              )}
            </Button>
          </div>
        </Form>
      </Container>
    </SidebarLayout>
  );
};

export default ProdutoForm; 