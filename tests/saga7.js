// The Waystone: a cleared wave saves the run; a new session (or another device, by link) continues it.
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const code=html.split('<script>\n')[1].split('</script>')[0];
const W=process.argv[2]||'sword';
const mk=()=>new Proxy(function(){}, {get:(t,k)=>k===Symbol.toPrimitive?()=>0:(k==='width'||k==='height'?64:mk()),apply:()=>mk(),set:()=>true});
const mkEl=(canvas)=>{const el={style:{},children:[],_t:'',classList:{add(){},remove(){}},addEventListener(){},appendChild(c){el.children.push(c)},querySelectorAll(){return []},querySelector(){return el._row||(el._row=mkEl())},set innerHTML(v){el.children=[]},get innerHTML(){return ''},set textContent(v){el._t=v},get textContent(){return el._t}};if(canvas){el.getContext=()=>mk();el.width=64;el.height=64;}return el;};
const fail=m=>{console.log("FAIL",m);process.exit(1)};
const norm=o=>JSON.stringify(o&&typeof o==="object"&&!Array.isArray(o)?Object.keys(o).sort().reduce((r,k)=>(r[k]=o[k],r),{}):o);
// one "device": its own page, sharing a storage map with other pages of the same device
function boot(store,hash){
  const els={},canvasIds=['game','minimap','title-bg','go-card'];
  const doc={getElementById:id=>els[id]||(els[id]=mkEl(canvasIds.includes(id))),addEventListener(){},hidden:false,createElement:t=>mkEl(t==='canvas')};
  let raf=null;
  const ls={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
  const sb={document:doc,window:{innerWidth:900,innerHeight:600,devicePixelRatio:2,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame:f=>{raf=f},localStorage:ls,Math,console,setTimeout:(f)=>{try{f()}catch(e){}},
    location:{hash:hash||'',protocol:'https:',origin:'https://example.test',pathname:'/',search:''},history:{replaceState(){sb.location.hash=''}},btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),escape,unescape};
  sb.__SEEN=new Set();vm.createContext(sb);vm.runInContext(code,sb);
  let t=0;
  return {els,run:s=>vm.runInContext(s,sb),step(n){for(let i=0;i<(n||1);i++){t+=16.7;const f=raf;raf=null;f(t);}}};
}

// ---- session 1: play wave 1, clear it, reach the waystone
const dev=new Map();
const a=boot(dev);
a.run(`meta.unlocked={sword:true,greatsword:true,daggers:true,spear:true};selectedWeapon='${W}';renderMenu()`);
if(a.run("MENU[0].id")==='cont')fail('continue offered with no saga');
a.run('beginRun()');a.step(30);
if(a.run('state')!=='play')fail('run did not start');
// a build worth keeping: blessings, an evolution flag, gear, companions, buffs, gold, wood
a.run(`applyUpgrade('dmg');applyUpgrade('dmg');applyUpgrade('armor');applyUpgrade('crit');player.evo[EVOS[0].id]=true;
  offerItem(Object.assign(makeItem(1),{slot:'weapon'}));offerItem(makeItem(1));gold=777;kills=42;bestCombo=19;wood=5;activeBuffs.brew=2;
  recruitCompanion('cleric');recruitCompanion('squire',{hired:true,name:'Sellsword',wavesLeft:2});player.hp=player.maxHp-30;`);
const before=JSON.parse(a.run(`JSON.stringify({wp:player.weapon,gold,kills,bc:bestCombo,wood,upg:player.upg,evo:player.evo,maxHp:player.maxHp,hp:player.hp,dmg:atkDmg(),crit:critCh(),gear:SLOTS.map(s=>gear[s]&&gear[s].name),comp:companions.map(c=>c.name+'|'+c.type+'|'+!!c.hired),buffs:activeBuffs})`));
a.run('enemies.length=0;waveQueue.length=0;');
let merchant=false;for(let i=0;i<900&&!merchant;i++){a.step();if(a.run('state')==='upgrade'){const c=a.els['card-container'].children;if(c.length&&a.run("$('merchant-modal').style.display")!=='flex')c[0].onclick();merchant=a.run("$('merchant-modal').style.display")==='flex';}}
if(!merchant)fail('merchant never opened');
let s=JSON.parse(a.run('JSON.stringify(readSaga())'));
if(!s||s.w!==2)fail('no saga inscribed at the waystone '+JSON.stringify(s&&s.w));
if(!dev.get('swordDragonSaga'))fail('saga not in storage');
console.log('inscribed at waystone: wave',s.w,'code',dev.get('swordDragonSaga').length,'chars');
// rest here: save & quit to the title, embers paid once
const e0=a.run('meta.embers');a.run("$('ws-rest').onclick()");
if(a.run('state')!=='title')fail('rest did not return to title');
const paid=a.run('runPaid');if(!(a.run('meta.embers')>e0)||!(paid>0))fail('rest paid no embers');
if(JSON.parse(dev.get('swordDragonSaga')?a.run('JSON.stringify(readSaga().paid)'):'0')!==paid)fail('paid not carried in saga');
const after=JSON.parse(a.run(`JSON.stringify({wp:player.weapon,gold,kills,bc:bestCombo,wood,upg:player.upg,evo:player.evo,maxHp:player.maxHp,hp:player.hp,dmg:atkDmg(),crit:critCh(),gear:SLOTS.map(s=>gear[s]&&gear[s].name),comp:companions.map(c=>c.name+'|'+c.type+'|'+!!c.hired),buffs:activeBuffs})`));

// ---- session 2: same device, the game is reopened later
const b=boot(dev);b.step(10);
if(b.run("MENU[0].id")!=='cont'||b.run('menuIdx')!==0)fail('continue not first on title');
if(!/WAVE 2/.test(b.run("MENU[0].label")))fail('label '+b.run("MENU[0].label"));
b.run("menuKey({code:'Enter'})");b.step(5);
if(b.run('state')!=='play'||b.run('wave')!==2)fail('did not resume at wave 2: '+b.run('state')+' '+b.run('wave'));
const got=JSON.parse(b.run(`JSON.stringify({wp:player.weapon,gold,kills,bc:bestCombo,wood,upg:player.upg,evo:player.evo,maxHp:player.maxHp,hp:player.hp,dmg:atkDmg(),crit:critCh(),gear:SLOTS.map(s=>gear[s]&&gear[s].name),comp:companions.map(c=>c.name+'|'+c.type+'|'+!!c.hired),buffs:activeBuffs})`));
for(const k of ['wp','gold','kills','bc','wood','maxHp','dmg','crit'])if(JSON.stringify(got[k])!==JSON.stringify(after[k]))fail(k+' '+JSON.stringify(got[k])+' != '+JSON.stringify(after[k]));
for(const k of ["upg","evo","gear","comp","buffs"])if(norm(got[k])!==norm(after[k]))fail(k+' '+JSON.stringify(got[k])+' != '+JSON.stringify(after[k]));
if(got.hp>got.maxHp||got.hp<1)fail('hp '+got.hp);
console.log('resumed:',JSON.stringify({wave:2,gold:got.gold,maxHp:got.maxHp,gear:got.gear,party:got.comp.length,upg:got.upg}));
// no double pay: cashing out straight away pays nothing new for the run
const e1=b.run('meta.embers');b.run('cashOutRun()');const e2=b.run('meta.embers');if(e2-e1>8)fail('resume re-paid the run: '+(e2-e1));b.run('cashOutRun()');if(b.run('meta.embers')!==e2)fail('embers paid twice');
// play on for a while with the restored build
let errs=0;for(let i=0;i<1500;i++){try{b.step();if(b.run('state')==='upgrade')break;}catch(e){errs++;console.log('ERR',e.stack);break;}}
if(errs)fail('errors after resume');
// a carried link opens the same saga on another device
const link=b.run('sagaLink(readSaga())');if(!/#run=/.test(link))fail('no link');
const phone=new Map();const c=boot(phone,link.slice(link.indexOf('#')));c.step(5);
if(c.run("MENU[0].id")!=='cont'||c.run('readSaga().w')!==2)fail('link did not carry the saga');
if(!/SAGA RECEIVED/.test(c.els['title-best'].textContent))fail('no received note');
c.run('continueSaga()');if(c.run('wave')!==2||c.run('companions.length')!==after.comp.length)fail('link resume wrong');
console.log('link carried:',link.length,'chars');
// a damaged link is refused
const d=boot(new Map(),'#run=garbage%%');d.step(2);if(d.run("MENU[0].id")==='cont')fail('bad link accepted');
// death ends this run's saga
b.run('state="play";player.invuln=0;player.shieldT=0;player.hp=1;player.windUsed=true;player.phoenixUsed=true;damagePlayer(9999,player.x+10,player.y)');
if(b.run('state')!=='gameover')fail('no game over');if(dev.get('swordDragonSaga'))fail('saga survived death');
// a new run that dies before its first waystone leaves an older saga alone
c.run('showTitle()');c.run('beginRun()');c.run('player.invuln=0;player.shieldT=0;player.hp=1;player.windUsed=true;damagePlayer(9999,player.x+10,player.y)');
if(!phone.get('swordDragonSaga'))fail('older saga lost to a new run');
// abandoning it from the title (two taps)
c.run('showTitle()');c.run("$('saga-drop').onclick();$('saga-drop').onclick()");if(phone.get('swordDragonSaga')||c.run("MENU[0].id")==='cont')fail('abandon failed');
console.log('saga: all checks passed');
