-- V8.3: backward-compatible visual character preference and 30-player rooms.
-- No votes, score or user accounts are rewritten. Existing users default to 'm'.
alter table public.es_profiles add column if not exists arena_gender text not null default 'm';
alter table public.es_profiles drop constraint if exists es_profiles_arena_gender_check;
alter table public.es_profiles add constraint es_profiles_arena_gender_check check(arena_gender in ('m','f'));
create or replace function public.es_set_arena_gender(p_gender text)
returns void language plpgsql security definer set search_path to ''
as $gender$
begin
 if auth.uid() is null then raise exception 'Entre na sua conta';end if;
 if p_gender not in ('m','f') or p_gender is null then raise exception 'Selecione masculino ou feminino';end if;
 update public.es_profiles set arena_gender=p_gender where id=auth.uid();
 if not found then raise exception 'Conta não encontrada';end if;
end;
$gender$;
revoke all on function public.es_set_arena_gender(text) from public,anon;
grant execute on function public.es_set_arena_gender(text) to authenticated;

alter table public.es_rooms drop constraint if exists es_rooms_max_players_check;
alter table public.es_rooms add constraint es_rooms_max_players_check
 check(max_players between 3 and 30);

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
 if p_max not between 3 and 30 or p_impostors<1 or p_impostors>floor((p_max-1)/2)::int then raise exception 'Número de jogadores ou impostores inválido';end if;
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

CREATE OR REPLACE FUNCTION public.es_rules(p_room uuid, p_max integer, p_impostors integer, p_categories text[], p_difficulty text, p_clue text, p_know boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n int;begin
 if not exists(select 1 from public.es_rooms where id=p_room and owner_id=public.es_auth() and status='lobby') then raise exception 'Somente o anfitrião pode mudar regras no lobby';end if;
 select count(*) into n from public.es_members where room_id=p_room and left_at is null;
 if p_max not between greatest(3,n) and 30 or p_impostors<1 or p_impostors>floor((p_max-1)/2)::int
 or coalesce(array_length(p_categories,1),0)<1 or p_difficulty not in ('Fácil','Médio','Difícil','Misturado')
 or p_clue not in ('both','category','hint','none') then raise exception 'Configuração inválida';end if;
 update public.es_rooms set max_players=p_max,impostors=p_impostors,categories=p_categories,difficulty=p_difficulty,clue_mode=p_clue,impostors_know=p_know where id=p_room;
 update public.es_members set ready=false where room_id=p_room and left_at is null;
end$function$

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
 select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'nick',p.nickname,'avatar',p.avatar_url,'title',p.equipped_title,'gender',coalesce(p.arena_gender,'m'),'frame',coalesce(p.equipped_frame,'classica'),'banner',coalesce(p.equipped_banner,'padrao'),'ready',m.ready,'voted',exists(select 1 from public.es_votes ev join public.es_rounds er on er.id=ev.round_id where er.room_id=p_room and er.round_no=r.round_no and ev.user_id=m.user_id),'active',m.left_at is null,'online',m.seen_at>now()-interval '20 seconds') order by m.joined_at),'[]') into people
 from public.es_members m join public.es_profiles p on p.id=m.user_id where m.room_id=p_room;
 if r.status<>'lobby' then
 select * into rd from public.es_rounds where room_id=p_room and round_no=r.round_no;
 if found then
 select * into w from public.es_words where id=rd.word_id;
 if r.status='results' then
  select coalesce(jsonb_agg(jsonb_build_object('user',x.user_id,'impostor',x.is_impostor,'win',x.win,'xp',x.xp_earned,'votes',x.votes_received)),'[]') into results
  from public.es_results x where x.round_id=rd.id;
  me=jsonb_build_object('word',w.word,'category',w.category,'impostors',rd.impostor_ids,
   'ranking_delta',(select x.ranking_delta from public.es_results x where x.round_id=rd.id and x.user_id=v));
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

