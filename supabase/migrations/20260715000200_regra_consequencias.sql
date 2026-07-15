-- Fase 4: Motor de regras — ENT-RULE-CONSEQUENCE
-- Só um tipo implementado nesta fase ('sugerir_classificacao') — as outras 7
-- do dicionário (aumentar/reduzir confiança, exigir revisão, aplicar
-- contexto, marcar exceção provável, vincular fornecedor, impedir
-- confirmação automática) ficam para extensão futura. Append-only.

create table public.regra_consequencias (
  id uuid primary key default gen_random_uuid(),
  regra_id uuid not null references public.regras (id) on delete cascade,
  tipo text not null check (tipo in ('sugerir_classificacao')),
  parametros jsonb not null,
  criado_em timestamptz not null default now()
);

comment on table public.regra_consequencias is 'ENT-RULE-CONSEQUENCE — consequência de uma regra. tipo=sugerir_classificacao: parametros = {"categoriaId", "subcategoriaId"?, "objetivoId"?}.';

create index on public.regra_consequencias (regra_id);

alter table public.regra_consequencias enable row level security;

create policy "regra_consequencias: ver consequências do próprio perfil"
  on public.regra_consequencias for select
  using (regra_id in (select id from public.regras where perfil_id in (select id from public.perfis where usuario_id = auth.uid())));

create policy "regra_consequencias: gravar consequência no próprio perfil"
  on public.regra_consequencias for insert
  with check (regra_id in (select id from public.regras where perfil_id in (select id from public.perfis where usuario_id = auth.uid())));
