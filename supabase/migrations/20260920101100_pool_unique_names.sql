--IDEMPOTENT
-- Pool names are unique (case-insensitive). check_pool_name returns Gmail-style
-- alternatives when the requested name is already used.

create unique index if not exists pools_name_lower_uidx
  on public.pools (lower(btrim(name)));

create or replace function public.check_pool_name(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  trimmed text := nullif(btrim(p_name), '');
  taken boolean;
  suggestions text[] := '{}';
  candidate text;
  n integer := 2;
  year_part text := to_char(timezone('utc', now()), 'YYYY');
begin
  if trimmed is null then
    return jsonb_build_object('available', false, 'suggestions', '[]'::jsonb);
  end if;

  taken := exists (
    select 1 from public.pools where lower(btrim(name)) = lower(trimmed)
  );

  if not taken then
    return jsonb_build_object('available', true, 'suggestions', '[]'::jsonb);
  end if;

  while cardinality(suggestions) < 3 and n < 50 loop
    candidate := trimmed || n::text;
    if not exists (
      select 1 from public.pools where lower(btrim(name)) = lower(candidate)
    ) then
      suggestions := array_append(suggestions, candidate);
    end if;
    n := n + 1;
  end loop;

  candidate := trimmed || year_part;
  if cardinality(suggestions) < 3 and not exists (
    select 1 from public.pools where lower(btrim(name)) = lower(candidate)
  ) then
    suggestions := array_append(suggestions, candidate);
  end if;

  return jsonb_build_object('available', false, 'suggestions', to_jsonb(suggestions));
end;
$$;

create or replace function public.create_pool(p_name text)
returns public.pools
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  trimmed text := nullif(btrim(p_name), '');
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
    select 1 from public.pools where lower(btrim(name)) = lower(trimmed)
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
  values (trimmed, public.generate_pool_join_code(), uid)
  returning * into created;

  insert into public.pool_memberships (user_id, pool_id, visible)
  values (uid, created.id, true);

  return created;
end;
$$;

grant execute on function public.check_pool_name(text) to authenticated;
