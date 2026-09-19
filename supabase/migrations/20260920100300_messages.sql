create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users (id) on delete cascade,
  recipient_id uuid not null references public.users (id) on delete cascade,
  body text not null,
  quote_kind text check (quote_kind in ('photo', 'text')),
  quote_text text,
  created_at timestamptz not null default now()
);

create index messages_sender_id_created_at_idx on public.messages (sender_id, created_at);
create index messages_recipient_id_created_at_idx on public.messages (recipient_id, created_at);

alter table public.messages enable row level security;

create policy "Participants can view their messages"
  on public.messages
  for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Users can send messages as themselves"
  on public.messages
  for insert
  with check (auth.uid() = sender_id and sender_id <> recipient_id);

alter publication supabase_realtime add table public.messages;
