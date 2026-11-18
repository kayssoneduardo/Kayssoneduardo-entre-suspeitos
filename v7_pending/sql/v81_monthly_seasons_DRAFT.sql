-- V8.1 MONTHLY SEASONS — REVIEW ONLY, NOT APPLIED.
-- Tournament clock: America/Fortaleza; 2026-11-30 has 30 days.
-- Existing lifetime points and prior quarterly functions are left untouched.
create table if not exists public.es_v81_monthly_podium (
 month_start date not null,
 position integer not null check(position between 1 and 3),
 user_id uuid not null references public.es_profiles(id),
 nickname_at_close text not null,
 points integer not null,
 wins integer not null,
 sealed_at timestamptz not null default now(),
 primary key(month_start,position)
);
alter table public.es_v81_monthly_podium enable row level security;
revoke all on public.es_v81_monthly_podium from public,anon,authenticated;
grant select on public.es_v81_monthly_podium to service_role;
grant insert on public.es_v81_monthly_podium to service_role;

create or replace function public.es_v81_monthly_ranking()
returns jsonb language plpgsql stable security definer set search_path to ''
as $monthly$
declare local_start timestamp := date_trunc('month',now() at time zone 'America/Fortaleza');
        starts timestamptz := local_start at time zone 'America/Fortaleza';
        ends timestamptz := (local_start+interval '1 month') at time zone 'America/Fortaleza';
        leaders jsonb;
begin
 if auth.uid() is null then raise exception 'Autenticação necessária';end if;
 with score as (
  select x.user_id,count(*)::integer games,count(*) filter(where x.win)::integer wins,
         sum(x.ranking_delta)::integer points
  from public.es_results x
  join public.es_rounds rd on rd.id=x.round_id
  join public.es_rooms rm on rm.id=rd.room_id and rm.is_public
  where x.voted and rd.finished_at>=starts and rd.finished_at<ends
  group by x.user_id
 ), board as (
  select p.id,p.nickname,p.avatar_url,p.equipped_title,
    s.games,s.wins,s.points,
    row_number() over(order by s.points desc,s.wins desc,p.nickname,p.id)::integer position
  from score s join public.es_profiles p on p.id=s.user_id
 )
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'nickname',nickname,
  'avatar_url',avatar_url,'equipped_title',equipped_title,'games',games,
  'wins',wins,'points',points,'position',position) order by position),'[]'::jsonb)
 into leaders from board where position<=50;
 return jsonb_build_object('starts_at',starts,'ends_at',ends,
  'timezone','America/Fortaleza','scoring','public_finished_voted_only',
  'win_points',25,'loss_points',-25,'players',leaders);
end;
$monthly$;
revoke all on function public.es_v81_monthly_ranking() from public,anon;
grant execute on function public.es_v81_monthly_ranking() to authenticated;

-- Called exactly once after a month closes, by service_role / scheduler.
-- Unique (month,position) and ON CONFLICT guarantee idempotent snapshots.
create or replace function public.es_v81_snapshot_month(p_month date)
returns integer language plpgsql security definer set search_path to ''
as $seal$
declare local_start timestamp:=date_trunc('month',p_month::timestamp);
        starts timestamptz:=local_start at time zone 'America/Fortaleza';
        ends timestamptz:=(local_start+interval '1 month') at time zone 'America/Fortaleza';
        inserted integer;
begin
 if date_trunc('month',p_month::timestamp)::date<>p_month
  or ends>now() then raise exception 'Somente meses integralmente encerrados';end if;
 with scores as (
  select x.user_id,count(*) filter(where x.win)::integer wins,
    sum(x.ranking_delta)::integer points
  from public.es_results x
  join public.es_rounds rd on rd.id=x.round_id
  join public.es_rooms rm on rm.id=rd.room_id and rm.is_public
  where x.voted and rd.finished_at>=starts and rd.finished_at<ends
  group by x.user_id
 ), board as (
  select p.id,p.nickname,s.wins,s.points,
  row_number() over(order by s.points desc,s.wins desc,p.nickname,p.id)::integer pos
  from scores s join public.es_profiles p on p.id=s.user_id
 )
 insert into public.es_v81_monthly_podium(month_start,position,user_id,nickname_at_close,points,wins)
 select p_month,pos,id,nickname,points,wins from board where pos<=3
 on conflict(month_start,position) do nothing;
 get diagnostics inserted=row_count;
 return inserted;
end;
$seal$;
revoke all on function public.es_v81_snapshot_month(date) from public,anon,authenticated;
grant execute on function public.es_v81_snapshot_month(date) to service_role;

create or replace function public.es_v81_monthly_history()
returns jsonb language plpgsql stable security definer set search_path to ''
as $history$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Autenticação necessária';end if;
 select coalesce(jsonb_agg(jsonb_build_object('starts_at',s.month_start,
  'ends_at',(s.month_start::timestamp+interval '1 month') at time zone 'America/Fortaleza',
  'champions',s.champions) order by s.month_start desc),'[]'::jsonb)
 into result from (
  select month_start,jsonb_agg(jsonb_build_object('id',user_id,'nickname',
    nickname_at_close,'position',position,'points',points,'wins',wins)
    order by position) champions
  from public.es_v81_monthly_podium group by month_start
  order by month_start desc limit 24
 ) s;
 return result;
end;
$history$;
revoke all on function public.es_v81_monthly_history() from public,anon;
grant execute on function public.es_v81_monthly_history() to authenticated;

-- A scheduler/job must call es_v81_snapshot_month() after each monthly
-- rollover. Do not activate without verifying grants, RLS and date boundaries.
