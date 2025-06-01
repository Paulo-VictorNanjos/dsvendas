-- Adicionar campos de valores calculados à tabela orcamentos_itens
-- Verifica se os campos não existem antes de adicioná-los

-- Adicionar valor_bruto
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'orcamentos_itens' AND column_name = 'valor_bruto') THEN
        ALTER TABLE orcamentos_itens ADD COLUMN valor_bruto DECIMAL(15,4) DEFAULT 0;
        COMMENT ON COLUMN orcamentos_itens.valor_bruto IS 'Valor bruto (quantidade * valor_unitario)';
    END IF;
END $$;

-- Adicionar valor_desconto
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'orcamentos_itens' AND column_name = 'valor_desconto') THEN
        ALTER TABLE orcamentos_itens ADD COLUMN valor_desconto DECIMAL(15,4) DEFAULT 0;
        COMMENT ON COLUMN orcamentos_itens.valor_desconto IS 'Valor do desconto aplicado';
    END IF;
END $$;

-- Adicionar valor_liquido
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'orcamentos_itens' AND column_name = 'valor_liquido') THEN
        ALTER TABLE orcamentos_itens ADD COLUMN valor_liquido DECIMAL(15,4) DEFAULT 0;
        COMMENT ON COLUMN orcamentos_itens.valor_liquido IS 'Valor líquido (valor_bruto - valor_desconto)';
    END IF;
END $$; 