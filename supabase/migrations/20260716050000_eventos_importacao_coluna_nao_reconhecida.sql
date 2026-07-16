-- Fase 2 do importador inteligente (Insight de Produto, 2026-07-16): alerta
-- estruturado por coluna não reconhecida — distinto de 'linha_invalida'
-- (que já existe e é por linha). Emitido UMA vez por coluna quando ela tem
-- alta taxa de falha de parse mesmo após sanitização (ver src/lib/import/actions.ts),
-- sinalizando causa estrutural em vez de um acúmulo de rejeições linha a linha.

begin;

do $$
declare
  cons text;
begin
  select con.conname into cons
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'eventos_importacao' and con.contype = 'c' and con.conname like '%tipo%';

  if cons is null then
    raise exception 'Não encontrei o check constraint de eventos_importacao.tipo';
  end if;

  execute format('alter table public.eventos_importacao drop constraint %I', cons);
end $$;

alter table public.eventos_importacao
  add constraint eventos_importacao_tipo_check
  check (tipo in ('reconhecimento', 'extracao', 'divergencia', 'duplicidade', 'linha_invalida', 'erro', 'coluna_nao_reconhecida'));

comment on table public.eventos_importacao is 'ENT-IMPORT-EVENT — log append-only do lote. Nenhuma linha inválida é descartada silenciosamente (regra do ADR-002): toda rejeição vira um evento aqui. coluna_nao_reconhecida (Insight de Produto, 2026-07-16): alerta por COLUNA (uma vez, não por linha) quando uma coluna aplicada tem alta taxa de falha de parse mesmo após sanitização.';

commit;
