# Cálculo de ICMS no DSVENDAS

Este documento descreve como o DSVENDAS calcula o ICMS (Imposto sobre Circulação de Mercadorias e Serviços) para produtos nacionais e importados.

## Informações Gerais

O cálculo do ICMS depende de diversos fatores:

1. **UF de origem**: Estado onde a empresa está localizada (SP por padrão)
2. **UF de destino**: Estado para onde a mercadoria será enviada (UF do cliente)
3. **Tipo de operação**: Operação interestadual (origem ≠ destino) ou intraestadual (origem = destino)
4. **Tipo de contribuinte**: Se o cliente é contribuinte de ICMS ou não
5. **Origem do produto**: Nacional ou importado (código de origem do produto)

## Códigos de Origem dos Produtos

O sistema utiliza os códigos de origem conforme definido pela legislação fiscal brasileira para determinar se um produto é nacional ou importado:

| Código | Descrição | Tratamento Fiscal |
|--------|-----------|-------------------|
| 0 | Nacional | Alíquota padrão do estado |
| 1 | Estrangeira - Importação direta | Alíquota para produtos importados |
| 2 | Estrangeira - Adquirida no mercado interno | Alíquota para produtos importados |
| 3 | Nacional - Mercadoria com conteúdo de importação superior a 40% | Pode usar alíquota para importados |
| 4 | Nacional - Produção conforme processos básicos | Alíquota padrão do estado |
| 5 | Nacional - Mercadoria com conteúdo de importação inferior ou igual a 40% | Alíquota padrão do estado |
| 6 | Estrangeira - Importação direta sem similar nacional | Alíquota para produtos importados |
| 7 | Estrangeira - Adquirida no mercado interno sem similar nacional | Alíquota para produtos importados |
| 8 | Nacional - Mercadoria com conteúdo de importação superior a 70% | Alíquota para produtos importados |

## Alíquotas de ICMS

### Produtos Nacionais

- **Operação intraestadual (SP-SP)**: 18% (alíquota interna de SP)
- **Operação interestadual (SP para outros estados)**:
  - 12% para estados do Sul e Sudeste
  - 7% para estados do Norte, Nordeste e Centro-Oeste
  
### Produtos Importados

Para produtos importados (código de origem diferente de 0, 4 e 5), aplicam-se alíquotas diferenciadas:

- As alíquotas para produtos importados geralmente são mais altas
- O sistema consulta a tabela `class_fiscal_dados` para obter o campo `aliq_importado`
- A alíquota para importados normalmente é:
  - 25% para SP e maioria dos estados
  - Outros estados conforme legislação específica

## Fluxo de Cálculo

### 1. Determinação da Origem do Produto

O sistema verifica o código de origem do produto (`cod_origem_prod`). Se o código for diferente de `0`, `4` ou `5`, o produto é considerado importado ou com alto conteúdo de importação.

### 2. Busca de Regras de ICMS

O sistema busca na tabela `regras_icms_itens` as regras específicas para o código de regra do produto e UF de destino:

```sql
SELECT * FROM regras_icms_itens 
WHERE cod_regra_icms = ? AND uf = ?
```

### 3. Tratamento para Produtos Importados

Para produtos importados, o sistema busca valores específicos na tabela `class_fiscal_dados`:

```sql
SELECT * FROM class_fiscal_dados 
WHERE cod_ncm = ? AND uf = ?
```

Se o produto for importado e houver valores específicos para produtos importados (`iva_importado` e `aliq_importado`), esses valores serão utilizados no cálculo em vez dos valores padrão.

### 4. Operações Interestaduais

Quando a UF do cliente é diferente da UF da empresa, o sistema:

1. Busca a alíquota interestadual na tabela `icms_aliq_interna`:

```sql
SELECT aliquota FROM icms_aliq_interna 
WHERE uf_origem = 'SP' AND uf_destino = ?
```

2. Aplica as seguintes regras para alíquotas interestaduais caso não encontre na tabela:
   - Sul e Sudeste: 12%
   - Norte, Nordeste e Centro-Oeste: 7%

### 5. Substituição Tributária (ICMS-ST)

Quando aplicável (campo `icms_st = 'S'`), o sistema calcula o ICMS-ST usando:

1. **IVA (Índice de Valor Agregado)**: 
   - Para produtos nacionais: `iva` padrão
   - Para produtos importados: `iva_importado` se disponível

2. **Alíquota Interna**:
   - Para produtos nacionais: `aliq_interna` padrão
   - Para produtos importados: `aliq_importado` se disponível

O cálculo da base de ICMS-ST é feito com a fórmula:
```
Base ICMS-ST = (Base ICMS + Valor IPI) × (1 + IVA/100)
```

O valor do ICMS-ST é calculado com:
```
Valor ICMS-ST = (Base ICMS-ST × Alíquota Interna/100) - Valor ICMS
```

## Tabelas Utilizadas

| Tabela | Descrição |
|--------|-----------|
| `produtos` | Armazena informações dos produtos, incluindo o código de origem |
| `regras_icms_itens` | Regras de ICMS por UF e código de regra fiscal |
| `class_fiscal_dados` | Informações específicas do NCM por UF, incluindo dados para produtos importados |
| `icms_aliq_interna` | Alíquotas interestaduais |
| `origem_prod` | Descrição dos códigos de origem de produtos |

## Exemplo de Cálculo

### Produto Nacional (cod_origem_prod = '0') em operação interna (SP → SP):
- Valor do produto: R$ 100,00
- Alíquota ICMS: 18%
- Valor ICMS: R$ 18,00

### Produto Importado (cod_origem_prod = '1') em operação interna (SP → SP):
- Valor do produto: R$ 100,00
- Alíquota ICMS para importados: 25%
- Valor ICMS: R$ 25,00

### Produto Nacional em operação interestadual (SP → MG):
- Valor do produto: R$ 100,00
- Alíquota interestadual: 12%
- Valor ICMS: R$ 12,00

### Produto Importado em operação interestadual (SP → MG):
- Valor do produto: R$ 100,00
- Alíquota para produtos importados: 25%
- Valor ICMS: R$ 25,00

## Fluxograma do Cálculo

```
┌─────────────────┐
│ Início do       │
│ Cálculo de ICMS │
└───────┬─────────┘
        ▼
┌───────────────────┐
│ Verificar origem  │
│ do produto        │
└───────┬───────────┘
        ▼
  ┌─────────────┐
  │É importado? │
  └──┬───────┬──┘
     │       │
     ▼ Sim   ▼ Não
┌──────────┐ ┌──────────┐
│Usar valor│ │Usar valor│
│específico│ │padrão    │
└────┬─────┘ └────┬─────┘
     │            │
     ▼            ▼
┌───────────────────────┐
│ Verificar UF destino  │
└───────────┬───────────┘
            ▼
      ┌──────────────┐
      │É interestadual?│
      └─────┬────┬───┘
            │    │
            ▼ Sim▼ Não
   ┌──────────────┐ ┌──────────────┐
   │Buscar alíquota│ │Usar alíquota │
   │interestadual │ │interna       │
   └──────┬───────┘ └──────┬───────┘
          │                │
          ▼                ▼
     ┌───────────────────────┐
     │  Calcular ICMS        │
     └───────┬───────────────┘
             ▼
        ┌──────────┐
        │  Tem ST? │
        └───┬──┬───┘
            │  │
            ▼Sim▼Não
  ┌─────────────────┐ ┌────────────┐
  │Calcular ICMS-ST │ │Fim do      │
  └───────┬─────────┘ │cálculo     │
          │           └────────────┘
          ▼
     ┌────────────┐
     │Fim do      │
     │cálculo     │
     └────────────┘
```

## Ajustes para Produtos Importados

Para produtos importados, além da alíquota diferenciada, também podem ser aplicados:
- IVA (Índice de Valor Agregado) específico - campo `iva_importado` 
- A alíquota de produtos importados tem prioridade sobre qualquer outra regra

## Recomendações para o Cadastro de Produtos

1. **Código de Origem**: Certifique-se de que todos os produtos tenham o código de origem correto:
   - Produtos nacionais: `0`, `4` ou `5`
   - Produtos importados: `1`, `2`, `3`, `6`, `7` ou `8`

2. **NCM**: Mantenha o NCM atualizado para que o sistema possa encontrar as regras fiscais corretas.

3. **Regra de ICMS**: Associe cada produto à regra de ICMS adequada.

## Troubleshooting

### ICMS calculando sempre com 18%

Se o ICMS estiver sendo calculado sempre com a alíquota interna de 18% para produtos importados, verifique:

1. Se o `cod_origem_prod` está corretamente preenchido para produtos importados (diferente de 0, 4 e 5)
2. Se existem registros na tabela `class_fiscal_dados` para o NCM do produto
3. Se o campo `aliq_importado` está preenchido corretamente nesses registros 