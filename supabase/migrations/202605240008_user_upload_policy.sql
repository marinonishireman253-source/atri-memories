-- User-level upload controls enforced by RLS and managed by admins.

alter table public.user_profiles
  add column if not exists can_upload boolean not null default true,
  add column if not exists upload_limit_total integer check (
    upload_limit_total is null or upload_limit_total >= 0
  );

create or replace function public.can_upload_memory(check_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  profile_can_upload boolean;
  profile_upload_limit_total integer;
  current_upload_count integer;
begin
  if check_user_id is null then
    return false;
  end if;

  select can_upload, upload_limit_total
    into profile_can_upload, profile_upload_limit_total
  from public.user_profiles
  where user_id = check_user_id;

  if profile_can_upload is false then
    return false;
  end if;

  if profile_upload_limit_total is not null then
    select count(*)::integer
      into current_upload_count
    from public.memories
    where owner_id = check_user_id;

    if current_upload_count >= profile_upload_limit_total then
      return false;
    end if;
  end if;

  return true;
end;
$$;

revoke all on function public.can_upload_memory(uuid) from public;
grant execute on function public.can_upload_memory(uuid) to authenticated;

drop policy if exists "Users can add own memories" on public.memories;
create policy "Users can add own memories"
  on public.memories for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and public.can_upload_memory(auth.uid())
    and char_length(trim(title)) between 1 and 80
    and storage_path like ('public/' || auth.uid()::text || '/%')
    and image_url like '%/storage/v1/object/public/atri-images/public/%'
  );

drop policy if exists "Users can upload own ATRI images" on storage.objects;
create policy "Users can upload own ATRI images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'atri-images'
    and public.can_upload_memory(auth.uid())
    and (storage.foldername(name))[1] = 'public'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

alter table public.admin_audit_logs
  drop constraint if exists admin_audit_logs_action_check;

alter table public.admin_audit_logs
  add constraint admin_audit_logs_action_check check (
    action in (
      'delete_memory',
      'update_memory',
      'grant_admin',
      'revoke_admin',
      'update_user_upload_policy'
    )
  );
