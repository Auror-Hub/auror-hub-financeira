-- Fase 8: Consultor — ENT-ADVISOR-RESPONSE
-- Resposta estruturada em 6 partes (SCR-ADVISOR-001). mensagem_id aponta pra
-- mensagem do próprio consultor (a resposta). RUL-12: justificativa/evidência
-- nunca opcional — por isso resposta_direta/evidencias são not null.
-- Append-only por omissão (join até conversas via mensagens).

create table public.respostas_consultor (
  id uuid primary key default gen_random_uuid(),
  mensagem_id uuid not null references public.mensagens (id) on delete cascade,
  resposta_direta text not null,
  evidencias jsonb not null default '[]'::jsonb,
  interpretacao text not null,
  ressalvas text not null,
  acoes_possiveis jsonb not null default '[]'::jsonb,
  aprofundamento text not null,
  criado_em timestamptz not null default now()
);

comment on table public.respostas_consultor is 'ENT-ADVISOR-RESPONSE — resposta do Consultor em 6 partes (direta/evidências/interpretação/ressalvas/ações possíveis/aprofundamento). Append-only.';

create index on public.respostas_consultor (mensagem_id);

alter table public.respostas_consultor enable row level security;

create policy "respostas_consultor: ver respostas do próprio perfil"
  on public.respostas_consultor for select
  using (
    mensagem_id in (
      select m.id from public.mensagens m
      join public.conversas c on c.id = m.conversa_id
      where c.perfil_id in (select id from public.perfis where usuario_id = auth.uid())
    )
  );

create policy "respostas_consultor: gravar resposta no próprio perfil"
  on public.respostas_consultor for insert
  with check (
    mensagem_id in (
      select m.id from public.mensagens m
      join public.conversas c on c.id = m.conversa_id
      where c.perfil_id in (select id from public.perfis where usuario_id = auth.uid())
    )
  );
