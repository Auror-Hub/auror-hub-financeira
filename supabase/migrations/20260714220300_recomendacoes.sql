-- Fase 6: Motor analítico — ENT-RECOMMENDATION
-- Recomendação simples derivada de um insight (ex.: aumento relevante numa
-- categoria gera 1 recomendação tipo 'atenção'). Append-only — rastreável
-- separadamente do insight, nunca um blob único (ver arquitetura completa,
-- linha 878).

create table public.recomendacoes (
  id uuid primary key default gen_random_uuid(),
  insight_relacionado_id uuid not null references public.insights (id) on delete cascade,
  texto text not null,
  tipo text not null check (tipo in ('economia', 'atenção', 'observação futura')),
  criado_em timestamptz not null default now()
);

comment on table public.recomendacoes is 'ENT-RECOMMENDATION — recomendação derivada de um insight. Append-only.';

create index on public.recomendacoes (insight_relacionado_id);

alter table public.recomendacoes enable row level security;

-- Append-only: só select/insert, sem policy de update/delete.
create policy "recomendacoes: ver recomendações do próprio perfil"
  on public.recomendacoes for select
  using (insight_relacionado_id in (
    select i.id from public.insights i
    join public.competencias c on c.id = i.competencia_id
    where c.perfil_id in (select id from public.perfis where usuario_id = auth.uid())
  ));

create policy "recomendacoes: gravar recomendação no próprio perfil"
  on public.recomendacoes for insert
  with check (insight_relacionado_id in (
    select i.id from public.insights i
    join public.competencias c on c.id = i.competencia_id
    where c.perfil_id in (select id from public.perfis where usuario_id = auth.uid())
  ));
