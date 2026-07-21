-- Fase 8 (Auditoria V2) — ENT-PLAN: plano mensal aditivo.
--
-- Resolve a causa raiz do P0 identificado na Fase 5 (KPI "Planejado" saiu do
-- ar): não existia entidade de orçamento aditivo, só `metas` (teto de
-- acompanhamento por categoria/subcategoria/objetivo/geral, que podem se
-- sobrepor por design — geral + categoria + objetivo contam o mesmo gasto
-- várias vezes se somados). `plano_linhas` garante soma sem sobreposição por
-- construção: unique(plano_mensal_id, categoria_id) — nunca duas linhas pra
-- mesma categoria no mesmo plano. `metas` continua existindo, inalterada,
-- como "objetivo de acompanhamento" paralelo — nunca somada num total.

create table public.planos_mensais (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.familias (id) on delete cascade,
  mes_referencia text not null,
  renda_informada bigint,
  status text not null default 'rascunho' check (status in ('rascunho', 'ativo')),
  criado_em timestamptz not null default now(),
  unique (perfil_id, mes_referencia)
);

comment on table public.planos_mensais is 'ENT-PLAN (Fase 8, Auditoria V2) — plano mensal aditivo. Um por perfil+mês; soma de plano_linhas é a fonte real de "Planejado" (nunca metas).';
comment on column public.planos_mensais.mes_referencia is 'Texto AAAA-MM, mesmo valor de lancamentos_brutos.competencia_calculada.';
comment on column public.planos_mensais.renda_informada is 'Centavos, opcional — nunca bloqueia uso do plano sem ela.';

create table public.plano_linhas (
  id uuid primary key default gen_random_uuid(),
  plano_mensal_id uuid not null references public.planos_mensais (id) on delete cascade,
  categoria_id uuid references public.taxonomia_termos (id),
  valor_planejado bigint not null check (valor_planejado > 0),
  natureza text not null check (natureza in ('comprometido', 'protegido', 'ajustavel', 'reserva')),
  criado_em timestamptz not null default now(),
  unique (plano_mensal_id, categoria_id)
);

comment on table public.plano_linhas is 'Linha do plano mensal — categoria_id null = "outras/geral". unique(plano_mensal_id, categoria_id) garante soma sem dupla contagem por construção (índice único trata NULL como valor distinto por linha, então a checagem de "geral repetido" é reforçada em código, não só no banco — ver validarLinhasPlano).';
comment on column public.plano_linhas.natureza is 'comprometido (fixo, ex. aluguel) | protegido (não cortar) | ajustavel (discricionário) | reserva (poupança/reserva do mês).';

create index on public.plano_linhas (plano_mensal_id);

alter table public.planos_mensais enable row level security;
alter table public.plano_linhas enable row level security;

create policy "planos_mensais: ver plano do próprio perfil"
  on public.planos_mensais for select
  using (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

create policy "planos_mensais: criar plano no próprio perfil"
  on public.planos_mensais for insert
  with check (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

create policy "planos_mensais: atualizar plano do próprio perfil"
  on public.planos_mensais for update
  using (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'))
  with check (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

create policy "plano_linhas: ver linhas do próprio perfil"
  on public.plano_linhas for select
  using (plano_mensal_id in (
    select id from public.planos_mensais
    where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
  ));

create policy "plano_linhas: criar linha no próprio perfil"
  on public.plano_linhas for insert
  with check (plano_mensal_id in (
    select id from public.planos_mensais
    where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
  ));

create policy "plano_linhas: atualizar linha do próprio perfil"
  on public.plano_linhas for update
  using (plano_mensal_id in (
    select id from public.planos_mensais
    where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
  ))
  with check (plano_mensal_id in (
    select id from public.planos_mensais
    where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
  ));

create policy "plano_linhas: apagar linha do próprio perfil"
  on public.plano_linhas for delete
  using (plano_mensal_id in (
    select id from public.planos_mensais
    where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
  ));

-- Imutabilidade condicionada ao fechamento (diferente de metas/regras, que
-- travam conteúdo desde a criação): enquanto a competência do mês está
-- aberta, plano_linhas é um rascunho de trabalho, livremente editável. Só
-- trava quando a competência correspondente já fechou/reabriu — mesmo
-- espírito de "fechamento gera snapshot imutável" (D9), sem duplicar a
-- lógica de snapshot em si (o plano não é congelado num snapshot próprio
-- nesta fase, só fica bloqueado pra edição).
create function public.bloquear_alteracao_plano_linha_apos_fechamento()
returns trigger
language plpgsql
as $$
declare
  v_perfil_id uuid;
  v_mes_referencia text;
  v_estado text;
begin
  select perfil_id, mes_referencia into v_perfil_id, v_mes_referencia
  from public.planos_mensais
  where id = coalesce(old.plano_mensal_id, new.plano_mensal_id);

  select estado into v_estado
  from public.competencias
  where perfil_id = v_perfil_id and mes_referencia = v_mes_referencia;

  if v_estado in ('fechada', 'reaberta') then
    raise exception 'plano_linhas: competência de % já fechada — não é possível editar o plano desse mês.', v_mes_referencia;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger plano_linhas_bloqueia_apos_fechamento
  before update or delete on public.plano_linhas
  for each row execute function public.bloquear_alteracao_plano_linha_apos_fechamento();
