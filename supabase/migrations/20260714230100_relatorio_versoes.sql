-- Fase 7: Relatório executivo — ENT-REPORT-VERSION
-- RUL-7: toda versão aponta para um snapshot imutável específico, nunca
-- recalculado em tempo real — snapshot_id é fixado na criação e nunca muda.
-- status (vigente/superseded) é a única coluna mutável (mesmo padrão já
-- aceito para insights.status na Fase 6 e competencias.estado no BE-5);
-- conteudo_html/metodologia/snapshot_id nunca são editados depois de criados.

create table public.relatorio_versoes (
  id uuid primary key default gen_random_uuid(),
  relatorio_id uuid not null references public.relatorios (id) on delete cascade,
  versao int not null,
  snapshot_id uuid not null references public.snapshots_analiticos (id) on delete restrict,
  conteudo_html text not null,
  metodologia text not null,
  insights_utilizados jsonb not null default '[]'::jsonb,
  status text not null default 'vigente' check (status in ('vigente', 'superseded')),
  criado_em timestamptz not null default now(),
  unique (relatorio_id, versao)
);

comment on table public.relatorio_versoes is 'ENT-REPORT-VERSION — versão imutável de conteúdo do relatório executivo. status é a única coluna mutável.';
comment on column public.relatorio_versoes.insights_utilizados is 'Array de insights.id usados para gerar esta versão — jsonb em vez de tabela de junção própria (simplificação consciente de MVP, mesmo espírito de snapshots_analiticos.fechamento_id).';

create index on public.relatorio_versoes (relatorio_id, versao desc);

alter table public.relatorio_versoes enable row level security;

create policy "relatorio_versoes: ver versões do próprio perfil"
  on public.relatorio_versoes for select
  using (relatorio_id in (
    select r.id from public.relatorios r
    join public.competencias c on c.id = r.competencia_id
    where c.perfil_id in (select id from public.perfis where usuario_id = auth.uid())
  ));

create policy "relatorio_versoes: gravar versão no próprio perfil"
  on public.relatorio_versoes for insert
  with check (relatorio_id in (
    select r.id from public.relatorios r
    join public.competencias c on c.id = r.competencia_id
    where c.perfil_id in (select id from public.perfis where usuario_id = auth.uid())
  ));

-- Update permitido só para marcar versões antigas como superseded (nova
-- versão gerada num refechamento) — mesmo nível de confiança já dado a
-- insights.status/competencias.estado.
create policy "relatorio_versoes: atualizar status no próprio perfil"
  on public.relatorio_versoes for update
  using (relatorio_id in (
    select r.id from public.relatorios r
    join public.competencias c on c.id = r.competencia_id
    where c.perfil_id in (select id from public.perfis where usuario_id = auth.uid())
  ))
  with check (relatorio_id in (
    select r.id from public.relatorios r
    join public.competencias c on c.id = r.competencia_id
    where c.perfil_id in (select id from public.perfis where usuario_id = auth.uid())
  ));
