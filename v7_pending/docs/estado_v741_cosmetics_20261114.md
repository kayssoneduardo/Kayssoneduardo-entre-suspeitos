# Entre Suspeitos V7.4.1 — personalização visual / continuidade
Data: 14/11/2026. Base: V7.4 RC publicada em main (commit 0828c155aba9ae631d7a2af8c8850cfd0934c072).
Branch de desenvolvimento: feature/v7-4-1-cosmeticos-banners-20261114.

## O que foi criado
- 16 molduras originais vetoriais e 16 banners vetoriais tematizados em web/cosmetics.js; não dependem de links externos.
- Exibição da moldura (ao redor do avatar), do banner (fundo do cartão) e do nome verdadeiro da moldura na sala online e no perfil.
- Cor do apelido herdada da raridade do título equipado; títulos continuam independentes das molduras.
- Galeria Personalização: abas Molduras / Banners, cartões visuais, condições, bloqueio, item equipado e ação Equipar; perfil com prévia.
- Banner de destaque do evento Operação Névoa nas salas enquanto ativo.
- Ordem do menu inicial: Jogar Online acima de Jogar Offline.
- Cor do apelido no ranking herdada do título.

## Catálogo (32 itens)
Molduras: Clássica; Vigilante Bronze; Olhar de Ouro; Névoa; Coroa Arcana; Lâmina Eclipse; Caçador Ébano; Ordem Velada; Rubi Sombrio; Sentinela Lunar; Espiral Abissal; Espectro Violeta; Chamas Eternas; Aurora Fantasma; Guardião do Eco; Trono da Noite.

Banners: Sombras Originais; Ecos da Névoa; Trono Arcano; Caçada Sombria; Lua Partida; Conspiração; Cidade Sem Rosto; Corredor Espectral; Floresta Rubra; Eclipse Violeta; Juramento Oculto; Ruínas do Segredo; Reino dos Suspeitos; Escuta Noturna; Segredo Carmesim; Vidro Estilhaçado.

## Banco de dados Supabase
Projeto lvnhwfctursuduboovub (entre-suspeitos). Migração SQL versionada em v7_pending/sql/v741_cosmetic_catalog.sql:
- es_profiles.equipped_banner TEXT DEFAULT 'padrao';
- tabela es_cosmetic_catalog, RLS habilitada e acesso direto negado a anon/authenticated;
- es_cosmetic_inventory() lista itens e elegibilidade usando vitórias públicas/XP/evento, sem gastar XP;
- es_cosmetic_equip(kind,code) altera apenas conta autenticada, verificando se o item foi desbloqueado;
- es_room_view(uuid) retorna frame/banner de cada participante autenticado à sala (script v741_room_view_cosmetics.sql).
- Molduras anteriores, XP, títulos, ranking e palavra secreta mantidos. Não recompensar contas automaticamente fora das regras existentes.

## Testes
- GitHub Actions na branch: v74-check com v741_cosmetics_smoke, web_auth_smoke, word_bank_smoke, v74_smoke; último run de branch em 14/11 success.
- Teste transacional SQL: catálogo devolveu 32 itens (16 por categoria), 2 itens equipados.
- Teste com ROLLBACK: frame bloqueada não pode equipar; banner padrão pode; nenhum dado de teste persistiu.
- anon não executa função de equipar; authenticated sim; não pode inserir diretamente no catálogo.
- Testes automatizados NÃO substituem revisão visual no Chrome móvel, nem testes físicos de voz/reconexão/Android.

## Próximos passos
- Revisar CI e juntar esta branch à main; confirmar deploy real via GitHub Pages e baixar/abrir site atualizado.
- Validar escala do SVG em telas estreitas e desempenho em Android.
- Futuro: banners e molduras com artes ilustradas mais complexas, pré-visualização completa antes de equipar, compatibilidade com download APK.
- Continuar respeitando: 3 jogadores mínimo online, carta 30 segundos, votação secreta sem cronômetro, ranking +25/-25 público, privados sem XP/ranking, 200 títulos e restrições místicas, 26 pessoas de Loreto sem dica, nickname Zero reservado, música somente menus, etc.
