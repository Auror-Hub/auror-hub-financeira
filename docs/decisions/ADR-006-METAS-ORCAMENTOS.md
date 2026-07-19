# ADR-006 — Módulo de Metas/Orçamentos

**Status:** Aceita
**Data:** 2026-07-17
**Decisores:** Victoria Gama

## Contexto

Item mais pedido pela sócia no brainstorm estruturado (`Insights Hub Fin V2.docx`, seção "Módulo de Metas e Orçamentos", marcado V1 na matriz de priorização): definir um teto de gasto (por categoria ou geral) e ser avisado quando estiver perto ou tiver estourado. O blueprint original de produto listava "metas"/"planejamento" só na **"Fase 2 — uso pessoal ampliado"** (evolução futura, fora do MVP) — nunca chegou a ser especificado ou implementado. Trazer isso pra agora é uma **aceleração de escopo consciente**, confirmada por Victoria, não uma reversão de um princípio já fixado (diferente do caso do Splitwise/rateio entre pessoas, que colide de frente com uma fronteira explícita do ADR-003 e por isso não foi implementado nesta rodada).

## Decisão

### 1. Meta é um alvo recorrente, não presa a um mês

"Orçamento de R$3.000/mês em Alimentação" vale todo mês até ser desativado/substituído — não existe "meta de julho" separada de "meta de agosto". Isso é mais simples que versionar por mês e é exatamente como o pedido original foi descrito (um teto, não um plano mês a mês).

### 2. Meta por categoria ou geral, nunca por subcategoria/objetivo

`categoria_id` nullable — nulo significa orçamento geral (soma de todas as categorias da competência). Objetivo (quem da família) e subcategoria ficam fora do escopo desta rodada; o pedido original é no nível de categoria macro.

### 3. Conteúdo imutável, editar = desativar e criar nova

Mesmo padrão já estabelecido em `regras` e `taxonomia_termos`: depois de criada, só o campo `status` pode mudar (trigger `metas_conteudo_imutavel` bloqueia qualquer outra alteração, mesmo via `service_role` — defesa em profundidade contra a RLS ser por linha, não por coluna). "Editar o limite" cria uma nova linha `ativa` e marca a antiga como `inativa`, preservando um rastro de como o orçamento evoluiu ao longo do tempo, em vez de reescrever silenciosamente um número que já pode ter gerado um alerta.

### 4. "Gasto real" usa a mesma definição de competência "atual" da Home

Sempre a competência mais recente (`carregarCompetencias()[0]`), filtrada por `competencia_calculada` — nunca por intervalo de datas de calendário, porque a competência de um lançamento pode divergir da data dele (ver o campo de competência explícita da rodada anterior). A agregação "soma por categoria numa competência" já existia dentro de `src/lib/home/consulta.ts` (função privada `carregarLancamentosComCategoria`); foi promovida para `src/lib/lancamentos/porCategoria.ts` (módulo compartilhado) para ser reaproveitada por Metas sem duplicar a lógica e sem criar import circular entre `home` e `metas`.

### 5. Dois limiares fixos: 80% (atenção) e 100% (estourada)

Sem configuração de limiar por usuário nesta rodada — mantém o V1 simples. `src/lib/metas/avaliacao.ts` centraliza essa regra em funções puras (`avaliarProgresso`, `gerarAlerta`), reaproveitadas tanto pela tela `/metas` quanto pelos alertas da Home, garantindo que os dois lugares nunca divirjam no critério.

### 6. Alertas reaproveitam a lista `AlertaHome` já existente

Nenhum componente novo de UI na Home — os alertas de meta são inseridos na mesma lista `alertas: AlertaHome[]` que já existia para "lançamentos pendentes de revisão", renderizada pelo mesmo `Card accent="gold"` (`src/app/(app)/page.tsx`).

## Fora de escopo (registrado, não bloqueante)

- **Alinhamento com benchmarks de mercado (DIEESE/Censo)** — V2 do documento original; precisa de uma fonte de dado externa e decisão própria de como integrar. Não implementado.
- **Meta por subcategoria ou por objetivo** — se fizer falta na prática, é uma extensão natural do mesmo schema (`categoria_id` já é nullable; adicionar `subcategoria_id`/`objetivo_id` seguiria o mesmo padrão).
- **Configuração de limiar de alerta por usuário** — hoje fixo em 80%/100%.
- **Aplicação retroativa de mudança de limite** — como o valor é imutável e editar cria uma nova versão, o histórico de metas antigas não é reavaliado contra competências passadas; a tela mostra sempre o progresso contra a competência atual.
