-- BE-4: Revisão humana real — ENT-CLASSIFICATION-DECISION
-- Ver docs/architecture (RUL-3: proposta_anterior nula só se decisão nunca
-- teve proposta/item criado manualmente; princípio D2/D8/D9: decisão nunca
-- sobrescrita, sempre versionada). Append-only, mesmo padrão de
-- classificacao_propostas — uma nova decisão sobre o mesmo lançamento é uma
-- nova linha (versao incrementada), nunca um update.

create table public.classificacao_decisoes (
  id uuid primary key default gen_random_uuid(),
  lancamento_id uuid not null references public.lancamentos_brutos (id) on delete cascade,
  proposta_anterior_id uuid references public.classificacao_propostas (id),
  categoria_id uuid references public.taxonomia_termos (id),
  subcategoria_id uuid references public.taxonomia_termos (id),
  objetivo_id uuid references public.taxonomia_termos (id),
  contexto text,
  fornecedor_id uuid references public.fornecedores_padronizados (id),
  usuario_responsavel_id uuid references public.usuarios (id),
  origem_da_decisao text not null check (origem_da_decisao in ('manual', 'confirmação de sugestão', 'regra automática')),
  status text not null check (status in ('confirmada', 'corrigida', 'parcialmente corrigida', 'exceção', 'substituída')),
  versao int not null,
  criado_em timestamptz not null default now(),
  unique (lancamento_id, versao)
);

comment on table public.classificacao_decisoes is 'ENT-CLASSIFICATION-DECISION — decisão humana (ou automática) sobre a classificação de um lançamento. Append-only e versionada (RUL-3, D2/D8/D9): a decisão vigente é a de maior versao/criado_em mais recente, nunca um update na linha anterior.';
comment on column public.classificacao_decisoes.proposta_anterior_id is 'Nula quando a decisão nunca teve proposta (item criado manualmente) — RUL-3.';
comment on column public.classificacao_decisoes.usuario_responsavel_id is 'Nula quando a decisão é automática por regra (motor de regras, fase futura).';

create index on public.classificacao_decisoes (lancamento_id, versao desc);

alter table public.classificacao_decisoes enable row level security;

-- Append-only: só select/insert, sem policy de update/delete.
create policy "classificacao_decisoes: ver decisões do próprio perfil"
  on public.classificacao_decisoes for select
  using (lancamento_id in (
    select l.id from public.lancamentos_brutos l
    join public.cartoes c on c.id = l.cartao_id
    join public.perfis p on p.id = c.perfil_id
    where p.usuario_id = auth.uid()
  ));

create policy "classificacao_decisoes: gravar decisão no próprio perfil"
  on public.classificacao_decisoes for insert
  with check (lancamento_id in (
    select l.id from public.lancamentos_brutos l
    join public.cartoes c on c.id = l.cartao_id
    join public.perfis p on p.id = c.perfil_id
    where p.usuario_id = auth.uid()
  ));
