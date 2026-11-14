# Entre Suspeitos — V7.4.5: revisão de banners após feedback em 14/11/2026
Status: **revisão, não publicada**. A V7.4.4 publicada não deve ser alterada até que os 13 banners abaixo tenham imagens finais independentes e sejam aprovados em resolução real.
## Diagnóstico confirmado
Os 13 banners substituídos na V7.4.4 foram recortados de uma prancha de conceitos (ver `v7_pending/docs/estado_v744_cosmeticos_20261114.md`); a origem de baixa resolução não recupera detalhes só aumentando dimensões ou compressão. O usuário indicou `Segredo Carmesim` e `Ruínas do Segredo` como referências de acabamento que devem ser preservadas.
## Escopo, arte e narrativa
| Arquivo | Raridade | Ajuste obrigatório |
|---|---|---|
| cacada_sombria.webp | incomum | Nova cena independente e nítida: perseguição de verdade em floresta noturna; moldura discreta visível |
| cidade_sem_rosto.webp | raro | Recriar cidade habitada por multidão sem rostos/identidade, não apenas uma pessoa de máscara |
| conspiracao.webp | comum | Melhorar a clareza de investigação, relações ocultas, conspiração de pessoas/suspeitos; manter o conceito de investigação |
| corredor_espectral.webp | incomum | Manter corredor e espíritos, redesenhar com alta definição e detalhes sem pixelização |
| eclipse_violeta.webp | lendário | Eclipse violeta grande e reconhecível, céu e atmosfera nítidos, efeito máximo da classe |
| ecos_da_nevoa.webp | épico | Névoa como elemento dominante, ruínas emergentes, iluminação e detalhes nítidos |
| escuta_noturna.webp | comum | Ação de escutar/interceptar na noite, com história visual clara e detalhes legíveis |
| floresta_rubra.webp | épico | Floresta carmesim como protagonista, profundidade e folhas nítidas |
| juramento_oculto.webp | incomum | Pacto ou juramento clandestino perceptível; arte nova nítida; confirmar nome de catálogo (usuário falou "Julgamento") |
| lua_partida.webp | raro | Lua evidentemente partida, detalhes nítidos com hierarquia rara |
| reino_dos_suspeitos.webp | lendário | Reino de pessoas suspeitas/ameaças implícitas, alta nitidez com efeito lendário |
| padrao.webp | comum | Sombras Originais: identidade marcante e original sem repetir o monstro genérico; baixa intensidade visual |
| trono_arcano.webp | lendário | Preservar estilo do palácio arcano, reposicionar trono inteiro em área central-direita (não extremo direito), visível sem corte em cartões móveis |
## Preservação
Não substituir `segredo_carmesim.webp`, `ruinas_do_segredo.webp` nem `vidro_estilhacado.webp` sem novo feedback. Não mexer em molduras, XP, títulos, desbloqueios, ranking, banco nem regras.
## Critérios de aceitação antes de publicar
1. Cada banner deve ser criado **individualmente**, nunca recortado de colagem, com composição 3:1 e detalhes suficientes em zoom 100%.
2. Guardar original de alta resolução; exportar WebP 1080×360, sem esticar fonte pequena. Preferir origem >=2160×720 e reamostrar com boa filtragem.
3. Comparar em panorama isolado, em seleção, perfil e sala no celular; conferir nome × imagem, contorno e enquadramento sem cortes.
4. Respeitar a intensidade existente: comum < incomum < raro < épico < lendário; brilho não pode mascarar falta de nitidez.
5. Testes automatizados, verificação de conteúdo e cache com novos endereços antes de publicar.
## Alteração de código já feita nesta branch
O HTML dos banners recebe uma classe individual `banner-code-<code>`; a imagem do Trono Arcano usa `object-fit:contain` para evitar corte em caixas de proporções diferentes, e Caçada Sombria tem contorno visível e discreto. **Isto não cria imagens de maior qualidade**. Os 13 arquivos de arte ainda precisam ser recriados antes da atualização pública.
