# Roadmap

Resumo das fases definidas em [`docs/architecture/AURÓR - Arquitetura Completa V1.md`](architecture/AURÓR%20-%20Arquitetura%20Completa%20V1.md). Este documento resume; não substitui a fonte — para épicos, histórias e critérios de aceite completos, ver o documento original.

**Nota de divergência:** a Fase 1, abaixo, reflete [ADR-002](decisions/ADR-002-FORMATO-IMPORTACAO-CSV.md) (CSV como formato principal do MVP), que diverge da premissa original de PDF-como-documento-primário assumida no documento-fonte. O documento-fonte não foi alterado; a divergência está registrada no ADR.

**Nota de divergência (contexto e taxonomia):** o MVP representa as finanças conjuntas da **Família Gama** (Victoria, Paulo, Malu), com Victoria como operadora — não as finanças pessoais dela, como o documento-fonte assumia. A taxonomia da Fase 2 é consolidada em 4 dimensões (categoria/subcategoria/objetivo/contexto), não as 6 originais. Ver [ADR-003](decisions/ADR-003-CONTEXTO-FAMILIAR-E-TAXONOMIA.md) e [`TAXONOMIA-INICIAL.md`](product/TAXONOMIA-INICIAL.md).

## Fases

- **Fase 0 — Fundação.** Repositório, schema Postgres com migrations, autenticação básica, estrutura de pastas, design system mínimo. Sem dependências anteriores.
- **Fase 1 — Domínio bruto.** Upload de CSV (formato principal do MVP — ver [ADR-002](decisions/ADR-002-FORMATO-IMPORTACAO-CSV.md)) → identificação/mapeamento de perfil de importação → normalização de colunas → cálculo de competência → conciliação de totais (quando disponível) → detecção de duplicidade → lançamento bruto imutável. PDF fica como formato complementar de evolução futura, não requisito do MVP.
- **Fase 2 — Inteligência (estrutura).** Taxonomia inicial (ver [`TAXONOMIA-INICIAL.md`](product/TAXONOMIA-INICIAL.md) — 4 dimensões, 17 categorias, 13 objetivos), padronização de fornecedores, motor de classificação com confiança e justificativa por dimensão.
- **Fase 3 — Revisão humana.** Caixa de Entrada funcional: fila, ações de revisão, revisão em lote, drawer de detalhe, auditoria básica.
- **Fase 5 — Competências.** Ciclo de vida completo: estados, fechamento (snapshot versionado), reabertura (nova versão, preserva a anterior).
- **Fases 6 e 7 — Análise e relatórios.** Motor analítico (variação, despesas extraordinárias, mudanças de comportamento) e geração do relatório executivo HTML (14 seções), versionado e ancorado em snapshot imutável.
- **Fase 4 — Aprendizagem.** Motor de regras simples (condição/consequência, conflito sinalizado, nunca resolvido em silêncio) e Agente de Aprendizagem (transforma decisões repetidas em regras auditáveis, nunca automaticamente).
- **Fase 8 — Consultor.** Interface conversacional fundamentada no acervo real — só depois que Fases 6 e 7 produzirem dados e relatórios reais suficientes (decisão D12, bloqueio explícito de sequência, não sugestão).
- **Fase 9 — Refinamento operacional.** Redução de fricção de uso diário, automações adicionais, revisão de segurança (acesso a arquivos, backup).

## Ordem de execução recomendada — confirmada

A arquitetura completa recomenda executar as fases **fora da ordem numérica**, assim:

```
Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 5 → Fases 6+7 → Fase 4 → Fase 8 → Fase 9
```

Ou seja: **fechar competências (Fase 5) antes de construir o motor de regras (Fase 4)**. A justificativa dada na própria arquitetura é que fechar competências com regras simples ou nenhuma regra ainda é aceitável, enquanto o motor de aprendizagem/regras se beneficia de ter volume real de decisões e pelo menos um fechamento para calibrar contra.

**Confirmado por Victoria (sessão de fundação do repositório, 2026-07-13):** esta ordem é aceitável e deve ser seguida.

Também não iniciar cedo, por risco explícito da arquitetura:
- Consultor antes de Fases 6/7 produzirem relatórios/insights reais (maior risco de alucinação do produto).
- Motor de regras sofisticado antes de Fase 3 ter volume real de decisões.
- Qualquer tela funcional antes do modelo de dados de Fase 0/1 estar implementado e testado com dados reais.

## Marcos (milestones)

M1 Primeira fatura processada → M2 Primeira revisão completa → M3 Primeiro fechamento → M4 Primeiro relatório → M5 Primeira regra aprendida → M6 Primeira reabertura → M7 Consultor operacional → M8 Ciclo mensal estável.

## Construção — Etapa 1 (Frontend) e Etapa 2 (Backend)

A execução foi reorganizada, por pedido de Victoria (2026-07-13), em 2 etapas sequenciais — Frontend primeiro (contra dados mockados, sem Supabase), Backend depois (Supabase real, religando cada tela da Etapa 1) — cada uma com suas próprias fases curtas. Plano completo, com o que cada fase cobre e o processo de validação por fase, em [`docs/CONSTRUCTION-PLAN.md`](CONSTRUCTION-PLAN.md).

Isso substitui a ideia original de pacotes únicos PKG-001–005 mesclando frontend e backend (ver [`docs/PKG-001-PLAN.md`](PKG-001-PLAN.md), superado). Fases além de BE-5 (competências, análise/relatório, regras/aprendizagem, Consultor) continuam sendo especificadas uma de cada vez, fase a fase, só quando chegar a vez — enviar tudo de uma vez contraria a lógica de redução de risco desta arquitetura.
