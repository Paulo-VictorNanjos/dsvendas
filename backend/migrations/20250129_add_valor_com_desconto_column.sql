-- Migração para adicionar coluna valor_com_desconto na tabela orcamentos_itens
-- Data: 2025-01-29

-- Adicionar nova coluna valor_com_desconto
ALTER TABLE orcamentos_itens 
ADD COLUMN valor_com_desconto DECIMAL(15,2) DEFAULT 0.00;

-- Comentário explicativo
COMMENT ON COLUMN orcamentos_itens.valor_com_desconto IS 'Valor total do item com desconto aplicado (quantidade × valor_unitário_final)';

-- Atualizar registros existentes
UPDATE orcamentos_itens 
SET valor_com_desconto = valor_liquido 
WHERE valor_com_desconto IS NULL OR valor_com_desconto = 0;

-- Verificar estrutura atualizada
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'orcamentos_itens' 
AND column_name IN ('valor_bruto', 'valor_liquido', 'valor_com_desconto', 'valor_total')
ORDER BY ordinal_position; 