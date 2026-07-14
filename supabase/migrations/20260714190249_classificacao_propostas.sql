-- BE-3: Inteligência (estrutura) — ENT-CLASSIFICATION-PROPOSAL
-- Ver docs/architecture (RUL-2: classificação nunca é campo direto do
-- lançamento bruto; D7: confiança por dimensão; D11: justificativa nunca
-- opcional). Append-only, mesmo padrão de lancamentos_brutos/eventos_importacao
-- — um lançamento pode ganhar mais de uma proposta ao longo do tempo
-- (reprocessamento com motor/versão diferente), nunca sobrescrita.

create table public.classificacao_propostas (
  id uuid primary key default gen_random_uuid(),
  lancamento_id uuid not null references public.lancamentos_brutos (id) on delete cascade,
  fornecedor_sugerido_id uuid references public.fornecedores_padronizados (id),
  categoria_id uuid references public.taxonomia_termos (id),
  subcategoria_id uuid references public.taxonomia_termos (id),
  objetivo_id uuid references public.taxonomia_termos (id),
  contexto_sugerido text,
  confianca_categoria numeric check (confianca_categoria >= 0 and confianca_categoria <= 1),
  confianca_subcategoria numeric check (confianca_subcategoria >= 0 and confianca_subcategoria <= 1),
  confianca_objetivo numeric check (confianca_objetivo >= 0 and confianca_objetivo <= 1),
  confianca_geral numeric not null check (confianca_geral >= 0 and confianca_geral <= 1),
  justificativa text not null,
  origem text not null check (origem in ('regra', 'llm')),
  versao_classificador text not null,
  criado_em timestamptz not null default now()
);

comment on table public.classificacao_propostas is 'ENT-CLASSIFICATION-PROPOSAL — proposta da IA/motor de regras, imutável (RUL-2). Nunca editada; um novo processamento gera uma nova linha. A proposta vigente de um lançamento é a mais recente (criado_em desc).';
comment on column public.classificacao_propostas.origem is 'regra: casou por fornecedor padronizado/histórico, sem custo de API. llm: fallback via API da Claude quando não há sinal conhecido.';

create index on public.classificacao_propostas (lancamento_id, criado_em desc);

alter table public.classificacao_propostas enable row level security;

-- Append-only: só select/insert, sem policy de update/delete (mesmo padrão
-- de lancamentos_brutos/eventos_importacao).
create policy "classificacao_propostas: ver propostas do próprio perfil"
  on public.classificacao_propostas for select
  using (lancamento_id in (
    select l.id from public.lancamentos_brutos l
    join public.cartoes c on c.id = l.cartao_id
    join public.perfis p on p.id = c.perfil_id
    where p.usuario_id = auth.uid()
  ));

create policy "classificacao_propostas: gerar proposta no próprio perfil"
  on public.classificacao_propostas for insert
  with check (lancamento_id in (
    select l.id from public.lancamentos_brutos l
    join public.cartoes c on c.id = l.cartao_id
    join public.perfis p on p.id = c.perfil_id
    where p.usuario_id = auth.uid()
  ));
