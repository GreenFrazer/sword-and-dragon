// ======================= RENDERING =======================
function rrect(x, y, w, h, r) { if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
const WEAPON_TINT = { greatsword: ['#ffb08a', '#ff6b35'], daggers: ['#d8c2ff', '#9775fa'], spear: ['#a9f0b8', '#40c057'] };
function bladeStyle() {
  if (player.lightning) return { fill: '#d0ebff', glow: '#74c0fc' };
  const t = player.swordTier, wt = WEAPON_TINT[player.weapon];
  if (wt) return { fill: wt[0], glow: t >= 4 ? wt[1] : null };
  if (t < 4) return { fill: '#e9ecef', glow: null };
  if (t < 7) return { fill: '#a5d8ff', glow: '#4dabf7' };
  if (t < 10) return { fill: '#ffe066', glow: '#fcc419' };
  return { fill: '#fcc2d7', glow: '#f06595' };
}

function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  const z = baseScale() * (1 + zoomKick);
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  ctx.translate(-(cam.x + (Math.random() - 0.5) * shake), -(cam.y + (Math.random() - 0.5) * shake));
  ctx.fillStyle = '#0b0a10'; ctx.fillRect(-1500, -1500, WORLD_W + 3000, WORLD_H + 3000);
  if (ground) ctx.drawImage(ground, 0, 0);
  drawPonds(); drawGrass();

  // scorch marks & blood decals
  for (const s of scorches) {
    ctx.globalAlpha = Math.min(0.5, s.life / (s.blood ? 8 : 14) * 0.5);
    ctx.fillStyle = s.blood ? '#5a1010' : '#000';
    ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r * 0.7, 0, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (village) for (const tw of village.towns) {
    ctx.fillStyle = 'rgba(120,90,50,0.35)'; ctx.beginPath(); ctx.ellipse(tw.x, tw.y + 22, 170, 100, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(150,115,70,0.4)'; ctx.beginPath(); ctx.ellipse(tw.x, tw.y + 22, 120, 66, 0, 0, TAU); ctx.fill();
  }
  // spike traps with warning flicker
  for (const h of hazards) {
    const active = h.timer > 2.0, warn = !active && h.timer > 1.55;
    ctx.fillStyle = '#2f2f2f'; ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.72, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r * 0.8, h.r * 0.55, 0, 0, TAU); ctx.fill();
    if (warn && Math.floor(h.timer * 12) % 2 === 0) { ctx.strokeStyle = 'rgba(255,80,60,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.72, 0, 0, TAU); ctx.stroke(); }
    if (active) {
      ctx.fillStyle = '#e9ecef';
      for (let s = -1; s <= 1; s++) for (let r = -1; r <= 1; r++) {
        ctx.beginPath(); ctx.moveTo(h.x + s * 14 - 4, h.y + r * 10); ctx.lineTo(h.x + s * 14, h.y + r * 10 - 14); ctx.lineTo(h.x + s * 14 + 4, h.y + r * 10); ctx.fill();
      }
    }
  }

  // telegraphs
  for (const e of enemies) {
    if (e.type === 'dragon') {
      const pulse = 0.2 + 0.1 * Math.sin(time * 18);
      if (e.aiState === 'breath_telegraph') { ctx.fillStyle = `rgba(255,70,50,${pulse + 0.1})`; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, 260, e.facing - 0.36, e.facing + 0.36); ctx.closePath(); ctx.fill(); }
      else if (e.aiState === 'fly_telegraph') {
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(e.targetX, e.targetY, 115, 78, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,77,77,0.6)'; ctx.beginPath(); ctx.ellipse(e.targetX, e.targetY, 115 * (e.aiTimer / 1.4), 78 * (e.aiTimer / 1.4), 0, 0, TAU); ctx.stroke();
      } else if (e.aiState === 'barrage_telegraph') {
        ctx.fillStyle = `rgba(255,140,40,${pulse})`; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, 520, e.facing - 0.5, e.facing + 0.5); ctx.closePath(); ctx.fill();
      } else if (e.aiState === 'nova_telegraph') {
        ctx.strokeStyle = `rgba(255,90,40,${0.4 + pulse})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(e.x, e.y, 420 * (1 - e.aiTimer), 420 * (1 - e.aiTimer) * 0.78, 0, 0, TAU); ctx.stroke();
      }
    } else if (e.windup > 0) {
      const pr = 1 - e.windup / 0.38;
      ctx.fillStyle = `rgba(255,60,40,${0.12 + pr * 0.3})`; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r + 44, (e.r + 44) * 0.72, 0, 0, TAU); ctx.fill();
    } else if (e.type === 'archer' && e.aim > 0) {
      ctx.strokeStyle = `rgba(255,70,50,${0.25 + (0.85 - e.aim) * 0.7})`; ctx.lineWidth = 2 + (0.85 - e.aim) * 4;
      ctx.beginPath(); ctx.moveTo(e.x, e.y - 20); ctx.lineTo(e.x + Math.cos(e.aimAng) * 460, e.y - 20 + Math.sin(e.aimAng) * 460); ctx.stroke();
    } else if (e.type === 'bomber' && e.fuse > 0) {
      ctx.strokeStyle = `rgba(255,120,30,${0.5 + 0.4 * Math.sin(time * 40)})`; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(255,100,30,0.14)';
      ctx.beginPath(); ctx.ellipse(e.x, e.y, 110, 80, 0, 0, TAU); ctx.fill(); ctx.stroke();
    }
  }
  // meteor warning rings
  for (const m of meteors) {
    ctx.strokeStyle = `rgba(255,120,30,${0.45 + 0.3 * Math.sin(time * 22)})`; ctx.fillStyle = 'rgba(255,90,20,0.12)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(m.x, m.y, m.r, m.r * 0.72, 0, 0, TAU); ctx.fill(); ctx.stroke();
    const k = Math.max(0, m.delay / m.total);
    ctx.beginPath(); ctx.ellipse(m.x, m.y, m.r * k, m.r * 0.72 * k, 0, 0, TAU); ctx.stroke();
  }

  // dash afterimages
  for (const g of ghosts) {
    ctx.globalAlpha = Math.max(0, g.life / 0.26) * 0.4;
    drawHumanoid({ ...player, ghost: true, x: g.x, y: g.y, facing: g.facing, walkPhase: g.walkPhase, hitFlash: 0, invuln: 0 }, true);
  }
  ctx.globalAlpha = 1;

  drawSunShadows();
  // depth-sorted world
  const dr = [];
  for (const t of trees) dr.push({ y: t.y, f: () => drawTree(t) });
  for (const p of props) dr.push({ y: p.y, f: () => drawProp(p) });
  for (const pk of pickups) dr.push({ y: pk.y, f: () => drawPickup(pk) });
  if (village) {
    for (const h of village.houses) dr.push({ y: h.y, f: () => drawHouse(h) });
    for (const v of village.villagers) dr.push({ y: v.y, f: () => drawVillager(v) });
  }
  if (camp) {
    dr.push({ y: camp.y, f: () => drawCamp() });
    for (const v of camp.workers) dr.push({ y: v.y, f: () => drawVillager(v) });
  }
  for (const c of companions) { if (c.down) dr.push({ y: c.gy, f: () => drawGrave(c) }); else dr.push({ y: c.y, f: () => drawHumanoid(c, false) }); }
  dr.push({ y: player.y, f: () => { if (frenzyT > 0) drawFrenzyAura(); drawHumanoid(player, true); if (player.shieldT > 0) drawPlayerShield(); } });
  for (const e of enemies) {
    if (e.type === 'dragon') { if (!e.flying) dr.push({ y: e.y, f: () => drawDragon(e) }); }
    else dr.push({ y: e.y, f: () => drawHumanoid(e, false) });
  }
  for (const p of projectiles) dr.push({ y: p.y, f: () => drawProjectile(p) });
  dr.sort((a, b) => a.y - b.y);
  for (const d of dr) d.f();

  // slash crescents
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const s of slashes) {
    if (s.thrust) { drawThrust(s); continue; }
    const p = 1 - s.life / s.maxLife, a1 = s.ang + s.dir * (-1.25 + 2.5 * p), a0 = a1 - s.dir * 1.6;
    ctx.save(); ctx.translate(s.x, s.y); ctx.scale(1, 0.8);
    ctx.globalAlpha = (1 - p) * 0.9; ctx.fillStyle = s.color;
    ctx.beginPath(); ctx.arc(0, 0, s.R, a0, a1, s.dir < 0); ctx.arc(0, 0, s.R * 0.7, a1, a0, s.dir > 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // lightning bolts
  for (const b of bolts) {
    ctx.globalAlpha = b.life / b.maxLife; ctx.strokeStyle = '#a5d8ff'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1);
    for (let i = 1; i < 6; i++) { const t = i / 6; ctx.lineTo(b.x1 + (b.x2 - b.x1) * t + Math.sin(b.seed + i * 7 + time * 40) * 14, b.y1 + (b.y2 - b.y1) * t + Math.cos(b.seed + i * 5 + time * 40) * 14); }
    ctx.lineTo(b.x2, b.y2); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.restore();

  // spin ring
  if (player.spinTime > 0) {
    const R = player.range * 1.45; ctx.strokeStyle = 'rgba(255,230,102,0.85)'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.ellipse(player.x, player.y - 14, R, R * 0.78, 0, 0, TAU); ctx.stroke();
  }
  // expanding rings
  for (const r of rings) {
    const p = 1 - r.life / r.maxLife, rad = r.maxR * (1 - Math.pow(1 - p, 3));
    ctx.globalAlpha = 1 - p; ctx.strokeStyle = r.color; ctx.lineWidth = r.w * (1 - p * 0.6);
    ctx.beginPath(); ctx.ellipse(r.x, r.y, rad, rad * 0.75, 0, 0, TAU); ctx.stroke();
  }
  for (const n of novas) {
    ctx.globalAlpha = 0.85; ctx.strokeStyle = '#ff7a2a'; ctx.lineWidth = 16;
    ctx.beginPath(); ctx.ellipse(n.x, n.y, n.r, n.r * 0.78, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 5; ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // meteors falling
  for (const m of meteors) {
    if (m.delay < 0.3) {
      const fy = -(m.delay / 0.3) * 520;
      drawGlow(m.x, m.y + fy - 10, 60, '#ff7a2a', 0.9); drawGlow(m.x, m.y + fy - 10, 28, '#ffffff', 0.95);
    }
  }
  // glows (additive lighting)
  for (const g of glows) drawGlow(g.x, g.y, g.r, g.color, g.life / g.maxLife * 0.85);
  if (bloodMoon) for (const e of enemies) if (e.type !== 'dragon') { const ex = Math.cos(e.facing) * 4; drawGlow(e.x - 5 + ex, e.y - e.r - 14, 13, '#ff1a2e', 0.9); drawGlow(e.x + 5 + ex, e.y - e.r - 14, 13, '#ff1a2e', 0.9); }
  for (const e of enemies) {
    if (e.type === 'dragon' && e.aiState === 'breath_fire') drawGlow(e.x + Math.cos(e.facing) * 120, e.y - 30 + Math.sin(e.facing) * 60, 170, e.skin.glow, 0.45 + 0.2 * Math.sin(time * 30));
    if (e.type === 'bomber' && e.fuse > 0) drawGlow(e.x, e.y - 30, 50, '#ff922b', 0.6);
  }

  drawFlies();
  // particles
  for (const p of particles) {
    const lf = Math.max(0, p.life / p.maxLife);
    if (p.kind === 'spark') { ctx.globalAlpha = lf; ctx.strokeStyle = p.color; ctx.lineWidth = p.size * 0.45; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke(); }
    else if (p.kind === 'smoke') { ctx.globalAlpha = lf * 0.35; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + (1 - lf) * 1.4), 0, TAU); ctx.fill(); }
    else if (p.kind === 'ember') { drawGlow(p.x, p.y, p.size * 2.2, p.color.length === 7 ? p.color : '#ff922b', lf); }
    else { ctx.globalAlpha = lf; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.8, 0, TAU); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const f of floatTexts) {
    ctx.globalAlpha = Math.min(1, f.life / 0.3); ctx.font = `900 ${f.size}px sans-serif`;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  drawSlainWorld(); drawImpactWorld();
  ctx.restore();

  // ---------- screen-space overlays ----------
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (biome.tint) { ctx.fillStyle = biome.tint; ctx.fillRect(0, 0, W, H); }
  lightingPass(); drawBloodMoon(); drawFogRays(); drawWeather(); colorGrade();
  for (const a of ambient) {
    if (biome.amb === 'ember') drawGlow(a.x, a.y, a.s * 2.5, a.col, 0.55 + 0.3 * Math.sin(a.ph * 3));
    else if (biome.amb === 'snow') { ctx.globalAlpha = 0.85; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(a.x, a.y, a.s * 0.6, 0, TAU); ctx.fill(); }
    else { ctx.globalAlpha = 0.85; ctx.fillStyle = a.col; ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.ph); ctx.scale(1, 0.5 + 0.5 * Math.sin(a.ph * 2)); ctx.beginPath(); ctx.ellipse(0, 0, a.s * 1.2, a.s * 0.7, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  }
  ctx.globalAlpha = 1;
  bloomPass();
  ctx.drawImage(vig, 0, 0, W, H);
  if (state !== 'title' && player.hp < player.maxHp * 0.3) {
    ctx.fillStyle = `rgba(200,0,0,${0.1 + 0.08 * Math.sin(time * 6)})`; ctx.fillRect(0, 0, W, H);
  }
  if (frenzyT > 0) { // fiery vignette
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75), a = Math.min(1, frenzyT / 1.5) * (0.4 + 0.08 * Math.sin(time * 9));
    g.addColorStop(0, 'rgba(255,90,10,0)'); g.addColorStop(1, `rgba(255,70,0,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (flashA > 0) { ctx.globalAlpha = Math.min(0.8, flashA); ctx.fillStyle = flashC; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  if (bannerT > 0 && state !== 'title') {
    const a = Math.min(1, bannerT / 0.6, (3 - bannerT) / 0.4);
    ctx.globalAlpha = Math.max(0, a); ctx.textAlign = 'center';
    const boss = bannerText.startsWith('BOSS');
    let bfs = Math.min(46, W / 14); ctx.font = `900 ${bfs}px 'Segoe UI', sans-serif`; const bw = ctx.measureText(bannerText).width; if (bw > W * 0.92) { bfs *= W * 0.92 / bw; ctx.font = `900 ${bfs}px 'Segoe UI', sans-serif`; } ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(bannerText, W / 2, H * 0.3); ctx.fillStyle = boss ? '#ff6b6b' : '#ffd43b'; ctx.fillText(bannerText, W / 2, H * 0.3);
    ctx.font = `700 ${Math.min(20, W / 30)}px 'Segoe UI', sans-serif`; ctx.fillStyle = '#e9ecef';
    ctx.strokeText(bannerSub, W / 2, H * 0.3 + 30); ctx.fillText(bannerSub, W / 2, H * 0.3 + 30);
    ctx.globalAlpha = 1;
  }
  drawVillageIndicator();
  drawIntro();
  drawSlain(); drawImpactScreen();
  if (joy.active) {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(joy.sx, joy.sy, 55, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.arc(joy.sx + joy.dx * 55, joy.sy + joy.dy * 55, 22, 0, TAU); ctx.fill();
  }
  drawMinimap();
}

function drawMinimap() {
  const sx = 150 / WORLD_W, sy = 117 / WORLD_H;
  mctx.clearRect(0, 0, 150, 117);
  mctx.fillStyle = biome.mini; mctx.fillRect(0, 0, 150, 117);
  mctx.fillStyle = 'rgba(0,0,0,0.25)'; for (const t of trees) if (treeAlive(t)) mctx.fillRect(t.x * sx - 1, t.y * sy - 1, 3, 3);
  mctx.fillStyle = '#ffd43b'; for (const p of pickups) { if (p.type === 'wood') continue; mctx.fillRect(p.x * sx - 1, p.y * sy - 1, 2, 2); }
  mctx.fillStyle = '#c4894a'; for (const p of pickups) if (p.type === 'wood') mctx.fillRect(p.x * sx - 1, p.y * sy - 1, 3, 2);
  mctx.fillStyle = '#c86a2a'; for (const p of props) mctx.fillRect(p.x * sx - 1, p.y * sy - 1, 3, 3);
  for (const e of enemies) {
    if (e.type === 'dragon') { mctx.fillStyle = '#ff2a2a'; mctx.beginPath(); mctx.arc(e.x * sx, e.y * sy, 5, 0, TAU); mctx.fill(); }
    else { mctx.fillStyle = e.type === 'archer' ? '#69db7c' : (e.type === 'bomber' ? '#ff922b' : '#ff6b6b'); mctx.fillRect(e.x * sx - 2, e.y * sy - 2, 4, 4); }
  }
  if (camp) { mctx.fillStyle = '#e8a65a'; mctx.fillRect(camp.x * sx - 3, camp.y * sy - 3, 6, 5); }
  if (village) for (const h of village.houses) { mctx.fillStyle = h.dead ? '#5a2a1a' : '#ffa94d'; mctx.fillRect(h.x * sx - 3, h.y * sy - 3, 6, 6); }
  mctx.fillStyle = '#69db7c'; for (const c of companions) if (!c.down) mctx.fillRect(c.x * sx - 2, c.y * sy - 2, 4, 4);
  mctx.fillStyle = '#4dd4ff'; mctx.beginPath(); mctx.arc(player.x * sx, player.y * sy, 3.5, 0, TAU); mctx.fill();
  const z = baseScale() * (1 + zoomKick);
  mctx.strokeStyle = 'rgba(255,255,255,0.6)'; mctx.lineWidth = 1; mctx.strokeRect(cam.x * sx, cam.y * sy, Math.min(150, W / z * sx), Math.min(117, H / z * sy));
}

function drawProjectile(p) {
  if (p.kind === 'bolt' || p.kind === 'quake') { drawBolt(p); return; }
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 8, 4, 0, 0, TAU); ctx.fill();
  const y = p.y - 22;
  if (p.kind === 'arrow') {
    ctx.save(); ctx.translate(p.x, y); ctx.rotate(p.ang);
    ctx.strokeStyle = p.friendly ? '#74c0fc' : '#d6b88a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(12, 0); ctx.stroke();
    ctx.fillStyle = p.friendly ? '#e7f5ff' : '#dee2e6'; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(10, -4); ctx.lineTo(10, 4); ctx.fill();
    ctx.fillStyle = '#c92a2a'; ctx.fillRect(-16, -3, 5, 6);
    ctx.restore();
    if (p.friendly) drawGlow(p.x, y, 22, '#74c0fc', 0.7);
  } else {
    const c = p.col || (p.friendly ? '#74c0fc' : '#ff7a2a');
    drawGlow(p.x, y, 38, c, 0.8);
    ctx.fillStyle = p.col ? '#ebfbee' : (p.friendly ? '#e7f5ff' : '#ffe066'); ctx.beginPath(); ctx.arc(p.x, y, p.r * 0.6, 0, TAU); ctx.fill();
  }
}

function drawStump(t) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(t.x, t.y + 6, t.r * 0.5, t.r * 0.28, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = biome.trunk; ctx.fillRect(t.x - 8, t.y - 6, 16, 12);
  ctx.fillStyle = '#d9b27c'; ctx.beginPath(); ctx.ellipse(t.x, t.y - 6, 8, 3.5, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(120,80,40,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(t.x, t.y - 6, 4.5, 2, 0, 0, TAU); ctx.stroke();
}
function drawTree(t) {
  if (t.fell <= 0 && t.regrow > 0) { drawStump(t); return; }
  let sw = Math.sin(time * 1.4 + t.sway) * 2.6;
  const falling = t.fell > 0, k = falling ? 1 - t.fell / 0.55 : 0;
  ctx.save();
  if (falling) { drawStump(t); ctx.translate(t.x, t.y - 4); ctx.rotate(t.dir * k * k * 1.45); ctx.globalAlpha = 1 - k * k * 0.5; ctx.translate(-t.x, -t.y + 4); }
  else {
    if (t.grow < 1) { ctx.translate(t.x, t.y); ctx.scale(t.grow, t.grow); ctx.translate(-t.x, -t.y); }
    if (t.shake > 0) sw += Math.sin(t.shake * 70) * t.shake * 18;
  }
  drawTreeBody(t, sw);
  ctx.restore();
}
function drawTreeBody(t, sw) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(t.x, t.y + 6, t.r * 1.1, t.r * 0.6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = biome.trunk; ctx.fillRect(t.x - 7, t.y - 34, 14, 38);
  if (biome.tree === 'pine') {
    for (let i = 0; i < 3; i++) {
      const y = t.y - 30 - i * 24, w = t.r * (1.25 - i * 0.28);
      ctx.fillStyle = biome.leaf1; ctx.beginPath(); ctx.moveTo(t.x + sw * (i + 1) * 0.3, y - 34); ctx.lineTo(t.x - w, y + 6); ctx.lineTo(t.x + w, y + 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = biome.leaf2; ctx.beginPath(); ctx.moveTo(t.x + sw * (i + 1) * 0.3, y - 34); ctx.lineTo(t.x - w * 0.6, y - 10); ctx.lineTo(t.x + w * 0.6, y - 10); ctx.closePath(); ctx.fill();
    }
  } else if (biome.tree === 'dead') {
    ctx.strokeStyle = biome.trunk; ctx.lineWidth = 5; ctx.lineCap = 'round';
    const br = [[-1, -50, -26], [1, -62, 24], [-1, -76, -14], [1, -44, 20]];
    for (const [d, y, x] of br) { ctx.beginPath(); ctx.moveTo(t.x, t.y - 34 + (y + 50) * 0.3); ctx.lineTo(t.x + x + sw * 0.4, t.y + y); ctx.stroke(); }
    drawGlow(t.x, t.y - 20, 36, '#ff4d1a', 0.12);
  } else {
    ctx.fillStyle = biome.leaf1; ctx.beginPath(); ctx.arc(t.x + sw * 0.5, t.y - 48, t.r, 0, TAU); ctx.fill();
    ctx.fillStyle = biome.leaf2; ctx.beginPath(); ctx.arc(t.x - 6 + sw, t.y - 54, t.r * 0.78, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.arc(t.x - 10 + sw, t.y - 60, t.r * 0.4, 0, TAU); ctx.fill();
  }
}
function drawProp(p) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 4, 20, 12, 0, 0, TAU); ctx.fill();
  if (p.type === 'tnt') {
    ctx.fillStyle = p.fuse !== undefined && Math.floor(p.fuse * 16) % 2 === 0 ? '#fff' : '#c92a2a'; ctx.fillRect(p.x - 15, p.y - 32, 30, 34);
    ctx.fillStyle = '#343a40'; ctx.fillRect(p.x - 16, p.y - 26, 32, 5); ctx.fillRect(p.x - 16, p.y - 8, 32, 5);
    ctx.fillStyle = '#ffd43b'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TNT', p.x, p.y - 13);
    drawGlow(p.x, p.y - 36, 14 + 4 * Math.sin(time * 12), '#ff922b', 0.7);
  } else {
    ctx.fillStyle = '#a47148'; ctx.fillRect(p.x - 16, p.y - 30, 32, 32);
    ctx.strokeStyle = '#6f4518'; ctx.lineWidth = 3; ctx.strokeRect(p.x - 16, p.y - 30, 32, 32);
    ctx.beginPath(); ctx.moveTo(p.x - 16, p.y - 30); ctx.lineTo(p.x + 16, p.y + 2); ctx.moveTo(p.x + 16, p.y - 30); ctx.lineTo(p.x - 16, p.y + 2); ctx.stroke();
  }
}
const SHIELD_TIME = 8;
function drawFrenzyAura() {
  const x = player.x, y = player.y - 24, p = 0.75 + 0.25 * Math.sin(time * 14), fade = Math.min(1, frenzyT / 1.5);
  drawGlow(x, y, 90 * p, '#ff7a1a', 0.5 * fade); drawGlow(x, y, 44, '#ffd43b', 0.35 * fade);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * fade; ctx.strokeStyle = '#ff9f1c'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(x, player.y + 4, 88 * (0.9 + 0.1 * p), 88 * 0.55 * (0.9 + 0.1 * p), 0, 0, TAU); ctx.stroke(); ctx.restore();
}
function drawPlayerShield() {
  const t = player.shieldT, blink = t < 2 && Math.floor(t * 8) % 2 === 0;
  if (blink) return;
  const x = player.x, y = player.y - 24, r = 40 + 2 * Math.sin(time * 5);
  ctx.save();
  drawGlow(x, y, r + 14, '#ffe066', 0.25);
  ctx.globalAlpha = 0.14; ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.globalAlpha = 0.75; ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 0.9; ctx.lineWidth = 3.5; const a = time * 2.5;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x, y, r, a + i * TAU / 3, a + i * TAU / 3 + 0.6); ctx.stroke(); }
  ctx.restore();
}
function drawPickup(pk) {
  const yo = Math.sin(pk.bob) * 4;
  if (pk.type === 'loot') { drawLootPickup(pk, yo); return; }
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(pk.x, pk.y + 4, 12, 7, 0, 0, TAU); ctx.fill();
  if (pk.type === 'gold') {
    drawGlow(pk.x, pk.y - 8 + yo, 20, '#ffd43b', 0.45);
    ctx.fillStyle = '#fcc419'; ctx.beginPath(); ctx.arc(pk.x, pk.y - 8 + yo, 8, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#e67700'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff3bf'; ctx.fillRect(pk.x - 2, pk.y - 12 + yo, 2, 5);
  } else if (pk.type === 'potion') {
    drawGlow(pk.x, pk.y - 10 + yo, 22, '#ff6b6b', 0.4);
    ctx.fillStyle = '#fa5252'; ctx.beginPath(); ctx.arc(pk.x, pk.y - 9 + yo, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e9ecef'; ctx.fillRect(pk.x - 3, pk.y - 21 + yo, 6, 5);
  } else if (pk.type === 'shield') {
    const sx = pk.x, sy = pk.y - 16 + yo, pulse = 0.5 + 0.5 * Math.sin(time * 5);
    drawGlow(sx, sy, 40 + 6 * pulse, '#ffe066', 0.55 + 0.25 * pulse);
    ctx.save(); ctx.globalAlpha = 0.35 + 0.35 * pulse; ctx.strokeStyle = '#fff3bf'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sx, sy, 22 + 4 * pulse, 0, TAU); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(sx, sy); ctx.scale(1.5, 1.5);
    ctx.beginPath(); ctx.moveTo(-10, -11); ctx.lineTo(10, -11); ctx.lineTo(10, 0); ctx.quadraticCurveTo(9, 9, 0, 13); ctx.quadraticCurveTo(-9, 9, -10, 0); ctx.closePath();
    ctx.fillStyle = '#4c6ef5'; ctx.fill(); ctx.strokeStyle = '#ffd43b'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#ffd43b'; ctx.fillRect(-1.5, -8, 3, 17); ctx.fillRect(-7, -3, 14, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-8, -9, 6, 3);
    ctx.restore();
  } else if (pk.type === 'wood') {
    drawGlow(pk.x, pk.y - 6, 26, '#ffd8a0', 0.28 + 0.1 * Math.sin(time * 4 + pk.bob));
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(pk.x, pk.y + 5, 24, 8, 0, 0, TAU); ctx.fill();
    const lg = (x, y, a) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = '#8a5a2b'; ctx.fillRect(-15, -4, 30, 8); ctx.fillStyle = '#d9b27c'; ctx.beginPath(); ctx.ellipse(15, 0, 3, 4, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-15, -4, 30, 2); ctx.restore(); };
    lg(pk.x - 4, pk.y, -0.08); lg(pk.x + 3, pk.y - 7, 0.1); if (pk.n > 2) lg(pk.x - 1, pk.y - 13, -0.04); if (pk.n > 3) lg(pk.x + 6, pk.y - 5, 0.3);
  } else {
    drawGlow(pk.x, pk.y - 12 + yo, 24, '#74c0fc', 0.5);
    ctx.save(); ctx.translate(pk.x, pk.y - 12 + yo); ctx.rotate(-0.6);
    ctx.fillStyle = '#74c0fc'; ctx.fillRect(-3, -18, 6, 24); ctx.fillStyle = '#ffd43b'; ctx.fillRect(-8, 4, 16, 4); ctx.restore();
  }
}

const TYPE_COL = { grunt: '#c92a2a', shield: '#495057', brute: '#862e9c', archer: '#2f9e44', bomber: '#e67700', squire: '#4c6ef5', ranger: '#12b886', elf: '#2b8a3e', cleric: '#f1f3f5' };
const EYE_COL = { grunt: '#ff2a2a', shield: '#ff2a2a', brute: '#ffd43b', archer: '#ffe066', bomber: '#ff922b', squire: '#4dabf7', ranger: '#4dabf7', elf: '#8ce99a', cleric: '#74c0fc' };

// ---------- procedural character animation: bob, lean, squash & stretch, lunge, springs, footsteps ----------
function charAnim(ent, isPlayer) {
  let a = ent._an;
  if (!a) a = ent._an = { px: ent.x, py: ent.y, t: time, sx: 0, sy: 0, sp: 0, st: 0, vf: ent.facing, sq: 0, sqv: 0, id: Math.random() * 6.28, hf: 0, atk: 0, dash: 0, step: 0 };
  const dtr = time - a.t;
  if (dtr > 0.0005 && hitStop <= 0) {
    const dt = Math.min(dtr, 0.1); a.t = time;
    let vx = (ent.x - a.px) / dt, vy = (ent.y - a.py) / dt;
    if (Math.hypot(vx, vy) > 1400) { vx = vy = 0; }
    a.px = ent.x; a.py = ent.y;
    const k = 1 - Math.exp(-dt * 14); a.sx += (vx - a.sx) * k; a.sy += (vy - a.sy) * k;
    const s0 = a.sp; a.sp = Math.hypot(a.sx, a.sy);
    a.st += (Math.max(-0.16, Math.min(0.16, (a.sp - s0) / dt / 2200)) - a.st) * (1 - Math.exp(-dt * 18));
    a.vf += normalizeAngle(ent.facing - a.vf) * (1 - Math.exp(-dt * 26));
    // spring-driven squash impulses: hits, swings, dash start
    const hf = ent.hitFlash > 0 ? 1 : 0; if (hf && !a.hf) a.sqv -= 3.2; a.hf = hf;
    const at = isPlayer && player.atkTimer > 0 ? 1 : 0; if (at && !a.atk) a.sqv += 2.2; a.atk = at;
    const ds = isPlayer && player.dashTime > 0 ? 1 : 0; if (ds && !a.dash) a.sqv += 4; a.dash = ds;
    a.sqv += (-a.sq * 260 - a.sqv * 15) * dt; a.sq += a.sqv * dt;
    // footstep dust when a foot plants
    const ph = Math.sin(ent.walkPhase), sgn = ph > 0 ? 1 : -1;
    if (sgn !== a.step) { a.step = sgn; if (a.sp > 90 && state === 'play' && particles.length < MAXP) particles.push({ x: ent.x + sgn * 6, y: ent.y + 3, vx: -a.sx * 0.05 + rand(-8, 8), vy: rand(-14, -4), life: 0.4, maxLife: 0.4, color: biome.path2, size: rand(2.5, 4.5), kind: 'smoke', g: 0 }); }
  }
  return a;
}
function drawHumanoid(ent, isPlayer) {
  const type = ent.type, scale = type === 'brute' ? 1.22 : (type === 'bomber' ? 0.9 : 1);
  ctx.save(); ctx.translate(ent.x, ent.y); ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(0,0,0,0.34)'; ctx.beginPath(); ctx.ellipse(0, 4, 18, 10, 0, 0, TAU); ctx.fill();
  const an = ent.ghost ? null : charAnim(ent, isPlayer);
  if (an) { // body animation (shadow stays planted on the ground)
    const nm = Math.min(1, an.sp / 240), ph = ent.walkPhase;
    const bob = -Math.abs(Math.sin(ph)) * 3.4 * nm, breathe = 1 + 0.02 * Math.sin(time * 2.4 + an.id) * (1 - nm);
    let lunge = 0, lean = Math.max(-1, Math.min(1, an.sx / 240)) * 0.15 + Math.max(-1, Math.min(1, an.sy / 240)) * 0.02;
    if (isPlayer && player.atkTimer > 0) { const pr = 1 - player.atkTimer / player.atkDuration; lunge = Math.sin(Math.min(1, pr) * Math.PI) * 7; lean += Math.cos(ent.facing) * 0.12 * Math.sin(Math.min(1, pr) * Math.PI); }
    else if (!isPlayer && ent.windup > 0) { const pr = 1 - ent.windup / 0.38; lunge = pr < 0.7 ? -pr * 5 : (pr - 0.7) / 0.3 * 12 - 3.5; lean += Math.cos(ent.facing) * (pr < 0.7 ? -0.1 : 0.16); }
    if (isPlayer && player.dashTime > 0) lean = Math.max(-1, Math.min(1, an.sx / 500)) * 0.4;
    const st = an.st + an.sq * 0.35, stride = 1 + 0.03 * Math.cos(ph * 2) * nm;
    const sxs = (1 - st * 0.6) * (isPlayer && player.dashTime > 0 ? 1.12 : 1), sys = (1 + st) * breathe * stride * (isPlayer && player.dashTime > 0 ? 0.9 : 1);
    ctx.save(); ctx.translate(Math.cos(ent.facing) * lunge, Math.sin(ent.facing) * lunge * 0.55 + bob); ctx.rotate(lean); ctx.scale(sxs, sys);
  }
  if (ent.elite) drawEliteAura(ent);
  const flashing = ent.hitFlash > 0 || (type === 'bomber' && ent.fuse > 0 && Math.floor(time * 18) % 2 === 0);
  if ((isPlayer || ent.ally) && ent.invuln > 0 && Math.floor(ent.invuln * 20) % 2 === 0) ctx.globalAlpha *= 0.55;
  const stride = Math.sin(ent.walkPhase) * 8;
  const fem = isPlayer ? meta.hero === 'f' : ent.fem;
  const aim = an ? an.vf : ent.facing, sideFlip = Math.cos(aim) >= 0 ? 1 : -1;

  // cape (player)
  if (isPlayer) {
    const sway = Math.sin(time * 6 + ent.walkPhase) * 3, back = -sideFlip;
    ctx.fillStyle = flashing ? '#fff' : (fem ? '#5f3dc4' : '#a61e1e');
    ctx.beginPath(); ctx.moveTo(-10, -35); ctx.lineTo(10, -35);
    ctx.quadraticCurveTo(12 + back * (6 + Math.min(14, Math.hypot(ent.vx || 0, ent.vy || 0) * 0.06)) + sway, -20, 8 + back * 12 + sway * 1.5, -6);
    ctx.lineTo(-8 + back * 12 + sway * 1.5, -6); ctx.quadraticCurveTo(-12 + back * 6 + sway, -20, -10, -35); ctx.fill();
  }
  // legs & boots
  ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.strokeStyle = flashing ? '#fff' : (isPlayer ? '#2b3a4a' : '#2d1e1e');
  ctx.beginPath(); ctx.moveTo(-6, -14); ctx.lineTo(-7, -2 + stride); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, -14); ctx.lineTo(7, -2 - stride); ctx.stroke();
  ctx.fillStyle = flashing ? '#fff' : '#4a3219'; ctx.fillRect(-11, -3 + stride, 8, 5); ctx.fillRect(3, -3 - stride, 8, 5);
  // torso
  ctx.fillStyle = flashing ? '#fff' : (isPlayer ? (fem ? '#d6336c' : '#1c7ed6') : TYPE_COL[type] || '#c92a2a');
  ctx.beginPath(); rrect(-12, -36, 24, 24, 6); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(-9, -33, 6, 18);
  ctx.fillStyle = '#5c3a21'; ctx.fillRect(-12, -18, 24, 5); ctx.fillStyle = '#ffd43b'; ctx.fillRect(-2, -18, 4, 5);
  if (type === 'shield' || type === 'brute') { ctx.fillStyle = flashing ? '#fff' : '#6c757d'; ctx.beginPath(); ctx.arc(-11, -34, 6, 0, TAU); ctx.arc(11, -34, 6, 0, TAU); ctx.fill(); }
  // long hair behind the head (female heroes and companions)
  const hairCol = flashing ? '#fff' : (isPlayer ? '#e6b45e' : type === 'elf' ? '#f1e6a6' : (type === 'cleric' ? '#c9a46a' : (type === 'squire' ? '#8a4b2a' : '#3b2a1a')));
  if (fem) { ctx.fillStyle = hairCol; ctx.beginPath(); rrect(-11, -52, 22, 30 + Math.sin(ent.walkPhase) * 1.5, 9); ctx.fill(); }
  // head
  ctx.fillStyle = flashing ? '#fff' : ((isPlayer || ent.ally) ? '#ffdbac' : '#94d82d');
  ctx.beginPath(); ctx.arc(0, -44, 10, 0, TAU); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
  if (isPlayer) {
    ctx.fillStyle = '#fcc419'; ctx.fillRect(-10, -49, 20, 4);
    ctx.fillStyle = fem ? hairCol : '#3b2a1a'; ctx.beginPath(); ctx.arc(0, -48, 10, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = '#222'; ctx.fillRect(-4 + sideFlip * 2, -45, 2.5, 3); ctx.fillRect(2 + sideFlip * 2, -45, 2.5, 3);
  } else {
    if (type === 'archer' || type === 'ranger' || type === 'elf') { ctx.fillStyle = flashing ? '#fff' : (ent.ally ? (type === 'elf' ? '#5c940d' : '#0b7a5a') : '#1b6b30'); ctx.beginPath(); ctx.arc(0, -46, 11.5, Math.PI * 0.95, TAU * 1.03); ctx.fill(); }
    if (type === 'shield' || type === 'brute' || type === 'squire') { ctx.fillStyle = flashing ? '#fff' : (ent.ally ? '#ced4da' : '#868e96'); ctx.beginPath(); ctx.arc(0, -47, 10.5, Math.PI, TAU); ctx.fill(); ctx.fillRect(-1.5, -57, 3, 8); if (ent.ally) { ctx.fillStyle = '#e03131'; ctx.fillRect(-2, -62, 4, 7); } }
    if (type === 'cleric') { ctx.fillStyle = flashing ? '#fff' : '#f8f9fa'; ctx.beginPath(); ctx.arc(0, -46, 11.5, Math.PI * 0.9, TAU * 1.05); ctx.fill(); ctx.fillStyle = '#ffd43b'; ctx.fillRect(-4, -57, 8, 3); }
    if (fem) { ctx.fillStyle = hairCol; ctx.beginPath(); ctx.arc(0, -46, 10.5, Math.PI * 1.02, TAU * 0.99); ctx.fill(); }
    if (type === 'elf') { // pointed ears
      ctx.fillStyle = flashing ? '#fff' : '#ffdbac'; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 9, -48); ctx.lineTo(s * 19, -55); ctx.lineTo(s * 10, -42); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    }
    ctx.fillStyle = EYE_COL[type] || '#f00'; ctx.fillRect(-5, -45, 3, 3); ctx.fillRect(2, -45, 3, 3);
  }
  // arms
  const skin = flashing ? '#fff' : ((isPlayer || ent.ally) ? '#ffdbac' : '#94d82d');
  const offA = aim + 0.65 * sideFlip, osx = -11 * sideFlip, osy = -31, ohx = osx + Math.cos(offA) * 14, ohy = osy + Math.sin(offA) * 10;
  ctx.strokeStyle = skin; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(osx, osy); ctx.lineTo(ohx, ohy); ctx.stroke();
  if (ent.hasShield) {
    ctx.save(); ctx.translate(ohx + Math.cos(aim) * 6, ohy + Math.sin(aim) * 4);
    ctx.fillStyle = flashing ? '#fff' : '#adb5bd'; ctx.strokeStyle = '#343a40'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill(); ctx.restore();
  }
  let swing = 0;
  if (isPlayer && player.spinTime > 0) swing = (player.spinTime / 0.34) * Math.PI * 4;
  else if (isPlayer && player.atkTimer > 0) swing = (1 - player.atkTimer / player.atkDuration - 0.5) * 2.4 * player.atkDir;
  else if (!isPlayer && ent.windup > 0) swing = -0.9 * sideFlip;
  const wa = aim + swing, wsx = 11 * sideFlip, wsy = -31, whx = wsx + Math.cos(wa) * 15, why = wsy + Math.sin(wa) * 11;
  ctx.strokeStyle = skin; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(wsx, wsy); ctx.lineTo(whx, why); ctx.stroke();

  if (type === 'archer' || type === 'ranger' || type === 'elf') {
    ctx.save(); ctx.translate(whx, why); ctx.rotate(aim);
    ctx.strokeStyle = '#8d5a2b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 15, -1.2, 1.2); ctx.stroke();
    const pull = ent.aim > 0 ? 8 : 0;
    ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(15 * Math.cos(-1.2), 15 * Math.sin(-1.2)); ctx.lineTo(-pull, 0); ctx.lineTo(15 * Math.cos(1.2), 15 * Math.sin(1.2)); ctx.stroke();
    if (ent.aim > 0) { ctx.strokeStyle = '#d6b88a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-pull, 0); ctx.lineTo(18, 0); ctx.stroke(); }
    ctx.restore();
  } else if (type === 'cleric') {
    ctx.strokeStyle = '#a47148'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(whx, why + 8); ctx.lineTo(whx + Math.cos(wa) * 6, why - 36); ctx.stroke();
    drawGlow(whx + Math.cos(wa) * 6, why - 38, 16 + (ent.windup > 0 ? 10 : 0), '#69db7c', 0.85);
    ctx.fillStyle = '#d3f9d8'; ctx.beginPath(); ctx.arc(whx + Math.cos(wa) * 6, why - 38, 4, 0, TAU); ctx.fill();
  } else if (type === 'bomber') {
    ctx.fillStyle = '#212529'; ctx.beginPath(); ctx.arc(whx + 2, why - 6, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(whx - 1, why - 9, 3, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(whx + 2, why - 15); ctx.lineTo(whx + 5, why - 20); ctx.stroke();
    drawGlow(whx + 5, why - 20, 10 + 4 * Math.sin(time * 30), '#ffd43b', 0.9);
  } else {
    ctx.save(); ctx.translate(whx, why); ctx.rotate(wa);
    const wk = isPlayer ? player.weapon : 'sword';
    const bs = isPlayer ? bladeStyle() : { fill: '#ced4da', glow: null };
    const bf = flashing ? '#fff' : bs.fill;
    if (wk === 'spear') {
      const L = 62 + Math.min(player.swordTier, 12) * 2;
      ctx.strokeStyle = flashing ? '#fff' : '#7a4a24'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(L, 0); ctx.stroke();
      ctx.fillStyle = bf; ctx.strokeStyle = '#343a40'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(L - 4, -6); ctx.lineTo(L + 20, 0); ctx.lineTo(L - 4, 6); ctx.lineTo(L, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = flashing ? '#fff' : '#c1272d'; ctx.fillRect(L - 9, -4, 4, 8);
      if (bs.glow) drawGlow(L + 10, 0, 18, bs.glow, 0.8);
    } else if (wk === 'daggers') {
      for (const o of [-0.35, 0.35]) {
        ctx.save(); ctx.rotate(o);
        ctx.fillStyle = '#fcc419'; ctx.fillRect(0, -5, 3, 10);
        ctx.fillStyle = bf; ctx.beginPath(); ctx.moveTo(3, -3); ctx.lineTo(24, -1.5); ctx.lineTo(31, 0); ctx.lineTo(24, 1.5); ctx.lineTo(3, 3); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#343a40'; ctx.lineWidth = 1; ctx.stroke();
        if (bs.glow) drawGlow(26, 0, 12, bs.glow, 0.8);
        ctx.restore();
      }
    } else {
      const big = wk === 'greatsword';
      ctx.fillStyle = '#fcc419'; ctx.fillRect(0, big ? -9 : -6, big ? 6 : 4, big ? 18 : 12);
      const bl = isPlayer ? ((big ? 46 : 32) + Math.min(player.swordTier, 12) * 3) : 26, hw = big ? 6 : 3.5;
      ctx.fillStyle = bf;
      ctx.beginPath(); ctx.moveTo(6, -hw); ctx.lineTo(4 + bl, -hw * 0.6); ctx.lineTo(4 + bl + 8, 0); ctx.lineTo(4 + bl, hw * 0.6); ctx.lineTo(6, hw); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#343a40'; ctx.lineWidth = 1.2; ctx.stroke();
      if (bs.glow) { drawGlow(4 + bl * 0.6, 0, 26, bs.glow, 0.7); drawGlow(4 + bl, 0, 16, bs.glow, 0.9); }
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  if (an) ctx.restore();
  if (ent.ally) {
    const bw = 42, pct = Math.max(0, ent.hp / ent.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(-bw / 2, -66, bw, 6);
    ctx.fillStyle = pct > 0.4 ? '#69db7c' : '#ffa94d'; ctx.fillRect(-bw / 2 + 1, -65, (bw - 2) * pct, 4);
    ctx.fillStyle = '#d3f9d8'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(ent.name, 0, -71);
  } else if (!isPlayer) {
    const bw = 40, pct = Math.max(0, ent.hp / ent.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(-bw / 2, -64, bw, 6);
    ctx.fillStyle = pct > 0.5 ? '#ff4d4d' : '#ff922b'; ctx.fillRect(-bw / 2 + 1, -63, (bw - 2) * pct, 4);
    if (ent.hasShield) { ctx.fillStyle = '#74c0fc'; ctx.fillRect(-bw / 2, -70, bw * ((ent.maxShieldHits - ent.shieldHits) / ent.maxShieldHits), 3); }
    if (ent.stun > 0) { ctx.fillStyle = '#ffd43b'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('STUNNED!', 0, -74); }
  }
  ctx.restore();
}

function drawDragon(d) {
  const sk = d.skin, fl = d.hitFlash > 0, C = c => fl ? '#fff' : c;
  ctx.save(); ctx.translate(d.x, d.y);
  const stride = Math.sin(d.walkPhase) * 10, wing = Math.sin(d.wingPhase) * (d.enraged ? 24 : 18);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(0, 10, 58, 30, 0, 0, TAU); ctx.fill();
  if (d.enraged) drawGlow(0, -40, 130, '#ff2a2a', 0.3 + 0.15 * Math.sin(time * 8));
  // tail
  for (let i = d.tail.length - 1; i >= 0; i--) {
    const s = d.tail[i], r = 11 - i * 1.05, tx = s.x - d.x, ty = s.y - d.y - 22;
    ctx.fillStyle = C(sk.body); ctx.beginPath(); ctx.arc(tx, ty, Math.max(3, r), 0, TAU); ctx.fill();
    ctx.fillStyle = C(sk.belly); ctx.beginPath(); ctx.moveTo(tx - 3, ty - r + 1); ctx.lineTo(tx, ty - r - 7); ctx.lineTo(tx + 3, ty - r + 1); ctx.fill();
  }
  ctx.fillStyle = C(sk.leg); ctx.fillRect(-28, -22 + stride, 16, 26); ctx.fillRect(12, -22 - stride, 16, 26);
  ctx.fillStyle = '#f1f3f5'; for (const x of [-28, -22, -16, 12, 18, 24]) { ctx.beginPath(); ctx.moveTo(x, 4 + (x < 0 ? stride : -stride)); ctx.lineTo(x + 3, 10 + (x < 0 ? stride : -stride)); ctx.lineTo(x + 6, 4 + (x < 0 ? stride : -stride)); ctx.fill(); }
  // wings with ribs
  for (const s of [-1, 1]) {
    ctx.fillStyle = C(sk.wing); ctx.beginPath(); ctx.moveTo(18 * s, -45); ctx.lineTo(86 * s, -78 + wing); ctx.lineTo(70 * s, -48 + wing * 0.4); ctx.lineTo(56 * s, -24); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(18 * s, -45); ctx.lineTo(86 * s, -78 + wing); ctx.moveTo(18 * s, -45); ctx.lineTo(70 * s, -48 + wing * 0.4); ctx.moveTo(18 * s, -45); ctx.lineTo(56 * s, -24); ctx.stroke();
  }
  // torso & spikes
  ctx.fillStyle = C(sk.body); ctx.beginPath(); ctx.ellipse(0, -38, 36, 28, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#1a0505'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = C(sk.belly); ctx.beginPath(); ctx.ellipse(0, -34, 20, 18, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = C(sk.belly); for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 12 - 5, -62); ctx.lineTo(i * 12, -74); ctx.lineTo(i * 12 + 5, -62); ctx.fill(); }
  // head
  const hx = Math.cos(d.facing) * 26, hy = -70 + Math.sin(d.facing) * 11;
  const mouth = d.aiState === 'breath_telegraph' || d.aiState === 'breath_fire' || d.aiState === 'barrage_telegraph';
  ctx.fillStyle = C(sk.head); ctx.beginPath(); ctx.arc(hx, hy, 20, 0, TAU); ctx.fill(); ctx.strokeStyle = '#1a0505'; ctx.stroke();
  const sx = hx + Math.cos(d.facing) * 15, sy = hy + 5 + Math.sin(d.facing) * 4;
  ctx.fillStyle = C(sk.head); ctx.beginPath(); ctx.ellipse(sx, sy, 14, 9, 0, 0, TAU); ctx.fill(); ctx.stroke();
  if (mouth) { drawGlow(sx + Math.cos(d.facing) * 8, sy + 2, 34, sk.glow, 0.9); ctx.fillStyle = sk.fire[1]; ctx.beginPath(); ctx.ellipse(sx + Math.cos(d.facing) * 8, sy + 2, 7, 4, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#ffd43b';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + 10 * s, hy - 14); ctx.lineTo(hx + 22 * s, hy - 36); ctx.lineTo(hx + 3 * s, hy - 18); ctx.fill(); }
  ctx.fillStyle = d.enraged ? '#ff2a2a' : '#ffe066';
  ctx.beginPath(); ctx.arc(hx - 7, hy - 3, 3.8, 0, TAU); ctx.arc(hx + 7, hy - 3, 3.8, 0, TAU); ctx.fill();
  drawGlow(hx, hy - 3, 18, d.enraged ? '#ff2a2a' : '#ffe066', 0.5);
  if (d.aiState === 'recover') { ctx.fillStyle = '#69db7c'; ctx.font = '900 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('VULNERABLE!', 0, -112); }
  ctx.restore();
}

function drawHouse(h) {
  ctx.save(); ctx.translate(h.x, h.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 10, 52, 18, 0, 0, TAU); ctx.fill();
  if (h.dead) {
    ctx.fillStyle = '#2b1d16'; ctx.fillRect(-36, -8, 72, 14); ctx.fillStyle = '#3d2a1e'; ctx.fillRect(-26, -20, 22, 14); ctx.fillRect(8, -16, 24, 12);
    ctx.strokeStyle = '#1a110c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-30, -6); ctx.lineTo(-10, -34); ctx.moveTo(14, -8); ctx.lineTo(30, -30); ctx.stroke();
    drawGlow(0, -14, 56, '#ff6a1a', 0.4 + 0.15 * Math.sin(time * 9 + h.x));
    ctx.restore(); return;
  }
  const fl = h.hitFlash > 0, wall = ['#d9b98a', '#cdb08a', '#e0c298'][h.v], roof = ['#b5442b', '#3b6fb5', '#7a4a9a'][h.v];
  ctx.fillStyle = fl ? '#fff' : wall; ctx.fillRect(-34, -44, 68, 50); ctx.strokeStyle = '#4a3220'; ctx.lineWidth = 2.5; ctx.strokeRect(-34, -44, 68, 50);
  ctx.strokeStyle = 'rgba(74,50,32,0.6)'; ctx.beginPath(); ctx.moveTo(-34, -20); ctx.lineTo(34, -20); ctx.moveTo(0, -44); ctx.lineTo(0, -20); ctx.stroke();
  ctx.fillStyle = '#5c3a21'; ctx.fillRect(-8, -26, 16, 32);
  ctx.fillStyle = '#ffe8a3'; ctx.fillRect(-28, -36, 11, 11); ctx.fillRect(17, -36, 11, 11);
  drawGlow(-22, -30, 18, '#ffd43b', 0.28); drawGlow(22, -30, 18, '#ffd43b', 0.28);
  ctx.fillStyle = fl ? '#fff' : roof; ctx.beginPath(); ctx.moveTo(-46, -42); ctx.lineTo(0, -86); ctx.lineTo(46, -42); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = '#6b4a30'; ctx.fillRect(18, -82, 9, 22);
  if (h.hp < h.maxHp) {
    const bw = 64, pct = h.hp / h.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(-bw / 2, -104, bw, 8); ctx.fillStyle = pct > 0.4 ? '#ffd43b' : '#ff6b6b'; ctx.fillRect(-bw / 2 + 1, -103, (bw - 2) * pct, 6);
    if (pct < 0.4) drawGlow(0, -50, 46, '#ff6a1a', 0.3);
  }
  ctx.restore();
}
function drawVillager(v) {
  const scared = v.scared;
  const run = scared || v.moving, bob = Math.sin(time * (scared ? 14 : v.moving ? 10 : 2.5) + v.ph) * (scared ? 3 : v.moving ? 2 : 1.2), sx = v.moving || scared ? 0 : Math.sin(time * 1.3 + v.ph) * 2;
  ctx.save(); ctx.translate(v.x + sx, v.y + bob * 0.3);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 3, 7, 3, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = v.col; ctx.fillRect(-4, -14 + bob * 0.2, 8, 13); ctx.fillStyle = '#ffdbac'; ctx.beginPath(); ctx.arc(0, -18 + bob * 0.2, 4.5, 0, TAU); ctx.fill();
  if (v.carry > 0 && !scared) { ctx.save(); ctx.translate(0, -13 + bob * 0.2); ctx.rotate(0.3); ctx.fillStyle = '#8a5a2b'; ctx.fillRect(-9, -3, 18, 5); ctx.fillStyle = '#d9b27c'; ctx.fillRect(7, -3, 2, 5); ctx.restore(); }
  ctx.strokeStyle = '#ffdbac'; ctx.lineWidth = 2;
  if (scared) { ctx.beginPath(); ctx.moveTo(-4, -12); ctx.lineTo(-8, -22 + bob); ctx.moveTo(4, -12); ctx.lineTo(8, -22 - bob); ctx.stroke(); ctx.fillStyle = '#ffd43b'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', 0, -28); }
  ctx.restore();
}
function drawCamp() {
  const c = camp, x = c.x, y = c.y;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(0, 8, 56, 17, 0, 0, TAU); ctx.fill();
  // tent
  ctx.fillStyle = '#b5784a'; ctx.beginPath(); ctx.moveTo(-44, 4); ctx.lineTo(-4, -50); ctx.lineTo(36, 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d9a066'; ctx.beginPath(); ctx.moveTo(-4, -50); ctx.lineTo(36, 4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3b2a1c'; ctx.beginPath(); ctx.moveTo(-14, 4); ctx.lineTo(-4, -22); ctx.lineTo(8, 4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-4, -50); ctx.lineTo(-4, -62); ctx.stroke();
  ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.moveTo(-4, -62); ctx.lineTo(10, -57); ctx.lineTo(-4, -52); ctx.closePath(); ctx.fill();
  // stockpile of logs grows with the stock
  const n = Math.min(10, Math.ceil(campStock / 2.4));
  for (let i = 0; i < n; i++) {
    const col = i % 3, row = Math.floor(i / 3);
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(34 + col * 7 - row * 3, 4 - row * 6, 7, 5);
    ctx.fillStyle = '#d9b27c'; ctx.fillRect(34 + col * 7 - row * 3 + 5, 4 - row * 6, 2, 5);
  }
  if (campStock > 0) { ctx.fillStyle = '#ffe9c2'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`🪵 ${campStock}`, 46, -18); }
  // little fire
  drawGlow(-62, -2, 26, '#ff9f43', 0.35 + 0.1 * Math.sin(time * 9));
  ctx.fillStyle = '#ff922b'; ctx.beginPath(); ctx.ellipse(-62, -4, 4, 7 + Math.sin(time * 11) * 1.5, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawGrave(c) {
  ctx.save(); ctx.translate(c.gx, c.gy);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 4, 16, 7, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#adb5bd'; ctx.beginPath(); ctx.moveTo(-10, 2); ctx.lineTo(-10, -22); ctx.arc(0, -22, 10, Math.PI, 0); ctx.lineTo(10, 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#495057'; ctx.fillRect(-1.5, -26, 3, 12); ctx.fillRect(-5, -22, 10, 3);
  drawGlow(0, -16, 34, '#b2f2bb', 0.35 + 0.2 * Math.sin(time * 4));
  if (c.rev > 0) { ctx.strokeStyle = '#69db7c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -14, 24, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, c.rev / 2.5)); ctx.stroke(); }
  if (Math.hypot(player.x - c.gx, player.y - c.gy) < 170) { ctx.fillStyle = '#d3f9d8'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`Stand near to revive ${c.name}`, 0, -42); }
  ctx.restore();
}
function worldToScreen(wx, wy) { const z = baseScale() * (1 + zoomKick); return { x: ((wx - cam.x) - W / 2) * z + W / 2, y: ((wy - cam.y) - H / 2) * z + H / 2 }; }
function drawVillageIndicator() {
  if (!village || housesAlive() === 0 || state === 'title') return;
  for (const tw of village.towns) {
    if (tw.houses.every(h => h.dead)) continue;
    const p = worldToScreen(tw.x, tw.y), m = 44;
    if (p.x > m && p.x < W - m && p.y > m + 70 && p.y < H - m) continue;
    const dx = p.x - W / 2, dy = p.y - H / 2;
    const sc = Math.min((W / 2 - m) / Math.abs(dx || 1), (H / 2 - m - 40) / Math.abs(dy || 1));
    const ix = W / 2 + dx * sc, iy = H / 2 + dy * sc + 10, ang = Math.atan2(dy, dx);
    const hurt = tw.houses.some(h => h.hitFlash > 0), pulse = 0.75 + 0.25 * Math.sin(time * (hurt ? 16 : 5));
    ctx.save(); ctx.translate(ix, iy); ctx.globalAlpha = pulse;
    ctx.fillStyle = hurt ? 'rgba(180,30,30,0.9)' : 'rgba(40,26,12,0.88)'; ctx.strokeStyle = '#f59f00'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('🏠', 0, 7);
    if (village.towns.length > 1) { ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#ffd43b'; ctx.fillText('AB'[tw.idx], 0, -24); }
    ctx.rotate(ang); ctx.fillStyle = '#f59f00'; ctx.beginPath(); ctx.moveTo(32, 0); ctx.lineTo(22, -8); ctx.lineTo(22, 8); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

// ======================= HUD =======================
const hudCache = {};
const hudFx = { ghost: 1, hold: 0, gold: 0, pop: 0, wave: -1, tot: 0 };
function setText(id, v) { if (hudCache[id] === v) return; hudCache[id] = v; $(id).textContent = v; }
function setStyle(id, prop, v) { const k = id + prop; if (hudCache[k] === v) return; hudCache[k] = v; $(id).style[prop] = v; }
function setClass(id, cls, on) { const k = id + '.' + cls; if (hudCache[k] === on) return; hudCache[k] = on; $(id).classList[on ? 'add' : 'remove'](cls); }

function updateHUD() {
  if (typeof coachTick === 'function') coachTick();
  if (typeof rivalTick === 'function') rivalTick();
  setStyle('pausebtn', 'display', 'block');
  setText('hp-text', `${Math.ceil(player.hp)} / ${player.maxHp}`);
  const hpR = Math.max(0, Math.min(1, player.hp / player.maxHp));
  // damage trail: the gold ghost bar holds briefly, then drains down to the real health
  if (hpR >= hudFx.ghost) { hudFx.ghost = hpR; hudFx.hold = 0; } else if (++hudFx.hold > 24) hudFx.ghost = Math.max(hpR, hudFx.ghost - 0.012);
  setStyle('hp-bar', 'width', `${(hpR * 100).toFixed(1)}%`);
  setStyle('hp-ghost', 'width', `${(hudFx.ghost * 100).toFixed(1)}%`);
  setClass('hud-hero', 'low', hpR < 0.3 && player.hp > 0);
  if (gold > hudFx.gold) hudFx.pop = 22; hudFx.gold = gold;
  setClass('gold-chip', 'pop', hudFx.pop > 0 && hudFx.pop-- > 0);
  setText('wave-text', wave); setText('gold-text', gold); setText('wood-text', wood); setText('sword-text', player.swordTier);
  const foes = enemies.length + waveQueue.length;
  if (hudFx.wave !== wave) { hudFx.wave = wave; hudFx.tot = 0; }
  hudFx.tot = Math.max(hudFx.tot, foes);
  setText('enemies-text', foes); setText('biome-text', biome.name);
  setStyle('foe-ring', 'strokeDashoffset', (169.6 * (hudFx.tot ? foes / hudFx.tot : 1)).toFixed(1));
  setClass('hud-foes', 'clear', foes === 0);
  const boss = enemies.find(e => e.type === 'dragon');
  if (boss) { setStyle('boss-hud', 'display', 'flex'); setText('boss-name', boss.skin.name + (boss.enraged ? ' — ENRAGED' : '')); setStyle('boss-bar-fill', 'width', `${Math.max(0, boss.hp / boss.maxHp * 100)}%`); }
  else setStyle('boss-hud', 'display', 'none');
  if (player.dashCd > 0) { setStyle('cd-dash', 'display', 'flex'); setText('cd-dash', player.dashCd.toFixed(1)); } else setStyle('cd-dash', 'display', 'none');
  if (player.spinCd > 0) { setStyle('cd-spin', 'display', 'flex'); setText('cd-spin', player.spinCd.toFixed(1)); } else setStyle('cd-spin', 'display', 'none');
  setText('cast-pips', '●'.repeat(player.cast) + '○'.repeat(3 - player.cast));
  setStyle('ult-charge', 'height', `${player.ult}%`);
  setText('ult-text', player.ult >= 100 ? '[Q] READY' : `[Q] ${Math.floor(player.ult)}%`);
  setClass('btn-ult', 'ready', player.ult >= 100);
  companions.forEach((c, i) => {
    setStyle(`pb-${i}`, 'width', `${c.down ? 0 : Math.max(0, c.hp / c.maxHp * 100)}%`);
    setText(`pl-${i}`, c.down ? `💀 ${c.name} — revive at grave` : `${CTYPES[c.type].icon} ${c.name}`);
  });
  if (village) {
    const alive = housesAlive(), tot = village.houses.reduce((a, h) => a + h.hp, 0), mx = village.houses.reduce((a, h) => a + h.maxHp, 0);
    setStyle('village-hud', 'display', 'block');
    const multi = village.towns.length > 1;
    setText('village-text', village.lost ? (multi ? '🔥 BOTH TOWNS HAVE FALLEN' : '🔥 THE VILLAGE HAS FALLEN') : (multi ? `🏠 DEFEND BOTH TOWNS  ` + village.towns.map(t => 'AB'[t.idx] + ' ' + t.houses.filter(h => !h.dead).length + '/' + t.houses.length).join(' · ') : `🏠 DEFEND THE VILLAGE  ${alive}/${village.houses.length}`));
    setStyle('village-bar', 'width', `${tot / mx * 100}%`);
  } else setStyle('village-hud', 'display', 'none');
  setClass('combo', 'frenzy', frenzyT > 0);
  if (combo >= 2 || frenzyT > 0) {
    setStyle('combo', 'display', 'block');
    if (frenzyT > 0) { setText('combo-text', `🔥 FRENZY x${combo}`); setText('combo-sub', `${frenzyT.toFixed(1)}s · +40% dmg · +35% speed`); }
    else { setText('combo-text', `x${combo} COMBO`); setText('combo-sub', frenzyCd > 0 ? `+${Math.round(Math.min(combo, 20) * 5)}% gold` : (combo >= FRENZY_AT - 4 ? `FRENZY IN ${FRENZY_AT - combo}!` : `+${Math.round(Math.min(combo, 20) * 5)}% gold · frenzy at ${FRENZY_AT}`)); }
  } else setStyle('combo', 'display', 'none');
}

// ======================= START =======================
