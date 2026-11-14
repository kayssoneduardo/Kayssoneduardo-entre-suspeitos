CREATE OR REPLACE FUNCTION public.es_room_view(p_room uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r public.es_rooms%rowtype;rd public.es_rounds%rowtype; w public.es_words%rowtype;v uuid:=public.es_auth();
 j jsonb; people jsonb;me jsonb:='{}';results jsonb:='[]';begin
 if not public.es_member(p_room) then raise exception 'Você não faz parte da sala';end if;
 select * into r from public.es_rooms where id=p_room;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'nick',p.nickname,'avatar',p.avatar_url,'title',p.equipped_title,'ready',m.ready,'voted',exists(select 1 from public.es_votes ev join public.es_rounds er on er.id=ev.round_id where er.room_id=p_room and er.round_no=r.round_no and ev.user_id=m.user_id),'active',m.left_at is null,'online',m.seen_at>now()-interval '20 seconds') order by m.joined_at),'[]') into people
 from public.es_members m join public.es_profiles p on p.id=m.user_id where m.room_id=p_room;
 if r.status<>'lobby' then
 select * into rd from public.es_rounds where room_id=p_room and round_no=r.round_no;
 if found then
 select * into w from public.es_words where id=rd.word_id;
 if r.status='results' then
  select coalesce(jsonb_agg(jsonb_build_object('user',x.user_id,'impostor',x.is_impostor,'win',x.win,'xp',x.xp_earned,'votes',x.votes_received)),'[]') into results
  from public.es_results x where x.round_id=rd.id;
  me=jsonb_build_object('word',w.word,'category',w.category,'impostors',rd.impostor_ids);
 else
  me=jsonb_build_object('impostor',v=any(rd.impostor_ids),
   'category',case when v<>all(rd.impostor_ids) or r.clue_mode in ('both','category') then w.category else null end,
   'hint',case when v=any(rd.impostor_ids) and r.clue_mode in ('both','hint') and w.category <> 'Pessoas de Loreto' then w.hint else null end,
   'word',case when v<>all(rd.impostor_ids) then w.word else null end,
   'partners',case when v=any(rd.impostor_ids) and r.impostors_know then to_jsonb(array_remove(rd.impostor_ids,v)) else '[]'::jsonb end,
   'voted',exists(select 1 from public.es_votes where round_id=rd.id and user_id=v));
 end if;
 end if;
 end if;
 return jsonb_build_object('id',r.id,'code',r.code,'owner',r.owner_id,'public',r.is_public,'status',r.status,
 'max',r.max_players,'impostors',r.impostors,'categories',r.categories,'difficulty',r.difficulty,
 'clue',r.clue_mode,'know',r.impostors_know,'phaseEnds',r.phase_ends,'revealEnds',case when r.status='discussion' then r.phase_ends else null end,'round',r.round_no,
 'players',people,'me',me,'starter',case when r.status='lobby' then null else rd.starter_id end,'results',results);
end$function$

