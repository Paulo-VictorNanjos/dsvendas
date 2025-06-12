-- Correção da inconsistência fiscal: Regra 5 para RS
-- CST 00 (Tributada integralmente) é incompatível com ICMS-ST = 'S'

-- Verificar a inconsistência atual
SELECT 
    cod_regra_icms,
    uf,
    st_icms,
    icms_st,
    CASE 
        WHEN st_icms = '00' AND icms_st = 'S' THEN 'INCONSISTENTE!'
        ELSE 'OK'
    END AS status_fiscal
FROM regras_icms_itens 
WHERE cod_regra_icms = 5 AND uf = 'RS';

-- CORREÇÃO: Definir icms_st = 'N' para CST 00 na regra 5 RS
UPDATE regras_icms_itens 
SET 
    icms_st = 'N',
    dt_alt = NOW()
WHERE 
    cod_regra_icms = 5 
    AND uf = 'RS' 
    AND st_icms = '00' 
    AND icms_st = 'S';

-- Verificar se a correção foi aplicada
SELECT 
    cod_regra_icms,
    uf,
    st_icms,
    icms_st,
    'CORRIGIDO' AS status
FROM regras_icms_itens 
WHERE cod_regra_icms = 5 AND uf = 'RS';

-- COMENTÁRIO:
-- Esta correção resolve a inconsistência fiscal onde:
-- - CST 00 = "Tributada integralmente" 
-- - Não pode ter ICMS-ST (Substituição Tributária)
-- 
-- Agora a regra 5 para RS terá:
-- - st_icms = '00' (correto)
-- - icms_st = 'N' (correto - não calcula ST) 