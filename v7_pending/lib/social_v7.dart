import 'package:flutter/material.dart';
import 'main.dart';

const _accent = Color(0xFFA58CDB);
const _gold = Color(0xFFDDBB76);
const _muted = Color(0xFFBAB7CC);

class TitlesPageV7 extends StatefulWidget {
  const TitlesPageV7({super.key});
  @override State<TitlesPageV7> createState() => _TitlesPageV7State();
}

class _TitlesPageV7State extends State<TitlesPageV7> {
  List<Map<String,dynamic>> mine = [], catalog = [];
  bool loading = true;
  Future<void> load() async {
    try {
      final a = await db.rpc('es_my_titles');
      final b = await db.rpc('es_title_catalog');
      if (!mounted) return;
      setState(() {
        mine = (a as List? ?? []).map((e) => Map<String,dynamic>.from(e as Map)).toList();
        catalog = (b as List? ?? []).map((e) => Map<String,dynamic>.from(e as Map)).toList();
        loading = false;
      });
    } catch (e) {
      if (mounted) { setState(() => loading=false); message(context, readableError(e)); }
    }
  }
  @override void initState() { super.initState(); load(); }

  Future<void> equip(String code) async {
    try {
      await db.rpc('es_equip_title', params: {'p_title':code});
      await load();
      if (mounted) message(context, 'Título equipado.');
    } catch(e) { if(mounted) message(context, readableError(e)); }
  }

  Widget tile(Map<String,dynamic> entry, {required bool owned}) {
    final rarity=entry['rarity']?.toString() ?? 'Comum';
    final equipped=entry['equipped']==true;
    final code=entry['code']?.toString()??'';
    final color=rarity.toLowerCase().contains('lend') || rarity.toLowerCase().contains('míst') ? _gold : _accent;
    return Card(margin:const EdgeInsets.symmetric(vertical:5),
      child: ListTile(
        leading:Icon(equipped?Icons.workspace_premium:Icons.emoji_events_outlined,color:color),
        title:Text(entry['name']?.toString() ?? code,style:TextStyle(color:equipped?_gold:Colors.white)),
        subtitle:Text(rarity.toUpperCase() + ' · ' + (entry['description']?.toString()??''),
          style:const TextStyle(color:_muted,fontSize:12)),
        isThreeLine:true,
        trailing: owned ? (equipped
          ? const Icon(Icons.check_circle,color:_gold)
          : IconButton(icon:const Icon(Icons.check_circle_outline),tooltip:'Equipar título',
              onPressed:code.isEmpty?null:()=>equip(code)))
          : (entry['claimed']==true ? const Icon(Icons.lock_outline,color:_muted) : null),
      ));
  }

  @override Widget build(BuildContext context)=>DefaultTabController(length:2,
    child: Scaffold(
      appBar:AppBar(title:const Text('Títulos e conquistas'),
        bottom:const TabBar(tabs:[Tab(text:'Meus títulos'),Tab(text:'Catálogo')])),
      body:loading?const Center(child:CircularProgressIndicator()):
        TabBarView(children:[
          RefreshIndicator(onRefresh:load,child:ListView(padding:const EdgeInsets.all(16),
            children:mine.isEmpty
              ? [const Padding(padding:EdgeInsets.symmetric(vertical:35),
                  child:Center(child:Text('Jogue partidas públicas para conquistar títulos.')))]
              : mine.map((e)=>tile(e,owned:true)).toList())),
          RefreshIndicator(onRefresh:load,child:ListView(padding:const EdgeInsets.all(16),
            children:catalog.map((e)=>tile(e,owned:false)).toList())),
        ]),
    ));
}

class FriendsPageV7 extends StatefulWidget {
  const FriendsPageV7({super.key});
  @override State<FriendsPageV7> createState()=>_FriendsPageV7State();
}

class _FriendsPageV7State extends State<FriendsPageV7> {
  final search=TextEditingController();
  List<Map<String,dynamic>> friends=[], results=[];
  bool busy=false;
  @override void initState(){super.initState();_refresh();}
  @override void dispose(){search.dispose();super.dispose();}

  Future<void> _refresh() async {
    try{
      final value=await db.rpc('es_friend_list');
      if(mounted)setState(() => friends=(value as List? ?? [])
        .map((e)=>Map<String,dynamic>.from(e as Map)).toList());
    } catch(e) { if(mounted)message(context,readableError(e)); }
  }
  Future<void> _search() async {
    if(search.text.trim().length<2)return;
    setState(()=>busy=true);
    try {
      final data=await db.rpc('es_find_players',params:{'p_query':search.text.trim()});
      if(mounted)setState(()=>results=(data as List? ?? [])
        .map((e)=>Map<String,dynamic>.from(e as Map)).toList());
    }catch(e){if(mounted)message(context,readableError(e));}
    finally{if(mounted)setState(()=>busy=false);}
  }
  Future<void> _act(String name, Map<String,dynamic> args) async {
    try {
      await db.rpc(name,params:args);
      if(mounted){message(context,'Solicitação registrada.');await _refresh();}
    }catch(e){if(mounted)message(context,readableError(e));}
  }

  @override Widget build(BuildContext context)=>Scaffold(
    appBar:AppBar(title:const Text('Amigos')),
    body:ListView(padding:const EdgeInsets.all(17),children:[
      Text('ENCONTRAR JOGADORES',style:Theme.of(context).textTheme.labelLarge?.copyWith(color:_accent)),
      const SizedBox(height:12),
      Row(children:[
        Expanded(child:TextField(controller:search,textInputAction:TextInputAction.search,
          onSubmitted:(_)=>_search(),decoration:const InputDecoration(
            hintText:'Pesquisar apelido',prefixIcon:Icon(Icons.search)))),
        const SizedBox(width:8),
        IconButton(onPressed:busy?null:_search,icon:const Icon(Icons.arrow_forward_rounded)),
      ]),
      const SizedBox(height:10),
      for(final r in results)Card(child:ListTile(
        leading:const Icon(Icons.person_outline,color:_accent),
        title:Text(r['nickname']?.toString()??''),
        trailing:IconButton(tooltip:'Adicionar amigo',icon:const Icon(Icons.person_add_alt_1),
          onPressed:()=>_act('es_friend_send',{'p_to':r['id']})),
      )),
      const SizedBox(height:22),
      Row(children:[
        const Text('MEUS AMIGOS',style:TextStyle(color:_accent,fontWeight:FontWeight.bold,letterSpacing:1)),
        const Spacer(),
        IconButton(onPressed:_refresh,icon:const Icon(Icons.refresh),tooltip:'Atualizar'),
      ]),
      if(friends.isEmpty)const ListTile(title:Text('Você ainda não tem amigos adicionados.')),
      for(final f in friends)Card(child:ListTile(
        leading:Icon(f['accepted']==true?Icons.people_outline:Icons.schedule_outlined,color:_accent),
        title:Text(f['nickname']?.toString()??'Jogador'),
        subtitle:Text(f['accepted']==true?'Amigo':
          f['incoming']==true?'Solicitação recebida':'Convite enviado'),
        trailing:f['accepted']!=true && f['incoming']==true
          ? TextButton(onPressed:()=>_act('es_friend_accept',{'p_from':f['id']}),
              child:const Text('Aceitar')):null,
      )),
    ]),
  );
}
