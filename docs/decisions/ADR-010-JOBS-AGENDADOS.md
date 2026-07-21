# ADR-010 — Padrão para jobs agendados (Netlify Scheduled Functions)

**Status:** Aceita
**Data:** 2026-07-21
**Decisores:** Victoria Gama

## Contexto

A Fase 12 da Auditoria V2 (benchmarks externos) precisa atualizar mensalmente o IPCA (IBGE/SIDRA) sem depender de uma ação manual da Victoria. Até esta fase, o projeto não tinha nenhuma infraestrutura de job agendado — toda rotina roda dentro de uma requisição HTTP (server action ou route handler), disparada por um clique.

O IPCA é dado de referência **global** (não pertence a nenhuma família), então a rotina que o atualiza não pode (e não deve) rodar sob a sessão de um usuário autenticado — precisa da service role do Supabase, que ignora RLS por completo.

## Decisão

1. **Netlify Scheduled Functions**, sem `netlify.toml`. O agendamento é declarado direto no arquivo da função via `export const config = { schedule: "..." }` (sintaxe cron) — dispensa qualquer arquivo de configuração de build/deploy no repositório. Decisão deliberada: a configuração de deploy da Hub vive só no dashboard do Netlify (Victoria não opera nada disso diretamente), e criar um `netlify.toml` sem visibilidade sobre essa configuração existente seria um risco real de quebrar o deploy de produção sem forma de verificar localmente. **Confirmado no dashboard (Site configuration → Build settings) em 2026-07-21**: `Functions directory: netlify/functions` — exatamente o diretório usado aqui, já reconhecido pelo Netlify sem qualquer `netlify.toml`. A function é descoberta automaticamente no próximo deploy; o agendamento via `config.schedule` é a sintaxe oficial do runtime de Functions v2 e não depende de nenhuma configuração adicional.
2. **Toda função agendada usa a service role** (`SUPABASE_SERVICE_ROLE_KEY`, já provisionada em `.env.local`/`.env.example` desde a fundação do projeto, nunca usada em código até agora) — é a única rotina do projeto autorizada a ignorar RLS, e só porque grava dado de referência global, nunca dado de uma família.
3. **Lógica pura separada da rotina de I/O.** A função (`netlify/functions/<nome>.ts`) expõe uma função pura exportada (ex. `montarRegistros`) que transforma a resposta da API externa em linhas prontas pra upsert — testável via `vitest` sem tocar rede nem banco. A rotina de I/O (fetch + upsert) fica no `export default`, não exportada, sem teste automatizado (mesma disciplina já usada em `matriz.ts`/`sinais.ts`/`validacao.ts`).
   - **O teste do módulo NUNCA fica direto em `netlify/functions/`.** O Netlify trata todo arquivo desse diretório como candidato a função — um `<nome>.test.ts` falha o deploy (`"failed to deploy: <nome>.test"`, nome de função com caractere inválido). Teste vai em `netlify/functions/_test/<nome>.test.ts` — prefixo `_` é a convenção oficial do Netlify Functions para excluir um arquivo/pasta do bundling, mesmo sem `netlify.toml`.
4. **Upsert, nunca insert puro.** Toda tabela alimentada por job agendado tem uma constraint `unique` que corresponde exatamente às colunas de `onConflict` do upsert — rodar o job fora de hora, duas vezes no mesmo mês, ou reprocessar manualmente nunca duplica linha.
5. **Idempotência sobre falha parcial.** Se a API externa não devolver dado pra uma categoria esperada, a função ignora essa categoria (nunca inventa um valor) e segue as demais — sem transação tudo-ou-nada bloqueando o restante.

## Primeira aplicação: `netlify/functions/atualizar-ipca.ts`

Busca a tabela 7060 do IBGE/SIDRA (variação mensal e acumulada em 12 meses do IPCA, índice geral + 9 grupos, nível Brasil) via API pública (sem chave), agrupa por categoria/período e grava em `indices_precos` via upsert. Agendada para todo dia 1 às 06:00 UTC (`0 6 1 * *`) — o IBGE costuma publicar o IPCA do mês anterior por volta do dia 10, então o job de dia 1 sempre traz o período já consolidado do mês retrasado; um atraso de publicação nunca quebra o job, só resulta num upsert que repete o período mais recente disponível.

DIEESE (cesta básica) e POF ficam **fora** deste padrão de propósito: DIEESE não tem API pública estável (entrada manual, ver `CestaBasicaSection.tsx`); POF é pesquisa estática (2017-2018), importada uma vez via SQL Editor, nunca por job.

## Consequências

- Primeira vez que o projeto grava dado com a service role — qualquer função agendada futura segue o mesmo padrão (arquivo próprio em `netlify/functions/`, lógica pura testável, upsert por constraint única).
- Verificação manual (sem CLI do Netlify neste ambiente): a função é importável como módulo comum e foi executada de fato via `tsx` fora do Netlify — buscou os dados reais do SIDRA (10 categorias, período mais recente publicado) e gravou em `indices_precos` via upsert; executada duas vezes seguidas pra confirmar que não duplica linha (mesmo `criado_em` nas 10 linhas na segunda execução). Sua lógica pura (`montarRegistros`) também tem testes unitários.
- Confirmação de que o Netlify já reconhece o agendamento automaticamente (aba Functions do dashboard, após o próximo deploy) fica registrada como item de acompanhamento — não bloqueante, já que a configuração de diretório está confirmada e o `config.schedule` é sintaxe padrão do runtime.

## Status da decisão

Aceita. Vale a partir da Fase 12 da Auditoria V2 (2026-07-21).
