# Segurança e Dados

Regras não negociáveis para qualquer trabalho neste repositório, em qualquer fase.

## Dados financeiros

- Documentos de origem reais (CSV — formato principal do MVP, ver [ADR-002](../decisions/ADR-002-FORMATO-IMPORTACAO-CSV.md) — ou PDF, quando implementado) **nunca** entram no Git, em nenhuma branch, em nenhum momento — nem como anexo de teste, nem como fixture. Isso vale igualmente para CSV: por ser um formato estruturado, um CSV real expõe dado financeiro de forma ainda mais direta que um PDF.
- Dados financeiros reais (valores, descrições de lançamento, nomes de fornecedor, números de cartão) **nunca** entram em fixtures, exemplos de código, ou dados de desenvolvimento versionados.
- Dados de desenvolvimento e teste devem ser **sintéticos** — gerados especificamente para não corresponder a nenhuma transação real de Victoria, Paulo, Malu ou de terceiros. O MVP representa as finanças conjuntas da Família Gama (ver [ADR-003](../decisions/ADR-003-CONTEXTO-FAMILIAR-E-TAXONOMIA.md)), não só da Victoria — a proteção de dado real vale para qualquer membro da família, não apenas para a operadora.
- Isso vale mesmo para arquivos "só de exemplo" em documentação — nenhum exemplo deve usar um valor, fornecedor ou data que corresponda a um gasto real.

## Segredos

- Nenhuma chave de API, token, senha ou credencial entra em código ou documentação versionada.
- `.env.local` (e equivalentes) ficam fora do Git — ver `.gitignore` na raiz.
- `.env.example` contém apenas nomes de variáveis, nunca valores reais nem placeholders que pareçam valores reais.

## Logs

- Logs de aplicação não podem expor: descrição de lançamento, valor, número de cartão, nome de fornecedor, nome de pessoa, ou conteúdo de documento.
- Logs estruturados devem registrar identificadores (IDs, timestamps, tipos de evento) — não o conteúdo financeiro em si.
- Isso vale para logs de erro também: uma falha de importação de CSV (ou extração de PDF, quando implementado) deve logar "falha ao processar documento X", não o conteúdo das linhas/colunas.

## Armazenamento (Supabase Storage)

- Bucket de documentos (CSV/PDF) deve ser **privado** — nunca público.
- Acesso a um documento específico deve sempre passar por URL assinada com expiração curta, nunca por link direto permanente.
- Políticas de acesso (RLS) seguem o princípio de menor privilégio: um usuário só acessa os documentos do próprio perfil.

## Backups e retenção

Política de backup e retenção de dados será definida em fase posterior (Fase 9, refinamento operacional) — não bloqueia o MVP, mas não deve ser esquecida.

## Desenvolvimento local

- Mesmo em ambiente local, dados financeiros exigem o mesmo cuidado que em produção — não existe "modo de desenvolvimento" onde dados reais podem circular livremente.
- Se for necessário usar uma fatura real (CSV) para validar importação/classificação (a arquitetura exige isso explicitamente para os critérios de aceite de vários pacotes), o arquivo original deve ficar fora do controle de versão — usar `.gitignore` (ver raiz) e armazenamento local não versionado, nunca commitado "temporariamente".
