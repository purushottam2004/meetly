--IDEMPOTENT
-- Discover still expands until a tier has someone the viewer has not acted on.
-- Chosen (right) and rejected (left) people stay in the result set so the client
-- can rank: untouched → chosen → rejected.

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
      select count(*) into found_count
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
        );

      if found_count > 0 then
        return query
          select u.*
          from public.users u
          where u.id <> viewer_id
            and u.is_active
            and u.latitude is not null
            and u.longitude is not null
            and u.last_active_at >= now() - (tier.max_days || ' days')::interval
            and public.distance_km(v_lat, v_lng, u.latitude, u.longitude) <= tier.radius_km
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

        return query
          select u.*
          from public.users u
          where u.id <> viewer_id
            and u.is_active
            and exists (
              select 1 from public.swipes s
              where s.swiper_id = viewer_id
                and s.swiped_id = u.id
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
            and not (
              u.latitude is not null
              and u.longitude is not null
              and u.last_active_at >= now() - (tier.max_days || ' days')::interval
              and public.distance_km(v_lat, v_lng, u.latitude, u.longitude) <= tier.radius_km
            );

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
