-- Fase 6: Motor analítico — ENT-METRIC
-- Números que sustentam um insight (RUL-14: insight precisa de ao menos uma
-- evidência; aqui a evidência aponta para uma métrica, não para lançamento
-- individual — ver nota na migration de insight_evidencias). Append-only:
-- uma métrica é um fato calculado no momento do fechamento, nunca editada.

create table public.metricas (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.snapshots_analiticos (id) on delete cascade,
  tipo text not null check (tipo in ('variacao_total', 'variacao_categoria')),
  dimensao_ref_id uuid references public.taxonomia_termos (id),
  valor numeric not null,
  criado_em timestamptz not null default now()
);

comment on table public.metricas is 'ENT-METRIC — número calculado a partir de um snapshot (ex.: variação percentual). Append-only.';
comment on column public.metricas.dimensao_ref_id is 'taxonomia_termos.id da categoria, quando tipo = variacao_categoria. Nulo para variacao_total.';

create index on public.metricas (snapshot_id);

alter table public.metricas enable row level security;

-- Append-only: só select/insert, sem policy de update/delete.
create policy "metricas: ver métricas do próprio perfil"
  on public.metricas for select
  using (snapshot_id in (
    select s.id from public.snapshots_analiticos s
    join public.competencias c on c.id = s.competencia_id
    where c.perfil_id in (select id from public.perfis where usuario_id = auth.uid())
  ));

create policy "metricas: gravar métrica no próprio perfil"
  on public.metricas for insert
  with check (snapshot_id in (
    select s.id from public.snapshots_analiticos s
    join public.competencias c on c.id = s.competencia_id
    where c.perfil_id in (select id from public.perfis where usuario_id = auth.uid())
  ));
