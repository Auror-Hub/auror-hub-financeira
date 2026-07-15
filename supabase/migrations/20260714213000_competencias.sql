-- BE-5: Competências reais — ENT-COMPETENCY
-- Agrupa lançamentos por mês (lancamentos_brutos.competencia_calculada, já
-- calculado desde BE-2 a partir da data de ocorrência, nunca do vencimento —
-- premissa #3). Linhas são criadas sob demanda (upsert) pela consulta, nunca
-- manualmente. Diferente de fechamentos_competencia/snapshots_analiticos,
-- esta tabela é mutável de propósito: `estado` reflete a situação corrente
-- da competência (não é histórico versionado).
--
-- Só os estados que o pipeline síncrono atual consegue produzir de fato:
-- 'em revisão' (tem lançamento sem decisão), 'pronta' (todos decididos, ainda
-- não fechada), 'fechada', 'reaberta'. Os demais estados de EstadoCompetencia
-- ('aguardando documentos', 'importando', 'divergência', 'atualizada')
-- dependem de processamento assíncrono de PDF/detecção formal de divergência
-- que não existem ainda — fora de escopo desta fase.

create table public.competencias (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  mes_referencia text not null,
  estado text not null default 'em revisão'
    check (estado in ('em revisão', 'pronta', 'fechada', 'reaberta')),
  criado_em timestamptz not null default now(),
  unique (perfil_id, mes_referencia)
);

comment on table public.competencias is 'ENT-COMPETENCY — competência (mês) agrupando lançamentos. estado é mutável (reflete situação corrente); o histórico versionado de fechamento vive em fechamentos_competencia.';
comment on column public.competencias.mes_referencia is 'Texto AAAA-MM, mesmo valor de lancamentos_brutos.competencia_calculada.';

create index on public.competencias (perfil_id, mes_referencia desc);

alter table public.competencias enable row level security;

create policy "competencias: acesso ao próprio perfil"
  on public.competencias for all
  using (perfil_id in (select id from public.perfis where usuario_id = auth.uid()))
  with check (perfil_id in (select id from public.perfis where usuario_id = auth.uid()));
