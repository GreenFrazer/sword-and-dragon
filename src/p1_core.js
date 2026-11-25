// ======================= SETUP =======================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const mini = document.getElementById('minimap');
const mctx = mini.getContext('2d');
const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

var storageOK = (function () { try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return true; } catch (e) { return false; } })();
var fxDirty = true, ponds = [], grassBlades = [], lavaLights = [];
let W = 0, H = 0, DPR = 1, vig = null;
function resizeCanvas() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  vig = document.createElement('canvas');
  vig.width = Math.max(2, Math.round(W / 3)); vig.height = Math.max(2, Math.round(H / 3));
  const g = vig.getContext('2d');
  const gr = g.createRadialGradient(vig.width / 2, vig.height / 2, Math.min(vig.width, vig.height) * 0.38,
    vig.width / 2, vig.height / 2, Math.hypot(vig.width, vig.height) * 0.55);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(0,0,0,0.6)');
  g.fillStyle = gr; g.fillRect(0, 0, vig.width, vig.height);
  fxDirty = true;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const WORLD_W = 1800, WORLD_H = 1400;

// ======================= AUDIO (procedural WebAudio) =======================
let actx = null, masterGain = null, muted = false, noiseBuf = null;
function initAudio() {
  try {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = new AC(); masterGain = actx.createGain(); masterGain.gain.value = 0.45; masterGain.connect(actx.destination);
    }
    if (actx.state === 'suspended') actx.resume();
  } catch (e) { actx = null; }
}
function tone(f, dur, type, vol, slideTo, delay) {
  if (!actx || muted) return;
  const t = actx.currentTime + (delay || 0);
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(masterGain); o.start(t); o.stop(t + dur + 0.03);
}
function noise(dur, vol, freq, ftype) {
  if (!actx || muted) return;
  if (!noiseBuf) {
    const n = actx.sampleRate; noiseBuf = actx.createBuffer(1, n, actx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = actx.createBufferSource(); s.buffer = noiseBuf;
  const f = actx.createBiquadFilter(); f.type = ftype || 'lowpass'; f.frequency.value = freq;
  const g = actx.createGain(); const t = actx.currentTime;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(masterGain); s.start(t); s.stop(t + dur);
}
const sfxLast = {};
function sfx(name) {
  if (!actx || muted) return;
  const n = performance.now();
  if (sfxLast[name] && n - sfxLast[name] < 55) return;
  sfxLast[name] = n;
  switch (name) {
    case 'swing': noise(0.12, 0.10, 1800, 'bandpass'); tone(240, 0.1, 'sawtooth', 0.03, 110); break;
    case 'hit': noise(0.08, 0.18, 900); tone(170, 0.08, 'square', 0.07, 80); break;
    case 'crit': tone(520, 0.14, 'square', 0.09, 1000); noise(0.1, 0.2, 1400); break;
    case 'block': tone(900, 0.06, 'triangle', 0.1, 500); noise(0.05, 0.1, 3000, 'highpass'); break;
    case 'spin': noise(0.35, 0.14, 1200, 'bandpass'); tone(300, 0.34, 'sawtooth', 0.05, 760); break;
    case 'dash': noise(0.15, 0.09, 2500, 'highpass'); break;
    case 'boom': noise(0.6, 0.4, 420); tone(95, 0.5, 'sine', 0.3, 30); break;
    case 'coin': tone(988, 0.06, 'square', 0.05); tone(1319, 0.1, 'square', 0.05, 0, 0.06); break;
    case 'potion': tone(440, 0.18, 'sine', 0.1, 880); break;
    case 'hurt': tone(140, 0.22, 'sawtooth', 0.14, 60); noise(0.15, 0.2, 700); break;
    case 'roar': noise(0.9, 0.35, 300); tone(70, 0.9, 'sawtooth', 0.25, 38); break;
    case 'fire': noise(0.14, 0.09, 1500, 'bandpass'); break;
    case 'shoot': tone(620, 0.08, 'triangle', 0.07, 300); break;
    case 'ult': tone(200, 0.8, 'sawtooth', 0.14, 900); noise(0.6, 0.18, 2000, 'bandpass'); break;
    case 'ready': tone(660, 0.12, 'square', 0.07); tone(990, 0.2, 'square', 0.07, 0, 0.1); break;
    case 'meteor': noise(0.4, 0.33, 350); tone(110, 0.35, 'sine', 0.24, 35); break;
    case 'wave': tone(392, 0.14, 'square', 0.07); tone(523, 0.14, 'square', 0.07, 0, 0.14); tone(659, 0.26, 'square', 0.08, 0, 0.28); break;
    case 'upgrade': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'triangle', 0.09, 0, i * 0.07)); break;
    case 'death': tone(300, 0.6, 'sawtooth', 0.2, 40); noise(0.5, 0.25, 600); break;
    case 'loot': tone(784, 0.1, 'triangle', 0.09); tone(1175, 0.18, 'triangle', 0.09, 0, 0.08); break;
    case 'legend': [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, 'triangle', 0.1, 0, i * 0.09)); noise(0.5, 0.15, 3000, 'highpass'); break;
    case 'thunder': noise(0.9, 0.38, 220); tone(55, 0.8, 'sine', 0.3, 28); break;
    case 'cast': tone(900, 0.18, 'sawtooth', 0.08, 300); noise(0.15, 0.1, 2500, 'bandpass'); break;
    case 'zap': tone(1300, 0.1, 'sawtooth', 0.05, 300); break;
    case 'fuse': tone(1000, 0.05, 'square', 0.04); break;
  }
}

// ======================= BIOMES =======================
const BIOMES = [
  { name: 'Emerald Meadow', grass: '#478c34', t1: '#3b7a2a', t2: '#58a63e', path: '#b58d58', path2: '#9e7744', hedge: '#234719', hedge2: '#2f6a22',
    leaf1: '#255e1c', leaf2: '#378229', trunk: '#5c3a21', tree: 'round', amb: 'leaf', ambCols: ['#7bc74d', '#a9e34b', '#5aa83a'], flowers: ['#ffd43b', '#ffffff', '#ff8787', '#da77f2'], tint: null, mini: '#3f7a2e' },
  { name: 'Autumn Grove', grass: '#7a8a3a', t1: '#66742c', t2: '#92a248', path: '#a8794a', path2: '#8d6238', hedge: '#5a3a14', hedge2: '#7a4e1a',
    leaf1: '#b8541a', leaf2: '#e08a2b', trunk: '#4a2e18', tree: 'round', amb: 'leaf', ambCols: ['#e8590c', '#fcc419', '#d9480f', '#c92a2a'], flowers: ['#ff922b', '#fcc419'], tint: 'rgba(255,140,40,0.07)', mini: '#76843a' },
  { name: 'Frostfall Tundra', grass: '#c9d8e4', t1: '#b4c6d6', t2: '#e8f1f8', path: '#9fb3c4', path2: '#8aa0b3', hedge: '#4a6070', hedge2: '#6b8498',
    leaf1: '#2f5d50', leaf2: '#e8f1f5', trunk: '#4a3a30', tree: 'pine', amb: 'snow', ambCols: ['#ffffff'], flowers: null, tint: 'rgba(120,170,255,0.09)', mini: '#a9bccb' },
  { name: 'Ashen Volcano', grass: '#3a2e2e', t1: '#2c2222', t2: '#4a3838', path: '#5a3a2a', path2: '#442a1e', hedge: '#1a0f0f', hedge2: '#3a1e14',
    leaf1: '#2a1a1a', leaf2: '#4a2a1a', trunk: '#2a1a14', tree: 'dead', amb: 'ember', ambCols: ['#ff6b35', '#ffd43b', '#ff3d00'], flowers: null, lava: true, tint: 'rgba(255,60,0,0.08)', mini: '#3a2a2a' }
];
const DRAGON_SKINS = [
  { name: 'ANCIENT INFERNO DRAGON', body: '#8c1919', wing: '#a61e1e', head: '#9e1c1c', belly: '#e8590c', leg: '#6b1414', fire: ['#ff6b35', '#ffd43b'], glow: '#ff7a2a' },
  { name: 'AUTUMN WYRM OF RUIN', body: '#7a4a14', wing: '#a8641c', head: '#8a5418', belly: '#e0a030', leg: '#5a360e', fire: ['#ffb347', '#fff2a8'], glow: '#ffb347' },
  { name: 'FROST WYRM GLACIARIS', body: '#2b6a9a', wing: '#4a95c9', head: '#2f78ab', belly: '#bfe6ff', leg: '#1d4a70', fire: ['#74c0fc', '#e7f5ff'], glow: '#74c0fc' },
  { name: 'EMBER TITAN VOLGRATH', body: '#2a1a22', wing: '#4a1a2a', head: '#3a1a24', belly: '#ff4d1a', leg: '#1a0f14', fire: ['#ff3d00', '#ffea00'], glow: '#ff4d1a' }
];
let biomeIdx = -1, biome = BIOMES[0], ground = null;

// ---- pre-rendered ground (so a rich background costs one drawImage per frame) ----
function buildGround() {
  ground = document.createElement('canvas');
  ground.width = WORLD_W; ground.height = WORLD_H;
  const g = ground.getContext('2d');
  g.fillStyle = biome.grass; g.fillRect(0, 0, WORLD_W, WORLD_H);
  for (let i = 0; i < 150; i++) {
    g.globalAlpha = 0.16; g.fillStyle = i % 2 ? biome.t1 : biome.t2;
    const r = rand(40, 130);
    g.beginPath(); g.ellipse(rand(0, WORLD_W), rand(0, WORLD_H), r, r * 0.7, 0, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 1100; i++) {
    g.fillStyle = Math.random() > 0.5 ? biome.t1 : biome.t2;
    const x = rand(0, WORLD_W), y = rand(0, WORLD_H), s = rand(4, 9);
    g.fillRect(x, y, s, 3); g.fillRect(x + 2, y - 4, 2, 5);
  }
  if (biome.flowers) {
    for (let i = 0; i < 160; i++) {
      g.fillStyle = biome.flowers[i % biome.flowers.length];
      const x = rand(30, WORLD_W - 30), y = rand(30, WORLD_H - 30);
      g.beginPath(); g.arc(x, y, rand(2, 3.5), 0, TAU); g.fill();
    }
  }
  // path
  g.lineCap = 'round';
  const path = () => {
    g.beginPath();
    g.moveTo(120, WORLD_H * 0.5); g.quadraticCurveTo(WORLD_W * 0.5, WORLD_H * 0.38, WORLD_W - 120, WORLD_H * 0.52);
    g.moveTo(WORLD_W * 0.5, 120); g.quadraticCurveTo(WORLD_W * 0.56, WORLD_H * 0.5, WORLD_W * 0.48, WORLD_H - 120);
  };
  g.strokeStyle = biome.path; g.lineWidth = 112; path(); g.stroke();
  g.strokeStyle = biome.path2; g.lineWidth = 76; path(); g.stroke();
  for (let i = 0; i < 160; i++) { // pebbles on the road
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.arc(rand(100, WORLD_W - 100), WORLD_H * 0.5 + rand(-50, 50), rand(1.5, 3), 0, TAU); g.fill();
  }
  // rocks
  for (let i = 0; i < 22; i++) {
    const x = rand(80, WORLD_W - 80), y = rand(80, WORLD_H - 80), r = rand(8, 18);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x, y + r * 0.4, r * 1.2, r * 0.6, 0, 0, TAU); g.fill();
    g.fillStyle = biome.lava ? '#3d3030' : '#8d949c'; g.beginPath(); g.ellipse(x, y, r, r * 0.75, 0, 0, TAU); g.fill();
    g.fillStyle = biome.lava ? '#5a4646' : '#adb5bd'; g.beginPath(); g.ellipse(x - r * 0.25, y - r * 0.25, r * 0.5, r * 0.35, 0, 0, TAU); g.fill();
  }
  if (biome.lava) { // glowing lava cracks
    g.save(); g.shadowColor = '#ff6a1a'; g.shadowBlur = 14; g.strokeStyle = '#ff8a2a'; g.lineWidth = 3; g.lineJoin = 'round';
    for (let i = 0; i < 16; i++) {
      let x = rand(80, WORLD_W - 80), y = rand(80, WORLD_H - 80);
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 7; k++) { x += rand(-40, 40); y += rand(-30, 40); g.lineTo(x, y); }
      g.stroke();
    }
    g.restore();
  }
  bakePonds(g); buildGrass();
  lavaLights = [];
  if (biomeIdx === 3) for (let i = 0; i < 22; i++) lavaLights.push({ x: rand(80, WORLD_W - 80), y: rand(80, WORLD_H - 80) });
  // bush hedge border
  for (let x = 10; x < WORLD_W; x += 26) for (const y of [14, WORLD_H - 14]) hedgeBush(g, x, y);
  for (let y = 10; y < WORLD_H; y += 26) for (const x of [14, WORLD_W - 14]) hedgeBush(g, x, y);
}
function hedgeBush(g, x, y) {
  g.fillStyle = biome.hedge; g.beginPath(); g.arc(x + rand(-3, 3), y + rand(-3, 3), rand(18, 24), 0, TAU); g.fill();
  g.fillStyle = biome.hedge2; g.beginPath(); g.arc(x - 4, y - 5, rand(9, 13), 0, TAU); g.fill();
}

// glow sprites (cached radial gradients, drawn additively)
const glowCache = {};
function glowSprite(color) {
  let c = glowCache[color]; if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, color); gr.addColorStop(0.4, color + '66'); gr.addColorStop(1, color + '00');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return glowCache[color] = c;
}
function drawGlow(x, y, r, color, alpha) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

// ======================= INPUT =======================
const keys = {};
const GAME_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
window.addEventListener('keydown', e => {
  if (GAME_KEYS.includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  if (state === 'title') { menuKey(e); return; }
  if (e.code === 'Enter' && state === 'gameover') { restartGame(); return; }
  if (e.code === 'Space') triggerDash();
  if (e.code === 'KeyE') triggerSpin();
  if (e.code === 'KeyQ') triggerUlt();
  if (e.code === 'KeyF') triggerCast();
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  if (e.code === 'KeyM') toggleMute();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (state === 'play') togglePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') togglePause(); });

const joy = { active: false, id: null, sx: 0, sy: 0, cx: 0, cy: 0, dx: 0, dy: 0 };
canvas.addEventListener('pointerdown', e => {
  if (e.target !== canvas) return;
  joy.active = true; joy.id = e.pointerId; joy.sx = joy.cx = e.clientX; joy.sy = joy.cy = e.clientY; joy.dx = joy.dy = 0;
});
window.addEventListener('pointermove', e => {
  if (!joy.active || e.pointerId !== joy.id) return;
  joy.cx = e.clientX; joy.cy = e.clientY;
  const rx = joy.cx - joy.sx, ry = joy.cy - joy.sy, dist = Math.hypot(rx, ry), maxR = 55;
  if (dist > 4) { const c = Math.min(dist, maxR) / maxR; joy.dx = rx / dist * c; joy.dy = ry / dist * c; } else joy.dx = joy.dy = 0;
});
function releaseJoy(e) { if (e.pointerId === joy.id) { joy.active = false; joy.dx = joy.dy = 0; } }
window.addEventListener('pointerup', releaseJoy);
window.addEventListener('pointercancel', releaseJoy);
function bindBtn(id, fn) { $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); initAudio(); fn(); }); }
bindBtn('btn-dash', () => triggerDash());
bindBtn('btn-spin', () => triggerSpin());
bindBtn('btn-ult', () => triggerUlt());
bindBtn('btn-cast', () => triggerCast());
$('forge-btn').addEventListener('click', () => showTitle());
$('mute').addEventListener('click', () => toggleMute());
$('start-btn').addEventListener('click', () => beginRun());
$('again-btn').addEventListener('click', () => restartGame());
$('resume-btn').addEventListener('click', () => togglePause());
$('quit-btn').addEventListener('click', () => { $('pause-modal').style.display = 'none'; cashOutRun(); showTitle(); });
$('pausebtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); togglePause(); });
$('go-code').addEventListener('keydown', e => e.stopPropagation());
$('go-copy').addEventListener('click', () => {
  const t = $('go-code'); t.focus(); t.select(); let ok = false;
  try { navigator.clipboard.writeText(t.value).then(() => { $('go-copy').textContent = 'COPIED!'; }, () => {}); ok = true; } catch (e) {}
  try { if (document.execCommand('copy')) { ok = true; $('go-copy').textContent = 'COPIED!'; } } catch (e) {}
  if (!ok) $('go-copy').textContent = 'PRESS AND HOLD THE CODE TO COPY';
});
$('tm-go').addEventListener('click', () => { initAudio(); beginRun(); });

function getInput() {
  let ix = joy.dx, iy = joy.dy;
  if (keys['KeyW'] || keys['ArrowUp']) iy -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) iy += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) ix -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) ix += 1;
  const mag = Math.hypot(ix, iy);
  if (mag > 1) { ix /= mag; iy /= mag; }
  return { ix, iy, mag: Math.min(1, mag) };
}
function toggleMute() { muted = !muted; $('mute').textContent = muted ? '🔇' : '🔊'; }
