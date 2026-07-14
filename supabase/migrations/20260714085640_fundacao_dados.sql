-- BE-1: Fundação de dados — ENT-USER, ENT-PROFILE, ENT-CARD, ENT-SETTINGS
-- Ver docs/decisions/ADR-001-STACK-TECNICA.md, docs/decisions/ADR-003-CONTEXTO-FAMILIAR-E-TAXONOMIA.md
-- e docs/CONSTRUCTION-PLAN.md (BE-1).
--
-- MVP roda com um único usuário autenticado (Victoria, operadora), mas o
-- schema já separa usuário de perfil desde o início — "família", "múltiplos
-- perfis" e "empresa" são extensões de cardinalidade, não reescritas de
-- schema (premissa #1 da Arquitetura Completa).
--
-- Nota de divergência (ADR-003): o campo `tipo` do perfil é fixado em
-- 'familia', não 'pessoal' como a Arquitetura Completa original assumia —
-- o MVP representa as finanças conjuntas da Família Gama, não as pessoais
-- da Victoria, mesmo com auth single-user.

create extension if not exists "pgcrypto";

-- ENT-USER: espelha auth.users com campos próprios da aplicação (nome etc.),
-- para não depender do schema interno de auth do Supabase.
create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nome text,
  criado_em timestamptz not null default now()
);

comment on table public.usuarios is 'ENT-USER — espelha auth.users; campos de app ficam aqui, nunca no schema de auth do Supabase.';

-- ENT-PROFILE
create table public.perfis (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  tipo text not null default 'familia' check (tipo in ('pessoal', 'familia', 'autonomo', 'empresa')),
  nome_perfil text not null default 'Família Gama',
  criado_em timestamptz not null default now()
);

comment on table public.perfis is 'ENT-PROFILE — MVP: um perfil por usuário. tipo=familia por ADR-003 (finanças conjuntas da Família Gama, não pessoais da Victoria). Sem multiusuário/permissões nesta fase.';

-- ENT-CARD
create table public.cartoes (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  instituicao text not null,
  apelido text,
  ultimos_4_digitos text,
  regra_de_corte_competencia jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

comment on table public.cartoes is 'ENT-CARD — cartão/origem financeira compartilhada da família; titular do cartão não define o objetivo do gasto (ADR-003).';

-- ENT-SETTINGS
create table public.configuracoes (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null unique references public.perfis (id) on delete cascade,
  preferencias jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

comment on table public.configuracoes is 'ENT-SETTINGS — preferências do perfil.';

-- RLS: privilégio mínimo — cada usuária só acessa os próprios dados.
alter table public.usuarios enable row level security;
alter table public.perfis enable row level security;
alter table public.cartoes enable row level security;
alter table public.configuracoes enable row level security;

create policy "usuarios: ver e editar o próprio registro"
  on public.usuarios for all
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "perfis: ver e editar perfis do próprio usuário"
  on public.perfis for all
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

create policy "cartoes: ver e editar cartões do próprio perfil"
  on public.cartoes for all
  using (perfil_id in (select id from public.perfis where usuario_id = auth.uid()))
  with check (perfil_id in (select id from public.perfis where usuario_id = auth.uid()));

create policy "configuracoes: ver e editar configurações do próprio perfil"
  on public.configuracoes for all
  using (perfil_id in (select id from public.perfis where usuario_id = auth.uid()))
  with check (perfil_id in (select id from public.perfis where usuario_id = auth.uid()));

-- Provisionamento automático: ao criar conta em auth.users, gera o usuário,
-- o perfil padrão (Família Gama) e as configurações vazias correspondentes.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  novo_perfil_id uuid;
begin
  insert into public.usuarios (id, email, nome)
  values (new.id, new.email, null);

  insert into public.perfis (usuario_id, tipo, nome_perfil)
  values (new.id, 'familia', 'Família Gama')
  returning id into novo_perfil_id;

  insert into public.configuracoes (perfil_id, preferencias)
  values (novo_perfil_id, '{}'::jsonb);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
