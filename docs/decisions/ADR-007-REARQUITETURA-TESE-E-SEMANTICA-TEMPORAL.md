# ADR-007 — Mudança de tese do produto e semântica temporal formal

**Status:** Aceita
**Data:** 2026-07-18
**Decisores:** Victoria Gama

## Contexto

Victoria trouxe dois materiais externos pra uma auditoria completa da Hub: um direcional de execução (`01-direcional-rearquitetura-hub-financeira-claude-code.md`, 18/07/2026) e uma auditoria de UX/UI/produto (HTML, mesma data), ambos fruto de uma sessão de brainstorm + revisão da Hub publicada. O diagnóstico central, verificado contra o código real (não só aceito de olhos fechados): a Hub é competente em explicar o passado (importar → classificar → revisar → fechar → relatar), mas ainda não sustenta uma decisão financeira em andamento. A nota mais baixa da própria auditoria confirma isso — "planejamento e metas": 3,2/10, a pior de todas as dimensões avaliadas.

Este ADR registra duas decisões relacionadas, mas distintas: **(1)** a mudança de tese de produto que orienta as próximas fases, incluindo uma reversão adicional de premissa do blueprint original; **(2)** a formalização da semântica temporal (ocorrência, lançamento, ciclo de fatura, competência analítica), que hoje só existe espalhada em comentários de código.

## Decisão

### 1. Mudança de tese

> De: *Importar → classificar → revisar → fechar competência → gerar relatório.*
> Para: *Capturar → entender → planejar → agir → acompanhar → corrigir rota → aprender.*

Nova unidade de valor: não é mais "uma despesa corretamente interpretada", é "uma decisão financeira tomada, acompanhada e comprovadamente útil para a família". Isso não descarta nada do que já existe — a base de fato/proposta/decisão, auditoria estrutural e revisão humana permanece intocada e é explicitamente elogiada pelos dois documentos de origem. O que muda é o que se constrói **em cima** dessa base a partir daqui (ver plano de fases, arquivo de planejamento).

### 2. Reversão adicional de premissa: "Meu plano" é, de fato, um gerenciador de orçamento

O blueprint original (`docs/product/AUROR-HUB-FINANCEIRA-BLUEPRINT-V01.md:9-15`) lista explicitamente que a Hub não deve ser concebida como **"dashboard financeiro"** nem **"gerenciador de orçamento"**, e "metas financeiras complexas" está listado em "Fora do MVP" (linha 1002). Duas exceções pontuais já haviam sido abertas antes deste ADR:

- Brainstorm 2 (15/07/2026) — Dashboards como "evolução consciente do produto", confirmada por Victoria.
- ADR-006 (17/07/2026) — módulo de Metas simples (teto de gasto recorrente por categoria/geral).

O direcional agora pede a tela "Meu plano" completa: orçamento mensal por categoria e natureza de planejamento, compromissos recorrentes, cenários, projeção, renda opcional. **Isso não é mais uma exceção pontual — é adotar de frente a coisa que o blueprint nomeou como não-objetivo.** Fica registrado aqui como decisão explícita, não como acúmulo silencioso de exceções: a partir deste ADR, orçamento/planejamento mensal é parte do produto. O documento-fonte (blueprint) não é editado — continua descrevendo a premissa original como registro histórico, seguindo a mesma prática dos ADRs 002-006.

O que essa reversão **não** significa: a Hub não vira um app bancário, não faz Open Finance real, não inicia pagamentos, não dá aconselhamento financeiro regulado. O direcional é explícito nesses limites (seção 8) e este ADR os herda sem alteração.

### 3. Decisões da seção 15 do direcional — recomendações do próprio documento, adotadas

1. Nome da tela: **"Meu plano"** na navegação, **"Seu mês"** dentro de "Hoje" (a nova Home).
2. Regra padrão de competência para análise de consumo: **ocorrência** (`lancamentos_brutos.data`) — ver semântica temporal abaixo.
3. Renda no plano: **opcional desde já**, nunca bloqueando o uso sem ela.
4. Pessoa/objetivo como dimensão de plano visual: **opcional e progressiva** — não confundir com a barreira de privacidade do Consultor (essa é sobre texto livre gerado por IA, permanece intocada; a tela de planejamento é interação determinística da própria família com seu próprio dado).
5. Tom das recomendações: calmo, direto, nunca moralista, sempre explicável.
6. "Decisão concluída" = ação marcada como concluída **e** impacto ou aprendizado registrado.

### 4. Semântica temporal formal

Formalizando o que hoje só existe em comentários de código espalhados (`src/lib/domain/types.ts:111`, `src/lib/import/parse.ts:157`, `src/lib/import/actions.ts:397-401`):

| Conceito | Campo real | Significado |
|---|---|---|
| **Ocorrência** | `lancamentos_brutos.data` | Quando a compra/movimentação de fato aconteceu. Nunca recalculada, sempre preservada por linha — inclusive em parcelas, que trazem a data da compra original, não da parcela cobrada. |
| **Lançamento/processamento** | *(não existe campo próprio hoje)* | Quando a instituição processou — hoje não distinguido de "ocorrência" na prática; registrado como lacuna, não urgente (nenhuma tela depende disso ainda). |
| **Ciclo de fatura** | `lancamentos_brutos.competencia_calculada` (texto `AAAA-MM`) via `competenciaFatura` no upload | Fechamento escolhido pela pessoa que importa, uma vez por fatura/upload — resolve parcelas (Tópico A, rodada de 17/07) sem recalcular por linha. `cartoes.regra_de_corte_competencia` (jsonb, hoje não populado por nenhum código) é o espaço já reservado para fechamento/vencimento por cartão quando isso for implementado. |
| **Competência analítica** | Mesma coluna `competencia_calculada` | Hoje é literalmente o ciclo de fatura — não existe ainda uma competência "de consumo" separada do ciclo de fatura. A decisão #2 acima (ocorrência como regra padrão de análise) vale para onde a Hub agrupar por **data**, não para onde já agrupa por competência de fatura (ex.: fechamento de competência continua sendo por fatura, isso não muda). |

**Regra de aplicação, daqui em diante:** telas de **consumo/comportamento** (ex.: "quanto eu gastei em Alimentação este mês") devem preferir agrupar por `data` (ocorrência) quando fizer sentido para a pergunta; telas de **fechamento/caixa** (Competências, Relatórios, fatura) continuam agrupando por `competencia_calculada` (ciclo de fatura), sem mudança. Nenhuma migration é necessária para isto — é uma regra de uso dos campos que já existem, não um campo novo.

## Reconciliação com o que já existe (não reescrever)

- `metas` (ADR-006) já implementa o tipo de meta "limite absoluto por categoria ou conjunto" do direcional — vira a base de "Meu plano" por extensão aditiva, não é reescrita.
- `lancamentos_correcoes` (ADR-005) já é o padrão "nunca apagar, marcar e substituir" que o direcional pede para todo estado novo — reaproveitado conceitualmente onde fizer sentido (ex.: conciliação de lançamento provisório, quando essa fase chegar).

## Consequências

- Toda fase daqui em diante que envolva orçamento/planejamento/metas não precisa mais abrir uma exceção pontual ao blueprint — a reversão já está registrada aqui.
- Telas e textos que hoje descrevem competência como "mês de fechamento" sem qualificar devem, quando tocadas, deixar explícito se estão falando de ciclo de fatura ou de ocorrência — sem necessidade de retrabalho retroativo em telas não tocadas.
- Documentos-fonte (`docs/product/AUROR-HUB-FINANCEIRA-BLUEPRINT-V01.md`, `docs/architecture/`) permanecem como registro histórico, não editados.

## Status da decisão

Aceita. Vale para toda a rearquitetura planejada a partir de 18/07/2026 (Fases 0-4, ver plano de execução).
