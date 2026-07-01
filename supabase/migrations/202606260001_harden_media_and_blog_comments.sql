-- Harden media row inserts and blog comment submission.

drop policy if exists "Users can add own memories" on public.memories;
create policy "Users can add own memories"
  on public.memories for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and (select public.can_upload_memory(auth.uid()))
    and char_length(trim(title)) between 1 and 80
    and coalesce(is_featured, false) = false
    and storage_path ~ ('^public/' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[a-z0-9]+$')
    and right(
      image_url,
      char_length('/storage/v1/object/public/atri-images/' || storage_path)
    ) = '/storage/v1/object/public/atri-images/' || storage_path
  );

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'blog_posts_title_length_check'
  ) then
    alter table public.blog_posts
      add constraint blog_posts_title_length_check
      check (char_length(trim(title)) between 1 and 120);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'blog_posts_excerpt_length_check'
  ) then
    alter table public.blog_posts
      add constraint blog_posts_excerpt_length_check
      check (char_length(excerpt) <= 240);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'blog_posts_content_length_check'
  ) then
    alter table public.blog_posts
      add constraint blog_posts_content_length_check
      check (char_length(trim(content)) between 1 and 20000);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'blog_posts_mood_length_check'
  ) then
    alter table public.blog_posts
      add constraint blog_posts_mood_length_check
      check (char_length(mood) between 1 and 16);
  end if;
end;
$$;

alter table public.blog_comments
  add column if not exists reporter_fingerprint text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'blog_comments_author_length_check'
  ) then
    alter table public.blog_comments
      add constraint blog_comments_author_length_check
      check (char_length(trim(author_name)) between 1 and 20);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'blog_comments_content_length_check'
  ) then
    alter table public.blog_comments
      add constraint blog_comments_content_length_check
      check (char_length(trim(content)) between 1 and 500);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'blog_comments_color_check'
  ) then
    alter table public.blog_comments
      add constraint blog_comments_color_check
      check (color in ('yellow', 'pink', 'blue', 'green'));
  end if;
end;
$$;

create index if not exists blog_comments_fingerprint_created_at_idx
  on public.blog_comments (reporter_fingerprint, created_at desc)
  where reporter_fingerprint is not null;

drop policy if exists "Anyone can insert comments" on public.blog_comments;
drop policy if exists "Anyone can insert comments through function" on public.blog_comments;
drop policy if exists "Service role can insert comments" on public.blog_comments;
create policy "Service role can insert comments"
  on public.blog_comments for insert
  to service_role
  with check (true);

create or replace function public.submit_blog_comment(
  comment_post_id uuid,
  comment_author_name text,
  comment_content text,
  comment_color text,
  comment_reporter_fingerprint text
)
returns public.blog_comments
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_author text := left(coalesce(nullif(trim(comment_author_name), ''), '匿名的打捞员'), 20);
  normalized_content text := trim(comment_content);
  normalized_color text := coalesce(nullif(trim(comment_color), ''), 'yellow');
  normalized_fingerprint text := nullif(left(trim(coalesce(comment_reporter_fingerprint, '')), 128), '');
  recent_count integer;
  inserted public.blog_comments;
begin
  if normalized_color not in ('yellow', 'pink', 'blue', 'green') then
    normalized_color := 'yellow';
  end if;

  if char_length(normalized_content) < 1 or char_length(normalized_content) > 500 then
    raise exception 'invalid_comment_content'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.blog_posts
    where id = comment_post_id
      and is_published = true
  ) then
    raise exception 'blog_post_not_found'
      using errcode = '22023';
  end if;

  if normalized_fingerprint is not null then
    select count(*)
      into recent_count
    from public.blog_comments
    where reporter_fingerprint = normalized_fingerprint
      and created_at > now() - interval '10 minutes';

    if recent_count >= 5 then
      raise exception 'blog_comment_rate_limited'
        using errcode = 'P0001';
    end if;
  end if;

  insert into public.blog_comments (
    post_id,
    author_name,
    content,
    color,
    reporter_fingerprint
  )
  values (
    comment_post_id,
    normalized_author,
    normalized_content,
    normalized_color,
    normalized_fingerprint
  )
  returning * into inserted;

  return inserted;
end;
$$;

revoke all on function public.submit_blog_comment(uuid, text, text, text, text) from public;
revoke all on function public.submit_blog_comment(uuid, text, text, text, text) from anon;
revoke all on function public.submit_blog_comment(uuid, text, text, text, text) from authenticated;
grant execute on function public.submit_blog_comment(uuid, text, text, text, text) to service_role;
