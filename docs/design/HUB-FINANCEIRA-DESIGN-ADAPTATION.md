# Adaptação Visual — AURÓR · Hub Financeira

Este documento registra como o material em [`docs/design/`](./) (referência visual de um produto anterior — "Ecossistema Madan + Aurór") é adaptado para a Hub Financeira. Ele não é o Design System da Hub Financeira; é a ponte entre a referência e a implementação. Ver também [`docs/design/README.md`](./README.md).

**Regra de leitura:** tudo neste documento é decisão de adaptação para a Hub Financeira, não descrição do material original. Onde o original é citado, é para justificar o que foi preservado ou descartado.

## 1. Fundamentos preservados

Preservar significa: reaproveitar o **valor** (paleta, escala, proporção, comportamento), não o arquivo ou o nome.

### Paleta

Cinco famílias de cor, valores preservados como estão (são cores, não conceitos de produto):

| Família | Base | Light | Tint |
|---|---|---|---|
| Indigo | `#4A6CF7` | `#7B96F9` | `#EEF2FF` |
| Green | `#2DA870` | `#4DC490` | `#EDFAF3` |
| Gold | `#D4860A` | `#F0A52A` | `#FEF6E4` |
| Terra | `#D94F3D` | `#F0705E` | `#FEF0EE` |
| Slate | `#7A6CA8` | `#9D90C4` | `#F1ECF9` |

Superfícies e texto (paleta neutra quente, preservada):

| Token original | Valor |
|---|---|
| `--page` | `#F4F1EC` |
| `--surface` | `#FDFCF9` |
| `--surface-2` | `#EDE9E1` |
| `--ink` | `#1C1916` |
| `--ink-2` | `#4A443C` |
| `--muted` | `#8C8279` |
| `--faint` | `#C4BFBA` |
| `--line` / `--line-2` / `--line-strong` | `rgba(28,25,22, 0.07 / 0.12 / 0.20)` |

**Descartado:** os nomes poéticos de módulo do original (ÁGUA, FLORESTA, MEL, FLOR, NÉVOA) e o mapeamento cor→produto (indigo=principal, green="Aurór/sucesso", gold="Madan/Dan/atenção", terra="risco", slate="Aurora/coordenação"). A Hub Financeira reatribui função própria a cada cor (seção 3).

### Tipografia

- Família única de UI: **Plus Jakarta Sans** (400/500/600/700).
- Família monoespaçada: **DM Mono** (400/500), reservada estritamente para valores numéricos e datas/horas — nunca texto de interface geral. Essa disciplina (números em mono, tudo o mais em humanista) é preservada integralmente; é o traço tipográfico mais distintivo do sistema original e não carrega nome de produto algum.
- Escala tipográfica (px): 10 / 11.5 / 13 / 14 / 16 / 18 / 22 — preservada.
- Peso 400 corpo, 500 labels/eyebrow, 600 títulos de seção, 700 valores grandes (KPI).
- Letter-spacing levemente negativo em títulos (-0.02em) e base do corpo (-0.006em); eyebrow em maiúsculas com tracking positivo (+0.1em).

### Espaçamento, raios, sombras, movimento

- Raios: card 12px, botão 8px, botão pequeno 6px, input 8px, pill 100px, tag 4px, ícone 8px, avatar 6px. Preservados — modestos, nunca 0 e nunca excessivamente arredondados.
- Sombras: tinta quente terrosa (`rgba(60,45,30, …)`), nunca preto puro, nunca neon; drop simples em botões sólidos coloridos, sem gradiente, sem glow, sem inset. Preservadas.
- Movimento: `ease-out` (0.16,1,0.3,1) para assentamento, `ease-snap` (0.34,1.2,0.64,1) para leve overshoot; durações 80/150/220ms. Preservadas.
- Densidade: botões 32px (26px small), inputs 34px, ícones de navegação 34px, rail lateral 52px, topbar 42px, barra de ações inferior 50px. Preservada — é uma aplicação operacional densa, não espaçosa.

### Padrões estruturais de componente (comportamento, não código)

- Botão: variantes primary/success/danger/secondary/ghost, dois tamanhos, estado disabled com opacidade reduzida.
- Input: borda hairline, anel de foco colorido, sem placeholder decorativo.
- Card: elevação sutil (hover eleva 1px + sombra mais profunda), header com título maiúsculo + contagem monoespaçada opcional + ação à direita.
- Badge/StatusDot/Signal: pílula tonal para estado; ponto colorido para status binário; linha de feed com barra de acento colorida à esquerda para eventos.
- Navegação: rail de ícones fixo, com variante expansível (ícone-somente ⇄ ícone+label), item ativo destacado, indicador pontual ("orb") de atividade.
- Shell de layout: rail lateral fixo + topbar fixa + área de conteúdo com largura máxima + barra de ação inferior fixa — estrutura não rolante no nível do frame, rolagem apenas dentro da área de conteúdo.

## 2. Elementos descartados

Descartado significa: não usar como nome, não usar como estrutura, não usar como inspiração de fluxo — mesmo que apareça "só" em um comentário ou classe CSS.

**Contexto institucional e de produto anterior**, encontrado literalmente nos arquivos de referência:
- "Ecossistema Madan + Aurór" (cabeçalho de todo arquivo de token/base CSS).
- "Aurór" como nome de empresa/ecossistema anterior (distinto do nome do produto novo, que reaproveita a palavra "AURÓR" apenas como identidade própria da Hub Financeira, sem herdar associações do ecossistema antigo).
- Agentes "Aurora" e "Dan" como conceitos de produto anterior (cores/avatares associados a eles).
- "Madan" como nome de módulo/produto.

**Objetos operacionais e componentes específicos do produto anterior** — o achado mais crítico desta adaptação:
- `Card.jsx`/`Card.d.ts`: o prop `layer` aceita literalmente os valores `"madan"` e `"aurora"` como enum. **Este componente não deve ser copiado como está.** Ao criar o `Card` próprio da Hub Financeira, o conceito de "layer" (uma barra de acento lateral colorida) pode ser preservado como *padrão visual*, mas sem nenhum valor de enum referenciando produto, módulo ou agente anterior — os valores devem ser as cinco cores (`indigo`/`green`/`gold`/`terra`/`slate`) ou tokens semânticos da Hub Financeira, nunca nomes de contexto.
- `components-reference.css` contém blocos inteiros de um objeto de negócio do produto anterior: `.eco-solicitacao` (com variantes `.aprovacao`, `.validacao`, `.resolucao`, `.handoff`, `.decisao`, `.revisao`, `.info` — um modelo de "Caixa de Entrada"/aprovação de outro produto), `.eco-copiloto-*` (chip de copiloto com animação "breathing"), `.eco-agent-row`/`.eco-avatar.dan`/`.eco-avatar.aurora` (linha de agente conversacional), `.layer-chip.madan/.aurora`. **Nenhum desses blocos deve ser lido como referência estrutural para a Caixa de Entrada da Hub Financeira** — mesmo que "Solicitação" e "Caixa de Entrada" pareçam similares em função, a lógica de negócio (aprovação/validação/handoff) é de outro domínio e não deve contaminar o modelo de `ENT-CLASSIFICATION-PROPOSAL`/`ENT-REVIEW-EVENT` desta arquitetura.
- Padrão `.eco-task`/`.eco-checkbox` (lista de tarefas) e `.eco-agent-row` — não fazem parte do domínio financeiro da Hub e não devem virar componentes aqui.

**Nomes, pessoas, empresas, taxonomias e fluxos anteriores** — busca dedicada não encontrou "May", "Vic" ou "Wendy" em nenhum arquivo de `docs/design/`. "Victoria" e "Malu" aparecem apenas no *blueprint do produto* (não no design system) como dados de exemplo/usuária real — isso é contexto legítimo da Hub Financeira, não contaminação, e é tratado nas regras de dados sintéticos de [`SECURITY-AND-DATA.md`](../development/SECURITY-AND-DATA.md), não aqui.

**Regra geral:** qualquer classe, prop, comentário ou exemplo de dado encontrado em `docs/design/` que remeta a Madan, Aurór-como-empresa, Aurora, Dan, Ecossistema, Copiloto, Solicitação, LayerChip, TaskItem ou AgentRow é sinal de que aquele trecho é herança do produto anterior — o padrão visual pode inspirar, o nome e a lógica de negócio nunca.

## 3. Tokens semânticos propostos

Nomes provisórios — podem ser ajustados durante o scaffold (PKG-001), desde que a mudança fique registrada. Nenhum nome remete a empresa, produto ou agente.

```css
/* Ação */
--color-action-primary        /* = indigo base */
--color-action-primary-hover   /* = indigo light, ou variante mais escura */
--color-action-on-primary      /* texto sobre ação primária */

/* Estado */
--color-state-success          /* = green */
--color-state-warning          /* = gold */
--color-state-danger           /* = terra */
--color-state-neutral          /* = slate, usado para "coordenação"/informação secundária, nunca erro */

/* Inteligência sugerida (distinta de decisão humana) */
--color-suggestion              /* tom que marca claramente "isto é proposta da IA, não fato nem decisão" — candidato: slate ou indigo-tint, a validar com uso real em PKG-004/005 */
--color-suggestion-border

/* Superfície */
--color-surface-primary         /* = --surface */
--color-surface-secondary       /* = --surface-2 / --page */
--color-surface-hover

/* Borda */
--color-border-subtle           /* = --line */
--color-border-default           /* = --line-2 */
--color-border-strong            /* = --line-strong */

/* Texto */
--color-text-primary             /* = --ink */
--color-text-secondary            /* = --ink-2 */
--color-text-muted                 /* = --muted */
--color-text-placeholder            /* = --faint */
```

Função semântica de cada cor na Hub Financeira (reinterpretação obrigatória, conforme instrução do projeto):

- **Indigo** — ação principal, navegação, informação, foco.
- **Green** — confirmação, sucesso, situação saudável, competência fechada sem pendência, conclusão.
- **Gold** — atenção, pendência, revisão necessária, ambiguidade (ex.: fornecedor ambíguo, taxonomia sugerida aguardando aprovação).
- **Terra** — erro, risco, divergência, bloqueio, ação destrutiva (ex.: divergência de totais não resolvida, conflito de regra).
- **Slate** — neutralidade, apoio contextual, informação secundária, e também candidato natural para **inteligência sugerida ainda não confirmada** — já que na origem essa cor era usada para "coordenação", um papel de apoio, não de decisão.

Nenhuma cor deve representar empresa, agente conversacional ou camada institucional — apenas as quatro funções acima (ação, estado, sugestão, neutro).

## 4. Tipografia — regras de uso

- **Família principal (Plus Jakarta Sans):** todo texto de interface — corpo, labels, títulos, badges, navegação, eyebrows.
- **Família monoespaçada (DM Mono):** exclusivamente valores monetários, datas, horas, contadores e identificadores técnicos (ex.: versão do classificador, hash de documento). Nunca para texto corrido ou labels.
- **Família de destaque:** não há uma família serifada/display separada no material original; a Hub Financeira não introduz uma família adicional no MVP — títulos grandes usam Plus Jakarta Sans em peso 700.
- **Escala:** 10/11.5/13/14/16/18/22px, conforme tabela da seção 1.
- **Hierarquia:** eyebrow (10px, maiúsculas, 500, `--color-text-muted`) para rótulos de seção → título de card (16-18px, 600) → corpo (13px, 400) → valor numérico de destaque (22px, 700, mono se for número).
- **Legibilidade:** line-height 1.5 no corpo; nunca reduzir abaixo disso em texto corrido, mesmo em visões densas (Acervo, Caixa de Entrada).
- **Densidade:** a escala compacta é intencional — a Hub Financeira é uma aplicação de revisão repetitiva, não uma landing page; tamanhos maiores que 22px não são necessários no MVP.
- **Responsivo:** o MVP é desktop-first (uso de revisão financeira detalhada); comportamento mobile não é um requisito desta fase — não bloquear o layout para telas estreitas, mas não investir em breakpoints dedicados agora.

## 5. Inventário inicial de componentes futuros

Apenas inventário — nenhum componente abaixo é implementado nesta sessão.

**Fundação**
- Tokens CSS (cores, tipografia, espaçamento, raio, sombra, movimento) como camada Tailwind.
- `Button`, `Input`, `Badge`, `StatusDot` — adaptados diretamente do padrão visual de referência, sem nomes herdados.

**Navegação**
- Shell de layout (rail + topbar + conteúdo + barra de ação), navegação principal (Home, Caixa de Entrada, Competências, Acervo, Fornecedores, Taxonomia, Motor de Regras, Histórico, Relatórios, Consultor, Configurações — conforme mapa de informação da arquitetura).
- `NavIcon` adaptado.

**Entrada de dados**
- Upload de documento (`SCR-UPLOAD-001`).
- Formulário de cadastro de cartão/taxonomia inicial (`SCR-SETUP-001`).

**Revisão**
- `ReviewCard` (cartão da Caixa de Entrada) — inspirado no padrão visual de `Signal`/`Card`, nunca em `.eco-solicitacao`.
- `TransactionDrawer` (detalhe do lançamento, sempre drawer, nunca página cheia).
- `ConfidenceIndicator` (confiança por dimensão, D7).
- `SuggestionBlock` (proposta de IA com justificativa — deve usar `--color-suggestion`, nunca as cores de ação/estado, para ficar visualmente inconfundível com fato ou decisão).

**Feedback**
- `Badge`/`StatusDot`/`Signal` adaptados para estados de competência, confiança e alertas.
- `DivergenceAlert`, `RuleConflictNotice`.

**Visualização**
- `KpiTile`/`KpiStrip` adaptados para Home e Relatórios.
- Gráficos simples de apoio (barra/linha) — nunca substituindo texto interpretativo (regra explícita da arquitetura).

**Auditoria**
- `AuditTimeline` (linha do tempo de eventos, append-only).
- `CompetencyStatus` (estado do ciclo de vida da competência).

**Relatórios**
- Layout do relatório HTML executivo (14 seções), versão/metodologia/snapshot de origem visíveis.
- `TaxonomySelector` (governança de vocabulário).

Esses nomes são direção, não contrato — podem mudar ao serem implementados.

## 6. Direção visual da Hub Financeira

A Hub Financeira deve parecer uma **aplicação operacional inteligente**, não:

- planilha (mesmo em telas densas como o Acervo);
- dashboard genérico de métricas soltas;
- aplicativo bancário;
- chatbot (mesmo o Consultor deve parecer parte da mesma aplicação, não uma janela de chat solta).

Deve ser:

- **elegante e densa quando necessário** — a densidade herdada do material de referência (botões 32px, linhas compactas, hairlines) serve bem à revisão repetitiva da Caixa de Entrada;
- **clara na distinção entre fato, sugestão e decisão** — esta é a exigência visual mais importante do produto inteiro. Fato bruto, proposta de IA e decisão humana nunca podem parecer visualmente equivalentes. Na prática: fato = neutro (texto simples, sem cor de destaque); sugestão = `--color-suggestion` (slate/indigo-tint, com indicador de confiança); decisão confirmada = tom neutro estável, sem "alarme" residual da sugestão original;
- **confortável para revisão repetitiva** — atalhos de teclado, ações em lote, e feedback de progresso ("fila reduziu X% desde o mês passado") são parte da experiência visual, não só da lógica;
- **com hierarquia narrativa** — a Home e os Relatórios devem priorizar frases interpretativas sobre números soltos (ex. "os gastos aumentaram 18%, mas 72% da variação vem de duas despesas de saúde"), conforme o próprio blueprint exige; texto interpretativo antes do gráfico, nunca depois ou no lugar dele;
- **sem estética infantil, sem excesso de cards** — a proposta de referência já evita isso (cores vívidas mas contidas, hairlines em vez de blocos coloridos grandes); manter essa contenção.
