
-- Registro de Imóveis: faixas 28..91 (progressão + R$ 63,87 a cada R$ 50.000)
INSERT INTO public.tabela_registro_imoveis (descricao, faixa_min, faixa_max, valor, ativo)
SELECT
  'Registro com valor econômico (LC 755/2019, item 2.2)',
  ROUND((526100.05 + (i - 1) * 50000 + 0.01)::numeric, 2),
  ROUND((526100.05 + i * 50000)::numeric, 2),
  ROUND((3054.54 + i * 63.87)::numeric, 2),
  true
FROM generate_series(1, 64) AS i
WHERE NOT EXISTS (
  SELECT 1 FROM public.tabela_registro_imoveis t
  WHERE t.faixa_min = ROUND((526100.05 + (i - 1) * 50000 + 0.01)::numeric, 2)
);

-- Registro de Imóveis: faixa 92 (acima de 3.726.100,05)
INSERT INTO public.tabela_registro_imoveis (descricao, faixa_min, faixa_max, valor, ativo)
SELECT 'Registro com valor econômico — acima de R$ 3.726.100,05 (LC 755/2019, item 2.2)',
       3726100.06, NULL, 7205.77, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.tabela_registro_imoveis WHERE faixa_min = 3726100.06 AND faixa_max IS NULL
);

-- Tabelionato de Notas — Escritura com valor: faixas 28..91 (+ R$ 62,61 a cada R$ 50.000)
INSERT INTO public.tabela_tabelionato (ato, descricao, faixa_min, faixa_max, valor, ativo)
SELECT
  'Escritura com valor',
  'Escritura pública com valor econômico (Anexo I — Tabelionato de Notas SC 2026)',
  ROUND((526100.05 + (i - 1) * 50000 + 0.01)::numeric, 2),
  ROUND((526100.05 + i * 50000)::numeric, 2),
  ROUND((3058.64 + i * 62.61)::numeric, 2),
  true
FROM generate_series(1, 64) AS i
WHERE NOT EXISTS (
  SELECT 1 FROM public.tabela_tabelionato t
  WHERE t.ato = 'Escritura com valor'
    AND t.faixa_min = ROUND((526100.05 + (i - 1) * 50000 + 0.01)::numeric, 2)
);

-- Tabelionato: faixa 92 (acima de 3.726.100,05)
INSERT INTO public.tabela_tabelionato (ato, descricao, faixa_min, faixa_max, valor, ativo)
SELECT 'Escritura com valor',
       'Escritura pública com valor econômico — acima de R$ 3.726.100,05 (Anexo I SC 2026)',
       3726100.06, NULL, 7093.91, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.tabela_tabelionato
  WHERE ato = 'Escritura com valor' AND faixa_min = 3726100.06 AND faixa_max IS NULL
);
