-- V8.1 DRAFT — READ-ONLY PER-ROOM RANKING. NOT DEPLOYED.
-- Requires a review of private-room rewards, performance and permissions.
create or replace function public.es_v81_room_ranking(p_room uuid)
returns jsonb language plpgsql stable security definer set search_path to ''
as $body$
declare answer jsonb;
begin
 if auth.uid() is null or not exists(
  select 1 from public.es_members m where m.room_id=p_room
    and m.user_id=auth.uid() and m.left_at is null
 ) then raise exception 'Você não participa desta sala'; end if;
 with score as (
  select x.user_id,
    sum(case
      when x.win then 25
      when not x.is_impostor and public.es_v81_lone_correct(rd.id,x.user_id) then 0
      else -25 end)::integer as points,
    count(*) filter(where x.win)::integer as wins,
    count(*)::integer as games
  from public.es_results x
  join public.es_rounds rd on rd.id=x.round_id
  where rd.room_id=p_room and rd.finished_at is not null and x.voted
  group by x.user_id
 ), players as (
  select m.user_id as id,p.nickname,coalesce(s.points,0) as points,
    coalesce(s.wins,0) as wins,coalesce(s.games,0) as games
  from public.es_members m
  join public.es_profiles p on p.id=m.user_id
  left join score s on s.user_id=m.user_id
  where m.room_id=p_room
 )
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'points',points,'wins',wins,
   'games',games,'nickname',nickname) order by points desc,wins desc,nickname,id),'[]'::jsonb)
 into answer from players;
 return answer;
end;
$body$;
revoke all on function public.es_v81_room_ranking(uuid) from public,anon;
grant execute on function public.es_v81_room_ranking(uuid) to authenticated;
