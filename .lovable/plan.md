## Objetivo

Ajustar o Financeiro para que os valores de lucro considerem somente orçamentos com status **Aprovado**.

## Alterações

- Manter os filtros, faturamento bruto, repasses, quantidade de orçamentos e demais indicadores como estão.
- Somar no **Lucro líquido**, na **Média mensal (líquido)**, nos gráficos e nas tabelas financeiras apenas os serviços de orçamentos aprovados.
- Preservar a contagem separada de aprovados e finalizados.
- Validar a tela Financeiro após o ajuste.

## Detalhes técnicos

- Centralizar a condição de elegibilidade do lucro para evitar divergências entre visão mensal e visão por escritório.
- Aplicar a regra `status === "aprovado"` antes de acumular o lucro, sem excluir o orçamento dos outros totais.
