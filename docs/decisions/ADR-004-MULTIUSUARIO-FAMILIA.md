# ADR-004 — Multiusuário e Isolamento por Família

**Status:** Aceita
**Data:** 2026-07-16
**Decisores:** Victoria Gama

## Contexto

O ADR-003 fixou explicitamente, na seção "Fora do escopo (reafirmado)": *"múltiplos usuários/logins; permissões diferenciadas por membro da família; rateio de gasto entre pessoas; perfis separados por membro (Victoria/Paulo/Malu como contas distintas)"* como fora do MVP, com a ressalva *"continua havendo uma única sessão autenticada, um único perfil"*.

Com a Hub em uso real (publicada, dado financeiro real da Família Gama), Victoria precisa dar acesso à própria conta pra outra pessoa: primeiro o marido (Paulo), que deve compartilhar o MESMO acervo que ela já usa; depois a sócia e o marido dela, num acervo separado e isolado do da Família Gama. Isso reverte a seção "Fora do escopo" do ADR-003. O modelo técnico de "perfil = pessoa" nunca existiu (ADR-003 já unificava perfil↔família); o que muda agora é que mais de uma PESSOA (usuário autenticado) pode acessar o mesmo perfil/acervo, e podem existir múltiplos acervos isolados entre si.

## Decisão

### 1. Desacoplar "quem acessa" de "qual acervo"

Hoje `perfis` é ao mesmo tempo "o acervo compartilhado" e "o vínculo de um usuário com esse acervo" (1:1 via `usuario_id`). Passa a existir:

- **`familias`** — o acervo compartilhado em si (nome, código de convite). Reaproveita os mesmos UUIDs que `perfis.id` já tinha, então toda FK de negócio (~9 tabelas com FK direta, ~15 tabelas adicionais que referenciam via join) continua com o mesmo valor — só o *constraint* aponta pra tabela nova, nenhuma linha de dado de negócio é reescrita.
- **`membros_familia`** (renomeada de `perfis`) — o vínculo de um usuário com uma família: `familia_id`, `papel` (`admin`/`membro`), `status` (`ativo`/`pendente`/`recusado`). Um usuário só tem uma membership `ativa` por vez (índice único parcial).

Toda RLS que hoje é `perfil_id in (select id from perfis where usuario_id = auth.uid())` passa a `perfil_id in (select familia_id from membros_familia where usuario_id = auth.uid() and status = 'ativo')` — mesmo padrão mecânico repetido em ~46 policies. `perfilDoUsuarioAutenticado()` mantém a forma do retorno (`perfilId`, agora semanticamente "id da família") pra não tocar as ~64 chamadas já existentes.

### 2. Ingresso por código de convite, nunca por busca

Onboarding de um novo membro é sempre: criar conta normal → colar um código de convite gerado pelo admin da família. **Não existe busca de família por nome** — permitiria qualquer usuário autenticado descobrir a existência de famílias de terceiros só pelo nome, sem nenhum segredo envolvido, o que é vazamento de informação real num produto de finanças privadas. Essa opção foi deliberadamente cortada do desenho original discutido com Victoria.

### 3. Aprovação sempre manual, nunca automática

Solicitar ingresso cria uma linha `pendente` — só um admin ativo da família aprova ou recusa. Sem infraestrutura de notificação push (fora de escopo — app web, sem service worker); a pendência aparece como indicador simples em Configurações → Família, visível só a admins.

### 4. O que NÃO muda

- Dentro de uma família, a distinção entre pessoas continua só na dimensão **Objetivo** de um acervo único compartilhado — não existem permissões diferenciadas por membro, nem rateio de gasto, nem visões filtradas por quem é o usuário logado. Um membro (`papel='membro'`) e um admin (`papel='admin'`) veem exatamente o mesmo acervo; a única diferença de papel é poder aprovar/recusar ingressos e editar nome/código de convite da família.
- Cartões, competências, lançamentos, regras, taxonomia — tudo continua por família (acervo), não por usuário.

## Fora do escopo (nesta rodada)

- Permissões diferenciadas por membro dentro da mesma família (continua sendo tudo-ou-nada: quem está na família vê o acervo inteiro).
- Sair de uma família / trocar de família ativa por conta própria (sem fluxo de "abandonar família" nesta rodada).
- Convite por e-mail que pré-cria um usuário — o convidado sempre cria conta primeiro, depois usa o código.
- Correção das policies de `storage.objects` (upload de fatura), que hoje são escopadas por usuário uploader (`auth.uid()`), não por família — registrado como pendência pra quando existir download/preview do arquivo original (hoje nada usa esse caminho).
- Reestruturação de Configurações em abas (Tópico H do Brainstorm 3) — a seção "Família" desta rodada entra como um novo bloco na tela atual, sem reorganizar o resto.

## Consequências positivas

- Paulo (e depois a sócia + marido dela) acessam a Hub com login próprio, sem compartilhar credencial.
- Isolamento real entre famílias garantido por RLS (não por filtro de aplicação) — mesmo padrão de segurança que já protegia "usuário vê só o próprio perfil" antes desta mudança.
- Nenhuma tabela de negócio precisou de rewrite de dado — só repontar FK e reescrever o corpo das policies.

## Consequências negativas / limitações

- Maior mudança de schema do projeto até agora — toca RLS de praticamente todas as tabelas de negócio numa única migration.
- Um usuário recém-convidado fica bloqueado em `/onboarding` até um admin aprovar — sem fallback automático.

## Status da decisão

Aceita. Reverte a seção "Fora do escopo (reafirmado)" do ADR-003 nos quatro pontos citados no Contexto. O restante do ADR-003 (contexto familiar como unidade financeira, taxonomia consolidada em 4 dimensões) permanece válido e não é afetado por esta decisão.
