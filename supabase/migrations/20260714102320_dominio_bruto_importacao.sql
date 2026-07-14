-- BE-2: Domínio bruto — importação de CSV (ADR-002)
-- ENT-SOURCE-DOCUMENT, ENT-IMPORT-BATCH, ENT-IMPORT-EVENT, ENT-RAW-TRANSACTION,
-- ENT-POSSIBLE-DUPLICATE, ENT-IMPORT-PROFILE (conceito novo do ADR-002).
-- Ver docs/decisions/ADR-002-FORMATO-IMPORTACAO-CSV.md e docs/CONSTRUCTION-PLAN.md (BE-2).
--
-- Nota de schema: `lancamentos_brutos.competencia_calculada` é texto (AAAA-MM),
-- não FK — a tabela `competencias` real só é criada em BE-5. Competência é
-- calculada como o mês da data do lançamento (premissa #3 da Arquitetura
-- Completa: "competência é definida pelo mês de ocorrência do gasto, não pelo
-- vencimento da fatura"). O corte exato por fatura (`cartoes.regra_de_corte_competencia`)
-- fica para refinamento futuro — hoje o campo existe mas não é usado.

-- ENT-SOURCE-DOCUMENT
create table public.documentos_origem (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  cartao_id uuid not null references public.cartoes (id) on delete restrict,
  nome_arquivo text not null,
  hash text not null,
  periodo jsonb,
  vencimento date,
  total_declarado bigint,
  data_envio timestamptz not null default now(),
  status_processamento text not null default 'recebido'
    check (status_processamento in ('recebido', 'reconhecendo', 'extraindo', 'conciliando', 'concluido', 'divergencia', 'falhou')),
  storage_path text not null,
  versao_importador text not null default 'csv-v0',
  unique (perfil_id, hash)
);

comment on table public.documentos_origem is 'ENT-SOURCE-DOCUMENT — o CSV é documento de origem, nunca interface (D-blueprint #1). Arquivo original fica no Storage privado (storage_path).';

-- ENT-IMPORT-BATCH
create table public.lotes_importacao (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.documentos_origem (id) on delete cascade,
  iniciado_em timestamptz not null default now(),
  concluido_em timestamptz,
  status text not null default 'reconhecendo'
    check (status in ('reconhecendo', 'extraindo', 'conciliando', 'concluido', 'falhou')),
  quantidade_extraida int not null default 0,
  total_extraido bigint not null default 0,
  divergencia bigint not null default 0,
  versao_processo text not null default 'csv-v0'
);

comment on table public.lotes_importacao is 'ENT-IMPORT-BATCH — uma execução de importação de um documento_origem.';

-- ENT-IMPORT-EVENT (append-only)
create table public.eventos_importacao (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.lotes_importacao (id) on delete cascade,
  tipo text not null check (tipo in ('reconhecimento', 'extracao', 'divergencia', 'duplicidade', 'linha_invalida', 'erro')),
  detalhe text,
  criado_em timestamptz not null default now()
);

comment on table public.eventos_importacao is 'ENT-IMPORT-EVENT — log append-only do lote. Nenhuma linha inválida é descartada silenciosamente (regra do ADR-002): toda rejeição vira um evento aqui.';

-- ENT-RAW-TRANSACTION (imutável — RUL-1)
create table public.lancamentos_brutos (
  id uuid primary key default gen_random_uuid(),
  lote_importacao_id uuid not null references public.lotes_importacao (id) on delete restrict,
  cartao_id uuid not null references public.cartoes (id) on delete restrict,
  competencia_calculada text not null,
  data date not null,
  vencimento date,
  fornecedor_original text not null,
  descricao_original text not null,
  valor bigint not null,
  parcela_atual int,
  total_parcelas int,
  moeda text not null default 'BRL',
  arquivo_origem_id uuid not null references public.documentos_origem (id) on delete restrict,
  pagina_ou_posicao text,
  identificador_deduplicacao text not null,
  criado_em timestamptz not null default now()
);

comment on table public.lancamentos_brutos is 'ENT-RAW-TRANSACTION — fato imutável (RUL-1). Nunca recebe categoria diretamente. Trigger abaixo bloqueia UPDATE/DELETE mesmo para o dono da linha.';

create index on public.lancamentos_brutos (cartao_id);
create index on public.lancamentos_brutos (competencia_calculada);
create index on public.lancamentos_brutos (identificador_deduplicacao);

-- ENT-POSSIBLE-DUPLICATE
create table public.possiveis_duplicatas (
  id uuid primary key default gen_random_uuid(),
  lancamento_a_id uuid not null references public.lancamentos_brutos (id) on delete cascade,
  lancamento_b_id uuid not null references public.lancamentos_brutos (id) on delete cascade,
  motivo text not null,
  status text not null default 'pendente' check (status in ('pendente', 'confirmado_duplicado', 'confirmado_distinto')),
  criado_em timestamptz not null default now()
);

comment on table public.possiveis_duplicatas is 'ENT-POSSIBLE-DUPLICATE — detecção de duplicidade nunca decide sozinha; status inicia pendente para revisão humana.';

-- ENT-IMPORT-PROFILE (conceito novo, ver ADR-002)
create table public.perfis_importacao (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  cartao_id uuid not null references public.cartoes (id) on delete cascade,
  instituicao text not null,
  versao_formato text,
  delimitador text not null default ',',
  codificacao text not null default 'utf-8',
  formato_data text not null default 'DD/MM/YYYY',
  formato_monetario text not null default 'BR',
  coluna_data text not null,
  coluna_descricao text not null,
  coluna_valor text not null,
  coluna_parcela text,
  coluna_moeda text,
  transformacoes jsonb,
  ultima_utilizacao timestamptz,
  criado_em timestamptz not null default now(),
  unique (cartao_id)
);

comment on table public.perfis_importacao is 'ENT-IMPORT-PROFILE (ADR-002) — mapeamento de colunas reutilizável por cartão. Um perfil por cartão nesta fase (MVP simples); pode evoluir para N perfis por instituição futuramente.';

-- RLS: privilégio mínimo, tudo escopado por perfil do usuário autenticado.
alter table public.documentos_origem enable row level security;
alter table public.lotes_importacao enable row level security;
alter table public.eventos_importacao enable row level security;
alter table public.lancamentos_brutos enable row level security;
alter table public.possiveis_duplicatas enable row level security;
alter table public.perfis_importacao enable row level security;

create policy "documentos_origem: acesso ao próprio perfil"
  on public.documentos_origem for all
  using (perfil_id in (select id from public.perfis where usuario_id = auth.uid()))
  with check (perfil_id in (select id from public.perfis where usuario_id = auth.uid()));

create policy "lotes_importacao: acesso via documento do próprio perfil"
  on public.lotes_importacao for all
  using (documento_id in (
    select d.id from public.documentos_origem d
    join public.perfis p on p.id = d.perfil_id
    where p.usuario_id = auth.uid()
  ))
  with check (documento_id in (
    select d.id from public.documentos_origem d
    join public.perfis p on p.id = d.perfil_id
    where p.usuario_id = auth.uid()
  ));

-- eventos_importacao: SELECT/INSERT apenas — sem policy de UPDATE/DELETE (append-only, RUL-5/RUL-10).
create policy "eventos_importacao: ver eventos do próprio perfil"
  on public.eventos_importacao for select
  using (lote_id in (
    select l.id from public.lotes_importacao l
    join public.documentos_origem d on d.id = l.documento_id
    join public.perfis p on p.id = d.perfil_id
    where p.usuario_id = auth.uid()
  ));

create policy "eventos_importacao: registrar evento no próprio perfil"
  on public.eventos_importacao for insert
  with check (lote_id in (
    select l.id from public.lotes_importacao l
    join public.documentos_origem d on d.id = l.documento_id
    join public.perfis p on p.id = d.perfil_id
    where p.usuario_id = auth.uid()
  ));

-- lancamentos_brutos: SELECT/INSERT apenas — sem policy de UPDATE/DELETE (imutável, RUL-1).
create policy "lancamentos_brutos: ver lançamentos do próprio perfil"
  on public.lancamentos_brutos for select
  using (cartao_id in (
    select c.id from public.cartoes c
    join public.perfis p on p.id = c.perfil_id
    where p.usuario_id = auth.uid()
  ));

create policy "lancamentos_brutos: inserir lançamentos no próprio perfil"
  on public.lancamentos_brutos for insert
  with check (cartao_id in (
    select c.id from public.cartoes c
    join public.perfis p on p.id = c.perfil_id
    where p.usuario_id = auth.uid()
  ));

-- Defesa em profundidade: bloqueia UPDATE/DELETE mesmo com service_role
-- acidental ou política futura mal escrita (RUL-1 garantido no nível do banco).
create function public.bloquear_alteracao_lancamento_bruto()
returns trigger
language plpgsql
as $$
begin
  raise exception 'lancamentos_brutos é imutável (RUL-1) — nenhuma linha pode ser alterada ou removida.';
end;
$$;

create trigger lancamentos_brutos_imutavel
  before update or delete on public.lancamentos_brutos
  for each row execute function public.bloquear_alteracao_lancamento_bruto();

create policy "possiveis_duplicatas: acesso via lançamento do próprio perfil"
  on public.possiveis_duplicatas for all
  using (lancamento_a_id in (
    select l.id from public.lancamentos_brutos l
    join public.cartoes c on c.id = l.cartao_id
    join public.perfis p on p.id = c.perfil_id
    where p.usuario_id = auth.uid()
  ))
  with check (lancamento_a_id in (
    select l.id from public.lancamentos_brutos l
    join public.cartoes c on c.id = l.cartao_id
    join public.perfis p on p.id = c.perfil_id
    where p.usuario_id = auth.uid()
  ));

create policy "perfis_importacao: acesso ao próprio perfil"
  on public.perfis_importacao for all
  using (perfil_id in (select id from public.perfis where usuario_id = auth.uid()))
  with check (perfil_id in (select id from public.perfis where usuario_id = auth.uid()));

-- Storage: bucket privado para os CSVs de origem (documento de origem nunca
-- é interface — SECURITY-AND-DATA.md exige bucket privado + URL assinada).
insert into storage.buckets (id, name, public)
values ('documentos-origem', 'documentos-origem', false)
on conflict (id) do nothing;

-- Convenção de caminho: {auth.uid()}/{arquivo} — permite policy simples
-- baseada no primeiro segmento do caminho.
create policy "documentos-origem: upload no próprio caminho"
  on storage.objects for insert
  with check (
    bucket_id = 'documentos-origem'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documentos-origem: leitura do próprio caminho"
  on storage.objects for select
  using (
    bucket_id = 'documentos-origem'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
