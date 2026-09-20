--IDEMPOTENT
-- Chat safety: a user can block or report another person. Blocks hide both
-- sides from Discover and stop new messages either way.

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.users (id) on delete cascade,
  blocked_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_id_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

drop policy if exists "Users can view blocks they are in" on public.user_blocks;
create policy "Users can view blocks they are in"
  on public.user_blocks
  for select
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

drop policy if exists "Users can block others" on public.user_blocks;
create policy "Users can block others"
  on public.user_blocks
  for insert
  with check (auth.uid() = blocker_id and blocker_id <> blocked_id);

drop policy if exists "Users can unblock people they blocked" on public.user_blocks;
create policy "Users can unblock people they blocked"
  on public.user_blocks
  for delete
  using (auth.uid() = blocker_id);

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users (id) on delete cascade,
  reported_id uuid not null references public.users (id) on delete cascade,
  reason text not null,
  details text,
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id),
  check (char_length(reason) between 1 and 80)
);

create index if not exists user_reports_reporter_id_idx on public.user_reports (reporter_id);
create index if not exists user_reports_reported_id_idx on public.user_reports (reported_id);

alter table public.user_reports enable row level security;

drop policy if exists "Users can view their own reports" on public.user_reports;
create policy "Users can view their own reports"
  on public.user_reports
  for select
  using (auth.uid() = reporter_id);

drop policy if exists "Users can file reports" on public.user_reports;
create policy "Users can file reports"
  on public.user_reports
  for insert
  with check (auth.uid() = reporter_id and reporter_id <> reported_id);

drop policy if exists "Users can send messages as themselves" on public.messages;
create policy "Users can send messages as themselves"
  on public.messages
  for insert
  with check (
    auth.uid() = sender_id
    and sender_id <> recipient_id
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = sender_id and b.blocked_id = recipient_id)
         or (b.blocker_id = recipient_id and b.blocked_id = sender_id)
    )
  );

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
        and not exists (
          select 1 from public.user_blocks b
          where (b.blocker_id = viewer_id and b.blocked_id = u.id)
             or (b.blocker_id = u.id and b.blocked_id = viewer_id)
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
            and not exists (
              select 1 from public.user_blocks b
              where (b.blocker_id = viewer_id and b.blocked_id = u.id)
                 or (b.blocker_id = u.id and b.blocked_id = viewer_id)
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
            and not exists (
              select 1 from public.user_blocks b
              where (b.blocker_id = viewer_id and b.blocked_id = u.id)
                 or (b.blocker_id = u.id and b.blocked_id = viewer_id)
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
        viewer_id is null
        or not exists (
          select 1 from public.user_blocks b
          where (b.blocker_id = viewer_id and b.blocked_id = u.id)
             or (b.blocker_id = u.id and b.blocked_id = viewer_id)
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
