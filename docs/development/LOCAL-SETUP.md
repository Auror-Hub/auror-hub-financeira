# Setup Local

Itens de backend (Supabase, migrations, RLS) seguem **pendentes** até a Etapa 2 ([`CONSTRUCTION-PLAN.md`](../CONSTRUCTION-PLAN.md), BE-1). O frontend (Etapa 1) já está configurado e funcional contra dados mockados.

## Requisitos

- Node.js — usado nesta sessão: v24.15.0 (LTS ativa no momento). Confirmar a LTS corrente ao retomar o trabalho após um hiato longo.
- Gerenciador de pacotes — **pnpm** (confirmado). Instalado via `npm install -g pnpm` nesta sessão (o `corepack enable` falhou por permissão de escrita em `Program Files`; instalar via npm é o caminho alternativo que funcionou).
- Conta Supabase (projeto próprio para desenvolvimento, separado de qualquer futuro ambiente de produção) — necessário a partir da Etapa 2 (BE-1), não antes.
- Supabase CLI — instalação e versão: **pendente até BE-1**.
- Git.

## Variáveis de ambiente

Ver [`.env.example`](../../.env.example) na raiz para os nomes de variáveis previstos. Nenhum valor real deve ser preenchido em arquivo versionado — apenas em `.env.local` (ignorado pelo Git). Nenhuma delas é necessária ainda — a Etapa 1 não depende de Supabase.

## Comandos

- Instalar dependências: `pnpm install`
- Rodar ambiente de desenvolvimento: `pnpm dev` (http://localhost:3000)
- Rodar lint: `pnpm lint`
- Rodar typecheck: `pnpm typecheck`
- Rodar testes: `pnpm test`
- Formatar/checar formatação: `pnpm format` / `pnpm format:check`
- Build de produção: `pnpm build`
- Rodar migrations: **pendente até BE-1**

## Banco de dados local

Estratégia (Supabase local via CLI vs. projeto de desenvolvimento na nuvem) — **pendente, a decidir em BE-1**.

## Migrations

Estratégia de versionamento de schema — **pendente, a decidir em BE-1**. Requisito não negociável (ADR-001): migrations devem rodar do zero sem erro, e a imutabilidade de `ENT-RAW-TRANSACTION`/append-only de `ENT-AUDIT-EVENT` devem ser garantidas no nível do banco, não apenas por convenção de aplicação.

## Testes

Vitest + Testing Library (React) + `@testing-library/user-event`, ambiente `jsdom`. Configuração em `vitest.config.ts`/`vitest.setup.ts`. Convenção: arquivo de teste colocado ao lado do componente (`Componente.test.tsx`).

## Build

Next.js 16 (App Router, Turbopack). Estratégia de deploy — fora do escopo desta fase; será tratada quando houver backend para implantar junto.
