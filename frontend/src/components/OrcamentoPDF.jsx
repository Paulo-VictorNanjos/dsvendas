import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { formatOrcamentoCodigo } from '../utils';

// Importar o logo diretamente
import logoImage from '../assets/images/logoorcamento.png';

// Registrar fontes
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 'normal' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 'bold' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 'light' },
  ]
});

// Definir estilos
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Roboto',
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
  headerRight: {
    width: 120,
    height: 50,
  },
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
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
  infoSection: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f5f6fa',
    borderRadius: 5,
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
      return format(new Date(dateStr), 'dd/MM/yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Orçamento {formatOrcamentoCodigo(orcamento.codigo)}</Text>
            <Text style={styles.subtitle}>Data: {formatDate(orcamento.dt_orcamento)}</Text>
          </View>
          <View style={styles.headerRight}>
            <Image src={logoImage} style={styles.logo} />
          </View>
        </View>

        {/* Grid de Informações */}
        <View style={styles.infoGrid}>
          {/* Coluna Cliente */}
          <View style={styles.infoColumn}>
            <Text style={styles.columnTitle}>Dados do Cliente</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nome:</Text>
              <Text style={styles.infoValue}>{cliente.nome}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{cliente.pessoa === 'J' ? 'CNPJ:' : 'CPF:'}</Text>
              <Text style={styles.infoValue}>{cliente.documento}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{cliente.pessoa === 'J' ? 'IE:' : 'RG:'}</Text>
              <Text style={styles.infoValue}>{cliente.inscricao}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Endereço:</Text>
              <Text style={styles.infoValue}>
                {cliente.endereco.logradouro}, {cliente.endereco.numero}
                {cliente.endereco.complemento && ` - ${cliente.endereco.complemento}`}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Bairro:</Text>
              <Text style={styles.infoValue}>{cliente.endereco.bairro}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cidade/UF:</Text>
              <Text style={styles.infoValue}>{cliente.endereco.cidade}/{cliente.endereco.uf}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>CEP:</Text>
              <Text style={styles.infoValue}>{cliente.endereco.cep}</Text>
            </View>
          </View>

          {/* Coluna Vendedor e Pagamento */}
          <View style={styles.infoColumn}>
            <Text style={styles.columnTitle}>Dados do Vendedor</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nome:</Text>
              <Text style={styles.infoValue}>{vendedor.nome}</Text>
            </View>
            {vendedor.email && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{vendedor.email}</Text>
              </View>
            )}

            <View style={{ marginTop: 15 }}>
              <Text style={styles.columnTitle}>Condições de Pagamento</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Forma:</Text>
                <Text style={styles.infoValue}>{pagamento.forma}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Condição:</Text>
                <Text style={styles.infoValue}>{pagamento.condicao}</Text>
              </View>
            </View>
            
            {orcamento.nome_transportadora && (
              <View style={{ marginTop: 15 }}>
                <Text style={styles.columnTitle}>Transportadora</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Nome:</Text>
                  <Text style={styles.infoValue}>{orcamento.nome_transportadora}</Text>
                </View>
                {orcamento.cod_transportadora && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Código:</Text>
                    <Text style={styles.infoValue}>{orcamento.cod_transportadora}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Tabela de Itens */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colCodigo}>Código</Text>
            <Text style={styles.colDescricao}>Descrição</Text>
            <Text style={styles.colQtde}>Qtde</Text>
            <Text style={styles.colUn}>Un</Text>
            <Text style={styles.colVlUnit}>Vl. Unit.</Text>
            <Text style={styles.colDesc}>Desc.%</Text>
            <Text style={styles.colIpi}>IPI</Text>
            <Text style={styles.colSt}>ST</Text>
            <Text style={styles.colVlLiq}>Vl. Líq.</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>

          {orcamento.itens.map((item, index) => (
            <View key={index} style={[
              styles.tableRow,
              index % 2 === 1 && styles.tableRowEven
            ]}>
              <Text style={styles.colCodigo}>{item.produto_codigo}</Text>
              <Text style={styles.colDescricao}>{item.produto_descricao}</Text>
              <Text style={styles.colQtde}>{item.quantidade}</Text>
              <Text style={styles.colUn}>
                {item.unidade}
                {item.isUnidade2 && '*'}
              </Text>
              <Text style={styles.colVlUnit}>{formatCurrency(item.valor_unitario)}</Text>
              <Text style={styles.colDesc}>
                {item.desconto > 0 ? `${item.desconto}%` : '-'}
              </Text>
              <Text style={styles.colIpi}>
                {parseFloat(item.valor_ipi) > 0 ? formatCurrency(item.valor_ipi) : '-'}
              </Text>
              <Text style={styles.colSt}>
                {parseFloat(item.valor_icms_st) > 0 ? formatCurrency(item.valor_icms_st) : '-'}
              </Text>
              <Text style={styles.colVlLiq}>{formatCurrency(item.valor_liquido)}</Text>
              <Text style={styles.colTotal}>{formatCurrency(item.valor_total)}</Text>
            </View>
          ))}
        </View>

        {/* Totais */}
        <View style={styles.totais}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Valor dos Produtos:</Text>
            <Text style={styles.totalValue}>{formatCurrency(orcamento.totais.valor_produtos)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Descontos:</Text>
            <Text style={styles.totalValue}>{formatCurrency(orcamento.totais.valor_descontos)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Valor Líquido:</Text>
            <Text style={styles.totalValue}>{formatCurrency(orcamento.totais.valor_liquido)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total IPI:</Text>
            <Text style={styles.totalValue}>{formatCurrency(orcamento.totais.valor_ipi)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total ICMS-ST:</Text>
            <Text style={styles.totalValue}>{formatCurrency(orcamento.totais.valor_st)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>Valor Total:</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(orcamento.totais.valor_total)}
            </Text>
          </View>
        </View>

        {/* Observações */}
        {orcamento.observacoes && (
          <View style={styles.observacoes}>
            <Text style={styles.observacoesTitle}>Observações:</Text>
            <Text>{orcamento.observacoes}</Text>
          </View>
        )}

        {/* Rodapé com número da página */}
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `Página ${pageNumber} de ${totalPages}`
        )} fixed />

        {/* Rodapé com informações adicionais */}
        <Text style={styles.footer}>
          Documento gerado em {format(new Date(), 'dd/MM/yyyy HH:mm')}
          {orcamento.itens.some(item => item.isUnidade2) && '\n* Indica unidade alternativa (Unidade2)'}
        </Text>
      </Page>
    </Document>
  );
};

export default OrcamentoPDF; 