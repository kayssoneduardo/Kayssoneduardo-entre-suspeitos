# Entre Suspeitos — V7.4: implementação consolidada
Atualização: 2026-11-14. Base: commit 1012e006bbd5389e51d82add179a61c71d6b5740 (web 7.3.11). Branch: `feature/v7-4-preparacao-20261114`.

## Situação desta branch
- [x] Conferido código da web 7.3.11 e colunas das tabelas es_* no Supabase.
- [x] Corrigido texto desatualizado em "Como jogar": carta por 30 s, votação sem cronômetro, mínimo de 3.
- [x] Corrigido texto da categoria local com menos de 100 entradas.
- [x] Aviso não bloqueante de reconexão em sala, removido no retorno da RPC.
- [x] Botão de copiar código da sala; orientação dos convites diretos corrigida.
- [ ] Cobertura automatizada e teste real dos ajustes desta branch.
- [ ] Missões, estatísticas, cosméticos e eventos — especificados abaixo, não implementados.
- [ ] Publicação em main / web / APK — não realizada.

## Invariantes obrigatórias
- Online: 3 jogadores ou mais, todos prontos; carta por 30 segundos; sem discussão cronometrada; votação secreta sem relógio, aguardando os votantes ainda ativos; desconexão temporária não finaliza votação.
- Impostores aleatórios e em proporção válida; resultado individual, inclusive vários impostores; empate favorece impostores segundo regra vigente.
- Ranking acumulativo: +25/−25 apenas nas públicas. XP separado, não gasto, sem reset ou temporada de ranking. Privadas não geram XP de partida/ranking.
- Títulos atuais (200) preservados; místicos exclusivos, salvo os dois proprietários históricos de Verdade Silenciosa. Não reaplicar scripts de catálogo antigos.
- Categoria Pessoas de Loreto: 26 nomes sem dica; manter demais categorias e validação.
- Apelidos exclusivos, Zero reservado à conta proprietária. Confirmar e-mail continua obrigatório.
- Trilha apenas menus, nunca sala de espera ou partida.
- Nenhuma chave de serviço no cliente; qualquer concessão de recompensa fica no servidor e precisa ser idempotente.

## 1) Estabilidade / reconexão
Implementar máquina de estado de rede (conectado, degradado, offline, recuperando), backoff de polling em falha, heartbeat controlado, restauração por `es_rejoin` sem recriar membro, reentrada na sala e retomada de voz somente após gesto/permissão quando exigido pelo navegador. Não perder voto, não marcar saída ao fechar aba durante queda temporária. Durante votação, manter quórum efetivo segundo status de membros, não apenas `seen_at`.
Critérios: simular 10/30/60 s offline, refresh e mudança de rede; nenhum voto duplicado, nenhum encerramento prematuro, sala recuperável.

## 2) Amigos e convites
Aproveitar `es_friends`, `es_invites`, RPCs `es_friend_list`, `es_invite_send`, `es_invite_list`, `es_invite_accept` já existentes. Código de sala copiável é o primeiro ajuste. Próximo: link profundo com código validado, preservado através do login e aplicado só após autenticação; convites não devem revelar salas privadas a terceiros. Exibir presença somente quando consentida e inferida de heartbeat recente.
Critérios: convite aceito/expirado, sala cheia, usuário não amigo, host trocado, reentrada por link e privacidade.

## 3) Missões diárias/semanais
Tabelas propostas `es_mission_definitions`, `es_mission_progress` e `es_mission_awards` (unicidade `user_id,mission_id,period_start`). Contagem somente de rodada pública finalizada no servidor; recompensa concedida atomicamente, uma vez, com trilha auditável. Reinício diário e semanal em UTC (ou fuso fixo único anunciado), nunca pela hora do aparelho. Regras de XP e valores de recompensa sujeitos a aprovação específica; nunca mudar pontos de ranking.
Critérios: 2 finalizações simultâneas não concedem prêmio duas vezes; privadas não pontuam; não votar não conta quando objetivo exige voto.

## 4) Estatísticas avançadas
RPC autenticada `es_my_stats` calculada a partir de `es_results` + `es_rounds`, `es_votes`, `es_profiles` e `es_progress`. Mostrar totais, taxa de vitórias por papel e modo, precisão do voto (apenas após rodada finalizada), votos recebidos e últimas partidas. Conferir política de visibilidade: meus detalhes visíveis só para mim. Denominadores zero mostram —, não NaN; privados aparecem sem contribuir XP/ranking.
Critérios: confronto SQL agregações vs. partidas reais e testes com 0 partidas.

## 5) Resultados aprimorados
Revelação visual com acessibilidade (redução de movimento), resumo de impostores, resultados individuais, votos recebidos e XP individual existentes em `es_room_view`. Detalhe de alvos só deve aparecer após encerramento e apenas se backend autorizar. Nunca exibir identidade/votos durante votação. Botão de revanche preserva regras e redefine pronto.
Critérios: 1 e vários impostores, empate, não votantes, abandono e navegação por teclado.

## 6) Molduras / personalização
Catálogo de itens cosméticos e propriedade por usuário (`es_cosmetics`, `es_user_cosmetics`), equipamento validado por RPC e verificação de posse; visual sem vantagem competitiva. Molduras desbloqueadas por feitos rastreáveis; jamais conceder místico adicional pela personalização. Os títulos permanecem sistema independente. Avatar atual continua funcionando com e sem moldura.
Critérios: jogador não pode equipar item de terceiro; fallback visual em APK sem recurso; testar CSS/contraste.

## 7) Eventos temporários
`es_events` com data início/fim controlada pelo servidor, condições e visibilidade, `es_event_progress` com deduplicação por rodada e premiações limitadas. Primeira fase: desafios opt-in de fim de semana SEM reset/temporada do ranking. Eventos nunca exigem ação que prejudique a partida. Administração e auditoria de alterações obrigatórias.
Critérios: evento antes/depois da janela, transação no limite do encerramento, recompensa única, nada retroativo sem decisão expressa.

## Sequência recomendada de entrega no mesmo lote
1. Refatorar reconexão e testes de queda de rede.
2. Completar código/link de convite e fluxo de amigos autenticado.
3. Criar agregações das estatísticas e tela de resultados.
4. Implementar missões com idempotência e testes de premiação.
5. Implementar cosméticos e eventos sobre motor de missões com regras separadas.
6. Rodar smoke tests web e SQL transacional revertido; validar login, XP, ranking, títulos, Loreto e votação.
7. Verificar publicação web via Actions e APK separadamente. Teste físico Android depende de aparelho/ambiente disponível.
8. Atualizar arquivo de continuidade cumulativo. Preservar documentação e versionar commits.

## Riscos e limites
Alterações em RPCs críticas (`es_finalize`, `es_room_view`, `es_rejoin`) exigem inspeção das definições atuais, migração revisada e testes transacionais. Não substituir funções no escuro. Não afirmar recursos especificados como entregues ou testes manuais como executados.
