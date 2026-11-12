import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Configuração de sala com as mesmas opções que o servidor es_create valida.
Future<Map<String, dynamic>?> showCreateRoomOptions(BuildContext context) async {
  Map<String, dynamic> dictionary = {};
  try {
    dictionary = Map<String, dynamic>.from(jsonDecode(
      await rootBundle.loadString('assets/words.json')) as Map);
  } catch (_) {}
  if (!context.mounted) return null;
  final categories = dictionary.keys.toList();
  if (categories.isEmpty) categories.addAll([
    'Animais', 'Comidas', 'Objetos', 'Lugares',
  ]);
  bool publicRoom = false;
  int maxPlayers = 10, impostors = 1;
  String difficulty = 'Misturado', clue = 'both';
  bool know = false;
  final selected = <String>{...categories};
  const ink = Color(0xFF171528);
  const violet = Color(0xFFA58CDB);

  return showModalBottomSheet<Map<String, dynamic>>(
    context: context, isScrollControlled: true,
    useSafeArea: true, backgroundColor: ink,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(26))),
    builder: (ctx) => StatefulBuilder(builder: (ctx, setConfig) =>
      FractionallySizedBox(heightFactor: .86, child: Column(children: [
        Container(width: 36, height: 4, margin: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(20))),
        const Padding(padding: EdgeInsets.all(14), child: Text('CRIAR UMA SALA',
          style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800, letterSpacing: 1.6))),
        Expanded(child: ListView(padding: const EdgeInsets.symmetric(horizontal: 20), children: [
          const Text('VISIBILIDADE', style: TextStyle(color: violet, fontSize: 11, letterSpacing: 1.8)),
          const SizedBox(height: 8),
          SegmentedButton<bool>(
            segments: const [
              ButtonSegment(value: false, icon: Icon(Icons.lock_outline), label: Text('Privada')),
              ButtonSegment(value: true, icon: Icon(Icons.public), label: Text('Pública')),
            ],
            selected: {publicRoom},
            onSelectionChanged: (s) => setConfig(() => publicRoom = s.first),
          ),
          const SizedBox(height: 9),
          Text(publicRoom
            ? 'Aparece para outros jogadores na lista pública.'
            : 'Somente quem tiver o código pode entrar.',
            style: const TextStyle(color: Colors.white60, fontSize: 12)),
          const SizedBox(height: 25),
          Row(children: [
            const Expanded(child: Text('Máximo de jogadores')),
            IconButton(onPressed: maxPlayers <= 4 ? null : () => setConfig(() {
              maxPlayers--; if (impostors > (maxPlayers - 1) ~/ 2) impostors = (maxPlayers - 1) ~/ 2;
            }), icon: const Icon(Icons.remove_circle_outline)),
            Text('$maxPlayers', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            IconButton(onPressed: maxPlayers >= 10 ? null : () => setConfig(() => maxPlayers++),
              icon: const Icon(Icons.add_circle_outline)),
          ]),
          Row(children: [
            const Expanded(child: Text('Quantidade de impostores')),
            IconButton(onPressed: impostors <= 1 ? null : () => setConfig(() => impostors--),
              icon: const Icon(Icons.remove_circle_outline)),
            Text('$impostors', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            IconButton(onPressed: impostors >= (maxPlayers - 1) ~/ 2 ? null
              : () => setConfig(() => impostors++),
              icon: const Icon(Icons.add_circle_outline)),
          ]),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            initialValue: difficulty,
            decoration: const InputDecoration(labelText: 'Dificuldade'),
            items: ['Misturado', 'Fácil', 'Médio', 'Difícil']
              .map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(),
            onChanged: (v) => setConfig(() => difficulty = v ?? difficulty)),
          const SizedBox(height: 15),
          DropdownButtonFormField<String>(
            initialValue: clue,
            decoration: const InputDecoration(labelText: 'Pistas para impostores'),
            items: const [
              DropdownMenuItem(value: 'both', child: Text('Categoria e dica')),
              DropdownMenuItem(value: 'category', child: Text('Somente categoria')),
              DropdownMenuItem(value: 'hint', child: Text('Somente dica')),
              DropdownMenuItem(value: 'none', child: Text('Sem pistas')),
            ], onChanged: (v) => setConfig(() => clue = v ?? clue)),
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            title: const Text('Impostores se conhecem'),
            value: know, onChanged: (v) => setConfig(() => know = v)),
          const SizedBox(height: 15),
          Row(children: [
            const Text('CATEGORIAS', style: TextStyle(color: violet,
              fontWeight: FontWeight.bold, letterSpacing: 1.8, fontSize: 11)),
            const Spacer(),
            TextButton(onPressed: () => setConfig(() {
              selected.clear(); selected.addAll(categories);
            }), child: const Text('Todas')),
          ]),
          Wrap(spacing: 7, runSpacing: 1,
            children: categories.map((cat) => FilterChip(label: Text(cat),
              selected: selected.contains(cat), onSelected: (v) => setConfig(() {
                if (v) { selected.add(cat); }
                else if (selected.length > 1) { selected.remove(cat); }
              }))).toList()),
          const SizedBox(height: 12),
        ])),
        Padding(padding: const EdgeInsets.fromLTRB(18, 8, 18, 18),
          child: FilledButton.icon(
            onPressed: () => Navigator.pop(ctx, <String, dynamic>{
              'p_public': publicRoom, 'p_max': maxPlayers,
              'p_impostors': impostors, 'p_categories': selected.toList(),
              'p_difficulty': difficulty, 'p_clue': clue, 'p_know': know,
            }),
            icon: const Icon(Icons.add_circle_outline),
            label: const Text('CRIAR SALA E AGUARDAR'),
          ),
        ),
      ])),
    ),
  );
}
