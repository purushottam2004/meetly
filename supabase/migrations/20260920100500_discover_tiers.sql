alter table public.users
  add column last_active_at timestamptz not null default now();

create or replace function public.distance_km(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
returns double precision
language sql
immutable
as $$
  select 6371 * acos(
    least(1.0, greatest(-1.0,
      sin(radians(lat1)) * sin(radians(lat2))
      + cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2 - lng1))
    ))
  )
$$;

-- Randomized, staged discovery feed: nearest + most recently active first,
-- widening the radius/recency window one tier at a time until a tier turns
-- up at least one not-yet-swiped person. Anonymous viewers (viewer_id null)
-- and viewers without a saved location skip straight to the final open tier.
create or replace function public.discover_profiles(viewer_id uuid)
returns setof public.users
language plpgsql
as $$
declare
  v_lat double precision;
  v_lng double precision;
  tier record;
  found_count integer;
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
          and u.latitude is not null
          and u.longitude is not null
          and u.last_active_at >= now() - (tier.max_days || ' days')::interval
          and public.distance_km(v_lat, v_lng, u.latitude, u.longitude) <= tier.radius_km
          and not exists (
            select 1 from public.swipes s
            where s.swiper_id = viewer_id and s.swiped_id = u.id
          )
        order by random();

      get diagnostics found_count = row_count;
      if found_count > 0 then
        return;
      end if;
    end loop;
  end if;

  -- Final "open" tier: everyone else, no distance or recency limit.
  return query
    select u.*
    from public.users u
    where (viewer_id is null or u.id <> viewer_id)
      and (
        viewer_id is null
        or not exists (
          select 1 from public.swipes s
          where s.swiper_id = viewer_id and s.swiped_id = u.id
        )
      )
    order by random();
end;
$$;
