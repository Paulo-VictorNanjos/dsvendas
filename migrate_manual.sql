-- Execute este SQL no seu banco PostgreSQL

-- Adicionar nova coluna valor_com_desconto
ALTER TABLE orcamentos_itens 
ADD COLUMN IF NOT EXISTS valor_com_desconto DECIMAL(15,2) DEFAULT 0.00;

-- Atualizar registros existentes
UPDATE orcamentos_itens 
SET valor_com_desconto = valor_liquido 
WHERE valor_com_desconto IS NULL OR valor_com_desconto = 0;

-- Verificar se foi criada
\d orcamentos_itens; 