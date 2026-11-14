# STATUS FINAL — V7.4.3 PUBLICADA (14/11/2026)

**Este status final substitui todas as referências anteriores a “não publicada”, “sem arquivos binários” ou “PR em rascunho” abaixo. Os registros antigos foram preservados apenas como histórico.**

- Site público: https://kayssoneduardo.github.io/Kayssoneduardo-entre-suspeitos/
- Commit do merge: `82b7fbfe02beac495577f3787f7cf6ca2af5a7b1` (PR #5).
- GitHub Pages run #43636854932: **build, deploy e verificar-site-publico = success**. O verificador público baixou os 16 banners e quatro molduras e checou os cabeçalhos WebP.
- A branch principal contém 16 arquivos `web/assets/banners/*.webp` e quatro arquivos `web/assets/frames/*.webp`.
- As molduras ilustradas são: Olhar de Ouro (rara), Névoa (épica), Coroa Arcana e Chamas Eternas (lendárias). As outras 12 molduras mantêm os SVGs.
- Os cinco níveis de intensidade visual estão ligados à raridade cosmética cadastrada, sem alteração de rank, títulos, XP ou desbloqueios.
- `web/index.html`: **VERSÃO WEB 7.4.3 RC**; todos os JS/CSS recebem nova chave de cache.
- Não houve mudança no Supabase; as regras, títulos, dados e estatísticas existentes permanecem como estavam.
- Verificações automatizadas não são equivalentes a uma rodada real com três Androids. Teste físico e APK continuam separados.

---

# Entre Suspeitos — V7.4.3 (revisão, NÃO publicada)

## Escopo solicitado
Usuário aprovou as amostras de banners cinematográficos e pediu preparar a integração sem atualizar o site; as molduras da versão atual permanecem inalteradas, mas quatro amostras ilustradas independentes foram criadas para futura escolha.

## Implementação já preparada na branch
- `web/cosmetics.js`: `banner(code)` tenta renderizar a arte local `assets/banners/<código>.webp` e mantém o SVG original como fallback.
- `web/style.css`: composição responsiva, recorte tipo cover, legibilidade dos cartões e camada de fallback.
- `v7_pending/docs/v743_banner_manifest.json`: relação completa e estável dos 16 códigos já existentes no Supabase.
- `v7_pending/tests/v743_banner_assets_smoke.cjs`: smoke para 16 códigos, formato e fallback.
- GitHub Pages NÃO deve ser publicado a partir desta branch. O workflow de Pages continua restrito a main.

## Artes geradas e situação de hospedagem
16 arquivos `.webp` 1080×360, de aproximadamente 30 a 100 KiB cada, preparados **localmente** e entregues no pacote `Entre_Suspeitos_V743_Artes_Para_Revisao.zip` desta conversa.
Oito ilustrações independentes seguem a direção gótica aprovada. Outros oito banners utilizam estudos alternativos, variantes e temas de fantasia que ainda merecem apreciação; não alegar aprovação definitiva de cada arte.
Existem ainda quatro amostras de molduras PNG transparentes, mas **não foram integradas ao jogo**.

IMPORTANTE: a API GitHub disponível neste fluxo grava texto; os binários WebP locais **ainda precisam ser enviados ao repositório** na pasta `web/assets/banners/` antes de mesclar esta branch. Sem eles, a UI continua exibindo os SVGs antigos como fallback. Não publicar a branch antes da transferência e validação real dos 16 arquivos.

## Preservação
Molduras e desbloqueios atuais intactos; nenhum SQL/Supabase alterado; nenhuma modificação em XP, títulos, ranking ou eventos. O jogo público permanece V7.4.2.

## Antes de publicar
1. Usuário revisa a prévia offline interativa `Entre_Suspeitos_V743_Previa_Interativa.html`.
2. Se desejar, refinar as artes com excesso de fantasias heroicas, para que todos os 16 banners mantenham a mesma identidade visual gótica.
3. Transferir 16 WebP para `web/assets/banners` na branch, confirmar nomes e integridade (não só caminhos).
4. Testar preview real no Android e GitHub Actions, deployar apenas após novo pedido do usuário.
5. Atualizar o TXT de continuidade, referenciar o commit e o status efetivo.

## Atualização: raridade visual aprovada
Em 14/11/2026 o usuário solicitou que banners sigam a MESMA hierarquia de destaque das molduras: itens comuns discretos, incomuns moderados, raros refinados, épicos com brilho controlado, lendários com máximo destaque.
- `web/cosmetics.js`: mapeamento fixo dos 16 códigos de banner para a raridade já definida em `es_cosmetic_catalog`, exposto via `ESCosmetics.bannerRarity(code)`, e classe `banner-rarity-<tier>` no elemento de arte. Valores não vêm de nível ou rank do jogador.
- `web/style.css`: cinco níveis visuais progressivos de saturação, brilho, contorno e iluminação. **As próprias ilustrações aprovadas não foram alteradas.** Evitar efeitos chamativos em comuns/incomuns e excesso de animação em celulares modestos.
- `v7_pending/tests/v743_banner_assets_smoke.cjs`: cobertura de 16 níveis de raridade.
- A branch permanece DRAFT; **não mesclar/publicar** sem imagens WebP anexadas, validação em celular e autorização do usuário.

## Fechamento do lote e integração antes da publicação (14/11/2026)
- Os 16 WebP `1080×360` foram finalmente enviados como **blobs binários** ao GitHub na pasta `web/assets/banners/` (sem uso de textos base64 no site).
- As quatro molduras aprovadas `ouro` (raro), `nevoa` (épico), `coroa_arcana` e `chamas_eternas` (lendárias) foram anexadas como WebP RGBA na pasta `web/assets/frames/`. As outras 12 continuam usando SVG.
- A nova função `avatar()` seleciona as quatro artes aprovadas; todo o catálogo segue os critérios de raridade definidos em `es_cosmetic_catalog`.
- Os 20 binários foram confirmados na árvore GitHub; o arquivo `web/index.html` identifica a versão web `7.4.3 RC`.
- O fluxo de publicação agora testa os 20 cabeçalhos WebP depois do deploy, para não sinalizar êxito caso algum arquivo esteja ausente.
- A publicação depende de merge em `main` e de êxito no GitHub Pages; o resultado dessa etapa deve ser registrado na continuidade após verificação, não presumido antecipadamente.
