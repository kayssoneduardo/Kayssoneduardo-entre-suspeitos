-- V7.5 STAGED — do not execute in production before publishing gate.
-- Public profiles expose only gameplay cosmetics and public-match totals.
create or replace function public.es_v75_public_profile(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); profile jsonb;
begin
 if uid is null then raise exception 'Entre na conta'; end if;
 if p_user is null then raise exception 'Jogador inválido'; end if;
 select jsonb_build_object(
  'id',p.id,'nickname',p.nickname,'avatar_url',p.avatar_url,
  'equipped_frame',coalesce(p.equipped_frame,'classica'),
  'equipped_banner',coalesce(p.equipped_banner,'padrao'),
  'equipped_title',p.equipped_title,
  'xp',p.xp,'ranking_points',p.ranking_points,
  'online_wins',p.online_wins,'online_losses',p.online_losses
 ) into profile from public.es_profiles p where p.id=p_user;
 if profile is null then raise exception 'Jogador não encontrado'; end if;
 return profile;
end;
$$;
revoke all on function public.es_v75_public_profile(uuid) from public,anon;
grant execute on function public.es_v75_public_profile(uuid) to authenticated;

-- Read-only enriched leaderboard: ids allow opening another player's public profile.
-- Rankings are still ordered by the same points/wins as the existing function.
create or replace function public.es_v75_leaderboard()
returns jsonb language plpgsql stable security definer set search_path=''
as $
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Entre na conta'; end if;
 select coalesce(jsonb_agg(to_jsonb(t) order by t.ranking_points desc,t.online_wins desc,t.nickname),'[]'::jsonb)
 into result from (
  select p.id,p.nickname,p.avatar_url,p.equipped_title,p.ranking_points,
   p.online_wins,p.online_losses,p.xp
  from public.es_profiles p
  order by p.ranking_points desc,p.online_wins desc,p.nickname limit 50
 ) t;
 return result;
end;
$;
revoke all on function public.es_v75_leaderboard() from public,anon;
grant execute on function public.es_v75_leaderboard() to authenticated;

-- One event reward per player and event; no ranking point changes.
create table if not exists public.es_v75_event_claims (
 user_id uuid not null references auth.users(id) on delete cascade,
 event_code text not null references public.es_v74_events(code),
 xp_awarded integer not null check(xp_awarded between 1 and 200),
 claimed_at timestamptz not null default now(),
 primary key(user_id,event_code)
);
alter table public.es_v75_event_claims enable row level security;
revoke all on public.es_v75_event_claims from public,anon,authenticated;

-- Event begins after Operation Nebula ends; no changes to existing event rewards.
insert into public.es_v74_events
 (code,name,description,starts_at,ends_at,target,reward_frame)
values ('noite_dos_suspeitos_2026','Noite dos Suspeitos',
 'Participe de oito partidas públicas com voto registrado para resgatar 60 XP extras.',
 '2026-12-01T00:00:00-03:00','2026-12-16T00:00:00-03:00',8,null)
on conflict (code) do nothing;

create or replace function public.es_v75_event_claims()
returns jsonb language sql stable security definer set search_path=''
as $$
select coalesce(jsonb_agg(jsonb_build_object('code',event_code,
 'xp_awarded',xp_awarded,'claimed_at',claimed_at) order by claimed_at desc),'[]'::jsonb)
from public.es_v75_event_claims where user_id=auth.uid() and auth.uid() is not null;
$$;
revoke all on function public.es_v75_event_claims() from public,anon;
grant execute on function public.es_v75_event_claims() to authenticated;

create or replace function public.es_v75_event_claim(p_code text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); e record; played bigint; inserted integer:=0;
begin
 if uid is null then raise exception 'Entre na conta'; end if;
 if p_code <> 'noite_dos_suspeitos_2026' then raise exception 'Evento sem recompensa resgatável'; end if;
 select * into e from public.es_v74_events where code=p_code;
 if not found then raise exception 'Evento não encontrado'; end if;
 if now()<e.starts_at then raise exception 'Evento ainda não começou'; end if;
 -- Claimed results from past events remain claimable; never count unfinished games.
 select count(distinct rd.id) into played
 from public.es_results res
 join public.es_rounds rd on rd.id=res.round_id
 join public.es_rooms rm on rm.id=rd.room_id
 where res.user_id=uid and res.voted and rm.is_public and rd.finished_at is not null
  and rd.finished_at>=e.starts_at and rd.finished_at<e.ends_at;
 if played<e.target then raise exception 'Missão do evento não concluída'; end if;
 insert into public.es_v75_event_claims(user_id,event_code,xp_awarded)
 values(uid,e.code,60) on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted=0 then raise exception 'Recompensa do evento já resgatada'; end if;
 update public.es_profiles set xp=xp+60 where id=uid;
 if not found then raise exception 'Perfil não encontrado'; end if;
 return jsonb_build_object('code',e.code,'xp_awarded',60,'claimed',true);
end;
$$;
revoke all on function public.es_v75_event_claim(text) from public,anon;
grant execute on function public.es_v75_event_claim(text) to authenticated;
