-- Fase 20 (Auditoria V3.1): perfil financeiro e cesta básica automática.

-- Revoga a escrita manual de `cesta_basica_precos` — era um risco real de
-- integridade: qualquer usuário autenticado podia cadastrar um valor que
-- vale pra TODAS as famílias da Hub (dado global, não por família). Mesmo
-- padrão de `indices_precos` (Fase 12): só leitura pra autenticados, escrita
-- fica pra `service_role` (a automação de coleta real entra na Fase 21).
drop policy if exists "cesta_basica_precos: cadastro por qualquer autenticado" on public.cesta_basica_precos;

-- `capitais_referencia` — as 27 capitais brasileiras (dado público, sem
-- PII, nunca muda). Seed direto na migration em vez de exigir um passo
-- manual no SQL Editor: é justamente o tipo de referência estática que não
-- se beneficia de ficar fora do versionamento.
create table public.capitais_referencia (
  uf text primary key,
  capital text not null,
  codigo_ibge_municipio text not null
);

insert into public.capitais_referencia (uf, capital, codigo_ibge_municipio) values
  ('AC', 'Rio Branco', '1200401'),
  ('AL', 'Maceió', '2704302'),
  ('AP', 'Macapá', '1600303'),
  ('AM', 'Manaus', '1302603'),
  ('BA', 'Salvador', '2927408'),
  ('CE', 'Fortaleza', '2304400'),
  ('DF', 'Brasília', '5300108'),
  ('ES', 'Vitória', '3205309'),
  ('GO', 'Goiânia', '5208707'),
  ('MA', 'São Luís', '2111300'),
  ('MT', 'Cuiabá', '5103403'),
  ('MS', 'Campo Grande', '5002704'),
  ('MG', 'Belo Horizonte', '3106200'),
  ('PA', 'Belém', '1501402'),
  ('PB', 'João Pessoa', '2507507'),
  ('PR', 'Curitiba', '4106902'),
  ('PE', 'Recife', '2611606'),
  ('PI', 'Teresina', '2211001'),
  ('RJ', 'Rio de Janeiro', '3304557'),
  ('RN', 'Natal', '2408102'),
  ('RS', 'Porto Alegre', '4314902'),
  ('RO', 'Porto Velho', '1100205'),
  ('RR', 'Boa Vista', '1400100'),
  ('SC', 'Florianópolis', '4205407'),
  ('SP', 'São Paulo', '3550308'),
  ('SE', 'Aracaju', '2800308'),
  ('TO', 'Palmas', '1721000');

alter table public.capitais_referencia enable row level security;
create policy "capitais_referencia: leitura para autenticados" on public.capitais_referencia
  for select
  using (auth.uid() is not null);

-- `perfis_localizacao_referencia` — derivado de `familias.cidade/estado`,
-- recalculado sempre que `atualizarPerfilFinanceiro` roda (nunca editado
-- direto pelo usuário). Resolve a correspondência cidade real → capital de
-- referência DIEESE sem depender de adivinhação em tempo de leitura.
create table public.perfis_localizacao_referencia (
  perfil_id uuid primary key references public.familias (id) on delete cascade,
  cidade_perfil text not null,
  uf text not null references public.capitais_referencia (uf),
  capital_referencia text not null,
  regra_correspondencia text not null check (regra_correspondencia in ('direta', 'proxy_uf')),
  atualizado_em timestamptz not null default now()
);

alter table public.perfis_localizacao_referencia enable row level security;
create policy "perfis_localizacao_referencia: leitura pela própria família" on public.perfis_localizacao_referencia
  for select
  using (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));
create policy "perfis_localizacao_referencia: insercao pela própria família" on public.perfis_localizacao_referencia
  for insert
  with check (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));
create policy "perfis_localizacao_referencia: atualizacao pela própria família" on public.perfis_localizacao_referencia
  for update
  using (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'))
  with check (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));
create policy "perfis_localizacao_referencia: exclusao pela própria família" on public.perfis_localizacao_referencia
  for delete
  using (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));
