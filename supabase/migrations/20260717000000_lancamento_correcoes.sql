-- Insights V2 (Rodada 1) — ADR-005: exclusão e correção versionada de lançamento.
--
-- O princípio #1 (RUL-1) mantém `lancamentos_brutos` imutável — o trigger
-- `lancamentos_brutos_imutavel` bloqueia UPDATE/DELETE de qualquer coluna,
-- inclusive administrativamente. Para "excluir" ou "editar" um lançamento sem
-- violar isso:
--   - excluir  = marcação append-only que esconde o lançamento das telas e
--                relatórios (a linha original é preservada);
--   - editar campo bruto = nova linha em `lancamentos_brutos` (origem='correcao')
--                com os valores corrigidos + uma marcação apontando
--                original -> substituto (a original é escondida do mesmo jeito).
-- A classificação (categoria/subcategoria/objetivo/contexto) continua sendo
-- versionada via `classificacao_decisoes` (corrigirClassificacao), como já era.
--
-- Esta tabela é a marcação — append-only, mesma régua de `eventos_auditoria`.

-- 1. Permitir origem 'correcao' (nova versão de um lançamento editado).
alter table public.lancamentos_brutos
  drop constraint if exists lancamentos_brutos_origem_check;
alter table public.lancamentos_brutos
  add constraint lancamentos_brutos_origem_check
  check (origem in ('importado', 'manual', 'correcao'));

-- 2. Permitir registrar exclusão na trilha de auditoria.
alter table public.eventos_auditoria
  drop constraint if exists eventos_auditoria_tipo_evento_check;
alter table public.eventos_auditoria
  add constraint eventos_auditoria_tipo_evento_check
  check (tipo_evento in ('criação', 'alteração', 'exclusão', 'decisão', 'fechamento', 'reabertura', 'execução de regra'));

-- 3. Tabela de marcações (exclusão / correção).
create table public.lancamentos_correcoes (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.familias (id) on delete cascade,
  lancamento_original_id uuid not null references public.lancamentos_brutos (id),
  lancamento_substituto_id uuid references public.lancamentos_brutos (id),
  tipo text not null check (tipo in ('exclusao', 'correcao')),
  motivo text,
  criado_em timestamptz not null default now()
);

comment on table public.lancamentos_correcoes is 'Marcações append-only de exclusão/correção de lançamento (ADR-005). tipo=exclusao esconde o original; tipo=correcao aponta original -> substituto (nova versão). A linha bruta original nunca é apagada (RUL-1).';

create index on public.lancamentos_correcoes (lancamento_original_id);
create index on public.lancamentos_correcoes (perfil_id);

alter table public.lancamentos_correcoes enable row level security;

create policy "lancamentos_correcoes: ver do próprio perfil"
  on public.lancamentos_correcoes for select
  using (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

create policy "lancamentos_correcoes: registrar no próprio perfil"
  on public.lancamentos_correcoes for insert
  with check (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

-- Append-only: nenhuma alteração/remoção depois de criada (mesma régua de eventos_auditoria).
create function public.bloquear_alteracao_lancamento_correcao()
returns trigger
language plpgsql
as $$
begin
  raise exception 'lancamentos_correcoes é append-only — nenhuma linha pode ser alterada ou removida.';
end;
$$;

create trigger lancamentos_correcoes_imutavel
  before update or delete on public.lancamentos_correcoes
  for each row execute function public.bloquear_alteracao_lancamento_correcao();
