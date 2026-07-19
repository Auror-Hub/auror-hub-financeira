-- Rearquitetura (Fase 1, ADR-007): ENT-RECOMMENDATION-DECISION
-- Registra a decisão da Victoria sobre a recomendação única destacada na Home
-- ("aceitou" / "agora não" / "não sugerir de novo") — append-only, nunca
-- sobrescrito. `perfil_id` é direto (não via join) porque a decisão é do
-- usuário, não do dado analítico em si.

create table public.recomendacoes_decisoes (
  id uuid primary key default gen_random_uuid(),
  recomendacao_id uuid not null references public.recomendacoes (id) on delete cascade,
  perfil_id uuid not null references public.familias (id) on delete cascade,
  decisao text not null check (decisao in ('aceitou', 'agora não', 'não sugerir de novo')),
  criado_em timestamptz not null default now()
);

comment on table public.recomendacoes_decisoes is 'ENT-RECOMMENDATION-DECISION — decisão do usuário sobre uma recomendação da Home. Append-only.';

create index on public.recomendacoes_decisoes (perfil_id, recomendacao_id);

alter table public.recomendacoes_decisoes enable row level security;

-- Append-only: só select/insert, sem policy de update/delete.
create policy "recomendacoes_decisoes: ver decisões da própria família"
  on public.recomendacoes_decisoes for select
  using (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

create policy "recomendacoes_decisoes: gravar decisão na própria família"
  on public.recomendacoes_decisoes for insert
  with check (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));
