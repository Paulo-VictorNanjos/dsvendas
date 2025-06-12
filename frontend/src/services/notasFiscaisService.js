import api, { notasFiscaisAPI } from './api';
import axios from 'axios';

/**
 * Busca notas fiscais por pedido
 * @param {string|number} pedidoId - ID do pedido
 * @returns {Promise<Array>} - Lista de notas fiscais
 */
export const buscarNotasFiscaisPorPedido = async (pedidoId) => {
  try {
    console.log(`[notasFiscaisService] Buscando notas fiscais para o pedido ${pedidoId}`);
    const response = await notasFiscaisAPI.buscarPorPedido(pedidoId);
    
    if (response.data && response.data.success && response.data.data && response.data.data.notasFiscais) {
      console.log(`[notasFiscaisService] Encontradas ${response.data.data.notasFiscais.length} notas`);
      return {
        success: true,
        notasFiscais: response.data.data.notasFiscais
      };
    }
    
    // Se chegou aqui, a resposta não tem o formato esperado
    console.warn('[notasFiscaisService] Resposta da API não contém notasFiscais:', response.data);
    return {
      success: false,
      notasFiscais: [],
      message: response.data?.message || 'Nenhuma nota fiscal encontrada'
    };
  } catch (error) {
    console.error(`[notasFiscaisService] Erro ao buscar notas fiscais do pedido ${pedidoId}:`, error);
    
    // Extrair detalhes do erro para logging e depuração
    const statusCode = error.response?.status;
    const errorMessage = error.response?.data?.message || error.message;
    const errorDetails = error.response?.data?.error;
    
    console.error(`[notasFiscaisService] Detalhes do erro: Status ${statusCode}, Mensagem: ${errorMessage}`);
    if (errorDetails) console.error(`[notasFiscaisService] Detalhes adicionais:`, errorDetails);
    
    return {
      success: false,
      notasFiscais: [],
      error: errorMessage,
      statusCode: statusCode
    };
  }
};

/**
 * Busca XML da nota fiscal pelo número
 * @param {string|number} numeroNF - Número da nota fiscal
 * @returns {Promise<string>} - XML da nota fiscal
 */
export const buscarXmlPorNumero = async (numeroNF) => {
  try {
    console.log(`[notasFiscaisService] Buscando XML da NF ${numeroNF}`);
    const response = await notasFiscaisAPI.buscarXmlPorNumero(numeroNF);
    
    // Verificar o tipo de resposta recebida
    if (response.data && response.data.success) {
      const responseData = response.data.data;
      
      // Caso 1: Temos o XML
      if (responseData.xml) {
        console.log('[notasFiscaisService] XML encontrado com sucesso');
        return {
          success: true,
          xml: responseData.xml
        };
      }
      
      // Caso 2: Não temos o XML, mas temos a chave NFe
      if (responseData.chave_nfe) {
        console.log(`[notasFiscaisService] XML não encontrado, mas chave NFe está disponível: ${responseData.chave_nfe}`);
        return {
          success: true,
          chaveNFe: responseData.chave_nfe,
          useChaveOnly: true,
          message: 'XML não disponível, usando chave NFe diretamente'
        };
      }
    }
    
    return {
      success: false,
      xml: null,
      message: 'XML e chave NFe não encontrados'
    };
  } catch (error) {
    console.error(`[notasFiscaisService] Erro ao buscar XML da NF ${numeroNF}:`, error);
    
    // Tentar obter mais informações do erro para debug
    const statusCode = error.response?.status;
    const errorMessage = error.response?.data?.message || error.message;
    
    // Tentativa alternativa: buscar informações da nota fiscal para obter a chave
    if (statusCode === 404) {
      console.log('[notasFiscaisService] XML não encontrado (404), tentando buscar informações da nota para obter a chave NFe');
      try {
        const infoResponse = await notasFiscaisAPI.buscarPorNumero(numeroNF);
        
        if (infoResponse.data && infoResponse.data.success && infoResponse.data.data && 
            infoResponse.data.data.notaFiscal && infoResponse.data.data.notaFiscal.chave_nfe) {
          
          const chaveNFe = infoResponse.data.data.notaFiscal.chave_nfe;
          console.log(`[notasFiscaisService] Chave NFe encontrada em busca alternativa: ${chaveNFe}`);
          
          return {
            success: true,
            chaveNFe: chaveNFe,
            useChaveOnly: true,
            message: 'XML não disponível, usando chave NFe obtida em busca alternativa'
          };
        }
      } catch (infoError) {
        console.error('[notasFiscaisService] Erro na busca alternativa:', infoError);
      }
    }
    
    return {
      success: false,
      xml: null,
      error: errorMessage,
      statusCode: statusCode
    };
  }
};

/**
 * Consulta e gera PDF da NF-e utilizando o serviço Meu Danfe
 * @param {string} xmlNFe - XML da NF-e ou chave da NFe (44 dígitos)
 * @param {boolean} isChaveOnly - Indica se está enviando apenas a chave NFe
 * @param {boolean} forceAttempt - Força a tentativa mesmo com XMLs grandes
 * @returns {Promise<{success: boolean, pdf: string}>} Objeto contendo o PDF em base64
 */
export const consultarDanfeAPI = async (xmlNFe, isChaveOnly = false, forceAttempt = false) => {
  try {
    if (!xmlNFe) {
      console.error('[notasFiscaisService] XML/Chave da NF-e não fornecido');
      return {
        success: false,
        error: 'XML/Chave da NF-e não fornecido'
      };
    }

    // Usar o proxy do backend em vez de chamar a API do Meu Danfe diretamente
    // para evitar problemas de CORS
    if (isChaveOnly) {
      console.log('[notasFiscaisService] Consultando serviço Meu Danfe usando a chave NFe via proxy');
      
      // Usar o endpoint de proxy para chave
      const response = await api.post('/notas-fiscais/proxy/danfe/chave', {
        chave: xmlNFe
      });
      
      // Verificar se a resposta contém o PDF em base64
      if (response?.data?.success && response?.data?.data?.pdf) {
        console.log('[notasFiscaisService] PDF do DANFE gerado com sucesso via chave NFe');
        return {
          success: true,
          pdf: response.data.data.pdf
        };
      } else {
        throw new Error(response?.data?.message || 'Resposta inválida do serviço Meu Danfe (consulta por chave)');
      }
    } else {
      console.log('[notasFiscaisService] Consultando serviço Meu Danfe usando XML via proxy');
      
      // Construir URL com parâmetro force se necessário
      const url = forceAttempt 
        ? '/notas-fiscais/proxy/danfe/xml?force=true'
        : '/notas-fiscais/proxy/danfe/xml';
      
      // Usar o endpoint de proxy para XML
      const response = await api.post(url, {
        xml: xmlNFe
      });
      
      // Verificar se a resposta contém o PDF em base64
      if (response?.data?.success && response?.data?.data?.pdf) {
        console.log('[notasFiscaisService] PDF do DANFE gerado com sucesso via XML');
        return {
          success: true,
          pdf: response.data.data.pdf
        };
      } else {
        throw new Error(response?.data?.message || 'Resposta inválida do serviço Meu Danfe (consulta por XML)');
      }
    }
  } catch (error) {
    console.error('[notasFiscaisService] Erro ao consultar serviço Meu Danfe:', error);
    
    // Extrair detalhes mais completos do erro
    const errorResponse = error.response?.data;
    const errorMessage = errorResponse?.message || error.message || 'Erro ao consultar serviço Meu Danfe';
    const statusCode = error.response?.status;
    const sugestao = errorResponse?.data?.sugestao;
    
    // Log detalhado para depuração
    console.log('[DEBUG notasFiscaisService] Resposta de erro completa:', errorResponse);
    
    return {
      success: false,
      error: errorMessage,
      statusCode: statusCode,
      details: errorResponse,
      sugestao: sugestao
    };
  }
};

export default {
  buscarNotasFiscaisPorPedido,
  buscarXmlPorNumero,
  consultarDanfeAPI
}; 