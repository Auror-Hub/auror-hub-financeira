-- BE-2 (correção): uma importação com 0 linhas válidas (mapeamento de
-- colunas errado) fica marcada como 'falhou', não 'concluido' — mas o
-- índice único (perfil_id, hash, aba) criado em 20260714112711 não sabia
-- distinguir status, então uma nova tentativa do mesmo arquivo/aba ainda
-- colidiria ao gravar. Torna o índice condicional: só exige unicidade
-- entre documentos que NÃO falharam, permitindo reimportar livremente após
-- uma tentativa mal sucedida.

drop index if exists public.documentos_origem_perfil_hash_aba_uidx;

create unique index documentos_origem_perfil_hash_aba_uidx
  on public.documentos_origem (perfil_id, hash, coalesce(aba, ''))
  where status_processamento <> 'falhou';
