-- V7.4: preserve already-cast vote when a user briefly disconnects before results.
CREATE OR REPLACE FUNCTION public.es_finalize(p_room uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r public.es_rooms%rowtype; rd public.es_rounds%rowtype; candidate record; n_active int; n_voted int; slots int;
 discovered uuid[]:='{}'; n_same int; points int; prev int:=null; grp int:=0;
 is_imp boolean; won boolean; voted boolean;correct int; got int;eligible int; v_xp int; team_common boolean; partner_won boolean; v uuid:=public.es_auth();begin
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
  insert into public.es_results(round_id,user_id,is_impostor,win,voted,votes_received,xp_earned)
  values(rd.id,candidate.user_id,is_imp,won,voted,got,case when r.is_public then v_xp else 0 end);
  update public.es_profiles as prof set
   xp=prof.xp+case when r.is_public then v_xp else 0 end,
   ranking_points=ranking_points+case when not r.is_public then 0 when won then 25 else -25 end,
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
