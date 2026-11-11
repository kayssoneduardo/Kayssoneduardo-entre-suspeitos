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
