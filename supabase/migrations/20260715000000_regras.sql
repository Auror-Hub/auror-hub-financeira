-- Fase 4: Motor de regras — ENT-RULE
-- Capability nova e paralela ao pré-filtro hardcoded do BE-3 (alias de
-- fornecedor + regex genérica em código) — a arquitetura é explícita que
-- Fase 4 não substitui BE-3. Conteúdo é imutável depois de criado (trigger
-- abaixo); só status e os contadores calculados podem mudar — RUL-6 exige
-- que só o Agente de Aprendizagem proponha mudança de regra geral, sempre
-- com aprovação humana (status 'proposta' até aprovar).
--
-- perfil_id denormalizado (mesmo motivo de eventos_auditoria): escopo_fornecedor_id
-- é nullable (regra pode ser global, sem fornecedor específico), então não
-- dá pra depender só desse join pra RLS.

create table public.regras (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  versao int not null default 1,
  prioridade int not null default 0,
  confianca numeric not null check (confianca >= 0 and confianca <= 1),
  origem text not null check (origem in ('manual', 'aprendida')),
  escopo_fornecedor_id uuid references public.fornecedores_padronizados (id),
  status text not null check (status in ('ativa', 'inativa', 'conflitante', 'proposta')),
  criado_em timestamptz not null default now(),
  ultima_utilizacao timestamptz,
  quantidade_acertos int not null default 0,
  quantidade_correcoes int not null default 0
);

comment on table public.regras is 'ENT-RULE — regra de classificação (condição→consequência definidas em regra_condicoes/regra_consequencias). Conteúdo imutável; só status/contadores mudam depois de criada.';
comment on column public.regras.versao is 'Fica em 1 nesta fase — não há edição de regra existente ainda (editar = desativar e criar nova). Campo já existe no dicionário para uma fase futura de versionamento por edição.';

create index on public.regras (perfil_id, status);

alter table public.regras enable row level security;

create policy "regras: ver regras do próprio perfil"
  on public.regras for select
  using (perfil_id in (select id from public.perfis where usuario_id = auth.uid()));

create policy "regras: criar regra no próprio perfil"
  on public.regras for insert
  with check (perfil_id in (select id from public.perfis where usuario_id = auth.uid()));

create policy "regras: atualizar status/contadores no próprio perfil"
  on public.regras for update
  using (perfil_id in (select id from public.perfis where usuario_id = auth.uid()))
  with check (perfil_id in (select id from public.perfis where usuario_id = auth.uid()));

-- Defesa em profundidade: RLS é por linha, não por coluna — sem este
-- trigger, a policy de update acima permitiria editar qualquer coluna
-- (mesma brecha encontrada e corrigida na Fase 7 para insights/relatorio_versoes).
create function public.bloquear_alteracao_conteudo_regra()
returns trigger
language plpgsql
as $$
begin
  if new.perfil_id is distinct from old.perfil_id
    or new.versao is distinct from old.versao
    or new.prioridade is distinct from old.prioridade
    or new.confianca is distinct from old.confianca
    or new.origem is distinct from old.origem
    or new.escopo_fornecedor_id is distinct from old.escopo_fornecedor_id
    or new.criado_em is distinct from old.criado_em
  then
    raise exception 'regras: só status/ultima_utilizacao/quantidade_acertos/quantidade_correcoes podem mudar após a criação (RUL-6) — condição/consequência são imutáveis.';
  end if;
  return new;
end;
$$;

create trigger regras_conteudo_imutavel
  before update on public.regras
  for each row execute function public.bloquear_alteracao_conteudo_regra();
