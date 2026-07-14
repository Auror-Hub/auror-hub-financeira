# Setup Local

Frontend e backend (Supabase) configurados e funcionais desde BE-1 ([`CONSTRUCTION-PLAN.md`](../CONSTRUCTION-PLAN.md)).

## Requisitos

- Node.js — usado nesta sessão: v24.15.0 (LTS ativa no momento). Confirmar a LTS corrente ao retomar o trabalho após um hiato longo.
- Gerenciador de pacotes — **pnpm** (confirmado). Instalado via `npm install -g pnpm` nesta sessão (o `corepack enable` falhou por permissão de escrita em `Program Files`; instalar via npm é o caminho alternativo que funcionou).
- Conta e projeto Supabase de desenvolvimento — criado por Victoria em BE-1.
- Supabase CLI — disponível via `pnpm exec supabase <comando>` (instalado como devDependency, sem necessidade de instalação global).
- Git.

## Variáveis de ambiente

Ver [`.env.example`](../../.env.example) na raiz para os nomes de variáveis previstos. Nenhum valor real deve ser preenchido em arquivo versionado — apenas em `.env.local` (ignorado pelo Git). Desde BE-1, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são obrigatórias para a aplicação rodar (login, healthcheck).

**Nunca cole esses valores em uma conversa de chat** (nem com o Claude Code, nem com qualquer outra ferramenta) — edite `.env.local` diretamente no seu editor. Ver [`SECURITY-AND-DATA.md`](SECURITY-AND-DATA.md).

## Comandos

- Instalar dependências: `pnpm install`
- Rodar ambiente de desenvolvimento: `pnpm dev` (http://localhost:3000)
- Rodar lint: `pnpm lint`
- Rodar typecheck: `pnpm typecheck`
- Rodar testes: `pnpm test`
- Formatar/checar formatação: `pnpm format` / `pnpm format:check`
- Build de produção: `pnpm build`
- Rodar/criar migrations: `pnpm exec supabase migration new <nome>` (cria arquivo); aplicar via SQL Editor do painel Supabase (ver `Migrations` abaixo) ou `pnpm exec supabase db push` se o CLI estiver linkado ao projeto (`pnpm exec supabase link --project-ref <ref>` — requer token de acesso pessoal do Supabase, não usado nesta sessão).

## Banco de dados

Projeto Supabase hospedado (não local/Docker) usado desde BE-1 — mais simples para uma única desenvolvedora, sem exigir Docker rodando. `supabase/config.toml` existe para uso futuro de `supabase start` (stack local), mas não é o fluxo atual.

## Migrations

Arquivos SQL versionados em `supabase/migrations/` (convenção do Supabase CLI: `YYYYMMDDHHmmss_descricao.sql`). Aplicação nesta sessão foi manual — Victoria copiou o SQL da migration para o SQL Editor do painel Supabase e rodou lá, revisando antes de tocar no banco real. Nenhum token de acesso do Supabase ou senha do Postgres foi necessário para isso. Requisito não negociável (ADR-001) permanece: imutabilidade de `ENT-RAW-TRANSACTION`/append-only de `ENT-AUDIT-EVENT` devem ser garantidas no nível do banco quando essas tabelas forem criadas (BE-2/BE-4), não apenas por convenção de aplicação.

## Autenticação

Supabase Auth real desde BE-1 — e-mail/senha, tela em `/entrar`. `src/proxy.ts` (convenção Next.js 16, substitui `middleware.ts`) protege as rotas autenticadas. Sessão exposta via `useSession()` (`src/lib/session/SessionContext.tsx`), populada por `(app)/layout.tsx` a partir da sessão real.

## Testes

Vitest + Testing Library (React) + `@testing-library/user-event`, ambiente `jsdom`. Configuração em `vitest.config.ts`/`vitest.setup.ts`. Convenção: arquivo de teste colocado ao lado do componente (`Componente.test.tsx`). Testes automatizados não tocam o Supabase real — verificações contra o banco real (RLS, triggers) foram feitas manualmente com scripts descartáveis e usuários de teste removidos ao final (ver `SECURITY-AND-DATA.md`).

## Build

Next.js 16 (App Router, Turbopack). Estratégia de deploy — fora do escopo desta fase; será tratada quando houver mais funcionalidade para implantar junto.
