# ADR-002 — CSV como Formato Principal de Importação do MVP

**Status:** Aceita
**Data:** 2026-07-13
**Decisores:** Victoria Gama

## Contexto

A Arquitetura Completa assume, como premissa interpretada (premissa #2), que "fatura de cartão de crédito é o documento de origem primário do MVP" e descreve o fluxo de importação inteiro em torno de PDF: `SCR-UPLOAD-001` ("permitir envio de um ou mais PDFs de fatura"), `SCR-IMPORT-DIVERGENCE-001` (conferência "página/posição de origem... para checagem contra o PDF"), `ENT-SOURCE-DOCUMENT` (campo "arquivo original" pensado como PDF), e a Fase 1 inteira ("EPC-IMPORT-001 Upload e documento de origem": "upload de PDF associado a `ENT-CARD`"). O blueprint reforça isso na decisão estrutural #1 ("O PDF é documento de origem, não interface").

Este ADR registra uma mudança de rumo sobre essa premissa, decidida por Victoria: **CSV passa a ser o formato principal de importação do MVP; PDF deixa de ser requisito da primeira versão.** Isso não é uma reinterpretação silenciosa do produto — é uma decisão estrutural explícita, documentada aqui exatamente porque diverge de uma premissa que os documentos-fonte assumiam. Os arquivos-fonte (`docs/architecture/`, `docs/product/`) não foram alterados; este ADR é o registro formal da divergência.

## Problema

O MVP precisa processar faturas reais de Victoria o quanto antes, com o menor risco técnico possível no ponto de entrada de dados (importação), para que o esforço do time (uma única desenvolvedora) se concentre nas camadas que realmente definem o valor do produto: classificação, revisão, aprendizagem, análise e narrativa — não em engenharia de extração de documento.

## Decisão

- CSVs exportados diretamente pelas instituições financeiras são o formato de importação do MVP. Importação de PDF não é requisito da Fase 1.
- Fluxo oficial do MVP:

  ```text
  Exportação da fatura em CSV
      ↓
  Upload direto na Hub
      ↓
  Identificação da instituição ou perfil de importação
      ↓
  Mapeamento e normalização das colunas
      ↓
  Validação dos dados
      ↓
  Detecção de duplicidades
      ↓
  Persistência dos lançamentos brutos
      ↓
  Classificação e revisão na Hub
  ```

- **Novo conceito de entidade** (a formalizar em schema durante a especificação do pacote de importação): **Perfil de importação** — um perfil por instituição/formato de CSV conhecido, contendo: instituição; cartão ou origem financeira; versão/formato conhecido; delimitador; codificação; formato de data; formato monetário; coluna de data; coluna de descrição; coluna de valor; coluna de parcela; coluna de moeda (quando existir); transformações necessárias; regras de normalização; data da última utilização. Uma vez configurado e validado, o perfil é reutilizável em importações futuras do mesmo formato.
- Quando o CSV não tiver perfil reconhecido, a Hub deve permitir mapeamento manual de colunas para os campos brutos oficiais. Campos mínimos obrigatórios: data; descrição original (ou fornecedor original); valor. Campos opcionais: parcela atual; total de parcelas; moeda; cartão; vencimento; identificador externo; categoria original do banco (armazenada apenas como dado de origem, **nunca** como classificação oficial da Hub — a categoria do banco não substitui nem alimenta diretamente `ENT-TAXONOMY-TERM`).
- O CSV original é preservado como documento de origem (mesmo papel que o PDF tinha na arquitetura original: fonte de auditoria, nunca interface). Os lançamentos brutos normalizados e persistidos no banco continuam sendo a fonte operacional oficial — este princípio (D2/RUL-1, imutabilidade do lançamento bruto) não muda.
- Validação de importação deve verificar: presença das colunas obrigatórias; linhas inválidas; datas inválidas; valores inválidos; valores negativos ou estornos; duplicidades; codificação; delimitador; linhas de cabeçalho adicionais; totais (quando o CSV disponibilizar total de fatura); consistência entre número de linhas importadas e número de linhas válidas. **Nenhuma linha inválida é descartada silenciosamente** — cada linha rejeitada gera um `ENT-IMPORT-EVENT` auditável, na mesma lógica já prevista para divergências de PDF.
- PDF permanece como formato complementar de evolução futura, não descartado da arquitetura de longo prazo. Quando implementado, deve produzir o mesmo modelo de `ENT-RAW-TRANSACTION` que a importação de CSV produz — nenhuma camada posterior (classificação, revisão, competências, análise, relatório, Consultor) deve depender do formato de origem:

  ```text
  CSV ─┐
       ├── Normalização → Lançamento bruto → Inteligência da Hub
  PDF ─┘
  ```

## Justificativa

CSV elimina a maior fonte de risco técnico do MVP identificada pela própria Arquitetura Completa: "qualidade da extração de PDF é o risco de maior efeito cascata — todo o resto do sistema depende de lançamento bruto correto" (seção de riscos). Substituir extração visual/OCR por leitura estruturada de colunas:

- elimina dependência de OCR e de layout de PDF por instituição;
- torna a validação linha a linha determinística, não heurística;
- acelera a chegada a dados reais de Victoria, permitindo que o esforço do MVP se concentre em classificação/revisão/aprendizagem/análise/narrativa — que são onde o produto de fato gera valor, conforme a própria definição de produto ("a unidade de valor não é o lançamento importado, é a interpretação produzida a partir dele").

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| PDF como formato primário (conforme assumido implicitamente na Arquitetura Completa) | Maior risco técnico do projeto identificado pela própria arquitetura; adiado, não descartado — evolução futura |
| Suporte simultâneo a CSV e PDF desde a Fase 1 | Dobra a superfície de risco e trabalho no primeiro pacote de importação sem necessidade — contraria a lógica de redução de risco do MVP |
| CSV genérico sem conceito de perfil de importação (mapear colunas toda vez) | Repetiria trabalho manual a cada fatura da mesma instituição; perfil reutilizável é consistente com o princípio de reduzir esforço de revisão ao longo do tempo |

## Consequências positivas

- Reduz drasticamente o risco técnico do primeiro pacote de importação (PKG-002, conforme `docs/ROADMAP.md`).
- Torna a validação de linhas determinística e testável desde o primeiro dia.
- Acelera a chegada a M1 (primeira fatura processada) com dados reais de Victoria.
- Mantém a arquitetura de camadas intacta: fato bruto imutável, documento de origem preservado, inteligência em camada separada — nada dessas garantias muda.
- Mantém caminho aberto para PDF no futuro sem retrabalho de schema, desde que o importador de PDF (quando implementado) alimente o mesmo modelo de `ENT-RAW-TRANSACTION`.

## Consequências negativas / limitações

- Depende de o usuário conseguir exportar CSV da instituição financeira — nem toda instituição oferece exportação CSV completa ou com todos os campos desejados; isso pode limitar quais cartões entram no MVP até que PDF seja implementado.
- `ENT-RAW-TRANSACTION.página_ou_posição` (pensado para referenciar posição no PDF) precisa de equivalente para CSV (ex.: número da linha) — detalhe de schema a resolver na especificação do pacote de importação, não neste ADR.
- Perfis de importação por instituição introduzem uma nova entidade não prevista no dicionário de dados original do blueprint — deve ser formalizada explicitamente quando o pacote de importação (Importador) for especificado, não implementada informalmente.

## Riscos

- Formato de CSV pode variar entre exportações da mesma instituição ao longo do tempo (mudança de layout do banco) — mesmo risco de fragilidade que existia com PDF, só que mais fácil de detectar (falha de mapeamento de coluna é mais visível que erro silencioso de OCR).
- Sem total de fatura disponível no CSV, a conciliação de totais (D-blueprint, `ENT-IMPORT-BATCH.divergência`) fica sem uma das suas checagens — mitigado por tratar "totais, quando o CSV disponibilizar" como condicional, não obrigatório.

## Itens a revisar futuramente

- Schema formal de `ENT-IMPORT-PROFILE` (nome provisório) — a especificar no pacote de importação (PKG-002).
- Equivalente de "página/posição de origem" para CSV (número de linha) no schema de `ENT-RAW-TRANSACTION`.
- Momento e critério para retomar a importação de PDF como formato complementar.
- Ajustar, quando o pacote de importação for especificado, a redação de `SCR-UPLOAD-001`/`SCR-IMPORT-*` para refletir CSV como fluxo principal — sem editar os documentos-fonte originais, apenas os documentos derivados (roadmap, planos de pacote).

## Status da decisão

Aceita para a Fase 1 do MVP. Reversível/complementável quando a importação de PDF for retomada como formato adicional, sem exigir reescrita das camadas posteriores.
