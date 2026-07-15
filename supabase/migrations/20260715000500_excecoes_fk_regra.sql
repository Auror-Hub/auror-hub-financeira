-- Fase 4: fecha a lacuna deixada explicitamente no BE-4 — o comentário
-- original em excecoes.regra_relacionada_id dizia "sem FK ainda, ENT-RULE só
-- existe a partir da Fase 4". Agora existe.

alter table public.excecoes
  add constraint excecoes_regra_relacionada_id_fkey
  foreign key (regra_relacionada_id) references public.regras (id);

comment on column public.excecoes.regra_relacionada_id is 'Regra que motivou a exceção, se houver (FK adicionada na Fase 4 — ver ENT-RULE em regras).';
