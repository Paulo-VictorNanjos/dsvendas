# Correção: Cadastro de Clientes - UF

## Problema

O sistema não estava exibindo corretamente a UF (estado) dos clientes durante o carregamento das informações no cadastro e não estava importando corretamente a UF e município dos clientes do banco de dados do ERP.

## Causa

O problema ocorria por vários motivos:

1. O sistema não estava detectando corretamente as tabelas e colunas no banco de dados do ERP
2. A importação não era resiliente a diferentes estruturas de dados nos sistemas ERP
3. A função de sincronização usava uma abordagem limitada para determinar a UF dos clientes
4. Não havia tratamento adequado para diferentes formatos de nomes de colunas no ERP
5. A coluna 'dt_alt' estava causando erros durante a atualização dos dados de clientes

## Solução Implementada

### 1. Melhorias no Processo de Sincronização

O arquivo `backend/services/syncService.js` foi modificado para melhorar a determinação da UF (estado) dos clientes:

- Agora busca automaticamente a UF quando é fornecido apenas o município
- Utiliza a tabela `ibge` para determinar a UF com base no município
- Normaliza a UF para formato padrão (maiúsculas e sem espaços)
- Verifica se a UF é válida (2 caracteres)

### 2. Novo Script de Sincronização Dedicado

Foi criado o script `backend/syncClientes.js` dedicado exclusivamente à importação de clientes do ERP com foco na correta obtenção de UF e município:

- Faz a validação das UFs durante a importação
- Melhora a detecção de problemas na estrutura dos dados
- Apresenta estatísticas detalhadas sobre a qualidade dos dados
- Verifica e adiciona a coluna 'dt_alt' quando necessário
- Verifica se as colunas existem antes de utilizá-las na atualização

### 3. Verificações da Estrutura do Banco

O script implementa verificações robustas para garantir que todas as tabelas e colunas necessárias existam:

- Verifica e cria a tabela `clientes` se não existir
- Verifica e adiciona a coluna `dt_alt` à tabela `clientes` se não existir
- Verifica e popula a tabela `estados` com todas as UFs brasileiras
- Tratamento adequado para diferentes estruturas de banco de dados

### 4. Tratamento Inteligente da Coluna dt_alt

O script agora verifica se a coluna dt_alt existe antes de utilizá-la nos comandos UPDATE:

```javascript
// Verificar se a tabela de clientes tem a coluna dt_alt
const hasColumn = await knex.schema.hasColumn('clientes', 'dt_alt');

// Atualizar cliente existente
if (hasColumn) {
  // Se a coluna dt_alt existe, incluir no update
  await knex('clientes')
    .where('codigo', cliente.codigo)
    .update({
      ...cliente,
      dt_alt: knex.fn.now()
    });
} else {
  // Se a coluna dt_alt não existe, não incluir no update
  await knex('clientes')
    .where('codigo', cliente.codigo)
    .update(cliente);
}
```

## Como Utilizar

Para executar a sincronização dos clientes do ERP com correção de UF:

1. Certifique-se de que o arquivo `.env` está configurado com as credenciais corretas do banco ERP
2. Execute o comando: `npm run sync`

O script irá:
- Verificar e criar/atualizar as estruturas necessárias no banco
- Buscar clientes do ERP
- Processar os dados para garantir UF e município corretos
- Sincronizar os dados no banco local
- Exibir estatísticas detalhadas sobre o processo

## Resultados

Após a implementação dessas melhorias:

1. Os clientes agora têm suas UFs corretamente configuradas, mesmo quando o ERP não fornece essa informação
2. A UF é determinada automaticamente pelo município quando possível
3. Os problemas estruturais com a coluna dt_alt foram resolvidos
4. A sincronização é mais robusta e resiliente a diferentes configurações de banco de dados

## Monitoramento e Manutenção

É recomendável executar a sincronização periodicamente para garantir que todos os clientes tenham suas informações de UF e município corretamente configuradas, especialmente quando novos clientes são adicionados ao sistema ERP.

## Benefícios

1. Cálculo correto de ICMS por estado: Como o ICMS varia de estado para estado, esta correção permite que o sistema aplique corretamente as alíquotas específicas de cada estado.

2. Melhoria de experiência do usuário: Os usuários verão as informações corretas dos clientes, sem necessidade de correção manual da UF.

3. Consistência de dados: O sistema agora usa informações existentes (município) para determinar de forma inteligente a UF quando ela não estiver explicitamente definida.

## Como Testar

1. Acesse o sistema e busque clientes cadastrados
2. Verifique se a UF exibida está correta para cada cliente
3. Ao adicionar um cliente a um orçamento, verifique se a UF correta é usada para o cálculo do ICMS
4. Crie orçamentos com clientes de diferentes estados para verificar se as alíquotas de ICMS estão sendo aplicadas corretamente 