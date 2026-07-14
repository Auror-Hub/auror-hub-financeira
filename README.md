# AURÓR · Hub Financeira

## O que é

Uma camada operacional inteligente construída sobre dados financeiros — transforma lançamentos de fatura de cartão de crédito em contexto, conhecimento, explicações, padrões, alertas, recomendações e decisões. A unidade de valor não é o lançamento importado; é a interpretação produzida a partir dele.

A AURÓR · Hub Financeira será inicialmente validada por Victoria Gama como operadora, utilizando as finanças conjuntas da **Família Gama** (Victoria, Paulo, Malu) — não as finanças pessoais individuais da Victoria. Ver [ADR-003](docs/decisions/ADR-003-CONTEXTO-FAMILIAR-E-TAXONOMIA.md).

## O que não é

- Não é uma planilha.
- Não é um dashboard financeiro genérico.
- Não é um controle financeiro tradicional.
- Não é um agregador de cartões.
- Não é um ERP.
- Não é um sistema contábil.
- Não é um aplicativo bancário.
- Não é apenas um classificador de despesas.

## Estágio atual

Etapa 1 (Frontend) em andamento — ver [`docs/CONSTRUCTION-PLAN.md`](docs/CONSTRUCTION-PLAN.md). Fase FE-1 (fundação de frontend: scaffold Next.js/Tailwind, tokens visuais, shell de layout, navegação, sessão simulada) concluída. Ainda sem backend real — todas as telas rodam contra dados mockados até a Etapa 2.

## Stack proposta

Next.js (TypeScript) · PostgreSQL via Supabase · Supabase Auth · Supabase Storage · Tailwind CSS · componentes próprios · testes unitários e de integração · GitHub.

Justificativa completa em [`docs/decisions/ADR-001-STACK-TECNICA.md`](docs/decisions/ADR-001-STACK-TECNICA.md).

## Arquitetura resumida

O sistema preserva uma separação estrita entre:

```
Dado bruto (imutável) → Inteligência sugerida (versionada) → Decisão humana (versionada)
    → Conhecimento consolidado → Análise → Narrativa → Experiência do usuário
```

Lançamentos brutos nunca são editados. Classificações vivem em camada separada. Toda decisão humana é versionada e auditável. Competências (períodos financeiros) fecham em snapshots imutáveis; reaberturas geram novas versões sem apagar as anteriores.

## Onde encontrar a documentação

| Assunto | Local |
|---|---|
| Blueprint de produto (V0.1) | [`docs/product/AUROR-HUB-FINANCEIRA-BLUEPRINT-V01.md`](docs/product/AUROR-HUB-FINANCEIRA-BLUEPRINT-V01.md) |
| Arquitetura completa (telas, jornadas, entidades, agentes) | [`docs/architecture/AURÓR - Arquitetura Completa V1.md`](docs/architecture/AURÓR%20-%20Arquitetura%20Completa%20V1.md) |
| Adaptação visual | [`docs/design/HUB-FINANCEIRA-DESIGN-ADAPTATION.md`](docs/design/HUB-FINANCEIRA-DESIGN-ADAPTATION.md) |
| Referência visual bruta (não é fonte de produto) | [`docs/design/`](docs/design/) |
| Decisões técnicas (ADRs) | [`docs/decisions/`](docs/decisions/) — [stack](docs/decisions/ADR-001-STACK-TECNICA.md), [formato de importação (CSV)](docs/decisions/ADR-002-FORMATO-IMPORTACAO-CSV.md), [contexto familiar e taxonomia](docs/decisions/ADR-003-CONTEXTO-FAMILIAR-E-TAXONOMIA.md) |
| Taxonomia inicial (categorias, subcategorias, objetivos) | [`docs/product/TAXONOMIA-INICIAL.md`](docs/product/TAXONOMIA-INICIAL.md) |
| Roadmap de fases | [`docs/ROADMAP.md`](docs/ROADMAP.md) |
| Setup local | [`docs/development/LOCAL-SETUP.md`](docs/development/LOCAL-SETUP.md) |
| Segurança e dados | [`docs/development/SECURITY-AND-DATA.md`](docs/development/SECURITY-AND-DATA.md) |
| Fluxo de trabalho | [`docs/development/WORKFLOW.md`](docs/development/WORKFLOW.md) |
| Instruções persistentes para o Claude Code | [`CLAUDE.md`](CLAUDE.md) |

## Visão geral das fases

Fundação → Domínio bruto (importação) → Inteligência (classificação) → Revisão humana (Caixa de Entrada) → Competências (fechamento/reabertura) → Inteligência analítica → Narrativa e relatórios → Aprendizagem (regras) → Consultor → Refinamento operacional.

A ordem de execução recomendada não segue a numeração original de fases 1:1 — ver [`docs/ROADMAP.md`](docs/ROADMAP.md) para a sequência real e a justificativa.

## Como iniciar o ambiente

Ver [`docs/development/LOCAL-SETUP.md`](docs/development/LOCAL-SETUP.md) para requisitos e comandos atuais (`pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`). Ainda não há backend/banco de dados — isso chega na Etapa 2.

## Regras de segurança

Nenhum dado financeiro real, CSV ou PDF de fatura, ou credencial deve entrar no Git. Dados de desenvolvimento devem ser sintéticos. Detalhamento completo em [`docs/development/SECURITY-AND-DATA.md`](docs/development/SECURITY-AND-DATA.md).

## Como contribuir

Este projeto é construído por uma única desenvolvedora (Victoria Gama) com apoio do Claude Code — não há fluxo de contribuição externa. O processo de trabalho está descrito em [`docs/development/WORKFLOW.md`](docs/development/WORKFLOW.md) e nas instruções de [`CLAUDE.md`](CLAUDE.md).
