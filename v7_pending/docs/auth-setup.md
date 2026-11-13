# Entre Suspeitos — cadastro e login

## Diagnóstico Supabase (12/11/2026)
- 38 erros HTTP 429 em /signup: over_email_send_rate_limit.
- 61 erros HTTP 400 em /token: invalid_credentials.
- Somente 2 contas existentes no momento da inspeção.
- Os registros de autenticação mostravam referência a http://localhost:3000.
- O serviço padrão de e-mails do Supabase limita os envios a duas mensagens por hora, e não se destina a novos cadastros em produção.

## Correções Web 7.2
- Cadastro simplificado, apelido visível, validação de e-mail e senha.
- Mensagens de erro úteis em português.
- Bloqueio de toques repetidos durante uma requisição.
- Solicitação de links de e-mail com retorno ao site atual.
- Captura do callback do e-mail no navegador, com criação de sessão.
- Formulário de nova senha e campo para colar link original do e-mail.
- Remoção dos botões que não funcionavam.
- Arquivos com versão renovada para evitar cache antigo.

## Configurações obrigatórias pelo dono do Supabase
1. URL Configuration:
https://supabase.com/dashboard/project/lvnhwfctursuduboovub/auth/url-configuration

Site URL:
https://kayssoneduardo.github.io/Kayssoneduardo-entre-suspeitos/

Additional Redirect URLs:
https://kayssoneduardo.github.io/Kayssoneduardo-entre-suspeitos/
br.com.entresuspeitos://auth-callback

2. Custom SMTP:
https://supabase.com/dashboard/project/lvnhwfctursuduboovub/auth/smtp

Criar conta com um provedor de envio transacional e configurar remetente autenticado,
host, porta, usuário, senha SMTP e nome do remetente. Não compartilhar credenciais
na conversa nem no repositório.

3. Rate Limits, depois que o SMTP estiver ativo:
https://supabase.com/dashboard/project/lvnhwfctursuduboovub/auth/rate-limits

4. Usar links de e-mail NOVOS. Os antigos podem retornar para endereço inválido.
5. Testar cadastro, login e recuperação com emails de teste e dispositivos distintos.

ATENÇÃO: não desativar confirmação de e-mail para driblar rate limit.
Não afirmar que o cadastro de múltiplos usuários foi resolvido até configurar SMTP ou OAuth social.

## Verificação automatizada
- Pipeline: .github/workflows/publicar-site-v7.yml
- Teste auth: v7_pending/tests/web_auth_smoke.cjs
- Site: https://kayssoneduardo.github.io/Kayssoneduardo-entre-suspeitos/

Documentação:
https://supabase.com/docs/guides/auth/rate-limits
https://supabase.com/docs/guides/auth/auth-smtp
https://supabase.com/docs/guides/auth/redirect-urls
