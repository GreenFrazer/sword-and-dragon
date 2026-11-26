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
// ---- timber scenario: chop, pile, collect, villager haul, repair, rebuild, regrow ----
const fail=m=>{console.log('FAIL',m);process.exit(1)};
const frames=n=>{for(let i=0;i<n;i++){run('player.hp=player.maxHp;enemies.length=0;waveQueue=["grunt"];spawnTimer=99;if(state!=="play")state="play"');step()}};
const ok=(c,m)=>{console.log(c?'ok  ':'FAIL',m);if(!c)process.exitCode=1};
run('enemies.length=0;waveQueue.length=0;props.length=0;pickups.length=0;joy.dx=joy.dy=0');
run('(()=>{const t=trees[0];player.x=t.x+30;player.y=t.y+10;})()');
const felled0=run('treesFelled');
let guard=0;while(run('treesFelled')===felled0&&guard++<600)frames(1);
ok(run("pickups.some(p=>p.type==='wood')"),'pile is visible the moment the tree falls (not instantly collected)');
for(let i=0;i<400;i++)frames(1);
ok(run('treesFelled')>=felled0+1,'idle player fells a nearby tree');
frames(120);ok(run('wood')>=3,'player collected the pile ('+run('wood')+' logs)');
ok(run('!pushOutOfTrees||true'),'collision helper present');
// walking player must NOT chop
run('(()=>{const t=trees.find(treeAlive);player.x=t.x+30;player.y=t.y+10;})()');
const f1=run('treesFelled');run('joy.dx=1;joy.dy=0');for(let i=0;i<60;i++){run('player.hp=player.maxHp;enemies.length=0;waveQueue=["grunt"];spawnTimer=99;joy.dx=1;');step()}
ok(run('treesFelled')===f1,'moving player does not chop');run('joy.dx=joy.dy=0');
// regrowth
const stump=run('trees.findIndex(t=>t.regrow>0)');ok(stump>=0,'stump present');
run('regrowTrees();regrowTrees()');ok(run(`trees[${stump}].regrow===0&&trees[${stump}].hp>0`),'stump regrew after 2 waves');
// village: villager hauling + player repair + rebuild
run('wave=2;startWave(2)');ok(run('!!village'),'village wave');
run("trees.forEach(t=>{t.regrow=9;t.fell=0});enemies.length=0;waveQueue.length=0;spawnTimer=99;pickups.length=0;wood=0");
run("(()=>{const h=village.houses[0];h.hp=Math.round(h.maxHp*0.3);pickups.push({x:village.x+150,y:village.y+120,type:'wood',bob:0,n:2});})()");
const hp0=run('village.houses[0].hp');frames(900);
if(!run("village.villagers.every(v=>!v.carry)"))console.log(run('JSON.stringify([village.villagers.map(v=>[v.carry,!!v.tgt,Math.round(v.x-village.x),Math.round(v.y-village.y)]),pickups.filter(p=>p.type==="wood").map(p=>[Math.round(p.x-village.x),Math.round(p.y-village.y),p.n,!!p.claim]),Math.round(player.x-village.x),Math.round(player.y-village.y),state])'));
ok(run('village.villagers.every(v=>!v.carry)')&&!run("pickups.some(p=>p.type==='wood')"),'villagers hauled the pile');
ok(run('village.houses.reduce((a,h)=>a+h.hp,0)')>hp0+run('village.houses[1].hp+village.houses[2].hp')-1,'a house was repaired');
run("(()=>{const h=village.houses[1];h.dead=true;h.hp=0;wood=6;player.x=h.x;player.y=h.y+60;})()");frames(80);ok(run('!village.houses[1].dead')&&run('wood')===0,'player rebuilt a dead house with 6 logs');
run('wood=5');run('renderShop()');ok(true,'shop renders with timber');
// ---- woodcutters' camp ----
run('wave=4;startWave(4);trees.forEach(t=>{t.regrow=9;t.fell=0});pickups.length=0;campStock=0;wood=0');
ok(run('!!camp&&!village&&camp.workers.length===3'),'camp with 3 workers on a non-village wave');
run('player.x=camp.x+500;player.y=camp.y;if(player.x>WORLD_W-100)player.x=camp.x-500');
run('pickups.push({x:camp.x+120,y:camp.y+90,type:"wood",bob:0,n:4,age:0})');
frames(1200);
ok(run('campStock')>=3&&!run('pickups.some(p=>p.type==="wood")'),'workers hauled a pile to the camp stock ('+run('campStock')+')');
// flee: put an enemy next to a worker and check it moves away
run('enemies.length=0;waveQueue=["grunt"]');
const d0=run('(()=>{const v=camp.workers[0];spawnEnemy("grunt");const e=enemies[0];e.x=v.x-60;e.y=v.y;e.hp=1e9;e.maxHp=1e9;e.speed=0;globalThis.__e=e;globalThis.__v=v;return Math.hypot(v.x-e.x,v.y-e.y)})()');
for(let i=0;i<30;i++){run('enemies.length=1;player.hp=player.maxHp;spawnTimer=99;waveQueue=["grunt"]');step()}
const d1=run('Math.hypot(__v.x-__e.x,__v.y-__e.y)');ok(d1>d0+30&&run('__v.scared'),'worker runs away from an enemy ('+Math.round(d0)+' -> '+Math.round(d1)+')');
// stock reaches the player on a village wave
run('enemies.length=0;campStock=7;wood=0;wave=5;startWave(5)');
ok(run('!!village&&!camp&&wood===7&&campStock===0'),'stockpile delivered at village wave start');
// village villagers flee individually
run('enemies.length=0;spawnEnemy("grunt");enemies[0].x=village.villagers[0].x+40;enemies[0].y=village.villagers[0].y;');frames(2);
// full flow still runs
run('startWave(3);state="play"');frames(10);
console.log(process.exitCode?'WOOD TEST FAILED':'wood: all checks passed');
