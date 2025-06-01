# Implementação da Regra CST 60 - ICMS Retido Anteriormente por Substituição Tributária

## Descrição da Regra

O CST (Código de Situação Tributária) 60 indica que o **ICMS já foi retido anteriormente por substituição tributária**. Quando um produto possui este CST, significa que:

1. O ICMS-ST já foi recolhido em operação anterior
2. Não deve ser feito novo cálculo de ICMS-ST
3. O valor do ICMS-ST deve ser zero na operação atual
4. Não há novo imposto a recolher por substituição tributária

## Arquivos Modificados

### Backend

1. **`backend/services/fiscalRulesService.js`**
   - Adicionada verificação do CST 60 no método `calcularIcmsST()`
   - Retorna imediatamente com valores zerados quando CST = 60
   - Inclui mensagem explicativa sobre a regra

2. **`backend/controllers/fiscalController.js`**
   - Implementada verificação do CST 60 no método `verificarST()`
   - Retorna status ST = false quando CST = 60
   - Mensagem informativa sobre a regra

3. **`backend/routes/fiscal.js`**
   - Listas de CSTs atualizadas para incluir apenas '60'
   - Verificações consistentes em todas as rotas

### Frontend

1. **`frontend/src/services/fiscalService.js`**
   - Adicionada verificação do CST 60 antes do cálculo de ICMS-ST
   - Cálculo apenas do ICMS básico, sem ST
   - Retorno com `baseIcmsSt: 0` e `valorIcmsSt: 0`

2. **`frontend/src/utils/calculoFiscal.js`**
   - Implementação consistente com o backend
   - Cálculo apenas do ICMS básico, sem ST
   - Retorno de objeto com `temST: false`

3. **`frontend/src/utils/fiscalUtils.js`**
   - Lista de CSTs atualizada
   - Função `cstIndicaST()` corrigida

4. **Frontend (`OrcamentoFiscal.jsx`)**
   - Regra já implementada corretamente
   - Zera `valor_icms_st` quando CST = '60'

## Padronização de Formato

Todos os arquivos foram padronizados para usar o formato **'60'** (sem zero à esquerda) ao invés de '060', garantindo:

- Consistência entre frontend e backend
- Compatibilidade com dados vindos do banco
- Facilidade de manutenção

## Listas de CST Atualizadas

Todas as listas de CSTs com substituição tributária foram atualizadas para:
```javascript
const cstsComST = ['10', '30', '60', '70', '201', '202', '203'];
```

## Exemplo de Log Esperado

Quando CST = 60 for detectado:
```
[INFO] CST 60 detectado para produto 95/J - ICMS já retido anteriormente por substituição tributária. Não calculando novo ICMS-ST.
```

## Resultado Esperado

Para produtos com CST 60:
- `valorICMSST: 0`
- `baseICMSST: 0`
- `temST: false`
- `mensagem: "CST 60: ICMS já foi retido anteriormente por substituição tributária"`

## Testes Recomendados

1. **Teste com produto CST 60:**
   - Verificar se ST não é calculado
   - Confirmar valores zerados
   - Validar mensagem explicativa

2. **Teste com outros CSTs:**
   - Verificar se cálculo normal continua funcionando
   - Confirmar que apenas CST 60 é afetado

3. **Teste de compatibilidade:**
   - Testar com formato '60' e '060'
   - Verificar comportamento em diferentes UFs

## Observações Importantes

- A regra se aplica apenas ao ICMS-ST, não afeta o ICMS normal
- O cálculo de IPI e outros tributos continua normal
- A verificação é feita antes de qualquer cálculo de ST
- A implementação é consistente entre backend e frontend
- Logs detalhados são gerados para auditoria

## Referências Legais

Esta implementação está baseada na legislação tributária brasileira que estabelece que produtos com CST 60 já tiveram o ICMS retido anteriormente por substituição tributária, não sendo necessário novo recolhimento. 