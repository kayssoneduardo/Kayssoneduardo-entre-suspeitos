
create table if not exists public.es_v74_mission_claims(
 user_id uuid not null references auth.users(id) on delete cascade,
 mission_code text not null,
 period_end timestamptz not null,
 xp_awarded integer not null check(xp_awarded between 1 and 100),
 claimed_at timestamptz not null default now(),
 primary key(user_id,mission_code,period_end)
);
alter table public.es_v74_mission_claims enable row level security;
revoke all on public.es_v74_mission_claims from public,anon,authenticated;

create or replace function public.es_v74_claims()
returns jsonb language sql stable security definer set search_path=''
as $$
select coalesce(jsonb_agg(jsonb_build_object('code',c.mission_code,'period_end',c.period_end,'xp',c.xp_awarded)),'[]'::jsonb)
from public.es_v74_mission_claims c where c.user_id=auth.uid();
$$;
create or replace function public.es_v74_mission_claim(p_code text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); mission jsonb; period_end timestamptz; amount integer; inserted integer; total bigint;
begin
 if uid is null then raise exception 'Autenticação obrigatória'; end if;
 if p_code not in ('daily_play','daily_win','weekly_play','weekly_impostor') then raise exception 'Missão desconhecida'; end if;
 select m.value into mission from jsonb_array_elements(public.es_v74_missions()) m(value) where m.value->>'code'=p_code;
 if mission is null or coalesce((mission->>'complete')::boolean,false)=false then raise exception 'Missão incompleta'; end if;
 period_end:=(mission->>'renews_at')::timestamptz;
 amount:=case when p_code like 'daily_%' then 15 else 40 end;
 insert into public.es_v74_mission_claims(user_id,mission_code,period_end,xp_awarded)
 values(uid,p_code,period_end,amount) on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted=0 then raise exception 'Recompensa já resgatada'; end if;
 update public.es_profiles set xp=xp+amount where id=uid returning xp into total;
 if total is null then raise exception 'Perfil não encontrado'; end if;
 return jsonb_build_object('xp_awarded',amount,'total_xp',total,'mission',p_code);
end;
$$;
revoke all on function public.es_v74_claims() from public,anon;
revoke all on function public.es_v74_mission_claim(text) from public,anon;
grant execute on function public.es_v74_claims(),public.es_v74_mission_claim(text) to authenticated;
