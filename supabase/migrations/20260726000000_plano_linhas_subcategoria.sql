-- Fase 17 da Auditoria V3.1 (plano hierárquico): plano_linhas só tinha
-- categoria_id — não dava pra alocar Delivery e Supermercado separadamente
-- dentro de Alimentação sem duplicar o total (metas já suportam esse
-- refinamento desde a Fase 8/Auditoria V2; o plano ficou atrás). Uma linha
-- com subcategoria_id é uma alocação DENTRO da categoria-mãe — o total da
-- categoria é a soma de todas as suas linhas (com ou sem subcategoria), e o
-- total global do plano continua sendo a soma de tudo, sem dupla contagem.

do $$
declare
  v_constraint_name text;
begin
  select con.conname into v_constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'plano_linhas' and con.contype = 'u';

  if v_constraint_name is not null then
    execute format('alter table public.plano_linhas drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.plano_linhas
  add column subcategoria_id uuid references public.taxonomia_termos (id),
  add constraint plano_linhas_categoria_subcategoria_unq unique (plano_mensal_id, categoria_id, subcategoria_id);

comment on column public.plano_linhas.subcategoria_id is 'Opcional — quando presente, a linha é uma alocação DENTRO de categoria_id (nunca sem categoria_id). Total da categoria = soma de todas as suas linhas; nunca somado separadamente ao total global.';
