-- Fase 8: Consultor — ENT-MESSAGE
-- Append-only por omissão (join até conversas pra escopo de perfil).

create table public.mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas (id) on delete cascade,
  autor text not null check (autor in ('usuario', 'consultor')),
  texto text not null,
  criado_em timestamptz not null default now()
);

comment on table public.mensagens is 'ENT-MESSAGE — mensagem de uma conversa (usuário ou consultor). Append-only, sem edição.';

create index on public.mensagens (conversa_id, criado_em);

alter table public.mensagens enable row level security;

create policy "mensagens: ver mensagens do próprio perfil"
  on public.mensagens for select
  using (conversa_id in (select id from public.conversas where perfil_id in (select id from public.perfis where usuario_id = auth.uid())));

create policy "mensagens: gravar mensagem no próprio perfil"
  on public.mensagens for insert
  with check (conversa_id in (select id from public.conversas where perfil_id in (select id from public.perfis where usuario_id = auth.uid())));
