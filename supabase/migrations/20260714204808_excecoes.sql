-- BE-4: Revisão humana real — ENT-EXCEPTION
-- Uma exceção nunca é deletada, mesmo depois que a regra relacionada
-- evoluir (arquitetura: "mesmo após a regra evoluir, a exceção original
-- permanece documentada"). regra_relacionada_id fica sem FK por enquanto —
-- ENT-RULE só existe a partir da Fase 4 (motor de regras).

create table public.excecoes (
  id uuid primary key default gen_random_uuid(),
  lancamento_id uuid not null references public.lancamentos_brutos (id) on delete cascade,
  regra_relacionada_id uuid,
  motivo text not null,
  criado_em timestamptz not null default now()
);

comment on table public.excecoes is 'ENT-EXCEPTION — exceção registrada para um lançamento que não deve seguir a regra/padrão geral do fornecedor. Nunca deletada, mesmo quando a regra relacionada evoluir.';
comment on column public.excecoes.regra_relacionada_id is 'Sem FK ainda — ENT-RULE só existe a partir da Fase 4 (motor de regras). Fica null até lá.';

alter table public.excecoes enable row level security;

-- Só select/insert — exceção nunca é editada nem removida.
create policy "excecoes: ver exceções do próprio perfil"
  on public.excecoes for select
  using (lancamento_id in (
    select l.id from public.lancamentos_brutos l
    join public.cartoes c on c.id = l.cartao_id
    join public.perfis p on p.id = c.perfil_id
    where p.usuario_id = auth.uid()
  ));

create policy "excecoes: registrar exceção no próprio perfil"
  on public.excecoes for insert
  with check (lancamento_id in (
    select l.id from public.lancamentos_brutos l
    join public.cartoes c on c.id = l.cartao_id
    join public.perfis p on p.id = c.perfil_id
    where p.usuario_id = auth.uid()
  ));
