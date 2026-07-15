-- BE-5: Competências reais — ENT-COMPETENCY-CLOSURE
-- Append-only e versionada (RUL-11): reabrir uma competência fechada nunca
-- apaga/sobrescreve a versão anterior — o próximo fechamento grava uma nova
-- linha com versao+1, carregando o motivo da reabertura mais recente em
-- motivo_reabertura_anterior. Mesmo padrão append-only (só select/insert,
-- sem policy de update/delete) de classificacao_decisoes.

create table public.fechamentos_competencia (
  id uuid primary key default gen_random_uuid(),
  competencia_id uuid not null references public.competencias (id) on delete cascade,
  versao int not null,
  motivo_reabertura_anterior text,
  fechado_em timestamptz not null default now(),
  unique (competencia_id, versao)
);

comment on table public.fechamentos_competencia is 'ENT-COMPETENCY-CLOSURE — versão de fechamento de uma competência. Append-only (RUL-11): reabertura nunca apaga a versão anterior, o próximo fechamento gera uma nova linha.';
comment on column public.fechamentos_competencia.motivo_reabertura_anterior is 'Motivo da reabertura mais recente que precedeu este fechamento — nulo na versão 1.';

create index on public.fechamentos_competencia (competencia_id, versao desc);

alter table public.fechamentos_competencia enable row level security;

-- Append-only: só select/insert, sem policy de update/delete.
create policy "fechamentos_competencia: ver fechamentos do próprio perfil"
  on public.fechamentos_competencia for select
  using (competencia_id in (
    select id from public.competencias where perfil_id in (select id from public.perfis where usuario_id = auth.uid())
  ));

create policy "fechamentos_competencia: gravar fechamento no próprio perfil"
  on public.fechamentos_competencia for insert
  with check (competencia_id in (
    select id from public.competencias where perfil_id in (select id from public.perfis where usuario_id = auth.uid())
  ));
