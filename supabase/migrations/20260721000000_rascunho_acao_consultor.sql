-- Rearquitetura (Fase 4, ADR-007): Consultor com ferramentas — o Consultor
-- passa a poder PROPOR mutações (criar meta, ajustar meta, criar lançamento
-- provisório, corrigir classificação), nunca executá-las por conta própria.
-- `rascunho_acao` guarda a proposta estruturada (tipo + parâmetros já
-- resolvidos) pra renderizar o card de confirmação no chat — a mutação real
-- só acontece quando a Victoria clica "Confirmar" (chama a mesma action
-- server-side que a tela correspondente já usa, ex. criarMeta/
-- corrigirClassificacao — nenhuma superfície nova de autorização).
--
-- Nullable: mensagens de leitura (as 5 intenções da Fase 8) continuam sem
-- rascunho nenhum.

alter table public.respostas_consultor
  add column rascunho_acao jsonb;

comment on column public.respostas_consultor.rascunho_acao is 'Proposta de mutação estruturada (criar_meta/ajustar_meta/criar_provisorio/corrigir_classificacao), null quando a resposta é só leitura. A confirmação é sempre uma ação humana explícita no chat.';
