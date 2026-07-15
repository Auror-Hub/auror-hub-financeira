-- Fase 7: Relatório executivo — ENT-REPORT
-- Uma linha por competência, criada na primeira geração de relatório
-- (JRN-MONTHLY-CLOSE: fechamento → snapshot → Analista → Narrador).
-- O conteúdo em si vive em relatorio_versoes (versionado).

create table public.relatorios (
  id uuid primary key default gen_random_uuid(),
  competencia_id uuid not null references public.competencias (id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (competencia_id)
);

comment on table public.relatorios is 'ENT-REPORT — agrupador de versões de relatório de uma competência. Uma linha por competência.';

alter table public.relatorios enable row level security;

create policy "relatorios: ver relatórios do próprio perfil"
  on public.relatorios for select
  using (competencia_id in (
    select id from public.competencias where perfil_id in (select id from public.perfis where usuario_id = auth.uid())
  ));

create policy "relatorios: criar relatório no próprio perfil"
  on public.relatorios for insert
  with check (competencia_id in (
    select id from public.competencias where perfil_id in (select id from public.perfis where usuario_id = auth.uid())
  ));
