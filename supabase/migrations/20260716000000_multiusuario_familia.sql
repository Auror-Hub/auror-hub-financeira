-- Tópico G (Brainstorm 3) — Multiusuário/Família. Ver docs/decisions/ADR-004-MULTIUSUARIO-FAMILIA.md.
--
-- Desacopla "quem acessa" (usuário) de "qual acervo compartilhado" (família).
-- Reaproveita os UUIDs de perfis.id como familias.id — nenhuma linha de
-- negócio das ~9 tabelas com FK direta (nem das ~15 que referenciam via join)
-- precisa ser reescrita, só o constraint de FK repontua e o corpo das
-- policies troca a folha "select id from perfis where usuario_id=auth.uid()"
-- por "select familia_id from membros_familia where usuario_id=auth.uid()
-- and status='ativo'". `perfis` é renomeada para `membros_familia` (o vínculo
-- usuário↔família); `familias` é a tabela nova (o acervo em si).
--
-- Tudo num único arquivo, dentro de uma transação explícita: DDL é
-- transacional no Postgres, então isso roda em produção sem deixar o schema
-- pela metade se uma statement no meio falhar.

begin;

-- ============================================================
-- 1. familias — o acervo compartilhado
-- ============================================================

create table public.familias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo_convite text not null unique,
  criado_em timestamptz not null default now()
);

comment on table public.familias is 'ENT-FAMILY (ADR-004) — acervo financeiro compartilhado por N usuários. Reaproveita os UUIDs que perfis.id já tinha (ver INSERT abaixo).';

alter table public.familias enable row level security;

-- ============================================================
-- 2. Migração de dados: uma familia por perfis existente, mesmo UUID
-- ============================================================

insert into public.familias (id, nome, codigo_convite, criado_em)
select id, nome_perfil, substr(md5(random()::text || id::text), 1, 8), criado_em
from public.perfis;

-- ============================================================
-- 3. perfis -> membros_familia (o vínculo usuário↔família)
-- ============================================================

alter table public.perfis rename to membros_familia;

alter table public.membros_familia
  add column familia_id uuid,
  add column papel text,
  add column status text;

update public.membros_familia set familia_id = id, papel = 'admin', status = 'ativo';

alter table public.membros_familia
  alter column familia_id set not null,
  alter column papel set not null,
  alter column status set not null,
  alter column papel set default 'membro',
  alter column status set default 'pendente',
  add constraint membros_familia_familia_id_fkey foreign key (familia_id) references public.familias (id) on delete cascade,
  add constraint membros_familia_papel_check check (papel in ('admin', 'membro')),
  add constraint membros_familia_status_check check (status in ('ativo', 'pendente', 'recusado'));

create unique index membros_familia_usuario_ativo_idx on public.membros_familia (usuario_id) where status = 'ativo';

-- tipo/nome_perfil ficam sem significado numa linha de membership — nome_perfil
-- já foi copiado pra familias.nome acima, tipo nunca teve outro valor que 'familia'.
alter table public.membros_familia
  drop column tipo,
  drop column nome_perfil;

comment on table public.membros_familia is 'ENT-FAMILY-MEMBER (ADR-004, renomeada de perfis) — vínculo de um usuário com uma família: papel (admin/membro), status (ativo/pendente/recusado). Um usuário só tem uma membership ativa por vez (índice único parcial).';

-- A antiga policy "for all using(usuario_id=auth.uid())" era segura quando a
-- tabela só tinha tipo/nome_perfil (nada sensível pra auto-editar). Agora que
-- existem papel/status, mantê-la permitiria um usuário se auto-aprovar
-- (`update membros_familia set status='ativo' where usuario_id=auth.uid()`) —
-- por isso é substituída por 3 policies específicas, não só renomeada.
drop policy "perfis: ver e editar perfis do próprio usuário" on public.membros_familia;

create policy "membros_familia: ver a própria linha e membros da família ativa"
  on public.membros_familia for select
  using (
    usuario_id = auth.uid()
    or familia_id in (select familia_id from public.membros_familia m2 where m2.usuario_id = auth.uid() and m2.status = 'ativo')
  );

create policy "membros_familia: criar a própria membership"
  on public.membros_familia for insert
  with check (usuario_id = auth.uid());

create policy "membros_familia: admin aprova/recusa membros da própria família"
  on public.membros_familia for update
  using (familia_id in (select familia_id from public.membros_familia m2 where m2.usuario_id = auth.uid() and m2.papel = 'admin' and m2.status = 'ativo'))
  with check (familia_id in (select familia_id from public.membros_familia m2 where m2.usuario_id = auth.uid() and m2.papel = 'admin' and m2.status = 'ativo'));

-- RLS de familias (agora que membros_familia já tem as colunas necessárias)
create policy "familias: ver a própria família"
  on public.familias for select
  using (id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

create policy "familias: criar família"
  on public.familias for insert
  with check (auth.uid() is not null);

create policy "familias: admin edita a própria família"
  on public.familias for update
  using (id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and papel = 'admin' and status = 'ativo'))
  with check (id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and papel = 'admin' and status = 'ativo'));

-- Um usuário sem nenhuma membership ainda não consegue SELECT em familias
-- pela policy acima (correto — sem isso, qualquer autenticado leria toda
-- família pelo nome). Pra "entrar com código de convite" funcionar antes de
-- ter membership, o lookup precisa ser SECURITY DEFINER: só devolve algo
-- quando o código EXATO é apresentado, nunca permite listar/buscar por nome.
create function public.buscar_familia_por_codigo(p_codigo text)
returns table (id uuid, nome text)
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  return query select f.id, f.nome from public.familias f where f.codigo_convite = p_codigo;
end;
$$;

revoke all on function public.buscar_familia_por_codigo(text) from public;
grant execute on function public.buscar_familia_por_codigo(text) to authenticated;

-- ============================================================
-- 4. Repontar as 9 tabelas com FK direta: perfis(id) -> familias(id)
--    (mesma coluna perfil_id, sem tocar nenhum call-site de aplicação;
--    nome real da constraint descoberto dinamicamente, não hard-codado)
-- ============================================================

do $$
declare
  tbl text;
  cons text;
  tabelas text[] := array[
    'cartoes', 'configuracoes', 'documentos_origem', 'fornecedores_padronizados',
    'eventos_auditoria', 'competencias', 'regras', 'conversas', 'perfis_importacao'
  ];
begin
  foreach tbl in array tabelas loop
    select con.conname into cons
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = con.conkey[1]
    where rel.relname = tbl
      and con.contype = 'f'
      and att.attname = 'perfil_id'
      and array_length(con.conkey, 1) = 1;

    if cons is null then
      raise exception 'Não encontrei a FK de perfil_id em %', tbl;
    end if;

    execute format('alter table public.%I drop constraint %I', tbl, cons);
    execute format('alter table public.%I add constraint %I foreign key (perfil_id) references public.familias (id) on delete cascade', tbl, tbl || '_perfil_id_fkey');
  end loop;
end $$;

-- ============================================================
-- 5. handle_new_user(): usuário novo fica sem família até completar onboarding
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.usuarios (id, email, nome)
  values (new.id, new.email, null);
  return new;
end;
$$;

-- ============================================================
-- 6. Reescrita das policies restantes: troca a folha
--    "select id from perfis where usuario_id=auth.uid()" por
--    "select familia_id from membros_familia where usuario_id=auth.uid() and status='ativo'"
--    (ALTER POLICY em vez de DROP+CREATE — Postgres não deixa mudar o
--    comando FOR ALL/SELECT/INSERT/UPDATE, então um erro de copy-paste
--    falha alto na hora da migration em vez de sumir silenciosamente
--    atrás de uma policy recriada errada em produção)
-- ============================================================

alter policy "cartoes: ver e editar cartões do próprio perfil" on public.cartoes
  using (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'))
  with check (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

alter policy "configuracoes: ver e editar configurações do próprio perfil" on public.configuracoes
  using (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'))
  with check (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

alter policy "documentos_origem: acesso ao próprio perfil" on public.documentos_origem
  using (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'))
  with check (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

alter policy "lotes_importacao: acesso via documento do próprio perfil" on public.lotes_importacao
  using (documento_id in (
    select d.id from public.documentos_origem d
    join public.membros_familia p on p.familia_id = d.perfil_id
    where p.usuario_id = auth.uid() and p.status = 'ativo'
  ))
  with check (documento_id in (
    select d.id from public.documentos_origem d
    join public.membros_familia p on p.familia_id = d.perfil_id
    where p.usuario_id = auth.uid() and p.status = 'ativo'
  ));

alter policy "eventos_importacao: ver eventos do próprio perfil" on public.eventos_importacao
  using (lote_id in (
    select l.id from public.lotes_importacao l
    join public.documentos_origem d on d.id = l.documento_id
    join public.membros_familia p on p.familia_id = d.perfil_id
    where p.usuario_id = auth.uid() and p.status = 'ativo'
  ));

alter policy "eventos_importacao: registrar evento no próprio perfil" on public.eventos_importacao
  with check (lote_id in (
    select l.id from public.lotes_importacao l
    join public.documentos_origem d on d.id = l.documento_id
    join public.membros_familia p on p.familia_id = d.perfil_id
    where p.usuario_id = auth.uid() and p.status = 'ativo'
  ));

alter policy "lancamentos_brutos: ver lançamentos do próprio perfil" on public.lancamentos_brutos
  using (cartao_id in (
    select c.id from public.cartoes c
    join public.membros_familia p on p.familia_id = c.perfil_id
    where p.usuario_id = auth.uid() and p.status = 'ativo'
  ));

alter policy "lancamentos_brutos: inserir lançamentos no próprio perfil" on public.lancamentos_brutos
  with check (cartao_id in (
    select c.id from public.cartoes c
    join public.membros_familia p on p.familia_id = c.perfil_id
    where p.usuario_id = auth.uid() and p.status = 'ativo'
  ));

alter policy "possiveis_duplicatas: acesso via lançamento do próprio perfil" on public.possiveis_duplicatas
  using (lancamento_a_id in (
    select l.id from public.lancamentos_brutos l
    join public.cartoes c on c.id = l.cartao_id
    join public.membros_familia p on p.familia_id = c.perfil_id
    where p.usuario_id = auth.uid() and p.status = 'ativo'
  ))
  with check (lancamento_a_id in (
    select l.id from public.lancamentos_brutos l
    join public.cartoes c on c.id = l.cartao_id
    join public.membros_familia p on p.familia_id = c.perfil_id
    where p.usuario_id = auth.uid() and p.status = 'ativo'
  ));

alter policy "perfis_importacao: acesso ao próprio perfil" on public.perfis_importacao
  using (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'))
  with check (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

alter policy "fornecedores_padronizados: acesso ao próprio perfil" on public.fornecedores_padronizados
  using (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'))
  with check (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

alter policy "fornecedor_aliases: acesso via fornecedor do próprio perfil" on public.fornecedor_aliases
  using (fornecedor_padronizado_id in (
    select f.id from public.fornecedores_padronizados f
    join public.membros_familia p on p.familia_id = f.perfil_id
    where p.usuario_id = auth.uid() and p.status = 'ativo'
  ))
  with check (fornecedor_padronizado_id in (
    select f.id from public.fornecedores_padronizados f
    join public.membros_familia p on p.familia_id = f.perfil_id
    where p.usuario_id = auth.uid() and p.status = 'ativo'
  ));

alter policy "classificacao_propostas: ver propostas do próprio perfil" on public.classificacao_propostas
  using (lancamento_id in (
    select l.id from public.lancamentos_brutos l
    join public.cartoes c on c.id = l.cartao_id
    join public.membros_familia p on p.familia_id = c.perfil_id
    where p.usuario_id = auth.uid() and p.status = 'ativo'
  ));

alter policy "classificacao_propostas: gerar proposta no próprio perfil" on public.classificacao_propostas
  with check (lancamento_id in (
    select l.id from public.lancamentos_brutos l
    join public.cartoes c on c.id = l.cartao_id
    join public.membros_familia p on p.familia_id = c.perfil_id
    where p.usuario_id = auth.uid() and p.status = 'ativo'
  ));

alter policy "classificacao_decisoes: ver decisões do próprio perfil" on public.classificacao_decisoes
  using (lancamento_id in (
    select l.id from public.lancamentos_brutos l
    join public.cartoes c on c.id = l.cartao_id
    join public.membros_familia p on p.familia_id = c.perfil_id
    where p.usuario_id = auth.uid() and p.status = 'ativo'
  ));

alter policy "classificacao_decisoes: gravar decisão no próprio perfil" on public.classificacao_decisoes
  with check (lancamento_id in (
    select l.id from public.lancamentos_brutos l
    join public.cartoes c on c.id = l.cartao_id
    join public.membros_familia p on p.familia_id = c.perfil_id
    where p.usuario_id = auth.uid() and p.status = 'ativo'
  ));

alter policy "eventos_revisao: ver eventos do próprio perfil" on public.eventos_revisao
  using (lancamento_id in (
    select l.id from public.lancamentos_brutos l
    join public.cartoes c on c.id = l.cartao_id
    join public.membros_familia p on p.familia_id = c.perfil_id
    where p.usuario_id = auth.uid() and p.status = 'ativo'
  ));

alter policy "eventos_revisao: registrar evento no próprio perfil" on public.eventos_revisao
  with check (lancamento_id in (
    select l.id from public.lancamentos_brutos l
    join public.cartoes c on c.id = l.cartao_id
    join public.membros_familia p on p.familia_id = c.perfil_id
    where p.usuario_id = auth.uid() and p.status = 'ativo'
  ));

alter policy "excecoes: ver exceções do próprio perfil" on public.excecoes
  using (lancamento_id in (
    select l.id from public.lancamentos_brutos l
    join public.cartoes c on c.id = l.cartao_id
    join public.membros_familia p on p.familia_id = c.perfil_id
    where p.usuario_id = auth.uid() and p.status = 'ativo'
  ));

alter policy "excecoes: registrar exceção no próprio perfil" on public.excecoes
  with check (lancamento_id in (
    select l.id from public.lancamentos_brutos l
    join public.cartoes c on c.id = l.cartao_id
    join public.membros_familia p on p.familia_id = c.perfil_id
    where p.usuario_id = auth.uid() and p.status = 'ativo'
  ));

alter policy "eventos_auditoria: ver eventos do próprio perfil" on public.eventos_auditoria
  using (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

alter policy "eventos_auditoria: registrar evento no próprio perfil" on public.eventos_auditoria
  with check (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

alter policy "competencias: acesso ao próprio perfil" on public.competencias
  using (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'))
  with check (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

alter policy "fechamentos_competencia: ver fechamentos do próprio perfil" on public.fechamentos_competencia
  using (competencia_id in (
    select id from public.competencias where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
  ));

alter policy "fechamentos_competencia: gravar fechamento no próprio perfil" on public.fechamentos_competencia
  with check (competencia_id in (
    select id from public.competencias where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
  ));

alter policy "snapshots_analiticos: ver snapshots do próprio perfil" on public.snapshots_analiticos
  using (competencia_id in (
    select id from public.competencias where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
  ));

alter policy "snapshots_analiticos: gravar snapshot no próprio perfil" on public.snapshots_analiticos
  with check (competencia_id in (
    select id from public.competencias where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
  ));

alter policy "metricas: ver métricas do próprio perfil" on public.metricas
  using (snapshot_id in (
    select s.id from public.snapshots_analiticos s
    join public.competencias c on c.id = s.competencia_id
    where c.perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
  ));

alter policy "metricas: gravar métrica no próprio perfil" on public.metricas
  with check (snapshot_id in (
    select s.id from public.snapshots_analiticos s
    join public.competencias c on c.id = s.competencia_id
    where c.perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
  ));

alter policy "insights: ver insights do próprio perfil" on public.insights
  using (competencia_id in (select id from public.competencias where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')));

alter policy "insights: gravar insight no próprio perfil" on public.insights
  with check (competencia_id in (select id from public.competencias where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')));

alter policy "insights: atualizar status no próprio perfil" on public.insights
  using (competencia_id in (select id from public.competencias where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')))
  with check (competencia_id in (select id from public.competencias where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')));

alter policy "insight_evidencias: ver evidências do próprio perfil" on public.insight_evidencias
  using (insight_id in (
    select i.id from public.insights i
    join public.competencias c on c.id = i.competencia_id
    where c.perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
  ));

alter policy "insight_evidencias: gravar evidência no próprio perfil" on public.insight_evidencias
  with check (insight_id in (
    select i.id from public.insights i
    join public.competencias c on c.id = i.competencia_id
    where c.perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
  ));

alter policy "recomendacoes: ver recomendações do próprio perfil" on public.recomendacoes
  using (insight_relacionado_id in (
    select i.id from public.insights i
    join public.competencias c on c.id = i.competencia_id
    where c.perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
  ));

alter policy "recomendacoes: gravar recomendação no próprio perfil" on public.recomendacoes
  with check (insight_relacionado_id in (
    select i.id from public.insights i
    join public.competencias c on c.id = i.competencia_id
    where c.perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
  ));

alter policy "relatorios: ver relatórios do próprio perfil" on public.relatorios
  using (competencia_id in (
    select id from public.competencias where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
  ));

alter policy "relatorios: criar relatório no próprio perfil" on public.relatorios
  with check (competencia_id in (
    select id from public.competencias where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
  ));

alter policy "relatorio_versoes: ver versões do próprio perfil" on public.relatorio_versoes
  using (relatorio_id in (
    select r.id from public.relatorios r
    join public.competencias c on c.id = r.competencia_id
    where c.perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
  ));

alter policy "relatorio_versoes: gravar versão no próprio perfil" on public.relatorio_versoes
  with check (relatorio_id in (
    select r.id from public.relatorios r
    join public.competencias c on c.id = r.competencia_id
    where c.perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
  ));

alter policy "relatorio_versoes: atualizar status no próprio perfil" on public.relatorio_versoes
  using (relatorio_id in (
    select r.id from public.relatorios r
    join public.competencias c on c.id = r.competencia_id
    where c.perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
  ))
  with check (relatorio_id in (
    select r.id from public.relatorios r
    join public.competencias c on c.id = r.competencia_id
    where c.perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
  ));

alter policy "regras: ver regras do próprio perfil" on public.regras
  using (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

alter policy "regras: criar regra no próprio perfil" on public.regras
  with check (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

alter policy "regras: atualizar status/contadores no próprio perfil" on public.regras
  using (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'))
  with check (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

alter policy "regra_condicoes: ver condições do próprio perfil" on public.regra_condicoes
  using (regra_id in (select id from public.regras where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')));

alter policy "regra_condicoes: gravar condição no próprio perfil" on public.regra_condicoes
  with check (regra_id in (select id from public.regras where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')));

alter policy "regra_consequencias: ver consequências do próprio perfil" on public.regra_consequencias
  using (regra_id in (select id from public.regras where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')));

alter policy "regra_consequencias: gravar consequência no próprio perfil" on public.regra_consequencias
  with check (regra_id in (select id from public.regras where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')));

alter policy "regra_execucoes: ver execuções do próprio perfil" on public.regra_execucoes
  using (regra_id in (select id from public.regras where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')));

alter policy "regra_execucoes: gravar execução no próprio perfil" on public.regra_execucoes
  with check (regra_id in (select id from public.regras where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')));

alter policy "eventos_aprendizagem: ver eventos do próprio perfil" on public.eventos_aprendizagem
  using (gatilho_decisao_id in (
    select cd.id from public.classificacao_decisoes cd
    join public.lancamentos_brutos l on l.id = cd.lancamento_id
    join public.cartoes c on c.id = l.cartao_id
    join public.membros_familia p on p.familia_id = c.perfil_id
    where p.usuario_id = auth.uid() and p.status = 'ativo'
  ));

alter policy "eventos_aprendizagem: gravar evento no próprio perfil" on public.eventos_aprendizagem
  with check (gatilho_decisao_id in (
    select cd.id from public.classificacao_decisoes cd
    join public.lancamentos_brutos l on l.id = cd.lancamento_id
    join public.cartoes c on c.id = l.cartao_id
    join public.membros_familia p on p.familia_id = c.perfil_id
    where p.usuario_id = auth.uid() and p.status = 'ativo'
  ));

alter policy "conversas: ver conversas do próprio perfil" on public.conversas
  using (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

alter policy "conversas: iniciar conversa no próprio perfil" on public.conversas
  with check (perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo'));

alter policy "mensagens: ver mensagens do próprio perfil" on public.mensagens
  using (conversa_id in (select id from public.conversas where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')));

alter policy "mensagens: gravar mensagem no próprio perfil" on public.mensagens
  with check (conversa_id in (select id from public.conversas where perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')));

alter policy "consultas_analiticas: ver interpretações do próprio perfil" on public.consultas_analiticas
  using (
    mensagem_id in (
      select m.id from public.mensagens m
      join public.conversas c on c.id = m.conversa_id
      where c.perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
    )
  );

alter policy "consultas_analiticas: gravar interpretação no próprio perfil" on public.consultas_analiticas
  with check (
    mensagem_id in (
      select m.id from public.mensagens m
      join public.conversas c on c.id = m.conversa_id
      where c.perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
    )
  );

alter policy "respostas_consultor: ver respostas do próprio perfil" on public.respostas_consultor
  using (
    mensagem_id in (
      select m.id from public.mensagens m
      join public.conversas c on c.id = m.conversa_id
      where c.perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
    )
  );

alter policy "respostas_consultor: gravar resposta no próprio perfil" on public.respostas_consultor
  with check (
    mensagem_id in (
      select m.id from public.mensagens m
      join public.conversas c on c.id = m.conversa_id
      where c.perfil_id in (select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo')
    )
  );

commit;
