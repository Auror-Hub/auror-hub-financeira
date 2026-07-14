-- BE-2 (extensão): suporte a XLSX além de CSV, e faturas com colunas de
-- crédito/débito separadas em vez de uma única coluna com sinal (ex.:
-- Porto Seguro — cartão principal da Família Gama).
-- Incremental sobre a migration 20260714102320 (já aplicada).

alter table public.perfis_importacao
  add column tipo_arquivo text not null default 'csv' check (tipo_arquivo in ('csv', 'xlsx')),
  add column aba text,
  add column linhas_para_pular int not null default 0,
  add column modo_valor text not null default 'unica' check (modo_valor in ('unica', 'credito_debito')),
  add column coluna_credito text,
  add column coluna_debito text;

comment on column public.perfis_importacao.tipo_arquivo is 'csv ou xlsx — faturas em planilha têm estrutura diferente (abas, linhas de cabeçalho a pular).';
comment on column public.perfis_importacao.modo_valor is 'unica: coluna_valor com sinal. credito_debito: coluna_credito/coluna_debito separadas (ex.: Porto Seguro).';

-- coluna_valor deixa de ser obrigatória: no modo credito_debito ela fica vazia.
alter table public.perfis_importacao alter column coluna_valor drop not null;
