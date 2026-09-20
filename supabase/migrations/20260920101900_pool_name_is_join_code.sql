--IDEMPOTENT
-- Pool name is the join code. Stop generating a separate random code.

alter table public.pools drop constraint if exists pools_join_code_eq_name;

update public.pools
set join_code = 'TMP-' || id::text
where join_code is distinct from name;

update public.pools
set join_code = name
where join_code is distinct from name;

alter table public.pools
  add constraint pools_join_code_eq_name check (join_code = name);

create or replace function public.create_pool(p_name text)
returns public.pools
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  trimmed text := nullif(upper(btrim(p_name)), '');
  created public.pools;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if trimmed is null then
    raise exception 'Pool name is required';
  end if;
  if length(trimmed) > 48 then
    raise exception 'Pool name is too long';
  end if;
  if exists (
    select 1 from public.pools where upper(btrim(name)) = trimmed
  ) then
    raise exception 'That name is taken';
  end if;
  if (select count(*) from public.pools where created_by = uid) >= 3 then
    raise exception 'You can create at most 3 pools';
  end if;
  if (select count(*) from public.pool_memberships where user_id = uid) >= 3 then
    raise exception 'You can be in at most 3 pools';
  end if;

  insert into public.pools (name, join_code, created_by)
  values (trimmed, trimmed, uid)
  returning * into created;

  insert into public.pool_memberships (user_id, pool_id, visible)
  values (uid, created.id, true);

  return created;
end;
$$;

create or replace function public.join_pool(p_code text)
returns public.pools
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized text := upper(replace(nullif(btrim(p_code), ''), ' ', ''));
  found public.pools;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if normalized is null then
    raise exception 'Pool does not exist';
  end if;

  select * into found
  from public.pools
  where replace(upper(btrim(name)), ' ', '') = normalized
     or replace(upper(btrim(join_code)), ' ', '') = normalized;
  if found.id is null then
    raise exception 'Pool does not exist';
  end if;
  if exists (
    select 1 from public.pool_memberships
    where user_id = uid and pool_id = found.id
  ) then
    return found;
  end if;
  if (select count(*) from public.pool_memberships where user_id = uid) >= 3 then
    raise exception 'You can be in at most 3 pools';
  end if;

  insert into public.pool_memberships (user_id, pool_id, visible)
  values (uid, found.id, true);

  return found;
end;
$$;

drop function if exists public.generate_pool_join_code();
