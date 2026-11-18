-- STAGED ONLY - NAO APLICAR antes de instalar voz escalavel e testar 30 celulares.
-- Hoje a voz WebRTC faz conexao ponto a ponto com N-1 participantes.
alter table public.es_rooms drop constraint if exists es_rooms_max_players_check;
alter table public.es_rooms add constraint es_rooms_max_players_check check(max_players between 3 and 30);
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
 if p_max not between 3 and 30 or p_impostors<1 or p_impostors>10 or p_impostors>floor((p_max-1)/2)::int then raise exception 'Número de jogadores ou impostores inválido';end if;
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
CREATE OR REPLACE FUNCTION public.es_rules(p_room uuid, p_max integer, p_impostors integer, p_categories text[], p_difficulty text, p_clue text, p_know boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n int;begin
 if not exists(select 1 from public.es_rooms where id=p_room and owner_id=public.es_auth() and status='lobby') then raise exception 'Somente o anfitrião pode mudar regras no lobby';end if;
 select count(*) into n from public.es_members where room_id=p_room and left_at is null;
 if p_max not between greatest(3,n) and 30 or p_impostors<1 or p_impostors>10 or p_impostors>floor((p_max-1)/2)::int
 or coalesce(array_length(p_categories,1),0)<1 or p_difficulty not in ('Fácil','Médio','Difícil','Misturado')
 or p_clue not in ('both','category','hint','none') then raise exception 'Configuração inválida';end if;
 update public.es_rooms set max_players=p_max,impostors=p_impostors,categories=p_categories,difficulty=p_difficulty,clue_mode=p_clue,impostors_know=p_know where id=p_room;
 update public.es_members set ready=false where room_id=p_room and left_at is null;
end$function$
;
