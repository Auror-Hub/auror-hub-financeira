-- Fase 6: Motor analítico — ENT-INSIGHT
-- Produzido pelo Agente Analista ao fechar uma competência (JRN-MONTHLY-CLOSE).
-- Diferente da maioria das tabelas do projeto, `status` é mutável por design
-- (mesmo padrão já aceito para `competencias.estado` no BE-5): quando a
-- competência é reaberta e refechada, os insights antigos viram 'superseded'
-- antes da nova rodada ser inserida. O conteúdo analítico em si (titulo,
-- explicacao, confianca, relevancia, impacto, versao_motor_analitico) nunca
-- é editado depois de criado — só a coluna status muda.

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  competencia_id uuid not null references public.competencias (id) on delete cascade,
  tipo text not null,
  titulo text not null,
  explicacao text not null,
  relevancia numeric not null check (relevancia >= 0 and relevancia <= 1),
  confianca numeric not null check (confianca >= 0 and confianca <= 1),
  impacto numeric not null check (impacto >= 0 and impacto <= 1),
  status text not null default 'ativo' check (status in ('ativo', 'superseded')),
  versao_motor_analitico text not null,
  criado_em timestamptz not null default now()
);

comment on table public.insights is 'ENT-INSIGHT — fenômeno detectado e explicado pelo Agente Analista. status é mutável (ativo/superseded); os demais campos são fixados na criação e nunca editados.';

create index on public.insights (competencia_id, status);

alter table public.insights enable row level security;

create policy "insights: ver insights do próprio perfil"
  on public.insights for select
  using (competencia_id in (
    select id from public.competencias where perfil_id in (select id from public.perfis where usuario_id = auth.uid())
  ));

create policy "insights: gravar insight no próprio perfil"
  on public.insights for insert
  with check (competencia_id in (
    select id from public.competencias where perfil_id in (select id from public.perfis where usuario_id = auth.uid())
  ));

-- Update permitido só para marcar insights antigos como superseded numa
-- refechamento — não há trigger restringindo a coluna especificamente
-- (mesmo nível de confiança já dado a `competencias.estado`); a disciplina
-- de nunca editar o conteúdo analítico é mantida pelo código da aplicação.
create policy "insights: atualizar status no próprio perfil"
  on public.insights for update
  using (competencia_id in (
    select id from public.competencias where perfil_id in (select id from public.perfis where usuario_id = auth.uid())
  ))
  with check (competencia_id in (
    select id from public.competencias where perfil_id in (select id from public.perfis where usuario_id = auth.uid())
  ));
