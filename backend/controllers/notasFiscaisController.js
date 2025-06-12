const db = require('../database/connection');
const erpDb = require('../database/connection').erpConnection;
const { formatarResposta } = require('../utils/apiResponse');
const axios = require('axios');
const { default: rax } = require('axios-retry');
const danfeGeneratorService = require('../services/danfeGeneratorService');

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
 * Função auxiliar para tentar gerar DANFE com serviços alternativos
 * @param {string} xml - XML da NFe
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function tentarGerarDanfeAlternativo(xml) {
  // Declarar variáveis no escopo da função para disponibilidade em try/catch
  let response;
  
  try {
    console.log('[DEBUG] Tentando serviço alternativo para DANFE...');
    
    // Lista de URLs de serviços alternativos (para uso futuro)
    const servicosAlternativos = [
      // 'https://api.alternativa1.com/danfe', // Exemplo
      // 'https://api.alternativa2.com/pdf'    // Exemplo
    ];
    
    // Por enquanto, vamos implementar uma verificação de conectividade
    // e uma tentativa com timeout menor
    const urlPrincipal = 'https://ws.meudanfe.com/api/v1/get/nfe/xmltodanfepdf/API';
    
    console.log('[DEBUG] Testando conectividade com timeout reduzido...');
    
    response = await instance.post(urlPrincipal, xml, {
      headers: { 'Content-Type': 'application/xml' },
      timeout: 15000, // Timeout menor para teste rápido
      validateStatus: function (status) {
        return status >= 200 && status < 300;
      }
    });
    
    if (response.data) {
      console.log('[DEBUG] Serviço principal funcionou com timeout reduzido');
      return {
        success: true,
        data: response.data
      };
    }
    
    throw new Error('Sem resposta válida');
    
  } catch (error) {
    console.log('[DEBUG] Erro no serviço alternativo:', error.message);
    console.log('[DEBUG] Serviços alternativos não disponíveis no momento');
    return {
      success: false,
      error: 'Todos os serviços de geração de DANFE estão indisponíveis'
    };
  }
}

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
    const { xml } = req.body;
    const { force } = req.query; // Permitir forçar tentativa mesmo com XMLs grandes
    
    try {
      if (!xml) {
        return res.status(400).json(formatarResposta(
          false, 
          'XML não fornecido',
          null
        ));
      }
      
      console.log('[notasFiscaisController] Proxy: Gerando DANFE a partir do XML via DANFe Rápida');
      
      // Verificar tamanho do XML
      const xmlSize = Buffer.byteLength(xml, 'utf8');
      console.log(`[DEBUG] Tamanho do XML: ${xmlSize} bytes (${(xmlSize/1024).toFixed(2)} KB)`);
      
      // Verificar se o XML é muito grande para o serviço externo
      const xmlSizeKB = xmlSize / 1024;
      const isLargeXml = xmlSizeKB > 25; // XMLs > 25KB têm alta chance de falhar
      const isVeryLargeXml = xmlSizeKB > 30; // XMLs > 30KB quase sempre falham
      
      if (isVeryLargeXml && !force) {
        console.log(`[DEBUG] XML muito grande (${xmlSizeKB.toFixed(2)} KB) - alta probabilidade de falha`);
        
        // Oferecer alternativa imediata para XMLs muito grandes
        return res.status(413).json(formatarResposta(
          false, 
          `XML muito grande para o serviço externo (${xmlSizeKB.toFixed(2)} KB)`,
          {
            xmlSize: `${xmlSizeKB.toFixed(2)} KB`,
            problema: 'O serviço ws.meudanfe.com não consegue processar XMLs maiores que ~30KB',
            sugestoes: [
              'XMLs grandes (>30KB) excedem os limites do serviço externo',
              'O serviço retorna erro HTTP 500 para XMLs complexos',
              'Recomendamos usar nosso gerador próprio para XMLs grandes'
            ],
            alternativas: [
              'Usar nosso gerador próprio (botão "Gerador Próprio")',
              'Baixar o XML para usar em software local de DANFE',
              'Acessar o DANFE diretamente no portal da SEFAZ'
            ],
            xml_disponivel: true,
            acao_sugerida: 'gerador_proprio'
          }
        ));
      }
      
      if (isLargeXml) {
        console.log(`[DEBUG] XML grande (${xmlSizeKB.toFixed(2)} KB) - pode ter problemas`);
        if (force) {
          console.log('[DEBUG] Tentativa forçada pelo usuário - continuando mesmo com XML grande');
        }
      }
      
      // Verificar se o XML está bem formado
      try {
        // Verificação básica de XML válido
        if (!xml.includes('<nfeProc') && !xml.includes('<NFe')) {
          throw new Error('XML não parece ser uma NFe válida');
        }
        
        // Verificar se tem caracteres problemáticos
        const hasProblematicChars = /[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD]/.test(xml);
        if (hasProblematicChars) {
          console.log('[DEBUG] XML contém caracteres que podem causar problemas');
        }
        
        console.log('[DEBUG] XML parece estar bem formado');
      } catch (xmlValidationError) {
        console.log('[DEBUG] Possível problema na estrutura do XML:', xmlValidationError.message);
        return res.status(400).json(formatarResposta(
          false, 
          'XML fornecido não está em formato válido para NFe',
          { erro: xmlValidationError.message }
        ));
      }
      
      // URL da API do DANFe Rápida conforme documentação
      const url = 'https://ws.meudanfe.com/api/v1/get/nfe/xmltodanfepdf/API';
      
      // Configuração da requisição com timeout adaptativo baseado no tamanho
      let timeout = 30000; // timeout padrão
      if (xmlSize > 30000) { // Para XMLs > 30KB
        timeout = 60000; // 60 segundos
        console.log('[DEBUG] XML grande detectado, usando timeout estendido');
      }
      
      const config = {
        headers: {
          'Content-Type': 'application/xml',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'DSVENDAS-System/1.0'
        },
        timeout: timeout,
        validateStatus: function (status) {
          return status >= 200 && status < 300; // Aceita apenas status 2xx
        },
        // Configurações para melhor handling de XMLs grandes
        maxContentLength: 50 * 1024 * 1024, // 50MB máximo
        maxBodyLength: 50 * 1024 * 1024 // 50MB máximo
      };
      
      console.log(`[DEBUG] Enviando requisição para: ${url} (timeout: ${timeout}ms)`);
      
      // Estratégia de múltiplas tentativas com timeouts diferentes
      const strategies = [
        { timeout: timeout, description: 'Tentativa padrão' },
        { timeout: Math.floor(timeout * 0.7), description: 'Tentativa com timeout reduzido' },
        { timeout: Math.floor(timeout * 1.5), description: 'Tentativa com timeout estendido' }
      ];
      
      let lastError = null;
      
      for (let i = 0; i < strategies.length; i++) {
        const strategy = strategies[i];
        
        try {
          console.log(`[DEBUG] ${strategy.description} (${strategy.timeout}ms)...`);
          
          const currentConfig = { ...config, timeout: strategy.timeout };
          
          // Fazer a requisição POST enviando o XML no corpo
          const response = await instance.post(url, xml, currentConfig);
          
          // Verificar se a resposta contém o PDF em base64
          if (response.data) {
            let pdfData = response.data;
            
            // Verificar se a resposta está entre aspas duplas e removê-las se necessário
            if (typeof pdfData === 'string' && pdfData.startsWith('"') && pdfData.endsWith('"')) {
              pdfData = pdfData.substring(1, pdfData.length - 1);
              console.log('[notasFiscaisController] Proxy: Aspas removidas da resposta');
            }
            
            console.log(`[DEBUG] Sucesso com ${strategy.description}!`);
            return res.json(formatarResposta(
              true, 
              'DANFE gerado com sucesso',
              { pdf: pdfData, strategy: strategy.description }
            ));
          } else {
            throw new Error('Resposta inválida do serviço DANFe Rápida');
          }
        } catch (strategyError) {
          console.log(`[DEBUG] ${strategy.description} falhou:`, strategyError.message);
          lastError = strategyError;
          
          // Se não for o último, continua para próxima estratégia
          if (i < strategies.length - 1) {
            continue;
          }
        }
      }
      
      // Se chegou aqui, todas as estratégias falharam
      throw lastError;
      
    } catch (error) {
      console.error('[notasFiscaisController] Erro ao gerar DANFE por XML:', error);
      
      // Extrair informações detalhadas do erro para debug
      const statusCode = error.response?.status;
      const errorResponse = error.response?.data;
      const errorMessage = error.message;
      
      console.log('[DEBUG] Status code:', statusCode);
      console.log('[DEBUG] Resposta de erro:', errorResponse);
      console.log('[DEBUG] Mensagem de erro:', errorMessage);
      
      // Se o erro for 500, tentar serviço alternativo
      if (statusCode === 500) {
        console.log('[DEBUG] Tentando serviço alternativo devido ao erro 500...');
        
        try {
          const resultadoAlternativo = await tentarGerarDanfeAlternativo(xml);
          
          if (resultadoAlternativo.success) {
            console.log('[DEBUG] Sucesso com serviço alternativo');
            
            let pdfData = resultadoAlternativo.data;
            
            // Verificar se a resposta está entre aspas duplas e removê-las se necessário
            if (typeof pdfData === 'string' && pdfData.startsWith('"') && pdfData.endsWith('"')) {
              pdfData = pdfData.substring(1, pdfData.length - 1);
            }
            
            return res.json(formatarResposta(
              true, 
              'DANFE gerado com sucesso (serviço alternativo)',
              { pdf: pdfData }
            ));
          }
        } catch (alternativeError) {
          console.log('[DEBUG] Erro no serviço alternativo:', alternativeError.message);
        }
      }
      
      let mensagemErro = 'Erro ao gerar DANFE por XML';
      let codigoStatus = 500;
      let sugestoes = [];
      
      // Tratamento específico por tipo de erro
      if (error.code === 'ECONNABORTED') {
        mensagemErro = 'Tempo limite excedido ao tentar gerar o DANFE. O XML pode ser muito grande ou complexo.';
        codigoStatus = 504;
        sugestoes = [
          'XML muito grande ou complexo para o serviço externo',
          'Tente novamente em alguns minutos',
          'Verifique se o XML está correto'
        ];
      } else if (statusCode === 502) {
        mensagemErro = 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.';
        sugestoes = ['Aguardar alguns minutos', 'Verificar status do serviço'];
      } else if (statusCode === 500) {
        mensagemErro = 'O serviço externo não conseguiu processar este XML específico. Isso pode ocorrer com XMLs grandes ou com conteúdo complexo.';
        codigoStatus = 503; // Service Unavailable mais apropriado
        sugestoes = [
          'XML muito grande (>30KB) pode exceder limites do serviço',
          'Aguardar alguns minutos e tentar novamente',
          'Usar o XML diretamente para impressão offline',
          'Verificar se há caracteres especiais no XML'
        ];
      } else if (statusCode >= 400 && statusCode < 500) {
        mensagemErro = 'Erro nos dados fornecidos. Verifique se o XML da NFe está válido.';
        codigoStatus = 400;
        sugestoes = ['Verificar estrutura do XML', 'Validar conteúdo da NFe'];
      }
      
      return res.status(codigoStatus).json(formatarResposta(
        false, 
        mensagemErro,
        { 
          erro: errorMessage, 
          statusCode: statusCode,
          detalhes: errorResponse,
          xmlSize: xml ? `${(Buffer.byteLength(xml, 'utf8')/1024).toFixed(2)} KB` : 'N/A',
          sugestoes: sugestoes,
          alternativas: statusCode === 500 
            ? ['Aguardar alguns minutos', 'Verificar status do serviço meudanfe.com', 'Baixar XML para uso offline']
            : []
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
          sugestao: statusCode === 500 
            ? 'O serviço externo está com problemas. Aguarde alguns minutos e tente novamente.' 
            : 'Se o problema persistir, entre em contato com o suporte.',
          alternativas: statusCode === 500 
            ? ['Aguardar alguns minutos', 'Verificar status do serviço meudanfe.com', 'Baixar XML para uso offline']
            : []
        }
      ));
    }
  },
  
  /**
   * Verifica o status do serviço de geração de DANFE
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async verificarStatusServicoDANFE(req, res) {
    try {
      console.log('[notasFiscaisController] Verificando status do serviço DANFE...');
      
      const url = 'https://ws.meudanfe.com/api/v1/get/nfe/xmltodanfepdf/API';
      
      // Primeiro, verificar conectividade básica
      let conectividade = {
        status: 0,
        operacional: false,
        mensagem: 'Sem conectividade'
      };
      
      try {
        const response = await axios.head(url, {
          timeout: 10000,
          validateStatus: function (status) {
            return status >= 200 && status < 600;
          }
        });
        
        conectividade = {
          status: response.status,
          operacional: response.status >= 200 && response.status < 500,
          mensagem: response.status >= 200 && response.status < 500 
            ? 'Conectividade OK' 
            : 'Conectividade com problemas'
        };
      } catch (connError) {
        conectividade = {
          status: connError.response?.status || 0,
          operacional: false,
          mensagem: 'Falha na conectividade',
          erro: connError.message
        };
      }
      
      // Segundo, testar a geração real com um XML mínimo de teste
      let geracao = {
        operacional: false,
        mensagem: 'Não testado',
        erro: null
      };
      
      if (conectividade.operacional) {
        console.log('[DEBUG] Testando geração real com XML de teste...');
        
        // XML mínimo e válido para teste (NFe de teste da documentação)
        const xmlTeste = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe versao="4.00" Id="NFe35200714200166000187550010000000046123456789">
      <ide>
        <cUF>35</cUF>
        <cNF>12345678</cNF>
        <natOp>VENDA</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>4</nNF>
        <dhEmi>2020-07-14T14:15:00-03:00</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>3550308</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>9</cDV>
        <tpAmb>2</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>1.0</verProc>
      </ide>
      <emit>
        <CNPJ>14200166000187</CNPJ>
        <xNome>EMPRESA TESTE</xNome>
        <enderEmit>
          <xLgr>RUA TESTE</xLgr>
          <nro>123</nro>
          <xBairro>CENTRO</xBairro>
          <cMun>3550308</cMun>
          <xMun>SAO PAULO</xMun>
          <UF>SP</UF>
          <CEP>01000000</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderEmit>
        <IE>123456789012</IE>
        <CRT>3</CRT>
      </emit>
      <dest>
        <CPF>12345678901</CPF>
        <xNome>CONSUMIDOR TESTE</xNome>
        <enderDest>
          <xLgr>RUA CONSUMIDOR</xLgr>
          <nro>456</nro>
          <xBairro>VILA TESTE</xBairro>
          <cMun>3550308</cMun>
          <xMun>SAO PAULO</xMun>
          <UF>SP</UF>
          <CEP>02000000</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderDest>
        <indIEDest>9</indIEDest>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>001</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>PRODUTO TESTE</xProd>
          <NCM>12345678</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>1.0000</qCom>
          <vUnCom>100.0000</vUnCom>
          <vProd>100.00</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>UN</uTrib>
          <qTrib>1.0000</qTrib>
          <vUnTrib>100.0000</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <modBC>0</modBC>
              <vBC>100.00</vBC>
              <pICMS>18.0000</pICMS>
              <vICMS>18.00</vICMS>
            </ICMS00>
          </ICMS>
        </imposto>
      </det>
      <total>
        <ICMSTot>
          <vBC>100.00</vBC>
          <vICMS>18.00</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>100.00</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>0.00</vPIS>
          <vCOFINS>0.00</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>100.00</vNF>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>9</modFrete>
      </transp>
      <pag>
        <detPag>
          <indPag>0</indPag>
          <tPag>01</tPag>
          <vPag>100.00</vPag>
        </detPag>
      </pag>
      <infAdic>
        <infCpl>NFe de teste para verificacao do servico</infCpl>
      </infAdic>
    </infNFe>
  </NFe>
</nfeProc>`;
        
        try {
          const testResponse = await axios.post(url, xmlTeste, {
            headers: { 'Content-Type': 'application/xml' },
            timeout: 15000,
            validateStatus: function (status) {
              return status >= 200 && status < 600; // Aceitar qualquer resposta para análise
            }
          });
          
          if (testResponse.status === 200 && testResponse.data) {
            geracao = {
              operacional: true,
              mensagem: 'Geração funcionando',
              status: testResponse.status
            };
          } else {
            geracao = {
              operacional: false,
              mensagem: `Falha na geração (Status: ${testResponse.status})`,
              status: testResponse.status,
              detalhes: testResponse.data
            };
          }
        } catch (testError) {
          geracao = {
            operacional: false,
            mensagem: 'Falha na geração',
            status: testError.response?.status || 0,
            erro: testError.message,
            detalhes: testError.response?.data
          };
        }
      }
      
      // Determinar status final
      const statusFinal = conectividade.operacional && geracao.operacional;
      
      return res.json(formatarResposta(
        true,
        'Status do serviço verificado (com teste de geração)',
        {
          servicoDanfe: {
            url: url,
            operacional: statusFinal,
            mensagem: statusFinal 
              ? 'Serviço totalmente operacional' 
              : 'Serviço com problemas',
            ultimaVerificacao: new Date().toISOString(),
            detalhes: {
              conectividade: conectividade,
              geracao: geracao
            }
          }
        }
      ));
      
    } catch (error) {
      console.error('[notasFiscaisController] Erro ao verificar status do serviço:', error);
      
      return res.json(formatarResposta(
        true,
        'Status do serviço verificado (com erro)',
        {
          servicoDanfe: {
            url: 'https://ws.meudanfe.com/api/v1/get/nfe/xmltodanfepdf/API',
            status: error.response?.status || 0,
            operacional: false,
            mensagem: 'Erro na verificação',
            erro: error.message,
            ultimaVerificacao: new Date().toISOString()
          }
        }
      ));
    }
  },
  
  /**
   * Gera DANFE usando nosso próprio gerador (sem dependência de serviços externos)
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async gerarDanfeLocal(req, res) {
    const { xml } = req.body;
    
    try {
      if (!xml) {
        return res.status(400).json(formatarResposta(
          false, 
          'XML não fornecido',
          null
        ));
      }
      
      console.log('[notasFiscaisController] Gerando DANFE com gerador próprio');
      
      // Verificar tamanho do XML
      const xmlSize = Buffer.byteLength(xml, 'utf8');
      console.log(`[DEBUG] Tamanho do XML: ${xmlSize} bytes (${(xmlSize/1024).toFixed(2)} KB)`);
      
      // Usar nosso próprio gerador
      const pdfBuffer = await danfeGeneratorService.generateDanfe(xml);
      
      // Validar buffer antes da conversão (usando a mesma lógica do teste)
      console.log(`[DEBUG] Buffer PDF recebido: tipo=${typeof pdfBuffer}, isBuffer=${Buffer.isBuffer(pdfBuffer)}, tamanho=${pdfBuffer?.length}`);
      
      if (!pdfBuffer) {
        throw new Error('Serviço não retornou um buffer válido');
      }
      
      let bufferFinal = pdfBuffer;
      
      if (!Buffer.isBuffer(pdfBuffer)) {
        console.log('[DEBUG] Convertendo buffer...');
        
        if (pdfBuffer.constructor && pdfBuffer.constructor.name === 'Uint8Array') {
          bufferFinal = Buffer.from(pdfBuffer);
        } else {
          bufferFinal = Buffer.from(pdfBuffer);
        }
        
        console.log(`[DEBUG] Buffer convertido: ${Buffer.isBuffer(bufferFinal)}`);
      }
      
      if (bufferFinal.length === 0) {
        throw new Error('Buffer PDF está vazio');
      }
      
      // Converter para base64 com validação
      let pdfBase64;
      try {
        pdfBase64 = bufferFinal.toString('base64');
        
        // Verificar se o base64 é válido
        if (!pdfBase64 || pdfBase64.length === 0) {
          throw new Error('Conversão base64 resultou em string vazia');
        }
        
        // Testar se o base64 pode ser decodificado
        const testBuffer = Buffer.from(pdfBase64, 'base64');
        if (testBuffer.length !== bufferFinal.length) {
          throw new Error('Base64 não corresponde ao buffer original');
        }
        
        console.log(`[DEBUG] Base64 gerado com sucesso: ${pdfBase64.length} caracteres`);
        
      } catch (base64Error) {
        console.error('[DEBUG] Erro na conversão base64:', base64Error);
        throw new Error(`Erro na conversão para base64: ${base64Error.message}`);
      }
      
      console.log('[DEBUG] DANFE gerada com sucesso usando gerador próprio');
      return res.json(formatarResposta(
        true, 
        'DANFE gerada com sucesso (gerador próprio)',
        { 
          pdf: pdfBase64,
          gerador: 'proprio',
          xmlSize: `${(xmlSize/1024).toFixed(2)} KB`
        }
      ));
      
    } catch (error) {
      console.error('[notasFiscaisController] Erro ao gerar DANFE local:', error);
      
      return res.status(500).json(formatarResposta(
        false, 
        'Erro ao gerar DANFE com gerador próprio',
        { 
          erro: error.message,
          detalhes: 'Erro interno no processamento do XML da NFe',
          sugestoes: [
            'Verificar se o XML está em formato válido de NFe',
            'Tentar novamente em alguns instantes',
            'Baixar o XML para análise manual'
          ]
        }
      ));
    }
  },
  
  /**
   * Testa o funcionamento do Puppeteer
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async testarPuppeteer(req, res) {
    try {
      console.log('[notasFiscaisController] Teste PDF básico...');
      
      // Primeiro, testar método básico
      const pdfBuffer = await danfeGeneratorService.generateBasicPDF();
      
      // Validação mais detalhada
      console.log('[notasFiscaisController] Validando resposta do serviço...');
      console.log('[notasFiscaisController] Tipo:', typeof pdfBuffer);
      console.log('[notasFiscaisController] Constructor:', pdfBuffer?.constructor?.name);
      console.log('[notasFiscaisController] É Buffer?', Buffer.isBuffer(pdfBuffer));
      console.log('[notasFiscaisController] Tamanho:', pdfBuffer?.length);
      
      if (!pdfBuffer) {
        throw new Error('Serviço retornou null/undefined');
      }
      
      if (!Buffer.isBuffer(pdfBuffer)) {
        console.log('[notasFiscaisController] Tentando forçar conversão...');
        
        // Tentar diferentes abordagens de conversão
        let bufferFinal;
        
        if (pdfBuffer.constructor && pdfBuffer.constructor.name === 'Uint8Array') {
          console.log('[notasFiscaisController] Detectado Uint8Array, convertendo...');
          bufferFinal = Buffer.from(pdfBuffer);
        } else if (typeof pdfBuffer === 'string') {
          console.log('[notasFiscaisController] Detectado string, convertendo...');
          bufferFinal = Buffer.from(pdfBuffer, 'binary');
        } else if (Array.isArray(pdfBuffer)) {
          console.log('[notasFiscaisController] Detectado array, convertendo...');
          bufferFinal = Buffer.from(pdfBuffer);
        } else {
          throw new Error(`Tipo não suportado: ${typeof pdfBuffer} (${pdfBuffer?.constructor?.name})`);
        }
        
        console.log('[notasFiscaisController] Conversão bem-sucedida:', Buffer.isBuffer(bufferFinal));
        console.log('[notasFiscaisController] Tamanho final:', bufferFinal.length);
        
        // Usar o buffer convertido
        const pdfBase64 = bufferFinal.toString('base64');
        console.log(`[DEBUG] Base64 gerado: ${pdfBase64.length} caracteres`);
        
        return res.json(formatarResposta(
          true, 
          'PDF básico funcionando (com conversão)',
          { 
            pdf: pdfBase64,
            tamanho: `${bufferFinal.length} bytes`,
            tipo: 'teste-basico-convertido',
            tipoOriginal: pdfBuffer?.constructor?.name || typeof pdfBuffer
          }
        ));
      }
      
      if (pdfBuffer.length === 0) {
        throw new Error('Buffer PDF está vazio');
      }
      
      // Converter para base64
      const pdfBase64 = pdfBuffer.toString('base64');
      console.log(`[DEBUG] Base64 gerado: ${pdfBase64.length} caracteres`);
      
      return res.json(formatarResposta(
        true, 
        'PDF básico funcionando',
        { 
          pdf: pdfBase64,
          tamanho: `${pdfBuffer.length} bytes`,
          tipo: 'teste-basico'
        }
      ));
      
    } catch (error) {
      console.error('[notasFiscaisController] Erro teste básico:', error);
      
      return res.status(500).json(formatarResposta(
        false, 
        'Erro no teste básico',
        { 
          erro: error.message,
          stack: error.stack
        }
      ));
    }
  }
}; 