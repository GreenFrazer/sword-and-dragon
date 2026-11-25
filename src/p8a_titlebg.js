// ======================= TITLE SCREEN BACKDROP (procedural, parallax, animated) =======================
const TB = { cv: null, c: null, w: 0, h: 0, dpr: 1, t: 0, mx: 0, my: 0, tmx: 0, tmy: 0, stars: [], emb: [], ready: false, flash: 0, nextFlash: 6, sprE: null, sprF: null, seeds: [] };
function tbInit() {
  TB.cv = $('title-bg'); TB.c = TB.cv.getContext('2d');
  TB.sprE = document.createElement('canvas'); TB.sprE.width = TB.sprE.height = 32;
  let g = TB.sprE.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.3, 'rgba(255,150,40,0.7)'); gr.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  TB.sprF = document.createElement('canvas'); TB.sprF.width = TB.sprF.height = 128;
  g = TB.sprF.getContext('2d'); gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 140; i++) TB.stars.push({ x: Math.random(), y: Math.random() * 0.6, s: rand(0.4, 1.5), p: rand(0, 6) });
  for (let i = 0; i < 4; i++) TB.seeds.push([rand(0, 9), rand(0, 9), rand(0, 9)]);
  for (let i = 0; i < 120; i++) TB.emb.push(tbEmber(true));
  tbResize(); window.addEventListener('resize', tbResize);
  window.addEventListener('mousemove', e => { TB.tmx = e.clientX / window.innerWidth - 0.5; TB.tmy = e.clientY / window.innerHeight - 0.5; });
  TB.ready = true;
}
function tbResize() {
  if (!TB.cv) return;
  TB.dpr = Math.min(1.5, window.devicePixelRatio || 1); TB.w = window.innerWidth; TB.h = window.innerHeight;
  TB.cv.width = Math.round(TB.w * TB.dpr); TB.cv.height = Math.round(TB.h * TB.dpr);
}
function tbEmber(init) { return { x: Math.random(), y: init ? Math.random() : 1.05, vx: rand(-0.01, 0.02), vy: rand(0.03, 0.12), s: rand(4, 14), ph: rand(0, 6), l: rand(0.4, 1) }; }

// layered ridge height (0..1 of H), seeded sine sum with jagged abs term
function tbRidge(x, L) {
  const s = TB.seeds[L];
  const base = [0.62, 0.7, 0.8, 0.9][L], amp = [0.17, 0.12, 0.08, 0.05][L];
  return base - amp * (0.55 * Math.abs(Math.sin(x * 2.1 + s[0])) + 0.3 * Math.sin(x * 5.3 + s[1]) * 0.5 + 0.25 * Math.abs(Math.sin(x * 9.7 + s[2])) * 0.6 + 0.2 * Math.sin(x * 1.2 + s[0]));
}
function tbLayer(c, L, color, off, fogA) {
  const w = TB.w, h = TB.h;
  c.beginPath(); c.moveTo(-10, h + 10);
  for (let x = -10; x <= w + 10; x += 8) c.lineTo(x, tbRidge((x + off) / w * 3.2, L) * h);
  c.lineTo(w + 10, h + 10); c.closePath();
  const gr = c.createLinearGradient(0, h * (0.5 + L * 0.06), 0, h);
  gr.addColorStop(0, color[0]); gr.addColorStop(1, color[1]); c.fillStyle = gr; c.fill();
  if (fogA) { const fg = c.createLinearGradient(0, h * (0.55 + L * 0.08), 0, h * (0.78 + L * 0.06)); fg.addColorStop(0, `rgba(160,60,40,${fogA})`); fg.addColorStop(1, 'rgba(160,60,40,0)'); c.fillStyle = fg; c.fill(); }
}
function tbDragon(c, x, y, s, t) {
  const f = Math.sin(t * 2.4), f2 = Math.sin(t * 2.4 - 0.5);
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(-0.08 + f * 0.03);
  const wing = (sx, fl, shade) => {
    const tip = -95 * fl - 30;
    c.fillStyle = shade; c.beginPath(); c.moveTo(sx, -8);
    c.quadraticCurveTo(sx + 25, -8 + tip * 0.7, sx + 95, tip - 6);
    c.quadraticCurveTo(sx + 82, tip * 0.5 + 8, sx + 70, tip * 0.45 + 24);
    c.quadraticCurveTo(sx + 52, tip * 0.25 + 26, sx + 40, tip * 0.15 + 34);
    c.quadraticCurveTo(sx + 14, 22, sx - 34, 12); c.closePath(); c.fill();
  };
  wing(4, f2 * 0.9, '#0c070d'); // far wing
  c.fillStyle = '#060308';
  c.beginPath(); c.moveTo(-46, 2); c.quadraticCurveTo(-120, 22 + f * 6, -190, 6 + f * 14); c.quadraticCurveTo(-122, 6 + f * 4, -46, -9); c.fill(); // tail
  c.beginPath(); c.ellipse(0, 0, 50, 14, 0, 0, TAU); c.fill(); // body
  c.beginPath(); c.moveTo(34, -6); c.quadraticCurveTo(66, -4, 74, -24); c.lineTo(86, -26); c.quadraticCurveTo(104, -22, 108, -16); c.lineTo(88, -10); c.quadraticCurveTo(76, -2, 52, 8); c.closePath(); c.fill(); // neck+head
  c.beginPath(); c.moveTo(78, -26); c.lineTo(70, -40); c.lineTo(84, -28); c.moveTo(86, -26); c.lineTo(84, -42); c.lineTo(92, -26); c.fill(); // horns
  c.beginPath(); c.moveTo(-8, 12); c.lineTo(-14, 26); c.lineTo(4, 14); c.moveTo(16, 12); c.lineTo(14, 26); c.lineTo(28, 12); c.fill(); // legs
  wing(14, f, '#0a0610'); // near wing
  c.fillStyle = 'rgba(255,140,50,0.9)'; c.beginPath(); c.arc(92, -19, 1.8, 0, TAU); c.fill(); // eye
  c.restore();
}
function tbHero(c, x, y, s, t) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const sway = Math.sin(t * 1.7), gust = Math.sin(t * 0.9) * 0.5 + 0.5;
  c.fillStyle = '#030204'; c.strokeStyle = 'rgba(255,150,70,0.55)'; c.lineWidth = 1.4;
  // cape (streams left)
  c.beginPath(); c.moveTo(-6, -92); c.quadraticCurveTo(-34 - gust * 18, -80 + sway * 4, -58 - gust * 30, -38 + sway * 8); c.quadraticCurveTo(-44 - gust * 10, -34, -52 - gust * 24, -6 + sway * 5); c.quadraticCurveTo(-28, -22, -8, -10); c.lineTo(6, -88); c.closePath(); c.fill(); c.stroke();
  // legs & body
  c.beginPath(); c.moveTo(-9, 0); c.lineTo(-7, -40); c.lineTo(7, -40); c.lineTo(10, 0); c.lineTo(3, 0); c.lineTo(0, -34); c.lineTo(-3, 0); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(-10, -94); c.lineTo(10, -94); c.lineTo(9, -40); c.lineTo(-9, -40); c.closePath(); c.fill(); c.stroke();
  // pauldron + head/helm
  c.beginPath(); c.arc(8, -90, 8, Math.PI, 0); c.fill(); c.beginPath(); c.arc(0, -108, 9, 0, TAU); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-3, -116); c.lineTo(3, -134 - sway * 2); c.lineTo(7, -115); c.fill();
  // raised sword arm + blade
  c.lineWidth = 6; c.lineCap = 'round'; c.strokeStyle = '#030204'; c.beginPath(); c.moveTo(8, -88); c.lineTo(26, -112); c.stroke();
  c.save(); c.translate(26, -112); c.rotate(-0.35);
  c.fillStyle = '#0a0608'; c.fillRect(-6, -3, 12, 5); c.fillRect(-2, -3, 4, 16);
  c.beginPath(); c.moveTo(-3.5, -3); c.lineTo(0, -92); c.lineTo(3.5, -3); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(255,190,110,0.75)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(2, -4); c.lineTo(0.5, -88); c.stroke();
  const gl = (Math.sin(t * 1.3) * 0.5 + 0.5); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.25 + gl * 0.6; c.drawImage(TB.sprE, -14, -64, 28, 28);
  c.restore(); c.restore();
}
function tbDraw(dt) {
  if (!TB.ready) tbInit();
  const c = TB.c, w = TB.w, h = TB.h, t = TB.t += dt;
  TB.mx += (TB.tmx - TB.mx) * Math.min(1, dt * 3); TB.my += (TB.tmy - TB.my) * Math.min(1, dt * 3);
  c.setTransform(TB.dpr, 0, 0, TB.dpr, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  TB.nextFlash -= dt; if (TB.nextFlash <= 0) { TB.nextFlash = rand(7, 14); TB.flash = 1; } TB.flash = Math.max(0, TB.flash - dt * 2.2);
  // sky
  let g = c.createLinearGradient(0, 0, 0, h * 0.85);
  g.addColorStop(0, '#04050d'); g.addColorStop(0.45, '#170b1d'); g.addColorStop(0.8, '#4a1a14'); g.addColorStop(1, '#b4511a');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  for (const s of TB.stars) { c.globalAlpha = (0.35 + 0.65 * Math.abs(Math.sin(t * 1.3 + s.p))) * (1 - s.y * 1.2); c.fillStyle = '#ffe9cf'; c.fillRect(s.x * w - TB.mx * 6, s.y * h, s.s, s.s); }
  c.globalAlpha = 1;
  // blood moon
  const mx = w * 0.7 - TB.mx * 18, my = h * 0.3 - TB.my * 10, mr = Math.min(w, h) * 0.17;
  c.globalCompositeOperation = 'lighter';
  g = c.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 3.4); g.addColorStop(0, 'rgba(255,120,40,0.45)'); g.addColorStop(1, 'rgba(255,60,10,0)'); c.fillStyle = g; c.fillRect(mx - mr * 3.5, my - mr * 3.5, mr * 7, mr * 7);
  c.globalCompositeOperation = 'source-over';
  g = c.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr); g.addColorStop(0, '#ffe7b8'); g.addColorStop(0.6, '#ff9a4a'); g.addColorStop(1, '#c2410c'); c.fillStyle = g; c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();
  c.fillStyle = 'rgba(120,30,10,0.18)'; for (const [dx, dy, r] of [[-0.3, -0.1, 0.12], [0.28, 0.22, 0.16], [0.05, -0.38, 0.08], [-0.15, 0.4, 0.07], [0.4, -0.2, 0.05]]) { c.beginPath(); c.arc(mx + dx * mr, my + dy * mr, r * mr, 0, TAU); c.fill(); }
  // dragon crossing the moon
  const dp = ((t * 0.04 + 0.5) % 1.5) - 0.25;
  tbDragon(c, dp * w - TB.mx * 30, my + Math.sin(t * 0.5) * 24 + 12 - (dp - 0.5) * 40, Math.min(w, h) / 620, t);
  // far lightning glow
  if (TB.flash > 0) { c.globalAlpha = TB.flash * 0.22; c.fillStyle = '#b8c8ff'; c.fillRect(0, 0, w, h); c.globalAlpha = 1; }
  // mountains
  tbLayer(c, 0, ['#2a1426', '#14091a'], -TB.mx * 24, 0.35);
  // castle on the mid ridge
  const cx = w * 0.56 - TB.mx * 36;
  tbLayer(c, 1, ['#1a0d1e', '#0c0610'], -TB.mx * 40, 0.25);
  c.fillStyle = '#0a050c'; const cs = Math.min(w, h) / 700;
  c.save(); c.translate(cx, tbRidge((cx - TB.mx * 40) / w * 3.2, 1) * h + 2); c.scale(cs, cs);
  c.fillRect(-60, -58, 120, 60); for (const tx of [-70, 56]) { c.fillRect(tx, -92, 16, 94); c.beginPath(); c.moveTo(tx - 4, -92); c.lineTo(tx + 8, -122); c.lineTo(tx + 20, -92); c.fill(); }
  c.fillRect(-14, -96, 28, 40); c.beginPath(); c.moveTo(-18, -96); c.lineTo(0, -132); c.lineTo(18, -96); c.fill();
  c.globalCompositeOperation = 'lighter';
  for (const [wx, wy] of [[-40, -40], [-20, -30], [20, -44], [42, -32], [0, -76], [-62, -70], [62, -70]]) { c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + wx); c.fillStyle = '#ffb347'; c.fillRect(wx - 2, wy, 4, 6); }
  c.restore(); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  // burning village glow on near hills
  tbLayer(c, 2, ['#100810', '#07040a'], -TB.mx * 62, 0.2);
  for (const vx of [0.36, 0.44, 0.9]) {
    const px = vx * w - TB.mx * 62, py = tbRidge((px - TB.mx * 62) / w * 3.2, 2) * h;
    c.fillStyle = '#050307'; c.fillRect(px - 9, py - 12, 18, 12); c.beginPath(); c.moveTo(px - 12, py - 12); c.lineTo(px, py - 24); c.lineTo(px + 12, py - 12); c.fill();
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5 + 0.35 * Math.sin(t * 9 + vx * 20); c.drawImage(TB.sprE, px - 26, py - 44, 52, 52); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  // foreground ridge + hero
  tbLayer(c, 3, ['#060309', '#020104'], -TB.mx * 90, 0);
  const hx = w * 0.84 - TB.mx * 90, hy = tbRidge((hx - TB.mx * 90) / w * 3.2, 3) * h + 4;
  if (w > 1000) tbHero(c, hx, hy, Math.min(w, h) / 560, t);
  // fog banks
  c.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 5; i++) { const fx = ((t * (8 + i * 3) + i * 400) % (w + 600)) - 300; c.globalAlpha = 0.16; c.drawImage(TB.sprF, fx, h * (0.62 + i * 0.05), 520, 160); }
  // embers
  c.globalCompositeOperation = 'lighter';
  for (const e of TB.emb) {
    e.y -= e.vy * dt; e.x += (e.vx + Math.sin(t * 0.8 + e.ph) * 0.012) * dt;
    if (e.y < -0.05) Object.assign(e, tbEmber(false));
    c.globalAlpha = Math.min(1, e.y * 2.2) * e.l * (0.5 + 0.5 * Math.sin(t * 5 + e.ph));
    c.drawImage(TB.sprE, e.x * w - TB.mx * 40 * e.l, e.y * h, e.s, e.s);
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}
