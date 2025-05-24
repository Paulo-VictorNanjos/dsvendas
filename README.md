# DSVendas - Sistema de Gestão de Orçamentos e Pedidos

![Status do Projeto](https://img.shields.io/badge/status-em%20desenvolvimento-brightgreen)
![Versão](https://img.shields.io/badge/versão-1.0.0-blue)

## 📋 Sumário

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Configuração de Ambiente](#configuração-de-ambiente)
- [Como Executar](#como-executar)
- [Acesso Externo](#acesso-externo)
- [API](#api)
- [Solução de Problemas](#solução-de-problemas)
- [Contribuição](#contribuição)
- [Licença](#licença)

## 📝 Sobre o Projeto

O DSVendas é uma plataforma completa para gestão de orçamentos e pedidos, desenvolvida para automatizar e simplificar processos de vendas. O sistema permite o controle de produtos, clientes, vendedores, condições de pagamento e geração de orçamentos/pedidos.

## ✨ Funcionalidades

- **Gestão de Produtos**
  - Cadastro, edição e exclusão de produtos
  - Busca rápida com autocompletar

- **Gestão de Clientes**
  - Cadastro completo com dados de contato
  - Busca inteligente por nome, CNPJ/CPF

- **Gestão de Vendedores**
  - Cadastro e gerenciamento da equipe de vendas

- **Orçamentos**
  - Criação rápida com seleção intuitiva de produtos
  - Cálculo automático de valores e descontos
  - Impressão e compartilhamento

- **Pedidos**
  - Conversão de orçamentos em pedidos
  - Acompanhamento de status
  - Histórico completo

- **Relatórios**
  - Visão geral de vendas e desempenho
  - Filtros e exportação de dados

## 🚀 Tecnologias Utilizadas

### Frontend
- React.js
- Material-UI
- Axios
- React Router
- Styled Components

### Backend
- Node.js
- Express
- PostgreSQL
- Knex.js
- JWT Authentication

## 📁 Estrutura do Projeto

```
DSVendas/
├── frontend/           # Aplicação React
│   ├── public/         # Arquivos estáticos
│   ├── src/            # Código fonte
│   |   ├── assets/     # Imagens e recursos
│   |   ├── components/ # Componentes reutilizáveis
│   |   ├── contexts/   # Context API
│   |   ├── hooks/      # React Hooks customizados
│   |   ├── pages/      # Páginas da aplicação
│   |   ├── services/   # Serviços de API
│   |   └── utils/      # Funções utilitárias
│   └── package.json    # Dependências do frontend
│
└── backend/            # API Node.js
    ├── src/            # Código fonte
    │   ├── config/     # Configurações
    │   ├── controllers/# Controladores
    │   ├── database/   # Migrations e seeds
    │   ├── middlewares/# Middlewares
    │   ├── models/     # Modelos de dados
    │   ├── routes/     # Rotas da API
    │   └── services/   # Serviços de negócios
    └── package.json    # Dependências do backend
```

## ⚙️ Configuração de Ambiente

### Pré-requisitos
- Node.js (v14.x ou superior)
- PostgreSQL (v12.x ou superior)
- NPM ou Yarn

### Variáveis de Ambiente

#### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:3001
```

Para acesso externo:
```
REACT_APP_API_URL=http://seu-ip-ou-dominio:3001
```

#### Backend (.env)
```
PORT=3001
NODE_ENV=development
DATABASE_URL=postgres://usuario:senha@localhost:5432/dsvendas
JWT_SECRET=sua_chave_secreta
```

## 🔧 Como Executar

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/dsvendas.git
cd dsvendas
```

2. Instale as dependências:

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. Configure o banco de dados:
```bash
cd backend
npx knex migrate:latest
npx knex seed:run
```

### Execução

1. Inicie o backend:
```bash
cd backend
npm run dev
```

2. Inicie o frontend (em outro terminal):
```bash
cd frontend
npm start
```

3. Acesse o sistema em: http://localhost:3000

### Produção

Para implantar em ambiente de produção:

```bash
# Frontend
cd frontend
npm run build
serve -s build -l 3000

# Backend
cd backend
npm start
```

## 🌐 Acesso Externo

Para permitir acesso externo ao sistema:

1. Ajuste o PostgreSQL para aceitar conexões externas editando o arquivo `pg_hba.conf`:
```
# Adicione esta linha para permitir acesso de qualquer endereço IP
host    all             all             0.0.0.0/0            md5
```

2. Modifique o arquivo `postgresql.conf`:
```
listen_addresses = '*'
```

3. Configure o frontend para apontar para o IP ou domínio correto no arquivo `.env`:
```
REACT_APP_API_URL=http://seu-ip-ou-dominio:3001
```

4. Reinicie o PostgreSQL e o servidor Node.js.

## 🔌 API

A API REST do DSVendas oferece os seguintes endpoints principais:

### Autenticação
- `POST /api/login` - Autenticação de usuários
- `POST /api/logout` - Encerrar sessão

### Produtos
- `GET /api/produtos` - Listar todos os produtos
- `GET /api/produtos/:id` - Detalhar um produto
- `POST /api/produtos` - Criar novo produto
- `PUT /api/produtos/:id` - Atualizar produto
- `DELETE /api/produtos/:id` - Remover produto

### Clientes
- `GET /api/clientes` - Listar todos os clientes
- `GET /api/clientes/:id` - Detalhar um cliente
- `POST /api/clientes` - Criar novo cliente
- `PUT /api/clientes/:id` - Atualizar cliente
- `DELETE /api/clientes/:id` - Remover cliente

### Orçamentos
- `GET /api/orcamentos` - Listar todos os orçamentos
- `GET /api/orcamentos/:id` - Detalhar um orçamento
- `POST /api/orcamentos` - Criar novo orçamento
- `PUT /api/orcamentos/:id` - Atualizar orçamento
- `DELETE /api/orcamentos/:id` - Remover orçamento

### Pedidos
- `GET /api/pedidos` - Listar todos os pedidos
- `GET /api/pedidos/:id` - Detalhar um pedido
- `POST /api/pedidos` - Criar novo pedido
- `PUT /api/pedidos/:id` - Atualizar pedido
- `DELETE /api/pedidos/:id` - Remover pedido

## 🔍 Solução de Problemas

### Problemas de Conexão com Banco de Dados
- Verifique se o PostgreSQL está em execução
- Confirme se as credenciais no arquivo `.env` estão corretas
- Para acesso externo, verifique as configurações `pg_hba.conf` e `postgresql.conf`

### API Inacessível
- Confirme se a porta 3001 está livre e o servidor backend está rodando
- Verifique configurações de firewall
- Certifique-se que a variável `REACT_APP_API_URL` está corretamente configurada

### Erros na Interface
- Limpe o cache do navegador
- Verifique console de erros (F12)
- Reinicie a aplicação frontend

## 👥 Contribuição

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para detalhes.

---

Desenvolvido com ❤️ por Paulo