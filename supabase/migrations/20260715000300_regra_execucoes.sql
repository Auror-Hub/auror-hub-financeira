-- Fase 4: Motor de regras — ENT-RULE-EXECUTION (D6)
-- D6: regra nunca aplica (ou deixa de aplicar por conflito) sem gerar um
-- registro auditável aqui — inclusive quando bloqueada por conflito (RUL-13:
-- conflito nunca resolvido/ignorado em silêncio). Append-only.

create table public.regra_execucoes (
  id uuid primary key default gen_random_uuid(),
  regra_id uuid not null references public.regras (id) on delete cascade,
  lancamento_id uuid not null references public.lancamentos_brutos (id) on delete cascade,
  resultado text not null check (resultado in ('aplicada', 'bloqueada_por_conflito', 'gerou_excecao')),
  criado_em timestamptz not null default now()
);

comment on table public.regra_execucoes is 'ENT-RULE-EXECUTION — toda vez que uma regra é avaliada contra um lançamento, mesmo quando bloqueada por conflito (D6, RUL-13).';

create index on public.regra_execucoes (regra_id);
create index on public.regra_execucoes (lancamento_id);

alter table public.regra_execucoes enable row level security;

create policy "regra_execucoes: ver execuções do próprio perfil"
  on public.regra_execucoes for select
  using (regra_id in (select id from public.regras where perfil_id in (select id from public.perfis where usuario_id = auth.uid())));

create policy "regra_execucoes: gravar execução no próprio perfil"
  on public.regra_execucoes for insert
  with check (regra_id in (select id from public.regras where perfil_id in (select id from public.perfis where usuario_id = auth.uid())));
