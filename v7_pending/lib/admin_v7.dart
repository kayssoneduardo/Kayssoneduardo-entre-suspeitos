import 'package:flutter/material.dart';
import 'main.dart';
import 'auth_flow.dart';

const _gold = Color(0xFFDDBB76);
const _muted = Color(0xFFB7B3C9);

class AdminPageV7 extends StatefulWidget {
  const AdminPageV7({super.key});
  @override State<AdminPageV7> createState() => _AdminPageV7State();
}
class _AdminPageV7State extends State<AdminPageV7> {
  final query = TextEditingController(), reason = TextEditingController();
  bool checking = true, allowed = false, busy = false;
  Map<String,dynamic> dashboard = {};
  List<Map<String,dynamic>> matches = [];

  @override void initState() { super.initState(); refresh(); }
  @override void dispose(){query.dispose();reason.dispose();super.dispose();}

  Future<void> refresh() async {
    try {
      final permission = await esIsAdministrator();
      if (!permission) {
        if(mounted) setState(() { checking=false; allowed=false; });
        return;
      }
      final data = await db.rpc('es_admin_dashboard');
      if (mounted) setState(() {
        allowed=true; checking=false; dashboard=Map<String,dynamic>.from(data as Map);
      });
    } catch(e) {
      if(mounted){setState(()=>checking=false);message(context,readableError(e));}
    }
  }
  Future<void> findPlayers() async {
    if(query.text.trim().length<2)return;
    setState(()=>busy=true);
    try{
      final result=await db.rpc('es_find_players',params:{'p_query':query.text.trim()});
      if(mounted)setState(()=>matches=(result as List? ?? [])
        .map((r)=>Map<String,dynamic>.from(r as Map)).toList());
    }catch(e){if(mounted)message(context,readableError(e));}
    finally{if(mounted)setState(()=>busy=false);}
  }
  Future<void> resolve(int id,String status) async {
    try{
      await db.rpc('es_admin_resolve',params:{'p_id':id,'p_status':status});
      await refresh();
      if(mounted)message(context,'Solicitação atualizada.');
    }catch(e){if(mounted)message(context,readableError(e));}
  }
  Future<void> sanction(Map<String,dynamic> user) async {
    reason.clear();
    int days = 1;
    final data = await showDialog<Map<String,dynamic>>(context:context,
      builder:(ctx)=>StatefulBuilder(builder:(ctx,setDialog)=>AlertDialog(
        title:Text('Suspender ' + (user['nickname']?.toString()??'jogador') + '?'),
        content:Column(mainAxisSize:MainAxisSize.min,children:[
          const Text('A suspensão bloqueia a conta conforme as regras do servidor.'),
          const SizedBox(height:12),
          DropdownButtonFormField<int>(initialValue:days,
            items:[1,3,7,15,30].map((d)=>DropdownMenuItem(value:d,child:Text('$d dias'))).toList(),
            onChanged:(v)=>setDialog(()=>days=v??1)),
          const SizedBox(height:12),
          TextField(controller:reason,maxLength:200,maxLines:2,
            onChanged:(_) => setDialog(() {}),
            decoration:const InputDecoration(labelText:'Motivo (obrigatório)')),
        ]),
        actions:[
          TextButton(onPressed:()=>Navigator.pop(ctx),child:const Text('Cancelar')),
          FilledButton(onPressed:reason.text.trim().length<5?null:()=>Navigator.pop(ctx,{
            'p_target':user['id'],'p_days':days,'p_reason':reason.text.trim()}),
            child:const Text('CONFIRMAR SUSPENSÃO')),
        ],
      )));
    if(data==null || !mounted)return;
    try{
      await db.rpc('es_admin_sanction',params:data);
      if(mounted)message(context,'Suspensão aplicada pelo servidor.');
    }catch(e){if(mounted)message(context,readableError(e));}
  }
  Future<void> unsanction(Map<String,dynamic> user) async {
    final ok=await showDialog<bool>(context:context,builder:(ctx)=>AlertDialog(
      title:const Text('Remover suspensão?'),
      content:Text('Liberar a conta de ' + (user['nickname']?.toString()??'jogador')+'?'),
      actions:[
        TextButton(onPressed:()=>Navigator.pop(ctx,false),child:const Text('Cancelar')),
        FilledButton(onPressed:()=>Navigator.pop(ctx,true),child:const Text('Confirmar')),
      ]));
    if(ok!=true)return;
    try{
      await db.rpc('es_admin_unsanction',params:{'p_target':user['id']});
      if(mounted)message(context,'Suspensão removida.');
    }catch(e){if(mounted)message(context,readableError(e));}
  }

  @override Widget build(BuildContext context) {
    final tickets=(dashboard['solicitacoes'] as List? ?? [])
      .map((v)=>Map<String,dynamic>.from(v as Map)).toList();
    return Scaffold(
      appBar:AppBar(title:const Text('Painel do Zero'),actions:[
        IconButton(onPressed:refresh,icon:const Icon(Icons.refresh),tooltip:'Atualizar'),
      ]),
      body:checking?const Center(child:CircularProgressIndicator()):
        !allowed ? const Center(child:Padding(padding:EdgeInsets.all(20),
          child:Text('Acesso negado. Sua identidade não possui autorização de administrador.')))
        :ListView(padding:const EdgeInsets.all(17),children:[
          const Center(child:Icon(Icons.admin_panel_settings_outlined,size:68,color:_gold)),
          const Center(child:Text('ADMINISTRAÇÃO AUTORIZADA',style:TextStyle(
            color:_gold,letterSpacing:1.4,fontWeight:FontWeight.bold))),
          const SizedBox(height:18),
          Wrap(spacing:8,runSpacing:8,children:[
            for(final key in ['contas','salas','jogadoresOnline','partidas','pendencias'])
              Chip(label:Text(key + ': ' + (dashboard[key]?.toString()??'0')),
                avatar:const Icon(Icons.analytics_outlined,size:16,color:_gold)),
          ]),
          const SizedBox(height:24),
          const Text('DENÚNCIAS E SOLICITAÇÕES',style:TextStyle(color:_gold,letterSpacing:1)),
          const SizedBox(height:8),
          if(tickets.isEmpty)const ListTile(title:Text('Nenhuma solicitação registrada.')),
          for(final t in tickets)Card(child:Padding(padding:const EdgeInsets.all(10),
            child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
              Text((t['type']?.toString()??'Solicitação').toUpperCase(),
                style:const TextStyle(fontWeight:FontWeight.bold)),
              const SizedBox(height:6),
              Text(t['body']?.toString()??'',style:const TextStyle(color:_muted)),
              const SizedBox(height:6),
              Text('Situação: ' + (t['status']?.toString()??'pendente'),
                style:const TextStyle(color:_muted,fontSize:12)),
              if(t['status']!='resolvido')Wrap(children:[
                TextButton(onPressed:()=>resolve((t['id'] as num).toInt(),'em analise'),
                  child:const Text('Em análise')),
                TextButton(onPressed:()=>resolve((t['id'] as num).toInt(),'resolvido'),
                  child:const Text('Resolver')),
                TextButton(onPressed:()=>resolve((t['id'] as num).toInt(),'rejeitado'),
                  child:const Text('Rejeitar')),
              ]),
            ]))),
          const SizedBox(height:23),
          const Text('MODERAÇÃO DE JOGADORES',style:TextStyle(color:_gold,letterSpacing:1)),
          const SizedBox(height:10),
          Row(children:[
            Expanded(child:TextField(controller:query,onSubmitted:(_)=>findPlayers(),
              decoration:const InputDecoration(hintText:'Pesquisar apelido',
                prefixIcon:Icon(Icons.person_search_outlined)))),
            IconButton(onPressed:busy?null:findPlayers,
              icon:const Icon(Icons.search),tooltip:'Pesquisar'),
          ]),
          const SizedBox(height:10),
          for(final player in matches)Card(child:ExpansionTile(
            title:Text(player['nickname']?.toString()??'Jogador'),
            subtitle:const Text('Ações de moderação'),
            children:[
              ListTile(leading:const Icon(Icons.person_off_outlined),
                title:const Text('Aplicar suspensão'),
                onTap:()=>sanction(player)),
              ListTile(leading:const Icon(Icons.check_circle_outline),
                title:const Text('Retirar suspensão'),
                onTap:()=>unsanction(player)),
            ])),
          const SizedBox(height:30),
          const Text('As ações administrativas são verificadas no servidor e não são concedidas por apelido.',
            textAlign:TextAlign.center,style:TextStyle(fontSize:12,color:_muted)),
        ]),
    );
  }
}
