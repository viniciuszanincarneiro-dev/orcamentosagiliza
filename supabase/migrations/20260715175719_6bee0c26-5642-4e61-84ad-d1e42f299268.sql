
-- 1) Corrige fator do RI: passa a usar 100% (valor declarado/proporcional integral)
UPDATE public.tabela_valores SET valor = 100 WHERE categoria = 'config' AND chave = 'ri_fator_ajuste';

-- 2) Cadastro de averbação (2 unid. × R$ 158,47)
INSERT INTO public.tabela_valores (categoria, chave, descricao, valor, ordem)
VALUES
  ('emolumentos', 'averbacao_valor', 'Averbação (valor unitário)', 158.47, 900),
  ('emolumentos', 'averbacao_qtd',   'Averbação (quantidade padrão)', 2, 901)
ON CONFLICT (categoria, chave) DO UPDATE SET valor = EXCLUDED.valor, descricao = EXCLUDED.descricao;

-- 3) Popula tabela_registro_imoveis (SC 2026 — LC 755/2019, item 2.2)
TRUNCATE public.tabela_registro_imoveis;
INSERT INTO public.tabela_registro_imoveis (faixa_min, faixa_max, valor, descricao) VALUES
  (0.00,       13786.59, 207.75,  'Faixa 1'),
  (13786.60,   20679.87, 235.94,  'Faixa 2'),
  (20679.88,   28951.83, 336.32,  'Faixa 3'),
  (28951.84,   35845.12, 438.45,  'Faixa 4'),
  (35845.13,   44117.08, 547.64,  'Faixa 5'),
  (44117.09,   53767.69, 660.32,  'Faixa 6'),
  (53767.70,   62039.64, 776.56,  'Faixa 7'),
  (62039.65,   71690.25, 898.07,  'Faixa 8'),
  (71690.26,   79962.21, 1024.85, 'Faixa 9'),
  (79962.22,   90991.48, 1155.16, 'Faixa 10'),
  (90991.49,   100642.09, 1290.76,'Faixa 11'),
  (100642.10,  111671.36, 1433.41,'Faixa 12'),
  (111671.37,  122700.64, 1561.94,'Faixa 13'),
  (122700.65,  133729.90, 1692.26,'Faixa 14'),
  (133729.91,  146137.83, 1826.10,'Faixa 15'),
  (146137.84,  158545.76, 1961.70,'Faixa 16'),
  (158545.77,  170953.69, 2099.04,'Faixa 17'),
  (170953.70,  184740.27, 2238.15,'Faixa 18'),
  (184740.28,  198526.88, 2380.79,'Faixa 19'),
  (198526.89,  212313.47, 2525.19,'Faixa 20'),
  (212313.48,  226100.05, 2671.35,'Faixa 21'),
  (226100.06,  276100.05, 2735.22,'Faixa 22'),
  (276100.06,  326100.05, 2799.08,'Faixa 23'),
  (326100.06,  376100.05, 2862.95,'Faixa 24'),
  (376100.06,  426100.05, 2926.81,'Faixa 25'),
  (426100.06,  476100.05, 2990.68,'Faixa 26'),
  (476100.06,  526100.05, 3054.54,'Faixa 27');

-- 4) Popula tabela_tabelionato (SC 2026 — Anexo I, escrituras com valor)
TRUNCATE public.tabela_tabelionato;
INSERT INTO public.tabela_tabelionato (ato, faixa_min, faixa_max, valor, descricao) VALUES
  ('Escritura com valor', 0.00,       13786.58, 214.07,  'Faixa 1'),
  ('Escritura com valor', 13786.59,   20679.87, 246.86,  'Faixa 2'),
  ('Escritura com valor', 20679.88,   28951.83, 350.47,  'Faixa 3'),
  ('Escritura com valor', 28951.84,   35845.12, 457.49,  'Faixa 4'),
  ('Escritura com valor', 35845.13,   44117.08, 571.45,  'Faixa 5'),
  ('Escritura com valor', 44117.09,   53767.69, 688.86,  'Faixa 6'),
  ('Escritura com valor', 53767.70,   62039.64, 811.44,  'Faixa 7'),
  ('Escritura com valor', 62039.65,   71690.25, 937.45,  'Faixa 8'),
  ('Escritura com valor', 71690.26,   79962.21, 1068.68, 'Faixa 9'),
  ('Escritura com valor', 79962.22,   90991.48, 1205.09, 'Faixa 10'),
  ('Escritura com valor', 90991.49,   100642.09, 1348.40,'Faixa 11'),
  ('Escritura com valor', 100642.10,  111671.36, 1495.12,'Faixa 12'),
  ('Escritura com valor', 111671.37,  122700.64, 1648.79,'Faixa 13'),
  ('Escritura com valor', 122700.65,  133729.90, 1807.62,'Faixa 14'),
  ('Escritura com valor', 133729.91,  146137.83, 1971.64,'Faixa 15'),
  ('Escritura com valor', 146137.84,  158545.76, 2094.22,'Faixa 16'),
  ('Escritura com valor', 158545.77,  170953.69, 2216.80,'Faixa 17'),
  ('Escritura com valor', 170953.70,  184740.27, 2335.93,'Faixa 18'),
  ('Escritura com valor', 184740.28,  198526.88, 2453.34,'Faixa 19'),
  ('Escritura com valor', 198526.89,  212313.47, 2568.99,'Faixa 20'),
  ('Escritura com valor', 212313.48,  226100.05, 2682.95,'Faixa 21'),
  ('Escritura com valor', 226100.06,  276100.05, 2745.56,'Faixa 22'),
  ('Escritura com valor', 276100.06,  326100.05, 2808.18,'Faixa 23'),
  ('Escritura com valor', 326100.06,  376100.05, 2870.79,'Faixa 24'),
  ('Escritura com valor', 376100.06,  426100.05, 2933.41,'Faixa 25'),
  ('Escritura com valor', 426100.06,  476100.05, 2996.02,'Faixa 26'),
  ('Escritura com valor', 476100.06,  526100.05, 3058.64,'Faixa 27');
