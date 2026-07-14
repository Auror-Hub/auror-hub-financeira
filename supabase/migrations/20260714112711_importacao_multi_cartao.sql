-- BE-2 (extensão): suporte a fatura com múltiplos cartões da mesma conta
-- (físico, virtual, adicional) numa única planilha — descoberto ao testar
-- com a fatura real do Porto Seguro, que traz uma coluna "Cartão" por linha
-- com o final de 4 dígitos de cada cartão.
--
-- Não fere ADR-003: os 3 cartões continuam sob o mesmo perfil (acervo
-- compartilhado da Família Gama). O comentário já existente em
-- `cartoes` ("titular do cartão não define o objetivo do gasto") previa
-- exatamente este cenário — múltiplos instrumentos físicos, um acervo só.
--
-- Também corrige: faturas em planilha podem ter mais de uma aba de
-- interesse (ex.: nacional/internacional) que precisam ser importadas em
-- envios separados do MESMO arquivo — o dedup por hash sozinho impedia
-- reimportar o arquivo para processar a segunda aba.

alter table public.perfis_importacao
  add column coluna_cartao text;

comment on column public.perfis_importacao.coluna_cartao is 'Coluna opcional com o final do cartão de cada linha, quando uma fatura cobre mais de um cartão da mesma conta (físico/virtual/adicional). Resolve o cartao_id por linha via cartoes.ultimos_4_digitos.';

alter table public.documentos_origem
  add column aba text;

comment on column public.documentos_origem.aba is 'Aba da planilha processada neste envio (xlsx). Junto com hash, permite reimportar o mesmo arquivo para processar outra aba.';

alter table public.documentos_origem
  drop constraint if exists documentos_origem_perfil_id_hash_key;

create unique index documentos_origem_perfil_hash_aba_uidx
  on public.documentos_origem (perfil_id, hash, coalesce(aba, ''));
