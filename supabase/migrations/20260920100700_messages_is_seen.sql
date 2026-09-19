alter table public.messages
  add column is_seen boolean not null default false;

create index messages_recipient_id_is_seen_idx on public.messages (recipient_id, is_seen);

create policy "Recipients can mark their messages as seen"
  on public.messages
  for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);
