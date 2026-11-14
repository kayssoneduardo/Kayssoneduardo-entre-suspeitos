update public.es_titles set world_unique=(rarity='mistico') where rarity in ('mistico','lenda');
update public.es_titles set description=replace(replace(description,'Primeiro jogador do mundo a atingir','Atingir'),'Seja o primeiro jogador a ','') where rarity='lenda';
update public.es_titles set description=case code
 when 'eco_invisivel' then 'Você venceu 10 partidas públicas como impostor sem receber votos.'
 when 'fantasma_absoluto' then 'Você venceu 25 partidas públicas como impostor sem receber votos.'
 when 'verdade_silenciosa' then 'Você venceu 10 partidas públicas como jogador comum sem receber votos.'
 when 'duas_faces' then 'Você venceu 50 partidas públicas como comum e 50 como impostor.'
 when 'destino_improvavel' then 'Você conquistou 20 vitórias públicas consecutivas.'
 else description end where rarity='mistico';
-- Preserve both historic holders; reserve every already-earned mystic against future awards.
insert into public.es_title_claims(title_code,user_id)
select distinct on(ut.title_code) ut.title_code,ut.user_id
from public.es_user_titles ut join public.es_titles t on t.code=ut.title_code
where t.rarity='mistico' order by ut.title_code,ut.acquired_at,ut.user_id
on conflict do nothing;
CREATE OR REPLACE FUNCTION public.es_award_progress(p_user uuid, p_impostor boolean, p_won boolean, p_votes integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare prog public.es_progress%rowtype; pr public.es_profiles%rowtype; code text; lvl int; public_role_wins int;
begin
 insert into public.es_progress(user_id) values(p_user) on conflict do nothing;
 update public.es_progress set
  streak_all=case when p_won then streak_all+1 else 0 end,
  streak_impostor=case when p_impostor then (case when p_won then streak_impostor+1 else 0 end) else streak_impostor end,
  streak_common=case when not p_impostor then (case when p_won then streak_common+1 else 0 end) else streak_common end
 where user_id=p_user returning * into prog;
 select * into pr from public.es_profiles where id=p_user;
 select count(*) into public_role_wins
 from public.es_results rs join public.es_rounds rd on rd.id=rs.round_id
 join public.es_rooms room on room.id=rd.room_id
 where rs.user_id=p_user and rs.win and not rs.is_impostor and room.is_public;
 if public_role_wins>=5 then
  insert into public.es_user_titles(user_id,title_code) values(p_user,'detetive_iniciante') on conflict do nothing;
 end if;
 select count(*) into public_role_wins
 from public.es_results rs join public.es_rounds rd on rd.id=rs.round_id
 join public.es_rooms room on room.id=rd.room_id
 where rs.user_id=p_user and rs.win and rs.is_impostor and room.is_public;
 if public_role_wins>=5 then
  insert into public.es_user_titles(user_id,title_code) values(p_user,'disfarce_iniciante') on conflict do nothing;
 end if;
 if pr.online_wins>=20 then
  insert into public.es_user_titles(user_id,title_code) values(p_user,'veterano') on conflict do nothing;
 end if;
 if p_impostor and p_won and p_votes=0 then
  insert into public.es_user_titles(user_id,title_code) values(p_user,'sem_votos') on conflict do nothing;
 end if;
 if prog.streak_impostor>=5 then
  insert into public.es_user_titles(user_id,title_code) values(p_user,'cinco_impostor') on conflict do nothing;
 end if;
 if prog.streak_common>=5 then
  insert into public.es_user_titles(user_id,title_code) values(p_user,'cinco_comum') on conflict do nothing;
 end if;
 if prog.streak_all>=10 then
  insert into public.es_user_titles(user_id,title_code) values(p_user,'dez_seguidas') on conflict do nothing;
 end if;
 -- Nível é recalculado pela experiência pública: XP para nível N = 100*(N-1)^2.
 lvl=1+floor(sqrt(greatest(0,pr.xp)::numeric/100))::int;
 for code in select t.code from public.es_titles t where
  (t.code='primeiro_nivel10' and lvl>=10) or
  (t.code='primeiro_nivel30' and lvl>=30) or
  (t.code='primeiro_nivel40' and lvl>=40)
 loop
  insert into public.es_user_titles(user_id,title_code) values(p_user,code) on conflict do nothing;
 end loop;

 declare stats record; award record; metric bigint;
 begin
 select count(*) as games,count(*) filter(where rs.win and not rs.is_impostor) as common,
 count(*) filter(where rs.win and rs.is_impostor) as impostor,
 count(*) filter(where rs.win and rs.is_impostor and rs.votes_received=0) as clean_impostor,
 count(*) filter(where rs.win and not rs.is_impostor and rs.votes_received=0) as clean_common
 into stats from public.es_results rs join public.es_rounds rr on rr.id=rs.round_id
 join public.es_rooms rm on rm.id=rr.room_id where rs.user_id=p_user and rm.is_public;
 for award in select * from (values ('primeira_rodada','games',1,false),
('cinco_rodadas','games',5,false),
('dez_rodadas','games',10,false),
('vinte_cinco_rodadas','games',25,false),
('cinquenta_rodadas','games',50,false),
('primeira_vitoria','wins',1,false),
('tres_vitorias','wins',3,false),
('dez_vitorias','wins',10,false),
('primeira_comum','common',1,false),
('primeira_impostor','impostor',1,false),
('cem_rodadas','games',100,false),
('duzentas_rodadas','games',200,false),
('trinta_vitorias','wins',30,false),
('cinquenta_vitorias','wins',50,false),
('dez_comum','common',10,false),
('vinte_cinco_comum','common',25,false),
('dez_impostor','impostor',10,false),
('vinte_cinco_impostor','impostor',25,false),
('nivel_cinco','level',5,false),
('nivel_dez','level',10,false),
('quinhentas_rodadas','games',500,false),
('cem_vitorias','wins',100,false),
('duzentas_cinquenta_vitorias','wins',250,false),
('cinquenta_comum','common',50,false),
('cem_comum','common',100,false),
('cinquenta_impostor','impostor',50,false),
('cem_impostor','impostor',100,false),
('tres_seguidas','streak',3,false),
('cinco_seguidas','streak',5,false),
('nivel_vinte','level',20,false),
('primeiro_mil_rodadas','games',1000,true),
('primeiro_quinhentas_vitorias','wins',500,true),
('primeiro_duzentas_cinquenta_comum','common',250,true),
('primeiro_duzentas_cinquenta_impostor','impostor',250,true),
('primeiro_nivel_cinquenta','level',50,true),
('eco_invisivel','clean_impostor',10,false),
('fantasma_absoluto','clean_impostor',25,false),
('verdade_silenciosa','clean_common',10,false),
('duas_faces','balanced',50,false),
('destino_improvavel','streak',20,false)) as rules(title_code,metric_name,threshold,exclusive)
 loop
 metric:=case award.metric_name when 'games' then stats.games when 'wins' then pr.online_wins
 when 'common' then stats.common when 'impostor' then stats.impostor when 'level' then lvl
 when 'streak' then prog.streak_all when 'clean_impostor' then stats.clean_impostor
 when 'clean_common' then stats.clean_common when 'balanced' then least(stats.common,stats.impostor) end;
 if metric>=award.threshold then
 if (select t.world_unique from public.es_titles t where t.code=award.title_code) then
 with claim as (insert into public.es_title_claims(title_code,user_id) values(award.title_code,p_user)
 on conflict do nothing returning title_code)
 insert into public.es_user_titles(user_id,title_code) select p_user,title_code from claim on conflict do nothing;
 else
 insert into public.es_user_titles(user_id,title_code) values(p_user,award.title_code) on conflict do nothing;
 end if;
 end if;
 end loop;
 end;

end$function$
;
CREATE OR REPLACE FUNCTION public.es_title_catalog()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select coalesce(jsonb_agg(jsonb_build_object('code',t.code,'name',t.name,'rarity',t.rarity,
 'description',case when t.hidden and not exists(select 1 from public.es_user_titles own where own.title_code=t.code and own.user_id=auth.uid()) then 'Conquista secreta: revelada ao conquistar.' else t.description end,'world_unique',t.world_unique,
 'claimed',case when t.world_unique then exists(select 1 from public.es_title_claims c where c.title_code=t.code) else null end)
 order by t.rarity,t.name),'[]'::jsonb)
 from public.es_titles t where not t.hidden or exists(select 1 from public.es_user_titles ut where ut.title_code=t.code);
$function$
;

-- Expansion: 105 additional earnable titles.
insert into public.es_titles(code,name,rarity,description,world_unique,hidden) values
('exp_passo_suspeito','Passo Suspeito','comum','Conclua 2 rodadas públicas.',false,false),
('exp_cadeira_cativa','Cadeira Cativa','comum','Conclua 3 rodadas públicas.',false,false),
('exp_olhos_na_mesa','Olhos na Mesa','comum','Conclua 4 rodadas públicas.',false,false),
('exp_rastro_recente','Rastro Recente','comum','Conclua 6 rodadas públicas.',false,false),
('exp_testemunha_casual','Testemunha Casual','comum','Conclua 7 rodadas públicas.',false,false),
('exp_conversa_de_corredor','Conversa de Corredor','comum','Conclua 8 rodadas públicas.',false,false),
('exp_carta_na_manga','Carta na Manga','comum','Conclua 9 rodadas públicas.',false,false),
('exp_vulto_na_janela','Vulto na Janela','comum','Conclua 12 rodadas públicas.',false,false),
('exp_vizinho_curioso','Vizinho Curioso','comum','Conclua 15 rodadas públicas.',false,false),
('exp_passageiro_da_nevoa','Passageiro da Névoa','comum','Conclua 18 rodadas públicas.',false,false),
('exp_guardiao_do_segredo','Guardião do Segredo','comum','Conclua 20 rodadas públicas.',false,false),
('exp_amigo_da_duvida','Amigo da Dúvida','comum','Conclua 30 rodadas públicas.',false,false),
('exp_presenca_discreta','Presença Discreta','comum','Conclua 35 rodadas públicas.',false,false),
('exp_ronda_noturna','Ronda Noturna','comum','Conclua 40 rodadas públicas.',false,false),
('exp_ouvinte_das_sombras','Ouvinte das Sombras','comum','Conclua 45 rodadas públicas.',false,false),
('exp_figura_carimbada','Figura Carimbada','comum','Conclua 60 rodadas públicas.',false,false),
('exp_pista_no_bolso','Pista no Bolso','comum','Conclua 65 rodadas públicas.',false,false),
('exp_colega_de_misterio','Colega de Mistério','comum','Conclua 70 rodadas públicas.',false,false),
('exp_ritual_da_meia_noite','Ritual da Meia-Noite','comum','Conclua 75 rodadas públicas.',false,false),
('exp_sempre_por_perto','Sempre por Perto','comum','Conclua 80 rodadas públicas.',false,false),
('exp_sorriso_de_vitoria','Sorriso de Vitória','comum','Conquiste 2 vitórias públicas.',false,false),
('exp_sorte_bem_usada','Sorte Bem Usada','comum','Conquiste 4 vitórias públicas.',false,false),
('exp_plano_que_deu_certo','Plano que Deu Certo','comum','Conquiste 6 vitórias públicas.',false,false),
('exp_palpite_certeiro','Palpite Certeiro','comum','Conquiste 7 vitórias públicas.',false,false),
('exp_passo_a_frente','Passo à Frente','comum','Conquiste 8 vitórias públicas.',false,false),
('exp_vitoria_sussurrada','Vitória Sussurrada','comum','Conquiste 9 vitórias públicas.',false,false),
('exp_mesa_favoravel','Mesa Favorável','comum','Conquiste 12 vitórias públicas.',false,false),
('exp_boa_leitura','Boa Leitura','comum','Conquiste 15 vitórias públicas.',false,false),
('exp_segredo_bem_guardado','Segredo Bem Guardado','comum','Conquiste 18 vitórias públicas.',false,false),
('exp_triunfo_discreto','Triunfo Discreto','comum','Conquiste 20 vitórias públicas.',false,false),
('exp_curioso_de_plantao','Curioso de Plantão','comum','Vença 2 partidas públicas como jogador comum.',false,false),
('exp_pista_encontrada','Pista Encontrada','comum','Vença 3 partidas públicas como jogador comum.',false,false),
('exp_senso_de_justica','Senso de Justiça','comum','Vença 4 partidas públicas como jogador comum.',false,false),
('exp_pergunta_certa','Pergunta Certa','comum','Vença 6 partidas públicas como jogador comum.',false,false),
('exp_lupa_de_bolso','Lupa de Bolso','comum','Vença 7 partidas públicas como jogador comum.',false,false),
('exp_ouvido_atento','Ouvido Atento','comum','Vença 8 partidas públicas como jogador comum.',false,false),
('exp_cetico_por_natureza','Cético por Natureza','comum','Vença 9 partidas públicas como jogador comum.',false,false),
('exp_rastro_de_verdade','Rastro de Verdade','comum','Vença 12 partidas públicas como jogador comum.',false,false),
('exp_olhar_desconfiado','Olhar Desconfiado','comum','Vença 15 partidas públicas como jogador comum.',false,false),
('exp_companheiro_vigilante','Companheiro Vigilante','comum','Vença 20 partidas públicas como jogador comum.',false,false),
('exp_mentirinha_inocente','Mentirinha Inocente','comum','Vença 2 partidas públicas como impostor.',false,false),
('exp_cara_de_santo','Cara de Santo','comum','Vença 3 partidas públicas como impostor.',false,false),
('exp_desvio_de_olhar','Desvio de Olhar','comum','Vença 4 partidas públicas como impostor.',false,false),
('exp_historia_ensaiada','História Ensaiada','comum','Vença 6 partidas públicas como impostor.',false,false),
('exp_alibi_de_bolso','Álibi de Bolso','comum','Vença 7 partidas públicas como impostor.',false,false),
('exp_disfarce_improvisado','Disfarce Improvisado','comum','Vença 8 partidas públicas como impostor.',false,false),
('exp_fala_mansa','Fala Mansa','comum','Vença 9 partidas públicas como impostor.',false,false),
('exp_meia_verdade','Meia Verdade','comum','Vença 12 partidas públicas como impostor.',false,false),
('exp_suspeito_simpatico','Suspeito Simpático','comum','Vença 15 partidas públicas como impostor.',false,false),
('exp_truque_de_conversa','Truque de Conversa','comum','Vença 20 partidas públicas como impostor.',false,false),
('exp_cronista_da_penumbra','Cronista da Penumbra','raro','Conclua 300 rodadas públicas.',false,false),
('exp_sentinela_da_madrugada','Sentinela da Madrugada','raro','Conclua 400 rodadas públicas.',false,false),
('exp_cartografo_dos_segredos','Cartógrafo dos Segredos','raro','Conclua 600 rodadas públicas.',false,false),
('exp_habitante_do_labirinto','Habitante do Labirinto','raro','Conclua 700 rodadas públicas.',false,false),
('exp_memorias_do_abismo','Memórias do Abismo','raro','Conclua 800 rodadas públicas.',false,false),
('exp_vigia_dos_mil_rostos','Vigia dos Mil Rostos','raro','Conclua 900 rodadas públicas.',false,false),
('exp_arquivo_das_sombras','Arquivo das Sombras','raro','Conclua 1100 rodadas públicas.',false,false),
('exp_guardiao_da_ultima_sala','Guardião da Última Sala','raro','Conclua 1250 rodadas públicas.',false,false),
('exp_testemunha_do_infinito','Testemunha do Infinito','raro','Conclua 1500 rodadas públicas.',false,false),
('exp_eterno_convidado','Eterno Convidado','raro','Conclua 1750 rodadas públicas.',false,false),
('exp_mente_afiada','Mente Afiada','raro','Conquiste 75 vitórias públicas.',false,false),
('exp_xeque_silencioso','Xeque Silencioso','raro','Conquiste 125 vitórias públicas.',false,false),
('exp_estrategista_da_nevoa','Estrategista da Névoa','raro','Conquiste 150 vitórias públicas.',false,false),
('exp_fio_da_navalha','Fio da Navalha','raro','Conquiste 175 vitórias públicas.',false,false),
('exp_senhor_do_desfecho','Senhor do Desfecho','raro','Conquiste 200 vitórias públicas.',false,false),
('exp_soberano_da_rodada','Soberano da Rodada','raro','Conquiste 300 vitórias públicas.',false,false),
('exp_vontade_de_aco','Vontade de Aço','raro','Conquiste 350 vitórias públicas.',false,false),
('exp_veredito_irrefutavel','Veredito Irrefutável','raro','Conquiste 400 vitórias públicas.',false,false),
('exp_dominio_das_pistas','Domínio das Pistas','raro','Conquiste 450 vitórias públicas.',false,false),
('exp_triunfo_sobre_o_caos','Triunfo sobre o Caos','raro','Conquiste 600 vitórias públicas.',false,false),
('exp_lupa_de_prata','Lupa de Prata','raro','Vença 35 partidas públicas como jogador comum.',false,false),
('exp_juiz_das_aparencias','Juiz das Aparências','raro','Vença 75 partidas públicas como jogador comum.',false,false),
('exp_cacador_de_contradicoes','Caçador de Contradições','raro','Vença 125 partidas públicas como jogador comum.',false,false),
('exp_olho_da_tempestade','Olho da Tempestade','raro','Vença 150 partidas públicas como jogador comum.',false,false),
('exp_cao_de_guarda_da_verdade','Cão de Guarda da Verdade','raro','Vença 175 partidas públicas como jogador comum.',false,false),
('exp_analista_do_impossivel','Analista do Impossível','raro','Vença 200 partidas públicas como jogador comum.',false,false),
('exp_sentinela_dos_inocentes','Sentinela dos Inocentes','raro','Vença 300 partidas públicas como jogador comum.',false,false),
('exp_desvendador_de_enigmas','Desvendador de Enigmas','raro','Vença 350 partidas públicas como jogador comum.',false,false),
('exp_ultima_testemunha','Última Testemunha','raro','Vença 400 partidas públicas como jogador comum.',false,false),
('exp_verdadeiro_inquisidor','Verdadeiro Inquisidor','raro','Vença 500 partidas públicas como jogador comum.',false,false),
('exp_teatro_de_sombras','Teatro de Sombras','raro','Vença 35 partidas públicas como impostor.',false,false),
('exp_labios_de_veludo','Lábios de Veludo','raro','Vença 75 partidas públicas como impostor.',false,false),
('exp_falsificador_de_destinos','Falsificador de Destinos','raro','Vença 125 partidas públicas como impostor.',false,false),
('exp_marionetista','Marionetista','raro','Vença 150 partidas públicas como impostor.',false,false),
('exp_mascara_de_obsidiana','Máscara de Obsidiana','raro','Vença 175 partidas públicas como impostor.',false,false),
('exp_vendedor_de_certezas','Vendedor de Certezas','raro','Vença 200 partidas públicas como impostor.',false,false),
('exp_veneno_nas_palavras','Veneno nas Palavras','raro','Vença 300 partidas públicas como impostor.',false,false),
('exp_dono_do_alibi_perfeito','Dono do Álibi Perfeito','raro','Vença 350 partidas públicas como impostor.',false,false),
('exp_ilusionista_da_mesa','Ilusionista da Mesa','raro','Vença 400 partidas públicas como impostor.',false,false),
('exp_roteirista_do_engano','Roteirista do Engano','raro','Vença 500 partidas públicas como impostor.',false,false),
('exp_bibliotecario_das_mil_faces','Bibliotecário das Mil Faces','lenda','Conclua 2000 rodadas públicas.',false,false),
('exp_monumento_dos_segredos','Monumento dos Segredos','lenda','Conclua 5000 rodadas públicas.',false,false),
('exp_coroa_do_ultimo_veredito','Coroa do Último Veredito','lenda','Conquiste 1000 vitórias públicas.',false,false),
('exp_imperador_da_mesa','Imperador da Mesa','lenda','Conquiste 2000 vitórias públicas.',false,false),
('exp_oraculo_da_verdade','Oráculo da Verdade','lenda','Vença 750 partidas públicas como jogador comum.',false,false),
('exp_farol_da_eternidade','Farol da Eternidade','lenda','Vença 1000 partidas públicas como jogador comum.',false,false),
('exp_rei_das_mil_mascaras','Rei das Mil Máscaras','lenda','Vença 750 partidas públicas como impostor.',false,false),
('exp_soberano_do_engano','Soberano do Engano','lenda','Vença 1000 partidas públicas como impostor.',false,false),
('exp_ascendente_das_sombras','Ascendente das Sombras','lenda','Alcance o nível 60 com XP de partidas públicas.',false,false),
('exp_nome_escrito_nas_estrelas','Nome Escrito nas Estrelas','lenda','Alcance o nível 75 com XP de partidas públicas.',false,false),
('exp_o_nome_que_ninguem_acusou','O Nome que Ninguém Acusou','mistico','Vença 50 partidas públicas como impostor sem receber votos.',true,true),
('exp_testemunha_intocavel','Testemunha Intocável','mistico','Vença 50 partidas públicas como comum sem receber votos.',true,true),
('exp_equilibrio_do_abismo','Equilíbrio do Abismo','mistico','Vença 100 partidas públicas como comum e 100 como impostor.',true,true),
('exp_o_impossivel_aconteceu','O Impossível Aconteceu','mistico','Conquiste 30 vitórias públicas consecutivas.',true,true),
('exp_ultimo_habitante_da_nevoa','Último Habitante da Névoa','mistico','Conclua 10000 rodadas públicas.',true,true) on conflict(code) do nothing;
CREATE OR REPLACE FUNCTION public.es_award_progress(p_user uuid, p_impostor boolean, p_won boolean, p_votes integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare prog public.es_progress%rowtype; pr public.es_profiles%rowtype; code text; lvl int; public_role_wins int;
begin
 insert into public.es_progress(user_id) values(p_user) on conflict do nothing;
 update public.es_progress set
  streak_all=case when p_won then streak_all+1 else 0 end,
  streak_impostor=case when p_impostor then (case when p_won then streak_impostor+1 else 0 end) else streak_impostor end,
  streak_common=case when not p_impostor then (case when p_won then streak_common+1 else 0 end) else streak_common end
 where user_id=p_user returning * into prog;
 select * into pr from public.es_profiles where id=p_user;
 select count(*) into public_role_wins
 from public.es_results rs join public.es_rounds rd on rd.id=rs.round_id
 join public.es_rooms room on room.id=rd.room_id
 where rs.user_id=p_user and rs.win and not rs.is_impostor and room.is_public;
 if public_role_wins>=5 then
  insert into public.es_user_titles(user_id,title_code) values(p_user,'detetive_iniciante') on conflict do nothing;
 end if;
 select count(*) into public_role_wins
 from public.es_results rs join public.es_rounds rd on rd.id=rs.round_id
 join public.es_rooms room on room.id=rd.room_id
 where rs.user_id=p_user and rs.win and rs.is_impostor and room.is_public;
 if public_role_wins>=5 then
  insert into public.es_user_titles(user_id,title_code) values(p_user,'disfarce_iniciante') on conflict do nothing;
 end if;
 if pr.online_wins>=20 then
  insert into public.es_user_titles(user_id,title_code) values(p_user,'veterano') on conflict do nothing;
 end if;
 if p_impostor and p_won and p_votes=0 then
  insert into public.es_user_titles(user_id,title_code) values(p_user,'sem_votos') on conflict do nothing;
 end if;
 if prog.streak_impostor>=5 then
  insert into public.es_user_titles(user_id,title_code) values(p_user,'cinco_impostor') on conflict do nothing;
 end if;
 if prog.streak_common>=5 then
  insert into public.es_user_titles(user_id,title_code) values(p_user,'cinco_comum') on conflict do nothing;
 end if;
 if prog.streak_all>=10 then
  insert into public.es_user_titles(user_id,title_code) values(p_user,'dez_seguidas') on conflict do nothing;
 end if;
 -- Nível é recalculado pela experiência pública: XP para nível N = 100*(N-1)^2.
 lvl=1+floor(sqrt(greatest(0,pr.xp)::numeric/100))::int;
 for code in select t.code from public.es_titles t where
  (t.code='primeiro_nivel10' and lvl>=10) or
  (t.code='primeiro_nivel30' and lvl>=30) or
  (t.code='primeiro_nivel40' and lvl>=40)
 loop
  insert into public.es_user_titles(user_id,title_code) values(p_user,code) on conflict do nothing;
 end loop;

 declare stats record; award record; metric bigint;
 begin
 select count(*) as games,count(*) filter(where rs.win and not rs.is_impostor) as common,
 count(*) filter(where rs.win and rs.is_impostor) as impostor,
 count(*) filter(where rs.win and rs.is_impostor and rs.votes_received=0) as clean_impostor,
 count(*) filter(where rs.win and not rs.is_impostor and rs.votes_received=0) as clean_common
 into stats from public.es_results rs join public.es_rounds rr on rr.id=rs.round_id
 join public.es_rooms rm on rm.id=rr.room_id where rs.user_id=p_user and rm.is_public;
 for award in select * from (values ('primeira_rodada','games',1,false),
('cinco_rodadas','games',5,false),
('dez_rodadas','games',10,false),
('vinte_cinco_rodadas','games',25,false),
('cinquenta_rodadas','games',50,false),
('primeira_vitoria','wins',1,false),
('tres_vitorias','wins',3,false),
('dez_vitorias','wins',10,false),
('primeira_comum','common',1,false),
('primeira_impostor','impostor',1,false),
('cem_rodadas','games',100,false),
('duzentas_rodadas','games',200,false),
('trinta_vitorias','wins',30,false),
('cinquenta_vitorias','wins',50,false),
('dez_comum','common',10,false),
('vinte_cinco_comum','common',25,false),
('dez_impostor','impostor',10,false),
('vinte_cinco_impostor','impostor',25,false),
('nivel_cinco','level',5,false),
('nivel_dez','level',10,false),
('quinhentas_rodadas','games',500,false),
('cem_vitorias','wins',100,false),
('duzentas_cinquenta_vitorias','wins',250,false),
('cinquenta_comum','common',50,false),
('cem_comum','common',100,false),
('cinquenta_impostor','impostor',50,false),
('cem_impostor','impostor',100,false),
('tres_seguidas','streak',3,false),
('cinco_seguidas','streak',5,false),
('nivel_vinte','level',20,false),
('primeiro_mil_rodadas','games',1000,true),
('primeiro_quinhentas_vitorias','wins',500,true),
('primeiro_duzentas_cinquenta_comum','common',250,true),
('primeiro_duzentas_cinquenta_impostor','impostor',250,true),
('primeiro_nivel_cinquenta','level',50,true),
('eco_invisivel','clean_impostor',10,false),
('fantasma_absoluto','clean_impostor',25,false),
('verdade_silenciosa','clean_common',10,false),
('duas_faces','balanced',50,false),
('destino_improvavel','streak',20,false),
('exp_passo_suspeito','games',2,false),
('exp_cadeira_cativa','games',3,false),
('exp_olhos_na_mesa','games',4,false),
('exp_rastro_recente','games',6,false),
('exp_testemunha_casual','games',7,false),
('exp_conversa_de_corredor','games',8,false),
('exp_carta_na_manga','games',9,false),
('exp_vulto_na_janela','games',12,false),
('exp_vizinho_curioso','games',15,false),
('exp_passageiro_da_nevoa','games',18,false),
('exp_guardiao_do_segredo','games',20,false),
('exp_amigo_da_duvida','games',30,false),
('exp_presenca_discreta','games',35,false),
('exp_ronda_noturna','games',40,false),
('exp_ouvinte_das_sombras','games',45,false),
('exp_figura_carimbada','games',60,false),
('exp_pista_no_bolso','games',65,false),
('exp_colega_de_misterio','games',70,false),
('exp_ritual_da_meia_noite','games',75,false),
('exp_sempre_por_perto','games',80,false),
('exp_sorriso_de_vitoria','wins',2,false),
('exp_sorte_bem_usada','wins',4,false),
('exp_plano_que_deu_certo','wins',6,false),
('exp_palpite_certeiro','wins',7,false),
('exp_passo_a_frente','wins',8,false),
('exp_vitoria_sussurrada','wins',9,false),
('exp_mesa_favoravel','wins',12,false),
('exp_boa_leitura','wins',15,false),
('exp_segredo_bem_guardado','wins',18,false),
('exp_triunfo_discreto','wins',20,false),
('exp_curioso_de_plantao','common',2,false),
('exp_pista_encontrada','common',3,false),
('exp_senso_de_justica','common',4,false),
('exp_pergunta_certa','common',6,false),
('exp_lupa_de_bolso','common',7,false),
('exp_ouvido_atento','common',8,false),
('exp_cetico_por_natureza','common',9,false),
('exp_rastro_de_verdade','common',12,false),
('exp_olhar_desconfiado','common',15,false),
('exp_companheiro_vigilante','common',20,false),
('exp_mentirinha_inocente','impostor',2,false),
('exp_cara_de_santo','impostor',3,false),
('exp_desvio_de_olhar','impostor',4,false),
('exp_historia_ensaiada','impostor',6,false),
('exp_alibi_de_bolso','impostor',7,false),
('exp_disfarce_improvisado','impostor',8,false),
('exp_fala_mansa','impostor',9,false),
('exp_meia_verdade','impostor',12,false),
('exp_suspeito_simpatico','impostor',15,false),
('exp_truque_de_conversa','impostor',20,false),
('exp_cronista_da_penumbra','games',300,false),
('exp_sentinela_da_madrugada','games',400,false),
('exp_cartografo_dos_segredos','games',600,false),
('exp_habitante_do_labirinto','games',700,false),
('exp_memorias_do_abismo','games',800,false),
('exp_vigia_dos_mil_rostos','games',900,false),
('exp_arquivo_das_sombras','games',1100,false),
('exp_guardiao_da_ultima_sala','games',1250,false),
('exp_testemunha_do_infinito','games',1500,false),
('exp_eterno_convidado','games',1750,false),
('exp_mente_afiada','wins',75,false),
('exp_xeque_silencioso','wins',125,false),
('exp_estrategista_da_nevoa','wins',150,false),
('exp_fio_da_navalha','wins',175,false),
('exp_senhor_do_desfecho','wins',200,false),
('exp_soberano_da_rodada','wins',300,false),
('exp_vontade_de_aco','wins',350,false),
('exp_veredito_irrefutavel','wins',400,false),
('exp_dominio_das_pistas','wins',450,false),
('exp_triunfo_sobre_o_caos','wins',600,false),
('exp_lupa_de_prata','common',35,false),
('exp_juiz_das_aparencias','common',75,false),
('exp_cacador_de_contradicoes','common',125,false),
('exp_olho_da_tempestade','common',150,false),
('exp_cao_de_guarda_da_verdade','common',175,false),
('exp_analista_do_impossivel','common',200,false),
('exp_sentinela_dos_inocentes','common',300,false),
('exp_desvendador_de_enigmas','common',350,false),
('exp_ultima_testemunha','common',400,false),
('exp_verdadeiro_inquisidor','common',500,false),
('exp_teatro_de_sombras','impostor',35,false),
('exp_labios_de_veludo','impostor',75,false),
('exp_falsificador_de_destinos','impostor',125,false),
('exp_marionetista','impostor',150,false),
('exp_mascara_de_obsidiana','impostor',175,false),
('exp_vendedor_de_certezas','impostor',200,false),
('exp_veneno_nas_palavras','impostor',300,false),
('exp_dono_do_alibi_perfeito','impostor',350,false),
('exp_ilusionista_da_mesa','impostor',400,false),
('exp_roteirista_do_engano','impostor',500,false),
('exp_bibliotecario_das_mil_faces','games',2000,false),
('exp_monumento_dos_segredos','games',5000,false),
('exp_coroa_do_ultimo_veredito','wins',1000,false),
('exp_imperador_da_mesa','wins',2000,false),
('exp_oraculo_da_verdade','common',750,false),
('exp_farol_da_eternidade','common',1000,false),
('exp_rei_das_mil_mascaras','impostor',750,false),
('exp_soberano_do_engano','impostor',1000,false),
('exp_ascendente_das_sombras','level',60,false),
('exp_nome_escrito_nas_estrelas','level',75,false),
('exp_o_nome_que_ninguem_acusou','clean_impostor',50,true),
('exp_testemunha_intocavel','clean_common',50,true),
('exp_equilibrio_do_abismo','balanced',100,true),
('exp_o_impossivel_aconteceu','streak',30,true),
('exp_ultimo_habitante_da_nevoa','games',10000,true)) as rules(title_code,metric_name,threshold,exclusive)
 loop
 metric:=case award.metric_name when 'games' then stats.games when 'wins' then pr.online_wins
 when 'common' then stats.common when 'impostor' then stats.impostor when 'level' then lvl
 when 'streak' then prog.streak_all when 'clean_impostor' then stats.clean_impostor
 when 'clean_common' then stats.clean_common when 'balanced' then least(stats.common,stats.impostor) end;
 if metric>=award.threshold then
 if (select t.world_unique from public.es_titles t where t.code=award.title_code) then
 with claim as (insert into public.es_title_claims(title_code,user_id) values(award.title_code,p_user)
 on conflict do nothing returning title_code)
 insert into public.es_user_titles(user_id,title_code) select p_user,title_code from claim on conflict do nothing;
 else
 insert into public.es_user_titles(user_id,title_code) values(p_user,award.title_code) on conflict do nothing;
 end if;
 end if;
 end loop;
 end;

end$function$
;

