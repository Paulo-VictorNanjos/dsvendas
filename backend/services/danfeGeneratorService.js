const xml2js = require('xml2js');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const bwipjs = require('bwip-js');

// Fallback alternativo para geração de PDF
let htmlPdfChrome = null;
try {
  htmlPdfChrome = require('html-pdf-chrome');
} catch (error) {
  console.log('[DanfeGeneratorService] html-pdf-chrome não disponível, usando apenas Puppeteer');
}

/**
 * Serviço para geração de DANFE a partir do XML da NFe
 */
class DanfeGeneratorService {
  
  /**
   * Parseia o XML da NFe e extrai os dados necessários
   * @param {string} xmlString - XML da NFe
   * @returns {Object} - Dados estruturados da NFe
   */
  async parseNFeXML(xmlString) {
    try {
      const parser = new xml2js.Parser({
        explicitArray: false,
        mergeAttrs: true,
        normalize: true,
        trim: true
      });
      
      const result = await parser.parseStringPromise(xmlString);
      
      // Navegar pela estrutura do XML da NFe
      let nfe = null;
      if (result.nfeProc && result.nfeProc.NFe) {
        nfe = result.nfeProc.NFe;
      } else if (result.NFe) {
        nfe = result.NFe;
      } else {
        throw new Error('Estrutura de NFe não encontrada no XML');
      }
      
      const infNFe = nfe.infNFe;
      const ide = infNFe.ide;
      const emit = infNFe.emit;
      const dest = infNFe.dest;
      const det = Array.isArray(infNFe.det) ? infNFe.det : [infNFe.det];
      const total = infNFe.total;
      const transp = infNFe.transp || {};
      const pag = infNFe.pag || {};
      const infAdic = infNFe.infAdic || {};
      
      // Dados do protocolo (se disponível)
      let protNFe = null;
      if (result.nfeProc && result.nfeProc.protNFe) {
        protNFe = result.nfeProc.protNFe.infProt;
      }
      
      return {
        // Identificação da NFe
        identificacao: {
          chaveAcesso: infNFe.Id ? infNFe.Id.replace('NFe', '') : '',
          numeroNF: ide.nNF,
          serie: ide.serie,
          dataEmissao: this.formatDate(ide.dhEmi),
          horaEmissao: this.formatTime(ide.dhEmi),
          tipoOperacao: ide.tpNF === '0' ? 'ENTRADA' : 'SAÍDA',
          naturezaOperacao: ide.natOp,
          formaPagamento: this.getFormaPagamento(ide.indPag),
          tipoAmbiente: ide.tpAmb === '1' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO',
          finalidade: this.getFinalidadeNFe(ide.finNFe),
          consumidorFinal: ide.indFinal === '1' ? 'SIM' : 'NÃO',
          presencaComprador: this.getPresencaComprador(ide.indPres)
        },
        
        // Emitente
        emitente: {
          cnpjCpf: emit.CNPJ || emit.CPF || '',
          razaoSocial: emit.xNome,
          nomeFantasia: emit.xFant || '',
          endereco: this.formatEndereco(emit.enderEmit),
          ie: emit.IE || '',
          iest: emit.IEST || '',
          crt: this.getRegimeTributario(emit.CRT)
        },
        
        // Destinatário
        destinatario: dest ? {
          cnpjCpf: dest.CNPJ || dest.CPF || '',
          razaoSocial: dest.xNome || '',
          endereco: dest.enderDest ? this.formatEndereco(dest.enderDest) : '',
          ie: dest.IE || '',
          email: dest.email || ''
        } : null,
        
        // Produtos/Serviços
        itens: det.map((item, index) => {
          const prod = item.prod;
          const imposto = item.imposto || {};
          
          return {
            numero: index + 1,
            codigo: prod.cProd,
            descricao: prod.xProd,
            ncm: prod.NCM || '',
            cest: prod.CEST || '',
            cfop: prod.CFOP,
            unidade: prod.uCom,
            quantidade: parseFloat(prod.qCom),
            valorUnitario: parseFloat(prod.vUnCom),
            valorTotal: parseFloat(prod.vProd),
            baseCalculoICMS: this.getImpostoValor(imposto, 'ICMS', 'vBC'),
            valorICMS: this.getImpostoValor(imposto, 'ICMS', 'vICMS'),
            valorIPI: this.getImpostoValor(imposto, 'IPI', 'vIPI'),
            aliquotaICMS: this.getImpostoValor(imposto, 'ICMS', 'pICMS'),
            aliquotaIPI: this.getImpostoValor(imposto, 'IPI', 'pIPI')
          };
        }),
        
        // Totais
        totais: {
          baseCalculoICMS: parseFloat(total.ICMSTot.vBC || 0),
          valorICMS: parseFloat(total.ICMSTot.vICMS || 0),
          baseCalculoICMSST: parseFloat(total.ICMSTot.vBCST || 0),
          valorICMSST: parseFloat(total.ICMSTot.vST || 0),
          valorTotalProdutos: parseFloat(total.ICMSTot.vProd || 0),
          valorFrete: parseFloat(total.ICMSTot.vFrete || 0),
          valorSeguro: parseFloat(total.ICMSTot.vSeg || 0),
          valorDesconto: parseFloat(total.ICMSTot.vDesc || 0),
          valorII: parseFloat(total.ICMSTot.vII || 0),
          valorIPI: parseFloat(total.ICMSTot.vIPI || 0),
          valorPIS: parseFloat(total.ICMSTot.vPIS || 0),
          valorCOFINS: parseFloat(total.ICMSTot.vCOFINS || 0),
          valorOutros: parseFloat(total.ICMSTot.vOutro || 0),
          valorTotalNF: parseFloat(total.ICMSTot.vNF || 0)
        },
        
        // Transporte
        transporte: {
          modalidadeFrete: this.getModalidadeFrete(transp.modFrete),
          transportadora: transp.transporta ? {
            cnpjCpf: transp.transporta.CNPJ || transp.transporta.CPF || '',
            razaoSocial: transp.transporta.xNome || '',
            ie: transp.transporta.IE || '',
            endereco: transp.transporta.xEnder || '',
            municipio: transp.transporta.xMun || '',
            uf: transp.transporta.UF || ''
          } : null,
          veiculo: transp.veicTransp ? {
            placa: transp.veicTransp.placa || '',
            uf: transp.veicTransp.UF || '',
            rntc: transp.veicTransp.RNTC || ''
          } : null,
          volumes: transp.vol ? (Array.isArray(transp.vol) ? transp.vol : [transp.vol]).map(vol => ({
            quantidade: vol.qVol || '',
            especie: vol.esp || '',
            marca: vol.marca || '',
            numeracao: vol.nVol || '',
            pesoLiquido: vol.pesoL || '',
            pesoBruto: vol.pesoB || ''
          })) : []
        },
        
        // Pagamento
        pagamento: {
          formas: pag.detPag ? (Array.isArray(pag.detPag) ? pag.detPag : [pag.detPag]).map(forma => ({
            forma: this.getFormaPagamento(forma.tPag),
            valor: parseFloat(forma.vPag || 0)
          })) : []
        },
        
        // Informações adicionais
        informacoesAdicionais: {
          fisco: infAdic.infAdFisco || '',
          contribuinte: infAdic.infCpl || ''
        },
        
        // Protocolo de autorização
        protocolo: protNFe ? {
          numero: protNFe.nProt,
          dataHora: this.formatDateTime(protNFe.dhRecbto),
          status: protNFe.cStat === '100' ? 'AUTORIZADA' : 'REJEITADA'
        } : null
      };
      
    } catch (error) {
      console.error('[DanfeGeneratorService] Erro ao parsear XML:', error);
      throw new Error(`Erro ao processar XML da NFe: ${error.message}`);
    }
  }
  
  /**
   * Gera o HTML da DANFE com os dados da NFe
   * @param {Object} dadosNFe - Dados estruturados da NFe
   * @param {string} barcodeBase64 - Código de barras em base64
   * @returns {string} - HTML da DANFE
   */
  generateDanfeHTML(dadosNFe, barcodeBase64 = null) {
    const { identificacao, emitente, destinatario, itens, totais, transporte, pagamento, informacoesAdicionais, protocolo } = dadosNFe;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>DANFE - ${identificacao.numeroNF}</title>
    <style>
        @page {
            size: A4;
            margin: 3mm;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Times New Roman', serif;
            font-size: 6px;
            line-height: 1.0;
            color: #000;
            background: white;
        }
        
        /* Layout Principal */
        .danfe {
            width: 100%;
            border: 1px solid #000;
            background: white;
        }
        
        /* CABEÇALHO PRINCIPAL */
        .cabecalho {
            display: table;
            width: 100%;
            border-bottom: 1px solid #000;
        }
        .cabecalho-coluna {
            display: table-cell;
            border-right: 1px solid #000;
            vertical-align: top;
            padding: 2mm;
        }
        .cabecalho-coluna:last-child {
            border-right: none;
        }
        
        /* Coluna 1 - Emitente (42%) */
        .col-emitente {
            width: 42%;
        }
        .identificacao-emitente {
            height: 12mm;
            border: 1px solid #000;
            text-align: center;
            font-size: 5px;
            padding: 1mm;
            margin-bottom: 1mm;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }
        .razao-social {
            font-size: 8px;
            font-weight: bold;
            margin-bottom: 1mm;
        }
        .nome-fantasia {
            font-size: 7px;
            margin-bottom: 1mm;
        }
        .endereco-emitente {
            font-size: 6px;
            line-height: 1.1;
        }
        
        /* Coluna 2 - DANFE (28%) */
        .col-danfe {
            width: 28%;
            text-align: center;
            padding: 3mm;
        }
        .danfe-titulo {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 1mm;
            letter-spacing: 1px;
        }
        .danfe-descricao {
            font-size: 7px;
            margin-bottom: 2mm;
            line-height: 1.1;
        }
        .entrada-saida {
            font-size: 6px;
            margin: 2mm 0;
            border: 1px solid #000;
            padding: 1mm;
        }
        .numero-nf {
            font-size: 12px;
            font-weight: bold;
            border: 2px solid #000;
            padding: 2mm;
            margin: 2mm 0;
        }
        .consulta-autenticidade {
            font-size: 5px;
            line-height: 1.0;
            margin-top: 2mm;
        }
        
        /* Coluna 3 - Dados da NF (30%) */
        .col-dados-nf {
            width: 30%;
            padding: 0;
        }
        .dados-nf-interno {
            height: 100%;
            border-collapse: collapse;
            width: 100%;
        }
        .linha-dado {
            border-bottom: 1px solid #000;
            padding: 1mm;
            font-size: 6px;
        }
        .linha-dado:last-child {
            border-bottom: none;
        }
        .label-campo {
            font-size: 4px;
            font-weight: bold;
            display: block;
            margin-bottom: 0.5mm;
            text-transform: uppercase;
        }
        .valor-campo {
            font-size: 7px;
            font-weight: normal;
        }
        
        /* CHAVE DE ACESSO */
        .chave-acesso-section {
            display: table;
            width: 100%;
            border-bottom: 1px solid #000;
            padding: 2mm;
        }
        .chave-dados {
            display: table-cell;
            width: 75%;
            padding-right: 3mm;
            vertical-align: middle;
        }
        .chave-label {
            font-size: 5px;
            font-weight: bold;
            margin-bottom: 1mm;
        }
        .chave-numero {
            font-family: 'Courier New', monospace;
            font-size: 9px;
            font-weight: bold;
            letter-spacing: 0.5px;
            word-spacing: 1px;
        }
        .chave-consulta {
            font-size: 4px;
            margin-top: 1mm;
            line-height: 1.0;
        }
        .codigo-barras {
            display: table-cell;
            width: 25%;
            text-align: center;
            vertical-align: middle;
            border: 1px solid #000;
            height: 12mm;
            background: #ffffff;
        }
        .codigo-barras img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        
        /* SEÇÕES PADRÃO */
        .secao {
            border-bottom: 1px solid #000;
        }
        .titulo-secao {
            background: #ffffff;
            font-size: 6px;
            font-weight: bold;
            padding: 0.5mm 2mm;
            border-bottom: 1px solid #000;
            text-transform: uppercase;
        }
        .campos-linha {
            display: table;
            width: 100%;
        }
        .campo {
            display: table-cell;
            border-right: 1px solid #000;
            padding: 1mm 2mm;
            font-size: 6px;
            vertical-align: top;
        }
        .campo:last-child {
            border-right: none;
        }
        .campo-label {
            font-size: 4px;
            font-weight: bold;
            display: block;
            margin-bottom: 0.5mm;
            text-transform: uppercase;
        }
        .campo-valor {
            font-size: 6px;
            line-height: 1.1;
        }
        
        /* TABELA DE PRODUTOS */
        .produtos-tabela {
            width: 100%;
            border-collapse: collapse;
            font-size: 5px;
        }
        .produtos-tabela th {
            background: #ffffff;
            border: 1px solid #000;
            padding: 0.5mm 1mm;
            font-size: 4px;
            font-weight: bold;
            text-align: center;
            vertical-align: middle;
            line-height: 1.0;
        }
        .produtos-tabela td {
            border: 1px solid #000;
            padding: 0.5mm 1mm;
            font-size: 5px;
            vertical-align: top;
            line-height: 1.0;
        }
        
        /* COLUNAS DA TABELA */
        .col-codigo { width: 8%; }
        .col-descricao { width: 28%; }
        .col-ncm { width: 7%; }
        .col-cst { width: 4%; }
        .col-cfop { width: 5%; }
        .col-un { width: 3%; }
        .col-qtde { width: 6%; text-align: right; }
        .col-vl-unit { width: 7%; text-align: right; }
        .col-vl-total { width: 8%; text-align: right; }
        .col-bc-icms { width: 7%; text-align: right; }
        .col-vl-icms { width: 6%; text-align: right; }
        .col-vl-ipi { width: 5%; text-align: right; }
        .col-aliq-icms { width: 3%; text-align: right; }
        .col-aliq-ipi { width: 3%; text-align: right; }
        
        /* TOTAIS */
        .totais-container {
            display: table;
            width: 100%;
        }
        .totais-esquerda {
            display: table-cell;
            width: 50%;
            border-right: 1px solid #000;
        }
        .totais-direita {
            display: table-cell;
            width: 50%;
        }
        .total-linha {
            display: table;
            width: 100%;
            border-bottom: 1px solid #000;
        }
        .total-linha:last-child {
            border-bottom: none;
        }
        .total-label {
            display: table-cell;
            padding: 1mm 2mm;
            font-size: 5px;
            font-weight: bold;
            border-right: 1px solid #000;
            width: 65%;
        }
        .total-valor {
            display: table-cell;
            padding: 1mm 2mm;
            font-size: 6px;
            text-align: right;
            width: 35%;
        }
        
        /* DADOS ADICIONAIS */
        .dados-adicionais {
            min-height: 8mm;
            padding: 2mm;
            font-size: 5px;
            line-height: 1.1;
        }
        
        /* PROTOCOLO */
        .protocolo {
            text-align: center;
            padding: 2mm;
            font-size: 6px;
            font-weight: bold;
        }
        
        /* UTILITÁRIOS */
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-bold { font-weight: bold; }
        
        /* IMPRESSÃO */
        @media print {
            .danfe { width: 100%; }
            body { margin: 0; }
        }
    </style>
</head>
<body>
    <div class="danfe">
        <!-- CABEÇALHO PRINCIPAL -->
        <div class="cabecalho">
            <div class="cabecalho-coluna col-emitente">
                <div class="identificacao-emitente">
                    IDENTIFICAÇÃO DO EMITENTE
                </div>
                <div class="razao-social">${emitente.razaoSocial}</div>
                ${emitente.nomeFantasia ? `<div class="nome-fantasia">${emitente.nomeFantasia}</div>` : ''}
                <div class="endereco-emitente">${emitente.endereco}</div>
            </div>
            
            <div class="cabecalho-coluna col-danfe">
                <div class="danfe-titulo">DANFE</div>
                <div class="danfe-descricao">DOCUMENTO AUXILIAR DA<br>NOTA FISCAL ELETRÔNICA</div>
                <div class="entrada-saida">
                    <strong>0-ENTRADA</strong> | <strong>1-SAÍDA</strong><br>
                    <span style="font-size: 10px; font-weight: bold;">${identificacao.tipoOperacao === 'SAÍDA' ? '1' : '0'}</span>
                </div>
                <div class="numero-nf">Nº ${identificacao.numeroNF.toString().padStart(9, '0')}</div>
                <div class="consulta-autenticidade">
                    Consulta de autenticidade no portal<br>
                    nacional da NF-e<br>
                    <strong>www.nfe.fazenda.gov.br/portal</strong><br>
                    ou no site da Sefaz Autorizadora
                </div>
            </div>
            
            <div class="cabecalho-coluna col-dados-nf">
                <div class="dados-nf-interno">
                    <div class="linha-dado">
                        <span class="label-campo">SÉRIE</span>
                        <span class="valor-campo">${identificacao.serie.toString().padStart(3, '0')}</span>
                        <span style="margin-left: 5mm;" class="label-campo">NÚMERO</span>
                        <span class="valor-campo">${identificacao.numeroNF.toString().padStart(9, '0')}</span>
                    </div>
                    <div class="linha-dado">
                        <span class="label-campo">FOLHA</span>
                        <span class="valor-campo">1/1</span>
                    </div>
                    <div class="linha-dado">
                        <span class="label-campo">DATA DE EMISSÃO</span>
                        <span class="valor-campo">${identificacao.dataEmissao}</span>
                    </div>
                    <div class="linha-dado">
                        <span class="label-campo">DATA SAÍDA/ENTRADA</span>
                        <span class="valor-campo">${identificacao.dataEmissao}</span>
                    </div>
                    <div class="linha-dado">
                        <span class="label-campo">HORA SAÍDA/ENTRADA</span>
                        <span class="valor-campo">${identificacao.horaEmissao}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- CHAVE DE ACESSO -->
        <div class="chave-acesso-section">
            <div class="chave-dados">
                <div class="chave-label">CHAVE DE ACESSO</div>
                <div class="chave-numero">${this.formatChaveAcesso(identificacao.chaveAcesso)}</div>
                <div class="chave-consulta">
                    Consulta de autenticidade no portal nacional da NF-e 
                    <strong>www.nfe.fazenda.gov.br/portal</strong> ou no site da Sefaz Autorizadora
                </div>
            </div>
            <div class="codigo-barras">
                ${barcodeBase64 ? `<img src="${barcodeBase64}" alt="Código de Barras">` : '<div style="font-size: 5px; line-height: 1.1;">CÓDIGO<br>DE BARRAS</div>'}
            </div>
        </div>
        
        <!-- EMITENTE -->
        <div class="secao">
            <div class="titulo-secao">EMITENTE</div>
            <div class="campos-linha">
                <div class="campo" style="width: 58%;">
                    <span class="campo-label">NOME/RAZÃO SOCIAL</span>
                    <span class="campo-valor">${emitente.razaoSocial}</span>
                </div>
                <div class="campo" style="width: 23%;">
                    <span class="campo-label">CNPJ/CPF</span>
                    <span class="campo-valor">${this.formatCnpjCpf(emitente.cnpjCpf)}</span>
                </div>
                <div class="campo" style="width: 19%;">
                    <span class="campo-label">DATA EMISSÃO</span>
                    <span class="campo-valor">${identificacao.dataEmissao}</span>
                </div>
            </div>
            <div class="campos-linha">
                <div class="campo" style="width: 58%;">
                    <span class="campo-label">ENDEREÇO</span>
                    <span class="campo-valor">${emitente.endereco}</span>
                </div>
                <div class="campo" style="width: 23%;">
                    <span class="campo-label">INSCRIÇÃO ESTADUAL</span>
                    <span class="campo-valor">${emitente.ie}</span>
                </div>
                <div class="campo" style="width: 19%;">
                    <span class="campo-label">DATA SAÍDA/ENTRADA</span>
                    <span class="campo-valor">${identificacao.dataEmissao}</span>
                </div>
            </div>
        </div>
        
        <!-- DESTINATÁRIO -->
        ${destinatario ? `
        <div class="secao">
            <div class="titulo-secao">DESTINATÁRIO/REMETENTE</div>
            <div class="campos-linha">
                <div class="campo" style="width: 58%;">
                    <span class="campo-label">NOME/RAZÃO SOCIAL</span>
                    <span class="campo-valor">${destinatario.razaoSocial}</span>
                </div>
                <div class="campo" style="width: 23%;">
                    <span class="campo-label">CNPJ/CPF</span>
                    <span class="campo-valor">${this.formatCnpjCpf(destinatario.cnpjCpf)}</span>
                </div>
                <div class="campo" style="width: 19%;">
                    <span class="campo-label">DATA EMISSÃO</span>
                    <span class="campo-valor">${identificacao.dataEmissao}</span>
                </div>
            </div>
            <div class="campos-linha">
                <div class="campo" style="width: 58%;">
                    <span class="campo-label">ENDEREÇO</span>
                    <span class="campo-valor">${destinatario.endereco}</span>
                </div>
                <div class="campo" style="width: 23%;">
                    <span class="campo-label">INSCRIÇÃO ESTADUAL</span>
                    <span class="campo-valor">${destinatario.ie}</span>
                </div>
                <div class="campo" style="width: 19%;">
                    <span class="campo-label">HORA SAÍDA</span>
                    <span class="campo-valor">${identificacao.horaEmissao}</span>
                </div>
            </div>
        </div>
        ` : ''}
        
        <!-- FATURA/DUPLICATAS -->
        <div class="secao">
            <div class="titulo-secao">FATURA</div>
            <div class="campos-linha">
                <div class="campo" style="width: 15%;">
                    <span class="campo-label">NÚMERO</span>
                    <span class="campo-valor">${identificacao.numeroNF}</span>
                </div>
                <div class="campo" style="width: 20%;">
                    <span class="campo-label">VALOR ORIGINAL</span>
                    <span class="campo-valor">${this.formatCurrency(totais.valorTotalNF)}</span>
                </div>
                <div class="campo" style="width: 20%;">
                    <span class="campo-label">VALOR DESCONTO</span>
                    <span class="campo-valor">${this.formatCurrency(totais.valorDesconto)}</span>
                </div>
                <div class="campo" style="width: 20%;">
                    <span class="campo-label">VALOR LÍQUIDO</span>
                    <span class="campo-valor">${this.formatCurrency(totais.valorTotalNF - totais.valorDesconto)}</span>
                </div>
                <div class="campo" style="width: 25%;">
                    <span class="campo-label">DUPLICATAS</span>
                    <span class="campo-valor">001 - ${this.formatCurrency(totais.valorTotalNF)}</span>
                </div>
            </div>
        </div>
        
        <!-- CÁLCULO DO IMPOSTO -->
        <div class="secao">
            <div class="titulo-secao">CÁLCULO DO IMPOSTO</div>
            <div class="totais-container">
                <div class="totais-esquerda">
                    <div class="total-linha">
                        <div class="total-label">BASE CÁLC. ICMS</div>
                        <div class="total-valor">${this.formatCurrency(totais.baseCalculoICMS)}</div>
                    </div>
                    <div class="total-linha">
                        <div class="total-label">VALOR FRETE</div>
                        <div class="total-valor">${this.formatCurrency(totais.valorFrete)}</div>
                    </div>
                    <div class="total-linha">
                        <div class="total-label">VALOR SEGURO</div>
                        <div class="total-valor">${this.formatCurrency(totais.valorSeguro)}</div>
                    </div>
                    <div class="total-linha">
                        <div class="total-label">DESCONTO</div>
                        <div class="total-valor">${this.formatCurrency(totais.valorDesconto)}</div>
                    </div>
                </div>
                <div class="totais-direita">
                    <div class="total-linha">
                        <div class="total-label">VALOR ICMS</div>
                        <div class="total-valor">${this.formatCurrency(totais.valorICMS)}</div>
                    </div>
                    <div class="total-linha">
                        <div class="total-label">OUTRAS DESP. ACESS.</div>
                        <div class="total-valor">${this.formatCurrency(totais.valorOutros)}</div>
                    </div>
                    <div class="total-linha">
                        <div class="total-label">VALOR IPI</div>
                        <div class="total-valor">${this.formatCurrency(totais.valorIPI)}</div>
                    </div>
                    <div class="total-linha">
                        <div class="total-label">VALOR TOTAL NOTA</div>
                        <div class="total-valor text-bold">${this.formatCurrency(totais.valorTotalNF)}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- TRANSPORTADOR/VOLUMES -->
        <div class="secao">
            <div class="titulo-secao">TRANSPORTADOR / VOLUMES TRANSPORTADOS</div>
            <div class="campos-linha">
                <div class="campo" style="width: 38%;">
                    <span class="campo-label">RAZÃO SOCIAL</span>
                    <span class="campo-valor">${transporte.transportadora?.razaoSocial || ''}</span>
                </div>
                <div class="campo" style="width: 12%;">
                    <span class="campo-label">FRETE POR CONTA</span>
                    <span class="campo-valor">${transporte.modalidadeFrete}</span>
                </div>
                <div class="campo" style="width: 12%;">
                    <span class="campo-label">CÓDIGO ANTT</span>
                    <span class="campo-valor">${transporte.veiculo?.rntc || ''}</span>
                </div>
                <div class="campo" style="width: 12%;">
                    <span class="campo-label">PLACA VEÍCULO</span>
                    <span class="campo-valor">${transporte.veiculo?.placa || ''}</span>
                </div>
                <div class="campo" style="width: 4%;">
                    <span class="campo-label">UF</span>
                    <span class="campo-valor">${transporte.veiculo?.uf || ''}</span>
                </div>
                <div class="campo" style="width: 22%;">
                    <span class="campo-label">CNPJ/CPF</span>
                    <span class="campo-valor">${this.formatCnpjCpf(transporte.transportadora?.cnpjCpf || '')}</span>
                </div>
            </div>
            <div class="campos-linha">
                <div class="campo" style="width: 50%;">
                    <span class="campo-label">ENDEREÇO</span>
                    <span class="campo-valor">${transporte.transportadora?.endereco || ''}</span>
                </div>
                <div class="campo" style="width: 20%;">
                    <span class="campo-label">MUNICÍPIO</span>
                    <span class="campo-valor">${transporte.transportadora?.municipio || ''}</span>
                </div>
                <div class="campo" style="width: 5%;">
                    <span class="campo-label">UF</span>
                    <span class="campo-valor">${transporte.transportadora?.uf || ''}</span>
                </div>
                <div class="campo" style="width: 25%;">
                    <span class="campo-label">INSCRIÇÃO ESTADUAL</span>
                    <span class="campo-valor">${transporte.transportadora?.ie || ''}</span>
                </div>
            </div>
            <div class="campos-linha">
                <div class="campo" style="width: 8%;">
                    <span class="campo-label">QUANTIDADE</span>
                    <span class="campo-valor">${transporte.volumes[0]?.quantidade || ''}</span>
                </div>
                <div class="campo" style="width: 18%;">
                    <span class="campo-label">ESPÉCIE</span>
                    <span class="campo-valor">${transporte.volumes[0]?.especie || ''}</span>
                </div>
                <div class="campo" style="width: 18%;">
                    <span class="campo-label">MARCA</span>
                    <span class="campo-valor">${transporte.volumes[0]?.marca || ''}</span>
                </div>
                <div class="campo" style="width: 18%;">
                    <span class="campo-label">NUMERAÇÃO</span>
                    <span class="campo-valor">${transporte.volumes[0]?.numeracao || ''}</span>
                </div>
                <div class="campo" style="width: 19%;">
                    <span class="campo-label">PESO BRUTO (kg)</span>
                    <span class="campo-valor">${transporte.volumes[0]?.pesoBruto || ''}</span>
                </div>
                <div class="campo" style="width: 19%;">
                    <span class="campo-label">PESO LÍQUIDO (kg)</span>
                    <span class="campo-valor">${transporte.volumes[0]?.pesoLiquido || ''}</span>
                </div>
            </div>
        </div>
        
        <!-- DADOS DOS PRODUTOS/SERVIÇOS -->
        <div class="secao">
            <div class="titulo-secao">DADOS DOS PRODUTOS / SERVIÇOS</div>
            <table class="produtos-tabela">
                <thead>
                    <tr>
                        <th class="col-codigo">CÓDIGO<br>PRODUTO /<br>SERVIÇO</th>
                        <th class="col-descricao">DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
                        <th class="col-ncm">NCM/SH</th>
                        <th class="col-cst">CST</th>
                        <th class="col-cfop">CFOP</th>
                        <th class="col-un">UN</th>
                        <th class="col-qtde">QTDE</th>
                        <th class="col-vl-unit">VL UNIT</th>
                        <th class="col-vl-total">VL TOTAL</th>
                        <th class="col-bc-icms">BC ICMS</th>
                        <th class="col-vl-icms">VL ICMS</th>
                        <th class="col-vl-ipi">VL IPI</th>
                        <th class="col-aliq-icms">ALIQ<br>ICMS</th>
                        <th class="col-aliq-ipi">ALIQ<br>IPI</th>
                    </tr>
                </thead>
                <tbody>
                    ${itens.map(item => `
                        <tr>
                            <td class="col-codigo text-center">${item.codigo}</td>
                            <td class="col-descricao">${item.descricao}</td>
                            <td class="col-ncm text-center">${item.ncm}</td>
                            <td class="col-cst text-center">000</td>
                            <td class="col-cfop text-center">${item.cfop}</td>
                            <td class="col-un text-center">${item.unidade}</td>
                            <td class="col-qtde text-right">${this.formatNumber(item.quantidade, 4)}</td>
                            <td class="col-vl-unit text-right">${this.formatCurrency(item.valorUnitario)}</td>
                            <td class="col-vl-total text-right">${this.formatCurrency(item.valorTotal)}</td>
                            <td class="col-bc-icms text-right">${this.formatCurrency(item.baseCalculoICMS)}</td>
                            <td class="col-vl-icms text-right">${this.formatCurrency(item.valorICMS)}</td>
                            <td class="col-vl-ipi text-right">${this.formatCurrency(item.valorIPI)}</td>
                            <td class="col-aliq-icms text-right">${this.formatNumber(item.aliquotaICMS, 2)}</td>
                            <td class="col-aliq-ipi text-right">${this.formatNumber(item.aliquotaIPI, 2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <!-- DADOS ADICIONAIS -->
        <div class="secao">
            <div class="titulo-secao">DADOS ADICIONAIS</div>
            <div class="campos-linha">
                <div class="campo" style="width: 70%;">
                    <span class="campo-label">INFORMAÇÕES COMPLEMENTARES</span>
                    <div class="dados-adicionais">
                        ${informacoesAdicionais.contribuinte}<br>
                        ${informacoesAdicionais.fisco}
                        ${identificacao.tipoAmbiente === 'HOMOLOGAÇÃO' ? '<br><br><strong>AMBIENTE DE HOMOLOGAÇÃO - NF-E SEM VALOR FISCAL</strong>' : ''}
                    </div>
                </div>
                <div class="campo" style="width: 30%;">
                    <span class="campo-label">RESERVADO AO FISCO</span>
                    <div class="dados-adicionais"></div>
                </div>
            </div>
        </div>
        
        <!-- PROTOCOLO -->
        ${protocolo ? `
        <div class="protocolo">
            <strong>NF-e Nº ${identificacao.numeroNF.toString().padStart(9, '0')} SÉRIE ${identificacao.serie.toString().padStart(3, '0')}</strong>
            <br>
            Protocolo de Autorização: ${protocolo.numero} - ${protocolo.dataHora}
        </div>
        ` : ''}
    </div>
</body>
</html>
    `;
  }
  
  /**
   * Gera DANFE completa a partir do XML
   * @param {string} xmlString - XML da NFe
   * @returns {Buffer} - Buffer do PDF da DANFE
   */
  async generateDanfe(xmlString) {
    try {
      console.log('[DanfeGeneratorService] Iniciando geração de DANFE própria');
      
      // 1. Parsear XML
      const dadosNFe = await this.parseNFeXML(xmlString);
      console.log('[DanfeGeneratorService] XML parseado com sucesso');
      
      // 2. Gerar código de barras oficial
      console.log('[DanfeGeneratorService] Gerando código de barras oficial...');
      const barcodeBase64 = await this.generateBarcode(dadosNFe.identificacao.chaveAcesso);
      if (barcodeBase64) {
        console.log('[DanfeGeneratorService] Código de barras oficial gerado');
      } else {
        console.log('[DanfeGeneratorService] Código de barras não pôde ser gerado, usando fallback');
      }
      
      // 3. Gerar HTML com código de barras
      const html = this.generateDanfeHTML(dadosNFe, barcodeBase64);
      console.log('[DanfeGeneratorService] HTML da DANFE gerado');
      
      // 4. Gerar PDF usando a mesma abordagem que funcionou no teste
      console.log('[DanfeGeneratorService] Gerando PDF da DANFE...');
      const pdfBuffer = await this.generatePDFSimplified(html);
      console.log('[DanfeGeneratorService] PDF da DANFE gerado com sucesso');
      return pdfBuffer;
      
    } catch (error) {
      console.error('[DanfeGeneratorService] Erro ao gerar DANFE:', error);
      
      // Fornecer informações mais detalhadas sobre o erro
      if (error.message.includes('waitForTimeout')) {
        throw new Error('Erro de compatibilidade do Puppeteer. Versão do Chrome/Puppeteer pode estar desatualizada.');
      } else if (error.message.includes('Target closed')) {
        throw new Error('Browser foi fechado durante a geração. Pode ser um problema de recursos do sistema.');
      } else if (error.message.includes('Protocol error')) {
        throw new Error('Erro de comunicação com o browser Chrome. Tente novamente.');
      } else {
        throw new Error(`Erro na geração da DANFE: ${error.message}`);
      }
    }
  }
  
  /**
   * Gera PDF usando a abordagem simplificada que sabemos que funciona
   * @param {string} html - HTML da DANFE
   * @returns {Buffer} - Buffer do PDF
   */
  async generatePDFSimplified(html) {
    let browser = null;
    
    try {
      console.log('[DanfeGeneratorService] Iniciando geração PDF simplificada...');
      
      // Usar a mesma configuração que funcionou no teste
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox']
      });
      
      const page = await browser.newPage();
      
      console.log('[DanfeGeneratorService] Carregando HTML da DANFE...');
      await page.setContent(html, { waitUntil: 'load' });
      
      console.log('[DanfeGeneratorService] Gerando PDF...');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '10mm',
          bottom: '10mm',
          left: '10mm',
          right: '10mm'
        },
        printBackground: true
      });
      
      // Validação e conversão se necessário (usando a mesma lógica do teste)
      console.log('[DanfeGeneratorService] Validando buffer...');
      console.log('[DanfeGeneratorService] Tipo do objeto:', typeof pdfBuffer);
      console.log('[DanfeGeneratorService] É Buffer?', Buffer.isBuffer(pdfBuffer));
      console.log('[DanfeGeneratorService] Tamanho:', pdfBuffer?.length);
      
      if (!pdfBuffer) {
        throw new Error('PDF buffer é null/undefined');
      }
      
      let bufferFinal = pdfBuffer;
      
      if (!Buffer.isBuffer(pdfBuffer)) {
        console.log('[DanfeGeneratorService] Convertendo para Buffer...');
        
        if (pdfBuffer.constructor && pdfBuffer.constructor.name === 'Uint8Array') {
          bufferFinal = Buffer.from(pdfBuffer);
        } else {
          bufferFinal = Buffer.from(pdfBuffer);
        }
        
        console.log('[DanfeGeneratorService] Buffer convertido:', Buffer.isBuffer(bufferFinal));
      }
      
      console.log(`[DanfeGeneratorService] PDF DANFE gerado: ${bufferFinal.length} bytes`);
      return bufferFinal;
      
    } catch (error) {
      console.error('[DanfeGeneratorService] Erro na geração simplificada:', error.message);
      throw new Error(`Erro na geração simplificada: ${error.message}`);
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          console.log('Erro ao fechar browser simplificado:', e.message);
        }
      }
    }
  }
  
  // Métodos auxiliares de formatação
  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  }
  
  formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR');
  }
  
  formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  }
  
  formatCnpjCpf(documento) {
    if (!documento) return '';
    documento = documento.replace(/\D/g, '');
    if (documento.length === 11) {
      return documento.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (documento.length === 14) {
      return documento.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return documento;
  }
  
  formatChaveAcesso(chave) {
    if (!chave) return '';
    return chave.replace(/(\d{4})/g, '$1 ').trim();
  }
  
  formatCurrency(value) {
    if (!value) return '0,00';
    return parseFloat(value).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  formatNumber(value, decimals = 2) {
    if (!value) return '0,00';
    return parseFloat(value).toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }
  
  formatEndereco(endereco) {
    if (!endereco) return '';
    const parts = [
      endereco.xLgr,
      endereco.nro,
      endereco.xCpl,
      endereco.xBairro,
      endereco.xMun,
      endereco.UF,
      endereco.CEP ? endereco.CEP.replace(/(\d{5})(\d{3})/, '$1-$2') : ''
    ].filter(Boolean);
    return parts.join(', ');
  }
  
  getFormaPagamento(codigo) {
    const formas = {
      '01': 'Dinheiro',
      '02': 'Cheque',
      '03': 'Cartão de Crédito',
      '04': 'Cartão de Débito',
      '05': 'Crédito Loja',
      '10': 'Vale Alimentação',
      '11': 'Vale Refeição',
      '12': 'Vale Presente',
      '13': 'Vale Combustível',
      '14': 'Duplicata Mercantil',
      '15': 'Boleto Bancário',
      '90': 'Sem Pagamento',
      '99': 'Outros'
    };
    return formas[codigo] || 'Não informado';
  }
  
  getFinalidadeNFe(codigo) {
    const finalidades = {
      '1': 'Normal',
      '2': 'Complementar',
      '3': 'Ajuste',
      '4': 'Devolução'
    };
    return finalidades[codigo] || 'Normal';
  }
  
  getPresencaComprador(codigo) {
    const presencas = {
      '0': 'Não se aplica',
      '1': 'Operação presencial',
      '2': 'Operação não presencial, pela Internet',
      '3': 'Operação não presencial, Teleatendimento',
      '4': 'NFC-e em operação com entrega a domicílio',
      '9': 'Operação não presencial, outros'
    };
    return presencas[codigo] || 'Não informado';
  }
  
  getRegimeTributario(codigo) {
    const regimes = {
      '1': 'Simples Nacional',
      '2': 'Simples Nacional - excesso de sublimite',
      '3': 'Regime Normal'
    };
    return regimes[codigo] || 'Não informado';
  }
  
  getModalidadeFrete(codigo) {
    const modalidades = {
      '0': 'Por conta do emitente',
      '1': 'Por conta do destinatário',
      '2': 'Por conta de terceiros',
      '9': 'Sem frete'
    };
    return modalidades[codigo] || 'Não informado';
  }
  
  getImpostoValor(imposto, tipoImposto, campo) {
    try {
      if (!imposto || !imposto[tipoImposto]) return 0;
      
      const impostoData = imposto[tipoImposto];
      
      // Navegar pelas estruturas possíveis do imposto
      if (impostoData[campo]) {
        return parseFloat(impostoData[campo]) || 0;
      }
      
      // Verificar estruturas específicas (ex: ICMS00, ICMS10, etc.)
      for (const key in impostoData) {
        if (impostoData[key] && impostoData[key][campo]) {
          return parseFloat(impostoData[key][campo]) || 0;
        }
      }
      
      return 0;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Método de teste para verificar se o Puppeteer está funcionando
   * @returns {Buffer} - Buffer de PDF de teste
   */
  async testPuppeteer() {
    let browser = null;
    let page = null;
    
    try {
      console.log('[DanfeGeneratorService] Testando Puppeteer...');
      
      const simpleHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Teste</title>
        </head>
        <body>
          <h1>Teste de PDF</h1>
          <p>Este é um teste simples do Puppeteer.</p>
        </body>
        </html>
      `;
      
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 30000
      });
      
      page = await browser.newPage();
      await page.setContent(simpleHTML);
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true
      });
      
      console.log(`[DanfeGeneratorService] Teste bem-sucedido: ${pdfBuffer.length} bytes`);
      return pdfBuffer;
      
    } catch (error) {
      console.error('[DanfeGeneratorService] Teste falhou:', error);
      throw error;
    } finally {
      try {
        if (page) await page.close();
        if (browser) await browser.close();
      } catch (e) {
        console.log('Erro no cleanup do teste:', e.message);
      }
    }
  }
  
  /**
   * Método de teste básico para PDF mínimo
   * @returns {Buffer} - Buffer de PDF básico
   */
  async generateBasicPDF() {
    let browser = null;
    
    try {
      console.log('[DanfeGeneratorService] Teste PDF básico...');
      
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox']
      });
      
      const page = await browser.newPage();
      
      // HTML mínimo
      await page.setContent(`
        <html>
          <body>
            <h1>PDF TESTE</h1>
            <p>Este é um teste básico.</p>
          </body>
        </html>
      `);
      
      console.log('[DanfeGeneratorService] Gerando PDF...');
      const pdfBuffer = await page.pdf({
        format: 'A4'
      });
      
      // Validação completa do buffer
      console.log('[DanfeGeneratorService] Validando buffer...');
      console.log('[DanfeGeneratorService] Tipo do objeto:', typeof pdfBuffer);
      console.log('[DanfeGeneratorService] É Buffer?', Buffer.isBuffer(pdfBuffer));
      console.log('[DanfeGeneratorService] Constructor:', pdfBuffer?.constructor?.name);
      console.log('[DanfeGeneratorService] Tamanho:', pdfBuffer?.length);
      
      if (!pdfBuffer) {
        throw new Error('PDF buffer é null/undefined');
      }
      
      if (!Buffer.isBuffer(pdfBuffer)) {
        console.log('[DanfeGeneratorService] Tentando converter para Buffer...');
        // Tentar converter se não for um Buffer
        const convertedBuffer = Buffer.from(pdfBuffer);
        console.log('[DanfeGeneratorService] Buffer convertido:', Buffer.isBuffer(convertedBuffer));
        console.log(`[DanfeGeneratorService] PDF básico OK: ${convertedBuffer.length} bytes`);
        return convertedBuffer;
      }
      
      console.log(`[DanfeGeneratorService] PDF básico OK: ${pdfBuffer.length} bytes`);
      return pdfBuffer;
      
    } catch (error) {
      console.error('[DanfeGeneratorService] Erro PDF básico:', error);
      throw error;
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          console.log('Erro ao fechar browser:', e.message);
        }
      }
    }
  }
  
  /**
   * Gera código de barras oficial da NFe em base64
   * @param {string} chaveAcesso - Chave de acesso de 44 dígitos da NFe
   * @returns {string} - Código de barras em base64
   */
  async generateBarcode(chaveAcesso) {
    try {
      if (!chaveAcesso || chaveAcesso.length !== 44) {
        console.log('[DanfeGeneratorService] Chave de acesso inválida para código de barras');
        return null;
      }
      
      console.log('[DanfeGeneratorService] Gerando código de barras para chave:', chaveAcesso);
      
      // Gerar código de barras Code128 com a chave de acesso
      const barcodeBuffer = await bwipjs.toBuffer({
        bcid: 'code128',       // Tipo de código de barras (Code128)
        text: chaveAcesso,     // Texto do código (chave de acesso)
        scale: 3,              // Escala
        height: 10,            // Altura em mm
        includetext: false,    // Não incluir texto abaixo do código
        textxalign: 'center',  // Alinhamento do texto
      });
      
      // Converter para base64
      const barcodeBase64 = barcodeBuffer.toString('base64');
      console.log('[DanfeGeneratorService] Código de barras gerado com sucesso');
      
      return `data:image/png;base64,${barcodeBase64}`;
      
    } catch (error) {
      console.error('[DanfeGeneratorService] Erro ao gerar código de barras:', error);
      return null;
    }
  }
}

module.exports = new DanfeGeneratorService(); 