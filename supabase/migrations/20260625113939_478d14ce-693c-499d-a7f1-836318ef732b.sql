
INSERT INTO public.tabela_valores (categoria, chave, descricao, valor, ordem)
SELECT * FROM (VALUES
  ('servico_base'::text, 'assessoria_juridica',  'ASSESSORIA JURÍDICA',                2800.00, 30),
  ('servico_base',       'declaracao_tecnica',   'DECLARAÇÃO TÉCNICA',                  550.00, 40),
  ('servico_base',       'desdobro_urbano',      'DESDOBRO URBANO',                    3200.00, 50),
  ('servico_base',       'desmembramento_incra', 'DESMEMBRAMENTO INCRA',               3400.00, 60),
  ('servico_base',       'planialtimetrico',     'LEVANTAMENTO PLANIALTIMÉTRICO',      1200.00, 70),
  ('servico_base',       'planimetrico',         'LEVANTAMENTO PLANIMÉTRICO',          1200.00, 80),
  ('servico_base',       'remembramento',        'REMEMBRAMENTO',                      1800.00, 90),
  ('servico_base',       'topografia_locacao',   'LEVANTAMENTO TOPOGRÁFICO E LOCAÇÃO', 2200.00, 100)
) AS v(categoria, chave, descricao, valor, ordem)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tabela_valores tv WHERE tv.chave = v.chave
);

DROP TABLE IF EXISTS public.tabela_honorarios CASCADE;
