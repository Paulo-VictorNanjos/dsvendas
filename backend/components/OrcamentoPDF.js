const PDFDocument = require('pdfkit');

class OrcamentoPDF {
  static async generatePDF(dados) {
    return new Promise((resolve, reject) => {
      try {
        const { orcamento, cliente, vendedor, pagamento } = dados;
        
        const doc = new PDFDocument({ 
          size: 'A4',
          margin: 30,
          info: {
            Title: `Orçamento ${this.formatOrcamentoCodigo(orcamento.codigo)}`,
            Author: 'DSVENDAS',
            Subject: 'Orçamento',
            Keywords: 'orçamento, vendas'
          }
        });
        
        const buffers = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Cores
        const primaryColor = '#0984e3';
        const grayColor = '#636e72';
        const lightGray = '#f5f6fa';
        
        // Cabeçalho
        doc.fontSize(18)
           .fillColor(primaryColor)
           .text(`Orçamento ${this.formatOrcamentoCodigo(orcamento.codigo)}`, 30, 30);
           
        doc.fontSize(10)
           .fillColor(grayColor)
           .text(`Data: ${this.formatDate(orcamento.dt_orcamento)}`, 30, 55);

        // Linha separadora
        doc.moveTo(30, 75)
           .lineTo(565, 75)
           .strokeColor(primaryColor)
           .lineWidth(2)
           .stroke();

        let yPosition = 95;

        // Informações do Cliente
        doc.fontSize(11)
           .fillColor(primaryColor)
           .text('DADOS DO CLIENTE', 30, yPosition);
           
        yPosition += 20;
        
        if (cliente) {
          doc.fontSize(9)
             .fillColor('black')
             .text(`Nome: ${cliente.nome || '-'}`, 30, yPosition);
          yPosition += 12;
          
          doc.text(`CNPJ/CPF: ${cliente.cnpj || cliente.cpf || '-'}`, 30, yPosition);
          yPosition += 12;
          
          doc.text(`Endereço: ${cliente.endereco || '-'}, ${cliente.numero || ''} - ${cliente.bairro || '-'}`, 30, yPosition);
          yPosition += 12;
          
          doc.text(`Cidade: ${cliente.cidade || '-'} - ${cliente.uf || '-'} - CEP: ${cliente.cep || '-'}`, 30, yPosition);
          yPosition += 12;
          
          if (cliente.telefone) {
            doc.text(`Telefone: ${cliente.telefone}`, 30, yPosition);
            yPosition += 12;
          }
        }

        yPosition += 10;

        // Informações do Vendedor
        if (vendedor) {
          doc.fontSize(11)
             .fillColor(primaryColor)
             .text('VENDEDOR', 30, yPosition);
             
          yPosition += 20;
          
          doc.fontSize(9)
             .fillColor('black')
             .text(`Nome: ${vendedor.nome || '-'}`, 30, yPosition);
          yPosition += 12;
          
          if (vendedor.telefone) {
            doc.text(`Telefone: ${vendedor.telefone}`, 30, yPosition);
            yPosition += 12;
          }
        }

        yPosition += 15;

        // Tabela de Itens
        doc.fontSize(11)
           .fillColor(primaryColor)
           .text('ITENS DO ORÇAMENTO', 30, yPosition);
           
        yPosition += 20;

        // Cabeçalho da tabela
        const tableTop = yPosition;
        const colWidths = {
          codigo: 50,
          descricao: 180,
          qtde: 40,
          un: 30,
          vlUnit: 60,
          desc: 40,
          ipi: 50,
          st: 50,
          vlLiq: 60,
          total: 65
        };

        let xPosition = 30;
        
        // Fundo do cabeçalho
        doc.rect(30, yPosition - 5, 535, 20)
           .fillColor(primaryColor)
           .fill();

        doc.fontSize(8)
           .fillColor('white');

        doc.text('Cód', xPosition, yPosition);
        xPosition += colWidths.codigo;
        
        doc.text('Descrição', xPosition, yPosition);
        xPosition += colWidths.descricao;
        
        doc.text('Qtde', xPosition, yPosition);
        xPosition += colWidths.qtde;
        
        doc.text('Un', xPosition, yPosition);
        xPosition += colWidths.un;
        
        doc.text('Vl. Unit', xPosition, yPosition);
        xPosition += colWidths.vlUnit;
        
        doc.text('Desc', xPosition, yPosition);
        xPosition += colWidths.desc;
        
        doc.text('IPI', xPosition, yPosition);
        xPosition += colWidths.ipi;
        
        doc.text('ST', xPosition, yPosition);
        xPosition += colWidths.st;
        
        doc.text('Vl. Líq', xPosition, yPosition);
        xPosition += colWidths.vlLiq;
        
        doc.text('Total', xPosition, yPosition);

        yPosition += 25;

        // Itens
        let totalGeral = 0;
        let totalIPI = 0;
        let totalST = 0;
        let totalDesconto = 0;

        if (orcamento.itens && orcamento.itens.length > 0) {
          orcamento.itens.forEach((item, index) => {
            // Verificar se precisa de nova página
            if (yPosition > 700) {
              doc.addPage();
              yPosition = 50;
            }

            // Fundo alternado
            if (index % 2 === 0) {
              doc.rect(30, yPosition - 3, 535, 15)
                 .fillColor(lightGray)
                 .fill();
            }

            xPosition = 30;
            
            doc.fontSize(8)
               .fillColor('black');

            // Código
            doc.text(item.codigo || '-', xPosition, yPosition);
            xPosition += colWidths.codigo;
            
            // Descrição (truncar se muito longa)
            const descricao = (item.descricao || '').substring(0, 25);
            doc.text(descricao, xPosition, yPosition);
            xPosition += colWidths.descricao;
            
            // Quantidade
            doc.text(this.formatNumber(item.quantidade), xPosition, yPosition, { align: 'right', width: colWidths.qtde - 5 });
            xPosition += colWidths.qtde;
            
            // Unidade
            doc.text(item.unidade || 'UN', xPosition, yPosition, { align: 'center', width: colWidths.un - 5 });
            xPosition += colWidths.un;
            
            // Valor Unitário
            doc.text(this.formatCurrency(item.valor_unitario), xPosition, yPosition, { align: 'right', width: colWidths.vlUnit - 5 });
            xPosition += colWidths.vlUnit;
            
            // Desconto
            const desconto = item.desconto || 0;
            doc.text(this.formatCurrency(desconto), xPosition, yPosition, { align: 'right', width: colWidths.desc - 5 });
            xPosition += colWidths.desc;
            
            // IPI
            const ipi = item.valor_ipi || 0;
            doc.text(this.formatCurrency(ipi), xPosition, yPosition, { align: 'right', width: colWidths.ipi - 5 });
            xPosition += colWidths.ipi;
            
            // ST
            const st = item.valor_icms_st || 0;
            doc.text(this.formatCurrency(st), xPosition, yPosition, { align: 'right', width: colWidths.st - 5 });
            xPosition += colWidths.st;
            
            // Valor Líquido
            const valorLiquido = (item.valor_unitario * item.quantidade) - desconto;
            doc.text(this.formatCurrency(valorLiquido), xPosition, yPosition, { align: 'right', width: colWidths.vlLiq - 5 });
            xPosition += colWidths.vlLiq;
            
            // Total
            const total = valorLiquido + ipi + st;
            doc.text(this.formatCurrency(total), xPosition, yPosition, { align: 'right', width: colWidths.total - 5 });

            // Acumular totais
            totalGeral += total;
            totalIPI += ipi;
            totalST += st;
            totalDesconto += desconto;

            yPosition += 18;
          });
        }

        yPosition += 10;

        // Totais
        doc.fontSize(10)
           .fillColor(primaryColor)
           .text('TOTAIS', 30, yPosition);
           
        yPosition += 20;

        // Fundo dos totais
        doc.rect(30, yPosition - 5, 535, 80)
           .fillColor(lightGray)
           .fill();

        doc.fontSize(9)
           .fillColor('black');

        doc.text(`Subtotal: ${this.formatCurrency(totalGeral - totalIPI - totalST)}`, 40, yPosition);
        yPosition += 15;
        
        doc.text(`Desconto: ${this.formatCurrency(totalDesconto)}`, 40, yPosition);
        yPosition += 15;
        
        doc.text(`IPI: ${this.formatCurrency(totalIPI)}`, 40, yPosition);
        yPosition += 15;
        
        doc.text(`ICMS-ST: ${this.formatCurrency(totalST)}`, 40, yPosition);
        yPosition += 15;

        // Total Geral
        doc.fontSize(12)
           .fillColor(primaryColor)
           .text(`TOTAL GERAL: ${this.formatCurrency(totalGeral)}`, 40, yPosition);

        yPosition += 30;

        // Informações de Pagamento
        if (pagamento) {
          doc.fontSize(11)
             .fillColor(primaryColor)
             .text('CONDIÇÕES DE PAGAMENTO', 30, yPosition);
             
          yPosition += 20;
          
          doc.fontSize(9)
             .fillColor('black')
             .text(`Forma: ${pagamento.forma || '-'}`, 30, yPosition);
          yPosition += 12;
          
          if (pagamento.parcelas) {
            doc.text(`Parcelas: ${pagamento.parcelas}`, 30, yPosition);
            yPosition += 12;
          }
        }

        // Observações
        if (orcamento.observacoes) {
          yPosition += 15;
          
          doc.fontSize(11)
             .fillColor(primaryColor)
             .text('OBSERVAÇÕES', 30, yPosition);
             
          yPosition += 20;
          
          doc.fontSize(9)
             .fillColor('black')
             .text(orcamento.observacoes, 30, yPosition, { width: 535 });
        }

        // Rodapé
        doc.fontSize(8)
           .fillColor(grayColor)
           .text('Este orçamento tem validade de 30 dias', 30, 750, { align: 'center', width: 535 });

        // Número da página
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(8)
             .fillColor(grayColor)
             .text(`Página ${i + 1} de ${pages.count}`, 500, 750);
        }

        doc.end();
      } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        reject(error);
      }
    });
  }

  // Métodos auxiliares
  static formatOrcamentoCodigo(codigo) {
    if (!codigo) return '';
    return String(codigo).padStart(6, '0');
  }

  static formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch (e) {
      return dateStr;
    }
  }

  static formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  }

  static formatNumber(value) {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  }
}

module.exports = OrcamentoPDF; 