import axios from 'axios';

// Função de log que só exibe em desenvolvimento
const debugLog = (...args) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
};

// Determinar a URL base da API baseada no ambiente
const getBaseURL = () => {
  // Em desenvolvimento local, usa localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001/api';
  }
  
  // Em produção, sempre usa HTTPS
  return 'https://studywob.com.br/api';
};

// Criar uma instância do axios com a URL base da API
const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Log para debug
debugLog('[API] Usando a URL base:', getBaseURL());

// Interceptador para adicionar token de autenticação
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// APIs específicas para cada entidade
export const clientesAPI = {
  // Busca de clientes com filtro (nome, código ou CNPJ/CPF)
  buscar: (termo) => api.get(`/clientes/busca?termo=${termo}`),
  
  // Listar todos os clientes
  listar: () => api.get('/clientes'),
  
  // Obter cliente por ID
  obterPorId: (id) => api.get(`/clientes/${id}`),
  
  // Buscar cliente por código
  buscarPorCodigo: (codigo) => api.get(`/clientes/codigo/${codigo}`),
  
  // Buscar clientes por vendedor (usando o campo cod_vendedor1)
  buscarPorVendedor: (codVendedor) => api.get(`/clientes/vendedor/${codVendedor}`),

  buscarTodos: async (params) => {
    return await api.get('/clientes', { params });
  },

  buscarPorId: async (id) => {
    return await api.get(`/clientes/${id}`);
  },

  buscarPorCNPJ: async (cnpj) => {
    return await api.get(`/clientes/cnpj/${cnpj}`);
  }
};

// API para usuários
export const usuariosAPI = {
  listar: () => api.get('/usuarios'),
  buscarPorId: (id) => api.get(`/usuarios/${id}`),
  criar: (dados) => api.post('/usuarios', dados),
  atualizar: (id, dados) => api.put(`/usuarios/${id}`, dados),
  excluir: (id) => api.delete(`/usuarios/${id}`)
};

// Novo API para o vínculo usuário-vendedor
export const usuarioVendedorAPI = {
  // Listar todos os vínculos
  listarVinculos: () => api.get('/usuario-vendedor/todos'),
  
  // Obter o vínculo atual do usuário logado
  obterVinculoUsuario: () => api.get('/usuario-vendedor'),
  
  // Criar um vínculo entre usuário e vendedor
  criarVinculo: (usuario_id, vendedor_codigo) => 
    api.post('/usuario-vendedor', { usuario_id, vendedor_codigo }),
  
  // Remover um vínculo específico
  removerVinculo: (usuario_id, vendedor_codigo) => 
    api.delete(`/usuario-vendedor/${usuario_id}/${vendedor_codigo}`)
};

// Nova API para tokens de vendedor
export const vendedorTokenAPI = {
  // Listar todos os tokens (admin)
  listar: () => api.get('/vendedor-token'),
  
  // Gerar um novo token para um vendedor
  gerar: (vendedor_codigo, dias_validade = 30, descricao) => 
    api.post('/vendedor-token', { vendedor_codigo, dias_validade, descricao }),
  
  // Validar um token (rota pública)
  validar: (token) => api.get(`/vendedor-token/validar/${token}`),
  
  // Usar um token para vincular o usuário logado ao vendedor
  usar: (token) => api.post('/vendedor-token/usar', { token }),
  
  // Desativar um token específico
  desativar: (id) => api.put(`/vendedor-token/desativar/${id}`)
};

export const estadosAPI = {
  // Listar todos os estados
  listar: () => api.get('/estados'),
  
  // Obter estado por UF
  obterPorUF: (uf) => api.get(`/estados/${uf}`),
};

export const vendedoresAPI = {
  // Busca de vendedores com filtro (nome ou código)
  buscar: (termo) => api.get(`/vendedores/busca?termo=${termo}`),
  
  // Listar todos os vendedores
  listar: () => api.get('/vendedores'),
  
  // Obter vendedor por ID
  obterPorId: (id) => api.get(`/vendedores/${id}`),

  buscarTodos: async (params) => {
    return await api.get('/vendedores', { params });
  },

  buscarPorId: async (id) => {
    return await api.get(`/vendedores/${id}`);
  }
};

export const produtosAPI = {
  // Busca de produtos com filtro (descrição, código)
  buscar: (termo) => api.get(`/produtos/busca?termo=${termo}`),
  
  // Listar todos os produtos
  listar: () => api.get('/produtos'),
  
  // Obter produto por ID
  obterPorId: (id) => api.get(`/produtos/${encodeURIComponent(id)}`),

  // Criar novo produto
  criar: (dados) => api.post('/produtos', dados),
  
  // Atualizar produto existente
  atualizar: (id, dados) => api.put(`/produtos/${encodeURIComponent(id)}`, dados),
  
  // Excluir produto
  excluir: (id) => api.delete(`/produtos/${encodeURIComponent(id)}`),
  
  // Listar categorias de produtos
  listarCategorias: () => api.get('/categorias'),

  buscarTodos: async (params) => {
    return await api.get('/produtos', { params });
  },

  buscarPorId: async (id) => {
    return await api.get(`/produtos/${id}`);
  },

  buscarPorCodigo: async (codigo) => {
    return await api.get(`/produtos/codigo/${codigo}`);
  },
  
  // Buscar posição de estoque de um produto
  obterPosicaoEstoque: async (codigo) => {
    try {
      debugLog(`[produtosAPI] Buscando posição de estoque para o produto: ${codigo}`);
      // Utilizar a API real que consulta a view posicao_estoque no ERP
      const response = await api.get(`/produtos/estoque/${encodeURIComponent(codigo)}`);
      debugLog('[produtosAPI] Resposta da API de estoque:', response.data);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      debugLog(`[produtosAPI] Erro ao buscar estoque do produto ${codigo}:`, error);
      
      // Em caso de erro, retornar resultado vazio mas com estrutura válida
      return {
        success: false,
        data: {
          codigo: codigo,
          qtd_disponivel: 0,
          qtd_total: 0,
          local_estoque: null,
          empresa: null
        },
        error: error.message
      };
    }
  }
};

export const orcamentosAPI = {
  // Listar todos os orçamentos
  listar: () => api.get('/orcamentos'),
  
  // Listar orçamentos por vendedor
  listarPorVendedor: (codVendedor) => api.get(`/orcamentos/vendedor/${codVendedor}`),
  
  // Obter orçamento por ID
  obterPorId: (id) => api.get(`/orcamentos/${id}`),
  
  // Criar novo orçamento
  criar: (dados) => api.post('/orcamentos', dados),
  
  // Atualizar orçamento existente
  atualizar: (id, dados) => api.put(`/orcamentos/${id}`, dados),
  
  // Excluir orçamento
  excluir: (id) => api.delete(`/orcamentos/${id}`),
  
  // Duplicar orçamento
  duplicar: (id) => api.post(`/orcamentos/${id}/duplicate`),
  
  // Converter orçamento em pedido
  converterEmPedido: (id) => api.post(`/orcamentos/${id}/converter`),

  buscarTodos: async (params) => {
    return await api.get('/orcamentos', { params });
  },

  buscarPorId: async (id) => {
    return await api.get(`/orcamentos/${id}`);
  },

  salvar: async (orcamento) => {
    if (orcamento.codigo) {
      return await api.put(`/orcamentos/${orcamento.codigo}`, orcamento);
    } else {
      return await api.post('/orcamentos', orcamento);
    }
  },

  transformarEmPedido: async (id) => {
    return await api.post(`/orcamentos/${id}/pedido`);
  },
  
  // Aplicar desconto com validação
  aplicarDesconto: async (productId, requestedDiscount, unitPrice) => {
    return await api.post('/orcamentos/aplicar-desconto', {
      productId,
      requestedDiscount,
      unitPrice
    });
  },
  
  // Converter orçamento em pedido de venda
  converterEmPedidoVenda: async (codigo, dadosPagamento) => {
    try {
      // Garantir que os campos estejam no formato correto para o banco
      const payload = {};

      // Verificar e adicionar forma de pagamento se existir e não for vazia
      if (dadosPagamento.cod_forma_pagto && dadosPagamento.cod_forma_pagto.toString().trim() !== '') {
        payload.cod_forma_pagto = dadosPagamento.cod_forma_pagto.toString().trim();
      }

      // Verificar e adicionar condição de pagamento se existir e não for vazia
      if (dadosPagamento.cod_cond_pagto && dadosPagamento.cod_cond_pagto.toString().trim() !== '') {
        payload.cod_cond_pagto = dadosPagamento.cod_cond_pagto.toString().trim().replace(',', '.');
      }

      // Validar se os códigos foram definidos
      if (!payload.cod_forma_pagto || !payload.cod_cond_pagto) {
        throw new Error('Forma e condição de pagamento são obrigatórios');
      }

      debugLog('Convertendo orçamento com dados:', payload);
      
      // Usando o endpoint correto do controller de sincronização
      const response = await api.post(`/sync/convert-to-order/${codigo}`, payload);
      return response;
    } catch (error) {
      debugLog('Erro na conversão:', error);
      throw error;
    }
  },

  gerarPDF: async (id) => {
    try {
      const response = await api.get(`/orcamentos/${id}/pdf`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export const pagamentosAPI = {
  // Listar formas de pagamento
  listarFormas: () => api.get('/formas-pagamento'),
  
  // Listar condições de pagamento
  listarCondicoes: () => api.get('/condicoes-pagamento'),
  
  // Buscar forma de pagamento por ID
  buscarFormaPorId: (id) => api.get(`/formas-pagamento/${id}`),
  
  // Buscar condição de pagamento por ID
  buscarCondicaoPorId: (id) => api.get(`/condicoes-pagamento/${id}`),
  
  // Calcular parcelas
  calcularParcelas: (condicao, total) => api.post('/calcular-parcelas', {
    condicao_pagamento: condicao,
    valor_total: total
  }),

  buscarTodos: async () => {
    return await api.get('/pagamentos');
  },

  buscarPorId: async (id) => {
    return await api.get(`/pagamentos/${id}`);
  }
};

// API específica para dados fiscais
export const fiscalAPI = {
  // Buscar dados fiscais de um produto
  buscarDadosProduto: async (codigo) => {
    try {
      debugLog(`[fiscalAPI] Buscando dados fiscais do produto: ${codigo}`);
      const response = await api.get(`/fiscal/produtos/dados-fiscais/${encodeURIComponent(codigo)}`);
      debugLog('Resposta completa da API fiscal:', response);
      
      // Verificar formato da resposta e extrair os dados corretamente
      if (response && response.data) {
        // Se já estiver no formato { success, data }
        if (response.data.success && response.data.data) {
          return {
            success: true,
            data: response.data.data
          };
        }
        // Se for apenas os dados diretos
        return {
          success: true,
          data: response.data
        };
      }
      
      return {
        success: false,
        data: null
      };
    } catch (error) {
      debugLog(`[fiscalAPI] Erro ao buscar dados fiscais do produto ${codigo}:`, error);
      throw error;
    }
  },
  
  // Buscar dados fiscais do produto com tratamento de erros (resiliente)
  buscarDadosFiscaisProdutoResiliente: async (codigo) => {
    try {
      debugLog(`[fiscalAPI] Buscando dados fiscais resilientes do produto: ${codigo}`);
      const response = await api.get(`/fiscal/produtos/dados-fiscais/${encodeURIComponent(codigo)}`);
      debugLog('Resposta completa da API fiscal resiliente:', response);
      
      // Verificar formato da resposta e extrair os dados corretamente
      let dadosFiscais = null;
      
      if (response && response.data) {
        // Se já estiver no formato { success, data }
        if (response.data.success && response.data.data) {
          dadosFiscais = response.data.data;
        } else {
          // Se for apenas os dados diretos
          dadosFiscais = response.data;
        }
        
        // Garantir que os valores numéricos estejam no formato correto
        if (dadosFiscais) {
          // Processar alíquota de IPI explicitamente
          if (dadosFiscais.aliq_ipi !== undefined) {
            const aliqIpi = parseFloat(dadosFiscais.aliq_ipi);
            dadosFiscais.aliq_ipi = isNaN(aliqIpi) ? 0 : aliqIpi;
            debugLog(`[fiscalAPI] Alíquota de IPI calculada: ${dadosFiscais.aliq_ipi}`);
          } else {
            dadosFiscais.aliq_ipi = 0;
            debugLog('[fiscalAPI] Alíquota de IPI não calculada, definida como 0');
          }
          
          // Processar alíquota de ICMS
          if (dadosFiscais.aliq_icms !== undefined) {
            const aliqIcms = parseFloat(dadosFiscais.aliq_icms);
            dadosFiscais.aliq_icms = isNaN(aliqIcms) ? 0 : aliqIcms;
          } else {
            dadosFiscais.aliq_icms = 0;
          }
          
          return {
            success: true,
            data: dadosFiscais
          };
        }
      }
      
      debugLog('[fiscalAPI] Sem dados fiscais válidos na resposta');
      return {
        success: false,
        data: null
      };
    } catch (error) {
      debugLog(`[fiscalAPI] Erro ao buscar dados fiscais resilientes do produto ${codigo}:`, error);
      
      // Em caso de erro, retornar um resultado vazio mas válido
      return {
        success: false,
        data: {
          class_fiscal: '',
          cod_regra_icms: '',
          cod_origem_prod: '0',
          st_icms: '',
          aliq_icms: 0,
          icms_st: 'N',
          aliq_ipi: 0,
          cest: '',
          iva: 0
        },
        error: error.message
      };
    }
  },
  
  // Calcular tributos com resiliência
  calcularTributosResiliente: async (dados) => {
    try {
      debugLog(`[fiscalAPI] Calculando tributos resilientes:`, dados);
      const response = await api.post('/fiscal/calcular-tributos', dados);
      
      debugLog('[fiscalAPI] Resposta do cálculo de tributos:', response?.data);
      
      let dadosTributos = null;
      
      if (response && response.data) {
        // Se já estiver no formato { success, data }
        if (response.data.success && response.data.data) {
          dadosTributos = response.data.data;
        } else {
          // Se for apenas os dados diretos
          dadosTributos = response.data;
        }
        
        // Garantir que os valores numéricos estejam no formato correto
        if (dadosTributos) {
          // Processar alíquota de IPI explicitamente
          if (dadosTributos.aliq_ipi !== undefined) {
            const aliqIpi = parseFloat(dadosTributos.aliq_ipi);
            dadosTributos.aliq_ipi = isNaN(aliqIpi) ? 0 : aliqIpi;
            debugLog(`[fiscalAPI] Alíquota de IPI calculada: ${dadosTributos.aliq_ipi}`);
          } else {
            dadosTributos.aliq_ipi = 0;
            debugLog('[fiscalAPI] Alíquota de IPI não calculada, definida como 0');
          }
          
          // Processar valor do IPI
          if (dadosTributos.valor_ipi !== undefined) {
            const valorIpi = parseFloat(dadosTributos.valor_ipi);
            dadosTributos.valor_ipi = isNaN(valorIpi) ? 0 : valorIpi;
          } else {
            // Se não existir valor de IPI, calcular com base na alíquota
            if (dados.valor_unitario && dados.quantidade) {
              const valorBase = parseFloat(dados.valor_unitario) * parseFloat(dados.quantidade);
              dadosTributos.valor_ipi = (valorBase * dadosTributos.aliq_ipi) / 100;
            } else {
              dadosTributos.valor_ipi = 0;
            }
          }
          
          // Processar alíquota e valor de ICMS
          if (dadosTributos.aliq_icms !== undefined) {
            const aliqIcms = parseFloat(dadosTributos.aliq_icms);
            dadosTributos.aliq_icms = isNaN(aliqIcms) ? 0 : aliqIcms;
          } else {
            dadosTributos.aliq_icms = 0;
          }
          
          if (dadosTributos.valor_icms !== undefined) {
            const valorIcms = parseFloat(dadosTributos.valor_icms);
            dadosTributos.valor_icms = isNaN(valorIcms) ? 0 : valorIcms;
          } else {
            // Se não existir valor de ICMS, calcular com base na alíquota
            if (dados.valor_unitario && dados.quantidade) {
              const valorBase = parseFloat(dados.valor_unitario) * parseFloat(dados.quantidade);
              dadosTributos.valor_icms = (valorBase * dadosTributos.aliq_icms) / 100;
            } else {
              dadosTributos.valor_icms = 0;
            }
          }
          
          // Processar valor do ICMS ST
          if (dadosTributos.valor_icms_st !== undefined) {
            const valorIcmsSt = parseFloat(dadosTributos.valor_icms_st);
            dadosTributos.valor_icms_st = isNaN(valorIcmsSt) ? 0 : valorIcmsSt;
          } else {
            dadosTributos.valor_icms_st = 0;
          }
          
          return {
            success: true,
            data: dadosTributos
          };
        }
      }
      
      debugLog('[fiscalAPI] Sem dados de tributos válidos na resposta');
      return {
        success: false,
        data: null
      };
    } catch (error) {
      debugLog(`[fiscalAPI] Erro ao calcular tributos resilientes:`, error);
      
      // Em caso de erro, retornar um resultado vazio mas válido
      return {
        success: false,
        data: {
          aliq_icms: dados.produto_codigo ? 18 : 0, // Valor padrão para ICMS em SP
          aliq_ipi: 0,
          valor_icms: 0,
          valor_ipi: 0,
          valor_icms_st: 0
        },
        error: error.message
      };
    }
  },
  
  // Buscar regras de ICMS
  buscarRegrasIcms: async (params) => {
    try {
      debugLog(`[fiscalAPI] Buscando regras ICMS com parâmetros:`, params);
      const response = await api.get(`/fiscal/regras-icms`, { params });
      
      // Processar a resposta para garantir formato consistente
      if (!Array.isArray(response.data)) {
        // Se recebemos um objeto único em vez de um array
        if (response.data) {
          return {
            success: true,
            data: [response.data] // Transformar em array
          };
        } else {
          // Se não recebemos dados
          return {
            success: false,
            data: []
          };
        }
      }
      
      // Se já é um array, apenas envolver na estrutura de resposta padrão
      if (Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data
        };
      }
      
      // Caso já esteja no formato {success, data} e data seja um objeto único
      if (response.data && response.data.data && !Array.isArray(response.data.data)) {
        return {
          success: response.data.success || true,
          data: [response.data.data]
        };
      }
      
      // Retornar a resposta original se já estiver no formato esperado
      return response.data;
    } catch (error) {
      debugLog(`[fiscalAPI] Erro ao buscar regras ICMS:`, error);
      throw error;
    }
  },
  
  // Buscar dados de classificação fiscal
  buscarClassificacaoFiscal: async (params) => {
    try {
      debugLog(`[fiscalAPI] Buscando dados de classificação fiscal:`, params);
      
      // Adicionar parâmetro para indicar se queremos incluir dados de tributações (CEST e IVA)
      let endpoint = '/fiscal/class-fiscal-dados';
      if (params.incluirTributacoes) {
        endpoint = '/fiscal/class-fiscal-dados-completos';
        debugLog(`[fiscalAPI] Usando endpoint de dados completos para incluir tributações (CEST e IVA)`);
      }
      
      const response = await api.get(endpoint, { params });
      
      // Processar os dados recebidos para garantir compatibilidade
      const dadosProcessados = response.data;
      
      // Adicionar campos padrão se não estiverem presentes
      if (dadosProcessados && !dadosProcessados.isOperacaoInterestadual) {
        dadosProcessados.isOperacaoInterestadual = 
          params.uf && params.ufEmpresa ? params.uf !== params.ufEmpresa : false;
      }
      
      return {
        success: true,
        data: dadosProcessados
      };
    } catch (error) {
      debugLog(`[fiscalAPI] Erro ao buscar dados de classificação fiscal:`, error);
      throw error;
    }
  },
  
  // Calcular tributos de um produto
  calcularTributos: async (dados) => {
    try {
      debugLog(`[fiscalAPI] Calculando tributos para:`, dados);
      const response = await api.post(`/fiscal/calcular-tributos`, dados);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      debugLog(`[fiscalAPI] Erro ao calcular tributos:`, error);
      throw error;
    }
  },
  
  // Buscar produtos com suas regras fiscais
  buscarProdutoComRegrasFiscais: async (codigo) => {
    try {
      debugLog(`[fiscalAPI] Buscando produto completo com regras fiscais: ${codigo}`);
      const response = await api.get(`/produtos/${encodeURIComponent(codigo)}/regras-fiscais`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      debugLog(`[fiscalAPI] Erro ao buscar produto com regras fiscais:`, error);
      throw error;
    }
  },
  
  // Sincronizar regras fiscais
  sincronizarRegrasFiscais: async () => {
    try {
      debugLog(`[fiscalAPI] Sincronizando regras fiscais`);
      const response = await api.post(`/sync/fiscal-data`, {}, {
        timeout: 120000 // Timeout de 2 minutos para sincronização fiscal
      });
      return response.data;
    } catch (error) {
      debugLog(`[fiscalAPI] Erro ao sincronizar regras fiscais:`, error);
      throw error;
    }
  },

  buscarDadosFiscaisProdutoERP: async (codigoProduto) => {
    debugLog('[fiscalAPI] Buscando dados fiscais do produto no ERP:', codigoProduto);
    return await api.get(`/fiscal/produto-erp/${codigoProduto}`);
  },

  buscarRegrasIcmsERP: async (params) => {
    debugLog('[fiscalAPI] Buscando regras ICMS com parâmetros no ERP:', params);
    return await api.get('/fiscal/regras-icms-erp', { params });
  },

  buscarClassificacaoFiscalERP: async (params) => {
    debugLog('[fiscalAPI] Buscando dados de classificação fiscal no ERP:', params);
    return await api.get('/fiscal/classificacao-fiscal-erp', { params });
  },

  verificarRegraIcms: async (codigo, uf) => {
    return await api.get(`/fiscal/verificar-regra-icms/${codigo}/${uf}`);
  },
  
  // Verificar se um produto tem Substituição Tributária para uma UF específica
  verificarSubstituicaoTributaria: async (codigoProduto, uf, tipoCliente) => {
    try {
      debugLog(`[fiscalAPI] Verificando ST para produto: ${codigoProduto}, UF: ${uf}, tipo cliente: ${tipoCliente}`);
      const response = await api.get(`/fiscal/verificar-st/${codigoProduto}/${uf}`, {
        params: { tipo_cliente: tipoCliente }
      });
      return response.data;
    } catch (error) {
      debugLog(`[fiscalAPI] Erro ao verificar ST para produto ${codigoProduto}:`, error);
      return {
        success: false,
        temST: false,
        error: error.message || 'Erro ao verificar substituição tributária'
      };
    }
  },
  
  // Calcular ICMS-ST com base nas regras fiscais
  calcularIcmsST: async (dados) => {
    try {
      // dados deve incluir: codigoProduto, ufDestino, valorProduto, valorIpi, tipoContribuinte, valorDesconto
      debugLog(`[fiscalAPI] Calculando ICMS-ST:`, dados);
      const response = await api.post('/fiscal/calcular-icms-st', dados);
      return response.data;
    } catch (error) {
      debugLog(`[fiscalAPI] Erro ao calcular ICMS-ST:`, error);
      return {
        success: false,
        valorICMSST: 0,
        valorFCPST: 0,
        error: error.message || 'Erro ao calcular ICMS Substituição Tributária'
      };
    }
  }
};

// Serviço para configurações
export const configurationAPI = {
  // Listar todas as configurações
  listAll: async () => {
    try {
      const response = await api.get('/configurations');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obter uma configuração específica
  getConfig: async (key) => {
    try {
      const response = await api.get(`/configurations/${key}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Atualizar uma configuração
  updateConfig: async (key, value) => {
    try {
      const response = await api.put(`/configurations/${key}`, { value });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obter configurações de validação de estoque
  getStockValidationSettings: async () => {
    try {
      const response = await api.get('/configurations/stock-validation/settings');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Atualizar configurações de validação de estoque
  updateStockValidationSettings: async (settings) => {
    try {
      const response = await api.put('/configurations/stock-validation/settings', settings);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obter configurações de funcionalidades de orçamentos
  getOrcamentoFeaturesSettings: async () => {
    try {
      const response = await api.get('/configurations/orcamento-features/settings');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Atualizar configurações de funcionalidades de orçamentos
  updateOrcamentoFeaturesSettings: async (settings) => {
    try {
      const response = await api.put('/configurations/orcamento-features/settings', settings);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export const notasFiscaisAPI = {
  // Buscar notas fiscais por pedido
  buscarPorPedido: (pedidoId) => api.get(`/notas-fiscais/pedido/${pedidoId}`),
  
  // Buscar nota fiscal por número
  buscarPorNumero: (numero) => api.get(`/notas-fiscais/${numero}`),
  
  // Buscar XML da nota fiscal
  buscarXmlPorNumero: (numero) => api.get(`/notas-fiscais/${numero}/xml`)
};

// Adicionando as APIs ao objeto principal para compatibilidade com código existente
api.produtos = produtosAPI;
api.clientes = clientesAPI;
api.vendedores = vendedoresAPI;
api.orcamentos = orcamentosAPI;
api.pagamentos = pagamentosAPI;
api.estados = estadosAPI;
api.fiscal = fiscalAPI;
api.notasFiscais = notasFiscaisAPI;

export default api; 