
-- V7.4.1 decorative cosmetics, preserving 200 existing achievement titles.
alter table public.es_profiles add column if not exists equipped_banner text not null default 'padrao';
create table if not exists public.es_cosmetic_catalog(
  code text primary key, kind text not null check(kind in ('frame','banner')),
  name text not null, rarity text not null check(rarity in ('comum','incomum','raro','epico','lenda')),
  wins_required integer not null default 0 check(wins_required>=0),
  xp_required bigint not null default 0 check(xp_required>=0),
  event_code text, event_target integer not null default 0 check(event_target>=0)
);
alter table public.es_cosmetic_catalog enable row level security;
revoke all on public.es_cosmetic_catalog from public,anon,authenticated;
insert into public.es_cosmetic_catalog(code,kind,name,rarity,wins_required,xp_required,event_code,event_target)
values
('classica','frame','Clássica','comum',0,0,null,0),
('bronze','frame','Vigilante Bronze','comum',5,0,null,0),
('ouro','frame','Olhar de Ouro','raro',20,0,null,0),
('nevoa','frame','Névoa','epico',0,0,'nevoa_2026',5),
('coroa_arcana','frame','Coroa Arcana','lenda',10,800,null,0),
('lamina_eclipse','frame','Lâmina Eclipse','raro',6,350,null,0),
('cacador_ebano','frame','Caçador Ébano','raro',8,550,null,0),
('ordem_velada','frame','Ordem Velada','incomum',4,250,null,0),
('rubi_sombrio','frame','Rubi Sombrio','epico',12,850,null,0),
('sentinela_lunar','frame','Sentinela Lunar','incomum',3,150,null,0),
('espiral_abissal','frame','Espiral Abissal','epico',16,1200,null,0),
('espectro_violeta','frame','Espectro Violeta','raro',7,450,null,0),
('chamas_eternas','frame','Chamas Eternas','lenda',25,1700,null,0),
('aurora_fantasma','frame','Aurora Fantasma','incomum',2,120,null,0),
('guardiao_do_eco','frame','Guardião do Eco','epico',18,1350,null,0),
('trono_da_noite','frame','Trono da Noite','lenda',40,2400,null,0),
('padrao','banner','Sombras Originais','comum',0,0,null,0),
('ecos_da_nevoa','banner','Ecos da Névoa','epico',0,0,'nevoa_2026',5),
('trono_arcano','banner','Trono Arcano','lenda',20,1300,null,0),
('cacada_sombria','banner','Caçada Sombria','incomum',3,180,null,0),
('lua_partida','banner','Lua Partida','raro',6,400,null,0),
('conspiracao','banner','Conspiração','comum',1,0,null,0),
('cidade_sem_rosto','banner','Cidade Sem Rosto','raro',8,550,null,0),
('corredor_espectral','banner','Corredor Espectral','incomum',4,250,null,0),
('floresta_rubra','banner','Floresta Rubra','epico',12,850,null,0),
('eclipse_violeta','banner','Eclipse Violeta','lenda',30,1800,null,0),
('juramento_oculto','banner','Juramento Oculto','incomum',2,120,null,0),
('ruinas_do_segredo','banner','Ruínas do Segredo','raro',10,650,null,0),
('reino_dos_suspeitos','banner','Reino dos Suspeitos','lenda',45,3000,null,0),
('escuta_noturna','banner','Escuta Noturna','comum',0,0,null,0),
('segredo_carmesim','banner','Segredo Carmesim','epico',15,1100,null,0),
('vidro_estilhacado','banner','Vidro Estilhaçado','raro',7,500,null,0)
on conflict(code) do update set name=excluded.name,rarity=excluded.rarity,
 wins_required=excluded.wins_required,xp_required=excluded.xp_required,
 event_code=excluded.event_code,event_target=excluded.event_target;

create or replace function public.es_cosmetic_inventory()
returns jsonb language sql stable security definer set search_path=''
as $$
with stats as (select id,xp,online_wins,equipped_frame,equipped_banner
 from public.es_profiles where id=auth.uid()),
owned as (
select c.*, case
 when c.event_code is not null then exists (
  select 1 from public.es_v74_events e join public.es_results re on re.user_id=auth.uid()
  join public.es_rounds rd on rd.id=re.round_id join public.es_rooms rm on rm.id=rd.room_id
  where e.code=c.event_code and re.voted and rm.is_public
   and rd.finished_at>=e.starts_at and rd.finished_at<e.ends_at
  group by e.code having count(distinct rd.id)>=c.event_target
 )
 else coalesce(s.online_wins,0)>=c.wins_required and coalesce(s.xp,0)>=c.xp_required end unlocked,
 (case when c.kind='frame' then coalesce(s.equipped_frame,'classica') else coalesce(s.equipped_banner,'padrao') end)=c.code equipped
from public.es_cosmetic_catalog c cross join stats s)
select coalesce(jsonb_agg(jsonb_build_object('code',code,'kind',kind,'name',name,'rarity',rarity,
'wins_required',wins_required,'xp_required',xp_required,'event_code',event_code,
'unlocked',unlocked,'equipped',equipped) order by kind,name),'[]'::jsonb)
from owned;
$$;

create or replace function public.es_cosmetic_equip(p_kind text,p_code text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); ok boolean;
begin
 if uid is null then raise exception 'Entre na conta para equipar itens';end if;
 if p_kind not in ('frame','banner') then raise exception 'Tipo inválido';end if;
 select (item->>'unlocked')::boolean into ok
 from jsonb_array_elements(public.es_cosmetic_inventory()) item
 where item->>'code'=p_code and item->>'kind'=p_kind;
 if not coalesce(ok,false) then raise exception 'Item ainda não conquistado'; end if;
 if p_kind='frame' then
  update public.es_profiles set equipped_frame=p_code where id=uid;
 else
  update public.es_profiles set equipped_banner=p_code where id=uid;
 end if;
 return found;
end;
$$;
revoke all on function public.es_cosmetic_inventory() from public,anon;
revoke all on function public.es_cosmetic_equip(text,text) from public,anon;
grant execute on function public.es_cosmetic_inventory(),public.es_cosmetic_equip(text,text) to authenticated;
