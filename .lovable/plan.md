## Objetivo

Transformar o gerador em uma **biblioteca de modelos oficiais**: textos travados por serviço, tabela interna de honorários, módulos de cálculo (ITBI, ITCMD, Tabelionato, Registro), multisserviço com blocos independentes no PDF e área administrativa para editar tudo sem mexer no código.

---

## 1. Biblioteca de modelos de serviço (texto travado)

Hoje os textos vivem em `src/lib/empresa.ts` (`DESCRICAO_PADRAO`, `METODOLOGIA_SERVICO`, `TEMPLATES_ITENS`) — funciona, mas está espalhado e misturado entre serviços já revisados (desdobro, remembramento, desmembramento INCRA) e textos genéricos antigos.

Ações:
- Consolidar em um único objeto `MODELOS_SERVICO[tipo]` com: `titulo`, `descricao`, `objeto`, `metodologia`, `servicos_inclusos[]`, `itens_padrao[]`, `observacoes`.
- Preencher **apenas** os 3 modelos já confirmados (desdobro, desmembramento INCRA, remembramento) com o texto oficial integral.
- Demais serviços ficam marcados como `revisao_pendente: true` e seguem com o texto atual até você enviar os modelos oficiais (combinado no bloco anterior: "Manda os próximos PDFs que eu vou continuar no mesmo padrão").
- Regra de renderização: o PDF imprime **literalmente** o que está no modelo — sem reescrita, resumo ou junção entre serviços.

## 2. Tabela interna de valores (honorários Agiliza)

Nova tabela `tabela_honorarios` no banco (Lovable Cloud), pré-populada com os valores fornecidos:

| Código | Descrição | Valor |
|---|---|---|
| assessoria_documental | Assessoria Documental | 550,00 |
| certidoes_assinaturas | Certidões Negativas e Assinaturas | 420,00 |
| ccir_itr_car | Atualização CCIR, ITR e CAR | 250,00 |
| topografia_locacao | Levantamento Topográfico e Locação | 2.200,00 |
| planimetrico | Levantamento Planimétrico | 1.200,00 |
| planialtimetrico | Levantamento Planialtimétrico | 1.200,00 |
| desdobro_urbano | Desdobro Urbano | 3.200,00 |
| desmembramento_incra | Desmembramento INCRA | 3.400,00 |
| remembramento | Remembramento | 1.800,00 |
| declaracao_tecnica | Declaração Técnica | 550,00 |
| assessoria_juridica | Assessoria Jurídica | 2.800,00 |

Regra explícita: **valores "totais" de orçamentos antigos (ex.: Inventário R$ 7.374,46, Usucapião R$ 11.794,18) NÃO entram nessa tabela** — são soma de itens, nunca preço de serviço.

## 3. Módulos de cálculo de custas externas

Cada módulo segue a prioridade: **1º tabela cadastrada → 2º cálculo automático → 3º edição manual**. Nunca inventar valor.

- **ITBI** — já existe `itbi_municipios`. Manter, expor seleção de município + valor declarado + alíquota (editável) + ITBI calculado.
- **ITCMD** — nova tabela `itcmd_aliquotas` (tipo: doação/inventário, faixa, alíquota). Calcula sobre valor base, alíquota editável.
- **Tabelionato** — nova tabela `tabela_tabelionato` (tipo de ato, faixa de valor declarado, valor/emolumento).
- **Registro de Imóveis** — manter `calculo-registro.ts` mas alimentar por `tabela_registro_imoveis` no banco (faixa → valor) para você ajustar sem código.
- **Sem tabela cadastrada**: campo livre `R$ ____` no orçamento.

## 4. Multisserviço (já existe parcialmente)

`ServicoBloco` já está no tipo. Garantir que:
- Cada bloco no formulário tenha seu próprio modelo, valores e observações.
- PDF imprime **um bloco por serviço**, em sequência, cada um com: título, descrição, objeto, metodologia, serviços inclusos, valores, observações.
- Nunca concatenar metodologias.

## 5. Cálculo do total

```
TOTAL = Σ honorários Agiliza (todos os blocos)
      + Σ custas calculadas (ITBI/ITCMD/Tabelionato/Registro)
      + Σ custas manuais
```

ITBI/ITCMD aparecem destacados como "estimativa de custo do cliente" — somam no total do orçamento (custas externas), mas continuam **separados visualmente** dos honorários Agiliza, como já combinado.

## 6. Área administrativa

Rota nova `/_app/admin-tabelas` (acesso admin), com abas:
- Honorários Agiliza
- Municípios + alíquotas ITBI (já existe em `/itbi`)
- Alíquotas ITCMD
- Tabela Tabelionato
- Tabela Registro de Imóveis

CRUD direto pelo painel, sem deploy.

## 7. PDF

Mantém: layout, rodapé institucional (5 unidades), escritório responsável, margens, paginação. Muda apenas o conteúdo: passa a renderizar bloco-a-bloco com o texto literal do modelo.

---

## Detalhes técnicos

**Migrations necessárias:**
1. `tabela_honorarios` (codigo unique, descricao, valor, ativo)
2. `itcmd_aliquotas` (tipo, uf, faixa_min, faixa_max, aliquota)
3. `tabela_tabelionato` (ato, faixa_min, faixa_max, valor)
4. `tabela_registro_imoveis` (faixa_min, faixa_max, valor)
5. Seed com os 11 honorários listados.
6. RLS: leitura `authenticated`, escrita só `admin` via `is_admin(auth.uid())`. GRANT em todas.

**Arquivos a criar/editar:**
- `src/lib/modelos-servico.ts` (novo) — consolida modelos oficiais
- `src/lib/empresa.ts` — remove `DESCRICAO_PADRAO`/`METODOLOGIA_SERVICO`/`TEMPLATES_ITENS`, redireciona para `modelos-servico`
- `src/lib/calculo-custas.ts` (novo) — funções `calcularITBI`, `calcularITCMD`, `calcularTabelionato`, `calcularRegistro` com fallback tabela→auto→manual
- `src/components/orcamento-form.tsx` — bloco "Custas externas" com ITBI, ITCMD, Tabelionato, Registro, Outros (manual)
- `src/lib/gerar-pdf.ts` — render bloco-a-bloco; seção "Custas e taxas externas" separada de honorários
- `src/routes/_app.admin-tabelas.tsx` (novo) — CRUD das 4 tabelas
- Tipos Supabase regenerados após migrations

**Escopo desta entrega:**
- Migrations + seed honorários
- `modelos-servico.ts` com os 3 já oficiais
- Tela administrativa CRUD
- Módulo de custas + integração no formulário e PDF
- Render multisserviço bloco-a-bloco no PDF

**Fora de escopo (próxima rodada, quando você enviar os modelos):**
- Texto oficial dos demais serviços (georreferenciamento, retificações, inventário, usucapião, doação, permuta, etc.) — continuam com o texto atual marcado como `revisao_pendente`.

---

## Confirmações antes de codar

1. **ITBI/ITCMD entram no total** do orçamento (como custas) ou continuam **só informativos** (como hoje no ITBI)?
2. **Tabela Tabelionato e Registro**: você tem as faixas oficiais para popular agora, ou crio a estrutura vazia e você cadastra pelo painel admin?
3. **Quem acessa a área administrativa**: só `role = admin` ou também `gerente`?
