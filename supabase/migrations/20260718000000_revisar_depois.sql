-- Rearquitetura (Fase 0, ADR-007): "revisar depois" passa a ser persistido.
-- Até aqui, adiar um lançamento na Caixa de Entrada era só um Set em memória
-- no cliente — some ao recarregar a página. Reaproveita o log append-only
-- já existente (eventos_revisao) em vez de criar uma tabela nova: um evento
-- 'adiou' esconde o lançamento da fila até o fim do dia em que foi adiado
-- (calendário, não sessão de navegador) — reaparece na próxima sessão, como
-- o direcional pede, sem precisar de job de limpeza nem tabela de estado.

alter table public.eventos_revisao
  drop constraint if exists eventos_revisao_tipo_check;
alter table public.eventos_revisao
  add constraint eventos_revisao_tipo_check
  check (tipo in ('confirmou', 'alterou', 'contexto', 'exceção', 'rejeitou fornecedor', 'reabriu', 'adiou'));
