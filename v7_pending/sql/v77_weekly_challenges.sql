-- STAGED V7.7. No direct client writes. All progress comes from finished public matches with vote.
create table if not exists public.es_v77_weekly_claims (
 user_id uuid not null references public.es_profiles(id) on delete cascade,
 week_start timestamptz not null,
 code text not null check(code in ('semana_partidas','semana_vitorias','semana_impostor')),
 xp_awarded integer not null check(xp_awarded in (20,30)),
 claimed_at timestamptz not null default now(),
 primary key(user_id,week_start,code)
);
alter table public.es_v77_weekly_claims enable row level security;
revoke all on public.es_v77_weekly_claims from public,anon,authenticated;

create or replace function public.es_v77_weekly_challenges()
returns jsonb language plpgsql stable security definer set search_path = ''
as $v77$
declare
 uid uuid := (select auth.uid());
 week_begin timestamptz := date_trunc('week',now() at time zone 'UTC') at time zone 'UTC';
 week_finish timestamptz := week_begin+interval '7 days';
 games integer; wins integer; impostor_wins integer; claims text[];
begin
 if uid is null then raise exception 'Autenticação necessária'; end if;
 select count(*)::integer,count(*) filter(where x.win)::integer,
  count(*) filter(where x.win and x.is_impostor)::integer
 into games,wins,impostor_wins
 from public.es_results x
 join public.es_rounds rd on rd.id=x.round_id
 join public.es_rooms rm on rm.id=rd.room_id
 where x.user_id=uid and rm.is_public and x.voted and rd.finished_at is not null
  and rd.finished_at>=week_begin and rd.finished_at<week_finish;
 select coalesce(array_agg(code),'{}'::text[]) into claims
 from public.es_v77_weekly_claims
 where user_id=uid and week_start=week_begin;
 return jsonb_build_array(
 jsonb_build_object('code','semana_partidas','title','Investigador da semana','description','Conclua 4 partidas públicas com voto','progress',least(games,4),'target',4,'reward_xp',20,'claimed','semana_partidas'=any(claims),'week_ends_at',week_finish),
 jsonb_build_object('code','semana_vitorias','title','Olho atento','description','Vença 2 partidas públicas com voto','progress',least(wins,2),'target',2,'reward_xp',30,'claimed','semana_vitorias'=any(claims),'week_ends_at',week_finish),
 jsonb_build_object('code','semana_impostor','title','Sombra vencedora','description','Vença 1 partida como impostor','progress',least(impostor_wins,1),'target',1,'reward_xp',30,'claimed','semana_impostor'=any(claims),'week_ends_at',week_finish)
 );
end;
$v77$;
revoke all on function public.es_v77_weekly_challenges() from public,anon;
grant execute on function public.es_v77_weekly_challenges() to authenticated;

create or replace function public.es_v77_weekly_claim(p_code text)
returns jsonb language plpgsql volatile security definer set search_path = ''
as $v77$
declare
 uid uuid := (select auth.uid());
 week_begin timestamptz := date_trunc('week',now() at time zone 'UTC') at time zone 'UTC';
 week_finish timestamptz := week_begin+interval '7 days';
 progress_count integer; target_count integer; reward integer; inserted integer;
begin
 if uid is null then raise exception 'Autenticação necessária'; end if;
 if p_code='semana_partidas' then
   target_count:=4;reward:=20;
 elsif p_code='semana_vitorias' then
   target_count:=2;reward:=30;
 elsif p_code='semana_impostor' then
   target_count:=1;reward:=30;
 else raise exception 'Desafio semanal inválido';
 end if;
 select count(*)::integer into progress_count
 from public.es_results x
 join public.es_rounds rd on rd.id=x.round_id
 join public.es_rooms rm on rm.id=rd.room_id
 where x.user_id=uid and x.voted and rm.is_public
   and rd.finished_at>=week_begin and rd.finished_at<week_finish
   and (p_code='semana_partidas' or
        (p_code='semana_vitorias' and x.win) or
        (p_code='semana_impostor' and x.win and x.is_impostor));
 if progress_count<target_count then raise exception 'Desafio ainda não concluído'; end if;
 insert into public.es_v77_weekly_claims(user_id,week_start,code,xp_awarded)
 values(uid,week_begin,p_code,reward) on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted=0 then raise exception 'Recompensa já resgatada'; end if;
 update public.es_profiles set xp=xp+reward where id=uid;
 if not found then raise exception 'Perfil não encontrado'; end if;
 return jsonb_build_object('code',p_code,'xp_awarded',reward,'claimed',true,'week_ends_at',week_finish);
end;
$v77$;
revoke all on function public.es_v77_weekly_claim(text) from public,anon;
grant execute on function public.es_v77_weekly_claim(text) to authenticated;
