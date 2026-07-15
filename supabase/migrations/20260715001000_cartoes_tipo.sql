-- Ajuste A (brainstorm 2026-07-15): cartoes precisa distinguir cartão de
-- crédito de conta corrente/PIX — hoje a tabela é genérica e a UI só rotula
-- como "cartão", sem opção de cadastrar uma conta com esse nome (mesmo já
-- sendo reaproveitada como "fonte de pagamento" genérica desde o BE-4).

alter table public.cartoes
  add column tipo text not null default 'cartao' check (tipo in ('cartao', 'conta'));

comment on column public.cartoes.tipo is 'cartao = cartão de crédito; conta = conta corrente/PIX. Mesma tabela reaproveitada como "fonte de pagamento" genérica desde o BE-4 — este campo só ajusta o rótulo exibido.';
