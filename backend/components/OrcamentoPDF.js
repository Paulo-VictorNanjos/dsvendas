const React = require('react');
const { Document, Page, Text, View, StyleSheet, pdf } = require('@react-pdf/renderer');

// Remover registro de fontes externas para evitar erro de fetch
// Font.register foi removido para usar fontes padrão

// Definir estilos (usando fontes padrão do sistema)
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica', // Fonte padrão do sistema
    fontSize: 10,
    backgroundColor: '#fff',
    color: '#2d3436'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottom: '2pt solid #0984e3',
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'column',
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#0984e3',
  },
  subtitle: {
    fontSize: 10,
    color: '#636e72',
  },
  infoGrid: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 15,
  },
  infoColumn: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    padding: 10,
    borderRadius: 5,
  },
  columnTitle: {
    fontWeight: 'bold',
    color: '#0984e3',
    marginBottom: 8,
    fontSize: 11,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  infoLabel: {
    fontWeight: 'bold',
    width: '25%',
    color: '#0984e3',
  },
  infoValue: {
    flex: 1,
  },
  table: {
    marginVertical: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0984e3',
    padding: 8,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#dfe6e9',
    padding: 6,
    fontSize: 9,
  },
  tableRowEven: {
    backgroundColor: '#f5f6fa',
  },
  colCodigo: { width: '8%' },
  colDescricao: { width: '24%' },
  colQtde: { width: '6%', textAlign: 'right' },
  colUn: { width: '5%', textAlign: 'center' },
  colVlUnit: { width: '11%', textAlign: 'right' },
  colDesc: { width: '6%', textAlign: 'right' },
  colIpi: { width: '10%', textAlign: 'right' },
  colSt: { width: '10%', textAlign: 'right' },
  colVlLiq: { width: '10%', textAlign: 'right' },
  colTotal: { width: '10%', textAlign: 'right' },
  totais: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f5f6fa',
    borderRadius: 5,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  totalValue: {
    fontWeight: 'bold',
    color: '#0984e3',
  },
  grandTotal: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#dfe6e9',
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0984e3',
  },
  observacoes: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#ffeaa7',
    borderRadius: 5,
  },
  observacoesTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#fdcb6e',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    right: 30,
    fontSize: 8,
    color: '#636e72',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#dfe6e9',
    fontSize: 8,
    color: '#636e72',
  }
});

// Função para formatar código do orçamento (copiada do utils)
const formatOrcamentoCodigo = (codigo) => {
  if (!codigo) return '';
  return String(codigo).padStart(6, '0');
};

const OrcamentoPDF = ({ dados }) => {
  const { orcamento, cliente, vendedor, pagamento } = dados;

  // Formatação de valores e datas
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch (e) {
      return dateStr;
    }
  };

  return React.createElement(Document, null,
    React.createElement(Page, { size: "A4", style: styles.page },
      // Cabeçalho
      React.createElement(View, { style: styles.header },
        React.createElement(View, { style: styles.headerLeft },
          React.createElement(Text, { style: styles.title }, `Orçamento ${formatOrcamentoCodigo(orcamento.codigo)}`),
          React.createElement(Text, { style: styles.subtitle }, `Data: ${formatDate(orcamento.dt_orcamento)}`)
        )
      ),

      // Grid de Informações
      React.createElement(View, { style: styles.infoGrid },
        // Coluna Cliente
        React.createElement(View, { style: styles.infoColumn },
          React.createElement(Text, { style: styles.columnTitle }, 'Dados do Cliente'),
          React.createElement(View, { style: styles.infoRow },
            React.createElement(Text, { style: styles.infoLabel }, 'Nome:'),
            React.createElement(Text, { style: styles.infoValue }, cliente.nome || '')
          ),
          React.createElement(View, { style: styles.infoRow },
            React.createElement(Text, { style: styles.infoLabel }, cliente.pessoa === 'J' ? 'CNPJ:' : 'CPF:'),
            React.createElement(Text, { style: styles.infoValue }, cliente.documento || '')
          ),
          React.createElement(View, { style: styles.infoRow },
            React.createElement(Text, { style: styles.infoLabel }, cliente.pessoa === 'J' ? 'IE:' : 'RG:'),
            React.createElement(Text, { style: styles.infoValue }, cliente.inscricao || '')
          ),
          React.createElement(View, { style: styles.infoRow },
            React.createElement(Text, { style: styles.infoLabel }, 'Endereco:'),
            React.createElement(Text, { style: styles.infoValue }, 
              `${cliente.endereco?.logradouro || ''}, ${cliente.endereco?.numero || ''}${cliente.endereco?.complemento ? ` - ${cliente.endereco.complemento}` : ''}`
            )
          ),
          React.createElement(View, { style: styles.infoRow },
            React.createElement(Text, { style: styles.infoLabel }, 'Bairro:'),
            React.createElement(Text, { style: styles.infoValue }, cliente.endereco?.bairro || '')
          ),
          React.createElement(View, { style: styles.infoRow },
            React.createElement(Text, { style: styles.infoLabel }, 'Cidade/UF:'),
            React.createElement(Text, { style: styles.infoValue }, `${cliente.endereco?.cidade || ''}/${cliente.endereco?.uf || ''}`)
          ),
          React.createElement(View, { style: styles.infoRow },
            React.createElement(Text, { style: styles.infoLabel }, 'CEP:'),
            React.createElement(Text, { style: styles.infoValue }, cliente.endereco?.cep || '')
          )
        ),

        // Coluna Vendedor e Pagamento
        React.createElement(View, { style: styles.infoColumn },
          React.createElement(Text, { style: styles.columnTitle }, 'Dados do Vendedor'),
          React.createElement(View, { style: styles.infoRow },
            React.createElement(Text, { style: styles.infoLabel }, 'Nome:'),
            React.createElement(Text, { style: styles.infoValue }, vendedor.nome || '')
          ),
          vendedor.email && React.createElement(View, { style: styles.infoRow },
            React.createElement(Text, { style: styles.infoLabel }, 'Email:'),
            React.createElement(Text, { style: styles.infoValue }, vendedor.email)
          ),

          React.createElement(View, { style: { marginTop: 15 } },
            React.createElement(Text, { style: styles.columnTitle }, 'Condicoes de Pagamento'),
            React.createElement(View, { style: styles.infoRow },
              React.createElement(Text, { style: styles.infoLabel }, 'Forma:'),
              React.createElement(Text, { style: styles.infoValue }, pagamento.forma || '')
            ),
            React.createElement(View, { style: styles.infoRow },
              React.createElement(Text, { style: styles.infoLabel }, 'Condicao:'),
              React.createElement(Text, { style: styles.infoValue }, pagamento.condicao || '')
            )
          ),
          
          orcamento.nome_transportadora && React.createElement(View, { style: { marginTop: 15 } },
            React.createElement(Text, { style: styles.columnTitle }, 'Transportadora'),
            React.createElement(View, { style: styles.infoRow },
              React.createElement(Text, { style: styles.infoLabel }, 'Nome:'),
              React.createElement(Text, { style: styles.infoValue }, orcamento.nome_transportadora)
            ),
            orcamento.cod_transportadora && React.createElement(View, { style: styles.infoRow },
              React.createElement(Text, { style: styles.infoLabel }, 'Codigo:'),
              React.createElement(Text, { style: styles.infoValue }, orcamento.cod_transportadora)
            )
          )
        )
      ),

      // Tabela de Itens
      React.createElement(View, { style: styles.table },
        React.createElement(View, { style: styles.tableHeader },
          React.createElement(Text, { style: styles.colCodigo }, 'Codigo'),
          React.createElement(Text, { style: styles.colDescricao }, 'Descricao'),
          React.createElement(Text, { style: styles.colQtde }, 'Qtde'),
          React.createElement(Text, { style: styles.colUn }, 'Un'),
          React.createElement(Text, { style: styles.colVlUnit }, 'Vl. Unit.'),
          React.createElement(Text, { style: styles.colDesc }, 'Desc.%'),
          React.createElement(Text, { style: styles.colIpi }, 'IPI'),
          React.createElement(Text, { style: styles.colSt }, 'ST'),
          React.createElement(Text, { style: styles.colVlLiq }, 'Vl. Liq.'),
          React.createElement(Text, { style: styles.colTotal }, 'Total')
        ),

        ...(orcamento.itens || []).map((item, index) =>
          React.createElement(View, { 
            key: index, 
            style: [styles.tableRow, index % 2 === 1 && styles.tableRowEven]
          },
            React.createElement(Text, { style: styles.colCodigo }, item.produto_codigo || ''),
            React.createElement(Text, { style: styles.colDescricao }, item.produto_descricao || ''),
            React.createElement(Text, { style: styles.colQtde }, item.quantidade || ''),
            React.createElement(Text, { style: styles.colUn }, 
              `${item.unidade || ''}${item.isUnidade2 ? '*' : ''}`
            ),
            React.createElement(Text, { style: styles.colVlUnit }, formatCurrency(item.valor_unitario)),
            React.createElement(Text, { style: styles.colDesc }, 
              item.desconto > 0 ? `${item.desconto}%` : '-'
            ),
            React.createElement(Text, { style: styles.colIpi }, 
              parseFloat(item.valor_ipi) > 0 ? formatCurrency(item.valor_ipi) : '-'
            ),
            React.createElement(Text, { style: styles.colSt }, 
              parseFloat(item.valor_icms_st) > 0 ? formatCurrency(item.valor_icms_st) : '-'
            ),
            React.createElement(Text, { style: styles.colVlLiq }, formatCurrency(item.valor_com_desconto)),
            React.createElement(Text, { style: styles.colTotal }, formatCurrency(item.valor_total))
          )
        )
      ),

      // Totais
      React.createElement(View, { style: styles.totais },
        React.createElement(View, { style: styles.totalRow },
          React.createElement(Text, { style: styles.totalLabel }, 'Valor dos Produtos:'),
          React.createElement(Text, { style: styles.totalValue }, formatCurrency(orcamento.totais?.valor_produtos))
        ),
        React.createElement(View, { style: styles.totalRow },
          React.createElement(Text, { style: styles.totalLabel }, 'Descontos:'),
          React.createElement(Text, { style: styles.totalValue }, formatCurrency(orcamento.totais?.valor_descontos))
        ),
        React.createElement(View, { style: styles.totalRow },
          React.createElement(Text, { style: styles.totalLabel }, 'Valor Liquido:'),
          React.createElement(Text, { style: styles.totalValue }, formatCurrency(orcamento.totais?.valor_liquido))
        ),
        React.createElement(View, { style: styles.totalRow },
          React.createElement(Text, { style: styles.totalLabel }, 'Total IPI:'),
          React.createElement(Text, { style: styles.totalValue }, formatCurrency(orcamento.totais?.valor_ipi))
        ),
        React.createElement(View, { style: styles.totalRow },
          React.createElement(Text, { style: styles.totalLabel }, 'Total ICMS-ST:'),
          React.createElement(Text, { style: styles.totalValue }, formatCurrency(orcamento.totais?.valor_st))
        ),
        React.createElement(View, { style: [styles.totalRow, styles.grandTotal] },
          React.createElement(Text, { style: styles.grandTotalLabel }, 'Valor Total:'),
          React.createElement(Text, { style: styles.grandTotalValue }, 
            formatCurrency(orcamento.totais?.valor_total)
          )
        )
      ),

      // Observações
      orcamento.observacoes && React.createElement(View, { style: styles.observacoes },
        React.createElement(Text, { style: styles.observacoesTitle }, 'Observacoes:'),
        React.createElement(Text, null, orcamento.observacoes)
      ),

      // Rodapé com número da página
      React.createElement(Text, { 
        style: styles.pageNumber, 
        render: ({ pageNumber, totalPages }) => `Pagina ${pageNumber} de ${totalPages}`,
        fixed: true 
      }),

      // Rodapé com informações adicionais
      React.createElement(Text, { style: styles.footer }, 
        `Documento gerado em ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`
        + (orcamento.itens?.some(item => item.isUnidade2) ? '\n* Indica unidade alternativa (Unidade2)' : '')
      )
    )
  );
};

module.exports = { OrcamentoPDF, pdf }; 