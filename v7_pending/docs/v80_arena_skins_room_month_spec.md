# Entre Suspeitos V8.0 — Arena, skins e rankings (especificação consolidada)

Data: 17/11/2026. Estado: **protótipo web isolado + especificação**, sem migração em produção.

## Regras aprovadas e prototipadas

- **Arena frontal:** a votação online permanece secreta, registrada pelo servidor via `es_vote`; um voto corresponde a um golpe visual; o replay coletivo usa somente agregados.
- **Identidade sem repetição:** na fase de votação real, retirar o painel de participantes com banners/molduras que repete o palco. Em cima de cada guerreiro mostrar **título equipado, nome e personagem**, com indicação acessível de seleção. Preservar informações necessárias ao voto, sem expor o autor.
- **Visuais:** títulos místicos com vermelho vivo (substituir o laranja atual); raridade crescente em silhueta, armadura, arma, cor e efeitos: comum discreta, incomum acabamento leve, rara armadura diferenciada, lendária ornamentos/halo, mística aura rubra exclusiva. Não apenas mudar uma borda.
- **300 skins:** catálogo planejado e pré-visualizado de 80 comuns, 75 incomuns, 70 raras, 50 lendárias e 25 místicas. Atualmente são **variações procedurais demonstrativas**, não 300 ilustrações finais individuais. Os títulos existentes no Supabase são dessas cinco raridades; não há títulos 'épicos'.
- **Conquistas:** desbloqueio de skin validado pelo servidor, vinculado a títulos/conquistas já realmente obtidos; cliente só escolhe a skin dentre as autorizadas. Desafios aleatórios: gerados e fixados no servidor por período, com seed auditável, sem possibilidade de reescolher ilimitadamente para obter recompensas fáceis.

## Rankings e persistência — especificação para backend

- **Ranking de cada sala:** pontuação separada por `room_id` e `user_id`, usando apenas resultados oficiais concluídos `es_results` associados a `es_rounds.room_id`. Proposta inicial consistente com o ranking sazonal atual: vitória +25, derrota −25; não permitir que o cliente informe pontos livremente. Não remover ao desconectar, sair ou voltar à mesma sala. Empates devem ter critério estável e indicado. Não confundir ID da sala com código que possa ser reutilizado.
- **Ordem dos bonecos:** ordenar por pontuação da sala, com atualização depois do encerramento de cada rodada; não antecipar identidade de votantes.
- **Até 20 jogadores:** o protótipo mostra 20, mas a configuração real atualmente tem salas de até 10. Antes de ampliar, revisar limites de entrada, número de impostores, desempenho, voz, rede, responsive, distribuição de votos e encerramento.
- **Temporadas mensais:** primeira virada pretendida em **01/12/2026 à 00:00 em America/Fortaleza**; novembro tem 30 dias. O ranking mensal reinicia logicamente no primeiro dia de cada mês usando `finished_at`, sem zerar estatísticas vitalícias. Guardar os **três primeiros de cada mês** em arquivo histórico imutável no banco com data, ID, apelido exibido no fechamento e pontuação. Programar fechamento idempotente em job controlado pelo servidor; se indisponível, prever recuperação segura no próximo acesso. Empates precisam ter critério definido antes do primeiro fechamento.
- **Privacidade/segurança:** tabelas novas com RLS e sem INSERT/UPDATE para clientes; funções acessíveis apenas a autenticados e autorização explícita de participação na sala. Nenhum identificador de autor de voto em payload de replay.

## Entregas e testes

1. **Já criado:** `web/arena-skins-demo.html` no GitHub, página isolada com 300 variações procedurais, progressão de raridade, 20 bonecos, títulos em cima do nome, seleção e golpes visuais, ranking local de exemplo, e simulação de pódio mensal. Não usa Supabase nem concede recompensas.
2. **Próxima implementação em branch:** equipar skin validada pelo servidor; suprimir painel redundante exclusivamente na votação; sincronizar títulos, ranking real por sala e avatar; preservar perfil completo fora da votação.
3. **Migrações a revisar antes de aplicar:** tabela de skins desbloqueadas e equipadas; pontuação/autorização por sala; arquivo mensal e job; RPCs autenticadas de consulta.
4. **Critérios de aceite:** testar dois celulares reais para voto secreto; reentrada mantém pontos; 10 e depois 20 jogadores sem perda de votos; mudança de perfil não desfaz pronto; alteração de regras desfaz pronto; desempate e pódio mensal; desempenho em Android 360px; taxa de quadros e preferência por movimento reduzido. Não declarar esses testes como executados agora.

**Link de demonstração (sujeito ao deploy GitHub Pages):**
https://kayssoneduardo.github.io/Kayssoneduardo-entre-suspeitos/arena-skins-demo.html

**Não afetado pela demo:** contas, títulos reais, votos reais, pontos reais, Supabase, APK e jogo online publicado.
## Complemento V8.1 — 17/11/2026
- Objetivo: 30 pessoas por sala (20 nao e limite). Demo V8.1 com 6, 10, 20 e 30; servidor real segue em 10 ate migracao, revisao de voz e testes.
- Visual: personagens com proporcoes humanas, armadura, escudo, espada e pernas visiveis; silhueta por raridade. Somente a pessoa em primeiro do ranking da sala usa coroa dourada, independentemente da raridade, e a coroa muda quando muda a lideranca.
- Pontuacao atual confirmada no banco: +25 pontos por vitoria publica, -25 por derrota publica.
- Regra adicional: pessoa comum inocente, acusada (recebeu voto) e derrotada, que votou corretamente sozinha em pelo menos um impostor verdadeiro, nao perde nem ganha pontos de ranking nessa rodada: 0 em vez de -25. Vale com multiplos impostores quando ao menos um foi apontado exclusivamente por essa pessoa. Nao transforma derrota em vitoria; XP e estatisticas seguem independentes. Nao se aplica a impostores, ausentes ou quem nao votou.
- Calculo da excecao exclusivamente no servidor, sem divulgar quem votou em quem, persistindo delta de pontos para rankings global, por sala e sazonais. Nenhuma alteracao de banco de producao foi aplicada pela demo.
