-- Fase 15 da Auditoria V3.1 (ciclo de cartão): a auditoria aponta que o
-- cartão não tem campo de vencimento/fechamento — `regra_de_corte_competencia`
-- (jsonb, desde a fundação) existe mas nunca foi populado por nenhum código.
-- Estes dois campos são o primeiro passo, deliberadamente pequeno: guardar o
-- dia de fechamento e o dia de vencimento quando a família souber informar,
-- sem acoplar nenhuma automação de competência a eles ainda — a competência
-- continua sendo escolha manual no upload (ADR-007). Preparam terreno pra uma
-- futura automação de ciclo de fatura sem comprometer a arquitetura agora.

alter table public.cartoes
  add column dia_fechamento int check (dia_fechamento between 1 and 31),
  add column dia_vencimento int check (dia_vencimento between 1 and 31);

comment on column public.cartoes.dia_fechamento is 'Dia do mês em que a fatura fecha (opcional, nullable). Não usado por nenhuma automação ainda — só informativo até uma fase futura de ciclo de fatura.';
comment on column public.cartoes.dia_vencimento is 'Dia do mês em que a fatura vence (opcional, nullable). Mesma observação de dia_fechamento.';
