-- BE-5: Competências reais — ENT-ANALYTICAL-SNAPSHOT (D9, imutável)
-- Congela dados consolidados brutos (totais, contagens, quebra por
-- categoria/objetivo) no momento do fechamento — nunca recalculado
-- dinamicamente depois. Insight/relatório narrado (Agente Analista/Narrador)
-- ficam fora desta fase (Fase 6+7); `dados_congelados` guarda só o
-- consolidado numérico.
--
-- Divergência consciente do dicionário literal: em vez de uma referência
-- circular fechamento<->snapshot, o snapshot é quem aponta para o
-- fechamento que o gerou (fechamento_id not null) — mantém as duas tabelas
-- 100% append-only/imutáveis sem nenhum update.
--
-- Trigger de bloqueio total (mesmo padrão de lancamentos_brutos/eventos_auditoria):
-- nenhuma linha pode ser alterada ou removida, inclusive administrativamente.

create table public.snapshots_analiticos (
  id uuid primary key default gen_random_uuid(),
  competencia_id uuid not null references public.competencias (id) on delete restrict,
  fechamento_id uuid not null references public.fechamentos_competencia (id) on delete restrict,
  dados_congelados jsonb not null,
  criado_em timestamptz not null default now()
);

comment on table public.snapshots_analiticos is 'ENT-ANALYTICAL-SNAPSHOT — consolidado numérico imutável (D9) de uma competência no momento do fechamento. Insight/relatório narrado chegam na Fase 6+7.';
comment on column public.snapshots_analiticos.fechamento_id is 'Aponta para o fechamento que gerou este snapshot — divergência consciente do dicionário literal (evita referência circular), ver nota no topo do arquivo.';

create index on public.snapshots_analiticos (competencia_id, criado_em desc);

alter table public.snapshots_analiticos enable row level security;

create policy "snapshots_analiticos: ver snapshots do próprio perfil"
  on public.snapshots_analiticos for select
  using (competencia_id in (
    select id from public.competencias where perfil_id in (select id from public.perfis where usuario_id = auth.uid())
  ));

create policy "snapshots_analiticos: gravar snapshot no próprio perfil"
  on public.snapshots_analiticos for insert
  with check (competencia_id in (
    select id from public.competencias where perfil_id in (select id from public.perfis where usuario_id = auth.uid())
  ));

-- Defesa em profundidade: RUL/D9 exige bloqueio mesmo administrativo.
create function public.bloquear_alteracao_snapshot_analitico()
returns trigger
language plpgsql
as $$
begin
  raise exception 'snapshots_analiticos é imutável (D9) — nenhuma linha pode ser alterada ou removida, inclusive administrativamente.';
end;
$$;

create trigger snapshots_analiticos_imutavel
  before update or delete on public.snapshots_analiticos
  for each row execute function public.bloquear_alteracao_snapshot_analitico();
