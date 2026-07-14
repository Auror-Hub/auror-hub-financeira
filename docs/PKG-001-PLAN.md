# PKG-001 — Fundação da aplicação (plano)

**Status: SUPERADO.** Substituído por [`CONSTRUCTION-PLAN.md`](CONSTRUCTION-PLAN.md) (fase FE-1), que reorganiza a fundação em 2 etapas (Frontend/Backend) por pedido de Victoria em 2026-07-13. Conteúdo abaixo preservado como histórico — não reflete mais o plano em execução.

---

Este documento descreve o que será feito quando PKG-001 for autorizado a rodar — nenhum comando abaixo foi executado nesta sessão.

## Escopo

### O que PKG-001 implementa

- Scaffold Next.js + TypeScript.
- Configuração de Tailwind alimentada pelos tokens de `HUB-FINANCEIRA-DESIGN-ADAPTATION.md`.
- Estratégia de fontes (Plus Jakarta Sans + DM Mono).
- ESLint + formatter.
- Runner de testes configurado com um teste básico de exemplo.
- Projeto Supabase conectado (auth + banco), sem schema de domínio financeiro ainda — apenas o necessário para autenticação e uma migration inicial vazia/mínima.
- Autenticação mínima (login single-user).
- Estrutura de pastas do projeto (por domínio, não só por tipo técnico).
- Estratégia de variáveis de ambiente (`.env.local` a partir de `.env.example`).
- Componentes fundacionais mínimos (Button, Input, Badge, StatusDot — adaptados, não copiados).
- Layout shell inicial (rail + topbar + área de conteúdo + barra de ação).
- Navegação mínima (itens do mapa de informação, sem telas funcionais atrás deles).
- Healthcheck (rota simples confirmando app + conexão com banco).
- Logging estruturado básico (sem dado financeiro, ver `SECURITY-AND-DATA.md`).

### O que PKG-001 explicitamente não implementa

- Domínio financeiro (nenhuma entidade `ENT-*` de negócio).
- Upload de documento.
- Importação/parsing de CSV (formato principal do MVP — [ADR-002](decisions/ADR-002-FORMATO-IMPORTACAO-CSV.md); PDF fica adiado como formato complementar futuro).
- Classificação.
- Caixa de Entrada.
- Relatórios.
- IA / integração com modelo de classificação.
- Motor de regras.
- Consultor.

## Comandos previstos (a executar somente após autorização)

```bash
# criação do projeto Next.js (TypeScript, App Router, Tailwind, ESLint)
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# dependências adicionais
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add -D vitest @testing-library/react @testing-library/jest-dom prettier

# Supabase CLI (projeto local)
supabase init
supabase login
supabase link --project-ref <ref-do-projeto>
```

Comandos exatos podem mudar conforme a versão disponível das ferramentas no momento da execução — este bloco é a intenção, não um contrato rígido.

## Gerenciador de pacotes

**pnpm** — mais rápido e mais rígido quanto a dependências fantasmas que npm/yarn; adequado para um projeto mantido por uma única pessoa que precisa de previsibilidade.

## Versão de Node recomendada

LTS ativa no momento da execução (a confirmar — Node 22.x é a referência mais recente conhecida; validar qual é a LTS corrente antes de rodar `create-next-app`, já que este plano foi escrito com conhecimento até início de 2026).

## TypeScript

`strict: true` desde o início. Nenhuma exceção de tipo por conveniência — este é um domínio onde um campo opcional indevido (ex.: justificativa de IA) é um bug estrutural, não um detalhe.

## Tailwind

Configurado para ler os tokens semânticos de `HUB-FINANCEIRA-DESIGN-ADAPTATION.md` seção 3 via `theme.extend` (cores, radius, boxShadow, fontFamily, fontSize). Nenhum valor de cor hardcoded fora do arquivo de configuração.

## Adaptação inicial dos tokens visuais

Traduzir a tabela de cores/tipografia/espaçamento/raio/sombra do documento de adaptação para `tailwind.config.ts` e/ou CSS custom properties em `globals.css`. Não importar `docs/design/styles-reference.css` ou `docs/design/base/components-reference.css` diretamente — reescrever os valores necessários.

## Estratégia de fontes

`next/font/google` para Plus Jakarta Sans (400/500/600/700) e DM Mono (400/500) — carregamento otimizado nativo do Next.js, sem `<link>` manual ao Google Fonts.

## ESLint

Config padrão do `create-next-app` (`next/core-web-vitals` + TypeScript) como base; ajustar regras conforme necessidade real, não preventivamente.

## Formatter

Prettier, config mínima (sem plugins não justificados). Integração com ESLint via `eslint-config-prettier` para evitar conflito de regras.

## Testes

Vitest + Testing Library como base (mais rápido que Jest em projetos Vite/Next modernos; a confirmar contra o setup real do Next.js no momento da execução — ver item aberto no ADR-001). Um teste de exemplo cobrindo um componente fundacional (ex.: `Button`) para validar o pipeline, não para cobrir funcionalidade real ainda inexistente.

## Configuração inicial do Supabase

Projeto Supabase de desenvolvimento criado manualmente (fora do código, pela própria Victoria — criação de conta/projeto externo não é uma ação que o Claude Code deve executar sozinho). Client configurado (`@supabase/ssr`) para uso em Server Components e rotas. Nenhuma tabela de domínio financeiro criada ainda.

## Estratégia de migrations

Migrations Supabase versionadas em `supabase/migrations/`, aplicadas via `supabase db push`/`supabase migration up`. Critério de aceite: migrations rodam do zero sem erro em um banco vazio.

## Autenticação

Login single-user via Supabase Auth (email/senha como ponto de partida mais simples; passkey fica como possibilidade futura, não obrigatória em PKG-001). Sessão persistente. Schema já prevê `ENT-USER`/`ENT-PROFILE` como tabelas separadas desde já (mesmo com apenas um registro de cada), para não exigir migration de reestruturação quando família/empresa forem suportadas.

## Estrutura de pastas

Proposta (a validar/ajustar durante a execução, não criar pastas vazias sem uso imediato):

```
src/
├── app/                  # rotas Next.js (App Router)
├── components/
│   ├── ui/               # Button, Input, Badge, StatusDot, etc.
│   └── layout/           # shell, navegação
├── lib/
│   └── supabase/         # clients (browser/server)
├── styles/
└── tests/
```

`domains/` (identity, documents, imports, transactions, merchants, taxonomy, classification, review, rules, competencies, analytics, reports, advisor, audit) **não é criado em PKG-001** — só quando a primeira entidade de domínio real existir (a partir de PKG-002/Fase 1). Criar pastas vazias antecipadamente contraria a restrição de não simular estrutura.

## Estratégia de variáveis de ambiente

`.env.example` (já criado nesta sessão) documenta os nomes. `.env.local` criado localmente por Victoria com valores reais do projeto Supabase de desenvolvimento — nunca gerado ou preenchido pelo Claude Code com valores reais.

## Componentes fundacionais mínimos

`Button`, `Input`, `Badge`, `StatusDot` — adaptados da referência visual conforme `HUB-FINANCEIRA-DESIGN-ADAPTATION.md`, sem nomes ou enums herdados (ver seção 2 desse documento, especialmente o cuidado com o padrão "layer" do `Card` original).

## Layout shell inicial

Rail lateral + topbar + área de conteúdo + barra de ação inferior, conforme padrão estrutural descrito na adaptação visual. Sem conteúdo funcional atrás — apenas o frame.

## Navegação mínima

Itens do mapa de navegação principal (Home, Caixa de Entrada, Competências, Acervo, Fornecedores, Taxonomia, Motor de Regras, Histórico, Relatórios, Consultor, Configurações) como links de rail, cada um levando a uma página placeholder — sem lógica de domínio atrás.

## Healthcheck

Rota simples (`/api/health` ou equivalente) confirmando que a aplicação está no ar e a conexão com Supabase responde.

## Logging

Logger estruturado básico (nível, timestamp, contexto) — sem qualquer dado financeiro, conforme `SECURITY-AND-DATA.md`.

## Riscos

- Escolher uma versão de Node/dependência que fique desatualizada rapidamente — mitigar confirmando versões no momento real da execução, não a partir deste documento.
- Configuração de RLS incorreta desde o início pode dar falsa sensação de segurança mais adiante — mitigar com teste explícito de acesso negado já em PKG-001, mesmo sem dados de domínio.
- Excesso de estrutura de pastas antecipada — mitigar criando só o que PKG-001 usa de fato.

## Critérios de aceite

- `pnpm dev` sobe a aplicação localmente sem erro.
- `pnpm build` completa sem erro.
- `pnpm lint` e typecheck passam sem erro.
- Teste de exemplo passa.
- Migration inicial roda do zero sem erro em banco vazio.
- Login funciona com um usuário de teste (sintético, nunca dado real).
- Healthcheck retorna sucesso com banco conectado.
- Shell de navegação renderiza todos os itens do mapa de informação como placeholders.
- Nenhum dado financeiro real, CSV, PDF ou segredo aparece em nenhum arquivo versionado (checagem manual do `git status`/`git diff` antes de qualquer commit).

## Comandos de validação

```bash
pnpm lint
pnpm typecheck   # ou `tsc --noEmit`, a confirmar no scaffold
pnpm test
pnpm build
```
