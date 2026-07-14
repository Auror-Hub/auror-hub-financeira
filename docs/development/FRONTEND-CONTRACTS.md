# Contratos do Frontend para a Etapa 2

Consolidação da fase FE-5 ([`CONSTRUCTION-PLAN.md`](../CONSTRUCTION-PLAN.md)). Este documento é o "contrato" que a Etapa 2 (Backend/Supabase) deve satisfazer com dados reais — os tipos abaixo já existem no código e hoje são preenchidos por `src/lib/mocks/`. Substituir a fonte de dados (mock → Supabase) não deve exigir mudar os componentes que os consomem, só a camada de leitura.

## Onde vivem os contratos

| Arquivo | Conteúdo |
|---|---|
| [`src/lib/domain/types.ts`](../../src/lib/domain/types.ts) | Tipos espelhando as entidades `ENT-*` do núcleo operacional: `Cartao`, `Competencia`, `TermoTaxonomia`, `FornecedorPadronizado`, `LancamentoBruto`, `PropostaClassificacao`, `DecisaoClassificacao`, `Insight`, `Metrica`, `Recomendacao`. |
| [`src/lib/domain/inbox.ts`](../../src/lib/domain/inbox.ts) | Conceitos de triagem da Caixa de Entrada: `TipoPendencia`, `StatusRevisaoLocal`, `ItemFila` (junção lançamento + proposta). |
| [`src/lib/domain/competency.ts`](../../src/lib/domain/competency.ts) | View-model de detalhe de competência: `CompetenciaDetalhe`, `VersaoFechamento`, `DocumentoOrigemResumo`. |

## ⚠️ Divergência conhecida e pendente — ver ADR-003

Os três arquivos acima ainda refletem o modelo de **6 dimensões de classificação** (`categoria`, `subcategoria`, `objetivo`, `natureza`, `essencialidade`, `tipoOcorrencia`) e objetivos genéricos (`Pessoal`, `Família`, `Trabalho`, `Casa`, `Presente`). [ADR-003](../decisions/ADR-003-CONTEXTO-FAMILIAR-E-TAXONOMIA.md) consolidou o modelo oficial em **4 dimensões** (`categoria`, `subcategoria`, `objetivo`, `contexto`) com 13 objetivos reais (ver [`TAXONOMIA-INICIAL.md`](../product/TAXONOMIA-INICIAL.md)).

**Isto não foi corrigido no código ainda** (por decisão explícita — a correção foi adiada para BE-3, não bloqueia FE-4/FE-5). Antes de BE-3 usar estes contratos como base real, é preciso:

1. Remover `natureza`/`essencialidade`/`tipoOcorrencia` de `DimensaoClassificavel`, `DimensoesClassificacao`, `PropostaClassificacao.confiancaPorDimensao` e `DecisaoClassificacao.classificacaoConfirmada` (`types.ts`).
2. Adicionar um campo `contexto` próprio (texto livre) a `PropostaClassificacao` e `DecisaoClassificacao` — hoje só existe `contextoSugerido` na proposta.
3. Atualizar `src/lib/mocks/taxonomy.ts` para os 13 objetivos reais e remover os termos de natureza/essencialidade/tipo_de_ocorrência.
4. Atualizar `src/lib/mocks/inbox.ts` (propostas sintéticas) para as 4 dimensões.
5. Atualizar `SuggestionBlock.tsx` (`DIMENSAO_LABEL`) para não listar as 3 dimensões removidas.
6. Revisar `SessionContext.profileName` ("Pessoal" → algo que reflita o perfil familiar).

Nenhuma tela quebra sem essa correção — os componentes leem `proposta.dimensoes` genericamente. É uma correção de dado/vocabulário, não de estrutura de componente.

## Convenções que a Etapa 2 deve preservar

- **Dinheiro em centavos inteiros** (`Centavos = number`), nunca float — ver comentário em `types.ts`. Formatação para BRL só na exibição (`src/lib/format.ts`).
- **Datas como string ISO** (`DataISO`, `AnoMes`, `DataHoraISO`) — o backend decide o tipo real de coluna, mas a interface do frontend espera essas strings.
- **IDs como `string`** em toda referência entre entidades (nunca number).
- **Enums em português, com os valores exatos do dicionário de dados** (inclusive acentos) — ex.: `EstadoCompetencia` usa `"em revisão"`, não `"em_revisao"`.
- **`justificativa` e `confiancaGeral` nunca opcionais** em `PropostaClassificacao` (D11/D7 da arquitetura) — o tipo já reflete isso como campo obrigatório; a implementação real não deve relaxar essa obrigatoriedade.

## Componentes que dependem destes contratos

`SuggestionBlock`, `ConfidenceIndicator`, `ReviewCard`, `TransactionDrawer`, `BatchReviewPanel` (Caixa de Entrada); `CompetencyListScreen`, `CompetencyDetailScreen`, `CloseCompetencyModal`, `ReopenCompetencyModal` (Competências); `InsightNarrative`, `KpiTile` (Home). Nenhum desses componentes deve precisar mudar de assinatura quando a Etapa 2 substituir os mocks por dados reais — se precisar, é sinal de que o contrato aqui documentado ficou incompleto.

## Checklist de aderência ao design (FE-1 a FE-5)

Verificado nesta revisão:

- [x] Paleta e tokens semânticos usados exclusivamente via classes Tailwind geradas a partir de `globals.css` — nenhuma cor hardcoded fora dos tokens.
- [x] Tipografia: `DM Mono` só em valores numéricos/datas (`.font-mono-nums`), `Plus Jakarta Sans` no restante.
- [x] Distinção visual fato/sugestão/decisão: `SuggestionBlock` sempre em tom slate (`--color-suggestion*`); fato exibido sem cor de destaque; decisão confirmada em verde (`--color-state-success`).
- [x] Densidade compacta preservada (botões 32px/26px, inputs 34px, rail 52px) — nenhuma tela introduziu espaçamento maior que o padrão.
- [x] Nenhum nome histórico (Madan/Aurór-empresa/Aurora/Dan/Ecossistema/Copiloto/Solicitação/May/Vic/Wendy) em código — checado por busca em cada fase.
- [x] Drawer (painel lateral) usado só para detalhe (`TransactionDrawer`, `BatchReviewPanel`); Modal (centralizado) só para ação bloqueante (`CloseCompetencyModal`, `ReopenCompetencyModal`) — distinção da arquitetura preservada.
- [x] Foco de teclado: Drawer/Modal movem o foco para dentro ao abrir, prendem Tab/Shift+Tab, devolvem o foco a quem abriu ao fechar (adicionado na FE-5, `useFocusTrap`).
- [x] Responsividade básica: `KpiStrip` usa `auto-fit` para reduzir colunas em telas estreitas em vez de espremer texto; testado sem overflow horizontal em 375px e 768px.
- [ ] Contraste de cor (WCAG AA) não foi auditado formalmente — item para revisão futura, não bloqueante para o MVP.
- [ ] Navegação 100% por teclado fora dos overlays (ex.: atalhos na Caixa de Entrada) não foi implementada — mencionada como `[HIPÓTESE]` na arquitetura, não obrigatória no MVP.
