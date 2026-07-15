-- Fase 4: Agente de Aprendizagem — ENT-LEARNING-EVENT
-- Gerado ao avaliar uma correção (classificacao_decisoes.status='corrigida')
-- — classifica o tipo do padrão observado e, se aplicável, aponta pra regra
-- resultante (nunca cria regra sem passar por 'proposta', RUL-6). Append-only.

create table public.eventos_aprendizagem (
  id uuid primary key default gen_random_uuid(),
  gatilho_decisao_id uuid not null references public.classificacao_decisoes (id) on delete cascade,
  classificacao_evento text not null check (classificacao_evento in (
    'correção pontual', 'exceção', 'novo padrão', 'alteração permanente', 'regra global', 'regra contextual'
  )),
  regra_resultante_id uuid references public.regras (id),
  criado_em timestamptz not null default now()
);

comment on table public.eventos_aprendizagem is 'ENT-LEARNING-EVENT — avaliação do Agente de Aprendizagem sobre uma correção. regra_resultante_id nulo quando a correção não gerou proposta de regra (ainda sem repetição suficiente).';

create index on public.eventos_aprendizagem (gatilho_decisao_id);

alter table public.eventos_aprendizagem enable row level security;

create policy "eventos_aprendizagem: ver eventos do próprio perfil"
  on public.eventos_aprendizagem for select
  using (gatilho_decisao_id in (
    select cd.id from public.classificacao_decisoes cd
    join public.lancamentos_brutos l on l.id = cd.lancamento_id
    join public.cartoes c on c.id = l.cartao_id
    join public.perfis p on p.id = c.perfil_id
    where p.usuario_id = auth.uid()
  ));

create policy "eventos_aprendizagem: gravar evento no próprio perfil"
  on public.eventos_aprendizagem for insert
  with check (gatilho_decisao_id in (
    select cd.id from public.classificacao_decisoes cd
    join public.lancamentos_brutos l on l.id = cd.lancamento_id
    join public.cartoes c on c.id = l.cartao_id
    join public.perfis p on p.id = c.perfil_id
    where p.usuario_id = auth.uid()
  ));
