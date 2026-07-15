-- BE-4: Revisão humana real — ENT-REVIEW-EVENT
-- Toda ação na Caixa de Entrada gera um evento de revisão, além de
-- potencialmente uma classificacao_decisoes (arquitetura, SCR-INBOX-001:
-- "toda ação gera ENT-REVIEW-EVENT e potencialmente ENT-CLASSIFICATION-DECISION").
-- Append-only.

create table public.eventos_revisao (
  id uuid primary key default gen_random_uuid(),
  lancamento_id uuid not null references public.lancamentos_brutos (id) on delete cascade,
  tipo text not null check (tipo in ('confirmou', 'alterou', 'contexto', 'exceção', 'rejeitou fornecedor', 'reabriu')),
  usuario_id uuid not null references public.usuarios (id),
  criado_em timestamptz not null default now()
);

comment on table public.eventos_revisao is 'ENT-REVIEW-EVENT — registro append-only de cada ação de revisão tomada na Caixa de Entrada.';

alter table public.eventos_revisao enable row level security;

create policy "eventos_revisao: ver eventos do próprio perfil"
  on public.eventos_revisao for select
  using (lancamento_id in (
    select l.id from public.lancamentos_brutos l
    join public.cartoes c on c.id = l.cartao_id
    join public.perfis p on p.id = c.perfil_id
    where p.usuario_id = auth.uid()
  ));

create policy "eventos_revisao: registrar evento no próprio perfil"
  on public.eventos_revisao for insert
  with check (lancamento_id in (
    select l.id from public.lancamentos_brutos l
    join public.cartoes c on c.id = l.cartao_id
    join public.perfis p on p.id = c.perfil_id
    where p.usuario_id = auth.uid()
  ));
