-- BE-3: Inteligência (estrutura) — taxonomia seed (ENT-TAXONOMY-TERM)
-- Ver docs/product/TAXONOMIA-INICIAL.md (fonte de verdade do vocabulário) e
-- docs/decisions/ADR-003-CONTEXTO-FAMILIAR-E-TAXONOMIA.md (consolidação de
-- 6 para 3 dimensões controladas + contexto como texto livre).
--
-- Três dimensões: categoria, subcategoria (vinculada por termo_pai_id),
-- objetivo. Contexto NUNCA é seed aqui — é texto livre por lançamento.

create table public.taxonomia_termos (
  id uuid primary key default gen_random_uuid(),
  dimensao text not null check (dimensao in ('categoria', 'subcategoria', 'objetivo')),
  termo_pai_id uuid references public.taxonomia_termos (id) on delete restrict,
  rotulo text not null,
  status text not null default 'ativo' check (status in ('ativo', 'desativado', 'proposto')),
  origem text not null default 'padrão do sistema' check (origem in ('padrão do sistema', 'criado pelo usuário', 'sugerido pela IA')),
  criado_em timestamptz not null default now()
);

comment on table public.taxonomia_termos is 'ENT-TAXONOMY-TERM — vocabulário controlado (TAXONOMIA-INICIAL.md). Termos têm identificador estável; rótulo pode mudar sem quebrar decisões históricas (regra de integridade §6). Nenhuma dimensão aceita string livre.';
comment on column public.taxonomia_termos.termo_pai_id is 'Só preenchido para dimensao=subcategoria, apontando para a categoria pai.';

-- Vocabulário é compartilhado (não há multiusuário real no MVP — ADR-003) —
-- leitura liberada a qualquer usuário autenticado; escrita só via migration
-- nesta fase (tela de gestão de taxonomia fica para fase futura).
alter table public.taxonomia_termos enable row level security;

create policy "taxonomia_termos: leitura para qualquer usuário autenticado"
  on public.taxonomia_termos for select
  using (auth.uid() is not null);

-- Categorias (18, incluindo "Operações financeiras" — TAXONOMIA-INICIAL.md
-- §2 nota: operações financeiras podem ser excluídas dos totais de consumo,
-- mas ainda precisam de uma categoria própria para serem identificadas).
with categorias as (
  insert into public.taxonomia_termos (dimensao, rotulo)
  values
    ('categoria', 'Alimentação'),
    ('categoria', 'Moradia'),
    ('categoria', 'Transporte'),
    ('categoria', 'Saúde'),
    ('categoria', 'Educação'),
    ('categoria', 'Cuidados pessoais'),
    ('categoria', 'Lazer e cultura'),
    ('categoria', 'Assinaturas e serviços digitais'),
    ('categoria', 'Comunicação'),
    ('categoria', 'Trabalho e atividade profissional'),
    ('categoria', 'Viagens'),
    ('categoria', 'Presentes e contribuições'),
    ('categoria', 'Serviços pessoais'),
    ('categoria', 'Finanças e encargos'),
    ('categoria', 'Impostos e obrigações'),
    ('categoria', 'Pets'),
    ('categoria', 'Compras diversas'),
    ('categoria', 'Operações financeiras')
  returning id, rotulo
),
objetivos as (
  insert into public.taxonomia_termos (dimensao, rotulo)
  values
    ('objetivo', 'Victoria'),
    ('objetivo', 'Paulo'),
    ('objetivo', 'Malu'),
    ('objetivo', 'Casa'),
    ('objetivo', 'Família'),
    ('objetivo', 'AURÓR'),
    ('objetivo', 'Trabalho do Paulo'),
    ('objetivo', 'Cliente'),
    ('objetivo', 'Reembolsável'),
    ('objetivo', 'Presente'),
    ('objetivo', 'Terceiros'),
    ('objetivo', 'Compartilhado'),
    ('objetivo', 'Não identificado')
  returning id
),
subcategorias_raw (categoria_rotulo, rotulo) as (
  values
    ('Alimentação', 'Supermercado'), ('Alimentação', 'Hortifruti'), ('Alimentação', 'Padaria'),
    ('Alimentação', 'Açougue'), ('Alimentação', 'Restaurante'), ('Alimentação', 'Delivery'),
    ('Alimentação', 'Café e lanches'), ('Alimentação', 'Bebidas'), ('Alimentação', 'Alimentação em viagem'),
    ('Alimentação', 'Alimentação no trabalho'), ('Alimentação', 'Outros de alimentação'),

    ('Moradia', 'Aluguel ou financiamento'), ('Moradia', 'Condomínio'), ('Moradia', 'Energia elétrica'),
    ('Moradia', 'Água e esgoto'), ('Moradia', 'Gás'), ('Moradia', 'Internet residencial'),
    ('Moradia', 'Telefonia residencial'), ('Moradia', 'Manutenção e reparos'), ('Moradia', 'Limpeza'),
    ('Moradia', 'Móveis'), ('Moradia', 'Eletrodomésticos'), ('Moradia', 'Utensílios domésticos'),
    ('Moradia', 'Decoração'), ('Moradia', 'Segurança'), ('Moradia', 'Serviços domésticos'),
    ('Moradia', 'Outros de moradia'),

    ('Transporte', 'Aplicativos de transporte'), ('Transporte', 'Combustível'), ('Transporte', 'Estacionamento'),
    ('Transporte', 'Pedágio'), ('Transporte', 'Transporte público'), ('Transporte', 'Táxi'),
    ('Transporte', 'Manutenção do veículo'), ('Transporte', 'Seguro do veículo'), ('Transporte', 'Documentação e licenciamento'),
    ('Transporte', 'Multas'), ('Transporte', 'Aluguel de veículo'), ('Transporte', 'Passagens rodoviárias'),
    ('Transporte', 'Outros de transporte'),

    ('Saúde', 'Consultas'), ('Saúde', 'Exames'), ('Saúde', 'Medicamentos'),
    ('Saúde', 'Odontologia'), ('Saúde', 'Psicologia e terapia'), ('Saúde', 'Fisioterapia'),
    ('Saúde', 'Plano de saúde'), ('Saúde', 'Seguro-saúde'), ('Saúde', 'Hospital e pronto atendimento'),
    ('Saúde', 'Procedimentos'), ('Saúde', 'Óculos e lentes'), ('Saúde', 'Equipamentos de saúde'),
    ('Saúde', 'Cuidados preventivos'), ('Saúde', 'Outros de saúde'),

    ('Educação', 'Escola ou faculdade'), ('Educação', 'Cursos'), ('Educação', 'Livros'),
    ('Educação', 'Material escolar'), ('Educação', 'Plataformas de ensino'), ('Educação', 'Aulas particulares'),
    ('Educação', 'Eventos e congressos'), ('Educação', 'Certificações'), ('Educação', 'Outros de educação'),

    ('Cuidados pessoais', 'Cabeleireiro'), ('Cuidados pessoais', 'Manicure e estética'), ('Cuidados pessoais', 'Cosméticos'),
    ('Cuidados pessoais', 'Higiene pessoal'), ('Cuidados pessoais', 'Roupas'), ('Cuidados pessoais', 'Calçados'),
    ('Cuidados pessoais', 'Acessórios'), ('Cuidados pessoais', 'Academia'), ('Cuidados pessoais', 'Atividades físicas'),
    ('Cuidados pessoais', 'Outros cuidados pessoais'),

    ('Lazer e cultura', 'Cinema'), ('Lazer e cultura', 'Teatro'), ('Lazer e cultura', 'Shows'),
    ('Lazer e cultura', 'Eventos'), ('Lazer e cultura', 'Livros e revistas'), ('Lazer e cultura', 'Jogos'),
    ('Lazer e cultura', 'Hobbies'), ('Lazer e cultura', 'Passeios'), ('Lazer e cultura', 'Restaurantes por lazer'),
    ('Lazer e cultura', 'Bares'), ('Lazer e cultura', 'Outros de lazer'),

    ('Assinaturas e serviços digitais', 'Streaming de vídeo'), ('Assinaturas e serviços digitais', 'Streaming de música'),
    ('Assinaturas e serviços digitais', 'Software'), ('Assinaturas e serviços digitais', 'Aplicativos'),
    ('Assinaturas e serviços digitais', 'Armazenamento em nuvem'), ('Assinaturas e serviços digitais', 'Inteligência artificial'),
    ('Assinaturas e serviços digitais', 'Notícias e conteúdo'), ('Assinaturas e serviços digitais', 'Clubes e programas'),
    ('Assinaturas e serviços digitais', 'Outros serviços digitais'),

    ('Comunicação', 'Telefonia móvel'), ('Comunicação', 'Internet móvel'), ('Comunicação', 'Pacotes de dados'),
    ('Comunicação', 'Correios e entregas'), ('Comunicação', 'Outros de comunicação'),

    ('Trabalho e atividade profissional', 'Software profissional'), ('Trabalho e atividade profissional', 'Ferramentas de trabalho'),
    ('Trabalho e atividade profissional', 'Serviços profissionais'), ('Trabalho e atividade profissional', 'Equipamentos'),
    ('Trabalho e atividade profissional', 'Material de escritório'), ('Trabalho e atividade profissional', 'Coworking'),
    ('Trabalho e atividade profissional', 'Reuniões'), ('Trabalho e atividade profissional', 'Alimentação profissional'),
    ('Trabalho e atividade profissional', 'Transporte profissional'), ('Trabalho e atividade profissional', 'Eventos profissionais'),
    ('Trabalho e atividade profissional', 'Marketing e comunicação'), ('Trabalho e atividade profissional', 'Hospedagem e domínio'),
    ('Trabalho e atividade profissional', 'Outros de trabalho'),

    ('Viagens', 'Passagens aéreas'), ('Viagens', 'Hospedagem'), ('Viagens', 'Alimentação em viagem'),
    ('Viagens', 'Transporte em viagem'), ('Viagens', 'Passeios e atrações'), ('Viagens', 'Seguro-viagem'),
    ('Viagens', 'Taxas de viagem'), ('Viagens', 'Compras em viagem'), ('Viagens', 'Outros de viagem'),

    ('Presentes e contribuições', 'Presentes'), ('Presentes e contribuições', 'Doações'), ('Presentes e contribuições', 'Contribuições'),
    ('Presentes e contribuições', 'Ajuda financeira'), ('Presentes e contribuições', 'Datas comemorativas'),
    ('Presentes e contribuições', 'Outros presentes e contribuições'),

    ('Serviços pessoais', 'Advocacia'), ('Serviços pessoais', 'Contabilidade pessoal'), ('Serviços pessoais', 'Consultoria'),
    ('Serviços pessoais', 'Despachante'), ('Serviços pessoais', 'Serviços administrativos'), ('Serviços pessoais', 'Outros serviços pessoais'),

    ('Finanças e encargos', 'Juros'), ('Finanças e encargos', 'Multas'), ('Finanças e encargos', 'Tarifas bancárias'),
    ('Finanças e encargos', 'Anuidade de cartão'), ('Finanças e encargos', 'IOF'), ('Finanças e encargos', 'Câmbio'),
    ('Finanças e encargos', 'Seguro financeiro'), ('Finanças e encargos', 'Parcelamento de fatura'),
    ('Finanças e encargos', 'Outros encargos financeiros'),

    ('Impostos e obrigações', 'Impostos'), ('Impostos e obrigações', 'Taxas públicas'), ('Impostos e obrigações', 'Documentação'),
    ('Impostos e obrigações', 'Cartório'), ('Impostos e obrigações', 'Contribuições obrigatórias'),
    ('Impostos e obrigações', 'Outros impostos e obrigações'),

    ('Pets', 'Alimentação'), ('Pets', 'Veterinário'), ('Pets', 'Medicamentos'),
    ('Pets', 'Higiene'), ('Pets', 'Acessórios'), ('Pets', 'Hospedagem'),
    ('Pets', 'Passeios e serviços'), ('Pets', 'Outros de pets'),

    ('Compras diversas', 'Marketplace'), ('Compras diversas', 'Loja de departamentos'), ('Compras diversas', 'Eletrônicos'),
    ('Compras diversas', 'Utilidades'), ('Compras diversas', 'Compras não identificadas'), ('Compras diversas', 'Outros'),

    ('Operações financeiras', 'Pagamento de fatura'), ('Operações financeiras', 'Transferência entre contas próprias'),
    ('Operações financeiras', 'Estorno'), ('Operações financeiras', 'Reembolso recebido'), ('Operações financeiras', 'Crédito'),
    ('Operações financeiras', 'Ajuste'), ('Operações financeiras', 'Saque'), ('Operações financeiras', 'Operação não identificada')
)
insert into public.taxonomia_termos (dimensao, termo_pai_id, rotulo)
select 'subcategoria', categorias.id, subcategorias_raw.rotulo
from subcategorias_raw
join categorias on categorias.rotulo = subcategorias_raw.categoria_rotulo;
