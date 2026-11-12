from pathlib import Path

path = Path('lib/online.dart')
source = path.read_text(encoding='utf-8')

def replace_once(old: str, new: str):
    global source
    if old not in source:
        raise RuntimeError(f'Padrão do código online não encontrado: {old[:85]!r}')
    source = source.replace(old, new, 1)

replace_once("import 'voice.dart';", "import 'voice.dart';\nimport 'auth_flow.dart';\nimport 'create_room_v7.dart';\nimport 'social_v7.dart';\nimport 'admin_v7.dart';")

# Centralizar login/recuperação/cadastro em uma única experiência:
# nunca usar o AuthPanel antigo dentro das salas.
replace_once(
  "body:SafeArea(child:db.auth.currentUser==null?AuthPanel(onBusy:(x)=>setState(()=>waiting=x)):OnlineHub(onRoom:widget.onRoom))",
  "body:SafeArea(child:db.auth.currentUser==null?const AccountPage():OnlineHub(onRoom:widget.onRoom))",
)

start = source.index(' Future<void> create() async {')
end = source.index(' Future<void> joinCode() async {', start)
source = source[:start] + """ Future<void> create() async {
  final options = await showCreateRoomOptions(context);
  if (options == null || !mounted) return;
  try {
   final id = await db.rpc('es_create', params: options);
   if (mounted) openRoom(id.toString());
  } catch(e) {
   if (mounted) message(context, readableError(e));
  }
 }
""" + source[end:]

replace_once(
  "  ListTile(leading:const Icon(Icons.leaderboard),title:const Text('Ranking'),onTap:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>const LeaderboardPage()))),",
  "  ListTile(leading:const Icon(Icons.leaderboard),title:const Text('Ranking'),onTap:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>const LeaderboardPage()))),\n  ListTile(leading:const Icon(Icons.workspace_premium_outlined),title:const Text('Títulos e conquistas'),onTap:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>const TitlesPageV7()))),\n  ListTile(leading:const Icon(Icons.group_outlined),title:const Text('Amigos'),onTap:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>const FriendsPageV7()))),",
)

replace_once("label:const Text('CRIAR SALA PRIVADA')", "label:const Text('CRIAR SALA · PÚBLICA OU PRIVADA')")

# A ativação automática do microfone foi retirada por precaução: agora o
# usuário decide quando permitir a captura e evita picos ao entrar na sala.
auto_start = """   if(!autoVoiceRequested && players.isNotEmpty){
     autoVoiceRequested=true;
     WidgetsBinding.instance.addPostFrameCallback((_) {if(mounted)_voice();});
   }
"""
replace_once(auto_start, "")
replace_once("bool fetching=false,startingVoice=false,muted=false,autoVoiceRequested=false;",
             "bool fetching=false,startingVoice=false,muted=false;")

replace_once("MaterialPageRoute(builder:(_)=>const AdminPage()))",
             "MaterialPageRoute(builder:(_)=>const AdminPageV7()))")

replace_once("players.where((p)=>p['active']==true).length>=4",
             "players.where((p)=>p['active']==true).length>=3")
replace_once("4 ou mais jogadores prontos",
             "3 ou mais jogadores prontos")
path.write_text(source, encoding='utf-8')
print('Online V7: login unificado, configuração de sala e ativação manual do microfone.')
