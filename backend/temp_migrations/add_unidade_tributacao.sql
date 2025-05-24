-- Adicionar colunas relacionadas à unidade de tributação na tabela produtos

-- Verifica se a coluna unidade existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'unidade') THEN
        ALTER TABLE public.produtos ADD COLUMN unidade character varying(3) DEFAULT 'UN';
    END IF;
END
$$;

-- Verifica se a coluna unidade_tributacao existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'unidade_tributacao') THEN
        ALTER TABLE public.produtos ADD COLUMN unidade_tributacao character varying(3) DEFAULT 'UN';
    END IF;
END
$$;

-- Verifica se a coluna fator_conversao existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'fator_conversao') THEN
        ALTER TABLE public.produtos ADD COLUMN fator_conversao numeric(14,6) DEFAULT 1;
    END IF;
END
$$; 