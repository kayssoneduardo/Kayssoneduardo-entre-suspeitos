# V7 — autenticação (preparação para teste integrado)

Este código fica em `v7_pending` e **não substitui o APK V6 instalado**. O workflow `validar-v7.yml` compila para detectar erros, mas não publica APK intermediário.

## O que foi preparado
- Tela única de login, cadastro, reenvio de confirmação e recuperação de senha em `lib/auth_flow.dart`.
- Novo cadastro exige nickname e passa o nome ao trigger `es_profile_new`.
- Links de recuperação e cadastro usam `br.com.entresuspeitos://auth-callback`.
- `scripts/patch_manifest.py` registra o retorno do link no Android.
- `main.dart` acompanha o evento `AuthChangeEvent.passwordRecovery` e abre a tela para escolher uma nova senha.
- Entrada em partidas online usa primeiro o novo login quando a sessão não está ativa.
- O painel Zero só exibe a confirmação administrativa após verificação do UID autenticado em `es_admins` sob RLS. Ações de moderação seguem desabilitadas até seus controles no servidor existirem.

## Configuração obrigatória no Supabase (ainda não automatizável aqui)

Abrir o projeto **entre-suspeitos**, em:
https://supabase.com/dashboard/project/lvnhwfctursuduboovub/auth/url-configuration

Em **Additional Redirect URLs**, adicionar exatamente:

`br.com.entresuspeitos://auth-callback`

Salvar. Conferir também se **Site URL** não está apontando para um site quebrado ou localhost. Um Site URL publicado válido continua importante como fallback.

**Importante:** gerar novos e-mails de confirmação ou recuperação depois desse ajuste; os links antigos não são corrigidos retroativamente.

## Teste completo no Android (somente depois da liberação da V7)
1. Solicitar recuperação de senha; abrir o e-mail novo; verificar que o app abre na página de nova senha.
2. Cadastrar uma conta nova de teste; clicar no link de confirmação; verificar login.
3. Solicitar reenvio de e-mail e testar link expirado.
4. Fazer login com a conta Zero e verificar botão administrativo; conferir que outra conta não consegue acessar.
5. Conferir que o jogo offline permanece disponível sem login.
6. Validar funções online, identidade visual, música e consumo de armazenamento.

Não declarar o fluxo validado apenas porque a compilação passou. Os links precisam ser testados em um Android real e a configuração de URL precisa estar salva no Supabase.
