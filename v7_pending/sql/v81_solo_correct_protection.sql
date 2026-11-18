-- Entre Suspeitos V8.1: regra de empate individual em pontos de ranking.
-- REVISAR e aplicar em janela controlada. Publico: +25 vitoria, -25 derrota,
-- 0 para comum acusado e derrotado que foi o unico a identificar impostor.
-- Nao altera XP nem win/lose; votos individuais ficam privados.
alter table public.es_results add column if not exists ranking_delta integer;
update public.es_results res
 set ranking_delta=case when rm.is_public then (case when res.win then 25 else -25 end) else 0 end
 from public.es_rounds rd join public.es_rooms rm on rm.id=rd.room_id
 where res.round_id=rd.id and res.ranking_delta is null;
alter table public.es_results alter column ranking_delta set default 0;
alter table public.es_results alter column ranking_delta set not null;

create or replace function public.es_v81_lone_correct(p_round uuid,p_user uuid)
returns boolean language sql stable security definer set search_path=''
as $v81$
 select exists (
   select 1
   from public.es_rounds r
   join public.es_votes mine on mine.round_id=r.id and mine.user_id=p_user
   where r.id=p_round
     and not (p_user = any(r.impostor_ids))
     and exists (
       select 1 from unnest(mine.targets) chosen(target_id)
       where chosen.target_id=any(r.impostor_ids)
         and (select count(*) from public.es_votes others
              where others.round_id=r.id and chosen.target_id=any(others.targets))=1
     )
 );
$v81$;
revoke all on function public.es_v81_lone_correct(uuid,uuid) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.es_finalize(p_room uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r public.es_rooms%rowtype; rd public.es_rounds%rowtype; candidate record; n_active int; n_voted int; slots int;
 discovered uuid[]:='{}'; n_same int; points int; prev int:=null; grp int:=0;
 is_imp boolean; won boolean; voted boolean; protected_loss boolean;correct int; got int;eligible int; v_xp int; team_common boolean; partner_won boolean; v uuid:=public.es_auth();begin
 if not public.es_member(p_room) then raise exception 'Você não faz parte da sala';end if;
 select * into r from public.es_rooms where id=p_room for update;
 if r.status='results' then return true;end if;
 if r.status<>'voting' then return false;end if;
 select * into rd from public.es_rounds where room_id=p_room and round_no=r.round_no;
 select count(*) into n_active from public.es_round_members rm join public.es_members m on m.room_id=p_room and m.user_id=rm.user_id where rm.round_id=rd.id and m.left_at is null ;
 select count(*) into n_voted from public.es_votes v join public.es_members m on m.room_id=p_room and m.user_id=v.user_id where v.round_id=rd.id and m.left_at is null;
 if n_voted<n_active then return false;end if;
 -- Votos de ausentes e não votantes são excluídos; empate pela última vaga não seleciona ninguém daquele grupo.
 select count(*) into slots from unnest(rd.impostor_ids) i where exists(select 1 from public.es_votes v where v.round_id=rd.id and v.user_id=i);
 -- Mantém as vagas originais; desistentes não podem ser escolhidos como suspeitos.
 slots:=r.impostors;
 for candidate in
 select t.user_id,count(*)::int as amount from public.es_votes v cross join lateral unnest(v.targets)t(user_id)
 join public.es_votes vv on vv.round_id=v.round_id and vv.user_id=v.user_id
 where v.round_id=rd.id group by t.user_id order by amount desc
 loop
 if prev is distinct from candidate.amount then
  select count(*) into grp from (select z.user_id,count(*) as cnt from public.es_votes vs cross join lateral unnest(vs.targets)z(user_id)
   where vs.round_id=rd.id group by z.user_id having count(*)=candidate.amount) q;
  if grp>slots then exit;end if;
  slots:=slots-grp;prev:=candidate.amount;
 end if;
 discovered:=array_append(discovered,candidate.user_id);
 if slots=0 and (select count(*) from unnest(discovered))>=r.impostors then exit;end if;
 end loop;
 -- Jogadores comuns só vencem se todos os impostores QUE VOTARAM foram identificados.
 team_common:=not exists(select 1 from unnest(rd.impostor_ids) i
 where exists(select 1 from public.es_votes v where v.round_id=rd.id and v.user_id=i)
 and not(i=any(discovered)));
 for candidate in select rm.user_id from public.es_round_members rm where rm.round_id=rd.id loop
  is_imp:=candidate.user_id=any(rd.impostor_ids);
  voted:=exists(select 1 from public.es_votes v where v.round_id=rd.id and v.user_id=candidate.user_id);
  select count(*)::int into got from public.es_votes v where v.round_id=rd.id and candidate.user_id=any(v.targets);
  select count(*)::int into eligible from public.es_votes v where v.round_id=rd.id and v.user_id<>candidate.user_id;
  won:=voted and exists(select 1 from public.es_members m where m.room_id=p_room and m.user_id=candidate.user_id and m.left_at is null)
   and (case when is_imp then not(candidate.user_id=any(discovered)) else team_common end);
  if not voted then v_xp:=0;
  elsif is_imp then
   v_xp:=case when won then 20+round(130*(1-got::numeric/greatest(1,eligible)))::int else 20+round(30*(1-got::numeric/greatest(1,eligible)))::int end;
   if not won and exists(select 1 from unnest(rd.impostor_ids) i where i<>candidate.user_id and not(i=any(discovered)) and exists(select 1 from public.es_votes where round_id=rd.id and user_id=i)) then
    v_xp:=v_xp+round(v_xp*.10)::int;
   end if;
  else
   select count(*)::int into correct from public.es_votes v cross join lateral unnest(v.targets)t(uid)
   where v.round_id=rd.id and v.user_id=candidate.user_id and t.uid=any(rd.impostor_ids);
   v_xp:=20+15*correct+case when won then 40 else 0 end;
  end if;
  v_xp:=greatest(0,v_xp);
  -- Protecao somente de ranking: inocente acusado, derrotado e unico a votar em impostor verdadeiro.
  protected_loss:=not is_imp and not won and voted and got>0 and public.es_v81_lone_correct(rd.id,candidate.user_id);
  insert into public.es_results(round_id,user_id,is_impostor,win,voted,votes_received,xp_earned,ranking_delta)
  values(rd.id,candidate.user_id,is_imp,won,voted,got,case when r.is_public then v_xp else 0 end,
   case when not r.is_public then 0 when won then 25 when protected_loss then 0 else -25 end);
  update public.es_profiles as prof set
   xp=prof.xp+case when r.is_public then v_xp else 0 end,
   ranking_points=ranking_points+case when not r.is_public then 0 when won then 25 when protected_loss then 0 else -25 end,
   online_wins=online_wins+case when r.is_public and won then 1 else 0 end,
   online_losses=online_losses+case when r.is_public and not won then 1 else 0 end,
   private_wins=private_wins+case when not r.is_public and won then 1 else 0 end,
   private_losses=private_losses+case when not r.is_public and not won then 1 else 0 end,
   impostor_wins=impostor_wins+case when is_imp and won then 1 else 0 end,
   impostor_losses=impostor_losses+case when is_imp and not won then 1 else 0 end,
   common_wins=common_wins+case when not is_imp and won then 1 else 0 end,
   common_losses=common_losses+case when not is_imp and not won then 1 else 0 end
  where id=candidate.user_id;
  -- Progresso e títulos são concedidos somente pelo servidor e apenas em partidas públicas.
  if r.is_public then
    perform public.es_award_progress(candidate.user_id,is_imp,won,got);
  end if;
 end loop;
 update public.es_rounds set finished_at=now() where id=rd.id;
 update public.es_rooms set status='results',phase_ends=null where id=p_room;
 return true;
end$function$
;
CREATE OR REPLACE FUNCTION public.es_v77_season_ranking()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
   sum(x.ranking_delta)::integer as points
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
$function$
;
CREATE OR REPLACE FUNCTION public.es_v77_season_history()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 uid uuid := (select auth.uid());
 current_quarter timestamptz := date_trunc('quarter', now() at time zone 'UTC') at time zone 'UTC';
 result jsonb;
begin
 if uid is null then raise exception 'Autenticação necessária'; end if;
 with periods as (
  select (current_quarter - (g.n * interval '3 months')) as starts_at,
   (current_quarter - ((g.n - 1) * interval '3 months')) as ends_at
  from generate_series(1,3) as g(n)
 ), scores as (
  select pr.starts_at, x.user_id,
   count(*)::integer as games,
   count(*) filter(where x.win)::integer as wins,
   sum(x.ranking_delta)::integer as points
  from periods pr
  join public.es_rounds rd on rd.finished_at>=pr.starts_at
    and rd.finished_at<pr.ends_at and rd.finished_at is not null
  join public.es_rooms rm on rm.id=rd.room_id and rm.is_public
  join public.es_results x on x.round_id=rd.id and x.voted
  group by pr.starts_at,x.user_id
 ), placed as (
  select s.*,dense_rank() over(partition by s.starts_at order by s.points desc,s.wins desc)::integer as position
  from scores s
 )
 select coalesce(jsonb_agg(
   jsonb_build_object(
    'starts_at',pr.starts_at,'ends_at',pr.ends_at,
    'champions',coalesce((
      select jsonb_agg(jsonb_build_object('position',z.position,'nickname',p.nickname,'id',p.id,'points',z.points)
       order by z.position,p.nickname)
      from placed z join public.es_profiles p on p.id=z.user_id
      where z.starts_at=pr.starts_at and z.position<=3
    ),'[]'::jsonb),
    'my_position',(select z.position from placed z where z.starts_at=pr.starts_at and z.user_id=uid),
    'my_points',(select z.points from placed z where z.starts_at=pr.starts_at and z.user_id=uid)
   ) order by pr.starts_at desc),'[]'::jsonb)
 into result from periods pr;
 return result;
end;
$function$
;
