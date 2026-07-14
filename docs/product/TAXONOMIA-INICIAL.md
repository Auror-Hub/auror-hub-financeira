# Taxonomia Inicial — Categorias, Subcategorias, Objetivos e Contexto

**Status:** aprovado por Victoria em 2026-07-13. Consolida a taxonomia inicial da Hub Financeira, conforme [ADR-003](../decisions/ADR-003-CONTEXTO-FAMILIAR-E-TAXONOMIA.md). Referenciado por `docs/ROADMAP.md` (Fase 2 — Inteligência) e a implementar como `ENT-TAXONOMY-TERM` seed em BE-3.

Este documento é a fonte de verdade para o vocabulário controlado da taxonomia — não o blueprint nem a arquitetura completa, que continuam descrevendo apenas exemplos genéricos e a estrutura conceitual original. Onde este documento e os originais divergem, este documento vale para a implementação (ver ADR-003).

## 1. Regra conceitual — quatro dimensões

A classificação da Hub mantém **quatro dimensões distintas**, que nunca se misturam:

| Dimensão | Representa |
|---|---|
| **Categoria** | O que foi comprado, ou a natureza material do gasto. |
| **Subcategoria** | O tipo específico de gasto dentro da categoria. |
| **Objetivo** | Para quem ou para qual finalidade o gasto foi realizado. |
| **Contexto** | Informação complementar, circunstancial ou explicativa — texto livre, nunca vocabulário controlado. |

Esta é uma consolidação de 6 dimensões (categoria/subcategoria/objetivo/natureza/essencialidade/tipo de ocorrência) para 4 — ver ADR-003 seção "Consolidação de dimensões" para a justificativa e o impacto no código já escrito.

### Exemplos de classificação completa

```
Fornecedor: Sabor Express
Categoria: Alimentação
Subcategoria: Delivery
Objetivo: Família
Contexto: jantar em casa
```

```
Fornecedor: Clínica Sorriso Claro
Categoria: Saúde
Subcategoria: Odontologia
Objetivo: Malu
Contexto: tratamento odontológico
```

```
Fornecedor: Uber
Categoria: Transporte
Subcategoria: Aplicativos de transporte
Objetivo: Trabalho do Paulo
Contexto: deslocamento para reunião profissional
```

## 2. Categorias e subcategorias iniciais

### Alimentação
Supermercado · Hortifruti · Padaria · Açougue · Restaurante · Delivery · Café e lanches · Bebidas · Alimentação em viagem · Alimentação no trabalho · Outros de alimentação

### Moradia
Aluguel ou financiamento · Condomínio · Energia elétrica · Água e esgoto · Gás · Internet residencial · Telefonia residencial · Manutenção e reparos · Limpeza · Móveis · Eletrodomésticos · Utensílios domésticos · Decoração · Segurança · Serviços domésticos · Outros de moradia

### Transporte
Aplicativos de transporte · Combustível · Estacionamento · Pedágio · Transporte público · Táxi · Manutenção do veículo · Seguro do veículo · Documentação e licenciamento · Multas · Aluguel de veículo · Passagens rodoviárias · Outros de transporte

### Saúde
Consultas · Exames · Medicamentos · Odontologia · Psicologia e terapia · Fisioterapia · Plano de saúde · Seguro-saúde · Hospital e pronto atendimento · Procedimentos · Óculos e lentes · Equipamentos de saúde · Cuidados preventivos · Outros de saúde

### Educação
Escola ou faculdade · Cursos · Livros · Material escolar · Plataformas de ensino · Aulas particulares · Eventos e congressos · Certificações · Outros de educação

### Cuidados pessoais
Cabeleireiro · Manicure e estética · Cosméticos · Higiene pessoal · Roupas · Calçados · Acessórios · Academia · Atividades físicas · Outros cuidados pessoais

### Lazer e cultura
Cinema · Teatro · Shows · Eventos · Livros e revistas · Jogos · Hobbies · Passeios · Restaurantes por lazer · Bares · Outros de lazer

### Assinaturas e serviços digitais
Streaming de vídeo · Streaming de música · Software · Aplicativos · Armazenamento em nuvem · Inteligência artificial · Notícias e conteúdo · Clubes e programas · Outros serviços digitais

### Comunicação
Telefonia móvel · Internet móvel · Pacotes de dados · Correios e entregas · Outros de comunicação

### Trabalho e atividade profissional
Software profissional · Ferramentas de trabalho · Serviços profissionais · Equipamentos · Material de escritório · Coworking · Reuniões · Alimentação profissional · Transporte profissional · Eventos profissionais · Marketing e comunicação · Hospedagem e domínio · Outros de trabalho

### Viagens
Passagens aéreas · Hospedagem · Alimentação em viagem · Transporte em viagem · Passeios e atrações · Seguro-viagem · Taxas de viagem · Compras em viagem · Outros de viagem

### Presentes e contribuições
Presentes · Doações · Contribuições · Ajuda financeira · Datas comemorativas · Outros presentes e contribuições

### Serviços pessoais
Advocacia · Contabilidade pessoal · Consultoria · Despachante · Serviços administrativos · Outros serviços pessoais

### Finanças e encargos
Juros · Multas · Tarifas bancárias · Anuidade de cartão · IOF · Câmbio · Seguro financeiro · Parcelamento de fatura · Outros encargos financeiros

### Impostos e obrigações
Impostos · Taxas públicas · Documentação · Cartório · Contribuições obrigatórias · Outros impostos e obrigações

### Pets
Alimentação · Veterinário · Medicamentos · Higiene · Acessórios · Hospedagem · Passeios e serviços · Outros de pets

### Compras diversas
Marketplace · Loja de departamentos · Eletrônicos · Utilidades · Compras não identificadas · Outros

**Usar com cautela:** fornecedores como Amazon e Mercado Livre não devem ser classificados automaticamente como "Compras diversas" de forma definitiva — a categoria real depende do item ou da finalidade. Este é o mesmo comportamento contextual já previsto para `ENT-STANDARD-MERCHANT.comportamento_contextual`.

### Operações financeiras
Pagamento de fatura · Transferência entre contas próprias · Estorno · Reembolso recebido · Crédito · Ajuste · Saque · Operação não identificada

**Regra de exclusão:** operações financeiras devem poder ser excluídas dos totais de consumo e das análises de despesas — não são gasto, são movimentação.

## 3. Objetivos iniciais

| Objetivo | Definição | Exemplos |
|---|---|---|
| **Victoria** | Gastos pessoais da Victoria. | Roupas, cuidados pessoais, saúde, alimentação individual, cursos pessoais, lazer pessoal, assinaturas pessoais. |
| **Paulo** | Gastos pessoais do Paulo. | Roupas, saúde, atividade física, alimentação individual, lazer pessoal, assinaturas pessoais. |
| **Malu** | Gastos diretamente destinados à Malu. | Escola, material escolar, saúde, roupas, alimentação, lazer, transporte, cursos, atividades, presentes. |
| **Casa** | Gastos relacionados ao funcionamento, manutenção ou melhoria da residência. | Condomínio, energia, água, internet residencial, móveis, eletrodomésticos, limpeza, manutenção, decoração, serviços domésticos. |
| **Família** | Gastos coletivos do núcleo familiar sem beneficiário individual predominante. | Supermercado, refeição em família, passeio familiar, viagem em família, entretenimento coletivo, compras de uso comum, serviços compartilhados. |
| **AURÓR** | Gastos relacionados à operação da AURÓR. | Softwares, ferramentas de IA, domínio, hospedagem, serviços profissionais, reuniões, marketing, materiais, despesas operacionais. |
| **Trabalho do Paulo** | Gastos relacionados à atividade profissional do Paulo. | Transporte profissional, alimentação em trabalho, software, ferramentas, reuniões, equipamentos, materiais, eventos, serviços profissionais. |
| **Cliente** | Gastos diretamente vinculados a um cliente ou projeto específico. O contexto deve registrar qual cliente ou projeto (ex.: `Contexto: Projeto Vivenda`). | — |
| **Reembolsável** | Gastos que deverão ser restituídos por empresa, cliente, empregador ou terceiro. O contexto deve registrar, quando possível: quem fará o reembolso, projeto, evento, motivo. | — |
| **Presente** | Gastos cuja finalidade principal foi presentear alguém. O contexto deve registrar, quando possível: pessoa presenteada, data, ocasião, motivo. | — |
| **Terceiros** | Gastos feitos para uma pessoa que não pertence ao núcleo familiar e ainda não possui objetivo próprio. | Compra para amigo, ajuda pontual, despesa paga temporariamente para outra pessoa. |
| **Compartilhado** | Gastos divididos com pessoas externas à Família Gama, ou cujo rateio ainda não foi definido. **Não substitui `Família`** (Família = coletivo interno; Compartilhado = divisão externa ou pendente). | Restaurante dividido com amigos, viagem compartilhada, compra conjunta, evento com divisão futura. |
| **Não identificado** | Objetivo temporário quando não há informação suficiente para determinar finalidade ou beneficiário. **Não é decisão final** — mantém o lançamento pendente de revisão. | — |

## 4. Contexto — exemplos

Campo de texto livre, complementar às outras três dimensões: "jantar em família", "reunião com cliente", "aniversário da May", "projeto Vivenda", "gasto a ser reembolsado".

## 5. Regras de interpretação

A Hub **não deve assumir automaticamente** que:

- o titular do cartão é o objetivo;
- quem fez a compra é quem se beneficiou;
- todo supermercado é Casa;
- todo supermercado é Família;
- todo restaurante é lazer;
- todo restaurante é Família;
- todo software é AURÓR;
- todo gasto em horário comercial é profissional;
- todo Uber é pessoal;
- todo gasto de saúde pertence à Victoria;
- todo fornecedor recorrente mantém sempre o mesmo objetivo.

O objetivo deve ser **inferido** a partir de: histórico do fornecedor; histórico de decisões; recorrência; contexto anterior; tipo de estabelecimento; descrição original; valor; data; horário (quando disponível); cartão como evidência secundária; padrões confirmados pela Família Gama.

Quando não houver evidência suficiente, usar **Não identificado** — nunca forçar uma classificação sem base.

## 6. Regras de integridade

- Categorias, subcategorias e objetivos possuem identificadores estáveis (não texto livre).
- Subcategorias vinculam-se à categoria por identificador (`termo_pai`, mesmo padrão de `ENT-TAXONOMY-TERM`).
- Categoria, subcategoria, objetivo e contexto são dimensões **independentes** — nunca misturadas em um único campo.
- Nenhum termo nasce como texto livre dentro do lançamento.
- Termos futuramente renomeados não podem quebrar decisões históricas (rótulo pode mudar, identificador não).
- Termos inativos permanecem visíveis no histórico (RUL-4 da arquitetura já cobre isso).
- **Casa** e **Família** são conceitos distintos (funcionamento da residência vs. coletivo familiar).
- **Victoria**, **Paulo** e **Malu** são objetivos individuais distintos.
- **AURÓR** e **Trabalho do Paulo** são objetivos profissionais distintos (dois "trabalhos" diferentes na mesma família).
- **Cliente** deve indicar vínculo específico com cliente ou projeto (via contexto).
- **Reembolsável** deve indicar restituição futura (via contexto).
- **Compartilhado** representa divisão externa ou rateio pendente — nunca substitui Família.
- **Não identificado** mantém pendência — nunca é tratado como decisão final.
- Operações financeiras não são consumo — devem poder ser excluídas de totais e análises.
- Fornecedores ambíguos (comportamento contextual) não recebem classificação definitiva sem contexto.
- O titular do cartão nunca define sozinho o objetivo.

## 7. Fora do escopo desta atualização

Não implementados nesta fase (permanecem fora do MVP, ver ADR-003): múltiplos usuários, permissões familiares, rateio entre pessoas, perfis separados por membro da família. A Hub opera com uma única sessão autenticada (Victoria, operadora) sobre um único acervo financeiro (Família Gama) — a distinção entre Victoria/Paulo/Malu/Casa/Família/etc. acontece inteiramente na dimensão **Objetivo**, não em contas ou perfis de usuário separados.
