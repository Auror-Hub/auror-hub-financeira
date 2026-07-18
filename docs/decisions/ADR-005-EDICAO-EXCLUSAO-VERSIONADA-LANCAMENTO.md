# ADR-005 — Edição e exclusão versionada de lançamento

**Status:** Aceita
**Data:** 2026-07-17
**Decisores:** Victoria Gama

## Contexto

Em uso real, Victoria precisa, a partir da planilha de lançamentos da competência: **excluir** um lançamento e **editar todas as informações do cadastro original** — inclusive a competência (mês), o valor, a data, o fornecedor, a descrição e a fonte (cartão/conta).

Isso colide de frente com o **princípio arquitetural #1 (RUL-1): "Dado bruto (`ENT-RAW-TRANSACTION`) é imutável — nunca editado, apenas lido. Correção sempre gera nova decisão versionada."** O bloqueio é estrutural, não convenção: o trigger `lancamentos_brutos_imutavel` (`supabase/migrations/20260714102320_dominio_bruto_importacao.sql`) rejeita **qualquer** `UPDATE` ou `DELETE` na tabela, para qualquer coluna, inclusive via `service_role`. Um hard-delete ou um `UPDATE` in-place é impossível — e indesejável: apagaria a trilha de fato/auditoria que é a base do produto.

Até aqui, o único mecanismo de "correção" existente (`classificacao_decisoes`, versionado append-only) cobre só a **classificação** (categoria/subcategoria/objetivo/contexto). Não havia como corrigir um **campo bruto** (valor/data/competência/fornecedor/descrição/fonte) nem esconder um lançamento.

## Decisão

Satisfazer "editar" e "excluir" **sem violar a imutabilidade** — nunca alterando ou apagando a linha bruta original. Introduz-se uma marcação append-only e, para edição de campo bruto, uma nova versão do lançamento.

### 1. Nova tabela append-only `lancamentos_correcoes`

Colunas: `lancamento_original_id`, `lancamento_substituto_id` (nullable), `tipo` (`exclusao` | `correcao`), `motivo`, `perfil_id`, `criado_em`. RLS por família (mesmo padrão do resto do schema) e trigger `lancamentos_correcoes_imutavel` bloqueando UPDATE/DELETE — mesma régua de `eventos_auditoria`. Migration: `supabase/migrations/20260717000000_lancamento_correcoes.sql`.

### 2. Excluir = esconder, nunca apagar

`excluirLancamento` insere uma marcação `tipo='exclusao'` (`substituto` nulo). A linha bruta continua no banco. Um helper compartilhado `carregarIdsInativos()` (`src/lib/lancamentos/inativos.ts`) devolve o conjunto de ids marcados, e **todos os consumidores de acervo** filtram esses ids: Caixa de Entrada, Histórico, Competências (KPIs e **snapshot de fechamento**), Dashboards, Home e Consultor. É a mesma filosofia que o próprio brainstorm pediu para cartões ("meio de pagamento excluído" preserva histórico).

### 3. Editar campo bruto = nova versão do lançamento

`editarLancamento` compara os campos brutos com o original:
- Se **só a classificação** mudou → versiona a decisão pelo caminho já existente (`corrigirClassificacao`), sem tocar no bruto.
- Se **algum campo bruto** mudou → insere uma **nova linha** `lancamentos_brutos` (`origem='correcao'`) com os valores corrigidos, grava a decisão escolhida como `confirmada` v1 nessa nova linha, e registra `lancamentos_correcoes` `tipo='correcao'` ligando original → substituto. A original fica escondida (via o mesmo filtro do item 2); o substituto aparece normalmente. Mesmo espírito do RUL-1: "correção sempre gera nova versão".

### 4. Competência e reabertura

`competencia_calculada` é texto na linha (não FK); mudar a competência move o lançamento de mês. Exclusão e edição chamam `reabrirSeFechada` (RUL-8) para a competência afetada — e, na edição de competência, para o mês antigo **e** o novo — de modo que um snapshot fechado nunca fica inconsistente sem reabertura versionada.

### 5. Auditoria sem vazar dado financeiro

Cada ação grava `eventos_auditoria` (`exclusão` / `alteração`). Em alteração, o `detalhe` registra só os **nomes** dos campos alterados (ex.: `["valor","competencia"]`) e o id do substituto — nunca os valores em si (política de segurança: não registrar descrição/valor/cartão/fornecedor).

## Consequências

- "Excluir" no produto significa **ocultar preservando auditoria**, não apagar — comunicado ao usuário no modal. Hard-delete continua proibido (arquitetura + regras de operação destrutiva).
- Editar um campo bruto cria uma nova linha; relatórios/competências fechadas anteriores permanecem intactos até uma reabertura explícita.
- Todo novo consumidor de `lancamentos_brutos` que agregue ou exiba acervo **deve** aplicar `carregarIdsInativos()` — do contrário mostraria lançamentos excluídos/substituídos. Ponto de atenção para evoluções futuras.
- Divergência registrada: refina (não revoga) o princípio #1 — a linha bruta continua imutável; "edição/exclusão" são camadas append-only por cima, coerentes com auditoria estrutural (princípio #4).
