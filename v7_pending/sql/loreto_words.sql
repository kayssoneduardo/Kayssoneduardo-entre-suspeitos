insert into public.es_words(category,word,hint,difficulty) values
('Pessoas de Loreto','Germano Coelho','vida pública municipal','Fácil'),
('Pessoas de Loreto','Luiz Filho','vida pública municipal','Fácil'),
('Pessoas de Loreto','Zé do Constâncio','vida pública municipal','Fácil'),
('Pessoas de Loreto','Conceição do João Paulo','vida pública municipal','Médio'),
('Pessoas de Loreto','Zé Filho','vida pública municipal','Médio'),
('Pessoas de Loreto','Branca do Morenage','vida pública municipal','Médio'),
('Pessoas de Loreto','Arenaldo do Miúdo','vida pública municipal','Difícil'),
('Pessoas de Loreto','Benedito da Sucam','vida pública municipal','Médio'),
('Pessoas de Loreto','Leirival Arrais (Barba Azul)','vida pública municipal','Difícil'),
('Pessoas de Loreto','Luiz Boi','vida pública municipal','Fácil'),
('Pessoas de Loreto','Luiz Carlos do Tomaz','vida pública municipal','Difícil')
on conflict(category,word) do update set hint=excluded.hint,difficulty=excluded.difficulty;
