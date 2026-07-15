-- Fase 8: Consultor — ENT-CONVERSATION
-- Append-only por omissão: só policies de select/insert, sem update/delete.
-- Não há campo mutável nesta entidade (diferente de regras/insights da Fase
-- 6/7) — não precisa de trigger de coluna, a ausência de policy já basta.

create table public.conversas (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  iniciada_em timestamptz not null default now()
);

comment on table public.conversas is 'ENT-CONVERSATION — uma conversa com o Consultor. Append-only, sem edição.';

create index on public.conversas (perfil_id, iniciada_em desc);

alter table public.conversas enable row level security;

create policy "conversas: ver conversas do próprio perfil"
  on public.conversas for select
  using (perfil_id in (select id from public.perfis where usuario_id = auth.uid()));

create policy "conversas: iniciar conversa no próprio perfil"
  on public.conversas for insert
  with check (perfil_id in (select id from public.perfis where usuario_id = auth.uid()));
