-- Fix: um usuário com solicitação `pendente` (ainda sem membership ativa)
-- não conseguia ler o nome da própria família solicitada — a policy de
-- SELECT de `familias` só liberava para quem já tinha status='ativo'. A
-- tela de onboarding ("aguardando aprovação de X") mostrava "—" no lugar do
-- nome. Sem risco novo: quem já tem QUALQUER linha (mesmo pendente/recusada)
-- apontando pra essa familia_id já sabia o código de convite — não é uma
-- família nova que ele esteja descobrindo.

begin;

alter policy "familias: ver a própria família" on public.familias
  using (id in (select familia_id from public.membros_familia where usuario_id = auth.uid()));

commit;
