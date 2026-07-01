-- Tighten direct Storage reads. Public visitors must go through media-urls signed URLs.

drop policy if exists "Anyone can view ATRI images" on storage.objects;
drop policy if exists "Users can view own ATRI images" on storage.objects;

create policy "Users can view own ATRI images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'atri-images'
    and (
      public.is_admin(auth.uid())
      or (
        (storage.foldername(name))[1] = 'public'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );
