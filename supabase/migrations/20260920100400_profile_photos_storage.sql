insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

-- Upload path convention: {user_id}/{filename}, so the first path segment is the owner.
create policy "Anyone can view profile photos"
  on storage.objects
  for select
  using (bucket_id = 'profile-photos');

create policy "Users can upload their own profile photos"
  on storage.objects
  for insert
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own profile photos"
  on storage.objects
  for update
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own profile photos"
  on storage.objects
  for delete
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
