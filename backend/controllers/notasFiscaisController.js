const db = require('../database/connection');
const erpDb = require('../database/connection').erpConnection;
const { formatarResposta } = require('../utils/apiResponse');
const axios = require('axios');
const { default: rax } = require('axios-retry');

// Configuração do axios-retry
const instance = axios.create();
rax(instance, { 
  retries: 3, // Número de tentativas
  retryDelay: rax.exponentialDelay, // Delay exponencial entre tentativas
  retryCondition: (error) => {
    // Retry em erros de rede ou 5xx
    return rax.isNetworkOrIdempotentRequestError(error) || 
           (error.response && error.response.status >= 500);
  }
});

/**
 * Controller para operações relacionadas a notas fiscais
 */
module.exports = {
  /**
   * Busca XML da nota fiscal por número
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async buscarXmlPorNumero(req, res) {
    const { numero } = req.params;
    
    try {
      console.log(`[notasFiscaisController] Buscando XML da NF ${numero}`);
      
      // Verificar se o número da NF foi informado
      if (!numero) {
        return res.status(400).json(formatarResposta(
          false, 
          'É necessário informar o número da NF',
          null
        ));
      }
      
      // Consultar o XML da nota fiscal usando a view vw_dados_nfe_pedido
      console.log(`[DEBUG] Consultando view vw_dados_nfe_pedido para nota ${numero}`);
      const notaFiscal = await erpDb('vw_dados_nfe_pedido')
        .where('num_nota', numero)
        .orWhere('chave_nfe', numero)
        .first();
      
      console.log('[DEBUG] Resultado da consulta:', notaFiscal ? 'Nota encontrada' : 'Nota não encontrada');
      if (notaFiscal) {
        console.log('[DEBUG] Campos disponíveis:', Object.keys(notaFiscal));
        // Verificar diferentes nomes de campo para o XML
        const xml = notaFiscal.arq_xml || notaFiscal.xml || notaFiscal.xml_nfe || null;
        console.log('[DEBUG] XML presente:', xml ? 'Sim' : 'Não');
        
        // Se tiver XML, retorná-lo
        if (xml) {
          console.log('[DEBUG] Retornando XML da nota fiscal');
          return res.json(formatarResposta(
            true, 
            'XML encontrado com sucesso',
            { xml }
          ));
        }
        
        // Se não tiver XML, mas tiver a chave NFe, retorná-la
        if (notaFiscal.chave_nfe) {
          console.log('[DEBUG] XML não encontrado, mas chave NFe está disponível:', notaFiscal.chave_nfe);
          return res.json(formatarResposta(
            true, 
            'XML não encontrado, mas chave NFe está disponível',
            { 
              chave_nfe: notaFiscal.chave_nfe,
              xml_disponivel: false
            }
          ));
        }
      }
      
      // Se chegou aqui, não encontrou a nota ou não tem nem XML nem chave
      return res.status(404).json(formatarResposta(
        false, 
        `Nota fiscal ${numero} não encontrada ou sem XML/chave NFe`,
        null
      ));
    } catch (error) {
      console.error(`[notasFiscaisController] Erro ao buscar XML da NF ${numero}:`, error);
      return res.status(500).json(formatarResposta(
        false, 
        'Erro ao buscar XML da nota fiscal',
        { erro: error.message }
      ));
    }
  },
  
  /**
   * Busca informações da nota fiscal por número
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async buscarPorNumero(req, res) {
    const { numero } = req.params;
    
    try {
      console.log(`[notasFiscaisController] Buscando informações da NF ${numero}`);
      
      // Verificar se o número da NF foi informado
      if (!numero) {
        return res.status(400).json(formatarResposta(
          false, 
          'É necessário informar o número da NF',
          null
        ));
      }
      
      // Consultar a nota fiscal usando a view vw_dados_nfe_pedido
      console.log(`[DEBUG] Consultando view vw_dados_nfe_pedido para nota ${numero}`);
      const notaFiscal = await erpDb('vw_dados_nfe_pedido')
        .where('num_nota', numero)
        .orWhere('chave_nfe', numero)
        .first();
      
      console.log('[DEBUG] Resultado da consulta:', notaFiscal ? 'Nota encontrada' : 'Nota não encontrada');
      
      if (!notaFiscal) {
        return res.status(404).json(formatarResposta(
          false, 
          `Nota fiscal ${numero} não encontrada`,
          null
        ));
      }
      
      // Remover o XML da resposta para não sobrecarregar
      const { arq_xml, xml, xml_nfe, ...notaFiscalSemXml } = notaFiscal;
      
      // Retornar os dados da nota fiscal
      return res.json(formatarResposta(
        true, 
        'Nota fiscal encontrada com sucesso',
        { notaFiscal: notaFiscalSemXml }
      ));
    } catch (error) {
      console.error(`[notasFiscaisController] Erro ao buscar informações da NF ${numero}:`, error);
      return res.status(500).json(formatarResposta(
        false, 
        'Erro ao buscar informações da nota fiscal',
        { erro: error.message }
      ));
    }
  },
  
  /**
   * Busca notas fiscais por pedido
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async buscarPorPedido(req, res) {
    const { pedidoId } = req.params;
    
    try {
      console.log(`[notasFiscaisController] Buscando notas fiscais do pedido ${pedidoId}`);
      
      // Debugar disponibilidade da view no banco de dados
      try {
        console.log('[DEBUG] Verificando se a view vw_dados_nfe_pedido existe no banco...');
        const viewCheck = await erpDb.raw("SELECT table_name FROM information_schema.tables WHERE table_name = 'vw_dados_nfe_pedido'");
        
        // Verificar resultados baseado no driver do banco de dados (PostgreSQL vs SQL Server)
        const viewExists = viewCheck.rows ? viewCheck.rows.length > 0 : viewCheck.length > 0;
        console.log('[DEBUG] View vw_dados_nfe_pedido existe?', viewExists);
        
        if (!viewExists) {
          return res.status(500).json(formatarResposta(
            false, 
            'A view vw_dados_nfe_pedido não existe no banco de dados. Consulte o administrador do sistema.',
            null
          ));
        }
      } catch (viewErr) {
        console.error('[DEBUG] Erro ao verificar se a view existe:', viewErr);
        return res.status(500).json(formatarResposta(
          false, 
          'Erro ao verificar a existência da view no banco de dados',
          { erro: viewErr.message }
        ));
      }
      
      // Consultar notas fiscais do pedido
      console.log(`[DEBUG] Consultando view vw_dados_nfe_pedido para pedido ${pedidoId}`);
      
      // Consulta mais flexível - tenta diferentes formatos de campos
      const notasFiscais = await erpDb.raw(`
        SELECT * FROM vw_dados_nfe_pedido 
        WHERE CAST(cod_pedido AS VARCHAR) = ? 
        OR CAST(cod_pedido_venda AS VARCHAR) = ? 
        OR CAST(num_docto_fiscal AS VARCHAR) = ?`,
        [pedidoId, pedidoId, pedidoId]
      );
      
      const resultados = notasFiscais.rows || notasFiscais || [];
      console.log(`[DEBUG] Resultado da consulta: ${resultados.length} notas encontradas`);
      
      if (resultados.length === 0) {
        // Se não encontrou, tenta uma abordagem alternativa com o número do pedido
        console.log('[DEBUG] Tentando busca alternativa pelo código do pedido...');
        
        try {
          // Verificar se existe o pedido
          const pedido = await db('pedidos').where('codigo', pedidoId).first();
          console.log('[DEBUG] Pedido encontrado?', pedido ? 'Sim' : 'Não');
          
          if (pedido && pedido.nota_fiscal) {
            console.log('[DEBUG] Pedido tem nota fiscal:', pedido.nota_fiscal);
            
            // Se o pedido tiver o número da nota, buscar pela nota
            const notaPorNumero = await erpDb('vw_dados_nfe_pedido')
              .where('num_nota', pedido.nota_fiscal)
              .orWhere('num_docto_fiscal', pedido.nota_fiscal)
              .select('*');
              
            if (notaPorNumero && notaPorNumero.length > 0) {
              console.log('[DEBUG] Nota encontrada pelo número:', notaPorNumero);
              return res.json(formatarResposta(
                true,
                `Encontrada nota fiscal pelo número ${pedido.nota_fiscal}`,
                { notasFiscais: notaPorNumero }
              ));
            }
          }
        } catch (alternativeErr) {
          console.error('[DEBUG] Erro na busca alternativa:', alternativeErr);
        }
        
        // Último recurso: consultar diretamente na tabela de notas fiscais, se existir
        try {
          console.log('[DEBUG] Tentando consultar diretamente da tabela de notas fiscais...');
          
          // Verificar se a tabela existe
          const tableCheck = await erpDb.raw("SELECT table_name FROM information_schema.tables WHERE table_name = 'notas_fiscais'");
          const tableExists = tableCheck.rows ? tableCheck.rows.length > 0 : tableCheck.length > 0;
          
          if (tableExists) {
            const notasDaTabela = await erpDb('notas_fiscais')
              .where('cod_pedido', pedidoId)
              .orWhere('cod_pedido_venda', pedidoId)
              .select('*');
              
            if (notasDaTabela && notasDaTabela.length > 0) {
              console.log('[DEBUG] Notas encontradas na tabela notas_fiscais:', notasDaTabela);
              return res.json(formatarResposta(
                true,
                `Encontradas ${notasDaTabela.length} nota(s) fiscal(is) na tabela direta`,
                { notasFiscais: notasDaTabela }
              ));
            }
          } else {
            console.log('[DEBUG] Tabela notas_fiscais não existe');
          }
        } catch (tableErr) {
          console.error('[DEBUG] Erro ao consultar tabela direta:', tableErr);
        }
        
        // Se chegou aqui, não encontrou nada
        return res.status(404).json(formatarResposta(
          false, 
          `Nenhuma nota fiscal encontrada para o pedido ${pedidoId}`,
          null
        ));
      }
      
      console.log('[DEBUG] Notas encontradas:', resultados);
      
      // Processar resultados para garantir formato consistente
      const notasProcessadas = resultados.map(nota => {
        // Pegar apenas os campos necessários para não sobrecarregar
        return {
          num_nota: nota.num_nota || nota.numero,
          num_docto_fiscal: nota.num_docto_fiscal || nota.num_nota || nota.numero,
          chave_nfe: nota.chave_nfe || nota.chave_acesso,
          cod_pedido: nota.cod_pedido || nota.codigo_pedido,
          cod_pedido_venda: nota.cod_pedido_venda || nota.cod_pedido
        };
      });
      
      // Retornar as notas fiscais encontradas
      return res.json(formatarResposta(
        true, 
        `Encontradas ${notasProcessadas.length} nota(s) fiscal(is) para o pedido ${pedidoId}`,
        { notasFiscais: notasProcessadas }
      ));
    } catch (error) {
      console.error(`[notasFiscaisController] Erro ao buscar notas fiscais do pedido ${pedidoId}:`, error);
      return res.status(500).json(formatarResposta(
        false, 
        'Erro ao buscar notas fiscais do pedido',
        { erro: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined }
      ));
    }
  },
  
  /**
   * Proxy para a API do DANFe Rápida - gerar DANFE a partir de XML
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async gerarDanfePorXml(req, res) {
    try {
      const { xml } = req.body;
      
      if (!xml) {
        return res.status(400).json(formatarResposta(
          false, 
          'XML não fornecido',
          null
        ));
      }
      
      console.log('[notasFiscaisController] Proxy: Gerando DANFE a partir do XML via DANFe Rápida');
      
      // URL da API do DANFe Rápida conforme documentação
      const url = 'https://ws.meudanfe.com/api/v1/get/nfe/xmltodanfepdf/API';
      
      // Configuração da requisição com timeout e headers
      const config = {
        headers: {
          'Content-Type': 'application/xml'
        },
        timeout: 30000, // 30 segundos de timeout
        validateStatus: function (status) {
          return status >= 200 && status < 300; // Aceita apenas status 2xx
        }
      };
      
      console.log('[DEBUG] Enviando requisição para:', url);
      
      // Fazer a requisição POST enviando o XML no corpo
      const response = await instance.post(url, xml, config);
      
      // Verificar se a resposta contém o PDF em base64
      if (response.data) {
        let pdfData = response.data;
        
        // Verificar se a resposta está entre aspas duplas e removê-las se necessário
        if (typeof pdfData === 'string' && pdfData.startsWith('"') && pdfData.endsWith('"')) {
          pdfData = pdfData.substring(1, pdfData.length - 1);
          console.log('[notasFiscaisController] Proxy: Aspas removidas da resposta');
        }
        
        return res.json(formatarResposta(
          true, 
          'DANFE gerado com sucesso',
          { pdf: pdfData }
        ));
      } else {
        throw new Error('Resposta inválida do serviço DANFe Rápida');
      }
    } catch (error) {
      console.error('[notasFiscaisController] Erro ao gerar DANFE por XML:', error);
      
      // Extrair informações detalhadas do erro para debug
      const statusCode = error.response?.status;
      const errorResponse = error.response?.data;
      const errorMessage = error.message;
      
      console.log('[DEBUG] Status code:', statusCode);
      console.log('[DEBUG] Resposta de erro:', errorResponse);
      console.log('[DEBUG] Mensagem de erro:', errorMessage);
      
      let mensagemErro = 'Erro ao gerar DANFE por XML';
      let codigoStatus = 500;
      
      // Tratamento específico por tipo de erro
      if (error.code === 'ECONNABORTED') {
        mensagemErro = 'Tempo limite excedido ao tentar gerar o DANFE. Tente novamente.';
        codigoStatus = 504;
      } else if (statusCode === 502) {
        mensagemErro = 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.';
      } else if (statusCode === 500) {
        mensagemErro = 'Falha ao gerar PDF do DANFE. Confira se o XML é válido.';
      }
      
      return res.status(codigoStatus).json(formatarResposta(
        false, 
        mensagemErro,
        { 
          erro: errorMessage, 
          statusCode: statusCode,
          detalhes: errorResponse,
          sugestao: 'Se o problema persistir, entre em contato com o suporte.'
        }
      ));
    }
  },
  
  /**
   * Proxy para a API do DANFe Rápida - gerar DANFE a partir da chave de acesso
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async gerarDanfePorChave(req, res) {
    try {
      const { chave } = req.body;
      
      if (!chave) {
        return res.status(400).json(formatarResposta(
          false, 
          'Chave de acesso não fornecida',
          null
        ));
      }
      
      // Verificar se a chave tem 44 dígitos (padrão NFe)
      if (!/^\d{44}$/.test(chave)) {
        return res.status(400).json(formatarResposta(
          false, 
          'Chave de acesso inválida. Deve conter 44 dígitos numéricos.',
          null
        ));
      }
      
      console.log(`[notasFiscaisController] Proxy: Tentativa de gerar DANFE a partir da chave ${chave}`);
      
      // Infelizmente, a documentação do DANFe Rápida não menciona um endpoint para consulta por chave
      // Vamos tentar informar ao usuário sobre essa limitação
      
      // Tentar primeiro buscar o XML associado à chave em nosso sistema
      console.log('[DEBUG] Verificando se temos o XML armazenado para essa chave...');
      
      try {
        const notaComXml = await erpDb('vw_dados_nfe_pedido')
          .where('chave_nfe', chave)
          .first();
          
        if (notaComXml && (notaComXml.arq_xml || notaComXml.xml || notaComXml.xml_nfe)) {
          console.log('[DEBUG] XML encontrado para essa chave, redirecionando para geração via XML');
          
          // Extrair o XML
          const xml = notaComXml.arq_xml || notaComXml.xml || notaComXml.xml_nfe;
          
          // Usar o mesmo método de geração por XML
          const url = 'https://ws.meudanfe.com/api/v1/get/nfe/xmltodanfepdf/API';
          
          const config = {
            headers: {
              'Content-Type': 'application/xml'
            }
          };
          
          console.log('[DEBUG] Enviando requisição para:', url);
          
          // Fazer a requisição POST enviando o XML no corpo
          const response = await instance.post(url, xml, config);
          
          // Verificar se a resposta contém o PDF em base64
          if (response.data) {
            let pdfData = response.data;
            
            // Verificar se a resposta está entre aspas duplas e removê-las se necessário
            if (typeof pdfData === 'string' && pdfData.startsWith('"') && pdfData.endsWith('"')) {
              pdfData = pdfData.substring(1, pdfData.length - 1);
              console.log('[notasFiscaisController] Proxy: Aspas removidas da resposta');
            }
            
            return res.json(formatarResposta(
              true, 
              'DANFE gerado com sucesso a partir do XML encontrado para a chave',
              { pdf: pdfData }
            ));
          }
        } else {
          console.log('[DEBUG] XML não encontrado para essa chave');
        }
      } catch (xmlSearchError) {
        console.error('[DEBUG] Erro ao buscar XML para a chave:', xmlSearchError.message);
      }
      
      // Se chegou aqui, não conseguimos gerar o DANFE a partir da chave
      console.log('[DEBUG] Não foi possível gerar o DANFE a partir da chave');
      
      return res.status(400).json(formatarResposta(
        false, 
        'Não foi possível gerar o DANFE a partir da chave. A API do DANFe Rápida requer o XML da NFe.',
        {
          sugestao: 'Use a consulta por XML ou verifique se o XML está disponível no sistema.'
        }
      ));
    } catch (error) {
      console.error('[notasFiscaisController] Erro ao gerar DANFE por chave:', error);
      
      // Extrair informações detalhadas do erro para debug
      const statusCode = error.response?.status;
      const errorResponse = error.response?.data;
      const errorMessage = error.message;
      
      console.log('[DEBUG] Status code:', statusCode);
      console.log('[DEBUG] Resposta de erro:', errorResponse);
      console.log('[DEBUG] Mensagem de erro:', errorMessage);
      
      return res.status(500).json(formatarResposta(
        false, 
        'Erro ao gerar DANFE por chave',
        { 
          erro: errorMessage,
          statusCode: statusCode,
          detalhes: errorResponse,
          sugestao: 'Conforme a documentação do DANFe Rápida, o serviço requer o XML da NFe para gerar o DANFE. Tente a API de XML se disponível.'
        }
      ));
    }
  }
}; 