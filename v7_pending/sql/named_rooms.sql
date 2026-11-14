alter table public.es_rooms add column room_name text check(room_name is null or char_length(room_name) between 3 and 50);
alter table public.es_rooms add column creator_id uuid references public.es_profiles(id) on delete set null;
CREATE OR REPLACE FUNCTION public.es_create(p_public boolean, p_max integer, p_impostors integer, p_categories text[], p_difficulty text, p_clue text, p_know boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v uuid:=public.es_auth(); r uuid; code text; tries int:=0;begin
 if (select count(*) from public.es_rooms where owner_id=v and status='lobby')>=4 then
   raise exception 'Você já possui quatro salas aguardando jogadores';
 end if;
 if p_max not between 3 and 10 or p_impostors<1 or p_impostors>floor((p_max-1)/2)::int then raise exception 'Número de jogadores ou impostores inválido';end if;
 if p_difficulty not in ('Fácil','Médio','Difícil','Misturado') or p_clue not in ('both','category','hint','none') then raise exception 'Regras inválidas';end if;
 if coalesce(array_length(p_categories,1),0)<1 then raise exception 'Selecione categorias';end if;
 loop
 code:=upper(substr(encode(extensions.gen_random_bytes(5),'hex'),1,6));
 begin
 insert into public.es_rooms(code,owner_id,creator_id,is_public,max_players,impostors,categories,difficulty,clue_mode,impostors_know)
 values(code,v,v,p_public,p_max,p_impostors,p_categories,p_difficulty,p_clue,p_know) returning id into r;
 exit;
 exception when unique_violation then tries:=tries+1;if tries>8 then raise;end if;
 end;
 end loop;
 insert into public.es_members(room_id,user_id) values(r,v);
 return r;
end$function$
;
create or replace function public.es_create_named(p_public boolean,p_max integer,p_impostors integer,p_categories text[],p_difficulty text,p_clue text,p_know boolean,p_name text) returns uuid language plpgsql security definer set search_path=public as $$
declare room_id uuid; clean_name text:=nullif(btrim(regexp_replace(coalesce(p_name,''),'[[:space:]]+',' ','g')),'');
begin
 perform public.es_auth();
 if clean_name is not null and (char_length(clean_name)<3 or char_length(clean_name)>50 or clean_name ~ '[[:cntrl:]]') then raise exception 'Use de 3 a 50 caracteres no nome da sala'; end if;
 room_id:=public.es_create(p_public,p_max,p_impostors,p_categories,p_difficulty,p_clue,p_know);
 update public.es_rooms set room_name=clean_name where id=room_id;
 return room_id;
end $$;
revoke all on function public.es_create_named(boolean,integer,integer,text[],text,text,boolean,text) from public,anon;
grant execute on function public.es_create_named(boolean,integer,integer,text[],text,text,boolean,text) to authenticated;
CREATE OR REPLACE FUNCTION public.es_public_rooms()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]'::jsonb)
 from (select r.id,r.code,coalesce(r.room_name,'Sala de '||coalesce(p.nickname,'jogador')) as name,c.nickname as creator_name,p.nickname as owner_name,r.max_players,r.impostors,r.difficulty,r.categories,r.clue_mode,r.impostors_know,r.created_at,
 (select count(*) from public.es_members m where m.room_id=r.id and m.left_at is null) as players
 from public.es_rooms r left join public.es_profiles p on p.id=r.owner_id left join public.es_profiles c on c.id=r.creator_id where r.is_public=true and r.status='lobby' order by r.created_at desc limit 60) t;
$function$
;
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
 return jsonb_build_object('id',r.id,'code',r.code,'name',coalesce(r.room_name,'Sala de '||coalesce((select nickname from public.es_profiles where id=r.owner_id),'jogador')),'creatorName',(select nickname from public.es_profiles where id=r.creator_id),'owner',r.owner_id,'public',r.is_public,'status',r.status,
 'max',r.max_players,'impostors',r.impostors,'categories',r.categories,'difficulty',r.difficulty,
 'clue',r.clue_mode,'know',r.impostors_know,'phaseEnds',r.phase_ends,'revealEnds',case when r.status='discussion' then r.phase_ends else null end,'round',r.round_no,
 'players',people,'me',me,'starter',case when r.status='lobby' then null else rd.starter_id end,'results',results);
end$function$
;
