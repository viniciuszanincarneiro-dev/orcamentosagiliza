INSERT INTO public.tabela_valores (categoria, chave, descricao, valor, ordem)
VALUES ('config', 'ri_fator_ajuste', 'Fator de ajuste do RI (%) — aplicado sobre o valor declarado do imóvel antes da tabela', 70, 100)
ON CONFLICT (categoria, chave) DO NOTHING;