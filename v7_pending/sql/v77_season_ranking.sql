-- V7.7 STAGED ONLY — seasonal leaderboard without modifying lifetime ranking.
-- UTC calendar quarters, public rounds only, and only finished rounds with recorded votes.
-- Season score is recomputed from historical match results: +25 win / -25 loss.
create or replace function public.es_v77_season_ranking()
returns jsonb language plpgsql stable security definer set search_path = ''
as $v77$
declare
  season_start timestamptz := date_trunc('quarter', now() at time zone 'UTC') at time zone 'UTC';
  season_end timestamptz := season_start + interval '3 months';
  leaders jsonb;
begin
 if (select auth.uid()) is null then raise exception 'Autenticação necessária'; end if;
 with scores as (
  select x.user_id,
   count(*)::integer as games,
   count(*) filter (where x.win)::integer as wins,
   sum(case when x.win then 25 else -25 end)::integer as points
  from public.es_results x
  join public.es_rounds rd on rd.id = x.round_id
  join public.es_rooms rm on rm.id = rd.room_id
  where rm.is_public and rd.finished_at >= season_start
    and rd.finished_at < season_end and rd.finished_at is not null and x.voted
  group by x.user_id
 ), placed as (
  select p.id,p.nickname,p.avatar_url,p.equipped_title,
   s.games,s.wins,s.points,
   dense_rank() over(order by s.points desc,s.wins desc)::integer as position
  from scores s join public.es_profiles p on p.id=s.user_id
 ), top50 as (
  select * from placed order by points desc,wins desc,nickname asc limit 50
 )
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',id,'nickname',nickname,'avatar_url',avatar_url,
  'equipped_title',equipped_title,'games',games,'wins',wins,'points',points,
  'position',position) order by position,nickname),'[]'::jsonb)
 into leaders from top50;
 return jsonb_build_object('starts_at',season_start,'ends_at',season_end,
  'scoring','public_finished_voted_only','win_points',25,'loss_points',-25,
  'players',leaders);
end;
$v77$;
revoke all on function public.es_v77_season_ranking() from public,anon;
grant execute on function public.es_v77_season_ranking() to authenticated;
