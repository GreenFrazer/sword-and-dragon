// ======================= GAME STATE =======================
let state = 'title'; // title | play | upgrade | gameover | paused
let wave = 1, gold = 0, kills = 0, combo = 0, comboT = 0, bestCombo = 0;
let shake = 0, hitStop = 0, slowT = 0, zoomKick = 0, flashA = 0, flashC = '#fff';
let time = 0, bannerT = 0, bannerText = '', bannerSub = '', ultReadyShown = false, suppressUlt = false;
let waveQueue = [], spawnTimer = 0, clearTimer = null, bestWave = 1;
try { bestWave = parseInt(localStorage.getItem('swordDragonBestWave') || '1', 10) || 1; } catch (e) {}

let player, enemies, props, pickups, particles, floatTexts, hazards, trees;
let projectiles, meteors, rings, novas, glows, slashes, bolts, ghosts, scorches, ambient;
const cam = { x: 0, y: 0 };
const MAXP = 650;

const UPGRADES = [
  { id: 'dmg', max: 99, icon: '⚔️', title: 'Sharpened Steel', desc: '+25% Sword Damage & +1 Sword Tier' },
  { id: 'cleave', max: 4, icon: '🌪️', title: 'Titan Reach', desc: '+22% Sword Swing Range & Spin Radius' },
  { id: 'vamp', max: 5, icon: '🩸', title: 'Vampiric Edge', desc: 'Heal +3 HP on every sword hit' },
  { id: 'lightning', max: 3, icon: '⚡', title: 'Storm Blade', desc: 'Attacks chain lightning (+1 target per level)' },
  { id: 'armor', max: 3, icon: '🛡️', title: 'Knight Plate', desc: '+45 Max HP, full heal & 15% damage reduction' },
  { id: 'swift', max: 3, icon: '👢', title: 'Windstrider Boots', desc: '+15% Move Speed & faster Dash/Spin cooldown' },
  { id: 'crit', max: 4, icon: '🎯', title: "Assassin's Eye", desc: '+12% Critical Hit chance (crits deal double)' },
  { id: 'squad', max: 3, icon: '🤝', title: 'Squad Drills', desc: 'Companions gain +25% damage and +30% health' },
  { id: 'arcane', max: 3, icon: '☄️', title: 'Arcane Surge', desc: 'Meteor Storm charges 40% faster and drops 3 more meteors' }
];

function newPlayer() {
  return {
    x: WORLD_W / 2, y: WORLD_H / 2, vx: 0, vy: 0, hp: 150, maxHp: 150, speed: 245, facing: 0, walkPhase: 0,
    atkCooldown: 0, atkRate: 0.48, atkTimer: 0, atkDuration: 0.22, atkDir: 1, range: 92, damage: 28, swordTier: 1,
    armor: 0, vamp: 0, lightning: 0, crit: 0.1, ult: 0, ultGain: 1, upg: {}, hasShield: false,
    invuln: 0, dashCd: 0, dashMaxCd: 2.2, dashTime: 0, dashVx: 0, dashVy: 0, spinCd: 0, spinMaxCd: 3.4, spinTime: 0, hitFlash: 0
  };
}

function resetGame() {
  ['gameover-modal', 'upgrade-modal', 'merchant-modal', 'pause-modal'].forEach(id => $(id).style.display = 'none');
  activeBuffs = {}; renderBuffHud();
  wave = 1; gold = 0; kills = 0; combo = 0; comboT = 0; bestCombo = 0;
  shake = hitStop = slowT = zoomKick = flashA = 0; clearTimer = null; ultReadyShown = false;
  player = initPlayerExtras(newPlayer());
  gear = { weapon: null, armor: null, trinket: null }; bossKills = 0; introT = 0; lightFlash = 0; rebuildGear();
  enemies = []; props = []; pickups = []; particles = []; floatTexts = []; hazards = [];
  projectiles = []; meteors = []; rings = []; novas = []; glows = []; slashes = []; bolts = []; ghosts = []; scorches = [];
  biomeIdx = -1; companions = []; village = null; pendingRecruit = false; villageResult = null;
  rebuildParty();
  startWave(wave); // biomeIdx = -1 forces startWave to rebuild ground + ambient
  cam.x = player.x - W / 2; cam.y = player.y - H / 2; updateCamera(1, true);
}
function startGame() {
  if (state !== 'title') return;
  initAudio(); $('title-modal').style.display = 'none'; state = 'play'; resetGame(); sfx('wave');
}
function restartGame() { initAudio(); resetGame(); state = 'play'; sfx('wave'); }

function generateEnvironment() {
  trees = [];
  for (let i = 0; i < 28; i++) {
    const tx = rand(80, WORLD_W - 80), ty = rand(90, WORLD_H - 80);
    if (Math.hypot(tx - WORLD_W / 2, ty - WORLD_H / 2) < 230) continue;
    trees.push({ x: tx, y: ty, r: rand(26, 36), sway: rand(0, 6) });
  }
}
function populateArenaProps() {
  props = []; hazards = [];
  for (let i = 0; i < 10; i++) {
    const px = rand(180, WORLD_W - 180), py = rand(180, WORLD_H - 180);
    if (Math.hypot(px - player.x, py - player.y) < 160) continue;
    props.push({ x: px, y: py, type: i % 3 === 0 ? 'tnt' : 'crate', r: 22 });
  }
  for (let i = 0; i < 4; i++) {
    const sx = rand(240, WORLD_W - 240), sy = rand(240, WORLD_H - 240);
    if (Math.hypot(sx - player.x, sy - player.y) < 180) continue;
    hazards.push({ x: sx, y: sy, r: 34, timer: Math.random() * 3 });
  }
}

function startWave(w) {
  const bi = Math.floor((w - 1) / 3) % BIOMES.length;
  if (bi !== biomeIdx) {
    biomeIdx = bi; biome = BIOMES[bi]; generateEnvironment(); buildGround(); initAmbient();
  }
  bannerSub = biome.name;
  populateArenaProps();
  pickWeather();
  if (player.g && player.g.phoenix) player.phoenixUsed = false;
  village = null; villageResult = null; pendingRecruit = false;
  onNewWaveCompanions();
  clearTimer = null; waveQueue = [];
  if (w % 3 === 0) {
    waveQueue.push('dragon');
    const adds = 3 + Math.floor(w / 3);
    for (let i = 0; i < adds; i++) waveQueue.push(i % 3 === 2 ? 'shield' : (w >= 6 && i % 2 ? 'archer' : 'grunt'));
    bannerText = 'BOSS — ' + DRAGON_SKINS[bi].name;
  } else {
    const count = 4 + w * 2;
    for (let i = 0; i < count; i++) {
      if (w >= 5 && i % 7 === 6) waveQueue.push('bomber');
      else if (w >= 3 && i % 5 === 4) waveQueue.push('archer');
      else if (w >= 2 && i % 3 === 2) waveQueue.push('shield');
      else if (w >= 2 && i % 4 === 3) waveQueue.push('brute');
      else waveQueue.push('grunt');
    }
    bannerText = 'WAVE ' + w;
    if (w % 3 === 2) {
      makeVillage(); bannerText = 'DEFEND THE VILLAGE!';
      for (let i = 0; i < 2; i++) waveQueue.push(i ? 'brute' : 'grunt');
    }
  }
  spawnTimer = 0.4; bannerT = 3; waveTotal = waveQueue.length;
}
function maxAlive() { return Math.min(10, 4 + Math.floor(wave / 2) + (village ? 1 : 0)); }

function spawnEnemy(type) {
  let ex = 100, ey = 90;
  for (let t = 0; t < 15; t++) {
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) { ex = rand(100, WORLD_W - 100); ey = 90; }
    else if (edge === 1) { ex = rand(100, WORLD_W - 100); ey = WORLD_H - 90; }
    else if (edge === 2) { ex = 90; ey = rand(100, WORLD_H - 100); }
    else { ex = WORLD_W - 90; ey = rand(100, WORLD_H - 100); }
    if (Math.hypot(ex - player.x, ey - player.y) > 340) break;
  }
  const sc = 1 + (wave - 1) * 0.14, ds = 1 + (wave - 1) * 0.05;
  const base = { x: ex, y: ey, vx: 0, vy: 0, facing: 0, walkPhase: 0, hasShield: false, windup: 0, atkCd: 0, hitFlash: 0, stun: 0 };
  let en;
  if (type === 'dragon') {
    const hp = Math.round(1300 * (1 + (wave / 3 - 1) * 0.7) * dragonPowerMul());
    en = { ...base, type, hp, maxHp: hp, speed: 125, r: 52, damage: 24, aiState: 'chase', aiTimer: 2.2, targetX: player.x, targetY: player.y,
      flying: false, wingPhase: 0, enraged: false, volley: 0, skin: DRAGON_SKINS[biomeIdx], tail: [] };
    for (let i = 0; i < 8; i++) en.tail.push({ x: ex - i * 15, y: ey });
    sfx('roar'); shake = 12; flash('#ff7a2a', 0.25);
  } else if (type === 'shield') {
    const hp = Math.round(135 * sc);
    en = { ...base, type, hp, maxHp: hp, speed: 112, r: 22, damage: Math.round(15 * ds), hasShield: true, shieldHits: 0, maxShieldHits: 3 };
  } else if (type === 'brute') {
    const hp = Math.round(145 * sc);
    en = { ...base, type, hp, maxHp: hp, speed: 105, r: 25, damage: Math.round(20 * ds) };
  } else if (type === 'archer') {
    const hp = Math.round(70 * sc);
    en = { ...base, type, hp, maxHp: hp, speed: 125, r: 18, damage: Math.round(11 * ds), aim: 0, aimAng: 0, dir: Math.random() < 0.5 ? 1 : -1, atkCd: rand(0.5, 1.6) };
  } else if (type === 'bomber') {
    const hp = Math.round(55 * sc);
    en = { ...base, type, hp, maxHp: hp, speed: 185, r: 17, damage: Math.round(28 * ds), fuse: 0, exploded: false };
  } else {
    const hp = Math.round(85 * sc);
    en = { ...base, type: 'grunt', hp, maxHp: hp, speed: 138, r: 20, damage: Math.round(13 * ds) };
  }
  if (type !== 'dragon' && wave >= 3 && Math.random() < Math.min(0.2, 0.04 + wave * 0.012)) makeElite(en);
  if (type === 'dragon') introT = 2.8;
  enemies.push(en);
  spawnBurst(ex, ey - 10, '#c9a227', 10, 'spark');
}
function forEachEnemy(fn) { for (const e of [...enemies]) if (enemies.includes(e)) fn(e); }

// ======================= SKILLS =======================
function triggerDash() {
  if (state !== 'play' || player.dashCd > 0) return;
  const inp = getInput();
  const dir = inp.mag > 0.15 ? Math.atan2(inp.iy, inp.ix) : player.facing;
  player.facing = dir; player.dashCd = player.dashMaxCd; player.dashTime = 0.18;
  player.invuln = Math.max(player.invuln, 0.3);
  player.dashVx = Math.cos(dir) * 680; player.dashVy = Math.sin(dir) * 680;
  if (gM().warp) { player.warpT = 1.2; addRing(player.x, player.y, 120, '#ffd76a', 0.5, 4); } // Hourglass legendary: foes and their shots slow down
  addRing(player.x, player.y, 70, '#74c0fc', 0.3, 5);
  spawnBurst(player.x, player.y, '#74c0fc', 12); sfx('dash');
}
function triggerSpin() {
  if (state !== 'play' || player.spinCd > 0) return;
  player.spinCd = player.spinMaxCd; player.spinTime = 0.34; shake = 7;
  const R = player.range * 1.45, base = Math.round(atkDmg() * 1.55);
  let hits = 0;
  forEachEnemy(e => {
    if (e.flying) return;
    if (Math.hypot(e.x - player.x, e.y - player.y) <= R + e.r) {
      hits++;
      if (e.hasShield) {
        e.hasShield = false; e.stun = 1.1;
        addFloatText(e.x, e.y - 38, 'SHIELD SHATTERED!', '#ffd43b'); spawnBurst(e.x, e.y, '#adb5bd', 14);
      }
      const crit = Math.random() < critCh();
      damageEnemy(e, Math.round(base * (crit ? 2 : 1)), Math.atan2(e.y - player.y, e.x - player.x), 340, true, crit);
    }
  });
  if (hits > 0) healPlayer(vampAmt());
  checkPropsInRadius(player.x, player.y, R);
  deflectProjectiles(player.x, player.y, R + 20);
  addRing(player.x, player.y, R, '#ffe066', 0.4, 9);
  glows.push({ x: player.x, y: player.y - 14, r: R * 1.1, life: 0.3, maxLife: 0.3, color: '#ffe066' });
  sfx('spin');
}
// Dragons toughen up against offence-heavy builds so a strong build still gets a real fight.
function dragonPowerMul() {
  const u = player.upg || {}, evos = Object.keys(player.evo || {}).length;
  return 1 + 0.2 * (u.dmg || 0) + 0.15 * (u.arcane || 0) + 0.1 * (u.crit || 0) + 0.35 * evos + 0.05 * (u.lightning || 0);
}
let stormId = 0;
function triggerUlt() {
  if (state !== 'play' || player.ult < 100) return;
  player.ult = 0; ultReadyShown = false;
  const n = (10 + 3 * (player.upg.arcane || 0)) * (player.evo && player.evo.comet ? 2 : 1), dmg = Math.round(60 + atkDmg() * 1.4);
  const targets = enemies.filter(e => !e.flying); stormId++;
  for (let i = 0; i < n; i++) {
    let x, y;
    if (targets.length) { const t = targets[i % targets.length]; x = t.x + rand(-60, 60); y = t.y + rand(-40, 40); }
    else { x = player.x + rand(-300, 300); y = player.y + rand(-220, 220); }
    x = Math.max(60, Math.min(WORLD_W - 60, x)); y = Math.max(70, Math.min(WORLD_H - 60, y));
    const d = 0.55 + i * 0.11;
    meteors.push({ x, y, delay: d, total: d, dmg, r: 105, trail: 0, storm: stormId });
  }
  sfx('ult'); flash('#ffb347', 0.4); shake = 12; zoomKick = 0.06;
  addFloatText(player.x, player.y - 70, 'METEOR STORM!', '#ffb347', 22);
}
function gainUlt(n) {
  if (suppressUlt) return;
  player.ult = Math.min(100, player.ult + n * player.ultGain * (1 + gM().ult) * (player.evo && player.evo.comet ? 1.5 : 1) * (enemies.some(e => e.type === 'dragon') ? 0.5 : 1));
  if (player.ult >= 100 && !ultReadyShown) {
    ultReadyShown = true; sfx('ready'); addFloatText(player.x, player.y - 70, 'METEOR READY! [Q]', '#ffd43b', 18);
  }
}
function healPlayer(n) { if (n > 0) player.hp = Math.min(player.maxHp, player.hp + n); }

// ======================= PROPS / EXPLOSIONS =======================
function checkPropsInRadius(cx, cy, rad) {
  for (let i = props.length - 1; i >= 0; i--) {
    const p = props[i];
    if (p.fuse === undefined && Math.hypot(p.x - cx, p.y - cy) <= rad + p.r) destroyProp(i);
  }
}
function explosionFx(x, y, r, color, big) {
  addRing(x, y, r * 1.15, color, 0.45, 9);
  glows.push({ x, y: y - 10, r: r * 1.9, life: 0.45, maxLife: 0.45, color });
  spawnBurst(x, y - 8, color, big ? 34 : 22, 'spark'); spawnBurst(x, y - 8, '#ffd43b', 14, 'ember');
  spawnSmoke(x, y - 10, big ? 10 : 6);
  scorches.push({ x, y, r: r * 0.5, life: 14 }); if (scorches.length > 30) scorches.shift();
  shake = Math.max(shake, big ? 14 : 9); sfx('boom');
}
function destroyProp(idx) {
  const p = props[idx]; props.splice(idx, 1);
  if (p.type === 'tnt') {
    explosionFx(p.x, p.y, 175, '#ff922b', true);
    addFloatText(p.x, p.y - 30, 'BOOM!', '#ff922b', 20);
    forEachEnemy(e => {
      if (!e.flying && Math.hypot(e.x - p.x, e.y - p.y) <= 175 + e.r) {
        e.hasShield = false; damageEnemy(e, 95, Math.atan2(e.y - p.y, e.x - p.x), 420, true);
      }
    });
    for (const o of props) if (o.type === 'tnt' && o.fuse === undefined && Math.hypot(o.x - p.x, o.y - p.y) < 175) o.fuse = 0.25;
  } else {
    spawnBurst(p.x, p.y - 10, '#b08968', 14, 'dot');
    const roll = Math.random();
    if (roll < 0.45) pickups.push({ x: p.x, y: p.y, type: 'potion', bob: 0 });
    else if (roll < 0.72) pickups.push({ x: p.x, y: p.y, type: 'sword', bob: 0 });
    else pickups.push({ x: p.x, y: p.y, type: 'gold', val: 15, bob: 0 });
  }
}

// ======================= DAMAGE =======================
function damageEnemy(e, amount, angle, knockback, bypassShield, crit, src) {
  if (e.flying) return false;
  let dmg = amount;
  if (e.hasShield && !bypassShield) {
    const from = Math.atan2((src ? src.y : player.y) - e.y, (src ? src.x : player.x) - e.x);
    if (Math.abs(normalizeAngle(from - e.facing)) < 1.15) {
      e.shieldHits++; e.hitFlash = 0.14;
      e.vx += Math.cos(angle) * knockback * 0.45; e.vy += Math.sin(angle) * knockback * 0.45;
      spawnBurst(e.x + Math.cos(e.facing) * 16, e.y - 20 + Math.sin(e.facing) * 16, '#dee2e6', 8, 'spark'); sfx('block');
      if (e.shieldHits >= e.maxShieldHits) {
        e.hasShield = false; e.stun = 1.2; addFloatText(e.x, e.y - 40, 'SHIELD BROKEN!', '#ffd43b'); shake = 6; gainUlt(4);
      } else {
        const chip = Math.max(6, Math.round(amount * 0.35)); e.hp -= chip;
        addFloatText(e.x, e.y - 32, `BLOCK (${chip})`, '#ced4da'); gainUlt(1);
      }
      if (e.hp <= 0) killEnemy(e);
      return true;
    }
    dmg = Math.round(amount * 1.35); addFloatText(e.x, e.y - 44, 'FLANK CRIT!', '#ffa94d');
  }
  if (e.type === 'dragon' && e.aiState === 'recover') dmg = Math.round(dmg * 1.45);
  if (player.g && player.g.exec && e.hp < e.maxHp * 0.3) dmg = Math.round(dmg * 1.5);
  if (e.barrier > 0) { const ab = Math.min(e.barrier, dmg); e.barrier -= ab; dmg -= ab; e.hitFlash = 0.1; spawnBurst(e.x, e.y - 30, '#d0bfff', 6, 'spark'); if (e.barrier <= 0) addFloatText(e.x, e.y - 50, 'BARRIER DOWN', '#d0bfff', 14); if (dmg <= 0) return true; }
  e.hp -= dmg; e.hitFlash = 0.16;
  const kb = e.type === 'dragon' ? 0.12 : (e.type === 'brute' ? 0.55 : 1);
  e.vx += Math.cos(angle) * knockback * kb; e.vy += Math.sin(angle) * knockback * kb;
  spawnBurst(e.x, e.y - 22, crit ? '#ffd43b' : '#ff4d4d', crit ? 14 : 8, 'spark');
  spawnBurst(e.x, e.y - 20, '#ff4d4d', 4, 'dot');
  if (crit) { addRing(e.x, e.y - 20, 40, '#ffd43b', 0.25, 4); sfx('crit'); } else sfx('hit');
  addFloatText(e.x, e.y - 30, crit ? `-${dmg}!` : `-${dmg}`, crit ? '#ffd43b' : '#fff', crit ? 24 : 16);
  gainUlt(crit ? 4 : 2.2);
  if (e.hp <= 0) killEnemy(e);
  return true;
}

function killEnemy(e) {
  const idx = enemies.indexOf(e); if (idx === -1) return;
  enemies.splice(idx, 1);
  kills++; combo++; comboT = 3.2; bestCombo = Math.max(bestCombo, combo);
  if (combo % 5 === 0) { addFloatText(player.x, player.y - 80, `${combo} COMBO!`, '#ffa94d', 22); gainUlt(5); }
  spawnBurst(e.x, e.y - 18, '#ff8787', 18, 'spark'); spawnBurst(e.x, e.y - 14, '#ff8787', 6, 'dot');
  scorches.push({ x: e.x, y: e.y, r: 14, life: 8, blood: true }); if (scorches.length > 30) scorches.shift();
  shake = Math.max(shake, e.type === 'dragon' ? 20 : 4);
  gainUlt(e.type === 'dragon' ? 0 : 3);
  const mult = (1 + Math.min(combo, 20) * 0.05) * goldMul();
  const coin = Math.round((e.type === 'dragon' ? 100 : (e.type === 'brute' || e.type === 'shield' ? 20 : (e.type === 'archer' || e.type === 'bomber' ? 15 : 10))) * mult);
  pickups.push({ x: e.x, y: e.y, type: 'gold', val: coin, bob: 0 });
  if (Math.random() < 0.25 || e.type === 'dragon') pickups.push({ x: e.x + 22, y: e.y, type: 'potion', bob: 1 });
  if (e.elite) {
    spawnLoot(e.x - 20, e.y + 8, 0.45); addFloatText(e.x, e.y - 70, e.eName + ' SLAIN', ELITE_AFFIX[e.eAff].col, 16);
    if (e.eAff === 'explosive' && !e.exploded) { e.exploded = true; explosionFx(e.x, e.y, 120, '#ff922b', false); if (Math.hypot(player.x - e.x, player.y - e.y) < 128) damagePlayer(e.damage, e.x, e.y); hurtAllies(e.x, e.y, 120, e.damage); }
  } else if (e.type !== 'dragon' && Math.random() < 0.035 * (1 + gM().luck)) spawnLoot(e.x - 16, e.y + 8, 0);
  if (player.evo && player.evo.aegis) { healPlayer(Math.round(player.maxHp * 0.06)); player.barrier = 1.5; }
  if (e.type === 'dragon') { bossKills++; spawnLoot(e.x - 40, e.y + 14, 1); spawnLoot(e.x + 40, e.y + 14, 0.8); }
  if (e.type === 'bomber' && !e.exploded) {
    e.exploded = true; explosionFx(e.x, e.y, 110, '#ff922b', false);
    if (Math.hypot(player.x - e.x, player.y - e.y) < 118) damagePlayer(e.damage, e.x, e.y);
    hurtAllies(e.x, e.y, 112, e.damage);
    forEachEnemy(o => { if (!o.flying && Math.hypot(o.x - e.x, o.y - e.y) < 110 + o.r) damageEnemy(o, 45, Math.atan2(o.y - e.y, o.x - e.x), 260, true); });
  }
  if (e.type === 'dragon') {
    pickups.push({ x: e.x - 24, y: e.y, type: 'sword', bob: 0.5 });
    slowT = 1.3; flash('#ffffff', 0.7); zoomKick = 0.1; sfx('death');
    for (let i = 0; i < 5; i++) { explosionFx(e.x + rand(-60, 60), e.y + rand(-40, 20), 120, e.skin.glow, true); }
    addFloatText(e.x, e.y - 90, 'DRAGON SLAIN!', '#ffd43b', 28);
    waveQueue.length = 0;
    forEachEnemy(o => { o.exploded = true; o.hp = 0; killEnemy(o); });
    projectiles.length = 0; novas.length = 0;
  }
}

function damagePlayer(amount, fromX, fromY) {
  if (player.invuln > 0 || state !== 'play') return;
  let dmg = Math.max(4, Math.round(amount * Math.max(0.15, 1 - player.armor - gM().dr - (hasBuff('salve') ? 0.2 : 0)) * (player.barrier > 0 ? 0.5 : 1)));
  player.hp -= dmg; player.invuln = 0.65; player.hitFlash = 0.2; shake = 10; flash('#ff2a2a', 0.28);
  combo = Math.floor(combo / 2);
  const ang = Math.atan2(player.y - fromY, player.x - fromX);
  player.vx += Math.cos(ang) * 260; player.vy += Math.sin(ang) * 260;
  spawnBurst(player.x, player.y - 24, '#ff2a2a', 14, 'spark'); sfx('hurt');
  addFloatText(player.x, player.y - 46, `-${dmg}`, '#ff6b6b', 20);
  if (player.hp <= 0 && player.g && player.g.phoenix && !player.phoenixUsed) {
    player.phoenixUsed = true; player.hp = Math.round(player.maxHp * 0.5); player.invuln = 2;
    addFloatText(player.x, player.y - 80, 'PHOENIX HEART!', '#ff922b', 24); flash('#ff922b', 0.6); explosionFx(player.x, player.y, 150, '#ff922b', true); return;
  }
  if (player.hp <= 0 && meta.wind && !player.windUsed) {
    player.windUsed = true; player.hp = Math.round(player.maxHp * 0.4); player.invuln = 2;
    addFloatText(player.x, player.y - 80, 'SECOND WIND!', '#69db7c', 24); flash('#69db7c', 0.5); addRing(player.x, player.y, 160, '#69db7c', 0.6, 8); return;
  }
  if (player.hp <= 0) {
    player.hp = 0; state = 'gameover'; sfx('death');
    const earned = Math.floor(wave * 8 + kills * 0.4 + bossKills * 40); meta.embers += earned; saveMeta(); $('go-code').value = metaCode(); $('go-copy').textContent = 'COPY SAVE CODE'; $('forge-btn').textContent = 'SPEND ' + meta.embers + ' EMBERS AT THE FORGE';
    if (wave > bestWave) { bestWave = wave; try { localStorage.setItem('swordDragonBestWave', String(bestWave)); } catch (e) {} }
    $('gameover-stats').textContent = `Wave ${wave} • ${kills} foes slain • ${gold} gold • best combo ${bestCombo} • best wave ${bestWave} • 🔥 +${earned} embers`;
    $('gameover-modal').style.display = 'flex';
  }
}
function cashOutRun() {
  if (!player || state === 'gameover' || kills < 1) return;
  const earned = Math.floor(wave * 8 + kills * 0.4 + bossKills * 40);
  meta.embers += earned; saveMeta();
  if (wave > bestWave) { bestWave = wave; try { localStorage.setItem('swordDragonBestWave', String(bestWave)); } catch (e) {} }
}
function normalizeAngle(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }

// ======================= EFFECT HELPERS =======================
function flash(c, a) { flashC = c; flashA = Math.max(flashA, a); }
function addRing(x, y, maxR, color, life, w) { rings.push({ x, y, maxR, color, life, maxLife: life, w: w || 6 }); }
function spawnBurst(x, y, color, count, kind) {
  for (let i = 0; i < count; i++) {
    if (particles.length > MAXP) return;
    const a = Math.random() * TAU, sp = 60 + Math.random() * 220;
    const k = kind || (Math.random() < 0.45 ? 'spark' : 'dot');
    const life = k === 'spark' ? rand(0.2, 0.42) : rand(0.35, 0.6);
    particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (k === 'ember' ? 60 : 0), life, maxLife: life, color, size: rand(3, 6.5), kind: k, g: k === 'dot' ? 280 : (k === 'ember' ? -30 : 0) });
  }
}
function spawnSmoke(x, y, n) {
  for (let i = 0; i < n; i++) {
    if (particles.length > MAXP) return;
    const life = rand(0.7, 1.2);
    particles.push({ x: x + rand(-14, 14), y: y + rand(-8, 8), vx: rand(-25, 25), vy: rand(-55, -20), life, maxLife: life, color: '#3b3b3b', size: rand(10, 18), kind: 'smoke', g: 0 });
  }
}
function addFloatText(x, y, text, color, size) { floatTexts.push({ x, y, text, color, size: size || 16, life: 0.95 }); }
function addBolt(x1, y1, x2, y2) { bolts.push({ x1, y1, x2, y2, life: 0.2, maxLife: 0.2, seed: Math.random() * 99 }); sfx('zap'); }

// ======================= PROJECTILES =======================
function shootProjectile(kind, x, y, ang, speed, dmg, life, r) {
  projectiles.push({ kind, x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, dmg, life, r, friendly: false, ang });
}
function deflectProjectiles(cx, cy, rad) {
  for (const p of projectiles) {
    if (p.friendly || Math.hypot(p.x - cx, p.y - cy) > rad) continue;
    let tgt = null, bd = 1e9;
    for (const e of enemies) if (!e.flying) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; tgt = e; } }
    const a = tgt ? Math.atan2(tgt.y - p.y, tgt.x - p.x) : p.ang + Math.PI;
    const sp = Math.hypot(p.vx, p.vy) * 1.3;
    p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.ang = a; p.friendly = true; p.life = 2;
    p.dmg = Math.round(player.damage * 1.2);
    spawnBurst(p.x, p.y - 20, '#ffffff', 8, 'spark'); sfx('block'); gainUlt(3);
    addFloatText(p.x, p.y - 40, 'REFLECT!', '#74c0fc', 14);
  }
}

// ======================= UPGRADES & SHOP =======================
var activeBuffs = {};
const hasBuff = id => !!(activeBuffs[id] > 0);
const BUFFS = {
  brew:  { icon: '🍺', name: "Berserker Brew", desc: '+25% damage', waves: 2, cost: 60, per: 8 },
  tonic: { icon: '💨', name: 'Fleetfoot Tonic', desc: '+20% move speed', waves: 2, cost: 40, per: 6 },
  salve: { icon: '🛡️', name: 'Ironhide Salve', desc: '-20% damage taken', waves: 2, cost: 55, per: 7 },
  charm: { icon: '🍀', name: 'Lucky Charm', desc: '+50% gold from kills', waves: 2, cost: 35, per: 5 },
  mark:  { icon: '🎯', name: "Hunter's Mark", desc: '+15% crit chance', waves: 2, cost: 50, per: 7 }
};
const HIRES = {
  squire: { name: 'Hired Sellsword', cost: 90, per: 12 },
  ranger: { name: 'Hired Archer', cost: 80, per: 10 },
  cleric: { name: 'Hired Healer', cost: 85, per: 10 }
};
const HIRE_WAVES = 3;
function renderBuffHud() {
  const parts = [];
  for (const id in BUFFS) if (hasBuff(id)) parts.push(`<div class="buff-chip">${BUFFS[id].icon} ${BUFFS[id].name} · ${activeBuffs[id]}w</div>`);
  $('buff-hud').innerHTML = parts.join('');
}
function tickWaveTimers() {
  for (const id in activeBuffs) {
    if (activeBuffs[id] > 0 && --activeBuffs[id] <= 0) { delete activeBuffs[id]; addFloatText(player.x, player.y - 70, `${BUFFS[id].name} faded`, '#adb5bd', 16); }
  }
  let gone = false;
  companions = companions.filter(c => {
    if (!c.hired) return true;
    if (--c.wavesLeft > 0) return true;
    spawnBurst(c.x, c.y - 20, '#ffd43b', 14, 'ember'); addFloatText(c.x, c.y - 60, `${c.name} departs`, '#ffd43b', 16); gone = true; return false;
  });
  if (gone) { companions.forEach((c, i) => c.slot = i); rebuildParty(); }
  renderBuffHud();
}
function renderShop() {
  const box = $('shop-box'); $('shop-gold').textContent = gold; box.innerHTML = '';
  const sections = [
    ['HIRE A SWORD · ' + HIRE_WAVES + ' WAVES', Object.keys(HIRES).map(k => { const h = HIRES[k], t = CTYPES[k];
      return { label: `${t.icon} ${h.name}`, desc: `${t.desc} (${HIRE_WAVES} waves)`, cost: h.cost + wave * h.per, ok: () => companions.length < 3,
        fn: () => { recruitCompanion(k, { hired: true, name: h.name.replace('Hired ', ''), wavesLeft: HIRE_WAVES }); } }; })],
    ['BREWS & CHARMS · 2 WAVES', Object.keys(BUFFS).map(k => { const b = BUFFS[k];
      return { label: `${b.icon} ${b.name}`, desc: b.desc + (hasBuff(k) ? ` (refresh: ${activeBuffs[k]}w left)` : ` (${b.waves} waves)`), cost: b.cost + wave * b.per, ok: () => true,
        fn: () => { activeBuffs[k] = b.waves; renderBuffHud(); } }; })],
    ['SUPPLIES', [
      { label: '🧪 Healing Draught', desc: 'Heal 50% HP', cost: 30 + wave * 5, ok: () => player.hp < player.maxHp, fn: () => healPlayer(Math.round(player.maxHp * 0.5)) },
      { label: '🩹 Field Medic', desc: 'Heal & revive all companions', cost: 35 + wave * 4, ok: () => companions.some(c => c.down || c.hp < c.maxHp), fn: () => { for (const c of companions) { c.down = false; c.hp = c.maxHp; c.invuln = 1; } } }
    ]]
  ];
  sections.forEach(([title, items]) => {
    const h = document.createElement('div'); h.className = 'shop-sec'; h.textContent = title; box.appendChild(h);
    const row = document.createElement('div'); row.className = 'shop-row'; box.appendChild(row);
    items.forEach(it => {
      const b = document.createElement('button'); b.className = 'shop-btn';
      b.disabled = gold < it.cost || !it.ok();
      b.innerHTML = `${it.label}<br><small>${it.desc} · ${it.cost}G</small>`;
      b.onclick = ev => { if (ev) ev.stopPropagation(); if (gold < it.cost || !it.ok()) return; gold -= it.cost; it.fn(); sfx('coin'); renderShop(); };
      row.appendChild(b);
    });
  });
}
function openMerchant() { renderShop(); $('merchant-modal').style.display = 'flex'; }
function closeMerchant() {
  if ($('merchant-modal').style.display === 'none') return;
  $('merchant-modal').style.display = 'none'; wave++; state = 'play'; startWave(wave); sfx('wave');
}
$('merchant-go').addEventListener('click', closeMerchant);
function applyUpgrade(id) {
  player.upg[id] = (player.upg[id] || 0) + 1;
  if (id === 'dmg') { player.damage = Math.round(player.damage * 1.25); player.swordTier++; }
  if (id === 'cleave') player.range = Math.round(player.range * 1.22);
  if (id === 'vamp') player.vamp += 3;
  if (id === 'lightning') player.lightning++;
  if (id === 'armor') { player.maxHp += 45; player.hp = player.maxHp; player.armor = Math.min(0.5, player.armor + 0.15); }
  if (id === 'swift') { player.speed = Math.round(player.speed * 1.15); player.dashMaxCd *= 0.8; player.spinMaxCd *= 0.8; }
  if (id === 'crit') player.crit = Math.min(0.7, player.crit + 0.12);
  if (id === 'arcane') player.ultGain *= 1.4;
  if (id === 'squad') for (const c of companions) { const old = c.maxHp; c.maxHp = compMaxHp(c); if (!c.down) c.hp += c.maxHp - old; }
}
function togglePause() {
  if (state === 'play') { state = 'paused'; $('pause-modal').style.display = 'flex'; }
  else if (state === 'paused') { state = 'play'; $('pause-modal').style.display = 'none'; }
}
