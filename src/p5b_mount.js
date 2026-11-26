
// ======================= WARHORSE: out-of-combat mount and Cavalry Charge =======================
// Walk with no foe nearby and the hero whistles up a warhorse (a short "cast bar" over their head).
// Mounted: much faster, no auto-attacks. Gallop into a foe for a Cavalry Charge (big AoE hit, stun,
// knockback, shield break); being hit or stopping beside a foe throws the hero off instead.
const MOUNT_SAFE = 340, MOUNT_CAST = 1.0, MOUNT_SPD = 1.7, MOUNT_CD = 5;
var steeds = []; // riderless horses cantering away after a dismount

function nearestFoeDist() {
  let d = Infinity;
  for (const e of enemies) { if (e.flying) continue; const k = Math.hypot(e.x - player.x, e.y - player.y) - e.r; if (k < d) d = k; }
  return d;
}
function mountSpeedMul() { return player.mount ? MOUNT_SPD : 1; }
function mountUp() {
  player.mount = 1; player.mountCast = 0; player.mountIn = 0; player.mountT = 0;
  addRing(player.x, player.y, 80, '#ffe8a3', 0.4, 4); spawnSmoke(player.x - Math.cos(player.facing) * 40, player.y, 6);
  sfx('neigh', player.x, player.y);
  if (!player.mountTip) { player.mountTip = 1; addFloatText(player.x, player.y - 96, 'WARHORSE! Gallop into foes to CHARGE', '#ffe8a3', 17); }
}
function dismount(why) {
  if (!player.mount) return;
  const sx = Math.cos(player.facing) >= 0 ? 1 : -1;
  steeds.push({ x: player.x, y: player.y, sx: why === 'charge' ? -sx : sx, vx: (why === 'charge' ? -sx : sx) * 260, vy: rand(-60, 60), life: 1.6, ph: player.walkPhase || 0, fem: meta.hero === 'f' });
  player.mount = 0; player.mountCast = 0; player.mountCd = why === 'charge' ? MOUNT_CD : MOUNT_CD * 0.6;
  if (why === 'dazed') { addFloatText(player.x, player.y - 70, 'Dazed! Thrown from the saddle', '#ffa8a8', 16); sfx('neigh', player.x, player.y); }
  spawnSmoke(player.x, player.y, 5);
}
function cavalryCharge(tgt) {
  const R = 150, base = Math.round(atkDmg() * 2.4), dir = Math.atan2(player.vy, player.vx);
  let hits = 0;
  forEachEnemy(e => {
    if (e.flying) return;
    if (Math.hypot(e.x - player.x, e.y - player.y) > R + e.r) return;
    hits++;
    if (e.type !== 'dragon') e.stun = Math.max(e.stun || 0, 1.3);
    if (e.hasShield) { e.hasShield = false; addFloatText(e.x, e.y - 40, 'SHIELD SHATTERED!', '#ffd43b'); }
    const crit = Math.random() < critCh(), a = Math.atan2(e.y - player.y, e.x - player.x);
    // foes are flung away from the rider's line, the struck one hardest
    damageEnemy(e, Math.round(base * (crit ? 2 : 1) * (e === tgt ? 1.4 : 1)), (a + dir) / 2 + (Math.abs(a - dir) > Math.PI ? Math.PI : 0), e === tgt ? 640 : 480, true, crit);
  });
  if (hits > 0) healPlayer(vampAmt() * 2);
  checkPropsInRadius(player.x, player.y, R, true);
  deflectProjectiles(player.x, player.y, R + 20);
  addRing(player.x, player.y, R, '#ffe8a3', 0.45, 10); addRing(player.x, player.y, R * 1.6, '#ffffff', 0.6, 3);
  glows.push({ x: player.x, y: player.y - 14, r: R * 1.3, life: 0.35, maxLife: 0.35, color: '#ffd76a' });
  for (let i = 0; i < 14; i++) { const a = dir + Math.PI + rand(-1.1, 1.1), s = rand(120, 320); if (particles.length < MAXP) particles.push({ x: player.x, y: player.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, life: 0.7, maxLife: 0.7, color: biome.path2, size: rand(5, 10), kind: 'smoke', g: 0 }); }
  shake = Math.max(shake, 16); hitStop = Math.max(hitStop, 0.09); zoomKick = Math.max(zoomKick, 0.07); flash('#fff1c2', 0.25);
  addFloatText(player.x, player.y - 84, 'CAVALRY CHARGE!', '#ffd43b', 26);
  sfx('charge', player.x, player.y);
  // the hero leaps from the saddle into the fray: brief guard, carried momentum
  player.invuln = Math.max(player.invuln, 0.6); player.vx = Math.cos(dir) * 120; player.vy = Math.sin(dir) * 120;
  player.atkCooldown = 0; dismount('charge');
}
// Called from stepSimulation before player movement.
function stepMount(dt, inp) {
  player.mountCd = Math.max(0, (player.mountCd || 0) - dt);
  for (let i = steeds.length - 1; i >= 0; i--) {
    const s = steeds[i]; s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.ph += dt * 20;
    if (s.life <= 0) steeds.splice(i, 1);
  }
  if (player.mount) {
    player.mountIn = Math.min(1, player.mountIn + dt * 3.2); player.mountT += dt;
    const sp = Math.hypot(player.vx, player.vy);
    if (sp > player.speed * 1.1 || player.dashTime > 0) { // at a gallop: crash into the first foe
      for (const e of enemies) {
        if (e.flying) continue;
        if (Math.hypot(e.x - player.x, e.y - player.y) < e.r + 36) { cavalryCharge(e); return; }
      }
    } else if (nearestFoeDist() < player.range * 0.8) { dismount('hop'); return; } // reined in beside a foe: hop off and fight
    // hooves: clop on each footfall, kick up turf
    const step = Math.floor((player.walkPhase || 0) / Math.PI);
    if (sp > 60 && step !== player.hoofStep) {
      player.hoofStep = step; sfx('hoof');
      if (particles.length < MAXP - 4) for (let k = 0; k < 3; k++) particles.push({ x: player.x + rand(-26, 26), y: player.y + 2, vx: -player.vx * 0.12 + rand(-20, 20), vy: rand(-40, -10), life: 0.5, maxLife: 0.5, color: biome.path2, size: rand(3, 6), kind: 'smoke', g: 40 });
    }
    return;
  }
  if (state === 'play' && inp.mag > 0.3 && player.mountCd <= 0 && player.dashTime <= 0 && player.spinTime <= 0 && nearestFoeDist() > MOUNT_SAFE) {
    if (!player.mountCast) sfx('whistle');
    player.mountCast = (player.mountCast || 0) + dt;
    if (player.mountCast >= MOUNT_CAST) mountUp();
  } else player.mountCast = 0;
}

// ---------- drawing ----------
const HORSE = { coat: '#7a4a26', dark: '#4a2c16', mane: '#22150c', hoof: '#1a120c' };
// side-view horse with hooves at the origin; sx = 1 faces right. ph = gallop phase, nm = 0..1 speed
function drawHorse(sx, ph, nm, fem, alpha) {
  ctx.save(); ctx.scale(sx, 1);
  if (alpha != null) ctx.globalAlpha *= alpha;
  const bob = -Math.abs(Math.sin(ph)) * 4 * nm, pitch = Math.sin(ph) * 0.05 * nm;
  const leg = (hx, hy, a, col, bend) => { // two-segment leg from hip
    const kx = hx + Math.sin(a) * 14, ky = hy + Math.cos(a) * 14;
    const fa = a + bend, fx = kx + Math.sin(fa) * 14, fy = Math.min(0, ky + Math.cos(fa) * 14);
    ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.fillStyle = HORSE.hoof; ctx.fillRect(fx - 3.5, fy - 2, 7, 4);
  };
  const sw = 0.75 * nm, fA = Math.sin(ph) * sw, bA = Math.sin(ph + 2.2) * sw;
  // far legs (darker, slightly out of phase)
  leg(18, -30 + bob, -fA * 0.9 + 0.1, HORSE.dark, fA > 0 ? -0.9 * nm : 0.1);
  leg(-20, -30 + bob, -bA * 0.9, HORSE.dark, bA < 0 ? 0.8 * nm : -0.1);
  ctx.save(); ctx.translate(0, bob); ctx.rotate(pitch);
  // tail
  const tw = Math.sin(time * 9 + ph) * 4 + nm * 10;
  ctx.strokeStyle = HORSE.mane; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(-28, -40); ctx.quadraticCurveTo(-42 - nm * 8, -40 + tw * 0.3, -46 - nm * 14, -18 + tw * 0.4 - nm * 10); ctx.stroke();
  // body
  ctx.fillStyle = HORSE.coat; ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, -36, 32, 14, 0, 0, TAU); ctx.fill(); ctx.stroke();
  // neck and head
  ctx.beginPath(); ctx.moveTo(18, -46); ctx.quadraticCurveTo(30, -66, 38, -70); ctx.lineTo(48, -60); ctx.quadraticCurveTo(36, -50, 30, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(36, -72); ctx.quadraticCurveTo(52, -70, 60, -56); ctx.quadraticCurveTo(58, -50, 52, -52); ctx.lineTo(42, -58); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = HORSE.mane; ctx.beginPath(); ctx.moveTo(34, -74); ctx.lineTo(38, -82); ctx.lineTo(41, -72); ctx.fill(); // ear
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(46, -64, 1.8, 0, TAU); ctx.fill(); // eye
  ctx.fillStyle = '#2b1a0e'; ctx.beginPath(); ctx.arc(57, -54, 1.6, 0, TAU); ctx.fill(); // nostril
  // mane, streaming with speed
  ctx.strokeStyle = HORSE.mane; ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) { const t = i / 4, mx = 36 - t * 18, my = -72 + t * 26, fl = 8 + nm * 8 + Math.sin(time * 14 + i) * 2; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx - fl, my + 2 + nm * 2); ctx.stroke(); }
  // bridle and reins
  ctx.strokeStyle = '#3b2412'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(40, -70); ctx.lineTo(52, -54); ctx.moveTo(52, -56); ctx.quadraticCurveTo(30, -50, 8, -52); ctx.stroke();
  // heraldic caparison over the back, scalloped hem fluttering
  const cap = fem ? '#d6336c' : '#1c7ed6', capD = fem ? '#a61e4d' : '#1864ab';
  ctx.fillStyle = cap; ctx.beginPath(); ctx.moveTo(-26, -46);
  ctx.quadraticCurveTo(0, -54, 20, -46); ctx.lineTo(22, -26);
  for (let i = 0; i <= 6; i++) { const x = 22 - i * 8, fl = Math.sin(time * 12 + i * 1.3) * nm * 2; ctx.quadraticCurveTo(x - 4, -20 + fl, x - 8, -26); }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ffd43b'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = capD; ctx.fillRect(-24, -44, 44, 4);
  ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.moveTo(-4, -40); ctx.lineTo(4, -40); ctx.lineTo(0, -31); ctx.closePath(); ctx.fill(); // gold chevron crest
  // saddle
  ctx.fillStyle = '#5c3a21'; ctx.beginPath(); rrect(-12, -52, 22, 7, 3); ctx.fill();
  ctx.fillStyle = '#ffd43b'; ctx.fillRect(-1, -52, 3, 7);
  ctx.restore();
  // near legs
  leg(20, -30 + bob, fA + 0.05, HORSE.coat, fA < 0 ? -0.9 * nm : 0.1);
  leg(-18, -30 + bob, bA, HORSE.coat, bA > 0 ? 0.8 * nm : -0.1);
  ctx.restore();
}
// player (or a dash afterimage of them) in the saddle; falls back to the plain hero when on foot
function drawRider(ent) {
  if (!ent.mount) { drawHumanoid(ent, true); return; }
  const an = ent._an, sp = an ? an.sp : Math.hypot(ent.vx || 0, ent.vy || 0), nm = Math.min(1, sp / 380);
  const sx = Math.cos(an ? an.vf : ent.facing) >= 0 ? 1 : -1, k = ent.mountIn == null ? 1 : ent.mountIn, e = 1 - Math.pow(1 - k, 3);
  ctx.save(); ctx.translate(ent.x, ent.y);
  ctx.fillStyle = 'rgba(0,0,0,0.34)'; ctx.beginPath(); ctx.ellipse(0, 4, 44, 12, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(-sx * (1 - e) * 120, 0); drawHorse(sx, ent.walkPhase || 0, Math.max(nm, 1 - e), meta.hero === 'f', e); ctx.restore();
  ctx.restore();
  // rider: hops from the ground into the saddle as the horse arrives
  const bob = -Math.abs(Math.sin(ent.walkPhase || 0)) * 4 * nm, hop = -Math.sin(Math.min(1, k * 1.2) * Math.PI) * 18;
  ctx.save(); ctx.translate(0, -32 * e + bob + (k < 1 ? hop : 0)); drawHumanoid(ent, true); ctx.restore();
}
function drawSteed(s) {
  ctx.save(); ctx.translate(s.x, s.y);
  const a = Math.min(1, s.life / 0.5);
  ctx.globalAlpha = a; ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 4, 42, 11, 0, 0, TAU); ctx.fill();
  drawHorse(s.sx, s.ph, 1, s.fem, 1);
  ctx.restore(); ctx.globalAlpha = 1;
}
// WoW-style cast bar over the hero while the warhorse is being called
function drawMountCast() {
  if (player.mount || !(player.mountCast > 0)) return;
  const p = Math.min(1, player.mountCast / MOUNT_CAST), x = player.x - 38, y = player.y - 92;
  ctx.fillStyle = 'rgba(10,8,6,0.8)'; ctx.beginPath(); rrect(x - 2, y - 2, 80, 12, 4); ctx.fill();
  const g = ctx.createLinearGradient(x, 0, x + 76, 0); g.addColorStop(0, '#b8860b'); g.addColorStop(1, '#ffe08a');
  ctx.fillStyle = g; ctx.beginPath(); rrect(x, y, 76 * p, 8, 3); ctx.fill();
  ctx.strokeStyle = '#ffd43b'; ctx.lineWidth = 1.2; ctx.beginPath(); rrect(x - 2, y - 2, 80, 12, 4); ctx.stroke();
  ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffe8a3';
  ctx.fillText('🐴 Warhorse', player.x, y - 5);
}
