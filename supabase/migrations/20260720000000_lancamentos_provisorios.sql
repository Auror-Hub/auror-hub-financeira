-- Rearquitetura (Fase 3, ADR-007): captura provisória — ENT-PROVISIONAL-ENTRY.
--
-- Conceitualmente diferente de `lancamentos_brutos`: um é fato bancário
-- (RUL-1, imutável, nunca criado por ação humana direta), o outro é a
-- INTENÇÃO da Victoria de um gasto que ela sabe que aconteceu mas ainda não
-- viu confirmado no extrato/fatura. Nunca reaproveita `lancamentos_brutos`
-- pra isso — misturaria fato com intenção na mesma tabela.
--
-- Conteúdo imutável depois de criado (mesmo padrão de `metas`/`regras`) —
-- só `status` e `lancamento_conciliado_id` podem mudar, e só nesse sentido:
-- aguardando_conciliacao -> conciliado (com lancamento_conciliado_id) ou ->
-- nao_encontrado ou -> descartado. Nunca editado de volta pra
-- aguardando_conciliacao — se a conciliação estiver errada, descarta e cria
-- um provisório novo (mesma disciplina de "nunca sobrescrever silenciosamente").

create table public.lancamentos_provisorios (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.familias (id) on delete cascade,
  criado_por uuid not null references public.usuarios (id),
  data_ocorrencia date not null,
  valor bigint not null check (valor <> 0),
  descricao_usuario text not null,
  fornecedor_dica text,
  categoria_dica uuid references public.taxonomia_termos (id),
  objetivo_dica uuid references public.taxonomia_termos (id),
  contexto text,
  status text not null default 'aguardando_conciliacao'
    check (status in ('aguardando_conciliacao', 'conciliado', 'nao_encontrado', 'descartado')),
  lancamento_conciliado_id uuid references public.lancamentos_brutos (id),
  criado_em timestamptz not null default now(),
  check (status = 'conciliado' or lancamento_conciliado_id is null),
  check (status <> 'conciliado' or lancamento_conciliado_id is not null)
);

comment on table public.lancamentos_provisorios is 'ENT-PROVISIONAL-ENTRY — intenção de gasto capturada pelo usuário, aguardando conciliação com o fato bancário real (lancamentos_brutos). Conteúdo imutável; só status/lancamento_conciliado_id mudam.';
comment on column public.lancamentos_provisorios.valor is 'Centavos, mesmo sinal de lancamentos_brutos.valor (despesa negativa).';
comment on column public.lancamentos_provisorios.fornecedor_dica is 'Texto livre do usuário — nunca comparado como termo controlado, só usado pelo matcher (similaridade de string).';
comment on column public.lancamentos_provisorios.categoria_dica is 'Se preenchida, aplicada como decisão de classificação ao conciliar (a Victoria já sabia a categoria no momento da captura).';

create index on public.lancamentos_provisorios (perfil_id, status);

alter table public.lancamentos_provisorios enable row level security;

create policy "lancamentos_provisorios: ver do próprio perfil"
  on public.lancamentos_provisorios for select
  using (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

create policy "lancamentos_provisorios: criar no próprio perfil"
  on public.lancamentos_provisorios for insert
  with check (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

create policy "lancamentos_provisorios: atualizar status no próprio perfil"
  on public.lancamentos_provisorios for update
  using (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'))
  with check (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

-- Defesa em profundidade: sem este trigger, a policy de update acima
-- permitiria editar qualquer coluna (mesma brecha corrigida em metas/regras).
create function public.bloquear_alteracao_conteudo_provisorio()
returns trigger
language plpgsql
as $$
begin
  if new.perfil_id is distinct from old.perfil_id
    or new.criado_por is distinct from old.criado_por
    or new.data_ocorrencia is distinct from old.data_ocorrencia
    or new.valor is distinct from old.valor
    or new.descricao_usuario is distinct from old.descricao_usuario
    or new.fornecedor_dica is distinct from old.fornecedor_dica
    or new.categoria_dica is distinct from old.categoria_dica
    or new.objetivo_dica is distinct from old.objetivo_dica
    or new.contexto is distinct from old.contexto
    or new.criado_em is distinct from old.criado_em
  then
    raise exception 'lancamentos_provisorios: só status/lancamento_conciliado_id podem mudar após a criação.';
  end if;
  if old.status <> 'aguardando_conciliacao' and new.status is distinct from old.status then
    raise exception 'lancamentos_provisorios: status já é terminal, não pode ser reaberto — descarte e crie um novo provisório.';
  end if;
  return new;
end;
$$;

create trigger lancamentos_provisorios_conteudo_imutavel
  before update on public.lancamentos_provisorios
  for each row execute function public.bloquear_alteracao_conteudo_provisorio();
