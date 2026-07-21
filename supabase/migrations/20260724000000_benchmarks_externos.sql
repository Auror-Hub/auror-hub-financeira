-- Fase 12 (Auditoria V2): benchmarks e contexto externo. Camadas separadas
-- por design — plano próprio, histórico próprio, referência econômica
-- (IPCA/DIEESE) e pares estatísticos (POF) nunca se misturam num único
-- "certo/errado"; cada tabela representa uma fonte, nunca é escrita a
-- partir de outra.

-- `indices_precos` (IPCA/IBGE-SIDRA, tabela 7060) — dado de referência
-- global (não por família), populado pela Netlify Scheduled Function
-- (service_role, ignora RLS) ou manualmente via SQL Editor. Só leitura
-- para usuários autenticados, mesmo padrão de `taxonomia_termos`.
create table public.indices_precos (
  id uuid primary key default gen_random_uuid(),
  fonte text not null default 'IBGE-SIDRA-7060',
  categoria_ibge text not null,
  regiao text not null default 'Brasil',
  periodo_referencia text not null,
  valor_indice numeric null,
  variacao_mensal numeric null,
  variacao_12m numeric null,
  criado_em timestamptz not null default now(),
  unique (fonte, categoria_ibge, regiao, periodo_referencia)
);

alter table public.indices_precos enable row level security;
create policy "indices_precos: leitura para autenticados" on public.indices_precos
  for select
  using (auth.uid() is not null);

-- `cesta_basica_precos` (DIEESE) — sem API pública estável; entrada manual
-- documentada como tal (nunca finge ser automática). Mesma decisão já usada
-- pra `taxonomia_termos` (Ajuste B): vocabulário/referência compartilhada,
-- qualquer usuário autenticado pode cadastrar (sem "admin" de plataforma
-- no schema atual).
create table public.cesta_basica_precos (
  id uuid primary key default gen_random_uuid(),
  capital text not null,
  periodo_referencia text not null,
  valor_cesta bigint not null check (valor_cesta > 0),
  criado_em timestamptz not null default now(),
  unique (capital, periodo_referencia)
);

alter table public.cesta_basica_precos enable row level security;
create policy "cesta_basica_precos: leitura para autenticados" on public.cesta_basica_precos
  for select
  using (auth.uid() is not null);
create policy "cesta_basica_precos: cadastro por qualquer autenticado" on public.cesta_basica_precos
  for insert
  with check (auth.uid() is not null);

-- `pof_referencia` (POF/IBGE 2017-2018) — pesquisa estrutural estática,
-- importada uma vez via SQL Editor; nunca "atualiza" mensalmente.
create table public.pof_referencia (
  id uuid primary key default gen_random_uuid(),
  perfil_familia text not null,
  categoria_pof text not null,
  valor_medio_mensal_corrigido bigint not null check (valor_medio_mensal_corrigido > 0),
  ano_base int not null,
  criado_em timestamptz not null default now(),
  unique (perfil_familia, categoria_pof, ano_base)
);

alter table public.pof_referencia enable row level security;
create policy "pof_referencia: leitura para autenticados" on public.pof_referencia
  for select
  using (auth.uid() is not null);

-- `mapeamento_categoria_externa` — nunca inferido automaticamente, sempre
-- um mapeamento explícito cadastrado por decisão deliberada (hoje só via
-- SQL Editor — sem tela de gestão nesta fase, mesmo espírito do BE-3 pra
-- `taxonomia_termos` na Fase 0 original). Um mapeamento por categoria.
create table public.mapeamento_categoria_externa (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null unique references public.taxonomia_termos (id) on delete cascade,
  categoria_ibge text null,
  categoria_pof text null,
  criado_por uuid null references public.usuarios (id) on delete set null,
  criado_em timestamptz not null default now()
);

alter table public.mapeamento_categoria_externa enable row level security;
create policy "mapeamento_categoria_externa: leitura para autenticados" on public.mapeamento_categoria_externa
  for select
  using (auth.uid() is not null);
