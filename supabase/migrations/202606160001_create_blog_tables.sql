-- Migration: Create blog_posts and blog_comments tables and secure them via RLS

-- 1. Create public.blog_posts table
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text not null default '',
  content text not null,
  tags text[] not null default '{}'::text[],
  mood text not null default '☀️',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Create public.blog_comments table
create table if not exists public.blog_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  author_name text not null,
  content text not null,
  color text not null default 'yellow',
  created_at timestamptz not null default now()
);

-- 3. Enable RLS on both tables
alter table public.blog_posts enable row level security;
alter table public.blog_comments enable row level security;

-- 4. Set up RLS Policies for blog_posts
drop policy if exists "Anyone can read published posts, admins can read all" on public.blog_posts;
create policy "Anyone can read published posts, admins can read all"
  on public.blog_posts for select
  using (is_published = true or (select public.is_admin()));

drop policy if exists "Admins can insert blog posts" on public.blog_posts;
create policy "Admins can insert blog posts"
  on public.blog_posts for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins can update blog posts" on public.blog_posts;
create policy "Admins can update blog posts"
  on public.blog_posts for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can delete blog posts" on public.blog_posts;
create policy "Admins can delete blog posts"
  on public.blog_posts for delete
  to authenticated
  using ((select public.is_admin()));

-- 5. Set up RLS Policies for blog_comments
drop policy if exists "Anyone can read blog comments" on public.blog_comments;
create policy "Anyone can read blog comments"
  on public.blog_comments for select
  using (true);

drop policy if exists "Anyone can insert comments" on public.blog_comments;
create policy "Anyone can insert comments"
  on public.blog_comments for insert
  with check (true);

drop policy if exists "Admins can delete comments" on public.blog_comments;
create policy "Admins can delete comments"
  on public.blog_comments for delete
  to authenticated
  using ((select public.is_admin()));

-- 6. Grant appropriate privileges
grant select on public.blog_posts to anon, authenticated, service_role;
grant insert, update, delete on public.blog_posts to authenticated, service_role;

grant select, insert on public.blog_comments to anon, authenticated, service_role;
grant delete on public.blog_comments to authenticated, service_role;
