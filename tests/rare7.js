const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const code=html.split('<script>\n')[1].split('</script>')[0];
const W=process.argv[2]||"sword";
const mk=()=>new Proxy(function(){}, {get:(t,k)=>k===Symbol.toPrimitive?()=>0:(k==='width'||k==='height'?64:mk()),apply:()=>mk(),set:()=>true});
const mkEl=(canvas)=>{const el={style:{},children:[],_t:'',classList:{add(){},remove(){}},addEventListener(){},appendChild(c){el.children.push(c)},querySelectorAll(){return []},querySelector(){return el._row||(el._row=mkEl())},set innerHTML(v){el.children=[]},get innerHTML(){return ''},set textContent(v){el._t=v},get textContent(){return el._t}};if(canvas){el.getContext=()=>mk();el.width=64;el.height=64;}return el;};
const els={};const canvasIds=['game','minimap','title-bg','go-card'];
const doc={getElementById:id=>els[id]||(els[id]=mkEl(canvasIds.includes(id))),addEventListener(){},hidden:false,createElement:t=>mkEl(t==='canvas')};
let raf=null;
const sb={document:doc,window:{innerWidth:900,innerHeight:600,devicePixelRatio:2,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame:f=>{raf=f},localStorage:{getItem:()=>null,setItem(){}},Math,console,setTimeout:(f)=>{try{f()}catch(e){}}};
sb.__SEEN=new Set();vm.createContext(sb);vm.runInContext(code,sb);
let t=0;const step=()=>{t+=16.7;const f=raf;raf=null;f(t)};const run=s=>vm.runInContext(s,sb);
const fail=m=>{console.log('FAIL',m);process.exit(1)};
run(`selectedWeapon='${W}';beginRun()`);for(let i=0;i<30;i++)step();
run('enemies.length=0;waveQueue.length=0;spawnTimer=999;player.x=900;player.y=700;spawnEnemy("rare");__r=enemies[enemies.length-1];__r.x=1150;__r.y=700');
if(!run('__r.rare&&__r.name'))fail('no rare');console.log('rare:',run('__r.name'),'hp',run('__r.maxHp'));
// let it cast every ability; keep the hero alive and still
const seen=new Set();let poolHurt=false;
for(let i=0;i<60*90;i++){run('player.hp=player.maxHp;joy.dx=joy.dy=0;player.mount=0;__r.hp=__r.maxHp');const c=run('__r.cast&&__r.cast.id');if(c)seen.add(c);
  if(run('rarePools.some(p=>p.warn<=0)')&&!poolHurt){const hp0=run('player.invuln=0;player.x=rarePools.find(p=>p.warn<=0).x;player.y=rarePools.find(p=>p.warn<=0).y;player.hp');for(let k=0;k<40;k++)step();if(run('player.hp')<hp0)poolHurt=true;}
  step();if(seen.size===3&&poolHurt)break;}
if(seen.size<3)fail('abilities seen: '+[...seen]);if(!poolHurt)fail('pool did no damage');
if(run('__r.flying'))for(let i=0;i<120&&run('__r.flying');i++)step();if(run('__r.flying'))fail('stuck in the air');
console.log('abilities ok:',[...seen].join(','));
// rally at half health
run('__r.cast=null;__r.flying=false;__r.hp=__r.maxHp*0.45');const n0=run('enemies.length');for(let i=0;i<5;i++)step();
if(!run('__r.rallied')||run('enemies.length')<n0+1)fail('no rally '+run('JSON.stringify({st:__r.stun,r:__r.rallied})'));
// flee at a quarter and escape
run('enemies.filter(e=>!e.rare).forEach(e=>killEnemy(e));__r.cast=null;__r.flying=false;__r.hp=__r.maxHp*0.2;player.x=100;player.y=100;player.invuln=99');
for(let i=0;i<60*20&&run('enemies.includes(__r)');i++){run('player.hp=player.maxHp');step();}
if(run('enemies.includes(__r)'))fail('did not escape');if(run('__r.fleeing')!==true)fail('not fleeing');console.log('flee + escape ok');
// a fresh rare that is slain drops its hoard and embers count
run('spawnEnemy("rare");__q=enemies[enemies.length-1];');const pk0=run('pickups.length'),e0=run('runEmbers().base');
run('__q.hp=1;damageEnemy(__q,999,0,0,true)');
if(run('enemies.includes(__q)'))fail('not slain');if(run('pickups.length')<pk0+7)fail('no hoard');if(run('rareKills')!==1)fail('rareKills');
console.log('slain: pickups +',run('pickups.length')-pk0,'embers +',run('runEmbers().base')-e0);
run('render();updateHUD()');for(let i=0;i<10;i++)step();
console.log('rare: all checks passed');
