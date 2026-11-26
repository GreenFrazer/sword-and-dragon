
// ======================= RARE HUNTS: named rare elites with raid-style mechanics =======================
// On some non-boss waves a named Rare Elite stalks in (silver frame, its own nameplate). It casts
// telegraphed abilities you dodge by where you stand: Flame Pools under you, a Leaping Slam onto
// your spot and a Frontal Cleave. At half health it rallies minions; at a quarter it runs for the
// map edge, and if it gets there it escapes with its treasure. Slain, it drops a hoard.
var rarePools = [], rareKills = 0;
const RARE_FIRST = ['Grimfang', 'Morgath', 'Vexra', 'Ulkor', 'Brakka', 'Thrask', 'Old Ironjaw', 'Hagra', 'Zulvex', 'Skarn', 'Murgle', 'Draveth'];
const RARE_TITLE = ['the Ashmaw', 'the Unbroken', 'the Hungering', 'of the Black Hollow', 'the Gravecaller', 'Bonegnaw', 'the Wretched King', 'the Cinderhide', 'Skullsplitter', 'the Mire-Born'];
const RARE_ABIL = { pools: 'Flame Pools', slam: 'Leaping Slam', cleave: 'Frontal Cleave' };

function rareChance(w) { return w >= 2 && w % 3 !== 0 ? (w <= 3 ? 0.4 : 0.55) : 0; }
function queueRare(w) { if (Math.random() < rareChance(w)) waveQueue.splice(Math.floor(waveQueue.length * 0.35), 0, 'rare'); }
function makeRare(base, sc, ds) {
  const name = RARE_FIRST[Math.floor(Math.random() * RARE_FIRST.length)] + ' ' + RARE_TITLE[Math.floor(Math.random() * RARE_TITLE.length)];
  const hp = Math.round(85 * sc * 9);
  bannerText = 'RARE ELITE'; bannerSub = name + ' hunts you'; bannerT = 3;
  sfx('roar'); flash('#dfe7f2', 0.3); shake = Math.max(shake, 8);
  return { ...base, type: 'rare', rare: true, name, hp, maxHp: hp, speed: 96, r: 34, damage: Math.round(22 * ds), abT: 2.5, last: '', cast: null, rallied: false, fleeing: false };
}
function rareCast(e, id) {
  const c = { id, t: 0, dur: id === 'pools' ? 0.9 : (id === 'slam' ? 1.3 : 0.95) };
  if (id === 'pools') {
    const spots = [{ x: player.x, y: player.y }];
    for (let i = 0; i < 2 + (wave >= 7 ? 1 : 0); i++) { const a = rand(0, TAU), d = rand(110, 210); spots.push({ x: player.x + Math.cos(a) * d, y: player.y + Math.sin(a) * d * 0.8 }); }
    for (const s of spots) rarePools.push({ x: Math.max(60, Math.min(WORLD_W - 60, s.x)), y: Math.max(60, Math.min(WORLD_H - 60, s.y)), r: 74, warn: 1.1, life: 6.5, tick: 0, dmg: Math.round(e.damage * 0.55) });
  } else if (id === 'slam') { c.sx = e.x; c.sy = e.y; c.tx = player.x; c.ty = player.y; c.R = 125; }
  else { c.ang = Math.atan2(player.y - e.y, player.x - e.x); c.R = 230; c.half = 1.15; }
  e.cast = c; e.facing = id === 'cleave' ? c.ang : e.facing;
  addFloatText(e.x, e.y - 110, RARE_ABIL[id] + '!', '#e9ecef', 17); sfx('cast', e.x, e.y);
}
function hitComps(x, y, R, dmg) { for (const c of companions) if (!c.down && Math.hypot(c.x - x, c.y - y) < R + c.r) damageComp(c, dmg, x, y); }
function rareResolve(e, c) {
  if (c.id === 'slam') {
    e.x = c.tx; e.y = c.ty; e.flying = false;
    if (Math.hypot(player.x - e.x, player.y - e.y) < c.R + 14) damagePlayer(Math.round(e.damage * 1.6), e.x, e.y);
    hitComps(e.x, e.y, c.R, Math.round(e.damage * 1.2));
    explosionFx(e.x, e.y, c.R, '#ced4da', true); shake = Math.max(shake, 14); sfx('boom', e.x, e.y);
    for (let i = 0; i < 10; i++) { const a = rand(0, TAU), s = rand(80, 260); if (particles.length < MAXP) particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6 - 60, life: 0.8, maxLife: 0.8, color: '#6c5b4a', size: rand(4, 8), kind: 'dot', g: 380 }); }
    scorches.push({ x: e.x, y: e.y, r: 60, life: 10 }); if (scorches.length > 30) scorches.shift();
  } else if (c.id === 'cleave') {
    const inCone = (x, y, r) => { const d = Math.hypot(x - e.x, y - e.y); return d < c.R + r && Math.abs(normalizeAngle(Math.atan2(y - e.y, x - e.x) - c.ang)) < c.half; };
    if (inCone(player.x, player.y, 10)) damagePlayer(Math.round(e.damage * 1.8), e.x, e.y);
    for (const cp of companions) if (!cp.down && inCone(cp.x, cp.y, cp.r)) damageComp(cp, Math.round(e.damage * 1.3), e.x, e.y);
    slashes.push({ x: e.x, y: e.y - 30, ang: c.ang, dir: 1, life: 0.3, maxLife: 0.3, R: c.R, color: '#e9ecef' });
    shake = Math.max(shake, 9); sfx('spin', e.x, e.y);
  }
}
function rareFlee(e) {
  e.fleeing = true; e.cast = null; e.flying = false;
  const d = [e.y, WORLD_H - e.y, e.x, WORLD_W - e.x], m = d.indexOf(Math.min(...d));
  e.fx = m === 2 ? 50 : (m === 3 ? WORLD_W - 50 : e.x); e.fy = m === 0 ? 60 : (m === 1 ? WORLD_H - 50 : e.y);
  addFloatText(e.x, e.y - 110, e.name.split(' ')[0] + ' flees! Stop it!', '#ffd43b', 20); sfx('roar');
}
function rareEscape(e) {
  const i = enemies.indexOf(e); if (i < 0) return;
  enemies.splice(i, 1); spawnSmoke(e.x, e.y, 12);
  bannerText = 'IT ESCAPED'; bannerSub = e.name + ' got away with its hoard'; bannerT = 2.5;
}
function updateRare(e, dt) {
  e.atkCd = Math.max(0, e.atkCd - dt);
  if (!e.rallied && e.hp < e.maxHp * 0.5) { // rally: call minions to its side
    e.rallied = true; addFloatText(e.x, e.y - 110, 'To me, my kin!', '#e9ecef', 18); sfx('roar'); addRing(e.x, e.y, 200, '#dfe7f2', 0.6, 6);
    for (let i = 0; i < 3; i++) { spawnEnemy(wave >= 5 && i === 2 ? 'brute' : 'grunt'); const m = enemies[enemies.length - 1], a = i / 3 * TAU; m.x = Math.max(50, Math.min(WORLD_W - 50, e.x + Math.cos(a) * 80)); m.y = Math.max(60, Math.min(WORLD_H - 50, e.y + Math.sin(a) * 60)); waveTotal++; }
  }
  if (!e.fleeing && e.hp < e.maxHp * 0.25 && !e.cast) rareFlee(e);
  if (e.fleeing) {
    const a = Math.atan2(e.fy - e.y, e.fx - e.x); e.facing = a;
    e.x += Math.cos(a) * e.speed * 1.75 * dt; e.y += Math.sin(a) * e.speed * 1.75 * dt; e.walkPhase += dt * 14;
    if (Math.random() < dt * 10 && particles.length < MAXP) particles.push({ x: e.x, y: e.y - 30, vx: rand(-20, 20), vy: rand(-40, -10), life: 0.6, maxLife: 0.6, color: '#ffd43b', size: rand(3, 5), kind: 'dot', g: 120 }); // dropping coins
    if (Math.hypot(e.fx - e.x, e.fy - e.y) < 24) rareEscape(e);
    return;
  }
  if (e.cast) {
    const c = e.cast; c.t += dt;
    if (c.id === 'slam') { const p = Math.max(0, (c.t - 0.35) / (c.dur - 0.35)); if (p > 0) { e.flying = true; e.x = c.sx + (c.tx - c.sx) * p; e.y = c.sy + (c.ty - c.sy) * p; e.hop = Math.sin(p * Math.PI) * 150; } }
    if (c.t >= c.dur) { e.cast = null; e.hop = 0; rareResolve(e, c); e.atkCd = 0.8; }
    return;
  }
  const dx = player.x - e.x, dy = player.y - e.y, dist = Math.hypot(dx, dy), ta = Math.atan2(dy, dx);
  e.abT -= dt;
  if (e.abT <= 0 && e.windup <= 0) {
    const opts = ['pools', 'slam', 'cleave'].filter(k => k !== e.last && (k !== 'cleave' || dist < 260));
    const id = opts[Math.floor(Math.random() * opts.length)] || 'pools';
    e.last = id; e.abT = Math.max(2.6, 4.6 - wave * 0.1); rareCast(e, id); return;
  }
  e.facing += normalizeAngle(ta - e.facing) * Math.min(1, 6 * dt);
  if (e.windup > 0) { e.windup -= dt; if (e.windup <= 0) { e.atkCd = 1.3; if (dist <= e.r + 50) damagePlayer(e.damage, e.x, e.y); } return; }
  if (dist > e.r + 30) { e.x += Math.cos(ta) * e.speed * dt; e.y += Math.sin(ta) * e.speed * dt; e.walkPhase += dt * e.speed * 0.06; }
  else if (e.atkCd <= 0) e.windup = 0.38;
}
// pools burn the hero, companions and other foes alike: lure the pack into the fire
function stepRare(dt) {
  for (let i = rarePools.length - 1; i >= 0; i--) {
    const p = rarePools[i];
    if (p.warn > 0) { p.warn -= dt; if (p.warn <= 0) { sfx('fire', p.x, p.y); explosionFx(p.x, p.y, p.r * 0.8, '#ff922b', false); } continue; }
    p.life -= dt; p.tick -= dt;
    if (Math.random() < dt * 14 && particles.length < MAXP) { const a = rand(0, TAU), d = rand(0, p.r); particles.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d * 0.7, vx: rand(-10, 10), vy: rand(-70, -30), life: 0.6, maxLife: 0.6, color: Math.random() < 0.5 ? '#ff7a1a' : '#ffd43b', size: rand(3, 6), kind: 'ember', g: -20 }); }
    if (p.tick <= 0) {
      p.tick = 0.45;
      const inP = (x, y) => Math.hypot(x - p.x, (y - p.y) / 0.7) < p.r;
      if (inP(player.x, player.y)) damagePlayer(p.dmg, p.x, p.y);
      for (const c of companions) if (!c.down && inP(c.x, c.y)) damageComp(c, Math.round(p.dmg * 0.6), p.x, p.y);
      forEachEnemy(o => { if (!o.flying && !o.rare && o.type !== 'dragon' && inP(o.x, o.y)) damageEnemy(o, Math.round(10 + wave * 2.5), Math.atan2(o.y - p.y, o.x - p.x), 40, true); });
    }
    if (p.life <= 0) rarePools.splice(i, 1);
  }
  if (rarePools.length && !enemies.some(e => e.rare)) for (const p of rarePools) p.life = Math.min(p.life, 1); // the caster is gone: the fires gutter out
}
function rareSlain(e) {
  rareKills++;
  spawnLoot(e.x - 30, e.y + 10, 0.9); spawnLoot(e.x + 30, e.y + 10, 0.6);
  const g = Math.round((60 + wave * 12) * goldMul());
  for (let i = 0; i < 5; i++) pickups.push({ x: e.x + rand(-40, 40), y: e.y + rand(-20, 30), type: 'gold', val: Math.round(g / 5), bob: i });
  pickups.push({ x: e.x, y: e.y - 20, type: 'potion', bob: 1 });
  bannerText = 'RARE SLAIN'; bannerSub = e.name + ' · +30 embers'; bannerT = 2.5;
  addRing(e.x, e.y, 220, '#f8f9fa', 0.7, 8); flash('#f1f3f5', 0.35); slowT = Math.max(slowT, 0.6); sfx('crit');
  for (let i = 0; i < 3; i++) explosionFx(e.x + rand(-40, 40), e.y + rand(-30, 10), 90, '#dfe7f2', false);
}

// ---------- drawing ----------
function drawRareGround() {
  for (const p of rarePools) {
    if (p.warn > 0) { // telegraph: pulsing ring with a filling core
      const k = 1 - p.warn / 1.1, pulse = 0.5 + 0.3 * Math.sin(time * 20);
      ctx.fillStyle = `rgba(255,90,30,${0.12 + k * 0.18})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.7, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(255,110,40,${pulse})`; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = 'rgba(255,170,60,0.35)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * k, p.r * 0.7 * k, 0, 0, TAU); ctx.fill();
      continue;
    }
    const a = Math.min(1, p.life / 1); ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, p.r); // built in the pool's local space (used after translate)
    g.addColorStop(0, '#fff3bf'); g.addColorStop(0.35, '#ffa94d'); g.addColorStop(0.75, '#e8590c'); g.addColorStop(1, 'rgba(120,20,0,0)');
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, 0.7); ctx.fillStyle = g;
    ctx.beginPath(); for (let i = 0; i <= 20; i++) { const an = i / 20 * TAU, rr = p.r * (0.92 + 0.08 * Math.sin(an * 5 + time * 6 + p.x)); ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  }
  for (const e of enemies) {
    if (!e.rare || !e.cast) continue;
    const c = e.cast, k = Math.min(1, c.t / c.dur), pulse = 0.5 + 0.35 * Math.sin(time * 22);
    if (c.id === 'slam') {
      ctx.fillStyle = `rgba(220,230,245,${0.1 + k * 0.2})`; ctx.beginPath(); ctx.ellipse(c.tx, c.ty, c.R, c.R * 0.72, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(255,80,60,${pulse})`; ctx.lineWidth = 4; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(c.tx, c.ty, c.R * k, c.R * 0.72 * k, 0, 0, TAU); ctx.stroke();
    } else if (c.id === 'cleave') {
      ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, 0.8);
      ctx.fillStyle = `rgba(255,70,50,${0.12 + k * 0.25})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, c.R, c.ang - c.half, c.ang + c.half); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(255,90,60,${pulse})`; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = 'rgba(255,200,150,0.25)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, c.R * k, c.ang - c.half, c.ang + c.half); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
}
function drawRare(e) {
  const hop = e.hop || 0;
  // rotating silver rune circle under the rare
  ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, 0.7);
  ctx.strokeStyle = e.fleeing ? 'rgba(255,212,59,0.7)' : 'rgba(225,232,245,0.6)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 50, 0, TAU); ctx.stroke(); ctx.setLineDash([6, 8]); ctx.lineDashOffset = -time * 30;
  ctx.beginPath(); ctx.arc(0, 0, 58, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  for (let i = 0; i < 6; i++) { const a = time * 0.8 + i / 6 * TAU; ctx.fillStyle = 'rgba(235,240,250,0.8)'; ctx.fillRect(Math.cos(a) * 54 - 2, Math.sin(a) * 54 - 2, 4, 4); }
  ctx.restore();
  if (hop > 0) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + 4, 34, 12, 0, 0, TAU); ctx.fill(); }
  ctx.save(); ctx.translate(0, -hop);
  drawHumanoid(e, false);
  // horned iron crown and pauldrons on top of the shared body
  ctx.translate(e.x, e.y); ctx.scale(1.7, 1.7);
  ctx.fillStyle = '#dee2e6'; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 8, -52); ctx.quadraticCurveTo(s * 20, -58, s * 18, -72); ctx.quadraticCurveTo(s * 14, -60, s * 4, -55); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = '#adb5bd'; ctx.fillRect(-9, -55, 18, 4);
  ctx.fillStyle = '#f8f9fa'; for (const x of [-7, 0, 7]) { ctx.beginPath(); ctx.moveTo(x - 2.5, -55); ctx.lineTo(x, -61); ctx.lineTo(x + 2.5, -55); ctx.fill(); }
  ctx.fillStyle = '#868e96'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 13, -34, 7, 0, TAU); ctx.fill(); ctx.stroke(); }
  if (e.cast && e.cast.id !== 'slam') { const k = Math.min(1, e.cast.t / e.cast.dur); drawGlow(0, -60, 18 + k * 14, e.cast.id === 'pools' ? '#ff922b' : '#ff6b6b', 0.6 + k * 0.4); }
  ctx.restore();
}
// screen-space arrow towards an off-screen rare
function drawRareIndicator() {
  const e = enemies.find(o => o.rare); if (!e) return;
  const s = worldToScreen(e.x, e.y);
  if (s.x > 30 && s.x < W - 30 && s.y > 30 && s.y < H - 30) return;
  const a = Math.atan2(s.y - H / 2, s.x - W / 2), m = 46;
  const x = Math.max(m, Math.min(W - m, s.x)), y = Math.max(m + 60, Math.min(H - m - 90, s.y));
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = e.fleeing ? '#ffd43b' : '#e9ecef'; ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-8, -12); ctx.lineTo(-3, 0); ctx.lineTo(-8, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.font = "900 15px 'Segoe UI', sans-serif"; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.strokeText('★', x - Math.cos(a) * 20, y - Math.sin(a) * 20 + 5); ctx.fillStyle = '#f8f9fa'; ctx.fillText('★', x - Math.cos(a) * 20, y - Math.sin(a) * 20 + 5);
}
