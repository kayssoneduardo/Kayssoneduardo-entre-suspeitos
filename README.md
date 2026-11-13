# Entre Suspeitos — Android, iPhone e computador

## Jogue pelo navegador (Web V7.1)

**Site público:** https://kayssoneduardo.github.io/Kayssoneduardo-entre-suspeitos/

- iPhone: abrir no Safari; nenhum APK necessário.
- Computador: abrir no Chrome, Edge, Firefox ou Safari.
- Android: usar o APK V7 ou o site no navegador.
- **As contas e salas online são compartilhadas** porque o site e o APK utilizam o mesmo projeto Supabase.
- As salas começam com **3 pessoas prontas** (1 impostor para grupo de 3); partidas maiores seguem o limite de configuração no servidor.
- **1.322 palavras, 12 categorias**, nos modos offline e online.

### Como jogar juntos
1. Cada pessoa abre o site ou instala o APK Android.
2. Entre em **Jogar online** e faça login com sua conta.
3. Uma pessoa escolhe **Criar sala**, decide as regras e copia o código.
4. Os demais selecionam **Entrar com código** e digitam o mesmo código.
5. Quando todos marcarem **Estou pronto**, o anfitrião inicia a partida.

### Atenções técnicas
- **Áudio integrado é experimental.** É necessário permitir o microfone no Safari/Chrome/Android. Redes com NAT restritivo podem precisar de TURN; ainda não houve teste de voz cruzando todas as plataformas.
- **Confirmação de e-mail:** o redirecionamento automático do Supabase pode depender da autorização da URL. O site tem um campo para colar o link original do e-mail e verificar a conta diretamente. Nunca compartilhe o link de confirmação com outros.
- A versão web foi construída a partir do cliente HTML anterior, atualizada para o mesmo backend do Flutter. Alguns detalhes do layout e funções podem divergir da V7 Android; a paridade visual completa ainda está em andamento.

### Código e hospedagem
- Código estático gerado em `web/` pelo workflow `publicar-site-v7.yml` a partir do projeto web original.
- **GitHub Pages está ativado e publicado**. Compilação e teste HTTP concluídos: https://github.com/kayssoneduardo/Kayssoneduardo-entre-suspeitos/actions/runs/43338419581
- O site oficial gratuito está em **GitHub Pages**. Supabase permanece como backend online; o endereço anterior redireciona para o Pages.
- O teste automatizado HTTP/HTTPS está em `.github/workflows/verificar-site-publicado.yml`.
- Código Android/Flutter e acompanhamento da V7: [issue #1](https://github.com/kayssoneduardo/Kayssoneduardo-entre-suspeitos/issues/1).

---

## Histórico
# Entre Suspeitos — Android offline (protótipo)

Protótipo offline para jogar passando um único celular de mão em mão.

## Gerar APK no GitHub

1. Envie o conteúdo deste pacote para a raiz do repositório GitHub, mantendo a pasta `.github/workflows`.
2. Abra a aba **Actions** e selecione **Gerar APK Android**.
3. Toque em **Run workflow** e aguarde o resultado.
4. Abra a execução concluída e baixe o artefato **Entre-Suspeitos-APK**.
5. Extraia o ZIP do artefato no Android e instale `app-debug.apk`.

O APK é uma versão de testes assinada com chave de depuração, não uma versão para publicação na Play Store.
O projeto gera o Android nativamente no GitHub Actions usando Capacitor.

## Observações

- O banco de palavras fica embutido em `www/index.html`, portanto o jogo não precisa de internet depois de instalado.
- Este pacote ainda não foi compilado nem testado em um aparelho Android.
- Ações podem exigir habilitação inicial na conta/repositório GitHub.
