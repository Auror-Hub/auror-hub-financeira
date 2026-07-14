# ADR-003 — Contexto Familiar do MVP e Consolidação da Taxonomia

**Status:** Aceita
**Data:** 2026-07-13
**Decisores:** Victoria Gama

## Contexto

A Arquitetura Completa assume, como premissa interpretada #1, que a Hub roda "single-tenant" com "Victoria como primeira e única usuária ativa" e enquadra o MVP como validação do "modelo de trabalho do sistema" sobre dados de uma única pessoa (referências a "fatura real de Victoria", "competência real de Victoria" ao longo de todo o documento). O blueprint, na seção "Objetivo" da taxonomia, lista exemplos informais (`Victoria; Malu; Família; Casa; Trabalho; Presente; Viagem`) sem definição estruturada.

Victoria corrigiu esse enquadramento: **o MVP não representa as finanças pessoais dela — representa as finanças conjuntas da Família Gama** (Victoria, Paulo, Malu). Ela continua sendo a operadora inicial (única sessão autenticada), mas os dados analisados são do núcleo financeiro familiar, não individuais.

Este ADR registra essa correção de contexto e a consolidação da taxonomia inicial que a acompanha — sem alterar os documentos-fonte (`docs/architecture/`, `docs/product/`), seguindo a mesma prática já usada no ADR-002 para o formato de importação.

## Decisão

### 1. Contexto oficial do MVP

> A AURÓR · Hub Financeira será inicialmente validada por Victoria Gama como operadora, utilizando as finanças conjuntas da Família Gama.

Implicações estruturais:

- Um mesmo cartão pode conter gastos da Victoria, do Paulo, da Malu, da casa, da família, da AURÓR ou do trabalho do Paulo — **o titular do cartão não define o objetivo do gasto**.
- Quem realizou a compra não é necessariamente quem se beneficiou dela.
- A classificação separa três coisas que não podem se misturar: **o que** foi comprado (categoria/subcategoria), **para quem/qual finalidade** (objetivo), e **circunstância** (contexto).
- A unidade financeira do MVP é a Família Gama; a usuária operadora é Victoria — essas são coisas diferentes e não devem ser confundidas em nenhuma documentação futura.

Isso diverge da premissa #1 da Arquitetura Completa (que já previa `ENT-USER`/`ENT-PROFILE` separados "para família... serem extensões de cardinalidade", mas descrevia o MVP em si como uso individual). A divergência é só de **enquadramento do dado**, não de modelo técnico: continua havendo uma única sessão autenticada, um único perfil — o que muda é que esse perfil representa uma família, não uma pessoa. Ver seção "Fora do escopo" abaixo para o que isso explicitamente não implica.

### 2. Consolidação de dimensões — de 6 para 4

A Arquitetura Completa define seis dimensões estruturadas (`categoria`, `subcategoria`, `objetivo`, `natureza`, `essencialidade`, `tipo_de_ocorrência`) mais contexto híbrido. A taxonomia consolidada por Victoria define **quatro dimensões**: `categoria`, `subcategoria`, `objetivo`, `contexto`. `Natureza`, `essencialidade` e `tipo_de_ocorrência` saem do modelo de classificação estruturada.

**Confirmado explicitamente por Victoria (sessão de 2026-07-13):** substituir pelas 4 dimensões — não é uma omissão do documento de atualização, é simplificação deliberada.

Justificativa (inferida do padrão da atualização, já que o motivo explícito não foi detalhado): as três dimensões removidas adicionavam complexidade de julgamento (o que é "essencial"? o que é "extraordinário" vs. "eventual"?) sem um requisito de produto claro puxando por elas nesta fase — enquanto `objetivo` bem modelado (agora com 13 valores cobrindo pessoa, coletivo, profissional e pendência) já resolve boa parte do que `natureza`/`essencialidade` tentavam capturar informalmente.

### 3. Taxonomia inicial consolidada

Ver [`docs/product/TAXONOMIA-INICIAL.md`](../product/TAXONOMIA-INICIAL.md) — 17 categorias com subcategorias, 13 objetivos com definição e exemplos, regras de interpretação (o que a Hub nunca deve assumir automaticamente) e regras de integridade. Esse documento é a fonte de verdade da taxonomia a partir de agora, substituindo os exemplos informais do blueprint para fins de implementação.

## Impacto no código já escrito (FE-2/FE-3) — não corrigido agora

Por instrução explícita de Victoria ("não implemente nada ainda"), nenhum código foi alterado nesta sessão. Fica registrado para quando a implementação retomar:

- `src/lib/domain/types.ts`: `DimensaoClassificavel`, `DimensoesClassificacao`, `PropostaClassificacao.confiancaPorDimensao` e `DecisaoClassificacao.classificacaoConfirmada` incluem `natureza`/`essencialidade`/`tipoOcorrencia` — precisam ser reduzidos a `categoria`/`subcategoria`/`objetivo` (contexto já é campo separado, `contextoSugerido`).
- `src/lib/mocks/taxonomy.ts`: termos de `natureza`/`essencialidade`/`tipo_de_ocorrência` deixam de ser necessários; termos de `objetivo` precisam ser substituídos pelos 13 valores de `TAXONOMIA-INICIAL.md` (hoje tem só `Pessoal/Família/Trabalho/Casa/Presente` genéricos).
- `src/lib/mocks/inbox.ts`: propostas de classificação sintéticas usam as 6 dimensões antigas e valores de objetivo genéricos — precisam ser regeradas.
- `src/components/domain/inbox/SuggestionBlock.tsx`: `DIMENSAO_LABEL` lista as 6 dimensões antigas.
- `src/lib/session/SessionContext.tsx`: `profileName: "Pessoal"` deveria refletir "Família Gama" ou equivalente, já que o perfil representa a família, não uma pessoa.

Nenhum desses pontos é urgente para a Etapa 1 continuar (FE-4/FE-5 podem prosseguir com o modelo atual) — mas devem ser corrigidos antes ou durante BE-3 (Inteligência), quando a taxonomia real for implementada, para não deixar o código e a documentação divergentes por muito tempo. Recomenda-se um pacote curto de correção ("FE-2.1"/"FE-3.1" ou dentro de BE-3) dedicado a isso.

## Impacto no plano e documentos

Atualizados nesta sessão:

- `CLAUDE.md` — "Limites do MVP" corrigido para refletir Família Gama/Victoria operadora.
- `docs/development/SECURITY-AND-DATA.md` — proteção de dados reais estendida a Paulo e Malu, não só Victoria.
- `docs/CONSTRUCTION-PLAN.md` e `docs/ROADMAP.md` — nota sobre o novo contexto e referência a este ADR e à taxonomia.
- `docs/product/TAXONOMIA-INICIAL.md` — criado (ver acima).

Os documentos-fonte (`docs/architecture/AURÓR - Arquitetura Completa V1.md`, `docs/product/AUROR-HUB-FINANCEIRA-BLUEPRINT-V01.md`) **não foram alterados** — continuam descrevendo o MVP como uso individual e a taxonomia com exemplos informais. Isso é divergência documentada, não erro a corrigir nos originais.

## Fora do escopo (reafirmado)

Explicitamente **não** implementado nesta fase, mesmo com o contexto familiar:

- múltiplos usuários/logins;
- permissões diferenciadas por membro da família;
- rateio de gasto entre pessoas;
- perfis separados por membro (Victoria/Paulo/Malu como contas distintas).

A distinção entre pessoas acontece inteiramente dentro da dimensão **Objetivo** de um único acervo compartilhado — não em contas ou perfis técnicos separados. Isso é consistente com o que a Arquitetura Completa já reservava para fases futuras (Fase 3 — Famílias, no blueprint) sem antecipá-las agora.

## Consequências positivas

- Classificação por objetivo passa a refletir a realidade do uso (cartão compartilhado, múltiplos beneficiários) em vez de assumir titular = beneficiário.
- Taxonomia inicial completa (17 categorias, 13 objetivos) elimina ambiguidade de vocabulário antes mesmo do primeiro upload real.
- Simplificação de 6 para 4 dimensões reduz a superfície de decisão na Caixa de Entrada (menos campos para revisar por lançamento).

## Consequências negativas / limitações

- Perda de granularidade que `natureza`/`essencialidade`/`tipo_de_ocorrência` ofereciam (ex.: distinguir gasto "fixo" de "variável", ou "essencial" de "dispensável") — se isso for necessário para a Fase 6 (análise), pode precisar voltar como campo derivado calculado a partir de outras evidências, não como dimensão de classificação manual.
- Código de FE-2/FE-3 fica temporariamente desalinhado com a taxonomia oficial até a correção ser feita (ver seção de impacto acima) — risco baixo, mas deve ser lembrado para não virar dívida esquecida.

## Riscos

- 13 objetivos é uma lista maior que a original (5-7 informais) — pode aumentar a fricção de revisão na Caixa de Entrada se a IA não conseguir sugerir o objetivo certo com confiança; mitigação já prevista na própria taxonomia (`Não identificado` mantém pendência em vez de forçar).
- Ambiguidade genuína entre `Compartilhado` e `Família`/`Terceiros` pode confundir a usuária na prática — mitigado pela definição explícita ("Compartilhado não substitui Família") registrada na taxonomia.

## Itens a revisar futuramente

- Pacote de correção do código FE-2/FE-3 para refletir 4 dimensões e os 13 objetivos reais (ver seção de impacto).
- Avaliar, na Fase 6 (Inteligência analítica), se alguma noção de "essencialidade"/"natureza" precisa voltar como métrica calculada (não como campo de classificação).
- `SessionContext.profileName` e qualquer outro texto de UI que hoje diga "Pessoal" devem ser revisados para refletir o perfil familiar.

## Status da decisão

Aceita. Vale para toda implementação futura de taxonomia (BE-3 em diante). Documentos-fonte permanecem como registro histórico da premissa original.
