-- V7.8 — reentrada idempotente e replay de votação somente após o encerramento.
-- Aplicar no projeto correto, depois confirmar as definições e permissões.

create or replace function public.es_join(p_room uuid, p_code text default null)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v uuid := public.es_auth();
  r public.es_rooms%rowtype;
  member public.es_members%rowtype;
  n integer;
begin
  select * into r from public.es_rooms where id=p_room for update;
  if not found or r.status<>'lobby' then
    raise exception 'Sala indisponível';
  end if;
  if not r.is_public and upper(coalesce(p_code,''))<>r.code then
    raise exception 'Código incorreto';
  end if;
  select * into member from public.es_members
    where room_id=r.id and user_id=v for update;
  -- Retornar à mesma sala ativa não altera o estado "Pronto" de ninguém.
  if found and member.left_at is null then
    update public.es_members set seen_at=now()
      where room_id=r.id and user_id=v;
    return r.id;
  end if;
  select count(*) into n from public.es_members
    where room_id=r.id and left_at is null;
  if n>=r.max_players then raise exception 'Sala cheia';end if;
  if member.room_id is null then
    insert into public.es_members(room_id,user_id,ready,left_at)
      values(r.id,v,false,null);
  else
    update public.es_members set left_at=null,ready=false,seen_at=now()
      where room_id=r.id and user_id=v;
  end if;
  -- Composição da sala mudou: manter regra atual de reconfirmação.
  update public.es_members set ready=false
    where room_id=r.id and left_at is null;
  return r.id;
end;
$function$;

-- Nunca expor votos de uma rodada ainda aberta. Somente membros ativos
-- de uma sala encerrada podem consultar somente totais anônimos.
create or replace function public.es_v78_vote_replay(p_room uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  uid uuid := auth.uid();
  state text;
  round_number integer;
  round_id uuid;
  ballots jsonb;
begin
  if uid is null then raise exception 'Entre na conta';end if;
  select r.status,r.round_no into state,round_number
    from public.es_rooms r where r.id=p_room;
  if not found then raise exception 'Sala indisponível';end if;
  if not exists(
    select 1 from public.es_members m
    where m.room_id=p_room and m.user_id=uid and m.left_at is null
  ) then raise exception 'Você não faz parte da sala';end if;
  if state<>'results' then
    raise exception 'Os votos permanecem secretos até o fim da rodada';
  end if;
  select rd.id into round_id from public.es_rounds rd
    where rd.room_id=p_room and rd.round_no=round_number;
  -- Only target totals: never disclose who voted for whom.
  select coalesce(
    jsonb_agg(jsonb_build_object('to',c.target,'count',c.votes) order by c.target),
    '[]'::jsonb
  ) into ballots
  from (
    select chosen.target, count(*)::integer as votes
    from public.es_votes v
    cross join lateral unnest(v.targets) as chosen(target)
    where v.round_id=round_id
    group by chosen.target
  ) c;
  return ballots;
end;
$function$;

revoke all on function public.es_v78_vote_replay(uuid) from public, anon;
grant execute on function public.es_v78_vote_replay(uuid) to authenticated;
