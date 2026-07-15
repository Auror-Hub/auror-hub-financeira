-- Ajuste B (brainstorm 2026-07-15): /taxonomia chegou na fase de ter tela de
-- gestão real — o BE-3 deixou só select de propósito ("tela de gestão fica
-- pra fase futura"). Vocabulário continua compartilhado (ADR-003, sem
-- multiusuário) — políticas liberam insert/update pra qualquer usuário
-- autenticado, não por perfil. "Excluir" na prática é desativar
-- (status='desativado') — nunca delete, termos já referenciados por
-- decisões/propostas/regras não podem desaparecer (D2/D8).

create policy "taxonomia_termos: criar termo"
  on public.taxonomia_termos for insert
  with check (auth.uid() is not null);

create policy "taxonomia_termos: atualizar termo"
  on public.taxonomia_termos for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- dimensao/termo_pai_id são imutáveis depois de criados — só rotulo/status
-- podem mudar (mesmo padrão de coluna-imutável da Fase 6/7).
create function public.bloquear_alteracao_estrutura_taxonomia()
returns trigger
language plpgsql
as $$
begin
  if new.dimensao is distinct from old.dimensao
    or new.termo_pai_id is distinct from old.termo_pai_id
    or new.origem is distinct from old.origem
    or new.criado_em is distinct from old.criado_em
  then
    raise exception 'taxonomia_termos: só rotulo/status podem mudar após a criação — dimensão e hierarquia são imutáveis.';
  end if;
  return new;
end;
$$;

create trigger taxonomia_termos_estrutura_imutavel
  before update on public.taxonomia_termos
  for each row execute function public.bloquear_alteracao_estrutura_taxonomia();
