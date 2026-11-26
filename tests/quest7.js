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
if(run('herald'))fail('herald on wave 1');
run('wave=3;startWave(3)');if(run('herald'))fail('herald on a dragon wave');
// every quest type: accept, progress via the real game events, turn in
const ids=run('QUESTS.map(q=>q.id)');let paid=0;
for(const id of ids){
  run(`wave=4;startWave(4);enemies.length=0;spawnTimer=999;herald.def=QUESTS.find(q=>q.id==='${id}');herald.st='offer';player.x=herald.x+(herald.x<WORLD_W/2?220:-220);player.y=herald.y`);
  for(let i=0;i<5;i++)step(); if(run('herald.st')!=='offer')fail(id+' accepted from afar');
  run('player.x=herald.x+30;player.y=herald.y');for(let k=0;k<15&&run('herald.st')==='offer';k++)step();if(run('herald.st')!=='active'||!run('quest'))fail(id+' not accepted');
  const need=run('quest.need');run('player.x=herald.x+(herald.x<WORLD_W/2?300:-300);player.y=herald.y');
  const drive={slay:'spawnEnemy("grunt");killEnemy(enemies[enemies.length-1])',clean:'spawnEnemy("grunt");killEnemy(enemies[enemies.length-1])',
    archer:'spawnEnemy("archer");killEnemy(enemies[enemies.length-1])',brute:'spawnEnemy("brute");killEnemy(enemies[enemies.length-1])',
    rare:'spawnEnemy("rare");killEnemy(enemies[enemies.length-1])',
    shield:'spawnEnemy("shield");const s=enemies[enemies.length-1];s.x=player.x+40;s.y=player.y;player.spinCd=0;triggerSpin();if(enemies.includes(s))killEnemy(s)',
    timber:'fellTree(trees.find(treeAlive))',crate:'props.push({x:player.x,y:player.y,r:14,type:"crate",hp:1});destroyProp(props.length-1)',
    charge:'spawnEnemy("grunt");const c=enemies[enemies.length-1];c.x=player.x+20;c.y=player.y;player.mount=1;player.vx=500;cavalryCharge(c);killEnemy(c)',
    combo:'combo=quest.need'}[id];
  if(id==="clean"){run(`(()=>{${drive}})()`);run(`(()=>{${drive}})()`);run('player.invuln=0;player.shieldT=0;damagePlayer(5,player.x+9,player.y)');if(run('quest.prog')!==0)fail('clean not reset');run('player.hp=player.maxHp');}
  for(let k=0;k<need+2&&run('herald.st')==='active';k++){run(`(()=>{${drive}})()`);step();}
  if(run('herald.st')!=='done')fail(id+' not done: '+run('JSON.stringify(quest)'));
  const g0=run('questsDone');run('player.x=herald.x+20;player.y=herald.y');for(let k=0;k<15&&run('herald.st')!=='thanks';k++)step();
  if(run('herald.st')!=='thanks')fail(id+' not turned in '+run('JSON.stringify({st:herald.st,hx:herald.x,hy:herald.y,px:player.x,py:player.y,s:state,dash:player.dashTime,vx:player.vx})'));if(run('questsDone')!==g0+1)fail(id+' no reward');paid++;
}
console.log('quests paid:',paid,'of',ids.length,'questsDone',run('questsDone'));
// finished but not turned in: paid by courier at wave end; unfinished: failed
run('wave=4;startWave(4);acceptQuest();questDone();questWaveEnd()');if(run('questsDone')!==paid+1)fail('courier payout');
run('wave=5;startWave(5);if(herald){acceptQuest();questWaveEnd()}');if(run('quest'))fail('failed quest kept');
// natural spawn rate on eligible waves
let n=0,tw=0;for(let r=0;r<200;r++)for(const w of [2,4,5,7,8,10]){run(`wave=${w};startWave(${w})`);tw++;if(run("herald"))n++;}
console.log("herald on",n,"of",tw,"eligible waves");if(n<tw*0.95)fail('herald too rare');
run('render();updateHUD()');for(let i=0;i<10;i++)step();
console.log('quest: all checks passed');
