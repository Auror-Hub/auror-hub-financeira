-- Fase 7: correção descoberta durante teste — RLS é por linha, não por
-- coluna. A policy de update de `insights`/`relatorio_versoes` (pensada só
-- para permitir a transição de status) na verdade permitia editar QUALQUER
-- coluna da linha, inclusive titulo/explicacao/confianca ou conteudo_html —
-- violando RUL-12 (insight nunca com conteúdo fabricado) e RUL-7 (relatório
-- nunca recalculado/editado depois de gerado). Triggers abaixo bloqueiam
-- update em qualquer coluna que não seja `status`, mesmo para service_role.

create function public.bloquear_alteracao_conteudo_insight()
returns trigger
language plpgsql
as $$
begin
  if new.competencia_id is distinct from old.competencia_id
    or new.tipo is distinct from old.tipo
    or new.titulo is distinct from old.titulo
    or new.explicacao is distinct from old.explicacao
    or new.relevancia is distinct from old.relevancia
    or new.confianca is distinct from old.confianca
    or new.impacto is distinct from old.impacto
    or new.versao_motor_analitico is distinct from old.versao_motor_analitico
  then
    raise exception 'insights: só a coluna status pode ser alterada após a criação (RUL-12) — conteúdo analítico é imutável.';
  end if;
  return new;
end;
$$;

create trigger insights_conteudo_imutavel
  before update on public.insights
  for each row execute function public.bloquear_alteracao_conteudo_insight();

create function public.bloquear_alteracao_conteudo_relatorio_versao()
returns trigger
language plpgsql
as $$
begin
  if new.relatorio_id is distinct from old.relatorio_id
    or new.versao is distinct from old.versao
    or new.snapshot_id is distinct from old.snapshot_id
    or new.conteudo_html is distinct from old.conteudo_html
    or new.metodologia is distinct from old.metodologia
    or new.insights_utilizados is distinct from old.insights_utilizados
  then
    raise exception 'relatorio_versoes: só a coluna status pode ser alterada após a criação (RUL-7) — conteúdo do relatório é imutável.';
  end if;
  return new;
end;
$$;

create trigger relatorio_versoes_conteudo_imutavel
  before update on public.relatorio_versoes
  for each row execute function public.bloquear_alteracao_conteudo_relatorio_versao();
