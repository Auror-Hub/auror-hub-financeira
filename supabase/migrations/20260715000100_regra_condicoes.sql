-- Fase 4: Motor de regras — ENT-RULE-CONDITION
-- Só um tipo implementado nesta fase ('fornecedor_contem') — o dicionário
-- lista 11 tipos possíveis (valor, faixa, cartão, parcelas, frequência,
-- combinação AND/OR etc.); os demais ficam para extensão futura da mesma
-- tabela (novo valor no check + código do motor), sem redesenho. Append-only.

create table public.regra_condicoes (
  id uuid primary key default gen_random_uuid(),
  regra_id uuid not null references public.regras (id) on delete cascade,
  tipo text not null check (tipo in ('fornecedor_contem')),
  valor_condicao jsonb not null,
  criado_em timestamptz not null default now()
);

comment on table public.regra_condicoes is 'ENT-RULE-CONDITION — condição de uma regra. tipo=fornecedor_contem: valor_condicao = {"texto": "..."} casado contra lancamentos_brutos.descricao_original.';

create index on public.regra_condicoes (regra_id);

alter table public.regra_condicoes enable row level security;

create policy "regra_condicoes: ver condições do próprio perfil"
  on public.regra_condicoes for select
  using (regra_id in (select id from public.regras where perfil_id in (select id from public.perfis where usuario_id = auth.uid())));

create policy "regra_condicoes: gravar condição no próprio perfil"
  on public.regra_condicoes for insert
  with check (regra_id in (select id from public.regras where perfil_id in (select id from public.perfis where usuario_id = auth.uid())));
