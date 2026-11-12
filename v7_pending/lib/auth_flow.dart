import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Link exclusivamente destinado à autenticação do Entre Suspeitos.
/// Deve ser incluído também no Supabase Auth > URL Configuration >
/// Additional Redirect URLs.
const String esAuthRedirect = 'br.com.entresuspeitos://auth-callback';

const _bg = Color(0xFF111120);
const _surface = Color(0xFF1C1B31);
const _purple = Color(0xFFA48DDB);
const _rose = Color(0xFFC95872);
const _muted = Color(0xFFBBB7CD);

class AccountPage extends StatefulWidget {
  const AccountPage({super.key});
  @override
  State<AccountPage> createState() => _AccountPageState();
}

enum AccountMode { login, signup, recovery }

class _AccountPageState extends State<AccountPage> {
  final email = TextEditingController();
  final password = TextEditingController();
  final nickname = TextEditingController();
  AccountMode mode = AccountMode.login;
  bool busy = false, hidePassword = true;
  String? notification;

  @override
  void dispose() {
    email.dispose(); password.dispose(); nickname.dispose();
    super.dispose();
  }

  Future<void> _execute() async {
    final e = email.text.trim().toLowerCase();
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(e)) {
      _show('Informe um endereço de e-mail válido.');
      return;
    }
    if (mode != AccountMode.recovery && password.text.length < 8) {
      _show('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (mode == AccountMode.signup && (nickname.text.trim().length < 2 || nickname.text.trim().length > 28)) {
      _show('O apelido deve ter entre 2 e 28 caracteres.');
      return;
    }
    setState(() { busy = true; notification = null; });
    try {
      final auth = Supabase.instance.client.auth;
      if (mode == AccountMode.login) {
        await auth.signInWithPassword(email: e, password: password.text);
        password.clear();
        if (mounted) Navigator.of(context).pop(true);
      } else if (mode == AccountMode.signup) {
        final n = nickname.text.trim();
        if (n.toLowerCase().replaceAll(RegExp(r'\s+'), '') == 'zero') {
          throw Exception('Este apelido é reservado.');
        }
        await auth.signUp(email: e, password: password.text,
          data: {'nickname': n}, emailRedirectTo: esAuthRedirect);
        password.clear();
        _show('Cadastro enviado! Verifique seu e-mail e toque no link para confirmar. Volte aqui para entrar.');
        setState(() => mode = AccountMode.login);
      } else {
        await auth.resetPasswordForEmail(e, redirectTo: esAuthRedirect);
        password.clear();
        _show('Se este e-mail estiver cadastrado, você receberá um link para definir outra senha.');
      }
    } on AuthException catch (ex) {
      _show(_friendly(ex.message));
    } catch (ex) {
      _show(_friendly(ex.toString()));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _resendConfirmation() async {
    final e = email.text.trim().toLowerCase();
    if (!e.contains('@')) { _show('Preencha seu e-mail antes de reenviar.'); return; }
    setState(() => busy = true);
    try {
      await Supabase.instance.client.auth.resend(
        type: OtpType.signup, email: e, emailRedirectTo: esAuthRedirect,
      );
      _show('Se o cadastro aguarda confirmação, um novo e-mail será enviado.');
    } on AuthException catch (ex) {
      _show(_friendly(ex.message));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  void _show(String message) {
    if (mounted) setState(() => notification = message);
  }

  void _mode(AccountMode next) {
    password.clear();
    setState(() { mode = next; notification = null; });
  }

  @override
  Widget build(BuildContext context) {
    final heading = switch (mode) {
      AccountMode.login => 'Entrar no jogo',
      AccountMode.signup => 'Criar identidade',
      AccountMode.recovery => 'Recuperar acesso',
    };
    final sub = switch (mode) {
      AccountMode.login => 'Sua identidade é seu segredo.',
      AccountMode.signup => 'Escolha um apelido exclusivo e confirme seu e-mail.',
      AccountMode.recovery => 'Enviaremos um link para escolher uma nova senha.',
    };
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(backgroundColor: _bg, title: const Text('Minha conta')),
      body: ListView(padding: const EdgeInsets.fromLTRB(24, 20, 24, 40), children: [
        const Center(child: Icon(Icons.shield_moon_outlined, color: _purple, size: 52)),
        const SizedBox(height: 16),
        Text(heading, textAlign: TextAlign.center, style: const TextStyle(fontSize: 27, fontWeight: FontWeight.w800)),
        const SizedBox(height: 6),
        Text(sub, textAlign: TextAlign.center, style: const TextStyle(color: _muted)),
        const SizedBox(height: 28),
        if (mode == AccountMode.signup) ...[
          TextField(controller: nickname, maxLength: 28, textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(labelText: 'Apelido exclusivo', prefixIcon: Icon(Icons.badge_outlined))),
          const SizedBox(height: 9),
        ],
        TextField(controller: email, keyboardType: TextInputType.emailAddress,
          autofillHints: const [AutofillHints.email], textInputAction: mode == AccountMode.recovery ? TextInputAction.done : TextInputAction.next,
          decoration: const InputDecoration(labelText: 'E-mail', prefixIcon: Icon(Icons.alternate_email))),
        if (mode != AccountMode.recovery) ...[
          const SizedBox(height: 13),
          TextField(controller: password, obscureText: hidePassword,
            autofillHints: mode == AccountMode.signup ? const [AutofillHints.newPassword] : const [AutofillHints.password],
            decoration: InputDecoration(labelText: mode == AccountMode.signup ? 'Criar senha (mín. 8 caracteres)' : 'Senha',
              prefixIcon: const Icon(Icons.lock_outline),
              suffixIcon: IconButton(onPressed: () => setState(() => hidePassword = !hidePassword),
                icon: Icon(hidePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined)))),
        ],
        const SizedBox(height: 23),
        if (notification != null)
          Container(padding: const EdgeInsets.all(14), margin: const EdgeInsets.only(bottom: 18),
            decoration: BoxDecoration(color: _surface, border: Border.all(color: _purple.withValues(alpha: .4)), borderRadius: BorderRadius.circular(13)),
            child: Text(notification!, style: const TextStyle(color: _muted, height: 1.35))),
        FilledButton(
          onPressed: busy ? null : _execute,
          child: Padding(padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text(switch (mode) {
              AccountMode.login => 'ENTRAR',
              AccountMode.signup => 'CRIAR CONTA',
              AccountMode.recovery => 'ENVIAR LINK DE RECUPERAÇÃO',
            })),
        ),
        if (busy) const Padding(padding: EdgeInsets.only(top: 14), child: Center(child: CircularProgressIndicator())),
        const SizedBox(height: 12),
        if (mode == AccountMode.login) ...[
          TextButton(onPressed: busy ? null : () => _mode(AccountMode.recovery), child: const Text('Esqueci minha senha')),
          OutlinedButton(onPressed: busy ? null : () => _mode(AccountMode.signup), child: const Text('Criar nova conta')),
          TextButton(onPressed: busy ? null : _resendConfirmation, child: const Text('Reenviar confirmação de e-mail')),
        ] else TextButton(onPressed: busy ? null : () => _mode(AccountMode.login), child: const Text('Voltar ao login')),
        const SizedBox(height: 14),
        const Text('Ao confirmar o e-mail, o link deverá abrir o aplicativo. Se ele expirar, solicite outro.', textAlign: TextAlign.center,
          style: TextStyle(color: _muted, fontSize: 12)),
      ]),
    );
  }
}

class ChangePasswordPage extends StatefulWidget {
  const ChangePasswordPage({super.key});
  @override
  State<ChangePasswordPage> createState() => _ChangePasswordPageState();
}

class _ChangePasswordPageState extends State<ChangePasswordPage> {
  final first = TextEditingController(), repeat = TextEditingController();
  bool busy = false;
  String? error;

  @override
  void dispose() { first.dispose(); repeat.dispose(); super.dispose(); }

  Future<void> _save() async {
    if (first.text.length < 8) { setState(() => error = 'A senha precisa ter pelo menos 8 caracteres.'); return; }
    if (first.text != repeat.text) { setState(() => error = 'As senhas são diferentes.'); return; }
    setState(() { busy = true; error = null; });
    try {
      await Supabase.instance.client.auth.updateUser(UserAttributes(password: first.text));
      first.clear(); repeat.clear();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Senha atualizada. Sua conta está pronta para entrar.')));
      Navigator.of(context).pop();
    } on AuthException catch (ex) {
      if (mounted) setState(() => error = _friendly(ex.message));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: _bg,
    appBar: AppBar(title: const Text('Nova senha')),
    body: ListView(padding: const EdgeInsets.all(24), children: [
      const Icon(Icons.lock_reset_rounded, size: 64, color: _purple),
      const SizedBox(height: 14),
      const Text('Defina uma nova senha', textAlign: TextAlign.center,
        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
      const SizedBox(height: 12),
      const Text('Seu link de recuperação foi recebido. Escolha uma senha com pelo menos 8 caracteres.',
        textAlign: TextAlign.center, style: TextStyle(color: _muted)),
      const SizedBox(height: 24),
      TextField(controller: first, obscureText: true, decoration: const InputDecoration(labelText: 'Nova senha')),
      const SizedBox(height: 12),
      TextField(controller: repeat, obscureText: true, decoration: const InputDecoration(labelText: 'Confirmar nova senha')),
      const SizedBox(height: 20),
      if (error != null) Padding(padding: const EdgeInsets.only(bottom: 15), child: Text(error!, style: const TextStyle(color: _rose))),
      FilledButton(onPressed: busy ? null : _save, child: const Text('SALVAR NOVA SENHA')),
    ]),
  );
}

String _friendly(String s) {
  final text = s.toLowerCase();
  if (text.contains('expired') || text.contains('invalid token')) return 'Este link expirou ou já foi utilizado. Solicite outro e-mail.';
  if (text.contains('rate limit')) return 'Muitas tentativas em pouco tempo. Aguarde e tente novamente.';
  if (text.contains('already registered')) return 'Este e-mail já está cadastrado. Entre ou recupere sua senha.';
  if (text.contains('invalid login')) return 'E-mail ou senha incorretos.';
  return s.replaceFirst('Exception: ', '');
}
