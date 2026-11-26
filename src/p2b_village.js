// ======================= VILLAGE DEFENCE & COMPANIONS =======================
let village = null, companions = [], pendingRecruit = false, villageResult = null;

const CTYPES = {
  squire: { name: 'Squire', hp: 150, dmg: 17, speed: 178, r: 20, atk: 0.75, icon: '🛡️', desc: 'Tanky melee guardian. Draws enemy attention.' },
  ranger: { name: 'Ranger', hp: 85, dmg: 15, speed: 168, r: 17, atk: 0.95, icon: '🏹', desc: 'Fires arrows from range. Fragile — keep her alive.' },
  elf: { name: 'Elf Archer', hp: 78, dmg: 14, speed: 186, r: 17, atk: 0.5, icon: '🧝', hireOnly: true, desc: 'Swift elven bowmistress. Looses fast, fast arrows from range.' },
  cleric: { name: 'Cleric', hp: 100, dmg: 9, speed: 162, r: 17, atk: 1.3, icon: '✨', desc: 'Heals you and your allies every few seconds.' }
};
const FORMATION = [[-70, 46], [72, 50], [0, -62]];

function squadLvl() { return player.upg.squad || 0; }
function compMaxHp(c) { return Math.round(CTYPES[c.type].hp * (1 + 0.07 * (c.lvl - 1)) * (1 + 0.3 * squadLvl())); }
function compDmg(c) { return Math.round(CTYPES[c.type].dmg * (1 + 0.06 * (c.lvl - 1)) * (1 + 0.25 * squadLvl()) * (player.evo && player.evo.legion ? 1.5 : 1)); }

const NAMES_F = ['Mira', 'Elara', 'Brynn', 'Isolde', 'Tamsin', 'Wren', 'Freya', 'Sable', 'Rowan', 'Ysolde'];
const NAMES_M = ['Aldric', 'Bram', 'Cedric', 'Dunstan', 'Edric', 'Garrick', 'Hale', 'Osric', 'Tobin', 'Wulf'];
function recruitCompanion(type, opts) {
  const t = CTYPES[type];
  const fem = type === 'elf' ? true : Math.random() < 0.5, pool = fem ? NAMES_F : NAMES_M;
  const role = (opts && opts.name) || t.name;
  const c = { ally: true, type, fem, name: pool[Math.floor(Math.random() * pool.length)] + ' the ' + role, x: player.x + rand(-50, 50), y: player.y + 40, vx: 0, vy: 0, facing: 0, walkPhase: 0, r: t.r,
    lvl: wave, hp: 1, maxHp: 1, down: false, invuln: 0, hitFlash: 0, atkCd: 0.5, aim: 0, healCd: 2, rev: 0, windup: 0, hasShield: type === 'squire', stun: 0, slot: companions.length, gx: 0, gy: 0 };
  if (opts) Object.assign(c, opts, { name: c.name });
  c.maxHp = compMaxHp(c); c.hp = c.maxHp;
  companions.push(c);
  spawnBurst(c.x, c.y - 20, '#69db7c', 16, 'ember'); addRing(c.x, c.y, 60, '#69db7c', 0.4, 5);
  addFloatText(c.x, c.y - 60, `${c.name} joins!`, '#69db7c', 20); sfx('upgrade');
  rebuildParty();
}
function reviveCompanion(c, frac) {
  c.down = false; c.hp = Math.max(1, Math.round(c.maxHp * frac)); c.rev = 0; c.invuln = 1;
  c.x = c.gx || c.x; c.y = c.gy || c.y;
  spawnBurst(c.x, c.y - 20, '#b2f2bb', 16, 'ember'); addRing(c.x, c.y, 70, '#69db7c', 0.45, 6);
  addFloatText(c.x, c.y - 60, `${c.name} rises!`, '#69db7c', 18); sfx('potion');
}
function onNewWaveCompanions() {
  for (const c of companions) {
    c.lvl = Math.max(c.lvl, wave);
    const ratio = c.down ? 0.6 : c.hp / c.maxHp; c.maxHp = compMaxHp(c);
    if (c.down) { c.down = false; c.hp = Math.round(c.maxHp * 0.6); c.x = player.x + rand(-60, 60); c.y = player.y + 50; c.invuln = 1.5; spawnBurst(c.x, c.y - 20, '#b2f2bb', 12, 'ember'); }
    else c.hp = Math.min(c.maxHp, Math.max(c.hp, Math.round(c.maxHp * Math.min(1, ratio + 0.15))));
  }
}

// ---------- village ----------
var raidN = 0;
function townSites(n) {
  const far = (x, y) => Math.hypot(x - player.x, y - player.y) > 430;
  const rnd = () => ({ x: rand(520, WORLD_W - 520), y: rand(460, WORLD_H - 460) });
  if (n < 2) { let a = rnd(); for (let i = 0; i < 40 && !far(a.x, a.y); i++) a = rnd(); return [a]; }
  // two towns on opposite sides of the map, retried until they are clearly apart and neither is on top of the player
  const flip = Math.random() < 0.5;
  let best = null, bs = -1;
  for (let i = 0; i < 300; i++) {
    let a = { x: rand(520, 780), y: rand(460, WORLD_H - 460) }, b = { x: rand(WORLD_W - 780, WORLD_W - 520), y: rand(460, WORLD_H - 460) };
    if (flip) { const t = a; a = b; b = t; }
    // separation comes first (a pair under 620 apart never beats one over it), then keeping clear of the player, then distance
    const d = Math.hypot(a.x - b.x, a.y - b.y), sc = (d >= 620 ? 10000 : 0) + (far(a.x, a.y) ? 1000 : 0) + (far(b.x, b.y) ? 1000 : 0) + d;
    if (sc > bs) { bs = sc; best = [a, b]; }
    if (d > 650 && far(a.x, a.y) && far(b.x, b.y)) return [a, b];
  }
  return best;
}
function makeVillage() {
  const two = wave >= 5; // wave 2 stays a single, gentler village
  const sites = townSites(two ? 2 : 1);
  const hp = Math.round(170 + wave * 16);
  const layouts = [[[-88, -34], [88, -34], [0, 72]], [[-62, -10], [62, -10]]];
  village = { x: sites[0].x, y: sites[0].y, lost: false, towns: [], houses: [], villagers: [] };
  const cols = ['#f06595', '#ffa94d', '#74c0fc', '#b197fc', '#69db7c'];
  sites.forEach((s, ti) => {
    const town = { x: s.x, y: s.y, idx: ti, lost: false, houses: [], villagers: [] };
    layouts[ti].forEach((o, i) => town.houses.push({ x: s.x + o[0], y: s.y + o[1], hp, maxHp: hp, r: 38, dead: false, hitFlash: 0, fireT: 0, v: ti ? i + 1 : i, town: ti }));
    const nv = ti ? 3 : 5;
    for (let i = 0; i < nv; i++) { const x = s.x + rand(-80, 80), y = s.y + rand(-4, 56); town.villagers.push({ x, y, hx: x, hy: y, ph: rand(0, 6), col: cols[(i + ti * 2) % 5], carry: 0, tgt: null, moving: false, t: town }); }
    village.towns.push(town); village.houses.push(...town.houses); village.villagers.push(...town.villagers);
    trees = trees.filter(t => Math.hypot(t.x - s.x, t.y - s.y) > 200);
    props = props.filter(p => Math.hypot(p.x - s.x, p.y - s.y) > 210);
    hazards = hazards.filter(h => Math.hypot(h.x - s.x, h.y - s.y) > 210);
  });
  raidN = 0;
}
function townName(t) { return village && village.towns.length > 1 ? 'TOWN ' + 'AB'[t.idx] : 'THE VILLAGE'; }
function housesAlive() { return village ? village.houses.filter(h => !h.dead).length : 0; }
function damageHouse(h, dmg) {
  if (h.dead) return;
  h.hp -= dmg; h.hitFlash = 0.15;
  spawnBurst(h.x + rand(-20, 20), h.y - 30, '#d6b88a', 6, 'dot'); sfx('hit');
  if (h.hp <= 0) {
    h.dead = true; h.hp = 0;
    explosionFx(h.x, h.y, 80, '#ff922b', false);
    addFloatText(h.x, h.y - 70, 'HOUSE DESTROYED!', '#ff6b6b', 20);
    const tw = village.towns[h.town];
    if (tw && !tw.lost && tw.houses.every(x => x.dead)) { tw.lost = true; if (village.towns.length > 1 && housesAlive() > 0) { addFloatText(tw.x, tw.y - 110, `${townName(tw)} HAS FALLEN!`, '#ff6b6b', 24); flash('#ff2a2a', 0.25); sfx('death'); } }
    if (housesAlive() === 0 && !village.lost) {
      village.lost = true; flash('#ff2a2a', 0.4); sfx('death');
      addFloatText(player.x, player.y - 90, 'THE VILLAGE HAS FALLEN!', '#ff6b6b', 26);
    }
  }
}
function settleVillage() {
  villageResult = null; pendingRecruit = false;
  if (!village) return;
  const alive = housesAlive();
  if (alive > 0) {
    const bonus = alive * (35 + wave * 8); gold += bonus; villageResult = 'saved'; village.bonus = bonus;
    pendingRecruit = companions.length < 3;
    addFloatText(village.x, village.y - 110, village.towns.length > 1 ? `VILLAGES SAVED! +${bonus}G` : `VILLAGE SAVED! +${bonus}G`, '#69db7c', 26); flash('#b2f2bb', 0.2); sfx('upgrade');
    for (const v of village.villagers) spawnBurst(v.x, v.y - 20, v.col, 6, 'ember');
  } else villageResult = 'lost';
}
var REBUILD_COST = 6;
function repairHouse(h, pct) {
  if (h.dead) return;
  h.hp = Math.min(h.maxHp, h.hp + h.maxHp * pct); h.hitFlash = 0;
  spawnBurst(h.x + rand(-20, 20), h.y - 36, '#d9b27c', 6, 'spark'); sfx('chop', h.x, h.y);
  addFloatText(h.x, h.y - 70, `+${Math.round(pct * 100)}%`, '#8ce99a', 16);
}
function rebuildHouse(h) {
  h.dead = false; h.hp = Math.round(h.maxHp * 0.4); h.fireT = 0; village.lost = false; if (village.towns[h.town]) village.towns[h.town].lost = false;
  explosionFxLite(h.x, h.y);
  addFloatText(h.x, h.y - 80, 'HOUSE REBUILT!', '#8ce99a', 20); sfx('upgrade');
}
function explosionFxLite(x, y) { addRing(x, y, 70, '#d9b27c', 0.4, 6); spawnBurst(x, y - 20, '#d9b27c', 16, 'spark'); spawnBurst(x, y - 20, '#f1d9a8', 8, 'ember'); }
function enemyNear(x, y, r) { for (const e of enemies) if (Math.hypot(e.x - x, e.y - y) < r) return true; return false; }
// ---------- woodcutters' camp (every wave without a village) ----------
function makeCamp() {
  let cx = WORLD_W / 2, cy = WORLD_H / 2, best = -1;
  for (let i = 0; i < 40; i++) {
    const x = rand(320, WORLD_W - 320), y = rand(300, WORLD_H - 300);
    if (Math.hypot(x - player.x, y - player.y) < 320) continue;
    if (ponds.some(q => Math.hypot((x - q.x) / (q.rx + 70), (y - q.y) / (q.ry + 70)) < 1)) continue;
    const clear = trees.every(t => Math.hypot(t.x - x, t.y - y) > 110);
    const sc = (clear ? 1000 : 0) + Math.min(Math.hypot(x - player.x, y - player.y), 700);
    if (sc > best) { best = sc; cx = x; cy = y; }
  }
  camp = { x: cx, y: cy, workers: [] };
  const cols = ['#e8a65a', '#9ccf7a', '#7fb3e6'];
  for (let i = 0; i < 3; i++) { const x = cx + rand(-60, 60), y = cy + rand(20, 70); camp.workers.push({ x, y, hx: x, hy: y, ph: rand(0, 6), col: cols[i], carry: 0, tgt: null, moving: false, scared: false }); }
  props = props.filter(p => Math.hypot(p.x - cx, p.y - cy) > 80);
  hazards = hazards.filter(h => Math.hypot(h.x - cx, h.y - cy) > 90);
}
// the woodcutters bring their stockpile to a village wave (and to anyone who walks up to the camp)
function deliverCampStock(announce) {
  const n = Math.min(campStock, WOOD_MAX - wood);
  if (n <= 0) return;
  campStock -= n; wood += n;
  if (announce) addFloatText(player.x, player.y - 60, `Woodcutters brought ${n} 🪵`, '#d9b27c', 18);
  else addFloatText(player.x, player.y - 50, `+${n} 🪵`, '#d9b27c');
  sfx('coin');
}
function updateCamp(dt) {
  if (!camp) return;
  if (Math.hypot(camp.x - player.x, camp.y - player.y) < 90 && campStock > 0 && wood < WOOD_MAX) deliverCampStock(false);
  for (const v of camp.workers) {
    v.moving = false;
    let near = null, nd = 260;
    for (const e of enemies) { const d = Math.hypot(e.x - v.x, e.y - v.y); if (d < nd) { nd = d; near = e; } }
    v.scared = !!near;
    let tx = null, ty = null, sp = 62;
    if (near) { // run directly away from the closest enemy, staying inside the world
      const a = Math.atan2(v.y - near.y, v.x - near.x);
      tx = Math.max(60, Math.min(WORLD_W - 60, v.x + Math.cos(a) * 200)); ty = Math.max(60, Math.min(WORLD_H - 60, v.y + Math.sin(a) * 200)); sp = 125;
    } else if (v.carry > 0) {
      tx = camp.x + 36; ty = camp.y + 40;
      if (Math.hypot(tx - v.x, ty - v.y) < 14) { campStock = Math.min(CAMP_MAX, campStock + v.carry); v.carry = 0; sfx('chop', camp.x, camp.y); }
    } else {
      if (v.tgt && !pickups.includes(v.tgt)) v.tgt = null;
      if (!v.tgt) {
        let bd = 760;
        for (const pk of pickups) {
          if (pk.type !== 'wood' || pk.claim || (pk.age || 0) < 6 || Math.hypot(pk.x - player.x, pk.y - player.y) < 120) continue;
          const d = Math.hypot(pk.x - camp.x, pk.y - camp.y); if (d < bd) { bd = d; v.tgt = pk; }
        }
        if (v.tgt) v.tgt.claim = v;
      }
      if (v.tgt) {
        tx = v.tgt.x; ty = v.tgt.y;
        if (Math.hypot(tx - v.x, ty - v.y) < 16) { v.carry = Math.min(v.tgt.n, 2); v.tgt.n -= v.carry; if (v.tgt.n <= 0) pickups.splice(pickups.indexOf(v.tgt), 1); else v.tgt.claim = null; v.tgt = null; }
      } else { tx = v.hx; ty = v.hy; sp = 36; }
    }
    if (tx != null) {
      const d = Math.hypot(tx - v.x, ty - v.y);
      if (d > 5) { v.x += (tx - v.x) / d * sp * dt; v.y += (ty - v.y) / d * sp * dt; v.moving = true; }
    }
    // a worker who was sent running should not forget a claimed pile
    if (near && v.tgt) { v.tgt.claim = null; v.tgt = null; }
  }
}
// villagers fetch logs, haul them to a house and mend it; they flee to the houses when enemies close in
function updateVillagers(dt) {
  if (!village) return;
  for (const v of village.villagers) {
    let alive = v.t.houses.filter(h => !h.dead); if (!alive.length) alive = village.houses.filter(h => !h.dead);
    let tx = null, ty = null, sp = 70; v.moving = false;
    v.scared = enemyNear(v.x, v.y, 230);
    if (v.scared) { // run for the nearest house
      const h = alive.length ? alive.reduce((a, b) => Math.hypot(a.x - v.x, a.y - v.y) < Math.hypot(b.x - v.x, b.y - v.y) ? a : b) : null;
      if (h) { tx = h.x; ty = h.y + 30; sp = 110; }
    } else if (v.carry > 0) {
      const h = alive.filter(h => h.hp < h.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] || alive[0];
      if (h) {
        tx = h.x; ty = h.y + 34;
        if (Math.hypot(h.x - v.x, h.y + 34 - v.y) < 14) { if (h.hp < h.maxHp) repairHouse(h, 0.12 * v.carry); v.carry = 0; v.tgt = null; }
      } else v.carry = 0;
    } else {
      if (v.tgt && !pickups.includes(v.tgt)) v.tgt = null;
      if (!v.tgt) {
        let bd = 620;
        for (const pk of pickups) if (pk.type === 'wood' && !pk.claim) { const d = Math.hypot(pk.x - v.t.x, pk.y - v.t.y); if (d < bd) { bd = d; v.tgt = pk; } }
        if (v.tgt) v.tgt.claim = v;
      }
      if (v.tgt) {
        tx = v.tgt.x; ty = v.tgt.y;
        if (Math.hypot(tx - v.x, ty - v.y) < 16) { v.carry = Math.min(v.tgt.n, 2); v.tgt.n -= v.carry; if (v.tgt.n <= 0) pickups.splice(pickups.indexOf(v.tgt), 1); else v.tgt.claim = null; v.tgt = null; }
      } else { tx = v.hx; ty = v.hy; sp = 40; }
    }
    if (tx != null) {
      const d = Math.hypot(tx - v.x, ty - v.y);
      if (d > 5) { v.x += (tx - v.x) / d * sp * dt; v.y += (ty - v.y) / d * sp * dt; v.moving = true; v.face = tx < v.x ? -1 : 1; }
    }
  }
}
function updateVillage(dt) {
  if (!village) return;
  village.scared = village.towns.some(t => enemies.some(e => Math.hypot(e.x - t.x, e.y - t.y) < 330));
  for (const h of village.houses) {
    h.hitFlash = Math.max(0, h.hitFlash - dt);
    if (h.dead) { h.fireT -= dt; if (h.fireT <= 0) { h.fireT = 0.25; spawnSmoke(h.x + rand(-20, 20), h.y - 20, 1); if (Math.random() < 0.5 && particles.length < MAXP) particles.push({ x: h.x + rand(-24, 24), y: h.y - 14, vx: rand(-10, 10), vy: rand(-60, -30), life: 0.5, maxLife: 0.5, color: '#ff922b', size: rand(5, 9), kind: 'ember', g: 0 }); } }
  }
}

// ---------- damage to allies ----------
function damageComp(c, dmg, fx, fy) {
  if (c.down || c.invuln > 0) return;
  c.hp -= dmg; c.invuln = 0.4; c.hitFlash = 0.15;
  const a = Math.atan2(c.y - fy, c.x - fx); c.vx += Math.cos(a) * 160; c.vy += Math.sin(a) * 160;
  spawnBurst(c.x, c.y - 24, '#ff6b6b', 8, 'spark'); sfx('hit');
  addFloatText(c.x, c.y - 44, `-${dmg}`, '#ffa8a8', 15);
  if (c.hp <= 0 && player.evo && player.evo.legion && c.legionWave !== wave) {
    c.legionWave = wave; c.hp = Math.max(1, Math.round(c.maxHp * 0.5)); c.invuln = 1.5;
    spawnBurst(c.x, c.y - 20, '#ffd43b', 16, 'ember'); addRing(c.x, c.y, 70, '#ffd43b', 0.45, 6);
    addFloatText(c.x, c.y - 66, `${c.name} stands again!`, '#ffd43b', 18); sfx('potion'); return;
  }
  if (c.hp <= 0) {
    c.hp = 0; c.down = true; c.rev = 0; c.gx = c.x; c.gy = c.y;
    addFloatText(c.x, c.y - 66, `${c.name} fell!`, '#ff6b6b', 20); spawnBurst(c.x, c.y - 20, '#ff6b6b', 16, 'spark'); sfx('death');
  }
}
function hurtAllies(x, y, r, dmg) {
  for (const c of companions) if (!c.down && Math.hypot(c.x - x, c.y - y) <= r + c.r) damageComp(c, dmg, x, y);
  if (village) for (const h of village.houses) if (!h.dead && Math.hypot(h.x - x, h.y - y) <= r + h.r) damageHouse(h, Math.round(dmg * 1.5));
}

// ---------- enemy targeting ----------
function pickTarget(e, noHouse) {
  let best = null, bd = 1e9;
  const consider = (kind, obj, bias) => { const d = Math.hypot(obj.x - e.x, obj.y - e.y) * bias; if (d < bd) { bd = d; best = { kind, obj }; } };
  consider('player', player, 1);
  for (const c of companions) if (!c.down) consider('comp', c, c.type === 'squire' ? 0.8 : 1);
  if (village && !noHouse) for (const h of village.houses) if (!h.dead) consider('house', h, (e.type === 'bomber' ? 0.7 : 1.12) * (e.raid != null && h.town === e.raid ? 0.8 : 1));
  return best;
}
function getTarget(e, dt, noHouse) {
  e.tgtT = (e.tgtT || 0) - dt;
  const t = e.tgt;
  const ok = t && (t.kind === 'player' || (t.kind === 'comp' && !t.obj.down) || (t.kind === 'house' && !t.obj.dead && !noHouse));
  if (!ok || e.tgtT <= 0) { e.tgt = pickTarget(e, noHouse); e.tgtT = 0.5; }
  return e.tgt;
}
function targetRadius(t) { return t.kind === 'player' ? 0 : t.obj.r * 0.6; }
function strikeTarget(e, t) {
  if (t.kind === 'player') damagePlayer(e.damage, e.x, e.y);
  else if (t.kind === 'comp') damageComp(t.obj, e.damage, e.x, e.y);
  else damageHouse(t.obj, Math.round(e.damage * (e.type === 'brute' ? 1.4 : 1)));
}

// ---------- companion AI ----------
function nearestEnemyTo(x, y, maxFromPlayer) {
  let en = null, ed = 1e9;
  for (const e of enemies) {
    if (e.flying) continue;
    if (Math.hypot(e.x - player.x, e.y - player.y) > maxFromPlayer) continue;
    const d = Math.hypot(e.x - x, e.y - y); if (d < ed) { ed = d; en = e; }
  }
  return { en, ed };
}
function moveCompanion(c, tx, ty, speed, dt) {
  const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
  if (d < 2) return 0;
  const s = Math.min(d / dt, speed);
  c.x += dx / d * s * dt; c.y += dy / d * s * dt; c.walkPhase += dt * s * 0.065; c.facing = Math.atan2(dy, dx);
  return s;
}
function updateCompanion(c, dt) {
  const T = CTYPES[c.type];
  c.invuln = Math.max(0, c.invuln - dt); c.hitFlash = Math.max(0, c.hitFlash - dt); c.atkCd = Math.max(0, c.atkCd - dt);
  c.windup = Math.max(0, c.windup - dt); c.aim = Math.max(0, c.aim - dt);
  if (c.down) {
    const near = Math.hypot(player.x - c.gx, player.y - c.gy) < 66;
    c.rev = near ? c.rev + dt : Math.max(0, c.rev - dt * 0.5);
    if (c.rev >= 2.5) reviveCompanion(c, 0.4);
    return;
  }
  c.vx *= 0.82; c.vy *= 0.82; c.x += c.vx * dt; c.y += c.vy * dt;
  const speed = T.speed * (1 + 0.05 * (player.upg.swift || 0));
  const f = FORMATION[c.slot % 3], k = c.type === 'cleric' ? 1.4 : 1;
  const ax = player.x + f[0] * k, ay = player.y + f[1] * k;
  if (Math.hypot(c.x - player.x, c.y - player.y) > 700) { c.x = ax; c.y = ay; spawnBurst(c.x, c.y - 20, '#b2f2bb', 8, 'ember'); }
  const { en, ed } = nearestEnemyTo(c.x, c.y, 560);

  if (c.type === 'squire') {
    if (en && ed < 520) {
      const stop = c.r + en.r + 20;
      if (ed > stop) moveCompanion(c, en.x, en.y, speed, dt);
      else {
        c.facing = Math.atan2(en.y - c.y, en.x - c.x);
        if (c.atkCd <= 0) {
          c.atkCd = T.atk; c.windup = 0.14; const dmg = compDmg(c);
          suppressUlt = true;
          forEachEnemy(o => { if (!o.flying && Math.hypot(o.x - c.x, o.y - c.y) <= c.r + o.r + 30) damageEnemy(o, dmg, Math.atan2(o.y - c.y, o.x - c.x), 170, false, false, c); });
          suppressUlt = false;
          slashes.push({ x: c.x, y: c.y - 20, ang: c.facing, dir: Math.random() < 0.5 ? 1 : -1, life: 0.16, maxLife: 0.16, R: 52, color: '#a5d8ff' });
        }
      }
    } else if (Math.hypot(c.x - ax, c.y - ay) > 34) moveCompanion(c, ax, ay, speed * 1.2, dt);
  } else if (c.type === 'ranger' || c.type === 'elf') {
    if (en && ed < 520) {
      const ang = Math.atan2(en.y - c.y, en.x - c.x);
      const elf = c.type === 'elf';
      if (ed < 170) moveCompanion(c, c.x - Math.cos(ang) * 100, c.y - Math.sin(ang) * 100, speed, dt);
      else if (ed > (elf ? 360 : 330)) moveCompanion(c, en.x, en.y, speed, dt);
      c.facing = ang;
      if (c.atkCd <= 0 && ed < (elf ? 480 : 440)) {
        c.atkCd = T.atk; c.aim = 0.2; sfx('shoot');
        shootProjectile('arrow', c.x, c.y, ang, elf ? 860 : 560, compDmg(c), elf ? 1 : 1.3, 10);
        const p = projectiles[projectiles.length - 1]; p.friendly = true; p.soft = true;
      }
    } else if (Math.hypot(c.x - ax, c.y - ay) > 34) moveCompanion(c, ax, ay, speed * 1.2, dt);
  } else { // cleric
    if (Math.hypot(c.x - ax, c.y - ay) > 40) moveCompanion(c, ax, ay, speed * 1.2, dt);
    c.healCd -= dt;
    if (c.healCd <= 0) {
      let tgt = null, br = 0.95;
      const consider = (o) => { const r = o.hp / o.maxHp; if (r < br && Math.hypot(o.x - c.x, o.y - c.y) < 330) { br = r; tgt = o; } };
      consider(player); for (const o of companions) if (!o.down) consider(o);
      if (tgt) {
        const amt = Math.round((18 + wave * 2.5) * (1 + 0.3 * squadLvl()));
        tgt.hp = Math.min(tgt.maxHp, tgt.hp + amt); c.healCd = 3.2; c.windup = 0.3;
        addRing(tgt.x, tgt.y, 55, '#69db7c', 0.4, 5); spawnBurst(tgt.x, tgt.y - 24, '#b2f2bb', 10, 'ember');
        addFloatText(tgt.x, tgt.y - 54, `+${amt}`, '#69db7c', 16); sfx('potion');
      } else c.healCd = 0.5;
    }
    if (en && ed < 230 && c.atkCd <= 0) {
      c.atkCd = T.atk; c.aim = 0.15; c.facing = Math.atan2(en.y - c.y, en.x - c.x);
      shootProjectile('fire', c.x, c.y, c.facing, 420, compDmg(c), 1, 10);
      const p = projectiles[projectiles.length - 1]; p.friendly = true; p.soft = true; p.col = '#69db7c';
    }
  }
  c.x = Math.max(45, Math.min(WORLD_W - 45, c.x)); c.y = Math.max(55, Math.min(WORLD_H - 45, c.y));
  pushOutOfTrees(c, 10);
}
function updateCompanions(dt) { for (const c of companions) updateCompanion(c, dt); }

// ---------- party HUD ----------
function rebuildParty() {
  const box = $('party'); box.innerHTML = '';
  for (const k of Object.keys(hudCache)) if (k.startsWith('pb-') || k.startsWith('pl-')) delete hudCache[k];
  companions.forEach((c, i) => {
    const row = document.createElement('div'); row.className = 'party-row';
    row.innerHTML = `<span class="pl" id="pl-${i}">${CTYPES[c.type].icon} ${c.name}</span><div class="pbw"><div class="pb" id="pb-${i}"></div></div>`;
    box.appendChild(row);
  });
}
