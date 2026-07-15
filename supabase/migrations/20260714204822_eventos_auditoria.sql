-- BE-4: Revisão humana real — ENT-AUDIT-EVENT (RUL-10)
-- RUL-10 é explícito: "não existe update nem delete nessa tabela em nenhuma
-- circunstância, inclusive administrativa" — por isso o trigger de bloqueio
-- (mesmo padrão de lancamentos_brutos) bloqueia até o service_role, não só RLS.
--
-- entidade_relacionada é polimórfica (pode ser um lançamento, uma decisão,
-- um evento de revisão, uma exceção...), então perfil_id fica denormalizado
-- na própria linha para permitir uma policy de RLS simples, sem precisar de
-- um join diferente por tipo de entidade.

create table public.eventos_auditoria (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  entidade_relacionada_tipo text not null,
  entidade_relacionada_id uuid not null,
  tipo_evento text not null check (tipo_evento in ('criação', 'alteração', 'decisão', 'fechamento', 'reabertura', 'execução de regra')),
  ator text not null,
  versao_motor text,
  detalhe jsonb,
  criado_em timestamptz not null default now()
);

comment on table public.eventos_auditoria is 'ENT-AUDIT-EVENT — trilha de auditoria append-only (RUL-10: nenhuma circunstância permite update/delete, inclusive administrativa). perfil_id denormalizado porque entidade_relacionada é polimórfica.';
comment on column public.eventos_auditoria.ator is 'Quem/o que gerou o evento — ex.: "usuário" ou "sistema(classificador)".';

create index on public.eventos_auditoria (entidade_relacionada_tipo, entidade_relacionada_id);
create index on public.eventos_auditoria (perfil_id, criado_em desc);

alter table public.eventos_auditoria enable row level security;

create policy "eventos_auditoria: ver eventos do próprio perfil"
  on public.eventos_auditoria for select
  using (perfil_id in (select id from public.perfis where usuario_id = auth.uid()));

create policy "eventos_auditoria: registrar evento no próprio perfil"
  on public.eventos_auditoria for insert
  with check (perfil_id in (select id from public.perfis where usuario_id = auth.uid()));

-- Defesa em profundidade: RUL-10 exige bloqueio mesmo administrativo.
create function public.bloquear_alteracao_evento_auditoria()
returns trigger
language plpgsql
as $$
begin
  raise exception 'eventos_auditoria é append-only (RUL-10) — nenhuma linha pode ser alterada ou removida, inclusive administrativamente.';
end;
$$;

create trigger eventos_auditoria_imutavel
  before update or delete on public.eventos_auditoria
  for each row execute function public.bloquear_alteracao_evento_auditoria();
