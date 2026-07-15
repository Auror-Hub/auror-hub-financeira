-- Fase 8: Consultor — interpretação estruturada da pergunta (tool-use),
-- auditável separadamente da resposta final. mensagem_id aponta pra
-- mensagem do próprio usuário (a pergunta que foi interpretada).
-- Append-only por omissão (join até conversas via mensagens).

create table public.consultas_analiticas (
  id uuid primary key default gen_random_uuid(),
  mensagem_id uuid not null references public.mensagens (id) on delete cascade,
  intencao text not null,
  parametros jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

comment on table public.consultas_analiticas is 'Interpretação estruturada (tool-use) de uma pergunta do usuário ao Consultor. Append-only.';

create index on public.consultas_analiticas (mensagem_id);

alter table public.consultas_analiticas enable row level security;

create policy "consultas_analiticas: ver interpretações do próprio perfil"
  on public.consultas_analiticas for select
  using (
    mensagem_id in (
      select m.id from public.mensagens m
      join public.conversas c on c.id = m.conversa_id
      where c.perfil_id in (select id from public.perfis where usuario_id = auth.uid())
    )
  );

create policy "consultas_analiticas: gravar interpretação no próprio perfil"
  on public.consultas_analiticas for insert
  with check (
    mensagem_id in (
      select m.id from public.mensagens m
      join public.conversas c on c.id = m.conversa_id
      where c.perfil_id in (select id from public.perfis where usuario_id = auth.uid())
    )
  );
