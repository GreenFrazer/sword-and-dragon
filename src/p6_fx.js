// ======================= VISUAL FX: lighting, bloom, weather, fog, grass, ponds, intro, music =======================
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
  for (const pk of pickups) add(pk.x, pk.y - 10, pk.type === 'loot' ? 70 + pk.item.rarity * 25 : 46, pk.type === 'loot' ? 0.9 : 0.55);
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

// ======================= PROCEDURAL MUSIC =======================
let musicRunning = false, musicStep = 0;
const SCALES = [[0, 3, 5, 7, 10], [0, 2, 3, 7, 8], [0, 2, 3, 5, 7], [0, 1, 5, 7, 8]];
const ROOTS = [110, 98, 123.47, 87.31], PROG = [0, 5, 3, 4];
function startMusic() { if (musicRunning || !actx) return; musicRunning = true; musicLoop(); }
function musicLoop() {
  if (!actx) { musicRunning = false; return; }
  const bi = Math.max(0, biomeIdx), root = ROOTS[bi], sc = SCALES[bi];
  const boss = enemies.some(e => e.type === 'dragon'), fight = state === 'play' && (enemies.length > 0), active = state === 'play' || state === 'upgrade';
  if (active && !muted) {
    const chord = PROG[Math.floor(musicStep / 8) % 4], f = (n, oct) => root * Math.pow(2, (n + chord * 2) / 12) * oct;
    if (musicStep % 4 === 0) tone(f(0, 0.5), 0.9, 'triangle', boss ? 0.075 : 0.05);
    if (boss && musicStep % 2 === 0) { noise(0.09, 0.07, 120); }
    if (fight && musicStep % 4 === 2) noise(0.04, 0.03, 4000, 'highpass');
    if (Math.random() < (fight ? 0.7 : 0.4)) tone(f(sc[Math.floor(Math.random() * sc.length)], boss ? 2 : 4), 0.4, boss ? 'sawtooth' : 'sine', boss ? 0.018 : 0.03);
    if (musicStep % 16 === 0) tone(f(7, 1), 1.8, 'sine', 0.025);
  }
  musicStep++;
  setTimeout(musicLoop, boss ? 150 : 230);
}
