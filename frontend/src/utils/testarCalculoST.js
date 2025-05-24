/**
 * Script para testar os cálculos de ICMS-ST
 * 
 * Para executar este script no navegador, insira este código no console do desenvolvedor
 * ou crie um componente de teste que o utilize.
 * 
 * Para executar no Node.js, descomente a linha de importação abaixo e execute:
 * node --experimental-modules testarCalculoST.js
 */

// Importação para browser
// A função calcularIcmsST já está importada no escopo global quando este script é executado no navegador

/* 
// Importação para Node.js (descomente para usar)
import { calcularIcmsST } from './calculoFiscal.js';
*/

// Definimos a função de cálculo direto para testes independentes
function calcularIcmsSTLocal(params) {
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

  // Calcular base de ICMS com redução (se houver)
  const baseIcms = redIcms > 0 
    ? valorBruto * (1 - (redIcms / 100)) 
    : valorBruto;

  // Calcular ICMS próprio
  const valorIcms = baseIcms * (aliqIcms / 100);
  
  // Calcular base ICMS-ST
  // Se a redução for apenas para ICMS próprio, a base do ST usa o valor bruto
  const valorBase = temReducaoIcmsProprio ? valorBruto : baseIcms;
  // Base ST = (valorBase + IPI) * (1 + IVA/100)
  const baseIcmsSt = ((valorBase + valorIpi) * (1 + (iva / 100)));
  
  // Calcular ICMS-ST: (Base ST * Alíquota Interna) - ICMS próprio
  let valorIcmsSt = (baseIcmsSt * (aliqInterna / 100)) - valorIcms;
  
  // Se o valor for negativo, definir como zero
  if (valorIcmsSt < 0) valorIcmsSt = 0;
  
  // Calcular FCP-ST se aplicável
  const valorFcpSt = aliqFcpSt > 0 ? baseIcmsSt * (aliqFcpSt / 100) : 0;
  
  return {
    baseIcms,
    baseIcmsSt,
    valorIcms,
    valorIcmsSt,
    valorFcpSt,
    valorTotalSt: valorIcmsSt + valorFcpSt
  };
}

// Função para formatar valor monetário
const formatarValor = (valor) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

// Função para formatar porcentagem
const formatarPorcentagem = (valor) => {
  return `${valor.toFixed(2)}%`;
};

// Cenários de teste
const cenarios = [
  {
    nome: "Produto padrão com ST",
    valorBruto: 1000,
    valorIpi: 50,
    aliqIcms: 12,
    aliqInterna: 18,
    iva: 40,
    redIcms: 0,
    aliqFcpSt: 2,
    temReducaoIcmsProprio: false
  },
  {
    nome: "Produto com ST e redução de BC",
    valorBruto: 1000,
    valorIpi: 50,
    aliqIcms: 12,
    aliqInterna: 18,
    iva: 40,
    redIcms: 20,
    aliqFcpSt: 2,
    temReducaoIcmsProprio: false
  },
  {
    nome: "Produto com redução somente no ICMS próprio",
    valorBruto: 1000,
    valorIpi: 50,
    aliqIcms: 12,
    aliqInterna: 18,
    iva: 40,
    redIcms: 20,
    aliqFcpSt: 2,
    temReducaoIcmsProprio: true
  },
  {
    nome: "Produto com IVA elevado",
    valorBruto: 1000,
    valorIpi: 50,
    aliqIcms: 12,
    aliqInterna: 18,
    iva: 100,
    redIcms: 0,
    aliqFcpSt: 2,
    temReducaoIcmsProprio: false
  },
  {
    nome: "Produto sem ST - Mesmo estado",
    valorBruto: 1000,
    valorIpi: 50,
    aliqIcms: 18,
    aliqInterna: 18,
    iva: 0,
    redIcms: 0,
    aliqFcpSt: 0,
    temReducaoIcmsProprio: false
  }
];

// Função principal para executar testes
function executarTestesST() {
  let resultado = "\n==== TESTES DE CÁLCULO DE ICMS-ST ====\n\n";

  cenarios.forEach((cenario, index) => {
    resultado += `\n[Cenário ${index + 1}] ${cenario.nome}\n\n`;
    resultado += "Parâmetros:\n";
    resultado += `  Valor Bruto: ${formatarValor(cenario.valorBruto)}\n`;
    resultado += `  Valor IPI: ${formatarValor(cenario.valorIpi)}\n`;
    resultado += `  Alíquota ICMS: ${formatarPorcentagem(cenario.aliqIcms)}\n`;
    resultado += `  Alíquota Interna: ${formatarPorcentagem(cenario.aliqInterna)}\n`;
    resultado += `  IVA (MVA): ${formatarPorcentagem(cenario.iva)}\n`;
    resultado += `  Redução BC: ${formatarPorcentagem(cenario.redIcms)}\n`;
    resultado += `  Alíquota FCP-ST: ${formatarPorcentagem(cenario.aliqFcpSt)}\n`;
    resultado += `  Redução somente ICMS próprio: ${cenario.temReducaoIcmsProprio ? 'Sim' : 'Não'}\n`;
    
    // Usar a função local para cálculo nos testes
    const resultadoCalc = calcularIcmsSTLocal(cenario);
    
    resultado += "\nResultados:\n";
    resultado += `  Base ICMS: ${formatarValor(resultadoCalc.baseIcms)}\n`;
    resultado += `  Valor ICMS: ${formatarValor(resultadoCalc.valorIcms)}\n`;
    resultado += `  Base ICMS-ST: ${formatarValor(resultadoCalc.baseIcmsSt)}\n`;
    resultado += `  Valor ICMS-ST: ${formatarValor(resultadoCalc.valorIcmsSt)}\n`;
    resultado += `  Valor FCP-ST: ${formatarValor(resultadoCalc.valorFcpSt)}\n`;
    resultado += `  TOTAL ST: ${formatarValor(resultadoCalc.valorTotalSt)}\n`;
    
    // Imposto total
    const impostoTotal = resultadoCalc.valorIcms + resultadoCalc.valorIcmsSt + resultadoCalc.valorFcpSt;
    const percentualEfetivo = (impostoTotal / cenario.valorBruto) * 100;
    
    resultado += `\n  Imposto Total: ${formatarValor(impostoTotal)} (${formatarPorcentagem(percentualEfetivo)} do valor bruto)\n`;
  });

  resultado += "\n==== FIM DOS TESTES ====\n";
  return resultado;
}

// Se executado diretamente no Node.js
if (typeof window === 'undefined') {
  console.log(executarTestesST());
}

// Exportar funções para uso no navegador
export {
  calcularIcmsSTLocal,
  executarTestesST,
  cenarios
}; 