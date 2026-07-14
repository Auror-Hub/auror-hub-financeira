# Fluxo de Trabalho

Processo esperado para qualquer pacote de trabalho neste repositório.

1. **Ler contexto** — fontes de verdade relevantes ao pacote (blueprint, arquitetura, ADRs, roadmap) e qualquer memória/instrução acumulada da sessão.
2. **Verificar branch** — confirmar em qual branch o trabalho está acontecendo antes de editar.
3. **Inspecionar arquivos** — olhar o estado real do repositório antes de presumir estrutura ou conteúdo.
4. **Planejar** — definir o escopo mínimo do pacote em questão; não misturar escopo de fases futuras.
5. **Implementar escopo mínimo** — só o que foi planejado.
6. **Testar** — rodar os testes relevantes ao que foi alterado.
7. **Revisar o diff** — ler `git diff` por completo antes de considerar a mudança pronta.
8. **Atualizar documentação** — se a mudança afeta algo descrito em `docs/`, atualizar junto, não depois.
9. **Apresentar resultado** — relatar o que foi feito, o que não foi, e o que ficou em aberto.
10. **Aguardar instrução antes de commit**, quando solicitado — não commitar nem enviar ao GitHub automaticamente.

## Continuidade entre sessões

Nunca usar retry cego quando uma sessão é interrompida no meio de uma alteração. Ao retomar, preferir uma instrução curta de continuação informando:

- quais arquivos já foram alterados;
- qual tarefa ainda está pendente;
- quais áreas já foram analisadas e não precisam ser reanalisadas.

Isso evita retrabalho de investigação e reduz o risco de a IA "reinventar" uma decisão já tomada anteriormente na sessão.

## Por que este processo existe

Este projeto é mantido por uma única desenvolvedora. Não há revisão de código por terceiros, não há esteira de CI/CD ainda, e não há uma segunda pessoa para pegar um erro de escopo antes de ele se tornar código. O processo acima existe para compensar isso — cada etapa (inspecionar antes de editar, planejar antes de implementar, revisar o diff) é uma checagem que normalmente seria feita por outra pessoa.
