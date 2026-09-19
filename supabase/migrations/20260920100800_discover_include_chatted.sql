-- Only a pass ('left') takes someone out of the feed. People you've already
-- messaged ('right') stay discoverable, so an existing chat no longer hides
-- them.
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
        order by random();

      get diagnostics found_count = row_count;
      if found_count > 0 then
        return;
      end if;
    end loop;
  end if;

  -- Final "open" tier: everyone else active, no distance or recency limit.
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
    order by random();
end;
$$;
