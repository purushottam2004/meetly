--IDEMPOTENT
-- Pools the viewer shares with another person. Only names of pools the
-- other member has marked visible; join codes stay private.

create or replace function public.shared_pools(p_other_id uuid)
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.name
  from public.pools p
  inner join public.pool_memberships mine
    on mine.pool_id = p.id
    and mine.user_id = auth.uid()
  inner join public.pool_memberships theirs
    on theirs.pool_id = p.id
    and theirs.user_id = p_other_id
    and theirs.visible = true
  where auth.uid() is not null
    and p_other_id is distinct from auth.uid()
  order by p.name;
$$;

revoke execute on function public.shared_pools(uuid) from public, anon;
grant execute on function public.shared_pools(uuid) to authenticated;
