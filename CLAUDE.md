# AURÓR · Hub Financeira — Instruções persistentes

Este projeto é construído integralmente por Victoria Gama com apoio do Claude Code. Não existe equipe separada de produto ou engenharia — a documentação e este arquivo existem para reduzir ambiguidade, não para coordenar pessoas.

## Fontes de verdade

Leia antes de qualquer implementação relevante:

- **Blueprint de produto:** [`docs/product/AUROR-HUB-FINANCEIRA-BLUEPRINT-V01.md`](docs/product/AUROR-HUB-FINANCEIRA-BLUEPRINT-V01.md) — autointitulado "Blueprint de Produto e Arquitetura — V0.1".
- **Arquitetura completa:** [`docs/architecture/AURÓR - Arquitetura Completa V1.md`](docs/architecture/AURÓR%20-%20Arquitetura%20Completa%20V1.md) — telas, jornadas, entidades, agentes, regras, fases.
- **Adaptação visual:** [`docs/design/HUB-FINANCEIRA-DESIGN-ADAPTATION.md`](docs/design/HUB-FINANCEIRA-DESIGN-ADAPTATION.md).
- **Decisões técnicas:** [`docs/decisions/`](docs/decisions/) (ADRs) — inclui [ADR-001](docs/decisions/ADR-001-STACK-TECNICA.md) (stack) e [ADR-002](docs/decisions/ADR-002-FORMATO-IMPORTACAO-CSV.md) (CSV como formato principal de importação do MVP, PDF adiado).
- **Roadmap:** [`docs/ROADMAP.md`](docs/ROADMAP.md).

Nunca reinterprete o produto a partir deste arquivo. Se este arquivo e uma fonte de verdade divergirem, a fonte de verdade vence — sinalize a divergência em vez de decidir sozinho.

## Princípios arquiteturais (não negociáveis)

1. Dado bruto (`ENT-RAW-TRANSACTION` e afins) é **imutável** — nunca editado, apenas lido. Correção sempre gera nova decisão versionada.
2. Inteligência (classificação, proposta, confiança) vive em camada separada do fato — nunca como coluna direta do lançamento bruto.
3. Toda decisão humana é versionada, nunca sobrescrita.
4. Auditoria é append-only, garantida estruturalmente (nível de banco), não por convenção de aplicação.
5. Competências fechadas geram snapshot imutável; reabertura cria nova versão, nunca apaga a anterior. Relatórios antigos permanecem acessíveis.
6. Nenhuma reclassificação silenciosa. Nenhuma alteração retroativa sem ação explícita e motivo registrado.
7. Toda proposta de IA carrega justificativa e confiança como campos obrigatórios, nunca opcionais.
8. Agentes (Importador, Classificador, Triagem, Aprendizagem, Analista, Consultor, Narrador) são responsabilidades arquiteturais — módulos dentro de uma única aplicação, não microsserviços.

## Regras de produto

A Hub Financeira não é planilha, não é dashboard genérico, não é ERP, não é aplicativo bancário, não é agregador de cartões. É uma camada de entendimento e decisão sobre dados financeiros. Ao construir qualquer tela, pergunte: isso ajuda a explicar ou decidir algo, ou só exibe dado bruto?

## Regras visuais

- `docs/design/` é referência visual apenas — paleta, tipografia, espaçamento, raio, sombra, padrões de componente. Nunca fonte de contexto, produto ou lógica de negócio.
- Não copiar componentes originais (`.jsx`/`.d.ts`) nem CSS de referência integralmente. Adaptar conscientemente.
- Não reutilizar nomes históricos em nenhuma forma (componente, token, variável, classe, dado de exemplo, documentação, interface): Madan, Aurór-como-empresa/ecossistema, Aurora, Dan, Ecossistema, Copiloto, Solicitação, May, Vic, Wendy. Ver seção 2 de `HUB-FINANCEIRA-DESIGN-ADAPTATION.md` para os pontos de contaminação já identificados (ex.: prop `layer` do `Card.jsx` original contém `"madan"`/`"aurora"` como valores).
- Seguir `docs/design/HUB-FINANCEIRA-DESIGN-ADAPTATION.md` para tokens semânticos e inventário de componentes.
- Distinção visual entre fato, sugestão da IA e decisão humana é requisito de produto, não só de estilo.

## Limites do MVP

Dentro: faturas de cartão de crédito, uso pessoal (usuária única — Victoria), Caixa de Entrada, taxonomia, fornecedores, regras simples, competências (fechamento/reabertura), análises de variação, relatório HTML, consulta básica ao acervo.

Fora do MVP: Open Finance, integração bancária automática, investimentos, contabilidade, fluxo de caixa empresarial, múltiplos perfis funcionais simultâneos, aplicativo mobile nativo. O schema já prevê `ENT-USER`/`ENT-PROFILE` separados para essa evolução, mas nenhuma tela ou fluxo multi-perfil deve ser construída agora.

## Segurança

- Nunca inserir dados financeiros reais em commits, fixtures ou exemplos de código.
- Nunca criar arquivos de exemplo com dados pessoais reais (nomes, valores, faturas).
- Nunca enviar CSVs ou PDFs reais de fatura ao Git.
- Nunca expor segredos (chaves, tokens) em código ou documentação.
- Nunca registrar descrição, valor, cartão ou nome de fornecedor em log de aplicação.
- Ver [`docs/development/SECURITY-AND-DATA.md`](docs/development/SECURITY-AND-DATA.md) para o detalhamento completo.

## Processo obrigatório

1. Ler contexto e fontes de verdade relevantes ao pacote em questão.
2. Verificar branch e estado do git antes de editar.
3. Inspecionar antes de editar — não presumir estrutura existente.
4. Planejar o escopo mínimo do pacote antes de implementar.
5. Implementar apenas esse escopo — não antecipar fases futuras.
6. Rodar lint, typecheck, testes e build (quando aplicável).
7. Revisar `git diff` antes de considerar o trabalho pronto.
8. Atualizar documentação afetada pela mudança.
9. Apresentar o resultado (o que foi implementado, resultado de lint/typecheck/teste/build, o que foi verificado no browser quando aplicável) e aguardar o "ok" explícito de Victoria antes de commitar — nunca commitar automaticamente.
10. Depois de um commit aprovado, dar `git push` automaticamente (padrão, sem pedir confirmação a cada vez — repositório solo, branch única, sem force-push). Isso é regra permanente; não se aplica a nenhuma outra ação de Git além de push de commits já aprovados (nada de force-push, reset, ou push para outra branch sem pedir).
11. Não iniciar a próxima fase automaticamente após um commit/push — só avançar quando Victoria disser explicitamente para seguir.

Se uma sessão for interrompida no meio de uma alteração, não reiniciar do zero por tentativa cega. Retomar com uma instrução curta indicando: arquivos já alterados, tarefa restante, e áreas que não precisam ser reanalisadas. Ver [`docs/development/WORKFLOW.md`](docs/development/WORKFLOW.md).
