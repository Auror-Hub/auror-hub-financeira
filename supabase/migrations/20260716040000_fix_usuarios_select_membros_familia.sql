-- Fix: a lista de membros em Configurações → Família mostrava "—" no lugar
-- do nome/e-mail de outros membros — `usuarios` só tinha policy de SELECT
-- pro próprio registro (`id = auth.uid()`), então um admin não conseguia ler
-- o e-mail de quem solicitou ingresso. Nova policy: ver usuarios que
-- compartilham uma família ativa com o chamador (qualquer status do outro
-- lado — inclusive pendente, é exatamente quem o admin precisa identificar
-- pra aprovar/recusar).

begin;

create policy "usuarios: ver membros da mesma família"
  on public.usuarios for select
  using (id in (
    select usuario_id from public.membros_familia
    where familia_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
  ));

commit;
