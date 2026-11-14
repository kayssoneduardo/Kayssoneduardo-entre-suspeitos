# Entre Suspeitos V7.4.4 — revisão dos cosméticos (não publicada)
Data: 14/11/2026. Base V7.4.3 RC, main fa8dbc7ef8896c5c01f0d7ac52dc1725e55251b0.

## Pedido aprovado pelo usuário
- Cada banner precisa ilustrar concretamente o seu próprio nome; evitar reciclar guerreiro/castelo.
- O visual cresce conforme a raridade cosmética: comum discreto, incomum suave, raro refinado, épico com efeitos, lendário com maior destaque.
- Mover a imagem original de Corredor Espectral para Vidro Estilhaçado; criar um novo corredor com aparições.
- Reforçar névoa e eclipse; destacar Trono Arcano.
- Preservar Ruínas do Segredo e Segredo Carmesim; conservar a arte de Conspiração, que não recebeu crítica específica.
- Redesenhar 12 molduras que ainda eram SVG no estilo dos quatro desenhos ilustrados aprovados.

## Arte implementada
- 16 banners panorâmicos em `web/assets/banners/*.webp` (1080×360). 13 alterações:
  `cacada_sombria`, `cidade_sem_rosto`, `corredor_espectral`,
  `ecos_da_nevoa`, `eclipse_violeta`, `escuta_noturna`,
  `floresta_rubra`, `juramento_oculto`, `lua_partida`,
  `reino_dos_suspeitos`, `padrao` (Sombras Originais),
  `trono_arcano`, `vidro_estilhacado`.
- 3 preservados: `conspiracao`, `ruinas_do_segredo`, `segredo_carmesim`.
- 16 molduras ilustradas e transparentes em `web/assets/frames/*.webp` (448×448). 12 novas: `classica`, `bronze`, `ordem_velada`, `sentinela_lunar`, `aurora_fantasma`, `lamina_eclipse`, `cacador_ebano`, `espectro_violeta`, `rubi_sombrio`, `espiral_abissal`, `guardiao_do_eco`, `trono_da_noite`.
- 4 previamente aprovadas preservadas: `ouro` (Olhar de Ouro), `nevoa`, `coroa_arcana`, `chamas_eternas`.
- `web/cosmetics.js` passa a usar imagens WebP nos 16 avatares; `web/style.css` mantém filtro/iluminação por raridade e reduz brilho de comuns/incomuns.
- `web/index.html` rotulado V7.4.4 RC e novo cache key. Nenhuma alteração no Supabase, em títulos, XP, ranking ou regras de desbloqueio.
- Teste de integridade e não repetição em `v7_pending/tests/v743_banner_assets_smoke.cjs`, testes anteriores de perfil/salas ajustados e workflow de Pages configurado para validar os 32 recursos.

## Limitações e publicação
As novas cenas foram recortadas da prancha de conceitos aprovada; algumas têm resolução artística de origem mais baixa que as quatro cenas independentes da V7.4.3. A prévia visual em celular é importante, especialmente antes de impressão ou tela cheia.
NÃO PUBLICADA: esta implementação está na branch `feature/v744-cosmeticos-cenarios-raridades-20261114`, e não na `main`. O site público continua V7.4.3.
Prévia local autossuficiente: `Entre_Suspeitos_V744_Previa_Interativa.html`.
Catálogo para comparação: `Entre_Suspeitos_V744_Banners_Previa.jpg`, `Entre_Suspeitos_V744_Molduras_Previa.jpg`.
Pacote das 32 artes: `Entre_Suspeitos_V744_Artes_Aprovadas.zip`.
