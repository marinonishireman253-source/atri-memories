-- Keep direct client updates narrow. Admin-only fields such as is_featured
-- must be changed through Edge Functions.

revoke update on public.memories from authenticated;

grant update (title, caption, tags) on public.memories to authenticated;
