-- BE-3: Inteligência (estrutura) — ENT-STANDARD-MERCHANT / ENT-STANDARD-MERCHANT-ALIAS
-- Ver docs/architecture (seção 8, Fornecedor) e TAXONOMIA-INICIAL.md.
--
-- Escopo por perfil (não global): o padrão de nomeação/categorização de um
-- fornecedor é preferência da família, não vocabulário universal (diferente
-- de taxonomia_termos). Começa vazio — não há seed via migration porque não
-- existe perfil no momento da migration; o motor de classificação usa uma
-- lista genérica embutida em código como sinal adicional (não perfil-específico)
-- antes de recorrer à IA, e este cadastro cresce a partir daí.

create table public.fornecedores_padronizados (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  nome_oficial text not null,
  categoria_dominante_id uuid references public.taxonomia_termos (id),
  -- Nunca objetivo — TAXONOMIA-INICIAL.md §5: "o titular do cartão nunca
  -- define sozinho o objetivo"; o mesmo vale para fornecedor sozinho.
  comportamento_contextual boolean not null default false,
  confianca numeric not null default 0.5 check (confianca >= 0 and confianca <= 1),
  primeira_ocorrencia date,
  ultima_ocorrencia date,
  criado_em timestamptz not null default now(),
  unique (perfil_id, nome_oficial)
);

comment on table public.fornecedores_padronizados is 'ENT-STANDARD-MERCHANT — fornecedor padronizado por perfil. comportamento_contextual=true significa que a categoria varia conforme o item/contexto (ex.: Amazon, Mercado Livre — TAXONOMIA-INICIAL.md §2, "usar com cautela").';

create table public.fornecedor_aliases (
  id uuid primary key default gen_random_uuid(),
  fornecedor_padronizado_id uuid not null references public.fornecedores_padronizados (id) on delete cascade,
  padrao_texto text not null,
  criado_em timestamptz not null default now()
);

comment on table public.fornecedor_aliases is 'ENT-STANDARD-MERCHANT-ALIAS — padrão de texto (case-insensitive, casado contra descricao_original) que identifica o fornecedor padronizado. Um fornecedor pode ter vários aliases (ex.: "UBER *TRIP", "DL *UberRides" → mesmo fornecedor "Uber").';

alter table public.fornecedores_padronizados enable row level security;
alter table public.fornecedor_aliases enable row level security;

create policy "fornecedores_padronizados: acesso ao próprio perfil"
  on public.fornecedores_padronizados for all
  using (perfil_id in (select id from public.perfis where usuario_id = auth.uid()))
  with check (perfil_id in (select id from public.perfis where usuario_id = auth.uid()));

create policy "fornecedor_aliases: acesso via fornecedor do próprio perfil"
  on public.fornecedor_aliases for all
  using (fornecedor_padronizado_id in (
    select f.id from public.fornecedores_padronizados f
    join public.perfis p on p.id = f.perfil_id
    where p.usuario_id = auth.uid()
  ))
  with check (fornecedor_padronizado_id in (
    select f.id from public.fornecedores_padronizados f
    join public.perfis p on p.id = f.perfil_id
    where p.usuario_id = auth.uid()
  ));
