
-- Entre Suspeitos V7.4: additive-only features. Never modify existing ranking/finalize logic.
alter table public.es_profiles add column if not exists equipped_frame text;

create table if not exists public.es_v74_events (
  code text primary key,
  name text not null,
  description text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  target integer not null check(target > 0),
  reward_frame text,
  check(ends_at > starts_at)
);
alter table public.es_v74_events enable row level security;
revoke all on public.es_v74_events from public, anon, authenticated;

insert into public.es_v74_events(code,name,description,starts_at,ends_at,target,reward_frame)
values ('nevoa_2026','Operação Névoa','Conclua cinco partidas públicas durante o evento.', '2026-11-14T00:00:00-03:00','2026-12-01T00:00:00-03:00',5,'nevoa')
on conflict(code) do nothing;

create or replace function public.es_v74_stats()
returns jsonb language sql stable security definer set search_path=''
as $$
with mine as (
 select res.*, rd.finished_at, rd.impostor_ids, rm.is_public,rd.id as round_id, 
  (select count(*) from unnest(coalesce(v.targets,'{}'::uuid[])) t where t=any(rd.impostor_ids)) as hits
 from public.es_results res
 join public.es_rounds rd on rd.id=res.round_id and rd.finished_at is not null
 join public.es_rooms rm on rm.id=rd.room_id
 left join public.es_votes v on v.round_id=rd.id and v.user_id=res.user_id
 where res.user_id=auth.uid()
)
select jsonb_build_object(
 'games',count(*),
 'wins',count(*) filter(where win),
 'losses',count(*) filter(where not win),
 'public_games',count(*) filter(where is_public),
 'private_games',count(*) filter(where not is_public),
 'impostor_games',count(*) filter(where is_impostor),
 'impostor_wins',count(*) filter(where is_impostor and win),
 'common_games',count(*) filter(where not is_impostor),
 'common_wins',count(*) filter(where not is_impostor and win),
 'votes_cast',count(*) filter(where voted),
 'correct_votes',coalesce(sum(hits) filter(where not is_impostor),0),
 'votes_received',coalesce(sum(votes_received),0),
 'win_rate',case when count(*)=0 then 0 else round(100*count(*) filter(where win)/count(*)::numeric,1) end,
 'recent',coalesce((select jsonb_agg(to_jsonb(t) order by t.finished_at desc) from (
 select round_id,finished_at,is_public,is_impostor,win,voted,votes_received,xp_earned,hits from mine order by finished_at desc limit 10
 ) t),'[]'::jsonb)
) from mine;
$$;

create or replace function public.es_v74_missions()
returns jsonb language sql stable security definer set search_path=''
as $$
with bounds as (
 select date_trunc('day',now() at time zone 'UTC') at time zone 'UTC' as d0,
        date_trunc('week',now() at time zone 'UTC') at time zone 'UTC' as w0
), games as (
 select rd.finished_at,res.win,res.is_impostor,res.voted
 from public.es_results res join public.es_rounds rd on rd.id=res.round_id
 join public.es_rooms rm on rm.id=rd.room_id 
 where res.user_id=auth.uid() and rm.is_public and rd.finished_at is not null
), missions as (
 select 'daily_play' code,'Diária' period,'Jogue 3 partidas públicas' title,3 target,count(*) filter(where g.finished_at>=b.d0) progress, b.d0 renews_from,b.d0+interval '1 day' renews_at from bounds b left join games g on true group by b.d0
 union all
 select 'daily_win','Diária','Vença 1 partida pública',1,count(*) filter(where g.finished_at>=b.d0 and g.win),b.d0,b.d0+interval '1 day' from bounds b left join games g on true group by b.d0
 union all
 select 'weekly_play','Semanal','Jogue 10 partidas públicas',10,count(*) filter(where g.finished_at>=b.w0),b.w0,b.w0+interval '7 days' from bounds b left join games g on true group by b.w0
 union all
 select 'weekly_impostor','Semanal','Vença 3 vezes como impostor',3,count(*) filter(where g.finished_at>=b.w0 and g.is_impostor and g.win),b.w0,b.w0+interval '7 days' from bounds b left join games g on true group by b.w0
)
select coalesce(jsonb_agg(jsonb_build_object('code',code,'period',period,'title',title,'target',target,'progress',least(progress,target),'complete',progress>=target,'renews_at',renews_at) order by code),'[]'::jsonb) from missions;
$$;

create or replace function public.es_v74_events_list()
returns jsonb language sql stable security definer set search_path=''
as $$
select coalesce(jsonb_agg(jsonb_build_object(
 'code',e.code,'name',e.name,'description',e.description,'starts_at',e.starts_at,'ends_at',e.ends_at,'target',e.target,
 'progress',(select count(*) from public.es_results res join public.es_rounds rd on rd.id=res.round_id join public.es_rooms rm on rm.id=rd.room_id where res.user_id=auth.uid() and rd.finished_at between e.starts_at and e.ends_at and rm.is_public),
 'active',now()>=e.starts_at and now()<e.ends_at,
 'reward_frame',e.reward_frame
) order by e.starts_at desc),'[]'::jsonb)
from public.es_v74_events e where e.ends_at>=now()-interval '14 days';
$$;

create or replace function public.es_v74_frames()
returns jsonb language sql stable security definer set search_path=''
as $$
with wins as (
 select count(*) n from public.es_results res join public.es_rounds rd on rd.id=res.round_id join public.es_rooms rm on rm.id=rd.room_id
 where res.user_id=auth.uid() and rd.finished_at is not null and rm.is_public and res.win
), items as (
 select 'classica' code,'Clássica' name,0 required,true unlocked
 union all
 select 'bronze','Vigilante Bronze',5,(select n>=5 from wins)
 union all
 select 'ouro','Olhar de Ouro',20,(select n>=20 from wins)
 union all
 select 'nevoa','Névoa',0,exists(
  select 1 from public.es_results res join public.es_rounds rd on rd.id=res.round_id join public.es_rooms rm on rm.id=rd.room_id join public.es_v74_events ev on ev.code='nevoa_2026'
  where res.user_id=auth.uid() and rm.is_public and rd.finished_at between ev.starts_at and ev.ends_at
  group by ev.target having count(*)>=ev.target)
)
select coalesce(jsonb_agg(jsonb_build_object('code',i.code,'name',i.name,'required',i.required,'unlocked',i.unlocked,'equipped',i.code=coalesce(p.equipped_frame,'classica')) order by i.required,i.code),'[]'::jsonb)
from items i left join public.es_profiles p on p.id=auth.uid();
$$;

create or replace function public.es_v74_equip_frame(p_frame text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Autenticação obrigatória'; end if;
 if p_frame not in ('classica','bronze','ouro','nevoa') then raise exception 'Moldura desconhecida';end if;
 if not exists(select 1 from jsonb_array_elements(public.es_v74_frames()) f where f->>'code'=p_frame and (f->>'unlocked')::boolean) then raise exception 'Moldura ainda não conquistada';end if;
 update public.es_profiles set equipped_frame=p_frame where id=uid;
 return found;
end;
$$;

revoke all on function public.es_v74_stats() from public,anon;
revoke all on function public.es_v74_missions() from public,anon;
revoke all on function public.es_v74_events_list() from public,anon;
revoke all on function public.es_v74_frames() from public,anon;
revoke all on function public.es_v74_equip_frame(text) from public,anon;
grant execute on function public.es_v74_stats(),public.es_v74_missions(),public.es_v74_events_list(),public.es_v74_frames(),public.es_v74_equip_frame(text) to authenticated;
