// ======================= WEAPONS / FORGE / LOOT / ELITES / EVOLUTIONS / CAST =======================
const WEAPONS = {
  sword: { name: 'Longsword', icon: '⚔️', desc: 'Balanced 360° cleave. A reliable all-rounder.', rate: 0.48, range: 92, dmg: 1.0, crit: 0.10, cone: 0, cost: 0 },
  greatsword: { name: 'Greatsword', icon: '🗡️', desc: 'Slow, enormous arcs. Hits like a falling tower.', rate: 0.80, range: 120, dmg: 1.9, crit: 0.05, cone: 0, cost: 70 },
  daggers: { name: 'Twin Daggers', icon: '🔪', desc: 'Blinding speed and huge crit chance. Short reach.', rate: 0.25, range: 72, dmg: 0.5, crit: 0.28, cone: 0, cost: 90 },
  spear: { name: 'Spear', icon: '🔱', desc: 'Long piercing thrust in a line. Keeps foes at bay.', rate: 0.52, range: 150, dmg: 1.1, crit: 0.12, cone: 0.5, cost: 90 }
};
let selectedWeapon = 'sword', bossKills = 0, waveTotal = 1;
let meta = { embers: 0, vit: 0, might: 0, fort: 0, wind: 0, unlocked: { sword: true } };
function loadMeta() {
  try { const m = JSON.parse(localStorage.getItem('swordDragonMeta') || 'null'); if (m) { meta = Object.assign(meta, m); meta.unlocked = Object.assign({ sword: true }, m.unlocked || {}); } } catch (e) {}
}
function saveMeta() { try { localStorage.setItem('swordDragonMeta', JSON.stringify(meta)); } catch (e) {} }
loadMeta();

const FORGE = [
  { id: 'vit', name: 'Vitality', desc: '+12 starting max HP', max: 5, cost: l => 40 + 30 * l },
  { id: 'might', name: 'Might', desc: '+5% damage', max: 5, cost: l => 50 + 35 * l },
  { id: 'fort', name: 'Fortune', desc: '+10% gold', max: 5, cost: l => 40 + 30 * l },
  { id: 'wind', name: 'Second Wind', desc: 'Once per run, rise at 40% HP', max: 1, cost: () => 150 }
];

// ---------- player extras ----------
function zeroG() { return { dmg: 0, crit: 0, atkspd: 0, vamp: 0, hp: 0, dr: 0, spd: 0, regen: 0, cdr: 0, gold: 0, ult: 0, luck: 0, exec: false, phoenix: false, warp: false }; }
function initPlayerExtras(p) {
  const w = WEAPONS[selectedWeapon] || WEAPONS.sword;
  p.weapon = selectedWeapon; p.atkRate = w.rate; p.range = w.range; p.damage = Math.round(28 * w.dmg); p.crit = w.crit; p.cone = w.cone;
  p.maxHp = 150 + 12 * meta.vit; p.hp = p.maxHp;
  p.cast = 3; p.castT = 0; p.g = zeroG(); p.gearHp = 0; p.barrier = 0; p.windUsed = false; p.phoenixUsed = false; p.swings = 0; p.evo = {};
  return p;
}
const gM = () => player.g || zeroG();
function atkDmg() { return Math.round(player.damage * (1 + gM().dmg + meta.might * 0.05) * (hasBuff('brew') ? 1.25 : 1)); }
function critCh() { return Math.min(0.85, player.crit + gM().crit + (hasBuff('mark') ? 0.15 : 0)); }
function vampAmt() { return player.vamp + gM().vamp; }
function cdrMul() { return 1 - gM().cdr; }
function goldMul() { return 1 + gM().gold + meta.fort * 0.1 + (hasBuff('charm') ? 0.5 : 0); }

// ---------- gear / loot ----------
let gear = { weapon: null, armor: null, trinket: null };
const SLOTS = ['weapon', 'armor', 'trinket'];
const SLOT_ICON = { weapon: '🗡️', armor: '🛡️', trinket: '📿' };
const RARITY = [{ n: 'Common', c: '#dee2e6' }, { n: 'Magic', c: '#4dabf7' }, { n: 'Rare', c: '#ffd43b' }, { n: 'Legendary', c: '#ff922b' }];
const AFFIX = {
  dmg: { label: 'Damage', base: 0.08, pct: true }, crit: { label: 'Crit Chance', base: 0.05, pct: true }, atkspd: { label: 'Attack Speed', base: 0.07, pct: true }, vamp: { label: 'Life on Hit', base: 1.5, pct: false },
  hp: { label: 'Max Health', base: 18, pct: false }, dr: { label: 'Damage Reduction', base: 0.04, pct: true }, spd: { label: 'Move Speed', base: 0.05, pct: true }, regen: { label: 'HP / sec', base: 0.8, pct: false },
  cdr: { label: 'Cooldown Reduction', base: 0.06, pct: true }, gold: { label: 'Gold Find', base: 0.1, pct: true }, ult: { label: 'Meteor Charge', base: 0.12, pct: true }, luck: { label: 'Loot Luck', base: 0.08, pct: true }
};
const SLOT_POOL = { weapon: ['dmg', 'crit', 'atkspd', 'vamp'], armor: ['hp', 'dr', 'spd', 'regen'], trinket: ['cdr', 'gold', 'ult', 'luck'] };
const LEGEND = { weapon: { id: 'exec', name: 'Executioner', desc: '+50% damage to foes below 30% HP' }, armor: { id: 'phoenix', name: 'Phoenix Heart', desc: 'Rise once per wave at 50% HP' }, trinket: { id: 'warp', name: 'Hourglass', desc: 'Dashing slows time' } };
const ITEM_NAMES = { weapon: ['Edge', 'Fang', 'Cleaver', 'Brand', 'Reaver'], armor: ['Plate', 'Mantle', 'Aegis', 'Hauberk', 'Bulwark'], trinket: ['Charm', 'Sigil', 'Amulet', 'Idol', 'Talisman'] };
const ITEM_PREFIX = ['Worn', 'Hardened', 'Gleaming', 'Runed', 'Dragonbone'];

function rollRarity(boost) {
  const luck = gM().luck, b = boost || 0;
  const pL = Math.min(0.14, 0.012 + wave * 0.004 + b * 0.1) * (1 + luck), pR = 0.1 + wave * 0.01 + b * 0.3, pM = 0.34 + b * 0.2, u = Math.random();
  if (u < pL) return 3; if (u < pL + pR) return 2; if (u < pL + pR + pM) return 1; return 0;
}
function fmtAffix(a) { const d = AFFIX[a.k]; return d.pct ? `+${Math.round(a.v * 100)}% ${d.label}` : `+${a.v} ${d.label}`; }
function makeItem(boost) {
  const slot = SLOTS[Math.floor(Math.random() * 3)], rarity = rollRarity(boost);
  const pool = [...SLOT_POOL[slot]].sort(() => Math.random() - 0.5), n = Math.min(pool.length, rarity === 3 ? 3 : rarity + 1);
  const aff = []; let power = 0;
  for (let i = 0; i < n; i++) {
    const k = pool[i], A = AFFIX[k];
    let v = A.base * (1 + wave * 0.07) * rand(0.75, 1.3) * (1 + 0.2 * rarity);
    v = A.pct ? Math.round(v * 100) / 100 : (k === 'hp' ? Math.round(v) : Math.round(v * 10) / 10);
    aff.push({ k, v }); power += v / A.base;
  }
  const nm = ITEM_NAMES[slot][Math.floor(Math.random() * 5)];
  return { slot, rarity, aff, power, legend: rarity === 3 ? LEGEND[slot] : null, name: (rarity >= 1 ? ITEM_PREFIX[Math.min(4, Math.floor(wave / 3))] + ' ' : '') + nm };
}
function itemScore(it) { return it.rarity * 40 + it.power * 10 + (it.legend ? 30 : 0); }
function spawnLoot(x, y, boost) { pickups.push({ x, y, type: 'loot', item: makeItem(boost), bob: 0 }); }
function offerItem(it) {
  const cur = gear[it.slot], col = RARITY[it.rarity].c;
  if (!cur || itemScore(it) > itemScore(cur)) {
    gear[it.slot] = it; recalcGear();
    addFloatText(player.x, player.y - 64, `${it.name}`, col, 20);
    addFloatText(player.x, player.y - 84, it.aff.map(fmtAffix).join('  '), '#e9ecef', 12);
    if (it.legend) { addFloatText(player.x, player.y - 104, `★ ${it.legend.name}: ${it.legend.desc}`, '#ff922b', 14); flash('#ff922b', 0.3); sfx('legend'); }
    else sfx('loot');
    addRing(player.x, player.y, 70, col, 0.5, 6); spawnBurst(player.x, player.y - 24, col, 16, 'ember');
  } else {
    const g = Math.round((15 + wave * 3) * (it.rarity + 1)); gold += g;
    addFloatText(player.x, player.y - 60, `Sold ${it.name} +${g}G`, '#adb5bd', 13); sfx('coin');
  }
}
function recalcGear() {
  const g = zeroG();
  for (const s of SLOTS) { const it = gear[s]; if (!it) continue; for (const a of it.aff) g[a.k] += a.v; if (it.legend) g[it.legend.id] = true; }
  g.dr = Math.min(0.35, g.dr); g.cdr = Math.min(0.4, g.cdr);
  player.g = g;
  const delta = g.hp - player.gearHp; player.maxHp += delta;
  player.hp = Math.max(1, Math.min(player.maxHp, player.hp + Math.max(0, delta))); player.gearHp = g.hp;
  rebuildGear();
}
function rebuildGear() {
  SLOTS.forEach((s, i) => {
    const el = $('gs-' + i), it = gear[s];
    el.textContent = SLOT_ICON[s];
    el.style.borderColor = it ? RARITY[it.rarity].c : '#555';
    el.style.boxShadow = it && it.rarity >= 2 ? `0 0 10px ${RARITY[it.rarity].c}` : 'none';
    el.title = it ? `${RARITY[it.rarity].n} ${it.name}\n${it.aff.map(fmtAffix).join('\n')}${it.legend ? `\n★ ${it.legend.name}: ${it.legend.desc}` : ''}` : `Empty ${s} slot`;
  });
}

// ---------- elites ----------
const ELITE_AFFIX = { swift: { name: 'Swift', col: '#74c0fc' }, vampiric: { name: 'Vampiric', col: '#ff6b6b' }, explosive: { name: 'Volatile', col: '#ff922b' }, guarded: { name: 'Guarded', col: '#b197fc' } };
function makeElite(en) {
  const keys = Object.keys(ELITE_AFFIX), a = keys[Math.floor(Math.random() * keys.length)];
  en.elite = true; en.eAff = a; en.eName = ELITE_AFFIX[a].name + ' ' + en.type[0].toUpperCase() + en.type.slice(1);
  en.hp = en.maxHp = Math.round(en.maxHp * 2.4); en.damage = Math.round(en.damage * 1.3); en.r *= 1.12;
  if (a === 'swift') en.speed *= 1.5;
  if (a === 'guarded') { en.barrier = Math.round(en.maxHp * 0.7); }
  addFloatText(en.x, en.y - 90, `ELITE: ${en.eName}`, ELITE_AFFIX[a].col, 16);
}

// ---------- evolutions (Vampire Survivors style: complete a build, unlock a transformation) ----------
const EVOS = [
  { id: 'tempest', icon: '🌩️', title: 'EVOLUTION: Tempest', desc: 'Critical hits call down a lightning strike that blasts the area.', req: () => (player.upg.lightning || 0) >= 3 && (player.upg.crit || 0) >= 2 },
  { id: 'aegis', icon: '🩸', title: 'EVOLUTION: Crimson Aegis', desc: 'Kills heal 6% max HP and grant a brief 50% damage-reduction barrier.', req: () => (player.upg.vamp || 0) >= 3 && (player.upg.armor || 0) >= 2 },
  { id: 'world', icon: '🌍', title: 'EVOLUTION: Worldsplitter', desc: 'Every 3rd swing unleashes a piercing shockwave.', req: () => (player.upg.cleave || 0) >= 2 && (player.upg.dmg || 0) >= 3 },
  { id: 'comet', icon: '☄️', title: 'EVOLUTION: Starfall', desc: 'Meteor Storm drops double the meteors and charges faster.', req: () => (player.upg.arcane || 0) >= 2 && (player.upg.swift || 0) >= 1 },
  { id: 'legion', icon: '⚜️', title: 'EVOLUTION: Legion', desc: 'Companions deal +50% damage and rise instantly once per wave.', req: () => companions.length > 0 && (player.upg.squad || 0) >= 2 }
];
function availableEvos() { return EVOS.filter(e => !player.evo[e.id] && e.req()); }
function lightningStrike(x, y) {
  bolts.push({ x1: x + rand(-20, 20), y1: y - 720, x2: x, y2: y - 6, life: 0.3, maxLife: 0.3, seed: Math.random() * 99 });
  glows.push({ x, y: y - 10, r: 170, life: 0.3, maxLife: 0.3, color: '#a5d8ff' }); addRing(x, y, 100, '#a5d8ff', 0.35, 8);
  spawnBurst(x, y - 10, '#a5d8ff', 16, 'spark'); sfx('thunder'); shake = Math.max(shake, 8);
  suppressUlt = true;
  forEachEnemy(o => { if (!o.flying && Math.hypot(o.x - x, o.y - y) < 100 + o.r) damageEnemy(o, Math.round(atkDmg() * 1.1), Math.atan2(o.y - y, o.x - x), 200, true); });
  suppressUlt = false;
}
function shockwave() {
  shootProjectile('quake', player.x + Math.cos(player.facing) * 24, player.y + Math.sin(player.facing) * 24, player.facing, 520, Math.round(atkDmg() * 1.3), 0.9, 30);
  const p = projectiles[projectiles.length - 1]; p.friendly = true; p.pierce = true; p.hit = []; p.col = '#ffd43b'; sfx('boom');
}

// ---------- Cast (Hades-style limited-charge ranged attack) ----------
function triggerCast() {
  if (state !== 'play' || player.cast < 1) return;
  player.cast--; if (player.castT <= 0) player.castT = 4 * cdrMul();
  let t = null, bd = 1e9;
  for (const e of enemies) { if (e.flying) continue; const d = Math.hypot(e.x - player.x, e.y - player.y); if (d < bd) { bd = d; t = e; } }
  const ang = t ? Math.atan2(t.y - player.y, t.x - player.x) : player.facing; player.facing = ang;
  shootProjectile('bolt', player.x + Math.cos(ang) * 24, player.y + Math.sin(ang) * 24, ang, 780, Math.round(atkDmg() * 1.8), 1.1, 16);
  const p = projectiles[projectiles.length - 1]; p.friendly = true; p.pierce = true; p.hit = []; p.col = '#b197fc';
  sfx('cast'); shake = Math.max(shake, 4); spawnBurst(player.x + Math.cos(ang) * 28, player.y - 20, '#d0bfff', 10, 'spark');
}

// ---------- level-up cards (blessings + evolutions) ----------
function openUpgradeModal() {
  state = 'upgrade'; sfx('upgrade'); tickWaveTimers();
  const box = $('card-container'); box.innerHTML = '';
  const evo = availableEvos()[0];
  const pool = UPGRADES.filter(u => (player.upg[u.id] || 0) < u.max && (u.id !== 'squad' || companions.length > 0)).sort(() => Math.random() - 0.5).slice(0, evo ? 2 : 3);
  const cards = []; if (evo) cards.push(Object.assign({ evo: true }, evo)); pool.forEach(u => cards.push(u));
  cards.forEach(u => {
    const taken = player.upg[u.id] || 0;
    const card = document.createElement('div'); card.className = u.evo ? 'card evo' : 'card';
    const lvl = u.evo ? '★ EVOLUTION ★' : (u.max < 99 ? `Level ${taken} → ${taken + 1} / ${u.max}` : `Taken ×${taken}`);
    card.innerHTML = `<div class="card-icon">${u.icon}</div><div class="card-title">${u.title}</div><div class="card-desc">${u.desc}</div><div class="card-lvl">${lvl}</div>`;
    card.onclick = () => {
      if (u.evo) { player.evo[u.id] = true; sfx('legend'); flash('#ffd43b', 0.4); } else applyUpgrade(u.id);
      $('upgrade-modal').style.display = 'none'; openMerchant();
    };
    box.appendChild(card);
  });
  const title = villageResult === 'saved' ? 'VILLAGE SAVED!' : (villageResult === 'lost' ? 'THE VILLAGE BURNED' : 'WAVE CLEARED!');
  $('up-title').textContent = title;
  $('up-sub').textContent = villageResult === 'saved' ? `Grateful villagers reward you with ${village.bonus} gold.${pendingRecruit ? ' One of them offers to fight at your side!' : ''} Then choose a blessing, then visit the merchant.`
    : (villageResult === 'lost' ? 'No one is left to thank you. Choose a blessing and press on.' : (evo ? 'Your build has reached its potential — an EVOLUTION awaits!' : 'Choose a blessing before the next battle'));
  const rb = $('recruit-box'); rb.innerHTML = '';
  if (pendingRecruit && companions.length < 3) {
    rb.style.display = 'block';
    rb.innerHTML = '<h3>RECRUIT A COMPANION</h3><div class="recruit-row"></div>';
    const row = rb.querySelector('.recruit-row');
    Object.keys(CTYPES).forEach(k => {
      const t = CTYPES[k], b = document.createElement('button'); b.className = 'recruit-btn';
      b.innerHTML = `<b>${t.icon} ${t.name}</b>${t.desc}`;
      b.onclick = () => { recruitCompanion(k); pendingRecruit = false; rb.style.display = 'none'; };
      row.appendChild(b);
    });
  } else rb.style.display = 'none';
  $('upgrade-modal').style.display = 'flex';
}
