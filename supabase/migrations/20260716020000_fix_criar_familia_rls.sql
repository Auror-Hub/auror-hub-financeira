-- Fix: criarFamilia() insere em `familias` e imediatamente pede o `id` de
-- volta (`.select().single()`, RETURNING) — mas a policy de SELECT de
-- `familias` só permite ver famílias onde o usuário já tem membership ativa,
-- e nesse momento a membership (admin) ainda não foi criada. RETURNING é
-- filtrado pela policy de SELECT, então o INSERT falha com "new row violates
-- row-level security policy" mesmo satisfazendo a policy de INSERT.
--
-- Fix: RPC SECURITY DEFINER que cria familia + membership admin numa única
-- transação, bypassando RLS internamente — sem essa janela "familia existe,
-- membership ainda não".

begin;

create function public.criar_familia_com_membership(p_nome text, p_codigo_convite text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_familia_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.';
  end if;

  if exists (select 1 from public.membros_familia where usuario_id = auth.uid() and status = 'ativo') then
    raise exception 'Você já tem uma família ativa.';
  end if;

  insert into public.familias (nome, codigo_convite) values (p_nome, p_codigo_convite) returning id into v_familia_id;
  insert into public.membros_familia (usuario_id, familia_id, papel, status) values (auth.uid(), v_familia_id, 'admin', 'ativo');

  return v_familia_id;
end;
$$;

revoke all on function public.criar_familia_com_membership(text, text) from public;
grant execute on function public.criar_familia_com_membership(text, text) to authenticated;

commit;
