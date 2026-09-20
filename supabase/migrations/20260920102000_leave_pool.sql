--IDEMPOTENT
-- Members can leave a group by deleting their own membership row.

drop policy if exists "Users can leave their own pool memberships" on public.pool_memberships;
create policy "Users can leave their own pool memberships"
  on public.pool_memberships
  for delete
  using (auth.uid() = user_id);
