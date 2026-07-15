-- Fase 6: Motor analítico — ENT-INSIGHT-EVIDENCE
-- RUL-14: todo insight precisa de ao menos uma evidência. Neste primeiro
-- corte a evidência sempre aponta para uma métrica agregada (metrica_id);
-- evidência a nível de lançamento individual fica fora de escopo (ver plano).
-- Append-only.

create table public.insight_evidencias (
  id uuid primary key default gen_random_uuid(),
  insight_id uuid not null references public.insights (id) on delete cascade,
  metrica_id uuid not null references public.metricas (id) on delete restrict,
  criado_em timestamptz not null default now()
);

comment on table public.insight_evidencias is 'ENT-INSIGHT-EVIDENCE — evidência que sustenta um insight (RUL-14). Nesta fase, sempre uma métrica agregada.';

create index on public.insight_evidencias (insight_id);

alter table public.insight_evidencias enable row level security;

-- Append-only: só select/insert, sem policy de update/delete.
create policy "insight_evidencias: ver evidências do próprio perfil"
  on public.insight_evidencias for select
  using (insight_id in (
    select i.id from public.insights i
    join public.competencias c on c.id = i.competencia_id
    where c.perfil_id in (select id from public.perfis where usuario_id = auth.uid())
  ));

create policy "insight_evidencias: gravar evidência no próprio perfil"
  on public.insight_evidencias for insert
  with check (insight_id in (
    select i.id from public.insights i
    join public.competencias c on c.id = i.competencia_id
    where c.perfil_id in (select id from public.perfis where usuario_id = auth.uid())
  ));
