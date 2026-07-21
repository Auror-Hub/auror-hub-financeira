-- Fase 11 (Auditoria V2): Consultor maduro.
--
-- 1. `conversas` ganha `intencao_pendente` (slot-filling — a intenção parcial
--    de mutação + qual campo falta, enquanto o Consultor aguarda o usuário
--    completar) e `titulo` (gerado da primeira pergunta, editável). Ambas
--    mutáveis depois da criação — diferente do resto do schema do Consultor,
--    que é append-only por design; aqui o trigger permite update só destas
--    2 colunas, nunca de `perfil_id`/`iniciada_em`.
alter table public.conversas
  add column intencao_pendente jsonb null,
  add column titulo text null;

create policy "conversas: atualizar intencao_pendente/titulo da própria família" on public.conversas
  for update
  using (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'))
  with check (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

create function public.bloquear_alteracao_conversa_exceto_pendente_titulo()
returns trigger
language plpgsql
as $$
begin
  if new.perfil_id is distinct from old.perfil_id or new.iniciada_em is distinct from old.iniciada_em then
    raise exception 'conversas: só intencao_pendente/titulo podem ser alterados após a criação.';
  end if;
  return new;
end;
$$;

create trigger conversas_bloqueia_alteracao_exceto_pendente_titulo
  before update on public.conversas
  for each row execute function public.bloquear_alteracao_conversa_exceto_pendente_titulo();

-- 2. `respostas_consultor` ganha o estado de resolução do rascunho
--    (confirmado/descartado) persistido no servidor — hoje só existe como
--    `Set` local no React, perdido a cada reload. Mutável só uma vez (de
--    null pra um valor — nunca de volta pra null, nunca troca de valor).
alter table public.respostas_consultor
  add column resolvido_em timestamptz null,
  add column resolvido_como text null check (resolvido_como in ('confirmado', 'descartado'));

create policy "respostas_consultor: resolver rascunho da própria família" on public.respostas_consultor
  for update
  using (
    mensagem_id in (
      select id from public.mensagens where conversa_id in (
        select id from public.conversas where perfil_id in (
          select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'
        )
      )
    )
  )
  with check (
    mensagem_id in (
      select id from public.mensagens where conversa_id in (
        select id from public.conversas where perfil_id in (
          select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'
        )
      )
    )
  );

create function public.bloquear_alteracao_resposta_consultor_exceto_resolucao()
returns trigger
language plpgsql
as $$
begin
  if new.mensagem_id is distinct from old.mensagem_id
    or new.resposta_direta is distinct from old.resposta_direta
    or new.evidencias is distinct from old.evidencias
    or new.interpretacao is distinct from old.interpretacao
    or new.ressalvas is distinct from old.ressalvas
    or new.acoes_possiveis is distinct from old.acoes_possiveis
    or new.aprofundamento is distinct from old.aprofundamento
    or new.rascunho_acao is distinct from old.rascunho_acao
  then
    raise exception 'respostas_consultor: só resolvido_em/resolvido_como podem ser alterados após a criação.';
  end if;
  if old.resolvido_como is not null and new.resolvido_como is distinct from old.resolvido_como then
    raise exception 'respostas_consultor: resolvido_como já foi definido e não pode ser alterado.';
  end if;
  return new;
end;
$$;

create trigger respostas_consultor_bloqueia_alteracao_exceto_resolucao
  before update on public.respostas_consultor
  for each row execute function public.bloquear_alteracao_resposta_consultor_exceto_resolucao();
