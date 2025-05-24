-- Adicionar coluna para código da condição de pagamento
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cod_cond_pagto VARCHAR;

-- Adicionar coluna para código da forma de pagamento
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cod_forma_pagto VARCHAR;

-- Adicionar coluna para código da transportadora
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cod_transportadora VARCHAR;

-- Adicionar coluna para nome da transportadora
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS nome_transportadora VARCHAR;

-- Confirmar as alterações
COMMIT; 