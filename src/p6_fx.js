// ======================= VISUAL FX: lighting, bloom, weather, fog, grass, ponds, intro, music =======================
var slainT = 0, slainX = 0, slainY = 0, slainName = '';
let weather = 'clear', wxDrops = [], fogBlobs = [], flies = [], introT = 0, nextBolt = 4, lightFlash = 0;
let lightCv = null, lightCtx = null, bloomCv = null, bloomCtx = null, lightSpr = null, shX = 0, shY = 0;
const NIGHT = [[8, 16, 44], [36, 14, 30], [12, 26, 72], [38, 6, 6]];
const DARKB = [0.30, 0.36, 0.30, 0.50];
const FOGCOL = ['#b8d8c0', '#d9b88a', '#e8f4ff', '#8a4a3a'];
const GRADE = [['rgba(255,210,150,0.16)', 'rgba(70,100,170,0.16)'], ['rgba(255,170,90,0.2)', 'rgba(90,60,120,0.16)'], ['rgba(200,225,255,0.16)', 'rgba(60,100,190,0.2)'], ['rgba(255,120,60,0.2)', 'rgba(70,20,20,0.2)']];

function initFxCanvases() {
  fxDirty = false;
  lightCv = document.createElement('canvas'); lightCv.width = Math.max(2, Math.round(W / 2)); lightCv.height = Math.max(2, Math.round(H / 2)); lightCtx = lightCv.getContext('2d');
  bloomCv = document.createElement('canvas'); bloomCv.width = Math.max(2, Math.round(canvas.width / 5)); bloomCv.height = Math.max(2, Math.round(canvas.height / 5)); bloomCtx = bloomCv.getContext('2d');
  if (!lightSpr) {
    lightSpr = document.createElement('canvas'); lightSpr.width = lightSpr.height = 128;
    const g = lightSpr.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
}

// ---------- ground extras (baked into the ground texture) ----------
function bakePonds(g) {
  const spots = [[0.2, 0.22], [0.8, 0.78], [0.2, 0.8], [0.8, 0.2]].sort(() => Math.random() - 0.5).slice(0, 2);
  const cols = [['#2f7fb0', '#58aee0'], ['#3b6f80', '#5f9fb0'], ['#bfe3f2', '#eaf8ff'], ['#241a1a', '#4a3430']][Math.max(0, biomeIdx)];
  ponds = spots.map(s => ({ x: s[0] * WORLD_W + rand(-40, 40), y: s[1] * WORLD_H + rand(-30, 30), rx: rand(105, 145), ry: rand(66, 90) }));
  for (const p of ponds) {
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(p.x, p.y + 6, p.rx + 14, p.ry + 12, 0, 0, TAU); g.fill();
    g.fillStyle = biome.path2; g.beginPath(); g.ellipse(p.x, p.y, p.rx + 10, p.ry + 8, 0, 0, TAU); g.fill();
    const gr = g.createRadialGradient(p.x - p.rx * 0.3, p.y - p.ry * 0.3, 10, p.x, p.y, p.rx);
    gr.addColorStop(0, cols[1]); gr.addColorStop(1, cols[0]);
    g.fillStyle = gr; g.beginPath(); g.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; g.beginPath(); g.ellipse(p.x, p.y, p.rx - 4, p.ry - 3, 0, Math.PI * 1.05, Math.PI * 1.7); g.stroke();
    if (biomeIdx === 2) { g.strokeStyle = 'rgba(120,170,200,0.6)'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(p.x + rand(-p.rx * 0.6, p.rx * 0.6), p.y + rand(-p.ry * 0.5, p.ry * 0.5)); g.lineTo(p.x + rand(-p.rx * 0.6, p.rx * 0.6), p.y + rand(-p.ry * 0.5, p.ry * 0.5)); g.stroke(); } }
    else if (biomeIdx < 2) { g.fillStyle = '#4c9a3c'; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(p.x + rand(-p.rx * 0.7, p.rx * 0.7), p.y + rand(-p.ry * 0.6, p.ry * 0.6), 9, 6, rand(0, 3), 0, TAU); g.fill(); } }
  }
  trees = trees.filter(t => ponds.every(p => Math.hypot((t.x - p.x) / (p.rx + 40), (t.y - p.y) / (p.ry + 40)) > 1));
}
function buildGrass() {
  grassBlades = [];
  for (let i = 0; i < 720; i++) {
    const x = rand(30, WORLD_W - 30), y = rand(30, WORLD_H - 30);
    if (ponds.some(p => Math.hypot((x - p.x) / (p.rx + 10), (y - p.y) / (p.ry + 10)) < 1)) continue;
    if (Math.abs(y - WORLD_H * 0.47) < 55 || Math.abs(x - WORLD_W * 0.52) < 55) continue;
    grassBlades.push({ x, y, h: rand(9, 17), ph: rand(0, 6), c: Math.random() < 0.5 ? 0 : 1 });
  }
}
function drawGrass() {
  const z = baseScale() * (1 + zoomKick), x0 = cam.x - 30, x1 = cam.x + W / z + 30, y0 = cam.y - 30, y1 = cam.y + H / z + 30;
  ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass ? biome.t2 : biome.t1; ctx.beginPath();
    for (const g of grassBlades) {
      if (g.c !== pass || g.x < x0 || g.x > x1 || g.y < y0 || g.y > y1) continue;
      let bend = Math.sin(time * 1.8 + g.x * 0.015 + g.ph) * 3;
      const dx = g.x - player.x, dy = g.y - player.y;
      if (Math.abs(dx) < 46 && Math.abs(dy) < 30) bend += (dx < 0 ? -1 : 1) * (46 - Math.abs(dx)) * 0.4;
      ctx.moveTo(g.x, g.y); ctx.quadraticCurveTo(g.x + bend * 0.4, g.y - g.h * 0.6, g.x + bend, g.y - g.h);
    }
    ctx.stroke();
  }
}
function drawPonds() {
  for (const p of ponds) {
    for (let i = 0; i < 9; i++) {
      const a = Math.sin(time * 2.2 + i * 1.7 + p.x);
      if (a < 0.45) continue;
      const sx = p.x + Math.cos(i * 2.4 + p.y) * p.rx * 0.6, sy = p.y + Math.sin(i * 3.1 + p.x) * p.ry * 0.55;
      drawGlow(sx, sy, 7 + a * 5, biomeIdx === 3 ? '#ff7a2a' : '#ffffff', (a - 0.4) * (biomeIdx === 3 ? 0.5 : 0.9));
    }
    const rp = (time * 0.4 + p.x * 0.01) % 1;
    ctx.strokeStyle = `rgba(255,255,255,${0.22 * (1 - rp)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x + p.rx * 0.2, p.y, p.rx * 0.5 * rp, p.ry * 0.5 * rp, 0, 0, TAU); ctx.stroke();
  }
}

// ---------- lighting (dark ambient with light sources punched out) ----------
function darkLevel() {
  const prog = Math.max(0, Math.min(1, 1 - (enemies.length + waveQueue.length) / Math.max(1, waveTotal)));
  let d = DARKB[Math.max(0, biomeIdx)] + prog * 0.08 + (weather === 'storm' ? 0.12 : weather === 'rain' ? 0.06 : weather === 'blizzard' ? 0.04 : 0);
  if (introT > 0) d += 0.08;
  d -= lightFlash * 0.5;
  return Math.max(0, Math.min(0.68, d));
}
function lightingPass() {
  if (fxDirty || !lightCv) initFxCanvases();
  const dark = darkLevel(); if (dark < 0.02) return;
  const k = 0.5, l = lightCtx, z = baseScale() * (1 + zoomKick), a = NIGHT[Math.max(0, biomeIdx)];
  l.globalCompositeOperation = 'source-over'; l.globalAlpha = 1; l.clearRect(0, 0, lightCv.width, lightCv.height);
  l.fillStyle = `rgba(${a[0]},${a[1]},${a[2]},${dark})`; l.fillRect(0, 0, lightCv.width, lightCv.height);
  l.globalCompositeOperation = 'destination-out';
  const add = (x, y, r, i) => {
    const s = worldToScreen(x, y), rr = r * z * k, sx = s.x * k, sy = s.y * k;
    if (sx < -rr || sy < -rr || sx > lightCv.width + rr || sy > lightCv.height + rr) return;
    l.globalAlpha = Math.min(1, i); l.drawImage(lightSpr, sx - rr, sy - rr, rr * 2, rr * 2);
  };
  add(player.x, player.y - 20, 310 + 14 * Math.sin(time * 9), 1);
  for (const c of companions) if (!c.down) add(c.x, c.y - 20, c.type === 'cleric' ? 190 : 150, 0.85);
  for (const c of companions) if (c.down) add(c.gx, c.gy - 10, 80, 0.7);
  if (village) for (const h of village.houses) { if (h.dead) add(h.x, h.y - 14, 150 + 20 * Math.sin(time * 9 + h.x), 0.9); else { add(h.x - 22, h.y - 28, 100, 0.7); add(h.x + 22, h.y - 28, 100, 0.7); } }
  for (const e of enemies) {
    if (e.type === 'dragon') { if (!e.flying) add(e.x, e.y - 40, e.enraged ? 340 : 260, 0.95); }
    else if (e.elite) add(e.x, e.y - 24, 130, 0.8);
    else if (e.type === 'bomber' && e.fuse > 0) add(e.x, e.y - 24, 130, 1);
  }
  for (const p of projectiles) if (p.kind !== 'arrow') add(p.x, p.y - 22, 130, 0.9);
  for (const g of glows) add(g.x, g.y, g.r * 1.1, g.life / g.maxLife);
  for (const m of meteors) if (m.delay < 0.3) add(m.x, m.y - (m.delay / 0.3) * 520, 220, 1);
  for (const p of props) if (p.type === 'tnt') add(p.x, p.y - 30, 90, 0.7);
  for (const pk of pickups) add(pk.x, pk.y - 10, pk.type === 'loot' ? 70 + pk.item.rarity * 25 : (pk.type === 'shield' ? 80 : 46), pk.type === 'loot' || pk.type === 'shield' ? 0.9 : 0.55);
  if (biomeIdx === 3) for (const L of lavaLights) add(L.x, L.y, 95 + 12 * Math.sin(time * 3 + L.x), 0.55);
  for (const f of flies) add(f.x, f.y - 14, 60, 0.65);
  for (const n of novas) add(n.x, n.y, n.r + 40, 0.5);
  l.globalCompositeOperation = 'source-over'; l.globalAlpha = 1;
  ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.drawImage(lightCv, 0, 0, W, H); ctx.restore();
}
function bloomPass() {
  if (!bloomCv) return;
  bloomCtx.globalCompositeOperation = 'copy'; bloomCtx.filter = 'contrast(1.7) brightness(0.9) saturate(1.25)';
  bloomCtx.drawImage(canvas, 0, 0, bloomCv.width, bloomCv.height); bloomCtx.filter = 'none';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.34; ctx.imageSmoothingEnabled = true;
  ctx.drawImage(bloomCv, 0, 0, canvas.width, canvas.height); ctx.restore();
}

// ---------- fireflies (world-space, meadow & autumn) ----------
function initFlies() {
  flies = [];
  if (biomeIdx > 1) return;
  for (let i = 0; i < 26; i++) flies.push({ x: rand(60, WORLD_W - 60), y: rand(60, WORLD_H - 60), a: rand(0, TAU), ph: rand(0, 6) });
}
function drawFlies() {
  for (const f of flies) { const a = 0.5 + 0.5 * Math.sin(time * 3 + f.ph); drawGlow(f.x, f.y - 14, 12 + 6 * a, '#d8f56a', 0.35 + 0.55 * a); }
}

// ---------- weather ----------
function pickWeather() {
  const r = Math.random();
  if (biomeIdx <= 1) weather = r < 0.5 ? 'clear' : (r < 0.8 ? 'rain' : 'storm');
  else if (biomeIdx === 2) weather = r < 0.5 ? 'clear' : 'blizzard';
  else weather = r < 0.5 ? 'clear' : 'ash';
  const cfg = { rain: [170, 16, 950, 0.18, '#bcd0ff'], storm: [240, 20, 1250, 0.3, '#c9d8ff'], blizzard: [280, 9, 430, 0.9, '#ffffff'], ash: [130, 5, 130, 0.3, '#8a7a7a'] }[weather];
  wxDrops = [];
  if (cfg) for (let i = 0; i < cfg[0]; i++) wxDrops.push({ x: rand(-100, W + 100), y: rand(-50, H), l: cfg[1] * rand(0.7, 1.3), v: cfg[2] * rand(0.8, 1.2), s: cfg[3], c: cfg[4] });
  fogBlobs = [];
  for (let i = 0; i < 8; i++) fogBlobs.push({ x: rand(0, W), y: rand(0, H), r: rand(220, 420), v: rand(6, 16), a: rand(0.07, 0.15) });
  initFlies();
  if (weather === 'storm') nextBolt = rand(2, 5);
}
function updateFx(dt) {
  if (fxDirty) initFxCanvases();
  for (const d of wxDrops) { d.y += d.v * dt; d.x += d.v * d.s * dt * 0.5; if (d.y > H + 20) { d.y = -20; d.x = rand(-100, W + 100); } if (d.x > W + 100) d.x = -100; }
  for (const b of fogBlobs) { b.x += b.v * dt * (weather === 'blizzard' ? 5 : 1); if (b.x - b.r > W) b.x = -b.r; }
  for (const f of flies) { f.a += rand(-1, 1) * dt * 3; f.x += Math.cos(f.a) * 18 * dt; f.y += Math.sin(f.a) * 12 * dt; f.x = Math.max(40, Math.min(WORLD_W - 40, f.x)); f.y = Math.max(40, Math.min(WORLD_H - 40, f.y)); }
  lightFlash = Math.max(0, lightFlash - dt * 2.5);
  if (weather === 'storm' && state === 'play') {
    nextBolt -= dt;
    if (nextBolt <= 0) { nextBolt = rand(4, 9); lightFlash = 0.9; flash('#dfe9ff', 0.5); setTimeout(() => sfx('thunder'), 350); }
  }
}
function drawFogRays() {
  const fc = FOGCOL[Math.max(0, biomeIdx)], boost = weather === 'blizzard' ? 2 : (weather === 'rain' || weather === 'storm' ? 1.4 : 1);
  for (const b of fogBlobs) { ctx.globalAlpha = Math.min(0.3, b.a * boost); ctx.drawImage(glowSprite(fc), b.x - b.r, b.y - b.r * 0.6, b.r * 2, b.r * 1.2); }
  ctx.globalAlpha = 1;
  if (weather === 'clear' && biomeIdx <= 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const x0 = W * (0.05 + 0.22 * i) + Math.sin(time * 0.35 + i * 2) * 26, w = 34 + 14 * i % 3 * 10, gr = ctx.createLinearGradient(x0, 0, x0 + W * 0.22, H);
      gr.addColorStop(0, `rgba(255,236,190,${0.1 + 0.03 * Math.sin(time * 0.8 + i)})`); gr.addColorStop(1, 'rgba(255,236,190,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + w, 0); ctx.lineTo(x0 + w + W * 0.22, H); ctx.lineTo(x0 + W * 0.22, H); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  if (biomeIdx === 2) { // aurora ribbons
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let r = 0; r < 3; r++) {
      const gr = ctx.createLinearGradient(0, 0, 0, H * 0.4); const col = ['80,255,190', '120,160,255', '200,120,255'][r];
      gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(0.5, `rgba(${col},0.1)`); gr.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, 0);
      for (let x = 0; x <= W; x += 40) ctx.lineTo(x, H * 0.1 + r * 22 + Math.sin(x * 0.006 + time * 0.5 + r) * 40);
      ctx.lineTo(W, H * 0.4); ctx.lineTo(0, H * 0.4); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}
function drawWeather() {
  if (!wxDrops.length) return;
  ctx.lineWidth = weather === 'blizzard' ? 2.2 : 1.3; ctx.lineCap = 'round';
  const c = wxDrops[0].c; ctx.strokeStyle = c; ctx.globalAlpha = weather === 'ash' ? 0.55 : 0.42; ctx.beginPath();
  for (const d of wxDrops) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l * d.s * 0.5, d.y + d.l); }
  ctx.stroke(); ctx.globalAlpha = 1;
}
function colorGrade() {
  const g = GRADE[Math.max(0, biomeIdx)];
  ctx.save(); ctx.globalCompositeOperation = 'overlay';
  const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, g[0]); gr.addColorStop(1, g[1]);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.restore();
}

// ---------- boss intro cinematic ----------
function drawIntro() {
  if (introT <= 0) return;
  const k = Math.min(1, introT / 0.5, (2.8 - introT) / 0.35), bar = H * 0.11 * Math.max(0, k);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
  const b = enemies.find(e => e.type === 'dragon'); if (!b) return;
  ctx.globalAlpha = Math.max(0, Math.min(1, (2.5 - introT) / 0.4, introT / 0.5)); ctx.textAlign = 'center';
  ctx.font = `900 ${Math.min(44, W / 16)}px 'Segoe UI', sans-serif`; ctx.lineWidth = 7; ctx.strokeStyle = '#000';
  ctx.strokeText(b.skin.name, W / 2, H - bar - 24); ctx.fillStyle = '#ff6b6b'; ctx.fillText(b.skin.name, W / 2, H - bar - 24);
  ctx.globalAlpha = 1;
}

// ---------- drawing helpers for new entities ----------
function drawEliteAura(ent) {
  const col = ELITE_AFFIX[ent.eAff].col;
  drawGlow(0, -22, 54 + 6 * Math.sin(time * 5), col, 0.5);
  ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.75;
  ctx.beginPath(); ctx.ellipse(0, 4, 26 + 2 * Math.sin(time * 6), 12, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
  if (ent.barrier > 0) { ctx.strokeStyle = '#d0bfff'; ctx.globalAlpha = 0.5 + 0.2 * Math.sin(time * 8); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -24, 38, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
}
function drawLootPickup(pk, yo) {
  const r = RARITY[pk.item.rarity], col = r.c;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(pk.x, pk.y + 4, 13, 7, 0, 0, TAU); ctx.fill();
  if (pk.item.rarity >= 1) { // light beam
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createLinearGradient(0, pk.y - 150, 0, pk.y); gr.addColorStop(0, col + '00'); gr.addColorStop(1, col + (pk.item.rarity >= 3 ? 'aa' : '66'));
    ctx.fillStyle = gr; ctx.fillRect(pk.x - 6 - pk.item.rarity * 2, pk.y - 150, 12 + pk.item.rarity * 4, 150); ctx.restore();
  }
  drawGlow(pk.x, pk.y - 14 + yo, 30 + pk.item.rarity * 6, col, 0.6);
  ctx.save(); ctx.translate(pk.x, pk.y - 14 + yo); ctx.rotate(Math.sin(pk.bob * 0.5) * 0.15);
  ctx.fillStyle = '#2b2118'; ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.rect(-10, -9, 20, 18); ctx.fill(); ctx.stroke();
  ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(SLOT_ICON[pk.item.slot], 0, 5);
  ctx.restore();
}
function drawBolt(p) {
  const y = p.y - 22, c = p.col || '#b197fc';
  drawGlow(p.x, y, p.kind === 'quake' ? 60 : 44, c, 0.85);
  ctx.save(); ctx.translate(p.x, y); ctx.rotate(p.ang);
  if (p.kind === 'quake') {
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = c; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.arc(0, 0, 30, -1.1, 1.1); ctx.arc(-14, 0, 24, 1.1, -1.1, true); ctx.closePath(); ctx.fill();
  } else {
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(-30, -7); ctx.lineTo(-30, 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(-14, -3); ctx.lineTo(-14, 3); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function drawThrust(s) {
  const p = 1 - s.life / s.maxLife, len = s.R * (0.3 + 0.9 * Math.sin(p * Math.PI * 0.5));
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.ang); ctx.scale(1, 0.8); ctx.globalAlpha = (1 - p) * 0.9; ctx.fillStyle = s.color;
  ctx.beginPath(); ctx.moveTo(len, 0); ctx.lineTo(10, -12 * (1 - p * 0.5)); ctx.lineTo(10, 12 * (1 - p * 0.5)); ctx.closePath(); ctx.fill(); ctx.restore();
}

// ======================= COMPOSED ADAPTIVE SCORE =======================
// Each biome has a hand-written 8-bar theme (notes = [16th-step, scale degree, length in 16ths]) over an 8-bar chord cycle.
// Calm: flute/bells + harp arpeggios + string pad. Fight: adds drums, driving bass, string ostinato, violin-lead. Boss: brass, choir, war drums.
let musicOn = true, musicRunning = false, musicStep = 0, musicNext = 0, musicFightUntil = 0, musicLevel = 0;
try { musicOn = localStorage.getItem('swordDragonMusic') !== '0'; } catch (e) {}
const MUS = [
  { // Emerald Meadow — A aeolian, pastoral, flute over harp
    root: 110, sc: [0, 2, 3, 5, 7, 8, 10], bpm: 100, lead: 'flute', arp: 'harp',
    ch: [[0, 'm'], [8, 'M'], [3, 'M'], [10, 'M'], [8, 'M'], [3, 'M'], [10, 'M'], [0, 'm']],
    mel: [
      [[0, 4, 3], [4, 2, 2], [6, 4, 2], [8, 7, 8]],
      [[0, 5, 3], [4, 7, 2], [6, 5, 2], [8, 4, 4], [12, 2, 4]],
      [[0, 4, 3], [4, 6, 2], [6, 4, 2], [8, 2, 6], [14, 3, 2]],
      [[0, 6, 3], [4, 4, 2], [6, 3, 2], [8, 1, 6], [14, 2, 2]],
      [[0, 7, 4], [4, 9, 4], [8, 7, 2], [10, 5, 2], [12, 7, 4]],
      [[0, 9, 4], [4, 11, 4], [8, 9, 4], [12, 7, 4]],
      [[0, 8, 4], [4, 6, 4], [8, 8, 4], [12, 10, 4]],
      [[0, 9, 3], [4, 8, 2], [6, 7, 2], [8, 4, 8]]
    ] },
  { // Autumn Grove — G dorian, warm and rolling
    root: 98, sc: [0, 2, 3, 5, 7, 9, 10], bpm: 108, lead: 'flute', arp: 'harp',
    ch: [[0, 'm'], [5, 'M'], [10, 'M'], [0, 'm'], [5, 'M'], [10, 'M'], [3, 'M'], [0, 'm']],
    mel: [
      [[0, 4, 3], [4, 2, 2], [6, 0, 2], [8, 2, 4], [12, 4, 4]],
      [[0, 5, 3], [4, 3, 2], [6, 5, 2], [8, 7, 6], [14, 5, 2]],
      [[0, 8, 3], [4, 6, 2], [6, 8, 2], [8, 10, 6], [14, 8, 2]],
      [[0, 11, 4], [4, 9, 4], [8, 7, 8]],
      [[0, 10, 3], [4, 8, 2], [6, 7, 2], [8, 5, 4], [12, 7, 4]],
      [[0, 8, 3], [4, 6, 2], [6, 8, 2], [8, 10, 4], [12, 11, 4]],
      [[0, 9, 4], [4, 11, 4], [8, 13, 4], [12, 11, 4]],
      [[0, 11, 3], [4, 9, 2], [6, 7, 2], [8, 7, 8]]
    ] },
  { // Frostfall Tundra — B aeolian, sparse, crystalline bells
    root: 123.47, sc: [0, 2, 3, 5, 7, 8, 10], bpm: 84, lead: 'bell', arp: 'bell',
    ch: [[0, 'm'], [10, 'M'], [8, 'M'], [10, 'M'], [8, 'M'], [10, 'M'], [0, 'm'], [0, 'm']],
    mel: [
      [[0, 7, 6], [8, 9, 6], [14, 8, 2]],
      [[0, 8, 6], [8, 6, 4], [12, 8, 4]],
      [[0, 7, 6], [8, 5, 4], [12, 7, 4]],
      [[0, 8, 4], [4, 10, 4], [8, 9, 4], [12, 8, 4]],
      [[0, 9, 4], [4, 7, 4], [8, 9, 4], [12, 11, 4]],
      [[0, 12, 6], [8, 10, 4], [12, 8, 4]],
      [[0, 11, 6], [8, 9, 4], [12, 7, 4]],
      [[0, 9, 4], [4, 8, 4], [8, 7, 8]]
    ] },
  { // Ashen Volcano — F phrygian, heavy and rhythmic
    root: 87.31, sc: [0, 1, 3, 5, 7, 8, 10], bpm: 116, lead: 'saw', arp: 'saw',
    ch: [[0, 'm'], [1, 'M'], [0, 'm'], [10, 'M'], [0, 'm'], [8, 'M'], [10, 'M'], [1, 'M']],
    mel: [
      [[0, 0, 2], [3, 1, 1], [4, 0, 2], [6, 2, 2], [8, 4, 4], [12, 2, 2], [14, 1, 2]],
      [[0, 1, 2], [3, 2, 1], [4, 1, 2], [6, 0, 2], [8, 1, 4], [12, 3, 2], [14, 2, 2]],
      [[0, 7, 2], [3, 8, 1], [4, 7, 2], [6, 9, 2], [8, 11, 4], [12, 9, 2], [14, 8, 2]],
      [[0, 6, 4], [4, 4, 4], [8, 6, 4], [12, 3, 2], [14, 4, 2]],
      [[0, 4, 2], [2, 7, 2], [4, 4, 2], [6, 2, 2], [8, 4, 8]],
      [[0, 5, 4], [4, 7, 2], [6, 5, 2], [8, 3, 4], [12, 5, 4]],
      [[0, 6, 2], [2, 4, 2], [4, 6, 2], [6, 7, 2], [8, 6, 4], [12, 4, 4]],
      [[0, 8, 4], [4, 7, 4], [8, 8, 4], [12, 7, 2], [14, 8, 2]]
    ] }
];
const CH = { m: [0, 3, 7], M: [0, 4, 7] };
let dlyL = null, dlyR = null;
function setMusicLevel(tc) { // applies musicOn to the bus and its reverb/delay sends
  if (!actx) return; const t = actx.currentTime, v = musicOn ? 1 : 0;
  musicBus.gain.cancelScheduledValues(t); musicBus.gain.setTargetAtTime(0.62 * v, t, tc || 0.05);
  musicRevIn.gain.cancelScheduledValues(t); musicRevIn.gain.setTargetAtTime(v, t, tc || 0.05);
  musicDlyIn.gain.cancelScheduledValues(t); musicDlyIn.gain.setTargetAtTime(v, t, tc || 0.05);
}
function toggleMusic() {
  musicOn = !musicOn; try { localStorage.setItem('swordDragonMusic', musicOn ? '1' : '0'); } catch (e) {}
  const b = $('music-btn'); if (b && b.classList && b.classList.toggle) { b.classList.toggle('off', !musicOn); b.title = musicOn ? 'Music: on (N)' : 'Music: off (N)'; }
  setMusicLevel(musicOn ? 0.3 : 0.04);
  if (musicOn && actx) musicNext = actx.currentTime + 0.1;
}
function startMusic() { if (musicRunning || !actx) return; musicRunning = true; musicNext = actx.currentTime + 0.1; setMusicLevel(0.01); musicTick(); }
function mHz(root, semis) { return root * Math.pow(2, semis / 12); }
function musicTick() {
  if (!actx) { musicRunning = false; return; }
  const now = actx.currentTime;
  const active = (state === 'play' || state === 'upgrade' || state === 'title') && !muted && musicOn;
  if (!active) { musicNext = Math.max(musicNext, now + 0.1); setTimeout(musicTick, 150); return; }
  if (state === 'play' && enemies.length > 0) musicFightUntil = performance.now() + 3500;
  const boss = state === 'play' && enemies.some(e => e.type === 'dragon');
  const fight = state === 'play' && performance.now() < musicFightUntil;
  const target = boss ? 2 : fight ? 1 : 0;
  while (musicNext < now + 0.25) {
    if (musicNext < now - 0.3) musicNext = now + 0.05;
    musicLevel += (target - musicLevel) * (target > musicLevel ? 0.12 : 0.035);
    const M = MUS[Math.max(0, Math.min(3, biomeIdx))];
    const sd = 60 / (M.bpm * (1 + musicLevel * 0.08)) / 4;
    if (dlyL) { dlyL.delayTime.setTargetAtTime(sd * 3, now, 0.05); dlyR.delayTime.setTargetAtTime(sd * 3, now, 0.05); }
    scheduleStep(musicNext, musicStep, M, sd, musicLevel, state === 'title');
    musicNext += sd; musicStep++;
  }
  setTimeout(musicTick, 40);
}
// ---- instruments (d = delay in seconds from now; all routed to the music bus) ----
function iFlute(f, dur, vol, d, pan) {
  const B = musicBus;
  voice({ f, dur, type: 'sine', vol, atk: 0.07, rel: 0.14, sustain: true, vib: [5.1, 8], delay: d, bus: B, rev: 0.55, dly: 0.28, pan });
  voice({ f: f * 2, dur, type: 'triangle', vol: vol * 0.12, atk: 0.09, rel: 0.1, sustain: true, delay: d, bus: B, pan });
  nz({ dur: Math.min(dur, 0.3), vol: vol * 0.45, atk: 0.04, fl: [f * 3, f * 3, 3, 'bandpass'], delay: d, bus: B, pan });
}
function iBell(f, dur, vol, d, pan) { fm({ f, ratio: 3.01, idx: 1.3, dur, vol, delay: d, bus: musicBus, rev: 0.7, dly: 0.5, pan }); fm({ f: f * 2, ratio: 1.5, idx: 0.6, dur: dur * 0.5, vol: vol * 0.3, delay: d, bus: musicBus, rev: 0.6, pan }); }
function iHarp(f, dur, vol, d, pan) { fm({ f, ratio: 2, idx: 1.6, dur: Math.min(dur, 0.9), vol, delay: d, bus: musicBus, rev: 0.45, dly: 0.4, pan }); voice({ f, dur: 0.25, type: 'triangle', vol: vol * 0.5, delay: d, bus: musicBus, fl: [4000, 600, 1], pan }); }
function iPluck(f, dur, vol, d, pan) { voice({ f, dur, type: 'sawtooth', n: 2, spread: 8, vol, fl: [4500, 500, 2], delay: d, bus: musicBus, rev: 0.3, dly: 0.35, pan }); }
function iStrings(f, dur, vol, d, pan) { voice({ f, dur, type: 'sawtooth', n: 4, spread: 13, vol, atk: dur * 0.3, rel: dur * 0.4, sustain: true, fl: [600, 1800, 0.7], vib: [4.8, 6], delay: d, bus: musicBus, rev: 0.7, pan }); }
function iViolin(f, dur, vol, d, pan) { voice({ f, dur, type: 'sawtooth', n: 2, spread: 7, vol, atk: 0.04, rel: 0.1, sustain: true, vib: [5.6, 12], fl: [3200, 1800, 1], delay: d, bus: musicBus, rev: 0.35, dly: 0.25, pan }); }
function iBrass(f, dur, vol, d, pan) { voice({ f, dur, type: 'sawtooth', n: 3, spread: 9, vol, atk: 0.06, rel: 0.12, sustain: true, fl: [350, 2600, 1.4], delay: d, bus: musicBus, rev: 0.45, pan }); }
function iChoir(f, dur, vol, d) {
  voice({ f, dur, type: 'sawtooth', n: 3, spread: 12, vol: vol * 3, atk: dur * 0.3, rel: dur * 0.4, sustain: true, vib: [5, 9], fl: [800, 800, 5, 'bandpass'], delay: d, bus: musicBus, rev: 0.8 });
  voice({ f, dur, type: 'sawtooth', n: 3, spread: 12, vol: vol * 2.4, atk: dur * 0.3, rel: dur * 0.4, sustain: true, fl: [1250, 1250, 6, 'bandpass'], delay: d, bus: musicBus, rev: 0.8 });
}
function iSaw(f, dur, vol, d, pan) { voice({ f, dur, type: 'sawtooth', n: 2, spread: 14, vol, atk: 0.01, rel: 0.08, sustain: true, fl: [2600, 700, 2.2], dist: true, delay: d, bus: musicBus, rev: 0.3, dly: 0.25, pan }); }
function crash(d, vol) { nz({ dur: 1.6, vol, atk: 0.005, fl: [9000, 5000, 0.8, 'highpass'], delay: d, bus: musicBus, rev: 0.5 }); fm({ f: 420, ratio: 2.76, idx: 6, dur: 1.2, vol: vol * 0.18, delay: d, bus: musicBus, rev: 0.5 }); }
function riser(d, dur, vol) { nz({ dur, vol, atk: dur * 0.95, fl: [500, 9000, 2, 'bandpass'], delay: d, bus: musicBus, rev: 0.4 }); }

function scheduleStep(t, step, M, sd, lv, title) {
  const s = step % 16, bar = Math.floor(step / 16), b8 = bar % 8, [cr, cq] = M.ch[b8], tones = CH[cq];
  const dl = Math.max(0, t - actx.currentTime), barDur = sd * 16, B = musicBus;
  const fight = lv > 0.45 && !title, boss = lv > 1.4 && !title, calm = lv < 0.99;
  const root = M.root, scHz = (deg, oct) => mHz(root * oct, M.sc[((deg % 7) + 7) % 7] + 12 * Math.floor(deg / 7));
  const chHz = (i, oct) => mHz(root * oct, cr + tones[i % 3] + 12 * Math.floor(i / 3));
  const bellish = M.lead === 'bell', volc = M.lead === 'saw';

  // --- harmonic bed: strings + deep drone, re-struck every bar ---
  if (s === 0) {
    tones.forEach((tn, i) => iStrings(mHz(root * 2, cr + tn), barDur * 1.05, 0.02 + 0.008 * lv, dl, (i - 1) * 0.4));
    voice({ f: mHz(root / 2, cr), dur: barDur * 1.02, type: 'sine', vol: 0.1 + 0.03 * lv, atk: 0.2, rel: 0.4, sustain: true, delay: dl, bus: B });
    if (boss) {
      tones.forEach(tn => iChoir(mHz(root * 2, cr + tn), barDur * 1.05, 0.018, dl));
      voice({ f: mHz(root, cr), dur: barDur, type: 'sawtooth', n: 2, spread: 22, vol: 0.035, atk: 0.1, sustain: true, fl: [200, 800, 3], dist: true, delay: dl, bus: B, rev: 0.3 });
    }
    if (b8 === 0 && fight) crash(dl, 0.18);
  }
  // --- arpeggio under the theme (calm) / sparkle (fight) ---
  const arpGrid = fight ? 4 : 2;
  if (s % arpGrid === 0 && !boss) {
    const pat = [0, 1, 2, 3, 2, 1, 4, 2], idx = pat[(s / arpGrid) % 8 | 0], f = chHz(idx, bellish ? 8 : 4), v = (fight ? 0.03 : 0.04) * (s === 0 ? 1.25 : 0.9);
    const pan = Math.sin(step * 0.7) * 0.5;
    if (M.arp === 'bell') { if (s % 4 === 0) iBell(f, 1.4, v * 1.2, dl, pan); }
    else if (M.arp === 'saw') { if (!fight) iPluck(f, 0.25, v * 0.8, dl, pan); }
    else iHarp(f, 0.8, v, dl, pan);
  }
  // --- bass ---
  const bf = o => mHz(root / 2, cr + o);
  let bassSteps;
  if (title || !fight) bassSteps = { 0: 0, 10: 7 };
  else if (boss) bassSteps = { 0: 0, 2: 0, 3: 12, 4: 0, 6: 0, 7: 12, 8: 0, 10: 0, 11: 12, 12: 0, 14: 7, 15: 5 };
  else bassSteps = { 0: 0, 2: 0, 4: 12, 6: 0, 8: 0, 10: 7, 12: 12, 14: 0 };
  if (bassSteps[s] !== undefined) {
    const f = bf(bassSteps[s]), long = (title || (!fight && s === 0)), acc = s === 0 ? 1.15 : 1;
    voice({ f, dur: sd * (long ? 7 : 1.7), type: 'sawtooth', vol: (0.07 + 0.03 * lv) * acc, fl: [900 + lv * 700, 120, 2.5], delay: dl, bus: B, atk: 0.006, dist: boss });
    voice({ f, dur: sd * (long ? 8 : 2.2), type: 'sine', vol: 0.15 * acc, delay: dl, bus: B, atk: 0.006 });
  }
  // --- string ostinato (fight: 8ths with accents; boss: 16ths) ---
  if (fight && (boss || s % 2 === 0)) {
    const acc = s % 4 === 0 ? 1.4 : s % 2 === 0 ? 1 : 0.7, nt = (s % 8 === 6 || s % 8 === 7) ? 7 : 0;
    voice({ f: mHz(root * 2, cr + nt + (s % 8 >= 4 ? 12 : 0)), dur: sd * 1.1, type: 'sawtooth', n: 2, spread: 10, vol: (boss ? 0.026 : 0.02) * acc, atk: 0.003, fl: [1800, 400, 1.4], delay: dl, bus: B, rev: 0.2 });
  }
  // --- THE THEME ---
  const notes = M.mel[b8];
  for (let k = 0; k < notes.length; k++) {
    const [st, deg, len] = notes[k]; if (st !== s) continue;
    const dur = len * sd * (fight ? 0.95 : 1.1), pan = (deg % 5 - 2) * 0.12;
    if (boss) { // brass + octave lead: the full theme at war
      iBrass(scHz(deg, 2), dur, 0.07, dl, pan); iSaw(scHz(deg, 4), dur, 0.03, dl, pan);
    } else if (fight) {
      if (bellish) iBell(scHz(deg, 4), 1.0, 0.07, dl, pan); else if (volc) iSaw(scHz(deg, 2), dur, 0.05, dl, pan); else iViolin(scHz(deg, 4), dur, 0.04, dl, pan);
      iPluck(scHz(deg, 2), sd * 1.5, 0.025, dl, pan);
    } else {
      if (bellish) iBell(scHz(deg, 4), Math.min(2.2, dur + 0.8), 0.08, dl, pan);
      else if (volc) iSaw(scHz(deg, 2), dur, 0.035, dl, pan);
      else iFlute(scHz(deg, 4), dur, title ? 0.07 : 0.085, dl, pan);
      if (!bellish && !volc && deg >= 4) iHarp(scHz(deg, 8), 0.6, 0.02, dl + sd * 0.5, -pan); // echoing harp sparkle
    }
  }
  // --- drums ---
  if (fight) {
    const v = 0.28 + 0.1 * lv, odd = bar % 2 === 1, fill = b8 === 7 && s >= 12;
    const K = boss ? [0, 4, 8, 10, 12] : odd ? [0, 8, 10] : [0, 8];
    if (K.includes(s) && !fill) kick(t, v, { bus: B });
    if ((s === 4 || s === 12) && !fill) snare(t, 0.1 + 0.05 * lv, B);
    if (boss && s === 14 && !fill) snare(t, 0.06, B);
    if (s % 2 === 0) hat(t, (0.026 + 0.012 * lv) * (s % 4 === 0 ? 1.4 : 1), B, s === 14 && odd);
    if ((boss || lv > 0.9) && s % 2 === 1) hat(t, 0.014, B);
    if (boss && [0, 3, 6, 10].includes(s)) taiko(t, 0.2, 62 + (s === 6 ? 14 : s === 10 ? 8 : 0), B);
    if (fill) { // snare roll into the next 8-bar cycle
      snare(t, 0.06 + (s - 12) * 0.03, B); if (boss) taiko(t, 0.2, 90 - (s - 12) * 8, B);
      if (s === 12) riser(dl, sd * 4, 0.1);
    }
  } else if (!title && s % 4 === 2) hat(t, 0.01 * (1 - lv), B); // calm shaker
}
{ const mb = $('music-btn'); if (mb && mb.classList && mb.classList.toggle) mb.classList.toggle('off', !musicOn); }


// ---------- DRAGON SLAIN finale: letterbox, shock rings, colour burst, god-rays, gold dust ----------
const SLAIN_LEN = 4.2;
function startSlain(e) { slainT = SLAIN_LEN; slainX = e.x; slainY = e.y; slainName = e.skin.name; }
function drawSlainWorld() { // expanding shock rings, drawn in world space
  if (slainT <= 0) return;
  const k = 1 - slainT / SLAIN_LEN;
  for (let i = 0; i < 3; i++) {
    const t = k * 1.6 - i * 0.18; if (t <= 0 || t >= 1) continue;
    const r = 40 + t * 900;
    ctx.globalAlpha = (1 - t) * 0.8; ctx.strokeStyle = i === 1 ? '#fff6d0' : '#ffc94d'; ctx.lineWidth = 16 * (1 - t) + 2;
    ctx.beginPath(); ctx.ellipse(slainX, slainY, r, r * 0.62, 0, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (k < 0.5) drawGlow(slainX, slainY - 30, 320 * (1 - k * 1.4), '#ffe9a0', 0.9 - k);
}
function drawSlain() { // screen space
  if (slainT <= 0) return;
  const el = SLAIN_LEN - slainT, k = el / SLAIN_LEN;
  const fade = Math.min(1, slainT / 0.7), inn = Math.min(1, el / 0.35);
  // desaturate the world for the first beat, then let the gold flood back
  if (el < 1.1 && ctx.globalCompositeOperation !== undefined) {
    ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = Math.min(1, el / 0.1) * (1 - el / 1.1) * 0.9; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  // rotating god-rays behind the title
  const cx = W / 2, cy = H * 0.4, R = Math.max(W, H);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(el * 0.25); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.7); g.addColorStop(0, 'rgba(255,214,120,0.38)'); g.addColorStop(1, 'rgba(255,214,120,0)');
  ctx.fillStyle = g; ctx.globalAlpha = inn * fade;
  for (let i = 0; i < 12; i++) { ctx.rotate(TAU / 12); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R * 0.7, -R * 0.045); ctx.lineTo(R * 0.7, R * 0.045); ctx.closePath(); ctx.fill(); }
  ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // gold dust rising
  for (let i = 0; i < 46; i++) {
    const sd = i * 12.9898, fx = (Math.sin(sd) * 43758.5453) % 1, sp = 40 + Math.abs((Math.sin(sd * 2.1) * 9301.7) % 1) * 90;
    const x = Math.abs(fx) * W, y = H + 20 - ((el * sp + Math.abs(Math.sin(sd * 3.7)) * H) % (H + 40));
    drawGlow(x + Math.sin(el * 2 + i) * 14, y, 5 + (i % 4) * 2, '#ffd86b', 0.8 * fade);
  }
  // letterbox
  const bar = H * 0.11 * Math.min(1, el / 0.4, slainT / 0.5);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
  // title: slams in, settles
  const pop = el < 0.45 ? 1 + (1 - el / 0.45) * 1.2 : 1 + Math.sin(el * 3) * 0.012;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(pop, pop); ctx.globalAlpha = Math.min(1, el / 0.2) * fade; ctx.textAlign = 'center';
  const fs = Math.min(84, W / 7.5); ctx.font = `900 ${fs}px Georgia, 'Times New Roman', serif`; ctx.lineJoin = 'round';
  ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(40,10,0,0.9)'; ctx.strokeText('DRAGON SLAIN', 0, 0);
  const tg = ctx.createLinearGradient(0, -fs * 0.8, 0, fs * 0.2); tg.addColorStop(0, '#fffbe0'); tg.addColorStop(0.5, '#ffd43b'); tg.addColorStop(1, '#d9730d');
  ctx.shadowColor = '#ff9a1f'; ctx.shadowBlur = 30; ctx.fillStyle = tg; ctx.fillText('DRAGON SLAIN', 0, 0); ctx.shadowBlur = 0;
  // glint sweeping across the letters
  const sw = ((el - 0.5) / 1.1); if (sw > 0 && sw < 1) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.save(); ctx.transform(1, 0, -0.35, 1, 0, 0); ctx.fillRect(-fs * 3.4 + sw * fs * 6.8, -fs * 0.8, fs * 0.22, fs); ctx.restore(); ctx.globalCompositeOperation = 'source-over'; }
  if (el > 0.6) { ctx.globalAlpha = Math.min(1, (el - 0.6) / 0.5) * fade; ctx.font = `700 ${Math.max(13, fs * 0.26)}px 'Segoe UI', sans-serif`; ctx.fillStyle = '#ffe9b0'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    const sub = slainName + ' falls  \u2014  +100 gold & legendary loot'; ctx.strokeText(sub, 0, fs * 0.55); ctx.fillText(sub, 0, fs * 0.55); }
  ctx.restore(); ctx.globalAlpha = 1;
}
