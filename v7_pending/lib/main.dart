import 'dart:math';
import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'offline.dart';
import 'online.dart';
import 'auth_flow.dart';

const cloudUrl = String.fromEnvironment('SUPABASE_URL');
const cloudKey = String.fromEnvironment('SUPABASE_ANON_KEY');
late final SharedPreferences prefs;
SupabaseClient get db => Supabase.instance.client;

const ink = Color(0xFF10111D);
const surface = Color(0xFF1D1B30);
const violet = Color(0xFFA58CDB);
const rose = Color(0xFFD25B70);
const secondaryText = Color(0xFFB7B4C9);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  prefs = await SharedPreferences.getInstance();
  if (cloudUrl.isNotEmpty && cloudKey.isNotEmpty) {
    await Supabase.initialize(url: cloudUrl, anonKey: cloudKey);
  }
  runApp(const EntreSuspeitos());
}

class EntreSuspeitos extends StatefulWidget {
  const EntreSuspeitos({super.key});
  @override
  State<EntreSuspeitos> createState() => _EntreSuspeitosState();
}

class _EntreSuspeitosState extends State<EntreSuspeitos> with WidgetsBindingObserver {
  final music = AudioPlayer();
  late bool musicEnabled;
  late double musicVolume;
  bool inRoom = false;
  final GlobalKey<NavigatorState> nav = GlobalKey<NavigatorState>();
  StreamSubscription<AuthState>? authSub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (cloudUrl.isNotEmpty && cloudKey.isNotEmpty) {
      authSub = Supabase.instance.client.auth.onAuthStateChange.listen((state) {
        if (mounted) setState(() {});
        if (state.event == AuthChangeEvent.passwordRecovery) {
          nav.currentState?.push(MaterialPageRoute(builder: (_) => const ChangePasswordPage()));
        } else if (state.event == AuthChangeEvent.signedIn) {
          final ctx = nav.currentContext;
          if (ctx != null && ctx.mounted) {
            ScaffoldMessenger.maybeOf(ctx)?.showSnackBar(const SnackBar(content: Text('E-mail confirmado ou sessão iniciada.')));
          }
        }
      });
    }
    musicEnabled = prefs.getBool('music') ?? true;
    musicVolume = (prefs.getDouble('musicVolume') ?? .22).clamp(0.0, 1.0);
    WidgetsBinding.instance.addPostFrameCallback((_) => _syncMusic());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _syncMusic();
    } else if (state == AppLifecycleState.paused || state == AppLifecycleState.inactive) {
      music.pause();
    }
  }

  Future<void> _syncMusic() async {
    if (!musicEnabled || inRoom) { await music.stop(); return; }
    if (music.state == PlayerState.playing) { await music.setVolume(musicVolume); return; }
    try {
      await music.setReleaseMode(ReleaseMode.loop);
      await music.setVolume(musicVolume);
      await music.play(AssetSource('suspense.wav'));
    } catch (e) {
      debugPrint('Erro ao tocar trilha local: $e');
    }
  }

  void setRoom(bool value) {
    if (inRoom == value) return;
    setState(() => inRoom = value);
    _syncMusic();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    authSub?.cancel();
    music.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: nav,
      title: 'Entre Suspeitos',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: ink,
        colorScheme: ColorScheme.fromSeed(seedColor: violet, brightness: Brightness.dark).copyWith(primary: violet, secondary: rose, surface: surface),
        appBarTheme: const AppBarTheme(backgroundColor: ink, centerTitle: false, surfaceTintColor: Colors.transparent),
        cardTheme: CardThemeData(color: surface, margin: const EdgeInsets.symmetric(vertical: 7), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
        filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(backgroundColor: rose, foregroundColor: Colors.white, minimumSize: const Size.fromHeight(51), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)))),
        outlinedButtonTheme: OutlinedButtonThemeData(style: OutlinedButton.styleFrom(foregroundColor: violet, minimumSize: const Size.fromHeight(48), side: BorderSide(color: violet.withValues(alpha: .45)), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)))),
        inputDecorationTheme: InputDecorationTheme(
          filled: true, fillColor: surface,
          contentPadding: const EdgeInsets.symmetric(horizontal: 15, vertical: 14),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: BorderSide.none),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: violet)),
        ),
        chipTheme: ChipThemeData(
          backgroundColor: surface, selectedColor: violet.withValues(alpha: .28),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          side: BorderSide(color: violet.withValues(alpha: .22)),
        ),
      ),
      home: HomePage(
        onRoom: setRoom,
        musicEnabled: musicEnabled,
        musicVolume: musicVolume,
        onVolume: (v) { setState(() => musicVolume = v); prefs.setDouble('musicVolume', v); _syncMusic(); },
        onMusic: (v) { setState(() => musicEnabled = v); prefs.setBool('music', v); _syncMusic(); },
      ),
    );
  }
}

class HomePage extends StatefulWidget {
  final ValueChanged<bool> onRoom;
  final bool musicEnabled;
  final double musicVolume;
  final ValueChanged<double> onVolume;
  final ValueChanged<bool> onMusic;
  const HomePage({super.key, required this.onRoom, required this.musicEnabled, required this.musicVolume, required this.onVolume, required this.onMusic});
  @override State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  late final String phrase;
  @override
  void initState() {
    super.initState();
    final rng = Random.secure();
    phrase = rng.nextInt(100) == 0
      ? 'O LULA está entre nós.'
      : ['Nem todos estão dizendo a verdade.', 'Observe. Desconfie. Descubra.', 'O segredo está entre nós.', 'Uma palavra. Muitas suspeitas.'][rng.nextInt(4)];
  }

  Widget _menuButton({required String title, required IconData icon, required VoidCallback onTap, bool primary = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 11),
      child: primary
        ? FilledButton.icon(onPressed: onTap, icon: Icon(icon), label: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: .4)))
        : OutlinedButton.icon(onPressed: onTap, icon: Icon(icon, size: 20), label: Text(title, style: const TextStyle(fontWeight: FontWeight.w600))),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft, end: Alignment.bottomRight,
          colors: [Color(0xFF10111D), Color(0xFF1A1930), Color(0xFF211624)],
          stops: [0, .56, 1],
        ),
      ),
      child: SafeArea(
        child: Stack(children: [
          const Positioned(top: 98, right: -100, child: _AmbientCircle(size: 260, color: Color(0xFF554279))),
          const Positioned(bottom: -140, left: -70, child: _AmbientCircle(size: 350, color: Color(0xFF7A274A))),
          ListView(padding: const EdgeInsets.fromLTRB(24, 14, 24, 30), children: [
            Row(children: [
              InkWell(
                borderRadius: BorderRadius.circular(24),
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AccountPage())),
                child: Row(children: [
                  Container(width: 46, height: 46,
                    decoration: BoxDecoration(shape: BoxShape.circle,
                      border: Border.all(color: violet.withValues(alpha: .6)),
                      gradient: const LinearGradient(colors: [Color(0xFF2F2649), Color(0xFF1D1C32)])),
                    child: const Icon(Icons.person_search_outlined, color: violet, size: 27)),
                  const SizedBox(width: 10),
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(db.auth.currentUser == null ? 'VISITANTE' : 'IDENTIDADE ATIVA',
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, letterSpacing: 1.2)),
                    Text(db.auth.currentUser == null ? 'Entre ou crie sua conta' : 'Toque para ver seu perfil',
                      style: const TextStyle(color: secondaryText, fontSize: 11)),
                  ]),
                ]),
              ),
              const Spacer(),
              IconButton(tooltip: 'Configurações',
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) =>
                  SettingsPage(enabled: widget.musicEnabled, volume: widget.musicVolume,
                    onVolume: widget.onVolume, onMusic: widget.onMusic))),
                icon: const Icon(Icons.settings_outlined, color: secondaryText)),
            ]),
            const SizedBox(height: 31),
            const Center(child: _BrandMark()),
            const SizedBox(height: 17),
            const Text('ENTRE', textAlign: TextAlign.center,
              style: TextStyle(fontSize: 32, letterSpacing: 7, fontWeight: FontWeight.w900)),
            const Text('SUSPEITOS', textAlign: TextAlign.center,
              style: TextStyle(fontSize: 35, color: Color(0xFFF3E2E8),
                letterSpacing: 1.7, height: 1.03, fontWeight: FontWeight.w900)),
            Container(alignment: Alignment.center,
              padding: const EdgeInsets.only(top: 13, bottom: 16),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Container(width: 36, height: 1, color: rose.withValues(alpha: .7)),
                const SizedBox(width: 10),
                const Icon(Icons.fingerprint, color: rose, size: 16),
                const SizedBox(width: 10),
                Container(width: 36, height: 1, color: rose.withValues(alpha: .7)),
              ])),
            Text(phrase, textAlign: TextAlign.center,
              style: const TextStyle(color: secondaryText, fontStyle: FontStyle.italic, fontSize: 13)),
            const SizedBox(height: 37),
            _actionTile(title: 'JOGAR OFFLINE',
              subtitle: 'Um celular. Muitas identidades.',
              icon: Icons.style_outlined, primary: true,
              onTap: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const OfflinePage()))),
            const SizedBox(height: 12),
            _actionTile(title: 'JOGAR ONLINE',
              subtitle: 'Partidas, suspeitas e voz ao vivo.',
              icon: Icons.groups_2_outlined,
              onTap: () async {
                if (cloudUrl.isEmpty || cloudKey.isEmpty) {
                  message(context, 'Servidor online não configurado nesta versão.'); return;
                }
                if (db.auth.currentUser == null) {
                  final ok = await Navigator.push<bool>(context,
                    MaterialPageRoute(builder: (_) => const AccountPage()));
                  if (ok != true || !context.mounted) return;
                }
                if (context.mounted) {
                  Navigator.push(context, MaterialPageRoute(builder: (_) =>
                    OnlinePage(onRoom: widget.onRoom)));
                }
              }),
            const SizedBox(height: 12),
            _actionTile(title: 'MINHA IDENTIDADE',
              subtitle: 'Conta, perfil e administração.',
              icon: Icons.shield_outlined,
              onTap: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const AccountPage()))),
            const SizedBox(height: 12),
            _actionTile(title: 'CONFIGURAÇÕES',
              subtitle: 'Áudio, atmosfera e preferências.',
              icon: Icons.tune_outlined,
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) =>
                SettingsPage(enabled: widget.musicEnabled, volume: widget.musicVolume,
                  onVolume: widget.onVolume, onMusic: widget.onMusic)))),
            const SizedBox(height: 35),
            const Center(child: Text('V7 · PRÉVIA INTEGRADA',
              style: TextStyle(color: secondaryText, letterSpacing: 1.8, fontSize: 10))),
          ]),
        ]),
      ),
    ),
  );

  Widget _actionTile({required String title, required String subtitle,
      required IconData icon, required VoidCallback onTap, bool primary = false}) {
    final border = primary ? rose.withValues(alpha: .7) : violet.withValues(alpha: .25);
    return Material(color: Colors.transparent,
      child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(17),
        child: Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: primary
              ? [const Color(0xFF772337), const Color(0xFF41213E)]
              : [const Color(0xFF292540), const Color(0xFF1C1D33)]),
            borderRadius: BorderRadius.circular(17),
            border: Border.all(color: border),
            boxShadow: primary
              ? [BoxShadow(color: rose.withValues(alpha: .16), blurRadius: 20)]
              : null,
          ),
          child: Row(children: [
            Container(width: 43, height: 43, alignment: Alignment.center,
              decoration: BoxDecoration(shape: BoxShape.circle,
                color: (primary ? rose : violet).withValues(alpha: .12)),
              child: Icon(icon, color: primary ? const Color(0xFFF4A9B6) : violet, size: 25)),
            const SizedBox(width: 13),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: const TextStyle(fontSize: 15, letterSpacing: .7, fontWeight: FontWeight.w800)),
              const SizedBox(height: 3),
              Text(subtitle, style: const TextStyle(fontSize: 11, color: secondaryText)),
            ])),
            Icon(Icons.chevron_right_rounded, color: primary ? const Color(0xFFF4A9B6) : violet),
          ]),
        ),
      ),
    );
  }
}

class _AmbientCircle extends StatelessWidget {
  final double size;
  final Color color;
  const _AmbientCircle({required this.size, required this.color});
  @override Widget build(BuildContext context) => IgnorePointer(child:
    Container(height: size, width: size, decoration: BoxDecoration(
      shape: BoxShape.circle, boxShadow: [BoxShadow(
        color: color.withValues(alpha: .11), blurRadius: 80, spreadRadius: 24)])));
}

class _BrandMark extends StatelessWidget {
  const _BrandMark();
  @override
  Widget build(BuildContext context) => Container(
    height: 124, width: 124,
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(28),
      gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF34223E), Color(0xFF171525)]),
      border: Border.all(color: violet.withValues(alpha: .38)),
      boxShadow: [BoxShadow(color: rose.withValues(alpha: .13), blurRadius: 28, spreadRadius: 3)],
    ),
    child: const Stack(alignment: Alignment.center, children: [
      Icon(Icons.person_search_rounded, size: 72, color: Color(0xFFBBA4E7)),
      Positioned(right: 25, bottom: 18, child: Icon(Icons.question_mark_rounded, size: 24, color: rose)),
    ]),
  );
}

class SettingsPage extends StatelessWidget {
  final bool enabled;
  final double volume;
  final ValueChanged<double> onVolume;
  final ValueChanged<bool> onMusic;
  const SettingsPage({super.key, required this.enabled, required this.volume, required this.onVolume, required this.onMusic});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Configurações')),
    body: ListView(padding: const EdgeInsets.all(18), children: [
      const Text('ÁUDIO E ATMOSFERA', style: TextStyle(color: violet, fontSize: 11, letterSpacing: 1.8, fontWeight: FontWeight.bold)),
      const SizedBox(height: 12),
      SwitchListTile.adaptive(title: const Text('Música ambiente de suspense'), subtitle: const Text('Trilha suave. Para automaticamente ao entrar em uma sala.'), value: enabled, onChanged: onMusic),
      ListTile(title: const Text('Volume da música'), subtitle: Slider(value: volume, min: 0, max: .60, divisions: 12, label: '${(volume * 100).round()}%', onChanged: enabled ? onVolume : null)),
      const SizedBox(height: 20),
      const ListTile(leading: Icon(Icons.shield_outlined), title: Text('Identidade Sombra Neon'), subtitle: Text('Paleta híbrida suavizada · Sombra, Noturno e Dossiê')),
      const ListTile(leading: Icon(Icons.privacy_tip_outlined), title: Text('Permissões'), subtitle: Text('O microfone é solicitado somente quando necessário.')),
    ]),
  );
}

void message(BuildContext context, String msg) {
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), behavior: SnackBarBehavior.floating));
}

String readableError(Object e) {
  final s = e.toString();
  if (s.contains('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (s.contains('Email not confirmed')) return 'Confirme o e-mail para entrar.';
  if (s.contains('duplicate key') || s.contains('apelido') || s.contains('nickname')) return 'Esse apelido já está em uso. Escolha outro.';
  return s.replaceFirst(RegExp(r'^Exception: '), '');
}
