# Architecture Decision Records (ADRs)

## O que é um ADR

Um registro curto de uma decisão estrutural relevante — técnica ou arquitetural — que afeta como o produto é construído. Existe para que a razão de uma escolha não se perca com o tempo, mesmo que a escolha pareça óbvia hoje.

## Quando criar um ADR

Crie um ADR quando a decisão:

- afeta a stack técnica ou infraestrutura;
- introduz ou altera uma regra estrutural de dados (ex.: como imutabilidade ou versionamento são impostas);
- descarta uma alternativa razoável por um motivo não óbvio;
- tem consequências difíceis de reverter;
- diverge de algo que o blueprint ou a arquitetura completa deixaram como decisão em aberto.

Não crie um ADR para decisões triviais, reversíveis, ou que já são explicitamente definidas no blueprint/arquitetura.

## Convenção de nomes

`ADR-XXX-TITULO-CURTO.md`, numeração sequencial de três dígitos, título em maiúsculas separado por hífen. Exemplo: `ADR-001-STACK-TECNICA.md`.

## Status possíveis

- **Proposta** — em discussão, ainda não decidida.
- **Aceita** — decisão em vigor.
- **Substituída** — não vale mais; substituída por outro ADR.
- **Descontinuada** — deixou de se aplicar sem substituição direta (ex.: funcionalidade removida).

## Decisões substituídas

Nunca edite um ADR aceito para mudar a decisão em si. Crie um novo ADR, e no antigo:

1. mude o status para `Substituída`;
2. adicione uma linha no topo apontando para o novo ADR (`Substituída por ADR-00X`);
3. mantenha o conteúdo original intacto — é histórico, não é para ser apagado.
