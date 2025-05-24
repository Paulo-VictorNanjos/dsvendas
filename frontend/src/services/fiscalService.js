import api, { fiscalAPI } from './api';
import axios from 'axios';

/**
 * Busca dados fiscais de um produto
 * @param {string} codigoProduto 
 * @returns 
 */
export const buscarDadosFiscaisProduto = async (codigoProduto) => {
  console.log('Buscando dados fiscais para produto:', codigoProduto);
  
  try {
    // Tentar buscar direto do ERP primeiro
    console.log('Tentando via fiscalAPI...');
    const response = await fiscalAPI.buscarDadosProduto(codigoProduto);
    console.log('Resposta completa da API fiscal:', response);
    
    // Extrair dados fiscais conforme formato da resposta
    let dadosFiscais = null;
    
    if (response && response.success && response.data) {
      // Resposta no formato { success: true, data: {...} }
      dadosFiscais = response.data;
    } else if (response && response.data) {
      // Resposta pode estar no formato { data: { success: true, data: {...} } }
      if (response.data.success && response.data.data) {
        dadosFiscais = response.data.data;
      } else {
        // Ou no formato { data: {...} }
        dadosFiscais = response.data;
      }
    }
    
    console.log('Dados fiscais extraídos:', dadosFiscais);
    return dadosFiscais;
  } catch (error) {
    console.error('Erro ao buscar dados fiscais:', error);
    return null;
  }
};

/**
 * Busca regras ICMS para um determinado código e UF
 * @param {string} codRegra - Código da regra ICMS
 * @param {string} ufCliente - UF do cliente
 * @param {number} tipoCliente - Tipo de cliente (0=consumidor, 1=contribuinte)
 * @param {string} ufEmpresa - UF da empresa
 * @param {number} codRegime - Código do regime tributário
 * @returns {Promise<Array>} Array de regras ICMS
 */
export const buscarRegrasIcms = async (codRegra, ufCliente, tipoCliente, ufEmpresa, codRegime) => {
  try {
    const params = { 
      codigo: codRegra, 
      uf: ufCliente, 
      tipo: tipoCliente,
      ufEmpresa: ufEmpresa || 'SP',
      codRegime: codRegime || 3
    };
    
    console.log('Buscando regras ICMS com parâmetros:', params);
    
    // Primeiro tenta buscar diretamente do ERP
    try {
      console.log('Tentando buscar direto do ERP...');
      const response = await fiscalAPI.buscarRegrasIcmsERP(params);
      console.log('Resposta completa ERP:', response);
      
      // Processar resposta do ERP
      let regrasFiscais = null;
      
      if (response && response.data) {
        // Formatos possíveis de resposta
        if (Array.isArray(response.data)) {
          // Se já for um array, usar diretamente
          regrasFiscais = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // Se estiver no formato { data: [...] }
          regrasFiscais = response.data.data;
        } else {
          // Se for um objeto único, transformar em array
          regrasFiscais = [response.data];
        }
        
        if (regrasFiscais && regrasFiscais.length > 0) {
          console.log('Regras ICMS encontradas no ERP:', regrasFiscais);
          return regrasFiscais;
        }
      }
      
      // Se chegou aqui, não encontrou ou formato incorreto, tenta pela API normal
    } catch (error) {
      console.error('Erro ao buscar regras ICMS do ERP:', error);
    }
    
    // Tentar pela API normal
    console.log('Buscando via API padrão...');
    const responseApi = await fiscalAPI.buscarRegrasIcms(params);
    console.log('Resposta completa API padrão:', responseApi);
    
    // Processar resposta da API padrão
    let regrasFiscais = null;
    
    if (responseApi && responseApi.success && responseApi.data) {
      // Se estiver no formato { success: true, data: [...] }
      regrasFiscais = Array.isArray(responseApi.data) ? responseApi.data : [responseApi.data];
    } else if (responseApi && responseApi.data) {
      // Se estiver no formato { data: [...] } ou { data: { ... } }
      if (Array.isArray(responseApi.data)) {
        regrasFiscais = responseApi.data;
      } else if (responseApi.data.data) {
        // Formato { data: { data: [...] } }
        regrasFiscais = Array.isArray(responseApi.data.data) ? responseApi.data.data : [responseApi.data.data];
      } else {
        // Objeto único
        regrasFiscais = [responseApi.data];
      }
    }
    
    if (regrasFiscais && regrasFiscais.length > 0) {
      console.log('Regras ICMS encontradas na API padrão:', regrasFiscais);
      return regrasFiscais;
    }
    
    // Se chegou aqui, não encontrou nada
    console.warn('Nenhuma regra ICMS encontrada para os parâmetros:', params);
    return [];
  } catch (error) {
    console.error('Erro geral ao buscar regras ICMS:', error);
    return [];
  }
};

/**
 * Busca dados de classificação fiscal para um NCM em uma determinada UF
 * @param {string} ncm - Código NCM
 * @param {string} uf - UF do cliente
 * @param {string} ufEmpresa - UF da empresa
 * @returns {Promise<Object>} Dados de classificação fiscal
 */
export const buscarClassificacaoFiscal = async (ncm, uf, ufEmpresa) => {
  try {
    const params = { 
      ncm, 
      uf, 
      ufEmpresa: ufEmpresa || 'SP' 
    };
    
    console.log('Buscando classificação fiscal com parâmetros:', params);
    
    // Primeiro tenta buscar direto do ERP
    try {
      console.log('Tentando buscar classificação fiscal direto do ERP...');
      const response = await fiscalAPI.buscarClassificacaoFiscalERP(params);
      console.log('Resposta completa ERP (classificação fiscal):', response);
      
      // Processar resposta do ERP
      if (response && response.data) {
        // Normalizar os dados
        const dadosProcessados = {
          ...response.data,
          isOperacaoInterestadual: uf !== (ufEmpresa || 'SP')
        };
        
        console.log('Dados de classificação fiscal obtidos do ERP:', dadosProcessados);
        
        return {
          success: true,
          data: dadosProcessados
        };
      }
    } catch (error) {
      console.error('Erro ao buscar classificação fiscal do ERP:', error);
    }
    
    // Se não conseguiu do ERP, usa a API normal
    console.log('Buscando classificação fiscal via API padrão...');
    
    // Adicionar parâmetro para indicar que queremos também os dados de tributações (CEST e IVA)
    const paramsCompletos = { 
      ...params,
      incluirTributacoes: true 
    };
    
    const response = await fiscalAPI.buscarClassificacaoFiscal(paramsCompletos);
    console.log('Resposta completa API padrão (classificação fiscal):', response);
    
    // Processar resposta da API padrão
    let dadosProcessados = null;
    
    if (response && response.success && response.data) {
      // Se já estiver no formato { success: true, data: {...} }
      dadosProcessados = response.data;
    } else if (response && response.data) {
      // Se estiver no formato { data: {...} }
      if (response.data.data) {
        // Formato { data: { data: {...} } }
        dadosProcessados = response.data.data;
      } else {
        // Dados diretos
        dadosProcessados = response.data;
      }
    }
    
    // Garantir que tenha a flag de operação interestadual
    if (dadosProcessados) {
      dadosProcessados.isOperacaoInterestadual = uf !== (ufEmpresa || 'SP');
    } else {
      // Dados padrão caso não tenha encontrado
      dadosProcessados = {
        iva: 0,
        aliq_interna: 18,
        iva_importado: 0,
        aliq_importado: 0,
        aliq_fcpst: 0,
        cest: '',
        isOperacaoInterestadual: uf !== (ufEmpresa || 'SP')
      };
    }
    
    console.log('Dados de classificação fiscal processados:', dadosProcessados);
    
    return {
      success: true,
      data: dadosProcessados
    };
  } catch (error) {
    console.error('Erro ao buscar classificação fiscal:', error);
    // Retornar dados padrão em caso de erro
    return {
      success: false,
      data: {
        iva: 0,
        aliq_interna: 18,
        iva_importado: 0,
        aliq_importado: 0,
        aliq_fcpst: 0,
        cest: '',
        isOperacaoInterestadual: uf !== (ufEmpresa || 'SP')
      }
    };
  }
};

/**
 * Função de diagnóstico para verificar se os dados fiscais estão corretos
 * @param {Object} produto 
 * @param {Object} cliente 
 * @param {string} ufEmpresa 
 * @returns {Object} Objeto com informações de diagnóstico
 */
export const diagnosticarCalculoTributos = async (produto, cliente, ufEmpresa) => {
  console.log('=== DIAGNÓSTICO TRIBUTÁRIO ===');
  console.log('Dados do Produto:', produto);
  console.log('Dados do Cliente:', cliente);
  
  try {
    // 1. Verificar dados fiscais do produto
    const dadosFiscais = await buscarDadosFiscaisProduto(produto.codigo);
    console.log('Dados Fiscais do Produto:', dadosFiscais);
    
    if (!dadosFiscais) {
      return {
        success: false,
        message: 'Dados fiscais do produto não encontrados',
      };
    }
    
    // 2. Verificar regras ICMS
    const regrasIcms = await diagnosticarRegrasIcms(dadosFiscais.cod_regra_icms, cliente.uf, cliente.tipo || 0, ufEmpresa);
    console.log('Regras ICMS:', regrasIcms);
    
    // 3. Verificar se tem Substituição Tributária
    let temSubstituicaoTributaria = false;
    let cstContribuinte = '';
    let cstConsumidor = '';
    
    if (regrasIcms && regrasIcms.length > 0) {
      const regra = regrasIcms[0];
      
      if (regra.icms_st === 'S') {
        temSubstituicaoTributaria = true;
      }
      
      cstContribuinte = regra.st_icms_contr;
      cstConsumidor = regra.st_icms;
    }
    
    console.log('ICMS-ST definido?', temSubstituicaoTributaria ? 'SIM' : 'NÃO');
    console.log('CST para contribuinte:', cstContribuinte);
    console.log('CST para consumidor:', cstConsumidor);
    
    // 4. Verificar classificação fiscal
    const classFiscal = await buscarClassificacaoFiscal(
      dadosFiscais.class_fiscal,
      cliente.uf,
      ufEmpresa
    );
    
    console.log('Classificação Fiscal:', classFiscal);
    
    // 5. Verificar IVA e alíquota interna
    let temIVA = false;
    let temAliqInterna = false;
    
    if (classFiscal && classFiscal.data) {
      temIVA = parseFloat(classFiscal.data.iva || 0) > 0;
      temAliqInterna = parseFloat(classFiscal.data.aliq_interna || 0) > 0;
    }
    
    console.log('IVA definido?', temIVA ? 'SIM' : 'NÃO');
    console.log('Alíquota Interna definida?', temAliqInterna ? 'SIM' : 'NÃO');
    
    // 6. Verificar IPI
    const aliqIpi = parseFloat(dadosFiscais.aliq_ipi || 0);
    console.log('Alíquota IPI do produto:', dadosFiscais.aliq_ipi);
    
    return {
      success: true,
      temDadosFiscais: !!dadosFiscais,
      temRegrasIcms: regrasIcms && regrasIcms.length > 0,
      temSubstituicaoTributaria,
      temIVA,
      temAliqInterna,
      temIPI: aliqIpi > 0,
      isOperacaoInterestadual: cliente.uf !== ufEmpresa
    };
  } catch (error) {
    console.error('Erro no diagnóstico tributário:', error);
    return {
      success: false,
      message: `Erro no diagnóstico: ${error.message}`
    };
  }
};

/**
 * Função de diagnóstico específica para regras ICMS
 */
export const diagnosticarRegrasIcms = async (codRegra, ufCliente, tipoCliente, ufEmpresa) => {
  try {
    const params = { 
        codigo: codRegra, 
        uf: ufCliente, 
        tipo: tipoCliente,
        ufEmpresa,
      codRegime: 3
    };
    
    // Primeiro tentar buscar direto do ERP
    try {
      const response = await fiscalAPI.buscarRegrasIcmsERP(params);
      if (response && response.data && Array.isArray(response.data)) {
        return response.data;
      }
    } catch (error) {
      console.error('Erro ao diagnosticar regras ICMS do ERP:', error);
    }
    
    // Fallback para API padrão
    const response = await fiscalAPI.buscarRegrasIcms(params);
    
    const resultado = response.data;
    return Array.isArray(resultado) ? resultado : [resultado];
  } catch (error) {
    console.error('Erro ao diagnosticar regras ICMS:', error);
    return [];
  }
};

export const buscarDadosClassFiscal = async (ncm, ufCliente, ufEmpresa) => {
  try {
    const params = { 
        ncm, 
        uf: ufCliente,
        ufEmpresa
    };
    
    console.log('Buscando dados da classificação fiscal:', params);
    
    // Primeiro tenta usar o endpoint específico de fiscal
    try {
      console.log('Tentando via fiscalAPI...');
      const response = await fiscalAPI.buscarDadosClassFiscal(params);
      console.log('Dados da classificação fiscal recebidos (fiscal API):', response.data);
      
      // Verificar se os dados estão realmente presentes
      if (!response.data) {
        throw new Error('Dados de classificação fiscal vazios ou incompletos');
      }
      
      return response.data;
    } catch (fiscalError) {
      console.warn('Falha ao buscar via fiscal API, tentando endpoint legado:', fiscalError);
      
      // Se falhar, tenta o endpoint legado
      console.log('Tentando via API legada...');
      const response = await api.get(`/class-fiscal-dados`, { params });
      console.log('Dados da classificação fiscal recebidos (endpoint legado):', response.data);
      
    return response.data;
    }
  } catch (error) {
    console.error('Erro ao buscar dados da classificação fiscal:', error);
    console.error('Dados padrão serão utilizados');
    
    // Retornar dados padrão em caso de erro (atualizado para corresponder aos campos existentes)
    return {
      success: true,
      data: {
      codigo: 1,
      cod_ncm: ncm || '00000000',
      descricao: 'CLASSIFICAÇÃO PADRÃO',
      uf: ufCliente || 'SP',
      aliq_fcp: 0,
      aliq_fcpst: 0,
      aliq_pst: 0,
      iva: 0,
      aliq_interna: 18,
      iva_diferenciado: 0,
      cest: '',
      iva_importado: 0,
        aliq_importado: 0,
        isOperacaoInterestadual: ufCliente !== ufEmpresa
      }
    };
  }
};

/**
 * Calcula tributos para um item de orçamento
 * Segue a mesma lógica do método CalculaTributos no arquivo tributos.java
 * @param {Object} params 
 * @param {Object} params.produto - Dados do produto
 * @param {number} params.quantidade - Quantidade
 * @param {Object} params.cliente - Dados do cliente
 * @param {string} params.ufEmpresa - UF da empresa
 * @returns {Object} Objeto com os valores calculados
 */
export const calcularTributosItem = async ({
  produto,
  quantidade,
  cliente,
  ufEmpresa
}) => {
  try {
    // Inicialização de variáveis
    let baseIcms = 0;
    let valorIcms = 0;
    let aliqIcms = 0;
    let redIcms = 0;
    let baseIcmsSt = 0;
    let valorIcmsSt = 0;
    let valorIpi = 0;
    let valorFcpSt = 0;
    let cst = '00';
    
    // Validação de parâmetros
    if (!produto || !quantidade || !cliente) {
      console.error('Parâmetros inválidos para cálculo de tributos');
      return { baseIcms, valorIcms, aliqIcms, redIcms, baseIcmsSt, valorIcmsSt, valorIpi, valorFcpSt, cst };
    }
    
    // 1. Buscar dados fiscais do produto
    let valorUnitario = parseFloat(produto.preco_venda || produto.valor_unitario || 0);
    let valorTotal = valorUnitario * parseInt(quantidade);
    
    console.log(`Calculando tributos para produto ${produto.codigo}, quantidade ${quantidade}, valor unitário ${valorUnitario}`);
    
    // Determinar o tipo de cliente (Contribuinte=1, Não Contribuinte=0)
    const tipoCliente = determinarContribuinteCliente(cliente) ? 1 : 0;
    
    // 2. Buscar dados fiscais do produto
    const dadosFiscaisProduto = await buscarDadosFiscaisProduto(produto.codigo);
    
    if (!dadosFiscaisProduto || !dadosFiscaisProduto.success) {
      console.error('Não foi possível obter dados fiscais do produto');
      return { baseIcms, valorIcms, aliqIcms, redIcms, baseIcmsSt, valorIcmsSt, valorIpi, valorFcpSt, cst };
    }
    
    const dadosFiscais = dadosFiscaisProduto.data;
    console.log('Dados fiscais do produto:', dadosFiscais);
    
    // 3. Buscar regras de ICMS
    const regrasIcms = await buscarRegrasIcms(
      dadosFiscais.cod_regra_icms,
      cliente.uf,
      tipoCliente,
      ufEmpresa || 'SP',
      cliente.cod_regime || 3
    );
    
    if (!regrasIcms || !Array.isArray(regrasIcms) || regrasIcms.length === 0) {
      console.error('Regras ICMS não encontradas');
      return {
        baseIcms,
        valorIcms,
        aliqIcms,
        redIcms,
        baseIcmsSt,
        valorIcmsSt,
        valorIpi,
        valorFcpSt,
        cst
      };
    }
    
    console.log('Regras ICMS encontradas:', regrasIcms);
    
    const regraIcms = regrasIcms[0];
    
    // 4. Determinar CST e valores de ICMS com base no tipo de cliente
    let calcIcmsSt = false;
    let subsTrib = 'N';
    
    if (tipoCliente === 1) { // Contribuinte
      cst = regraIcms.st_icms_contr || '';
      aliqIcms = parseFloat(regraIcms.aliq_icms_contr || 0);
      redIcms = parseFloat(regraIcms.red_icms_contr || 0);
      
      // Verificar se há substituição tributária
      if (regraIcms.icms_st === 'S') {
        calcIcmsSt = true;
      }
      
      if (cst === '201' || cst === '500' || cst === '202' ||
          cst === '60' || cst === '10' || cst === '30' || cst === '70') {
        subsTrib = 'S';
      }
    } else { // Consumidor
      cst = regraIcms.st_icms || '';
      aliqIcms = parseFloat(regraIcms.aliq_icms || 0);
      redIcms = parseFloat(regraIcms.red_icms || 0);
      
      if (cst === '201' || cst === '500' || cst === '202' ||
          cst === '60' || cst === '10' || cst === '30' || cst === '70') {
        subsTrib = 'S';
      }
    }
    
    console.log('CST determinado:', cst);
    console.log('Alíquota ICMS:', aliqIcms);
    console.log('Redução ICMS:', redIcms);
    console.log('Substituição Tributária:', subsTrib);
    
    // Verificar se o produto é importado e aplicar alíquota especial se configurada
    // Isso deve ser feito antes do cálculo do ICMS básico
    const codOrigem = dadosFiscais.cod_origem_prod || '0';
    const isImportado = codOrigem !== '0';
    
    if (isImportado) {
      console.log(`[IMPORTANTE] Produto importado detectado (origem: ${codOrigem})`);
      
      // Buscar dados de classificação fiscal para o NCM
      const classFiscalResponse = await buscarClassificacaoFiscal(
        dadosFiscais.class_fiscal,
        cliente.uf,
        ufEmpresa || 'SP'
      );
      
      // Extrair os dados corretamente
      let dadosNCM = null;
      if (classFiscalResponse && classFiscalResponse.success) {
        dadosNCM = classFiscalResponse.data;
      } else if (classFiscalResponse && classFiscalResponse.data) {
        dadosNCM = classFiscalResponse.data;
      }
      
      if (dadosNCM) {
        const aliqImportado = parseFloat(dadosNCM.aliq_importado || 0);
        
        if (aliqImportado > 0) {
          console.log(`Ajustando alíquota ICMS para produto importado: ${aliqImportado}% (anterior: ${aliqIcms}%)`);
          aliqIcms = aliqImportado;
        } else {
          console.log('Produto importado sem alíquota específica configurada, mantendo alíquota padrão');
        }
      }
    }
    
    // 5. Calcular base e valor do ICMS
    baseIcms = valorTotal * (1 - (redIcms / 100));
    valorIcms = baseIcms * (aliqIcms / 100);
    
    console.log('Base ICMS calculada:', baseIcms);
    console.log('Valor ICMS calculado:', valorIcms);
    
    // 6. Calcular ICMS-ST se aplicável
    // CORREÇÃO: Verificar explicitamente se o campo icms_st é 'S' ou se o CST indica ST
    const cstsComST = ['10', '30', '60', '70', '201', '202', '203'];
    const temSTporCST = cstsComST.includes(cst);
    const temSTporFlag = regraIcms?.icms_st === 'S' || dadosFiscais?.icms_st === 'S';
    
    // Verificar se deve fazer o cálculo de ST - só fazer se tem ST explicito na flag ou CST
    const deveCalcularST = temSTporCST || temSTporFlag;
    
    // Verificar se o produto é um caso especial que precisa de ST
    const produtosEspeciaisComST = ['26/A', '60/B', '99/C']; // Exemplos fictícios 
    const temSTporProdutoEspecial = produtosEspeciaisComST.includes(produto.codigo);
    
    const deveCalcularSTFinal = deveCalcularST || temSTporProdutoEspecial;
    
    console.log(`Verificação ST para produto ${produto.codigo}:
      icms_st='${dadosFiscais?.icms_st || 'N'}', 
      cst='${cst}', 
      temSTporCST=${temSTporCST}, 
      temSTporFlag=${temSTporFlag}, 
      temSTporProdutoEspecial=${temSTporProdutoEspecial}, 
      deveCalcularST=${deveCalcularSTFinal}`);
    
    if (!deveCalcularSTFinal) {
      console.log(`Produto ${produto.codigo} não tem icms_st='S' nem CST que indique ST (CST=${cst}). Não calculando ST.`);
      // Definir valores zero para ICMS-ST
      baseIcmsSt = 0;
      valorIcmsSt = 0;
      valorFcpSt = 0;
      
      // Retornar sem fazer cálculo
      return {
        baseIcms,
        valorIcms,
        aliqIcms,
        redIcms,
        baseIcmsSt: 0,
        valorIcmsSt: 0,
        valorIpi,
        valorFcpSt: 0,
        cst
      };
    }
    
    // Buscar dados de classificação fiscal para o NCM
    const classFiscalResponse = await buscarClassificacaoFiscal(
      dadosFiscais.class_fiscal,
      cliente.uf,
      ufEmpresa || 'SP'
    );
    
    console.log('Resposta da classificação fiscal:', classFiscalResponse);
    
    // Extrair os dados corretamente
    let dadosNCM = null;
    if (classFiscalResponse && classFiscalResponse.success) {
      dadosNCM = classFiscalResponse.data;
    } else if (classFiscalResponse && classFiscalResponse.data) {
      dadosNCM = classFiscalResponse.data;
    }
    
    if (dadosNCM) {
      console.log('Dados NCM encontrados:', dadosNCM);
      
      // Inicializar com valores do NCM
      let iva = parseFloat(dadosNCM.iva || 0);
      let aliqInterna = parseFloat(dadosNCM.aliq_interna || 0);
      const aliqFcpSt = parseFloat(dadosNCM.aliq_fcpst || 0);
      
      // Verificar se tem valores para produtos importados
      const codOrigem = dadosFiscais.cod_origem_prod || '0';
      const ivaImportado = parseFloat(dadosNCM.iva_importado || 0);
      const aliqImportado = parseFloat(dadosNCM.aliq_importado || 0);
      
      console.log('Dados para cálculo:', {
        iva, aliqInterna, aliqFcpSt, codOrigem, ivaImportado, aliqImportado
      });
      
      // Se tem IVA e alíquota interna definidos, forçar o cálculo de ST
      // mesmo que o produto não tenha sido marcado com ST nas regras
      if (iva > 0 && aliqInterna > 0) {
        console.log(`Forçando cálculo de ST para o produto ${produto.codigo} na UF ${cliente.uf} pois tem IVA (${iva}%) e alíquota interna (${aliqInterna}%) definidos.`);
        calcIcmsSt = true;
      }
      
      // Aplicar regras para produto importado (qualquer origem que não seja 0)
      if (isImportado) {
        if (ivaImportado > 0) {
          console.log(`Aplicando IVA específico para importados: ${ivaImportado}%`);
          iva = ivaImportado;
        } else {
          console.log('Produto importado sem IVA específico configurado, usando IVA padrão');
        }
        
        if (aliqImportado > 0) {
          console.log(`Aplicando alíquota interna específica para importados: ${aliqImportado}%`);
          aliqInterna = aliqImportado;
          
          // A alíquota de ICMS já deve ter sido atualizada na etapa anterior
          console.log(`Verificando se a alíquota ICMS está consistente com o valor para importados: ${aliqIcms}% == ${aliqImportado}%`);
          if (aliqIcms !== aliqImportado) {
            console.warn(`Inconsistência detectada! Alíquota ICMS (${aliqIcms}%) diferente da alíquota para importados (${aliqImportado}%), ajustando...`);
            aliqIcms = aliqImportado;
            // Recalcular o ICMS básico com a alíquota correta
            valorIcms = baseIcms * (aliqIcms / 100);
            console.log('Valor ICMS recalculado:', valorIcms);
          }
        }
      }
      
      // Se não tem alíquota interna definida, verificar se existe no regraIcms
      if (aliqInterna === 0) {
        if (regraIcms.aliq_interna && parseFloat(regraIcms.aliq_interna) > 0) {
          aliqInterna = parseFloat(regraIcms.aliq_interna);
          console.log(`Usando alíquota interna da regra ICMS: ${aliqInterna}%`);
        } else {
          // Se não existe na regra ICMS, usar alíquota da UF do cliente
          aliqInterna = cliente.uf === (ufEmpresa || 'SP') ? aliqIcms : 18;
          console.log(`Usando alíquota base para UF ${cliente.uf}: ${aliqInterna}%`);
        }
      }
      
      console.log('Valores finais para cálculo ICMS-ST:', { iva, aliqInterna });
      
      // Log detalhado dos valores usados no cálculo
      console.log('DETALHES DO CÁLCULO ICMS-ST:');
      console.log(`Valor base: ${baseIcms.toFixed(2)}`);
      console.log(`Valor IPI: ${valorIpi.toFixed(2)}`);
      console.log(`Soma (base + IPI): ${(baseIcms + valorIpi).toFixed(2)}`);
      console.log(`IVA: ${iva.toFixed(2)}%`);
      console.log(`Multiplicador IVA: ${(1 + (iva / 100)).toFixed(4)}`);
      
      // Calcular base do ICMS-ST (CORREÇÃO: Fórmula correta)
      baseIcmsSt = (baseIcms + valorIpi) * (1 + (iva / 100));
      console.log(`Base ICMS-ST calculada: ${baseIcmsSt.toFixed(2)}`);
      
      // Calcular valor do ICMS-ST
      const icmsStBruto = baseIcmsSt * (aliqInterna / 100);
      const icmsProprio = baseIcms * (aliqIcms / 100);
      console.log(`ICMS-ST bruto (${aliqInterna}% da base ST): ${icmsStBruto.toFixed(2)}`);
      console.log(`ICMS próprio (${aliqIcms}% da base): ${icmsProprio.toFixed(2)}`);
      
      valorIcmsSt = icmsStBruto - icmsProprio;
      
      // Se der valor negativo, zera
      if (valorIcmsSt < 0) {
        valorIcmsSt = 0;
      }
      
      // Calcular FCP-ST se aplicável
      if (aliqFcpSt > 0) {
        valorFcpSt = baseIcmsSt * (aliqFcpSt / 100);
      }
      
      console.log('Resultados ICMS-ST:', {
        baseIcmsSt, valorIcmsSt, valorFcpSt
      });
    } else {
      console.warn('Dados NCM não encontrados para o cálculo de ICMS-ST');
    }
    
    // Formatar valores para 2 casas decimais
    baseIcms = parseFloat(baseIcms.toFixed(2));
    valorIcms = parseFloat(valorIcms.toFixed(2));
    baseIcmsSt = parseFloat(baseIcmsSt.toFixed(2));
    valorIcmsSt = parseFloat(valorIcmsSt.toFixed(2));
    valorIpi = parseFloat(valorIpi.toFixed(2));
    valorFcpSt = parseFloat(valorFcpSt.toFixed(2));
    
    console.log('=== RESULTADO FINAL DO CÁLCULO ===');
    console.log('Base ICMS:', baseIcms);
    console.log('Valor ICMS:', valorIcms);
    console.log('Alíquota ICMS:', aliqIcms);
    console.log('Base ICMS-ST:', baseIcmsSt);
    console.log('Valor ICMS-ST:', valorIcmsSt);
    console.log('Valor IPI:', valorIpi);
    console.log('Valor FCP-ST:', valorFcpSt);
    
    // Log especial para produtos importados
    if (isImportado) {
      console.log('=== RESUMO PARA PRODUTO IMPORTADO ===');
      console.log(`Código de origem: ${dadosFiscais.cod_origem_prod}`);
      console.log(`Alíquota ICMS aplicada: ${aliqIcms}% (esperado: 25% para SP)`);
      console.log(`Valor ICMS: ${valorIcms}`);
      console.log('=====================================');
    }
    
    return {
      baseIcms,
      valorIcms,
      aliqIcms,
      redIcms,
      baseIcmsSt,
      valorIcmsSt,
      valorIpi,
      valorFcpSt,
      cst
    };
  } catch (error) {
    console.error('Erro no cálculo de tributos:', error);
    return {
      baseIcms: 0,
      valorIcms: 0,
      aliqIcms: 0,
      redIcms: 0,
      baseIcmsSt: 0,
      valorIcmsSt: 0,
      valorIpi: 0,
      valorFcpSt: 0,
      cst: '00'
    };
  }
};

// Função auxiliar para determinar o percentual de partilha do ICMS
function getPercentualPartilha(ano) {
  if (ano <= 2015) return 20;
  if (ano === 2016) return 40;
  if (ano === 2017) return 60;
  if (ano === 2018) return 80;
  return 100; // 2019 em diante
}

/**
 * Determina se um cliente é contribuinte baseado em seus dados
 * @param {Object} cliente - Dados do cliente
 * @returns {boolean} - true se for contribuinte, false caso contrário
 */
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

/**
 * Consulta e gera PDF da NF-e utilizando o serviço Meu Danfe
 * @param {string} xmlNFe - XML da NF-e
 * @returns {Promise<{success: boolean, data: {pdf: string}}>} Objeto contendo o PDF em base64
 */
export const consultarDanfeAPI = async (xmlNFe) => {
  try {
    if (!xmlNFe) {
      console.error('XML da NF-e não fornecido');
      return {
        success: false,
        error: 'XML da NF-e não fornecido'
      };
    }

    console.log('Consultando serviço Meu Danfe para gerar DANFE');
    
    // URL da API Meu Danfe
    const url = 'https://ws.meudanfe.com/api/v1/get/nfe/xmltodanfepdf/API';
    
    // Configuração da requisição
    const config = {
      headers: {
        'Content-Type': 'text/xml'
      }
    };
    
    // Fazer a requisição POST enviando o XML no corpo
    const response = await axios.post(url, xmlNFe, config);
    
    // Verificar se a resposta contém o PDF em base64
    if (response && response.data) {
      console.log('PDF do DANFE gerado com sucesso');
      return {
        success: true,
        data: {
          pdf: response.data // PDF em base64
        }
      };
    } else {
      throw new Error('Resposta inválida do serviço Meu Danfe');
    }
  } catch (error) {
    console.error('Erro ao consultar serviço Meu Danfe:', error);
    return {
      success: false,
      error: error.message || 'Erro ao consultar serviço Meu Danfe'
    };
  }
}; 