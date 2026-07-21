-- Fase 12 (Auditoria V2): extensão opcional de `familias` com perfil
-- financeiro — tudo nullable, nunca bloqueia uso do resto da Hub sem esses
-- dados. `consentimento_comparacao_externa` é o único campo com default
-- (false) — nunca há comparação externa sem esse "sim" explícito.
alter table public.familias
  add column renda_bruta_mensal bigint null check (renda_bruta_mensal is null or renda_bruta_mensal > 0),
  add column renda_liquida_mensal bigint null check (renda_liquida_mensal is null or renda_liquida_mensal > 0),
  add column cidade text null,
  add column estado text null,
  add column numero_pessoas int null check (numero_pessoas is null or numero_pessoas > 0),
  add column situacao_moradia text null check (situacao_moradia is null or situacao_moradia in ('propria', 'alugada', 'financiada', 'outra')),
  add column consentimento_comparacao_externa boolean not null default false;

-- Mesma policy de update já existente ("familias: admin edita a própria
-- família") já cobre as colunas novas — UPDATE é por linha, não por coluna,
-- e não há trigger de imutabilidade em `familias` (diferente do dado
-- financeiro bruto, o perfil da família é editável por design).
