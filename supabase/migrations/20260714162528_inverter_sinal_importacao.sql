-- BE-2 (extensão): faturas de instituições diferentes usam convenções de
-- sinal opostas no modo "uma coluna só" — ex.: Porto Seguro (via
-- crédito/débito) trata gasto como negativo, mas o CSV do Itaú traz gasto
-- como positivo e crédito/estorno/pagamento como negativo. Sem isso, juntar
-- lançamentos de cartões diferentes no mesmo acervo somaria sinais
-- inconsistentes.

alter table public.perfis_importacao
  add column inverter_sinal boolean not null default false;

comment on column public.perfis_importacao.inverter_sinal is 'Quando true, inverte o sinal do valor lido (modo "uma coluna só") — usado quando o arquivo representa gasto como positivo, ao contrário da convenção interna (gasto = negativo).';
