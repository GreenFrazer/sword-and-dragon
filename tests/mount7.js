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
// clear the field, then walk: the warhorse is called and arrives
run('enemies.length=0;waveQueue.length=0;waveQueue.push("melee");spawnTimer=999;player.mountCd=0;joy.dx=1;joy.dy=0;player.x=600;player.y=WORLD_H/2');
let castSeen=false;for(let i=0;i<90;i++){step();if(run('player.mountCast>0'))castSeen=true;}
if(!castSeen)fail('no summon cast');if(!run('player.mount'))fail('did not mount');
const v0=run('Math.hypot(player.vx,player.vy)');for(let i=0;i<20;i++)step();const v1=run('Math.hypot(player.vx,player.vy)');
if(v1<run('player.speed*1.5'))fail('mounted speed too low '+v1);console.log('mounted, speed',Math.round(v1));
// gallop into a foe: Cavalry Charge
run('spawnEnemy("melee");const e=enemies[enemies.length-1];e.x=player.x+90;e.y=player.y;e.hp=e.maxHp=99999;__e=e;');
let charged=false;for(let i=0;i<40;i++){step();if(!run('player.mount')){charged=true;break;}}
if(!charged)fail('no charge');const e=run('({hp:__e.hp,stun:__e.stun})');if(e.hp>=99999||!(e.stun>0))fail('charge did not hit/stun '+JSON.stringify(e));
if(run('player.mountCd')<=0)fail('no cooldown');console.log('charge ok, dmg',99999-e.hp,'steeds',run('steeds.length'));
// remount, then a hit throws the hero off
run('enemies.length=0;player.mountCd=0;player.invuln=0');for(let i=0;i<90;i++)step();if(!run('player.mount'))fail('no remount '+run('JSON.stringify({s:state,cd:player.mountCd,c:player.mountCast,x:player.x,at:player.atkTimer,sp:player.spinTime,d:player.dashTime,n:nearestFoeDist(),j:joy.dx})'));
run('player.invuln=0;damagePlayer(10,player.x+50,player.y)');if(run('player.mount'))fail('not dazed off');
// render path with horse (stub canvas)
run('player.mountCd=0;player.invuln=0');for(let i=0;i<90;i++)step();run('player.dashTime=0.1;ghosts.push({x:player.x,y:player.y,facing:0,walkPhase:1,life:0.2});render()');
console.log('mount: all checks passed');
