-- Migration: Add indexes for blog_posts and blog_comments to optimize select queries

-- 1. Index for blog_posts select queries (sorting by created_at desc for published posts)
create index if not exists blog_posts_published_created_at_idx
  on public.blog_posts (is_published, created_at desc);

-- 2. Index for blog_comments lookup by post_id
create index if not exists blog_comments_post_created_at_idx
  on public.blog_comments (post_id, created_at asc);
