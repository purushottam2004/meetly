--IDEMPOTENT
-- Named pools (colleges, communities, companies, …). "Everyone" is not a
-- row: it is users.visible_in_everyone (on by default). Custom memberships
-- are capped at 3; a user may also create at most 3 pools. Leaked join
-- codes are not rotated — there is no pool admin surface.

alter table public.users
  add column if not exists visible_in_everyone boolean not null default true;

create table if not exists public.pools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text not null unique,
  created_by uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.pool_memberships (
  user_id uuid not null references public.users (id) on delete cascade,
  pool_id uuid not null references public.pools (id) on delete cascade,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, pool_id)
);

create index if not exists pool_memberships_pool_id_idx
  on public.pool_memberships (pool_id);

create index if not exists pools_created_by_idx
  on public.pools (created_by);

alter table public.pools enable row level security;
alter table public.pool_memberships enable row level security;

drop policy if exists "Members can view their pools" on public.pools;
create policy "Members can view their pools"
  on public.pools
  for select
  using (
    exists (
      select 1 from public.pool_memberships m
      where m.pool_id = pools.id and m.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view their own pool memberships" on public.pool_memberships;
create policy "Users can view their own pool memberships"
  on public.pool_memberships
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own pool memberships" on public.pool_memberships;
create policy "Users can update their own pool memberships"
  on public.pool_memberships
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.generate_pool_join_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i integer;
begin
  loop
    candidate := '';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.pools where join_code = candidate);
  end loop;
  return candidate;
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

create or replace function public.join_pool(p_code text)
returns public.pools
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized text := upper(nullif(btrim(p_code), ''));
  found public.pools;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if normalized is null then
    raise exception 'Enter a pool code';
  end if;

  select * into found from public.pools where join_code = normalized;
  if found.id is null then
    raise exception 'No pool with that code';
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

grant execute on function public.create_pool(text) to authenticated;
grant execute on function public.join_pool(text) to authenticated;

drop function if exists public.discover_profiles(uuid);

create or replace function public.discover_profiles(
  viewer_id uuid,
  include_everyone boolean default true,
  pool_ids uuid[] default '{}'::uuid[]
)
returns setof public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lat double precision;
  v_lng double precision;
  tier record;
  found_count integer;
  everyone boolean := coalesce(include_everyone, false);
  pools uuid[] := coalesce(pool_ids, '{}'::uuid[]);
begin
  if viewer_id is not null then
    select latitude, longitude into v_lat, v_lng from public.users where id = viewer_id;
  end if;

  if viewer_id is not null and v_lat is not null and v_lng is not null then
    for tier in
      select * from (values
        (0.5, 1), (1.0, 1), (3.0, 1),
        (0.5, 2), (1.0, 2), (3.0, 2), (5.0, 2), (10.0, 2), (15.0, 2),
        (15.0, 4),
        (50.0, 7)
      ) as t(radius_km, max_days)
    loop
      return query
        select u.*
        from public.users u
        where u.id <> viewer_id
          and u.is_active
          and u.latitude is not null
          and u.longitude is not null
          and u.last_active_at >= now() - (tier.max_days || ' days')::interval
          and public.distance_km(v_lat, v_lng, u.latitude, u.longitude) <= tier.radius_km
          and not exists (
            select 1 from public.swipes s
            where s.swiper_id = viewer_id
              and s.swiped_id = u.id
              and s.direction = 'left'
          )
          and (
            (everyone and u.visible_in_everyone)
            or (
              cardinality(pools) > 0
              and exists (
                select 1 from public.pool_memberships m
                where m.user_id = u.id
                  and m.visible
                  and m.pool_id = any (pools)
              )
            )
          )
        order by random();

      get diagnostics found_count = row_count;
      if found_count > 0 then
        return;
      end if;
    end loop;
  end if;

  return query
    select u.*
    from public.users u
    where u.is_active
      and (viewer_id is null or u.id <> viewer_id)
      and (
        viewer_id is null
        or not exists (
          select 1 from public.swipes s
          where s.swiper_id = viewer_id
            and s.swiped_id = u.id
            and s.direction = 'left'
        )
      )
      and (
        (everyone and u.visible_in_everyone)
        or (
          cardinality(pools) > 0
          and exists (
            select 1 from public.pool_memberships m
            where m.user_id = u.id
              and m.visible
              and m.pool_id = any (pools)
          )
        )
      )
    order by random();
end;
$$;

grant execute on function public.discover_profiles(uuid, boolean, uuid[]) to anon, authenticated;
