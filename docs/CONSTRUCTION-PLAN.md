# Plano de construção — Etapa 1 (Frontend) e Etapa 2 (Backend)

**Status:** aprovado por Victoria em 2026-07-13. Substitui [`PKG-001-PLAN.md`](PKG-001-PLAN.md) (marcado como superado).

## Contexto

Até a aprovação deste plano só existia documentação (blueprint, arquitetura, ADRs, design adaptation, roadmap) — nenhum código. O `PKG-001-PLAN.md` anterior tratava fundação como um pacote único misturando Next.js, Tailwind, Supabase e auth juntos.

Victoria pediu para reorganizar a execução em **2 etapas sequenciais** — Frontend primeiro, Backend depois — cada uma com suas próprias fases (nem muito pequenas, nem muito grandes), com uma checagem de validação antes de cada commit.

Duas decisões confirmadas por Victoria para viabilizar essa separação:

1. **Amplitude da Etapa 1:** cobre só o fluxo operacional principal — Home, Caixa de Entrada (fila + revisão + drawer) e Competências (lista + detalhe + fechamento/reabertura). As demais áreas do mapa de informação (Acervo, Fornecedores, Taxonomia, Motor de Regras, Histórico, Relatórios, Consultor, Configurações, Auditoria) entram como placeholders de navegação na Etapa 1, e ganham conteúdo real (frontend + backend juntos) mais adiante, fase a fase, seguindo a ordem já aprovada no [`ROADMAP.md`](ROADMAP.md) (F2 → F3 → F5 → F6+7 → F4 → F8 → F9).
2. **Autenticação na Etapa 1:** sessão simulada (usuário fake fixo no contexto da aplicação) — sem tela de login real. Login de verdade (Supabase Auth) é construído na Etapa 2 e substitui a sessão simulada.

**Por que isso não viola D10** ("MVP roda com persistência real desde a Fase 1, não com dados mockados") **nem o princípio "não construir interface sobre modelo frágil":** os tipos TypeScript usados para os dados mockados da Etapa 1 espelham exatamente as entidades (`ENT-RAW-TRANSACTION`, `ENT-CLASSIFICATION-PROPOSAL`, `ENT-CLASSIFICATION-DECISION`, `ENT-COMPETENCY`, etc.) já congeladas na Arquitetura Completa — não são inventados livremente pelo frontend. A Etapa 1 é explicitamente rotulada como scaffold de UI, não como funcionalidade entregue; nenhuma competência real é fechada, nenhum lançamento real é classificado, até a Etapa 2 religar os dados de verdade.

**Nota (2026-07-13):** o contexto oficial do MVP foi corrigido para representar as finanças conjuntas da Família Gama, não as pessoais da Victoria — ver [ADR-003](decisions/ADR-003-CONTEXTO-FAMILIAR-E-TAXONOMIA.md) e [`TAXONOMIA-INICIAL.md`](product/TAXONOMIA-INICIAL.md). Isso também consolidou a classificação em 4 dimensões (categoria/subcategoria/objetivo/contexto), reduzindo as 6 originais. FE-1/FE-2/FE-3 já implementadas usam o modelo de 6 dimensões e objetivos genéricos — ficam **temporariamente desalinhadas** até um pacote de correção (ver ADR-003, seção de impacto no código). Isso não bloqueia FE-4/FE-5.

## Etapa 1 — Frontend (Next.js + Tailwind, sem Supabase)

Cinco fases. Nenhuma delas toca o Supabase — tudo roda contra uma camada de dados mockados/sintéticos, nunca dados reais de Victoria, Paulo ou Malu.

### FE-1 — Fundação de frontend ✅ concluída
- Scaffold Next.js 16 (App Router) + TypeScript `strict`, conforme ADR-001.
- Tailwind v4 (CSS-first, `@theme`) configurado a partir dos tokens de `HUB-FINANCEIRA-DESIGN-ADAPTATION.md`.
- Fontes via `next/font/google` (Plus Jakarta Sans + DM Mono).
- ESLint + Prettier (`eslint-config-prettier` para não conflitar).
- Vitest + Testing Library configurados, com teste de exemplo (`Button.test.tsx`).
- Componentes fundacionais: `Button`, `Input`, `Badge`, `StatusDot`.
- Shell de layout (rail + topbar + área de conteúdo + barra de ação) e navegação com os 11 itens do mapa de informação — todos como placeholder "em construção" por enquanto.
- Contexto de sessão simulada (`SessionProvider`/`useSession`, usuário fake fixo, sem tela de login).

### FE-2 — Camada de dados mockados + Home ✅ concluída
- Tipos TS espelhando os campos das entidades relevantes ao núcleo operacional e um conjunto pequeno de dados sintéticos plausíveis.
- Home (`SCR-HOME-001`) com síntese interpretativa mockada.

### FE-3 — Caixa de Entrada ✅ concluída
- Fila (`SCR-INBOX-001`), revisão individual em drawer (`SCR-INBOX-REVIEW-001`) com `ConfidenceIndicator`/`SuggestionBlock`, revisão em lote (`SCR-INBOX-BATCH-001`).
- Distinção visual fato/sugestão/decisão é o critério de qualidade mais importante desta fase.

### FE-4 — Competências ✅ concluída
- Lista (`SCR-COMP-LIST-001`) e detalhe (`SCR-COMP-DETAIL-001`, rota dinâmica `/competencias/[id]`), modais de fechamento (bloqueado quando há pendência) e reabertura (motivo obrigatório) — fluxo visual completo, sem persistência real.

### FE-5 — Revisão e contratos para a Etapa 2 ✅ concluída
- Acessibilidade: `useFocusTrap` (foco move para dentro do Drawer/Modal ao abrir, prende Tab/Shift+Tab, devolve foco a quem abriu ao fechar) aplicado em ambos.
- Responsividade: `KpiStrip` corrigido para `auto-fit` (colunas encolhem em telas estreitas em vez de espremer o valor até quebrar em várias linhas) — bug real encontrado e corrigido durante a verificação desta fase.
- Correção de hierarquia de heading (`InsightNarrative` h3→h2, evitando pular nível a partir do h1 da página).
- Contratos TypeScript consolidados e documentados em [`FRONTEND-CONTRACTS.md`](development/FRONTEND-CONTRACTS.md), incluindo o checklist de aderência ao design e a divergência pendente do ADR-003 (6→4 dimensões) formalizada como passo explícito de BE-3.

## Etapa 2 — Backend (Supabase real, religando a Etapa 1)

Cinco fases, seguindo a ordem já aprovada no roadmap (F0 → F1 → F2 → F3 → F5).

### BE-1 — Fundação de dados ✅ concluída
- Projeto Supabase criado por Victoria; credenciais em `.env.local` (nunca coladas em chat — ver `SECURITY-AND-DATA.md`).
- Migration `supabase/migrations/20260714085640_fundacao_dados.sql`: tabelas `usuarios`/`perfis`/`cartoes`/`configuracoes` (`ENT-USER`/`ENT-PROFILE`/`ENT-CARD`/`ENT-SETTINGS`), RLS em todas, trigger `handle_new_user` provisionando perfil "Família Gama" automaticamente no cadastro (ver ADR-003 — `tipo='familia'`, divergindo do `'pessoal'` da Arquitetura Completa original).
- `src/lib/supabase/{client,server,admin}.ts` — clientes browser/server (RLS) e admin (service role, `server-only`, nunca exposto ao cliente).
- `src/proxy.ts` (convenção Next.js 16, substitui `middleware.ts`) — protege rotas autenticadas, redireciona para `/entrar` sem sessão.
- Rotas reorganizadas em route groups: `(app)` (shell + sessão real) e `(auth)/entrar` (login/cadastro, sem shell).
- `SessionContext` agora recebe sessão real (nome do perfil vindo do banco) via `(app)/layout.tsx`, não mais mock.
- Healthcheck real em `/api/health`.
- Validado: lint/typecheck/test/build limpos; script descartável confirmou que o trigger provisiona corretamente e que RLS bloqueia de fato o acesso entre usuários (dois usuários de teste criados via Admin API, testados e removidos — nunca usando credenciais reais); fluxo completo testado no browser (cadastro → login → shell com "Família Gama" → logout → redirecionamento).

### BE-2 — Domínio bruto (importação CSV, ADR-002)
`ENT-SOURCE-DOCUMENT`/`IMPORT-BATCH`/`IMPORT-EVENT`/`RAW-TRANSACTION`/`POSSIBLE-DUPLICATE`, perfil de importação (`ENT-IMPORT-PROFILE`), upload real de CSV, validação, conciliação, dedup, teste de imutabilidade (RUL-1).

### BE-3 — Inteligência (estrutura)
Taxonomia seed a partir de [`TAXONOMIA-INICIAL.md`](product/TAXONOMIA-INICIAL.md) (4 dimensões — categoria/subcategoria/objetivo/contexto, 17 categorias, 13 objetivos; ver [ADR-003](decisions/ADR-003-CONTEXTO-FAMILIAR-E-TAXONOMIA.md)), padronização de fornecedores, motor de classificação inicial, religar a Caixa de Entrada a propostas reais. Inclui o pacote de correção do código de FE-2/FE-3 (hoje com 6 dimensões e objetivos genéricos) para o modelo consolidado.

### BE-4 — Revisão humana real
`ENT-CLASSIFICATION-DECISION`/`REVIEW-EVENT`/`EXCEPTION` persistidos, auditoria append-only reforçada no banco (RUL-10).

### BE-5 — Competências reais
`ENT-COMPETENCY`/`COMPETENCY-CLOSURE`/`ANALYTICAL-SNAPSHOT` reais, religar as telas de Competências. Ao final, o fluxo operacional principal está funcional de ponta a ponta com dados reais.

## Depois da Etapa 2

Fases 6+7 (análise/relatórios), 4 (regras/aprendizagem), 8 (Consultor) e 9 (refinamento) — e as telas ainda não construídas (Acervo, Fornecedores, Taxonomia, Motor de Regras, Histórico, Relatórios, Consultor, Configurações, Auditoria) — passam a ser planejadas fase a fase, frontend e backend juntos, na ordem já confirmada no roadmap. Cada uma ganha seu próprio plano curto quando chegar a vez.

## Processo por fase (repete a cada uma das 10 fases acima)

1. Planejar o escopo mínimo da fase.
2. Implementar.
3. Rodar lint, typecheck, testes, build.
4. Para fases com UI: subir o dev server e verificar visualmente no browser (fluxo principal + estados vazio/erro relevantes).
5. Revisar `git diff` completo.
6. **Apresentar a Victoria, antes de qualquer commit:** o que foi implementado, resultado de lint/typecheck/teste/build, o que foi verificado no browser, e qualquer decisão tomada durante a fase que valha registro. Aguardar o "ok" explícito antes de commitar.
7. Só commitar após aprovação.
