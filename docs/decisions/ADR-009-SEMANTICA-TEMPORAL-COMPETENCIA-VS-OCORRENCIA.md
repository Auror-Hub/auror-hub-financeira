# ADR-009 — Competência de fatura como lente analítica padrão (reconcilia ADR-007 §3.2/§4)

**Status:** Aceita
**Data:** 2026-07-20
**Decisores:** Victoria Gama

## Contexto

A Auditoria V2 (`04-auditoria-v2-hub-financeira-atualizada.html`, revisão do estado pós Fases 0-4 da rearquitetura) apontou uma contradição real entre documentação e código: o [ADR-007](ADR-007-REARQUITETURA-TESE-E-SEMANTICA-TEMPORAL.md) §3.2/§4 fixou **ocorrência** (`lancamentos_brutos.data`) como "regra padrão de competência para análise de consumo" — mas em 2026-07-19, ainda dentro da mesma rearquitetura, o Painel de Controle (Explorar) foi deliberadamente ajustado para filtrar por **competência de fatura** (`competencia_calculada`) nos presets, com "Personalizado" continuando por data real (ver comentário em `src/lib/dashboards/periodo.ts:4-11` e `src/app/(app)/dashboards/page.tsx:23-30`).

Esse ajuste foi um pedido explícito da Victoria e resolve um problema real: uma parcela comprada em maio com competência de julho precisa aparecer quando o filtro é "julho" — do contrário o Explorar não bate com Competências/Histórico/Relatório, que sempre agrupam por competência. **Não é um bug a revert** — é a decisão certa, só nunca formalizada em ADR. O ADR-007 ficou desatualizado no momento em que o código avançou; isso é o que este ADR corrige.

## Decisão

**Competência de fatura (`competencia_calculada`) é a lente padrão para "quanto gastei este mês" em toda tela analítica**: Home ("Hoje"), Explorar (todos os presets exceto Personalizado), Meu Plano, Relatório. Isso supersede o texto de ADR-007 §3.2 item 2 e §4 ("regra de aplicação") — a intenção original daquele ADR (ter uma regra formal e nunca implícita) continua válida; o valor da regra é que muda, porque o uso real revelou que ocorrência quebra a leitura de parcelas.

**Ocorrência (`lancamentos_brutos.data`) continua sendo o fato imutável** (RUL-1) e é a lente ativa em três lugares, nunca mais:
1. **Personalizado** no Explorar — intervalo de datas explicitamente escolhido pela Victoria, sempre rotulado na UI como "por data de compra" (badge junto ao seletor de período) pra nunca ficar implícito qual lente está ativa.
2. **Captura provisória e o matcher de conciliação** — comparam por proximidade de data real, nunca por competência (a intenção "gastei isso ontem" é sempre por ocorrência).
3. **Histórico**, quando não filtrado por competência — lista bruta de lançamentos decididos, útil pra achar "aquele lançamento de tal dia" independente de qual fatura ele caiu.

## Por que reconciliar em vez de reverter

Reverter o ajuste de 19/07 pra "cumprir" o ADR-007 literal reintroduziria o bug real que motivou o ajuste (parcela em mês errado). O ADR-007 nunca foi votado como imutável pela própria Victoria nesse ponto específico — era uma formalização de intenção, escrita antes do caso de parcelas ter sido pensado a fundo. A prática já estabelecida neste projeto (ADR-002 → 003 → 006 → 007, cada um registrando reversão/refinamento do anterior quando o uso real ensina algo novo) é seguida aqui.

## Consequências

- ADR-007 §3.2 item 2 e §4 ficam marcados como **superseded por este ADR** (o arquivo do ADR-007 não é editado — histórico preservado, mesma prática de sempre).
- `DashboardScreen.tsx` ganha um rótulo (`Badge tone="indigo"`, texto "por data de compra") junto ao seletor de período quando `preset === "custom"` — nunca deixa a lente implícita.
- Nenhuma migration, nenhuma mudança de schema — é regra de uso dos campos que já existem (`data` e `competencia_calculada`), exatamente como o ADR-007 já previa em seu último parágrafo da seção 4.
- Telas futuras que agregarem por tempo devem decidir explicitamente qual lente usar e documentar isso no comentário do loader (mesmo padrão já usado em `periodo.ts`) — não silenciosamente herdar uma das duas.

## Status da decisão

Aceita. Vale a partir da Fase 5 da Auditoria V2 (2026-07-20).
