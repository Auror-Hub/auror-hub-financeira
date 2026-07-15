-- BE-4: suporte a lançamento manual (despesas que nunca passam pelo cartão —
-- aluguel, condomínio, contas, PIX). O dicionário de dados original exigia
-- lote_importacao_id e arquivo_origem_id em ENT-RAW-TRANSACTION (só cobria
-- fatura importada); generaliza pra caber cadastro manual, sem forçar um
-- documento/lote falso. cartao_id continua obrigatório — reaproveita
-- `cartoes` como "fonte de pagamento" genérica (o comentário da tabela já
-- diz "cartão/origem financeira"); uma fonte tipo "Conta corrente / PIX"
-- é só mais um cartão cadastrado, sem conceito novo de schema.

alter table public.lancamentos_brutos
  alter column lote_importacao_id drop not null,
  alter column arquivo_origem_id drop not null,
  add column origem text not null default 'importado' check (origem in ('importado', 'manual'));

comment on column public.lancamentos_brutos.origem is 'importado: veio de upload de fatura (CSV/XLSX). manual: cadastrado diretamente pelo usuário — nunca passou por um documento de origem.';
