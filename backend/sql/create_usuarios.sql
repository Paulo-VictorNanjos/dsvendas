-- Criar extensão uuid-ossp se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    ativo BOOLEAN NOT NULL DEFAULT true,
    dt_inc TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dt_alt TIMESTAMP,
    ultimo_login TIMESTAMP
);

-- Inserir usuário admin (senha: admin123)
INSERT INTO usuarios (nome, email, senha, role)
VALUES (
    'Administrador',
    'admin@dsvendas.com',
    '$2a$10$8DqVJ.krpXz3hxQd3GU6L.KzuAXGaau1J1DlBVk/ICbsCkB.BCkqe',
    'admin'
) ON CONFLICT (email) DO NOTHING; 