import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _background = Color(0xFF111120);
const _panel = Color(0xFF1B1B32);
const _purple = Color(0xFF9B77D5);
const _red = Color(0xFFD54D62);
const _muted = Color(0xFFAFACC2);

class OfflinePage extends StatefulWidget {
  const OfflinePage({super.key});
  @override
  State<OfflinePage> createState() => _OfflinePageState();
}

class _OfflinePageState extends State<OfflinePage> {
  final List<TextEditingController> inputs = [];
  Map<String, dynamic> bank = {};
  final selected = <String>{};
  String difficulty = 'Misturado', clue = 'both', category = '';
  int impostors = 1, index = 0;
  bool knowEachOther = false, playing = false, revealing = false;
  List<String> players = [];
  Set<int> impostorIndices = {};
  Map<String, dynamic>? word;
  SharedPreferences? prefs;

  @override
  void initState() {
    super.initState();
    for (var i = 0; i < 4; i++) { inputs.add(TextEditingController()); }
    _load();
  }

  Future<void> _load() async {
    prefs = await SharedPreferences.getInstance();
    bank = jsonDecode(await rootBundle.loadString('assets/words.json')) as Map<String, dynamic>;
    final old = prefs!.getStringList('offlinePlayerList');
    final previous = old ?? (prefs!.getString('offlineNames') ?? '').split(RegExp(r'[,;\n]')).map((s) => s.trim()).where((s) => s.isNotEmpty).toList();
    if (previous.isNotEmpty) {
      for (final c in inputs) { c.dispose(); }
      inputs.clear();
      for (final n in previous.take(30)) { inputs.add(TextEditingController(text: n)); }
      while (inputs.length < 4) { inputs.add(TextEditingController()); }
    }
    selected.addAll((prefs!.getStringList('offlineCategories') ?? bank.keys.toList()).where(bank.containsKey));
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    for (final controller in inputs) { controller.dispose(); }
    super.dispose();
  }

  void _addPlayer() {
    if (inputs.length >= 30) { _msg('Limite de 30 jogadores.'); return; }
    setState(() => inputs.add(TextEditingController()));
  }

  void _removePlayer(int i) {
    if (inputs.length <= 4) { _msg('O mínimo é 4 jogadores.'); return; }
    setState(() => inputs.removeAt(i).dispose());
  }

  void _msg(String s) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(s), behavior: SnackBarBehavior.floating));
  }

  void start() {
    final ps = inputs.map((c) => c.text.trim()).where((s) => s.isNotEmpty).toList();
    if (ps.length != inputs.length) { _msg('Preencha todos os jogadores ou remova os campos vazios.'); return; }
    if (ps.length < 4 || ps.length > 30) { _msg('Escolha de 4 a 30 jogadores.'); return; }
    if (ps.map((x) => x.toLowerCase()).toSet().length != ps.length) { _msg('Cada jogador precisa de um nome diferente.'); return; }
    if (impostors > (ps.length - 1) ~/ 2) { _msg('Deve haver mais jogadores comuns que impostores.'); return; }
    if (selected.isEmpty) { _msg('Escolha pelo menos uma categoria.'); return; }
    final pool = <Map<String, dynamic>>[];
    for (final c in selected) {
      for (final w in (bank[c] as List)) {
        final x = Map<String, dynamic>.from(w as Map);
        if (difficulty == 'Misturado' || x['d'] == difficulty) { x['c'] = c; pool.add(x); }
      }
    }
    if (pool.isEmpty) { _msg('Não há palavras nesta combinação.'); return; }
    final history = prefs?.getStringList('usedWords')?.toSet() ?? <String>{};
    var remaining = pool.where((w) => !history.contains("${w['c']}|${w['w']}")).toList();
    if (remaining.isEmpty) {
      for (final w in pool) { history.remove("${w['c']}|${w['w']}"); }
      remaining = pool;
    }
    final random = Random.secure();
    final chosen = remaining[random.nextInt(remaining.length)];
    history.add("${chosen['c']}|${chosen['w']}");
    prefs?.setStringList('usedWords', history.toList());
    prefs?.setStringList('offlinePlayerList', ps);
    prefs?.setStringList('offlineCategories', selected.toList());
    final shuffled = List<int>.generate(ps.length, (i) => i)..shuffle(random);
    setState(() {
      players = ps;
      impostorIndices = shuffled.take(impostors).toSet();
      word = chosen; category = chosen['c'].toString();
      index = 0; playing = true; revealing = false;
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: _background,
    appBar: AppBar(title: Text(playing ? 'Identidades secretas' : 'Partida offline')),
    body: SafeArea(child: playing ? _round() : _setup()),
  );

  Widget _heading(String s, IconData icon) => Padding(
    padding: const EdgeInsets.only(top: 18, bottom: 12),
    child: Row(children: [
      Icon(icon, color: _purple, size: 19), const SizedBox(width: 8),
      Text(s, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
    ]),
  );

  Widget _setup() => ListView(padding: const EdgeInsets.fromLTRB(18, 10, 18, 32), children: [
    const Text('UM CELULAR. VÁRIAS IDENTIDADES.', style: TextStyle(color: _purple, fontSize: 11, letterSpacing: 2, fontWeight: FontWeight.bold)),
    const SizedBox(height: 8),
    Text('Quem está entre nós?', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
    const SizedBox(height: 6),
    const Text('Adicione cada pessoa separadamente. O telefone será passado de mão em mão.', style: TextStyle(color: _muted, height: 1.4)),
    _heading('Jogadores · ${inputs.length}/30', Icons.groups_2_outlined),
    for (var i = 0; i < inputs.length; i++)
      Container(
        key: ValueKey(inputs[i]),
        margin: const EdgeInsets.only(bottom: 9),
        decoration: BoxDecoration(color: _panel, borderRadius: BorderRadius.circular(15), border: Border.all(color: const Color(0xFF34304C))),
        child: Row(children: [
          Padding(padding: const EdgeInsets.only(left: 13), child: CircleAvatar(radius: 14, backgroundColor: const Color(0xFF332C4A), child: Text('${i + 1}', style: const TextStyle(color: _purple, fontSize: 12)))),
          Expanded(child: TextField(
            controller: inputs[i], maxLength: 24,
            textCapitalization: TextCapitalization.words,
            textInputAction: i == inputs.length - 1 ? TextInputAction.done : TextInputAction.next,
            decoration: InputDecoration(counterText: '', hintText: 'Nome do jogador', contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 13), border: InputBorder.none),
          )),
          IconButton(onPressed: inputs.length > 4 ? () => _removePlayer(i) : null, icon: const Icon(Icons.close_rounded, size: 19), tooltip: 'Remover jogador'),
        ]),
      ),
    OutlinedButton.icon(onPressed: inputs.length < 30 ? _addPlayer : null, icon: const Icon(Icons.person_add_alt_1), label: const Text('Adicionar jogador')),
    _heading('Regras da partida', Icons.tune_rounded),
    Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(color: _panel, borderRadius: BorderRadius.circular(17)),
      child: Column(children: [
        Row(children: [
          const Expanded(child: Text('Quantidade de impostores')),
          IconButton(onPressed: impostors > 1 ? () => setState(() => impostors--) : null, icon: const Icon(Icons.remove_circle_outline)),
          Text('$impostors', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 19)),
          IconButton(onPressed: impostors < ((inputs.length - 1) ~/ 2) ? () => setState(() => impostors++) : null, icon: const Icon(Icons.add_circle_outline)),
        ]),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          initialValue: difficulty, decoration: const InputDecoration(labelText: 'Dificuldade'),
          items: ['Misturado', 'Fácil', 'Médio', 'Difícil'].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
          onChanged: (v) => setState(() => difficulty = v!),
        ),
        const SizedBox(height: 14),
        DropdownButtonFormField<String>(
          initialValue: clue, decoration: const InputDecoration(labelText: 'Pistas para o impostor'),
          items: const [
            DropdownMenuItem(value: 'both', child: Text('Categoria e dica')),
            DropdownMenuItem(value: 'category', child: Text('Somente categoria')),
            DropdownMenuItem(value: 'hint', child: Text('Somente dica')),
            DropdownMenuItem(value: 'none', child: Text('Nenhuma pista')),
          ], onChanged: (v) => setState(() => clue = v!),
        ),
        SwitchListTile.adaptive(contentPadding: EdgeInsets.zero, title: const Text('Impostores se conhecem'), value: knowEachOther, onChanged: (v) => setState(() => knowEachOther = v)),
      ]),
    ),
    _heading('Categorias', Icons.category_outlined),
    Wrap(spacing: 7, runSpacing: 3, children: bank.keys.map((c) => FilterChip(
      label: Text(c), selected: selected.contains(c),
      onSelected: (v) => setState(() { if (v) { selected.add(c); } else { selected.remove(c); } }),
    )).toList()),
    const SizedBox(height: 24),
    FilledButton.icon(onPressed: start, icon: const Icon(Icons.visibility_outlined), label: const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text('DISTRIBUIR PAPÉIS'))),
  ]);

  Widget _round() {
    if (index >= players.length) {
      return Center(child: Padding(padding: const EdgeInsets.all(28), child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Icon(Icons.check_circle_outline, size: 70, color: _purple),
        const SizedBox(height: 16),
        Text('Todos receberam seus papéis.', textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 8),
        const Text('Comecem a conversa. Ninguém deve revelar o que viu.', textAlign: TextAlign.center, style: TextStyle(color: _muted)),
        const SizedBox(height: 22),
        FilledButton(onPressed: () => start(), child: const Text('NOVA RODADA COM O MESMO GRUPO')),
        TextButton(onPressed: () => setState(() => playing = false), child: const Text('Editar jogadores ou regras')),
      ])));
    }
    final imp = impostorIndices.contains(index);
    final partners = impostorIndices.where((x) => x != index).map((x) => players[x]).join(', ');
    return Padding(padding: const EdgeInsets.all(22), child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      Text('JOGADOR ${index + 1} DE ${players.length}', style: const TextStyle(color: _purple, letterSpacing: 2, fontSize: 12)),
      const SizedBox(height: 12),
      Text(players[index], style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
      const SizedBox(height: 28),
      GestureDetector(
        onLongPressStart: (_) => setState(() => revealing = true),
        onLongPressEnd: (_) => setState(() => revealing = false),
        onLongPressCancel: () => setState(() => revealing = false),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220), width: double.infinity, height: 245,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight,
              colors: revealing && imp ? [const Color(0xFF481B2B), _panel] : [const Color(0xFF282044), _panel]),
            borderRadius: BorderRadius.circular(23),
            border: Border.all(color: revealing && imp ? _red : _purple.withValues(alpha: .65)),
          ),
          child: revealing
            ? Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(imp ? Icons.visibility_off_outlined : Icons.key_rounded, size: 43, color: imp ? _red : _purple),
                const SizedBox(height: 15),
                Text(imp ? 'IMPOSTOR' : 'JOGADOR COMUM', style: TextStyle(fontSize: 21, fontWeight: FontWeight.bold, color: imp ? _red : Colors.white)),
                const SizedBox(height: 13),
                if (!imp) Text('PALAVRA: ${word!['w']}', style: const TextStyle(fontSize: 20)),
                if (imp && ['both', 'category'].contains(clue)) Text('Categoria: $category'),
                if (imp && ['both', 'hint'].contains(clue)) Text('Dica: ${word!['h']}'),
                if (imp && knowEachOther && partners.isNotEmpty) Text('Parceiros: $partners'),
              ])
            : const Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(Icons.lock_outline_rounded, size: 54, color: _purple),
                SizedBox(height: 18),
                Text('SEGURE PARA REVELAR', style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: .7)),
              ]),
        ),
      ),
      const SizedBox(height: 15),
      const Text('Solte o dedo para esconder o papel.', style: TextStyle(color: _muted)),
      const SizedBox(height: 30),
      FilledButton(onPressed: revealing ? null : () => setState(() => index++), child: const Text('PRÓXIMO JOGADOR')),
    ]));
  }
}
