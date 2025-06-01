/**
 * Função de arredondamento aprimorada para 4 casas decimais
 * Garante que números como 235.10000000000002 sejam corretamente convertidos para 235.1000
 * Isso evita problemas de precisão de ponto flutuante em JavaScript
 * @param {number} valor Valor a ser arredondado
 * @param {number} casas Número de casas decimais (padrão: 4)
 * @returns {number} Valor arredondado com precisão exata
 */
const arredondar = (valor, casas = 4) => {
  if (valor === 0 || valor === null || valor === undefined || isNaN(valor)) {
    return 0;
  }
  
  // Converter para string com número fixo de casas decimais e converter de volta para número
  // Isso garante que não haja valores como 235.10000000000002
  const valorString = valor.toFixed(casas);
  return parseFloat(valorString);
};

/**
 * @param {Object} params Parâmetros para o cálculo
 * @param {number} params.valorBruto Valor bruto (quantidade * valor unitário)
 * @param {number} params.valorIpi Valor do IPI
 * @param {number} params.aliqIcms Alíquota de ICMS (%)
 * @param {number} params.aliqInterna Alíquota interna do estado (%)
 * @param {number} params.iva Índice de Valor Adicionado (MVA) (%)
 * @param {number} params.redIcms Redução da base de cálculo do ICMS (%)
 * @param {number} params.aliqFcpSt Alíquota do FCP-ST (%)
 * @param {boolean} params.temReducaoIcmsProprio Indica se a redução se aplica apenas ao ICMS próprio
 * @param {number} params.valorDesconto Valor do desconto aplicado ao valor bruto
 * @returns {Object} Objeto com os valores calculados (baseIcms, baseIcmsSt, valorIcms, valorIcmsSt, valorFcpSt)
 */
export const calcularIcmsST = (params) => {
  const {
    valorBruto,
    valorIpi = 0,
    aliqIcms = 0,
    aliqInterna = 0,
    iva = 0,
    redIcms = 0,
    aliqFcpSt = 0,
    temReducaoIcmsProprio = false,
    valorDesconto = 0
  } = params;

  // Garantir que todos os valores de entrada estejam arredondados corretamente
  const valorBrutoArredondado = arredondar(valorBruto);
  const valorIpiArredondado = arredondar(valorIpi);
  const valorDescontoArredondado = arredondar(valorDesconto);

  // Ajustar valorBruto com desconto
  const valorComDesconto = arredondar(valorBrutoArredondado - valorDescontoArredondado);

  // 1. Cálculo do ICMS básico
  // Calcular base de ICMS com redução (se houver) - USAR VALOR COM DESCONTO
  const baseIcms = redIcms > 0 
    ? arredondar(valorComDesconto * (1 - (redIcms / 100))) 
    : valorComDesconto;

  // Calcular ICMS próprio: Valor Total × Alíquota ICMS
  const valorIcms = arredondar(baseIcms * (aliqIcms / 100));
  
  // 2. Cálculo da Base de Cálculo do ICMS ST
  // Se a redução for apenas para ICMS próprio, a base do ST usa o valor com desconto
  const valorBase = temReducaoIcmsProprio ? valorComDesconto : baseIcms;
  
  // Base ST = (Valor Total + IPI) * (1 + IVA/100)
  // O IVA é aplicado como um percentual adicional, por isso (1 + IVA/100)
  const baseIcmsSt = arredondar((valorBase + valorIpiArredondado) * (1 + (iva / 100)));
  
  // 3. Cálculo do ICMS ST: Base ICMS ST × Alíquota Interna do Estado
  const icmsStBruto = arredondar(baseIcmsSt * (aliqInterna / 100));
  
  // 4. Valor Final do ICMS ST = Base ICMS ST Ajustada - Valor ICMS
  let valorIcmsSt = arredondar(icmsStBruto - valorIcms);
  
  // Se o valor for negativo, definir como zero
  if (valorIcmsSt < 0) valorIcmsSt = 0;
  
  // Calcular FCP-ST se aplicável (Fundo de Combate à Pobreza, quando existir)
  const valorFcpSt = aliqFcpSt > 0 ? arredondar(baseIcmsSt * (aliqFcpSt / 100)) : 0;
  
  // Caso estejamos em modo de debug, mostrar valores de cálculo no console
  if (window.DEBUG_FISCAL === true) {
    console.log(`Cálculo de ICMS-ST:
      Valor bruto: ${valorBrutoArredondado}
      Valor desconto: ${valorDescontoArredondado}
      Valor com desconto: ${valorComDesconto}
      Base ICMS (red ${redIcms}%): ${baseIcms}
      Valor ICMS (${aliqIcms}%): ${valorIcms}
      Valor Base ST: ${valorBase}
      Valor IPI: ${valorIpiArredondado}
      Base ICMS-ST (IVA ${iva}%): ${baseIcmsSt}
      ICMS-ST bruto (${aliqInterna}%): ${icmsStBruto}
      Valor ICMS-ST: ${valorIcmsSt}
      Valor FCP-ST (${aliqFcpSt}%): ${valorFcpSt}
    `);
  }
  
  return {
    baseIcms,         // Base de cálculo do ICMS
    baseIcmsSt,       // Base de cálculo do ICMS-ST (com IVA)
    valorIcms,        // Valor do ICMS normal
    icmsStBruto,      // Valor bruto do ICMS-ST (antes de subtrair o ICMS normal)
    valorIcmsSt,      // Valor final do ICMS-ST (já descontado o ICMS normal)
    valorFcpSt,       // Valor do FCP-ST (quando aplicável)
    valorTotalSt: arredondar(valorIcmsSt + valorFcpSt)  // Total de ST (ICMS-ST + FCP-ST)
  };
};

/**
 * Verifica se um CST indica Substituição Tributária
 * @param {string} cst Código CST
 * @returns {boolean} Verdadeiro se o CST indica ST
 */
export const verificarCSTSubstituicaoTributaria = (cst) => {
  if (!cst) return false;
  
  // CSTs que indicam Substituição Tributária - mesmos códigos do backend
  const cstsComST = ['10', '30', '60', '70', '201', '202', '203'];
  
  return cstsComST.includes(cst);
};

/**
 * Calcula todos os tributos para um item do orçamento
 * @param {Object} item Item do orçamento
 * @param {Object} dadosFiscais Dados fiscais do produto - DEVE VIR DO BACKEND/BANCO DE DADOS
 * @param {Object} dadosClassificacao Dados de classificação fiscal - DEVE VIR DO BACKEND/BANCO DE DADOS
 * @param {string} ufCliente UF do cliente
 * @param {string} ufEmpresa UF da empresa
 * @param {boolean} isImportado Indica se o produto é importado
 * @returns {Object} Objeto com todos os valores de tributos calculados
 */
export const calcularTributos = (item, dadosFiscais, dadosClassificacao, ufCliente, ufEmpresa = 'SP', isImportado = false) => {
  
  const {
    quantidade = 0,
    valor_unitario = 0,
    desconto = 0
  } = item;
  
  // Valores básicos - usando a nova função de arredondamento
  const valorBruto = arredondar(quantidade * valor_unitario);
  const valorDesconto = arredondar(valorBruto * (desconto / 100));
  const valorLiquido = arredondar(valorBruto - valorDesconto);
  
  // Valores fiscais padrão
  const aliqIcms = dadosFiscais?.aliq_icms || 0;
  const aliqIpi = dadosFiscais?.aliq_ipi || 0;
  const redIcms = dadosFiscais?.red_icms || 0;
  const cstIcms = dadosFiscais?.st_icms || '00';
  const icmsSt = dadosFiscais?.icms_st || 'N';
  
  // Calcular IPI - Passo 1: Imposto sobre Produtos Industrializados
  const valorIpi = arredondar(valorLiquido * (aliqIpi / 100));
  
  // REGRA ESPECIAL CST 60: ICMS já retido anteriormente por substituição tributária
  // Quando CST = 60, não deve ser feito novo cálculo de ICMS-ST
  if (cstIcms === '60') {
    console.log(`CST ${cstIcms} detectado - ICMS já retido anteriormente por substituição tributária. Não calculando novo ICMS-ST.`);
    
    // Calcular apenas os valores básicos de ICMS
    const baseIcms = redIcms > 0 ? arredondar(valorLiquido * (1 - (redIcms / 100))) : valorLiquido;
    const valorIcms = arredondar(baseIcms * (aliqIcms / 100));
    const valorTotalComImpostos = arredondar(valorLiquido + valorIpi);
    
    return {
      valorBruto,
      valorDesconto,
      valorLiquido,
      baseIcms,
      aliqIcms,
      valorIcms,
      aliqIpi,
      valorIpi,
      temST: false,
      baseIcmsSt: 0,
      valorIcmsSt: 0,
      valorFcpSt: 0,
      valorTotalSt: 0,
      valorTotalComImpostos,
      cstIcms,
      icmsSt: 'N',
      isImportado,
      detalhesCalculo: null,
      mensagem: 'CST 60: ICMS já foi retido anteriormente por substituição tributária.'
    };
  }
  
  // Verificar se tem ST: primeira verificação pelo campo icms_st, depois pelo CST
  const temST = icmsSt === 'S' || verificarCSTSubstituicaoTributaria(cstIcms);
  
  // Calcular ICMS normal - Base
  const baseIcms = redIcms > 0 ? arredondar(valorLiquido * (1 - (redIcms / 100))) : valorLiquido;
  const valorIcms = arredondar(baseIcms * (aliqIcms / 100));
  
  // Valores para cálculo do ST e resultados
  let valorIcmsSt = 0;
  let valorFcpSt = 0;
  let baseIcmsSt = 0;
  let detalhesCalculo = null;
  
  // Se o produto tiver ST e tivermos dados de classificação fiscal
  if (temST && dadosClassificacao) {
    // Obter valores para cálculo do ST, considerando se o produto é importado
    // Se for importado e tiver IVA específico, usar o IVA importado
    let iva = 0;
    let aliqImportada = 0;
    
    if (isImportado && dadosClassificacao.iva_importado !== undefined && dadosClassificacao.iva_importado > 0) {
      iva = dadosClassificacao.iva_importado;
      
      // Salvar o IVA original para referência
      dadosClassificacao.iva_original = dadosClassificacao.iva;
      
      // Se houver uma alíquota específica para importados, utilizá-la
      if (dadosClassificacao.aliq_importado !== undefined && dadosClassificacao.aliq_importado > 0) {
        aliqImportada = dadosClassificacao.aliq_importado;
      }
      
      console.log(`Usando IVA para produto importado: ${iva}% (original: ${dadosClassificacao.iva_original}%)`);
    } else {
      iva = dadosClassificacao.iva || 0;
    }
    
    const aliqInterna = aliqImportada > 0 ? aliqImportada : (dadosClassificacao.aliq_interna || aliqIcms);
    const aliqFcpSt = dadosClassificacao.aliq_fcpst || 0;
    
    // Calcular ST com a nova função - PASSANDO O VALOR DO DESCONTO
    const resultadoST = calcularIcmsST({
      valorBruto: valorBruto, // Usar valor bruto
      valorIpi,
      aliqIcms,
      aliqInterna,
      iva,
      redIcms,
      aliqFcpSt,
      temReducaoIcmsProprio: dadosFiscais?.reducao_somente_icms_proprio === 'S',
      valorDesconto: valorDesconto // Adicionar desconto separadamente
    });
    
    // Extrair valores calculados (já arredondados pela função calcularIcmsST)
    baseIcmsSt = resultadoST.baseIcmsSt;
    valorIcmsSt = resultadoST.valorIcmsSt;
    valorFcpSt = resultadoST.valorFcpSt;
    
    // Guardar detalhes do cálculo para debug/visualização - com valores precisos
    detalhesCalculo = {
      baseIcms: resultadoST.baseIcms,
      valorIcms: resultadoST.valorIcms,
      baseIcmsSt: resultadoST.baseIcmsSt,
      icmsStBruto: resultadoST.icmsStBruto,
      valorIcmsSt: resultadoST.valorIcmsSt,
      valorFcpSt: resultadoST.valorFcpSt,
      iva,
      aliqInterna,
      isImportado, // Adicionar info se é produto importado
      iva_original: dadosClassificacao.iva_original, // Guardar IVA original se for importado
      aliq_importado: aliqImportada // Guardar alíquota específica para importados
    };
  }
  
  // Calcular valores totais
  const valorTotalComImpostos = arredondar(valorLiquido + valorIpi + valorIcmsSt + valorFcpSt);
  const valorTotalSt = arredondar(valorIcmsSt + valorFcpSt);
  
  return {
    valorBruto,         // Valor bruto (quantidade × valor unitário)
    valorDesconto,      // Valor do desconto
    valorLiquido,       // Valor líquido (após desconto)
    baseIcms,           // Base de cálculo do ICMS
    aliqIcms,           // Alíquota de ICMS
    valorIcms,          // Valor do ICMS
    aliqIpi,            // Alíquota de IPI
    valorIpi,           // Valor do IPI
    temST,              // Indica se o produto tem Substituição Tributária
    baseIcmsSt,         // Base de cálculo do ICMS-ST
    valorIcmsSt,        // Valor do ICMS-ST
    valorFcpSt,         // Valor do FCP-ST (Fundo de Combate à Pobreza)
    valorTotalSt,       // Total de ST (ICMS-ST + FCP-ST)
    valorTotalComImpostos, // Valor total com todos os impostos
    cstIcms,            // CST do ICMS
    icmsSt,             // Flag de ST
    isImportado,        // Indica se o produto é importado
    detalhesCalculo     // Detalhes do cálculo para debug/visualização
  };
};

/**
 * Gera uma explicação detalhada passo a passo do cálculo do ICMS-ST
 * Útil para depuração e validação dos cálculos
 * 
 * @deprecated Esta função é apenas para depuração e não deve ser usada em produção.
 * Em produção, utilize a API do backend (fiscalAPI.calcularIcmsST) que consulta
 * as tabelas do banco de dados para obter os valores corretos.
 * 
 * @param {Object} params Os mesmos parâmetros da função calcularIcmsST
 * @returns {Object} Objeto com valores calculados e explicações textuais
 */
export const explicarCalculoIcmsST = (params) => {
  const {
    valorBruto,
    valorIpi = 0,
    aliqIcms = 0,
    aliqInterna = 0,
    iva = 0,
    redIcms = 0,
    aliqFcpSt = 0,
    temReducaoIcmsProprio = false
  } = params;

  // Função de arredondamento para 4 casas decimais
  const arredondar4Casas = (valor) => {
    return Math.round(valor * 10000) / 10000;
  };

  // Formatação de valores monetários
  const formatarMoeda = (valor) => `R$ ${valor.toFixed(4).replace('.', ',')}`;
  const formatarPercentual = (valor) => `${valor.toFixed(4).replace('.', ',')}%`;

  // 1. Cálculo do ICMS básico
  const baseIcms = redIcms > 0 
    ? arredondar4Casas(valorBruto * (1 - (redIcms / 100))) 
    : valorBruto;
  const valorIcms = arredondar4Casas(baseIcms * (aliqIcms / 100));
  
  // 2. Cálculo da Base de Cálculo do ICMS ST
  const valorBase = temReducaoIcmsProprio ? valorBruto : baseIcms;
  const baseIcmsSt = arredondar4Casas((valorBase + valorIpi) * (1 + (iva / 100)));
  
  // 3. Cálculo do ICMS ST
  const icmsStBruto = arredondar4Casas(baseIcmsSt * (aliqInterna / 100));
  
  // 4. Valor Final do ICMS ST
  const valorIcmsSt = arredondar4Casas(Math.max(0, icmsStBruto - valorIcms));
  
  // Calcular FCP-ST
  const valorFcpSt = aliqFcpSt > 0 ? arredondar4Casas(baseIcmsSt * (aliqFcpSt / 100)) : 0;
  
  // Gerar explicações textuais de cada passo
  const explicacoes = [
    {
      titulo: "1. Identificação do Valor do ICMS",
      passos: [
        `Valor Total do Produto: ${formatarMoeda(valorBruto)}`,
        `Alíquota de ICMS: ${formatarPercentual(aliqIcms)}`,
        redIcms > 0 ? 
          `Redução da Base de Cálculo: ${formatarPercentual(redIcms)}` : 
          "Sem redução da base de cálculo do ICMS",
        redIcms > 0 ? 
          `Base de Cálculo do ICMS (com redução): ${formatarMoeda(baseIcms)}` : 
          `Base de Cálculo do ICMS: ${formatarMoeda(baseIcms)}`,
        `Valor do ICMS = ${formatarMoeda(baseIcms)} × ${formatarPercentual(aliqIcms)} = ${formatarMoeda(valorIcms)}`
      ]
    },
    {
      titulo: "2. Cálculo da Base de Cálculo do ICMS ST",
      passos: [
        `Valor Total do Produto: ${formatarMoeda(valorBruto)}`,
        `Valor do IPI: ${formatarMoeda(valorIpi)}`,
        `IVA (Índice de Valor Agregado): ${formatarPercentual(iva)}`,
        `Base para Cálculo ST: ${formatarMoeda(valorBase)}`,
        `Cálculo: (${formatarMoeda(valorBase)} + ${formatarMoeda(valorIpi)}) × (1 + ${formatarPercentual(iva)}/100)`,
        `Base de Cálculo do ICMS ST = ${formatarMoeda(baseIcmsSt)}`
      ]
    },
    {
      titulo: "3. Cálculo do ICMS Substituição Tributária (ST)",
      passos: [
        `Base de Cálculo do ICMS ST: ${formatarMoeda(baseIcmsSt)}`,
        `Alíquota Interna do Estado: ${formatarPercentual(aliqInterna)}`,
        `Cálculo: ${formatarMoeda(baseIcmsSt)} × ${formatarPercentual(aliqInterna)}`,
        `ICMS ST Bruto = ${formatarMoeda(icmsStBruto)}`
      ]
    },
    {
      titulo: "4. Cálculo Final do ICMS Substituição Tributária",
      passos: [
        `ICMS ST Bruto: ${formatarMoeda(icmsStBruto)}`,
        `Valor do ICMS Normal: ${formatarMoeda(valorIcms)}`,
        `Cálculo: ${formatarMoeda(icmsStBruto)} - ${formatarMoeda(valorIcms)}`,
        `Valor Final do ICMS ST = ${formatarMoeda(valorIcmsSt)}`
      ]
    }
  ];
  
  // Se houver FCP-ST, adicionar explicação
  if (aliqFcpSt > 0) {
    explicacoes.push({
      titulo: "5. Cálculo do FCP-ST (Fundo de Combate à Pobreza)",
      passos: [
        `Base de Cálculo: ${formatarMoeda(baseIcmsSt)}`,
        `Alíquota FCP-ST: ${formatarPercentual(aliqFcpSt)}`,
        `Valor do FCP-ST = ${formatarMoeda(baseIcmsSt)} × ${formatarPercentual(aliqFcpSt)} = ${formatarMoeda(valorFcpSt)}`,
        `Valor Total ST (ICMS-ST + FCP-ST) = ${formatarMoeda(valorIcmsSt + valorFcpSt)}`
      ]
    });
  }
  
  // Retornar tanto os valores calculados quanto as explicações
  return {
    resultado: {
      baseIcms,
      baseIcmsSt,
      valorIcms,
      icmsStBruto,
      valorIcmsSt,
      valorFcpSt,
      valorTotalSt: arredondar4Casas(valorIcmsSt + valorFcpSt)
    },
    explicacoes
  };
};

export default {
  calcularIcmsST,
  verificarCSTSubstituicaoTributaria,
  calcularTributos,
  explicarCalculoIcmsST
}; 