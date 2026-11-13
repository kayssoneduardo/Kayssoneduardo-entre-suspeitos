from pathlib import Path
import json

root=Path('web')
def replace(path,old,new):
    p=root/path
    s=p.read_text(encoding='utf-8')
    if old not in s:
        raise RuntimeError(f'Trecho não encontrado em {path}: {old[:60]}')
    p.write_text(s.replace(old,new),encoding='utf-8')

replace('online.js',"const PREFIX='es3_', MIN=4, MAX=10;","const PREFIX='es3_', MIN=3, MAX=10;")
replace('online.js','min="4" max="10"','min="3" max="10"')
replace('online.js','Escolha 4 a 10 jogadores','Escolha 3 a 10 jogadores')
replace('online.js','pelo menos 4 jogadores prontos','pelo menos 3 jogadores prontos')
replace('online.js','joined.length>=4','joined.length>=3')
replace('app.js',"while(c.names.length<4)","while(c.names.length<3)")
replace('app.js','min="4" max="30"','min="3" max="30"')
replace('app.js','Math.max(4,Math.min(30,Number.isFinite(n)?Math.round(n):4))','Math.max(3,Math.min(30,Number.isFinite(n)?Math.round(n):3))')
replace('index.html','VERSÃO 4.0 • TESTES','VERSÃO WEB 7.1 • ONLINE + OFFLINE')
replace('index.html','maximum-scale=1,','')
replace('online.js','Este Android não disponibilizou recursos de áudio WebRTC.','Este navegador não disponibiliza recursos de áudio WebRTC.')
replace('online.js','Verifique a permissão de microfone do aplicativo no Android.','Verifique a permissão de microfone do Safari, Chrome ou navegador utilizado.')

p=root/'online.js'
s=p.read_text(encoding='utf-8')
old=" async signOut(){try{await this.request('/auth/v1/logout','POST',{});}catch{}this.session=null;save('session',null);}"
new=""" async verifyEmailLink(value){
  let uri;
  try{uri=new URL(value.trim());}catch{throw new Error('Cole o endereço completo recebido no e-mail.');}
  const site=new URL(this.url);
  if(uri.origin!==site.origin||uri.pathname!=='/auth/v1/verify')
    throw new Error('O endereço precisa ser um link original do Supabase Entre Suspeitos.');
  const token=uri.searchParams.get('token_hash')||uri.searchParams.get('token');
  const rawType=uri.searchParams.get('type');
  const type=rawType==='email'?'signup':rawType;
  if(!token||!['signup','recovery'].includes(type))
    throw new Error('Link incompleto ou não suportado. Solicite um novo e-mail.');
  const result=await this.request('/auth/v1/verify','POST',{token_hash:token,type},false);
  if(result?.access_token)this.setSession(result);
  return {type,loggedIn:!!result?.access_token};
 }
 async signOut(){try{await this.request('/auth/v1/logout','POST',{});}catch{}this.session=null;save('session',null);}"""
if old not in s:raise RuntimeError('Cloud.signOut não encontrado')
s=s.replace(old,new)

# Na versão Web, confirmação/redefinição pode funcionar sem redirecionamento
# usando o link original dentro do próprio cliente, sem encaminhá-lo a terceiros.
anchor="  $('serverOnLogin').onclick=()=>this.setup();"
extra="""  const fallback=document.createElement('section');
  fallback.className='card';
  fallback.innerHTML='<h3>O link do e-mail não abre?</h3>'+
    '<p class="subtext">No e-mail, pressione o botão e escolha “Copiar endereço do link”. Cole-o abaixo para confirmar sua conta ou recuperar seu acesso sem abrir o site com erro.</p>'+
    '<div class="field"><label for="emailLinkOn">Link original de confirmação ou recuperação</label>'+
    '<textarea id="emailLinkOn" rows="3" style="width:100%;box-sizing:border-box" autocapitalize="off" spellcheck="false"></textarea></div>'+
    '<button class="btn secondary" type="button" id="checkEmailLinkOn">VALIDAR LINK DO E-MAIL</button>'+
    '<p class="small muted">Este link é secreto. Não compartilhe com outras pessoas.</p>';
  this.app.appendChild(fallback);
  $('checkEmailLinkOn').onclick=async()=>{
    try{
      const r=await this.cloud.verifyEmailLink($('emailLinkOn').value);
      $('emailLinkOn').value='';
      if(r.type==='recovery'&&r.loggedIn){
        const pwd=prompt('Link validado! Digite uma NOVA senha com pelo menos 8 caracteres:');
        if(!pwd || pwd.length<8) return this.note('A senha deve ter pelo menos 8 caracteres.');
        await this.cloud.request('/auth/v1/user','PUT',{password:pwd});
        this.note('Senha atualizada. Você já pode jogar com sua conta.');
        this.home();
      } else if(r.loggedIn){this.home();}
      else this.note('E-mail confirmado. Use o botão Entrar.');
    }catch(e){this.error(e);}
  };
  $('serverOnLogin').onclick=()=>this.setup();"""
if anchor not in s:raise RuntimeError('Hook login ausente')
s=s.replace(anchor,extra)
p.write_text(s,encoding='utf-8')

# Respeitar os 1322 termos completos do offline no site web.
word_file=(root/'words.js').read_text(encoding='utf-8')
if word_file.count('"w":')!=1322:
    raise RuntimeError('Dicionário offline divergente (não possui 1322 palavras).')

(root/'.nojekyll').write_text('')
print('Web V7 pronto: mesmas salas Supabase, 3 jogadores, 1322 palavras, links de e-mail, Safari/desktop.')
