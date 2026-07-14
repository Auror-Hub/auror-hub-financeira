# AURÓR · Hub Financeira

## Blueprint de Produto e Arquitetura — V0.1

## 1. Definição do produto

A Hub Financeira é uma aplicação de inteligência operacional que transforma registros financeiros dispersos em entendimento, decisões e acompanhamento contínuo.

Ela não deve ser concebida como:

* controle de contas;
* planilha evoluída;
* dashboard financeiro;
* gerenciador de orçamento;
* sistema contábil;
* aplicativo bancário;
* agregador de cartões.

Sua função central é construir uma camada de conhecimento sobre o comportamento financeiro do usuário.

A unidade de valor do produto não é o lançamento importado.

A unidade de valor é a interpretação produzida a partir do lançamento.

---

## 2. Promessa principal

A Hub deve permitir que o usuário compreenda:

* o que mudou;
* por que mudou;
* se a mudança é pontual ou recorrente;
* quais comportamentos estão surgindo;
* quais despesas realmente pressionam o orçamento;
* onde existem oportunidades de economia;
* quais decisões podem ser tomadas sem prejudicar prioridades ou qualidade de vida.

A experiência deve se aproximar de uma relação contínua com um analista financeiro que conhece profundamente o contexto do usuário.

---

## 3. Princípio arquitetural central

O sistema será dividido em três grandes camadas.

### Camada 1 — Fatos

Contém somente informações extraídas dos documentos de origem.

É imutável.

Não contém interpretação.

### Camada 2 — Inteligência

Contém classificações, relações, regras, decisões humanas, hipóteses, contextos e aprendizados.

É versionada.

Pode evoluir sem alterar os fatos originais.

### Camada 3 — Experiência

Contém as jornadas pelas quais o usuário revisa, compreende, consulta e utiliza o conhecimento produzido.

Inclui:

* Caixa de Entrada;
* competências;
* relatórios;
* histórico;
* consultas à IA;
* alertas;
* recomendações.

```text
DOCUMENTOS
    ↓
FATOS IMUTÁVEIS
    ↓
PROPOSTAS DE INTELIGÊNCIA
    ↓
REVISÃO HUMANA
    ↓
CONHECIMENTO CONSOLIDADO
    ↓
ANÁLISES E INTERPRETAÇÕES
    ↓
DECISÕES
```

---

# 4. Arquitetura de informação

## 4.1. Home

A Home apresenta a situação atual da competência selecionada.

Não é a principal tela de trabalho.

Seu objetivo é oferecer contexto rápido e indicar o que exige atenção.

### Conteúdos sugeridos

* competência atual;
* total analisado;
* quantidade de lançamentos;
* itens aguardando revisão;
* variação em relação à média histórica;
* principais mudanças;
* despesas extraordinárias;
* categorias ou objetivos pressionados;
* alertas;
* recomendações;
* acesso ao último relatório executivo.

A Home deve priorizar frases interpretativas.

Exemplo:

> Os gastos aumentaram 18% em junho, mas 72% dessa variação está relacionada a duas despesas extraordinárias de saúde.

---

## 4.2. Caixa de Entrada

A Caixa de Entrada é o centro operacional da Hub.

Ela reúne todos os lançamentos que exigem confirmação, correção ou contextualização.

### Tipos de item

* classificação com baixa confiança;
* fornecedor desconhecido;
* fornecedor ambíguo;
* possível duplicidade;
* valor incompatível com o padrão;
* gasto extraordinário;
* contexto necessário;
* regra conflitante;
* divergência entre documento e total importado;
* nova taxonomia sugerida.

### Estrutura do cartão

* fornecedor original;
* fornecedor padronizado sugerido;
* data;
* valor;
* cartão;
* competência;
* parcela;
* classificação sugerida;
* contexto sugerido;
* confiança;
* justificativa da IA;
* histórico semelhante;
* ações disponíveis.

### Ações principais

* confirmar;
* alterar;
* adicionar contexto;
* aplicar decisão a ocorrências semelhantes;
* marcar como exceção;
* revisar depois.

### Recursos essenciais

* revisão por teclado;
* confirmação em lote;
* filtros por confiança;
* filtros por valor;
* filtros por fornecedor;
* filtros por tipo de pendência;
* painel lateral com histórico;
* comparação com lançamentos semelhantes;
* indicação clara do impacto da decisão.

A revisão deve ser rápida, mas nunca opaca.

---

## 4.3. Competências

Cada competência representa um período financeiro consolidado.

A competência deve se basear no período em que os gastos ocorreram, e não apenas no vencimento da fatura.

### Cada competência contém

* documentos associados;
* lotes de importação;
* lançamentos;
* valores conciliados;
* itens revisados;
* itens pendentes;
* análises;
* insights;
* relatório executivo;
* versões anteriores do fechamento;
* comparação histórica.

### Estados possíveis

* aguardando documentos;
* importando;
* divergência encontrada;
* em revisão;
* pronta para fechamento;
* fechada;
* reaberta;
* atualizada após novo documento.

Uma competência fechada não deve se tornar imutável. Ela deve possuir versões.

---

## 4.4. Acervo

O Acervo é a visão consolidada dos lançamentos já compreendidos pela Hub.

Ele não deve se parecer com uma planilha.

Pode utilizar listas, agrupamentos, filtros e visualizações densas, mas sempre como aplicação.

### Formas de exploração

* por competência;
* por categoria;
* por objetivo;
* por fornecedor;
* por natureza;
* por essencialidade;
* por contexto;
* por pessoa;
* por comportamento;
* por tipo de ocorrência;
* por cartão;
* por faixa de valor.

Cada lançamento deve possuir uma visão detalhada com:

* dado original;
* classificação atual;
* justificativa;
* contexto;
* documento de origem;
* decisões anteriores;
* histórico de alterações;
* regras aplicadas;
* lançamentos relacionados.

---

## 4.5. Fornecedores

A tela de Fornecedores representa a memória operacional da Hub.

Fornecedor original e fornecedor padronizado não são a mesma informação.

Exemplos de descrições diferentes podem pertencer ao mesmo fornecedor:

* DL UBER;
* UBER TRIP;
* UBER *PENDING;
* UBER DO BRASIL.

### Cada fornecedor padronizado deve possuir

* nome oficial;
* aliases;
* padrões textuais;
* categorias frequentes;
* subcategorias frequentes;
* objetivos frequentes;
* naturezas frequentes;
* essencialidade padrão;
* contextos anteriores;
* quantidade de ocorrências;
* valores mínimo, máximo e médio;
* primeira ocorrência;
* última ocorrência;
* confiança;
* exceções;
* regras relacionadas;
* histórico de decisões.

Um fornecedor pode possuir comportamento contextual.

Amazon, por exemplo, não deve ter categoria fixa obrigatória.

Uber pode possuir uma classificação padrão, mas aceitar exceções relacionadas a viagens, trabalho ou terceiros.

---

## 4.6. Taxonomia

A Taxonomia é o vocabulário oficial da Hub.

Nenhuma categoria, objetivo ou natureza deve surgir livremente em um lançamento sem passar pela taxonomia.

### Dimensões iniciais

#### Categoria

Responde:

> No que o dinheiro foi gasto?

Exemplos:

* Casa;
* Alimentação;
* Saúde;
* Transporte;
* Educação;
* Lazer.

#### Subcategoria

Refina a categoria.

Exemplos:

* Casa → Manutenção;
* Alimentação → Restaurantes;
* Saúde → Odontologia;
* Transporte → Aplicativos.

#### Objetivo

Responde:

> Para quem ou para quê esse dinheiro foi gasto?

Exemplos:

* Victoria;
* Malu;
* Família;
* Casa;
* Trabalho;
* Presente;
* Viagem.

#### Natureza

Responde:

> Que tipo de compromisso financeiro é esse?

Exemplos:

* fixa;
* variável;
* discricionária;
* extraordinária;
* eventual;
* compromisso contratado.

#### Essencialidade

Exemplos:

* essencial;
* importante;
* ajustável;
* dispensável.

#### Tipo de ocorrência

Exemplos:

* recorrente;
* eventual;
* extraordinária;
* sazonal;
* parcelada;
* impulsiva;
* reposição;
* emergência.

#### Contexto

Responde:

> Por que essa despesa aconteceu?

O contexto não deve ser uma taxonomia completamente rígida.

Ele pode combinar:

* contexto estruturado;
* tags;
* texto livre;
* entidades relacionadas.

---

## 4.7. Motor de Regras

O Motor de Regras transforma decisões repetidas em automações controladas.

### Tipos de condição

* fornecedor contém;
* fornecedor corresponde;
* valor maior ou menor;
* faixa de valor;
* cartão;
* competência;
* número de parcelas;
* descrição contém;
* categoria anterior;
* objetivo anterior;
* frequência;
* combinação de condições.

### Tipos de consequência

* sugerir classificação;
* aumentar confiança;
* reduzir confiança;
* exigir revisão;
* aplicar contexto;
* marcar como provável exceção;
* vincular a fornecedor padronizado;
* impedir confirmação automática.

### Princípios

* toda regra deve ser editável;
* toda aplicação deve ser explicável;
* regras conflitantes devem gerar revisão;
* exceções não devem destruir a regra principal;
* uma correção isolada não deve necessariamente criar uma regra;
* regras aprendidas devem mostrar sua origem.

---

## 4.8. Histórico

O Histórico apresenta a evolução financeira ao longo do tempo.

Ele não deve apenas exibir séries numéricas.

Deve permitir compreender:

* mudanças persistentes;
* alterações de hábito;
* novos compromissos;
* categorias em expansão;
* desaparecimento de despesas;
* sazonalidade;
* frequência;
* concentração;
* dispersão;
* dependência de determinados fornecedores;
* crescimento silencioso de pequenas compras.

---

## 4.9. Relatórios

Cada fechamento de competência gera um relatório executivo em HTML.

O relatório é uma fotografia interpretada daquele momento.

Ele deve possuir versão, data de geração e conjunto de dados utilizado.

### Estrutura inicial

1. Resumo executivo
2. Situação geral
3. Principais mudanças
4. Explicação das variações
5. Distribuição por categorias
6. Distribuição por objetivos
7. Maiores despesas
8. Despesas extraordinárias
9. Mudanças de comportamento
10. Comparação histórica
11. Alertas
12. Possibilidades de economia
13. Conclusões
14. Pontos a observar na próxima competência

O HTML pode utilizar gráficos quando eles ajudam a narrativa.

O gráfico nunca deve substituir a interpretação.

---

## 4.10. Consultor

O Consultor é a interface conversacional da inteligência acumulada.

Ele não deve responder apenas com conhecimento genérico de finanças.

Suas respostas precisam estar fundamentadas nos dados e contextos do usuário.

### Exemplos de perguntas

* Quanto custa manter minha casa?
* Quais gastos cresceram nos últimos três meses?
* Onde consigo economizar R$ 1.500?
* Quanto gasto com a Malu?
* Quais despesas parecem impulsivas?
* Estou gastando mais com restaurantes ou apenas tive um mês atípico?
* Quais gastos recorrentes surgiram recentemente?
* O que mudou depois de determinada viagem ou evento?
* Quanto dos meus gastos é realmente ajustável?

### Estrutura esperada da resposta

1. resposta direta;
2. evidências utilizadas;
3. interpretação;
4. ressalvas;
5. possíveis ações;
6. possibilidade de aprofundamento.

---

# 5. Entidades de dados

## 5.1. Documento de origem

Representa o PDF enviado.

Campos principais:

* identificador;
* nome do arquivo;
* hash;
* instituição;
* cartão;
* período;
* vencimento;
* total declarado;
* data de envio;
* status de processamento;
* arquivo original;
* versão do importador.

---

## 5.2. Lote de importação

Representa uma execução do importador.

Campos:

* documento;
* início;
* término;
* status;
* quantidade extraída;
* total extraído;
* total declarado;
* divergência;
* logs;
* alertas;
* versão do processo.

---

## 5.3. Lançamento bruto

Representa o fato extraído.

Campos imutáveis:

* cartão;
* competência calculada;
* vencimento;
* data;
* fornecedor original;
* descrição original;
* valor;
* parcela atual;
* total de parcelas;
* moeda;
* arquivo de origem;
* página ou posição de origem;
* lote de importação;
* identificador de deduplicação.

O lançamento bruto nunca deve receber categoria diretamente.

---

## 5.4. Fornecedor padronizado

Entidade inteligente que agrupa diferentes descrições de origem.

---

## 5.5. Proposta de classificação

Representa a interpretação sugerida pela IA.

Campos:

* lançamento;
* fornecedor sugerido;
* categoria;
* subcategoria;
* objetivo;
* natureza;
* essencialidade;
* tipo de ocorrência;
* contexto;
* confiança geral;
* confiança por dimensão;
* justificativa;
* regras utilizadas;
* exemplos semelhantes;
* versão do classificador;
* data da proposta.

---

## 5.6. Decisão de classificação

Representa a decisão considerada válida naquele momento.

Campos:

* lançamento;
* classificação confirmada;
* usuário responsável;
* origem da decisão;
* data;
* observação;
* proposta anterior;
* versão;
* status.

A decisão pode ter sido:

* confirmada;
* corrigida;
* parcialmente corrigida;
* marcada como exceção;
* substituída posteriormente.

---

## 5.7. Evento de revisão

Registra cada interação humana.

Exemplos:

* confirmou sugestão;
* alterou categoria;
* adicionou contexto;
* marcou exceção;
* criou regra;
* rejeitou fornecedor;
* reabriu lançamento.

---

## 5.8. Regra

Contém:

* condições;
* ações;
* prioridade;
* confiança;
* origem;
* escopo;
* exceções;
* data de criação;
* última utilização;
* quantidade de acertos;
* quantidade de correções;
* status.

---

## 5.9. Insight

Representa uma conclusão analítica estruturada.

Campos:

* competência;
* tipo;
* título;
* explicação;
* evidências;
* relevância;
* confiança;
* impacto;
* recomendação;
* status;
* versão do motor analítico.

---

## 5.10. Snapshot analítico

Consolida o estado de uma competência em determinado momento.

Permite regenerar relatórios sem perder versões anteriores.

---

## 5.11. Relatório

Campos:

* competência;
* snapshot;
* versão;
* conteúdo HTML;
* data;
* status;
* insights utilizados;
* metodologia;
* observações.

---

# 6. Agentes e responsabilidades

Os agentes devem ser tratados inicialmente como responsabilidades arquiteturais.

Eles não precisam nascer como múltiplos agentes autônomos independentes.

Essa separação evita complexidade técnica desnecessária e permite que cada responsabilidade evolua de forma controlada.

## Agente Importador

Responsável por:

* reconhecer documento;
* extrair lançamentos;
* identificar cartão;
* identificar competência;
* reconhecer parcelas;
* conciliar totais;
* detectar possíveis duplicidades;
* registrar evidências;
* sinalizar divergências.

Não classifica despesas.

---

## Agente Classificador

Responsável por produzir propostas.

Utiliza:

* texto original;
* fornecedor padronizado;
* histórico;
* regras;
* lançamentos semelhantes;
* faixa de valor;
* frequência;
* cartão;
* contexto temporal.

Não altera o dado bruto.

Não considera sua própria proposta como verdade.

---

## Agente de Triagem

Responsável por decidir como cada proposta aparece na Caixa de Entrada.

Exemplos:

* confirmação rápida;
* revisão obrigatória;
* contexto necessário;
* possível exceção;
* conflito;
* alta prioridade.

---

## Agente de Aprendizagem

Responsável por transformar revisões em conhecimento reutilizável.

Ele deve distinguir:

* correção pontual;
* exceção;
* novo padrão;
* alteração permanente;
* regra global;
* regra contextual.

O aprendizado precisa ser auditável.

---

## Agente Analista

Responsável por detectar e explicar fenômenos.

Exemplos:

* variação de valor;
* variação de frequência;
* aumento silencioso;
* concentração em um único evento;
* surgimento de recorrência;
* mudança de fornecedor;
* alteração de comportamento;
* sazonalidade;
* gasto extraordinário;
* redução relevante.

---

## Agente Consultor

Responsável por responder perguntas sobre o acervo.

Ele consulta dados estruturados, insights e contexto.

Não deve inventar informações ausentes.

Deve explicitar quando a resposta depende de dados incompletos.

---

## Agente Narrador

Responsável por transformar análises em comunicação executiva.

Ele seleciona:

* o que é relevante;
* o que merece destaque;
* o que é apenas ruído;
* o que precisa de contexto;
* o que deve ser acompanhado no futuro.

---

# 7. Ciclo de aprendizagem

```text
IA propõe
    ↓
Usuário revisa
    ↓
Sistema registra a decisão
    ↓
Aprendizagem avalia o tipo de correção
    ↓
Fornecedor, regra ou contexto é atualizado
    ↓
Novas propostas utilizam o aprendizado
    ↓
Confiança é recalibrada
```

Uma única confirmação não deve necessariamente criar uma regra.

O sistema deve observar repetição, estabilidade e contexto antes de generalizar.

### Exemplo

Primeira ocorrência:

```text
PORTO SERVIÇOS
→ Casa
→ Manutenção
```

O usuário confirma e informa:

```text
Higienização do sofá
```

O sistema registra a decisão.

Na segunda ocorrência semelhante, sugere novamente com confiança maior.

Após repetições consistentes, pode sugerir uma regra.

O usuário decide se a regra será criada.

---

# 8. Fluxo operacional completo

## Etapa 1 — Envio

Usuário envia um ou mais PDFs.

## Etapa 2 — Reconhecimento

Sistema identifica documento, cartão, período e possível duplicidade.

## Etapa 3 — Extração

Importador extrai os lançamentos.

## Etapa 4 — Validação

Sistema compara o total extraído com o total declarado na fatura.

## Etapa 5 — Persistência bruta

Os fatos são registrados de forma imutável.

## Etapa 6 — Padronização

Sistema tenta relacionar descrições a fornecedores conhecidos.

## Etapa 7 — Classificação

IA produz propostas para todas as dimensões.

## Etapa 8 — Triagem

Itens são organizados por confiança, ambiguidade, impacto e necessidade de contexto.

## Etapa 9 — Revisão

Usuário confirma ou corrige.

## Etapa 10 — Aprendizagem

Sistema atualiza fornecedores, padrões, exceções e regras.

## Etapa 11 — Consolidação

Competência passa a possuir uma visão confiável.

## Etapa 12 — Análise

Motor analítico identifica mudanças e fenômenos.

## Etapa 13 — Narrativa

Narrador produz o relatório executivo.

## Etapa 14 — Consulta

Consultor responde perguntas com base no acervo atualizado.

---

# 9. MVP inicial

## Dentro do MVP

* envio manual de PDFs;
* armazenamento do documento original;
* extração de lançamentos;
* conciliação de totais;
* detecção de duplicidades;
* base bruta imutável;
* cadastro inicial de taxonomia;
* padronização de fornecedores;
* classificação sugerida por IA;
* confiança e justificativa;
* Caixa de Entrada;
* confirmação e correção;
* histórico de revisão;
* regras simples;
* consolidação por competência;
* análises de variação;
* identificação de despesas extraordinárias;
* geração de relatório HTML;
* consulta básica ao acervo.

## Fora do MVP

* integração bancária automática;
* Open Finance;
* pagamento de contas;
* controle de saldo;
* gestão de investimentos;
* fluxo de caixa empresarial;
* emissão fiscal;
* contabilidade;
* conciliação bancária completa;
* planejamento tributário;
* metas financeiras complexas;
* recomendação de investimentos;
* múltiplas empresas;
* marketplace financeiro;
* aplicativo mobile nativo.

---

# 10. Evolução futura

## Fase 1 — Victoria

Validar:

* importação;
* taxonomia;
* revisão;
* aprendizagem;
* interpretação;
* relatórios.

## Fase 2 — Uso pessoal ampliado

Adicionar:

* múltiplas contas;
* cartões adicionais;
* objetivos pessoais;
* planejamento;
* metas;
* entradas financeiras;
* despesas fora do cartão.

## Fase 3 — Famílias

Adicionar:

* pessoas;
* dependentes;
* responsabilidades;
* gastos compartilhados;
* objetivos familiares;
* permissões;
* visões individuais e coletivas.

## Fase 4 — Profissionais autônomos

Adicionar:

* separação pessoal e profissional;
* clientes;
* projetos;
* custos operacionais;
* impostos;
* sazonalidade de receita;
* reserva financeira.

## Fase 5 — Empresas

Adicionar:

* centros de custo;
* áreas;
* fornecedores;
* contratos;
* aprovações;
* orçamento;
* fluxo de caixa;
* contas a pagar e receber;
* múltiplos usuários;
* governança;
* integrações.

A arquitetura inicial deve permitir essa evolução, mas o MVP não deve carregar toda essa complexidade.

---

# 11. Decisões estruturais já consolidadas

1. O PDF é documento de origem, não interface.

2. A planilha não será o sistema.

3. O lançamento bruto será imutável.

4. Classificações serão armazenadas separadamente.

5. Toda alteração será versionada.

6. A taxonomia será centralizada.

7. A IA sempre apresentará justificativa e confiança.

8. O usuário continuará sendo responsável pela confirmação.

9. A Caixa de Entrada será a principal área operacional.

10. A Home será uma síntese interpretativa.

11. Relatórios serão narrativos e exportáveis em HTML.

12. Agentes representarão responsabilidades, não necessariamente processos autônomos.

13. O sistema aprenderá sem apagar exceções.

14. O histórico de decisões será preservado.

15. O produto será construído para gerar entendimento, não apenas organização.

---

# 12. Critério de sucesso

O módulo terá cumprido sua função quando Victoria puder enviar suas faturas e, com um esforço progressivamente menor de revisão, receber respostas confiáveis para perguntas que hoje exigiriam análise manual extensa.

O sucesso não será medido apenas pela precisão da classificação.

Também será medido por:

* redução do tempo de revisão;
* redução de perguntas repetidas;
* qualidade dos contextos aprendidos;
* precisão das explicações;
* utilidade das recomendações;
* capacidade de distinguir tendência de exceção;
* clareza dos relatórios;
* confiança da usuária nas conclusões;
* quantidade de decisões efetivamente apoiadas pela Hub.
