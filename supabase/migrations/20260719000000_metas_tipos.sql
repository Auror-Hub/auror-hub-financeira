-- Rearquitetura (Fase 2, ADR-007): metas ganham um segundo tipo — "redução %
-- sobre histórico" — e podem ser refinadas por subcategoria/objetivo, além de
-- categoria/geral (pedido literal da Victoria: "meta de valor (podendo
-- escolher categoria, subcategoria e objetivo)" e "meta em % sobre os gastos
-- anteriores, escolhendo mês anterior/últimos 3/6/12 meses"). Migration
-- aditiva — nenhuma meta existente (`tipo` default 'limite_absoluto') muda de
-- comportamento.

alter table public.metas
  add column tipo text not null default 'limite_absoluto' check (tipo in ('limite_absoluto', 'reducao_percentual')),
  add column subcategoria_id uuid references public.taxonomia_termos (id),
  add column objetivo_id uuid references public.taxonomia_termos (id),
  add column periodo_meses int check (periodo_meses in (1, 3, 6, 12)),
  add column percentual_alvo numeric check (percentual_alvo > 0 and percentual_alvo < 1);

comment on column public.metas.tipo is 'limite_absoluto = teto fixo (valor_limite). reducao_percentual = alvo calculado como (1 - percentual_alvo) × média dos `periodo_meses` meses anteriores.';
comment on column public.metas.subcategoria_id is 'Refina a meta dentro da categoria (opcional, combinável com objetivo_id).';
comment on column public.metas.objetivo_id is 'Refina a meta por pessoa/objetivo (opcional, combinável com subcategoria_id) — visualização de planejamento, não texto livre de IA (não colide com a barreira de privacidade do Consultor).';

-- valor_limite deixa de ser obrigatório: metas do tipo reducao_percentual não
-- têm um valor fixo, ele é calculado a partir da baseline histórica.
alter table public.metas alter column valor_limite drop not null;

alter table public.metas add constraint metas_campos_por_tipo check (
  (tipo = 'limite_absoluto' and valor_limite is not null and periodo_meses is null and percentual_alvo is null)
  or
  (tipo = 'reducao_percentual' and valor_limite is null and periodo_meses is not null and percentual_alvo is not null)
);

-- Substitui os 2 índices únicos parciais (geral / por categoria) por 1 só
-- cobrindo a combinação completa de dimensões (categoria+subcategoria+
-- objetivo) — coalesce pra um UUID sentinela porque NULL nunca colide em
-- índice único (mesmo motivo dos 2 índices originais).
drop index if exists public.metas_geral_ativa_idx;
drop index if exists public.metas_categoria_ativa_idx;

create unique index metas_escopo_ativa_idx on public.metas (
  perfil_id,
  coalesce(categoria_id, '00000000-0000-0000-0000-000000000000'),
  coalesce(subcategoria_id, '00000000-0000-0000-0000-000000000000'),
  coalesce(objetivo_id, '00000000-0000-0000-0000-000000000000')
) where status = 'ativa';

-- Trigger de imutabilidade (Fase 2 da tabela `metas`, ver migration original)
-- estendido pros campos novos — só `status` pode mudar depois de criada.
create or replace function public.bloquear_alteracao_conteudo_meta()
returns trigger
language plpgsql
as $$
begin
  if new.perfil_id is distinct from old.perfil_id
    or new.categoria_id is distinct from old.categoria_id
    or new.subcategoria_id is distinct from old.subcategoria_id
    or new.objetivo_id is distinct from old.objetivo_id
    or new.tipo is distinct from old.tipo
    or new.valor_limite is distinct from old.valor_limite
    or new.periodo_meses is distinct from old.periodo_meses
    or new.percentual_alvo is distinct from old.percentual_alvo
    or new.criado_em is distinct from old.criado_em
  then
    raise exception 'metas: só status pode mudar após a criação — editar = desativar e criar uma nova meta.';
  end if;
  return new;
end;
$$;
