const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const code=html.split('<script>\n')[1].split('</script>')[0];
const W=process.argv[2]||'sword', FRAMES=+process.argv[3]||30000;
const mk=()=>new Proxy(function(){}, {get:(t,k)=>k===Symbol.toPrimitive?()=>0:(k==='width'||k==='height'?64:mk()),apply:()=>mk(),set:()=>true});
const mkEl=(canvas)=>{const el={style:{},children:[],_t:'',classList:{add(){},remove(){}},addEventListener(){},appendChild(c){el.children.push(c)},querySelectorAll(){return []},querySelector(){return el._row||(el._row=mkEl())},set innerHTML(v){el.children=[]},get innerHTML(){return ''},set textContent(v){el._t=v},get textContent(){return el._t}};if(canvas){el.getContext=()=>mk();el.width=64;el.height=64;}return el;};
const els={};const canvasIds=['game','minimap','title-bg'];
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
let errors=0,maxWave=0,merchants=0,upgrades=0,evos=0,loots=0,elites=0,casts=0;const seen=new Set();
for(let i=0;i<FRAMES;i++){
  try{
    const st=run('state');
    if(st==='upgrade'){upgrades++;const c=els['card-container'].children;if(!c.length)throw new Error('no cards');run('gold+=100');const rr=els['recruit-box']&&els['recruit-box']._row;if(rr&&rr.children.length&&run('pendingRecruit')){rr.children[0].onclick();rr.children=[];}
      // prefer evo cards
      const pick=c.find(x=>x.className&&x.className.includes("evo"));if(pick)evos++;(pick||c[0]).onclick();
      // merchant screen: buy a timed buff and a hire (when there is room), then continue to the next wave
      if(run("$('merchant-modal').style.display")!=='flex')throw new Error('merchant did not open');
      merchants++;run("gold+=500;activeBuffs.brew=2;activeBuffs.salve=2;renderBuffHud();if(companions.length<3)recruitCompanion('squire',{hired:true,name:'Sellsword',wavesLeft:3});renderShop()");
      run('closeMerchant()');}
    else if(st==='play'){
      run('player.hp=Math.max(player.hp,player.maxHp*0.5)');
      run('(()=>{const e=enemies[0];if(e){const a=Math.atan2(e.y-player.y,e.x-player.x);joy.dx=Math.cos(a);joy.dy=Math.sin(a);}})()');
      if(i%200===0)run('triggerSpin()'); if(i%150===0)run('triggerDash()'); if(i%90===0){run('triggerCast()');casts++;}
      if(i%700===0){run('player.ult=100');run('triggerUlt()');}
      if(i%400===0){run('spawnLoot(player.x+10,player.y,0.5)');loots++;}
      if(i===3000)run('player.upg.lightning=3;player.upg.crit=2;player.upg.cleave=2;player.upg.dmg=3;player.upg.vamp=3;player.upg.armor=2;player.upg.arcane=2;player.upg.swift=1');
      if(i%1500===1499&&run('wave%3!==0'))run('enemies.slice().forEach(e=>{e.exploded=true;killEnemy(e)});waveQueue.length=0');
      run('enemies.forEach(e=>{if(e.elite)__S.add(e.eAff)})'.replace('__S','__SEEN'));
    }
    step();maxWave=Math.max(maxWave,run('wave'));
  }catch(e){errors++;console.log('ERR frame',i,e.stack.split('\n').slice(0,5).join(' | '));break;}
}
console.log([...sb.__SEEN].join(','));console.log(W,{maxWave,merchants,upgrades,evos,loots,casts,errors,state:run('state'),kills:run('kills'),gear:run('JSON.stringify(Object.values(gear).map(g=>g&&g.name))'),evo:run('JSON.stringify(player.evo)'),weather:run('weather'),parts:run('particles.length')});
run('state="play";player.invuln=0;player.windUsed=true;player.phoenixUsed=true;damagePlayer(99999,0,0)');console.log('gameover',run('state'),els['gameover-stats']._t,run('meta.embers'));
run('showTitle()');console.log('title',run('state'));
