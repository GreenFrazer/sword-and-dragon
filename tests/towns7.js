const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const code=html.split('<script>\n')[1].split('</script>')[0];
const W=process.argv[2]||'sword', FRAMES=+process.argv[3]||30000;
const mk=()=>new Proxy(function(){}, {get:(t,k)=>k===Symbol.toPrimitive?()=>0:(k==='width'||k==='height'?64:mk()),apply:()=>mk(),set:()=>true});
const mkEl=(canvas)=>{const el={style:{},children:[],_t:'',classList:{add(){},remove(){}},addEventListener(){},appendChild(c){el.children.push(c)},querySelectorAll(){return []},querySelector(){return el._row||(el._row=mkEl())},set innerHTML(v){el.children=[]},get innerHTML(){return ''},set textContent(v){el._t=v},get textContent(){return el._t}};if(canvas){el.getContext=()=>mk();el.width=64;el.height=64;}return el;};
const els={};const canvasIds=['game','minimap','title-bg','go-card'];
const doc={getElementById:id=>els[id]||(els[id]=mkEl(canvasIds.includes(id))),addEventListener(){},hidden:false,createElement:t=>mkEl(t==='canvas')};
let raf=null;
const sb={document:doc,window:{innerWidth:900,innerHeight:600,devicePixelRatio:2,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame:f=>{raf=f},localStorage:{getItem:()=>null,setItem(){}},Math,console,setTimeout:(f)=>{try{f()}catch(e){}}};
sb.__SEEN=new Set();vm.createContext(sb);vm.runInContext(code,sb);
let t=0;const step=()=>{t+=16.7;const f=raf;raf=null;f(t)};const run=s=>vm.runInContext(s,sb);
run(`meta.embers=9999;meta.unlocked={sword:true,greatsword:true,daggers:true,spear:true};meta.vit=2;meta.wind=1;selectedWeapon='${W}';renderTitleMenu()`);
for(let i=0;i<120;i++)step();
for(const k of ['ArrowDown','ArrowDown','Enter','ArrowRight','Enter','ArrowLeft','Escape','ArrowDown','Enter','ArrowDown','Enter','Escape','ArrowUp','ArrowUp','ArrowUp','ArrowUp'])run(`menuKey({code:'${k}'})`);
for(let i=0;i<60;i++)step();
console.log('menu',run('menuIdx'),run('selectedWeapon'),run('state'));
run(`selectedWeapon='${W}'`);
run('beginRun()');console.log('after begin',run('state'));
// ---- two towns: layout, raids, enemy count, wave length ----
const ok=(c,m)=>{console.log(c?'ok  ':'FAIL',m);if(!c)process.exitCode=1};
const R=JSON.parse;
function setup(w){run(`wave=${w};startWave(${w});state='play';clearTimer=null;enemies.length=0;pickups.length=0;player.invuln=0;player.hp=player.maxHp`);}
// layout
for(const w of [2,5,8,11]){setup(w);const n=run('village.towns.length'),sep=n>1?Math.round(run('Math.hypot(village.towns[0].x-village.towns[1].x,village.towns[0].y-village.towns[1].y)')):0,hs=run('village.houses.length');
  console.log(`wave ${w}: towns=${n} houses=${hs} queue=${run('waveQueue.length')} maxAlive=${run('maxAlive()')} separation=${sep}`);
  ok(w===2?n===1:n===2,`wave ${w} has ${w===2?1:2} town(s)`); if(n>1)ok(sep>=500,'towns are well apart ('+sep+')');}
// separation holds over many random layouts
let minSep=1e9;for(let i=0;i<60;i++){setup(5+3*(i%3));minSep=Math.min(minSep,run('Math.hypot(village.towns[0].x-village.towns[1].x,village.towns[0].y-village.towns[1].y)'));}
ok(minSep>=550,'towns are always well apart over 60 layouts (min '+Math.round(minSep)+')');
// raids spawn near their own town
setup(5);run('waveQueue.length=0;spawnTimer=99');
let own=0,tot=0;for(let i=0;i<40;i++){run('spawnEnemy("grunt")');}
const es=R(run('JSON.stringify(enemies.map(e=>({r:e.raid,x:e.x,y:e.y})))')),T=R(run('JSON.stringify(village.towns.map(t=>({x:t.x,y:t.y})))'));
for(const e of es){const d=T.map(t=>Math.hypot(t.x-e.x,t.y-e.y));if(d[e.r]<=d[1-e.r])own++;tot++;}
ok(es.filter(e=>e.r===0).length===20&&es.filter(e=>e.r===1).length===20,'raids alternate evenly');
ok(own/tot>0.75,`raids spawn nearer their own town (${own}/${tot})`);
// wave length / early end. Strategies: 'chase' (go for the nearest enemy, like a normal player) and 'campA' (only ever defend town A)
function playWave(w,strategy){
  setup(w);run('spawnTimer=0.4');run('player.upg.dmg=2;player.damage=Math.round(player.damage*1.5);player.hp=player.maxHp');
  let frames=0,ended=false,firstBHit=-1;const t0=run('waveQueue.length');
  while(frames<60*300){
    if(strategy==='chase')run('player.hp=Math.max(player.hp,player.maxHp*0.6);(()=>{let b=null,bd=1e9;for(const e of enemies){const d=Math.hypot(e.x-player.x,e.y-player.y);if(d<bd){bd=d;b=e}}const t=b||village.towns[0];const a=Math.atan2(t.y-player.y,t.x-player.x);joy.dx=Math.cos(a);joy.dy=Math.sin(a)})()');
    else run('player.hp=player.maxHp;(()=>{const t=village.towns[0];const a=Math.atan2(t.y+60-player.y,t.x-player.x);const d=Math.hypot(t.x-player.x,t.y+60-player.y);if(d>60){joy.dx=Math.cos(a);joy.dy=Math.sin(a)}else joy.dx=joy.dy=0})()');
    step();frames++;
    if(firstBHit<0&&run('village.towns.length>1&&village.towns[1].houses.some(h=>h.hp<h.maxHp)'))firstBHit=frames;
    if(run('state')!=='play'||run('clearTimer')!==null){ended=true;break}
  }
  const dmg=t=>run(`village.towns[${t}]?village.towns[${t}].houses.reduce((a,h)=>a+(h.maxHp-h.hp),0):0`);
  return {w,strategy,queue:t0,secs:Math.round(frames/60),ended,firstBHitSecs:firstBHit<0?null:Math.round(firstBHit/60),dmgA:Math.round(dmg(0)),dmgB:Math.round(dmg(1)),housesAlive:run('housesAlive()')+'/'+run('village.houses.length')};
}
const res=[];
for(const w of [2,5,8])for(const st of ['chase','campA']){const r=playWave(w,st);res.push(r);console.log(JSON.stringify(r));}
for(const r of res){ if(r.w>=5){if(r.strategy==='chase')ok(r.ended,`wave ${r.w} (${r.strategy}) ends`);ok(r.dmgB>0||r.firstBHitSecs!==null||r.housesAlive.split('/')[0]!==r.housesAlive.split('/')[1]||r.strategy==='chase','undefended town is pressured ('+r.strategy+')');}}
const len=(w,s)=>res.find(r=>r.w===w&&r.strategy===s).secs;
console.log('wave length chase: 1 town',len(2,'chase'),'s | 2 towns (w5)',len(5,'chase'),'s | (w8)',len(8,'chase'),'s');
ok(len(5,'chase')>len(2,'chase')*1.15,'two-town waves last meaningfully longer than the single village wave');
console.log(process.exitCode?'TOWNS TEST FAILED':'towns: all checks passed');
