-- Fase 10 (Auditoria V2): relatório passa a gravar as seções em formato
-- estruturado (jsonb), além de `conteudo_html` (mantido para os relatórios
-- já gerados continuarem acessíveis via iframe — RUL-5, nunca reescreve o
-- passado). Nullable porque relatórios anteriores a esta fase nunca vão
-- ganhar esse campo retroativamente.
alter table public.relatorio_versoes
  add column secoes_estruturadas jsonb null;

-- Estende o trigger de imutabilidade de conteúdo (Fase 7) para cobrir a
-- coluna nova — sem isso, `secoes_estruturadas` ficaria editável mesmo após
-- a criação da versão, violando o mesmo RUL-7 que já protege `conteudo_html`.
create or replace function public.bloquear_alteracao_conteudo_relatorio_versao()
returns trigger
language plpgsql
as $$
begin
  if new.relatorio_id is distinct from old.relatorio_id
    or new.versao is distinct from old.versao
    or new.snapshot_id is distinct from old.snapshot_id
    or new.conteudo_html is distinct from old.conteudo_html
    or new.secoes_estruturadas is distinct from old.secoes_estruturadas
    or new.metodologia is distinct from old.metodologia
    or new.insights_utilizados is distinct from old.insights_utilizados
  then
    raise exception 'relatorio_versoes: só a coluna status pode ser alterada após a criação (RUL-7) — conteúdo do relatório é imutável.';
  end if;
  return new;
end;
$$;
