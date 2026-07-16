-- Fix urgente: as policies de membros_familia (20260716000000) referenciam a
-- própria tabela num subquery ("familia_id in (select ... from
-- membros_familia m2 where ...)") — Postgres detecta isso como recursão
-- infinita (avaliar a policy exige avaliar a policy de novo pra filtrar as
-- linhas do subquery). Isso quebra TODA query em TODA tabela, porque toda
-- policy das ~46 reescritas subquery membros_familia.
--
-- Fix: funções SECURITY DEFINER que bypassa RLS internamente (dono da função
-- é o role que roda a migration, com BYPASSRLS) — o subquery deixa de
-- reaplicar a policy de membros_familia sobre si mesma.

begin;

create function public.minhas_familias_ativas()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select familia_id from public.membros_familia where usuario_id = auth.uid() and status = 'ativo';
$$;

create function public.minhas_familias_admin()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select familia_id from public.membros_familia where usuario_id = auth.uid() and papel = 'admin' and status = 'ativo';
$$;

revoke all on function public.minhas_familias_ativas() from public;
grant execute on function public.minhas_familias_ativas() to authenticated;
revoke all on function public.minhas_familias_admin() from public;
grant execute on function public.minhas_familias_admin() to authenticated;

alter policy "membros_familia: ver a própria linha e membros da família ativa" on public.membros_familia
  using (usuario_id = auth.uid() or familia_id in (select public.minhas_familias_ativas()));

alter policy "membros_familia: admin aprova/recusa membros da própria família" on public.membros_familia
  using (familia_id in (select public.minhas_familias_admin()))
  with check (familia_id in (select public.minhas_familias_admin()));

commit;
