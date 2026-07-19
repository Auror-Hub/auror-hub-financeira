-- Insights V2 (Rodada 2) — ENT-GOAL: módulo de Metas/Orçamentos.
-- Greenfield (blueprint original só previa isso na "Fase 2 — uso pessoal
-- ampliado", nunca implementado). Ver ADR-006.
--
-- Meta é um alvo RECORRENTE (não presa a um mês específico) — "orçamento de
-- R$3.000/mês em Alimentação" vale todo mês até ser desativada/substituída.
-- Mesmo padrão de `regras`/`taxonomia_termos`: conteúdo imutável depois de
-- criado, só `status` muda — editar = desativar a antiga e criar uma nova
-- (trigger abaixo bloqueia qualquer outra alteração).
--
-- categoria_id nullable = meta "geral" (soma de todas as categorias).

create table public.metas (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.familias (id) on delete cascade,
  categoria_id uuid references public.taxonomia_termos (id),
  valor_limite bigint not null check (valor_limite > 0),
  status text not null default 'ativa' check (status in ('ativa', 'inativa')),
  criado_em timestamptz not null default now()
);

comment on table public.metas is 'ENT-GOAL — teto de gasto recorrente (por categoria ou geral). Conteúdo imutável; só status muda depois de criada (editar = desativar e criar nova).';
comment on column public.metas.categoria_id is 'null = meta geral (soma de todas as categorias). Não nulo = teto específico daquela categoria.';
comment on column public.metas.valor_limite is 'Centavos, sempre positivo (é um teto, não uma despesa).';

create index on public.metas (perfil_id, status);

-- NULL nunca colide em índice único — precisa dos dois parciais pra cobrir
-- "só uma meta geral ativa" e "só uma meta ativa por categoria" corretamente.
create unique index metas_geral_ativa_idx
  on public.metas (perfil_id)
  where status = 'ativa' and categoria_id is null;

create unique index metas_categoria_ativa_idx
  on public.metas (perfil_id, categoria_id)
  where status = 'ativa' and categoria_id is not null;

alter table public.metas enable row level security;

create policy "metas: ver metas do próprio perfil"
  on public.metas for select
  using (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

create policy "metas: criar meta no próprio perfil"
  on public.metas for insert
  with check (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

create policy "metas: atualizar status no próprio perfil"
  on public.metas for update
  using (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'))
  with check (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

-- Defesa em profundidade: RLS é por linha, não por coluna — sem este
-- trigger, a policy de update acima permitiria editar qualquer coluna
-- (mesma brecha corrigida na Fase 4/7 para regras/insights/relatorio_versoes).
create function public.bloquear_alteracao_conteudo_meta()
returns trigger
language plpgsql
as $$
begin
  if new.perfil_id is distinct from old.perfil_id
    or new.categoria_id is distinct from old.categoria_id
    or new.valor_limite is distinct from old.valor_limite
    or new.criado_em is distinct from old.criado_em
  then
    raise exception 'metas: só status pode mudar após a criação — editar = desativar e criar uma nova meta.';
  end if;
  return new;
end;
$$;

create trigger metas_conteudo_imutavel
  before update on public.metas
  for each row execute function public.bloquear_alteracao_conteudo_meta();
