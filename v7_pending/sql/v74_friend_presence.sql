
-- Presence is visible only between accepted friends. Never expose room codes.
create or replace function public.es_v74_friend_presence()
returns jsonb language sql stable security definer set search_path=''
as $$
with friends as (
 select case when f.sender=auth.uid() then f.recipient else f.sender end uid
 from public.es_friends f where f.accepted and (f.sender=auth.uid() or f.recipient=auth.uid())
)
select coalesce(jsonb_agg(jsonb_build_object(
 'id',f.uid,
 'online',exists(select 1 from public.es_members m where m.user_id=f.uid and m.left_at is null and m.seen_at>now()-interval '25 seconds')
)),'[]'::jsonb)
from friends f;
$$;
revoke all on function public.es_v74_friend_presence() from public,anon;
grant execute on function public.es_v74_friend_presence() to authenticated;
