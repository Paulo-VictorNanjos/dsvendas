-- Verifica se a coluna unidade já existe, e se não existir, adiciona
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'orcamentos_itens' AND column_name = 'unidade') THEN
        ALTER TABLE orcamentos_itens ADD COLUMN unidade VARCHAR(10);
    END IF;
END $$;

-- Verifica se a coluna is_unidade2 já existe, e se não existir, adiciona
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'orcamentos_itens' AND column_name = 'is_unidade2') THEN
        ALTER TABLE orcamentos_itens ADD COLUMN is_unidade2 BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Registrar que a migração foi aplicada
INSERT INTO knex_migrations (name, batch, migration_time)
VALUES ('20240620000000_add_unidade_fields_to_orcamentos_itens.js', 
       (SELECT MAX(batch) + 1 FROM knex_migrations),
       NOW())
ON CONFLICT DO NOTHING; 