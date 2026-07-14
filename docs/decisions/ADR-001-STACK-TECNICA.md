# ADR-001 — Stack Técnica Inicial

**Status:** Aceita
**Data:** 2026-07-13
**Decisores:** Victoria Gama (com apoio de Claude Code)

## Contexto

O repositório AURÓR · Hub Financeira parte do zero — sem aplicação, sem dependências instaladas. As fontes de verdade do produto são:

- [`docs/architecture/AURÓR - Arquitetura Completa V1.md`](../architecture/AURÓR%20-%20Arquitetura%20Completa%20V1.md) ("Arquitetura Completa")
- [`docs/product/AUROR-HUB-FINANCEIRA-BLUEPRINT-V01.md`](../product/AUROR-HUB-FINANCEIRA-BLUEPRINT-V01.md) — este arquivo se autointitula "Blueprint de Produto e Arquitetura — V0.1" e é citado pela Arquitetura Completa como sua fonte conceitual. Estava originalmente em `docs/architecture/` com o nome `AURÓR · Hub Financeira.md`; foi movido e renomeado para este caminho por decisão de Victoria (sessão de fundação do repositório).

Nenhum dos dois documentos-fonte prescreve uma stack técnica. Pelo contrário: ambos marcam explicitamente a escolha de stack como `[DECISÃO NECESSÁRIA]` (Arquitetura Completa, seção "Estratégia de implementação"/Fase 0). O que os documentos exigem são **propriedades estruturais**, não tecnologias específicas. Este ADR existe para tornar essa escolha explícita antes de qualquer scaffold.

## Problema

Escolher uma stack capaz de sustentar, desde a Fase 0, um modelo de dados com:

- imutabilidade estrita de fato bruto (`ENT-RAW-TRANSACTION` nunca é editado — RUL-1);
- versionamento de decisões e fechamentos (`ENT-CLASSIFICATION-DECISION`, `ENT-COMPETENCY-CLOSURE`, `ENT-REPORT-VERSION` — nunca sobrescritos, D2/D8/D9);
- auditoria append-only reforçada estruturalmente, não por convenção (`ENT-AUDIT-EVENT` — RUL-10: "não existe update nem delete nessa tabela em nenhuma circunstância, inclusive administrativa");
- schema multi-perfil desde a Fase 0 (`ENT-USER`/`ENT-PROFILE` separados) mesmo com MVP single-tenant;
- armazenamento privado do documento de origem — CSV, formato principal do MVP por [ADR-002](ADR-002-FORMATO-IMPORTACAO-CSV.md); PDF permanece adiado (documento de origem, nunca interface — D-blueprint #1);
- integridade referencial pesada entre dezenas de entidades relacionadas (lançamento → proposta → decisão → regra → insight → relatório);
- migrations versionadas e reproduzíveis (critério de aceite explícito de PKG-001: "migrations rodam do zero sem erro");
- geração de relatório HTML versionado e imutável por competência;
- testes automatizados validando invariantes (ex.: tentativa de editar lançamento bruto deve falhar por design).

## Requisitos (derivados da arquitetura, não da stack)

| Requisito | Fonte |
|---|---|
| Banco relacional com integridade referencial forte | D10, Arquitetura Completa seção "Estratégia de implementação" ("Postgres é a escolha natural") |
| Migrations versionadas | Fase 0 / EPC-FOUND-002 |
| Autenticação (single-user no MVP, schema multi-perfil) | Premissa 1, `ENT-USER`/`ENT-PROFILE` |
| Armazenamento privado de documentos de origem (CSV/PDF), acesso controlado | Blueprint seção 4.3/5.1, Fase 9 EPC-OPS-003; formato principal definido em [ADR-002](ADR-002-FORMATO-IMPORTACAO-CSV.md) |
| Controle de acesso por linha (privilégio mínimo) | Fase 9 (checklist de segurança, sem mecanismo nomeado) |
| Aplicação web única (não microsserviços) | Premissa 6, princípio arquitetural #16 |
| Processamento de importação (síncrono para CSV no MVP; assíncrono pode ser necessário quando PDF for retomado) | SCR-IMPORT-STATUS-001, fluxo de lote; formato principal em [ADR-002](ADR-002-FORMATO-IMPORTACAO-CSV.md) |
| Auditoria append-only garantida estruturalmente | RUL-10 |
| Proteção de dados financeiros em repouso e trânsito | Seção de segurança do produto |
| Desenvolvimento local simples (uma única desenvolvedora) | Contexto do projeto |
| Testes unitários e de integração | Critérios de aceite de todo PKG |
| Separação clara cliente/servidor | Nenhuma exigência explícita, mas decorre de D10 + auth + storage privado |
| Geração de relatório HTML versionado | Blueprint 4.9, D9 |
| Evolução futura sem reescrita imediata (família, autônomo, empresa) | Seção "Evolução futura" do blueprint |

## Decisão

Adotar, para a Fase 0 (PKG-001 em diante):

- **Next.js** (App Router) como aplicação web full-stack única — atende "não microsserviços" e "separação cliente/servidor" com um único deploy.
- **TypeScript** em todo o código — reduz erro estrutural num domínio onde `[DECISÃO NECESSÁRIA]` já é abundante; tipos nas entidades ajudam a impedir que classificação vaze para o lançamento bruto por engano.
- **PostgreSQL via Supabase** como banco relacional — Postgres é literalmente a tecnologia que a própria Arquitetura Completa chama de "escolha natural"; usar via Supabase soma auth, storage e RLS sem operar infraestrutura própria.
- **Supabase Auth** — cobre autenticação single-user hoje, com caminho de crescimento para multiusuário (`ENT-USER`/`ENT-PROFILE`) sem reescrita.
- **Supabase Storage** (bucket privado) para os documentos de origem (CSV no MVP, conforme [ADR-002](ADR-002-FORMATO-IMPORTACAO-CSV.md); PDF quando implementado) — documento de origem nunca é interface, precisa apenas de guarda segura e URL assinada.
- **Row Level Security (RLS) do Postgres/Supabase** como mecanismo de controle de acesso por linha, cumprindo o requisito de "privilégio mínimo" da Fase 9 sem precisar inventar uma camada própria de autorização.
- **Tailwind CSS** como infraestrutura de estilos, alimentada pelos tokens definidos em [`HUB-FINANCEIRA-DESIGN-ADAPTATION.md`](../design/HUB-FINANCEIRA-DESIGN-ADAPTATION.md) — não pelo CSS de referência copiado diretamente.
- **Componentes próprios**, não o Design System original (ver ADR de design/adaptação visual — não é uma decisão desta ADR, mas decorre dela).
- **GitHub** para versionamento — já em uso.
- **Testes unitários e de integração** com o runner nativo do ecossistema Next.js/TypeScript (a ser confirmado em PKG-001 — Vitest é a recomendação default, sem compromisso definitivo aqui).

## Justificativa

- Postgres via Supabase resolve simultaneamente banco relacional, auth, storage privado e RLS com uma única peça de infraestrutura operável por uma pessoa só — reduz superfície operacional sem violar nenhum requisito.
- Imutabilidade e append-only (RUL-1, RUL-10) são impostas mais robustamente no nível do banco (grants/políticas RLS/triggers) do que só por convenção de aplicação — Postgres permite isso diretamente; um "banco" mais simples (SQLite, NoSQL) tornaria essa garantia apenas uma convenção de código, contrariando "validado estruturalmente, não deixado como convenção de uso" (arquitetura completa, seção de auditoria).
- Next.js + TypeScript é a combinação que menos força decisões arquiteturais adicionais para atingir "aplicação web única, sem microsserviços" com renderização de relatório HTML e futuras rotas server-side (importação assíncrona).
- Nenhuma dessas escolhas é imposta por Madan/Ecossistema/Design System de referência — a stack é decidida aqui, isoladamente, a partir dos requisitos do produto novo.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Banco local em arquivo (SQLite) ou dados em memória | Blueprint exige persistência real desde a Fase 1 (D10); SQLite não oferece RLS nem storage integrado, exigiria construir controle de acesso à mão |
| NoSQL (Firestore, MongoDB) | Modelo de dados é fortemente relacional (dezenas de entidades com integridade referencial); NoSQL tornaria versionamento/auditoria mais frágil |
| Backend próprio (Node/Express + Postgres gerenciado à parte) + frontend separado (Vite/React) | Duas peças de infraestrutura para operar sozinha, sem ganho claro sobre Next.js full-stack; contraria "sem microsserviços" em espírito |
| Auth/storage/DB de provedores distintos (ex. Auth0 + S3 + RDS) | Mais peças móveis para uma única desenvolvedora sustentar; Supabase cobre as três com uma conta e uma política de acesso coerente |
| CSS-in-JS ou biblioteca de componentes de terceiros (MUI, Chakra) | Contraria a instrução explícita de criar componentes próprios adaptados do design de referência; Tailwind é infraestrutura, não biblioteca de componentes prontos |

## Consequências positivas

- Uma única plataforma (Supabase) cobre banco, auth, storage e RLS — menor custo operacional para desenvolvedora única.
- RLS torna "privilégio mínimo" uma propriedade do banco, não uma promessa da aplicação.
- TypeScript de ponta a ponta reduz risco de um dos erros mais caros deste domínio: classificação vazando para o lançamento bruto, ou campo obrigatório (justificativa/confiança) ficando implicitamente opcional.
- Next.js permite gerar relatório HTML server-side e, no futuro, processar importação de forma assíncrona sem trocar de framework.

## Consequências negativas / limitações

- Dependência de um fornecedor único (Supabase) para banco, auth e storage — risco de vendor lock-in, mitigável no futuro por Supabase ser Postgres padrão (portável) por baixo.
- RLS exige disciplina de escrita de políticas desde o schema inicial — se mal escritas, dão falsa sensação de segurança; deve ser testado, não presumido.
- Next.js App Router ainda tem áreas em evolução (cache, server actions) — exige atenção a breaking changes entre versões.
- Nenhuma decisão aqui resolve extração de PDF, técnica de classificação, ou processamento assíncrono real — esses seguem `[DECISÃO NECESSÁRIA]` na arquitetura e não são escopo deste ADR.

## Riscos

- Parsing de CSV (formato principal da Fase 1, ver ADR-002) é leve o suficiente para processamento síncrono em API routes do Next.js. Se/quando a extração de PDF for retomada como formato complementar, pode exigir processamento mais pesado ou de longa duração, potencialmente fila/worker externo — não necessário para PKG-001 nem para o MVP baseado em CSV.
- Custo do Supabase em escala real (famílias/empresas, fases futuras) não foi avaliado — aceitável para MVP de usuária única.

## Itens a revisar futuramente

- Runner de testes definitivo (Vitest vs. Jest) — confirmar em PKG-001.
- Estratégia de processamento assíncrono, caso e quando a importação de PDF for retomada como formato complementar (fila própria vs. Supabase Edge Functions) — não necessária para o MVP baseado em CSV (ADR-002).
- Técnica de classificação (regras determinísticas vs. LLM vs. híbrido) — decisão de produto/IA, fora do escopo de stack.
- Mecanismo exato de enforcement de append-only em `ENT-AUDIT-EVENT` e `ENT-RAW-TRANSACTION` (REVOKE de UPDATE/DELETE vs. triggers vs. RLS policies) — deve ser especificado e testado em PKG-001/PKG-002, não apenas assumido pela escolha de Postgres.

## Status da decisão

Aceita para Fase 0 (PKG-001). Não é definitiva para fases futuras de processamento assíncrono ou multiempresa — revisão explícita prevista quando essas fases forem especificadas.
