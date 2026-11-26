// ======================= SETUP =======================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const mini = document.getElementById('minimap');
const mctx = mini.getContext('2d');
const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

var storageOK = (function () { try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return true; } catch (e) { return false; } })();
var bloodMoon = false, bloodMoons = 0, bmT = 0;
var wood = 0, treesFelled = 0, WOOD_MAX = 12, treeFx = 0;
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

// ======================= AUDIO ENGINE (procedural WebAudio: reverb, compression, layered SFX, adaptive score) =======================
let actx = null, masterGain = null, sfxBus = null, musicBus = null, revIn = null, dlyIn = null, musicRevIn = null, musicDlyIn = null, noiseBuf = null, brownBuf = null, distCurve = null, muted = false;
function makeIR(sec, decay, dark) {
  const sr = actx.sampleRate, n = Math.floor(sr * sec), b = actx.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c); let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n, k = dark ? 0.15 + 0.7 * t : 0.5; // later tail gets darker
      lp += (Math.random() * 2 - 1 - lp) * (1 - k * 0.9);
      d[i] = lp * Math.pow(1 - t, decay) * (i < 400 ? i / 400 : 1);
    }
  }
  return b;
}
function initAudio() {
  try {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = new AC();
      const comp = actx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 22; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.22;
      const limiter = actx.createDynamicsCompressor();
      limiter.threshold.value = -2; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.08;
      masterGain = actx.createGain(); masterGain.gain.value = 0.8;
      masterGain.connect(comp); comp.connect(limiter); limiter.connect(actx.destination);
      sfxBus = actx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(masterGain);
      musicBus = actx.createGain(); musicBus.gain.value = 0.62; musicBus.connect(masterGain);
      // shared hall reverb
      revIn = actx.createGain(); revIn.gain.value = 1;
      const conv = actx.createConvolver(); conv.buffer = makeIR(2.8, 2.6, true);
      const revOut = actx.createGain(); revOut.gain.value = 0.55;
      revIn.connect(conv); conv.connect(revOut); revOut.connect(masterGain);
      // ping-pong delay (dotted eighth) for music
      dlyIn = actx.createGain(); dlyIn.gain.value = 1;
      const dl = actx.createDelay(2), dr = actx.createDelay(2), fb = actx.createGain(), lpf = actx.createBiquadFilter();
      dl.delayTime.value = 0.33; dr.delayTime.value = 0.33; fb.gain.value = 0.38; lpf.type = 'lowpass'; lpf.frequency.value = 2400;
      const mg = actx.createChannelMerger(2), dOut = actx.createGain(); dOut.gain.value = 0.5;
      dlyIn.connect(dl); dl.connect(lpf); lpf.connect(dr); dr.connect(fb); fb.connect(dl);
      dl.connect(mg, 0, 0); dr.connect(mg, 0, 1); mg.connect(dOut); dOut.connect(masterGain); dOut.connect(revIn);
      musicRevIn = actx.createGain(); musicRevIn.connect(revIn); musicDlyIn = actx.createGain(); musicDlyIn.connect(dlyIn);
      dlyL = dl; dlyR = dr;
      // noise sources
      const n = actx.sampleRate * 3;
      noiseBuf = actx.createBuffer(1, n, actx.sampleRate); brownBuf = actx.createBuffer(1, n, actx.sampleRate);
      const wd = noiseBuf.getChannelData(0), bd = brownBuf.getChannelData(0); let last = 0;
      for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; wd[i] = w; last = (last + 0.02 * w) / 1.02; bd[i] = last * 3.5; }
      distCurve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; distCurve[i] = Math.tanh(x * 4.5); }
    }
    if (actx.state === 'suspended') actx.resume();
    startMusic();
  } catch (e) { actx = null; }
}
function duck(amt, hold, rel) {
  if (!actx) return; const t = actx.currentTime, g = musicBus.gain;
  if (!musicOn) return;
  g.cancelScheduledValues(t); g.setTargetAtTime(0.62 * amt, t, 0.02); g.setTargetAtTime(0.62, t + hold, rel || 0.35);
}
function panNode(p) { if (!p || !actx.createStereoPanner) return null; const s = actx.createStereoPanner(); s.pan.value = Math.max(-1, Math.min(1, p)); return s; }
// route a node to an output bus with optional pan + reverb/delay sends
function out(node, o, t0, tEnd) {
  const dest = o.bus || sfxBus; let last = node;
  const pn = panNode(o.pan); if (pn) { last.connect(pn); last = pn; }
  last.connect(dest);
  const isM = dest === musicBus;
  if (o.rev) { const s = actx.createGain(); s.gain.value = o.rev; last.connect(s); s.connect(isM ? musicRevIn : revIn); }
  if (o.dly) { const s = actx.createGain(); s.gain.value = o.dly; last.connect(s); s.connect(isM ? musicDlyIn : dlyIn); }
}
// Core oscillator voice: layered/detuned oscillators -> filter w/ envelope -> amp envelope
function voice(o) {
  if (!actx || muted) return;
  const t = actx.currentTime + (o.delay || 0), dur = o.dur, atk = Math.min(o.atk != null ? o.atk : 0.004, dur * 0.5), vol = o.vol;
  const rel = o.rel != null ? o.rel : 0.03, end = t + dur + rel;
  const amp = actx.createGain();
  amp.gain.setValueAtTime(0.0001, t); amp.gain.linearRampToValueAtTime(vol, t + atk);
  if (o.sustain) { amp.gain.setValueAtTime(vol, t + dur - 0.02); amp.gain.exponentialRampToValueAtTime(0.0001, end); }
  else amp.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel * 0.5);
  let head = amp;
  if (o.dist) { const ws = actx.createWaveShaper(); ws.curve = distCurve; ws.oversample = '2x'; ws.connect(amp); head = ws; }
  let tail = head;
  if (o.fl) { // filter: [f0, f1, q, type]
    const f = actx.createBiquadFilter(); f.type = o.fl[3] || 'lowpass'; f.Q.value = o.fl[2] || 1;
    f.frequency.setValueAtTime(o.fl[0], t); f.frequency.exponentialRampToValueAtTime(Math.max(30, o.fl[1]), t + dur);
    f.connect(head); tail = f;
  }
  const n = o.n || 1, spread = o.spread || 0, freq = o.f * (o.pv || 1);
  for (let i = 0; i < n; i++) {
    const osc = actx.createOscillator(); osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(18, o.slide * (o.pv || 1)), t + dur);
    osc.detune.value = n > 1 ? (i / (n - 1) - 0.5) * 2 * spread : 0;
    if (o.vib) { const l = actx.createOscillator(), lg = actx.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(osc.detune); l.start(t); l.stop(end + 0.05); }
    const og = actx.createGain(); og.gain.value = 1 / Math.sqrt(n); osc.connect(og); og.connect(tail);
    osc.start(t); osc.stop(end + 0.05);
  }
  out(amp, o);
}
// FM bell / metallic voice
function fm(o) {
  if (!actx || muted) return;
  const t = actx.currentTime + (o.delay || 0), dur = o.dur, f = o.f * (o.pv || 1);
  const car = actx.createOscillator(), mod = actx.createOscillator(), mg = actx.createGain(), amp = actx.createGain();
  car.type = 'sine'; mod.type = 'sine'; car.frequency.value = f; mod.frequency.value = f * (o.ratio || 2);
  mg.gain.setValueAtTime(f * (o.idx || 3), t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + dur);
  mod.connect(mg); mg.connect(car.frequency);
  amp.gain.setValueAtTime(0.0001, t); amp.gain.linearRampToValueAtTime(o.vol, t + 0.003); amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  car.connect(amp); car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
  out(amp, o);
}
// Filtered noise burst: fl = [f0, f1, q, type]
function nz(o) {
  if (!actx || muted) return;
  const t = actx.currentTime + (o.delay || 0), dur = o.dur, atk = Math.min(o.atk || 0.002, dur * 0.5);
  const s = actx.createBufferSource(); s.buffer = o.brown ? brownBuf : noiseBuf;
  const f = actx.createBiquadFilter(); const fl = o.fl; f.type = fl[3] || 'lowpass'; f.Q.value = fl[2] || 0.8;
  f.frequency.setValueAtTime(fl[0], t); f.frequency.exponentialRampToValueAtTime(Math.max(30, fl[1]), t + dur);
  const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.vol, t + atk); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); s.start(t, Math.random() * 1.5, dur + 0.05); out(g, o);
}
// legacy-compatible helpers
function kick(t0, vol, o) { // synthesized kick: pitch-dropping sine + click
  if (!actx || muted) return; o = o || {};
  const dl = t0 - actx.currentTime; voice({ f: o.f || 150, slide: o.low || 38, dur: o.len || 0.28, type: 'sine', vol, delay: Math.max(0, dl), bus: o.bus, atk: 0.001 });
  nz({ dur: 0.02, vol: vol * 0.35, fl: [5000, 2000, 0.7, 'highpass'], delay: Math.max(0, dl), bus: o.bus });
}
function snare(t0, vol, bus) {
  const dl = Math.max(0, t0 - actx.currentTime);
  nz({ dur: 0.18, vol, fl: [3200, 1800, 0.9, 'bandpass'], delay: dl, bus, rev: 0.25 });
  voice({ f: 220, slide: 150, dur: 0.1, type: 'triangle', vol: vol * 0.7, delay: dl, bus });
}
function hat(t0, vol, bus, open) { nz({ dur: open ? 0.16 : 0.035, vol, fl: [9000, 7000, 1, 'highpass'], delay: Math.max(0, t0 - actx.currentTime), bus, pan: (Math.random() - 0.5) * 0.4 }); }
function taiko(t0, vol, f, bus) {
  const dl = Math.max(0, t0 - actx.currentTime);
  voice({ f: f * 1.7, slide: f, dur: 0.45, type: 'sine', vol, delay: dl, bus, rev: 0.3 });
  nz({ dur: 0.07, vol: vol * 0.4, fl: [900, 300, 1, 'lowpass'], delay: dl, bus });
}

// ---- sound effects ----
const sfxLast = {};
const SFX_GAP = { fuse: 90, fire: 70, zap: 70, shoot: 55, hit: 45, swing: 70 };
function sfx(name, wx, wy) {
  if (!actx || muted) return;
  const n = performance.now();
  if (sfxLast[name] && n - sfxLast[name] < (SFX_GAP[name] || 55)) return;
  sfxLast[name] = n;
  let pan = 0, att = 1;
  if (wx != null) {
    pan = Math.max(-0.85, Math.min(0.85, (wx - cam.x - W / 2) / (W * 0.55)));
    if (wy != null) { const d = Math.hypot(wx - cam.x - W / 2, wy - cam.y - H / 2); att = Math.max(0.35, 1 - d / 1400); }
  }
  const pv = 1 + (Math.random() - 0.5) * 0.18, v = k => k * att, P = { pan, pv };
  switch (name) {
    case 'swing':
      nz({ dur: 0.16, vol: v(0.2), atk: 0.04, fl: [500, 3800, 1.6, 'bandpass'], pan, rev: 0.1 });
      nz({ dur: 0.12, vol: v(0.07), atk: 0.01, fl: [6000, 2500, 0.8, 'highpass'], pan });
      voice({ f: 200, slide: 90, dur: 0.12, type: 'sawtooth', vol: v(0.035), fl: [1500, 300, 1], ...P }); break;
    case 'chop':
      voice({ f: 150, slide: 70, dur: 0.1, type: 'triangle', vol: v(0.3), ...P });
      nz({ dur: 0.05, vol: v(0.22), fl: [2400, 500, 1.2], pan, rev: 0.05 });
      voice({ f: 520, slide: 240, dur: 0.04, type: 'square', vol: v(0.04), ...P }); break;
    case 'timber':
      voice({ f: 90, slide: 38, dur: 0.38, type: 'sawtooth', vol: v(0.2), fl: [900, 120, 1], ...P });
      nz({ dur: 0.3, vol: v(0.2), fl: [1800, 200, 0.8], brown: true, pan, rev: 0.2 }); break;
    case 'hit':
      voice({ f: 190, slide: 52, dur: 0.14, type: 'sine', vol: v(0.3), ...P });
      nz({ dur: 0.07, vol: v(0.28), fl: [3800, 700, 0.8], pan, rev: 0.12 });
      voice({ f: 330, slide: 120, dur: 0.05, type: 'square', vol: v(0.05), ...P }); break;
    case 'crit':
      voice({ f: 150, slide: 45, dur: 0.18, type: 'sine', vol: v(0.34), ...P });
      nz({ dur: 0.12, vol: v(0.3), fl: [6000, 900, 0.8], pan, rev: 0.2 });
      fm({ f: 1480, ratio: 2.76, idx: 5, dur: 0.55, vol: v(0.1), pan, rev: 0.4, pv });
      voice({ f: 500, slide: 1400, dur: 0.14, type: 'sawtooth', vol: v(0.07), fl: [1200, 5000, 1], pan, rev: 0.2 }); break;
    case 'block':
      fm({ f: 880, ratio: 3.5, idx: 4, dur: 0.35, vol: v(0.15), pan, rev: 0.3, pv });
      fm({ f: 1250, ratio: 1.41, idx: 3, dur: 0.22, vol: v(0.07), pan, pv });
      nz({ dur: 0.06, vol: v(0.2), fl: [8000, 3000, 0.8, 'highpass'], pan }); break;
    case 'spin':
      for (let i = 0; i < 3; i++) nz({ dur: 0.2, vol: 0.17, atk: 0.06, delay: i * 0.1, fl: [600, 3200, 1.8, 'bandpass'], pan: (i - 1) * 0.5, rev: 0.12 });
      voice({ f: 240, slide: 900, dur: 0.34, type: 'sawtooth', vol: 0.05, fl: [700, 3500, 2], rev: 0.15 }); break;
    case 'dash':
      nz({ dur: 0.22, vol: 0.2, atk: 0.02, fl: [1200, 7000, 1.2, 'bandpass'], rev: 0.2 });
      voice({ f: 500, slide: 120, dur: 0.18, type: 'sine', vol: 0.08 }); break;
    case 'boom':
      duck(0.35, 0.3, 0.5);
      voice({ f: 100, slide: 26, dur: 0.9, type: 'sine', vol: v(0.55), rel: 0.1, rev: 0.25, ...P });
      nz({ dur: 0.8, vol: v(0.55), brown: true, fl: [2500, 80, 0.8], pan, rev: 0.45 });
      nz({ dur: 0.12, vol: v(0.3), fl: [5000, 600, 0.8], pan }); break;
    case 'coin':
      fm({ f: 1976, ratio: 2, idx: 1.2, dur: 0.12, vol: 0.09, rev: 0.2 });
      fm({ f: 2637, ratio: 2, idx: 1, dur: 0.4, vol: 0.09, delay: 0.07, rev: 0.3 });
      voice({ f: 988, dur: 0.06, type: 'square', vol: 0.03 }); break;
    case 'potion':
      [523, 659, 784, 1047].forEach((f, i) => fm({ f, ratio: 3, idx: 1.5, dur: 0.35, vol: 0.07, delay: i * 0.06, rev: 0.35, pan: (i - 1.5) * 0.25 }));
      voice({ f: 400, slide: 1000, dur: 0.3, type: 'sine', vol: 0.06, rev: 0.3 }); break;
    case 'hurt':
      voice({ f: 180, slide: 50, dur: 0.3, type: 'sawtooth', vol: 0.2, fl: [2000, 150, 2], dist: true, rev: 0.15 });
      voice({ f: 90, slide: 35, dur: 0.25, type: 'sine', vol: 0.35 });
      nz({ dur: 0.2, vol: 0.25, fl: [1800, 200, 0.8], rev: 0.1 }); break;
    case 'roar':
      duck(0.25, 1.0, 0.8);
      voice({ f: 78, slide: 34, dur: 1.3, type: 'sawtooth', n: 3, spread: 25, vol: 0.32, atk: 0.1, fl: [900, 120, 3], dist: true, vib: [14, 40], rev: 0.5, rel: 0.2 });
      voice({ f: 46, slide: 28, dur: 1.2, type: 'sine', vol: 0.45, atk: 0.05, rev: 0.2 });
      nz({ dur: 1.2, vol: 0.38, atk: 0.12, fl: [350, 1500, 4, 'bandpass'], rev: 0.5 });
      nz({ dur: 1.0, vol: 0.3, atk: 0.2, fl: [1400, 300, 3, 'bandpass'], rev: 0.5, delay: 0.05 }); break;
    case 'fire':
      nz({ dur: 0.22, vol: v(0.18), atk: 0.03, fl: [900, 2400, 1.2, 'bandpass'], pan, rev: 0.25 });
      nz({ dur: 0.18, vol: v(0.12), brown: true, fl: [1200, 250, 0.8], pan });
      for (let i = 0; i < 3; i++) nz({ dur: 0.02, vol: v(0.12), delay: Math.random() * 0.18, fl: [4000 + Math.random() * 3000, 3000, 2, 'bandpass'], pan }); break;
    case 'shoot':
      voice({ f: 700, slide: 180, dur: 0.1, type: 'triangle', vol: v(0.1), fl: [3000, 500, 1], ...P, rev: 0.1 });
      nz({ dur: 0.06, vol: v(0.1), fl: [4000, 8000, 1, 'highpass'], pan }); break;
    case 'ult':
      duck(0.4, 0.8, 0.6);
      voice({ f: 150, slide: 1100, dur: 0.9, type: 'sawtooth', n: 3, spread: 20, vol: 0.15, atk: 0.2, fl: [400, 5000, 3], rev: 0.4 });
      voice({ f: 75, slide: 550, dur: 0.9, type: 'sine', vol: 0.3, atk: 0.2 });
      nz({ dur: 0.8, vol: 0.2, atk: 0.4, fl: [800, 7000, 2, 'bandpass'], rev: 0.3 });
      [0, 7, 12].forEach((s, i) => fm({ f: 880 * Math.pow(2, s / 12), ratio: 2, idx: 2, dur: 0.8, vol: 0.05, delay: 0.55 + i * 0.05, rev: 0.5 })); break;
    case 'ready':
      fm({ f: 880, ratio: 2, idx: 2, dur: 0.4, vol: 0.1, rev: 0.4 });
      fm({ f: 1320, ratio: 2, idx: 2, dur: 0.7, vol: 0.1, delay: 0.1, rev: 0.5 });
      fm({ f: 1760, ratio: 2, idx: 1.5, dur: 0.9, vol: 0.07, delay: 0.2, rev: 0.5 }); break;
    case 'meteor':
      duck(0.3, 0.5, 0.6);
      voice({ f: 90, slide: 22, dur: 1.3, type: 'sine', vol: v(0.7), rev: 0.3, rel: 0.1, ...P });
      nz({ dur: 1.2, vol: v(0.6), brown: true, fl: [3000, 60, 0.8], pan, rev: 0.55 });
      nz({ dur: 0.2, vol: v(0.4), fl: [7000, 800, 0.8], pan });
      nz({ dur: 0.9, vol: v(0.12), delay: 0.1, fl: [3000, 800, 3, 'bandpass'], pan, rev: 0.4 }); break;
    case 'wave': // brassy horn call
      [[196, 0], [294, 0.18], [392, 0.36]].forEach(([f, d], i) => {
        voice({ f, dur: i === 2 ? 0.9 : 0.2, type: 'sawtooth', n: 3, spread: 12, vol: 0.09, atk: 0.04, delay: d, fl: [500, 2600, 1.5], rev: 0.45, sustain: true, rel: 0.12 });
        voice({ f: f / 2, dur: i === 2 ? 0.9 : 0.2, type: 'triangle', vol: 0.12, atk: 0.03, delay: d });
      });
      kick(actx.currentTime, 0.4, { f: 120, low: 40 }); break;
    case 'upgrade':
      [523, 659, 784, 1047, 1319].forEach((f, i) => fm({ f, ratio: 2, idx: 1.3, dur: 0.5, vol: 0.09, delay: i * 0.065, rev: 0.45, pan: (i - 2) * 0.2 }));
      voice({ f: 262, dur: 0.7, type: 'triangle', vol: 0.1, atk: 0.02, rev: 0.3 }); break;
    case 'death':
      duck(0.4, 0.4, 0.5);
      voice({ f: 320, slide: 38, dur: 0.8, type: 'sawtooth', n: 2, spread: 15, vol: v(0.2), fl: [3000, 100, 2], dist: true, rev: 0.4, ...P });
      voice({ f: 120, slide: 28, dur: 0.7, type: 'sine', vol: v(0.4), pan });
      nz({ dur: 0.6, vol: v(0.3), brown: true, fl: [1500, 100, 0.8], pan, rev: 0.4 }); break;
    case 'loot':
      fm({ f: 1568, ratio: 2, idx: 1.5, dur: 0.3, vol: 0.09, rev: 0.4 });
      fm({ f: 2349, ratio: 2, idx: 1.5, dur: 0.6, vol: 0.09, delay: 0.09, rev: 0.5 });
      voice({ f: 784, dur: 0.2, type: 'triangle', vol: 0.06 }); break;
    case 'legend': {
      duck(0.35, 1.2, 0.8);
      [196, 247, 294, 392].forEach(f => voice({ f, dur: 1.6, type: 'sawtooth', n: 3, spread: 18, vol: 0.06, atk: 0.3, fl: [300, 3000, 1], rev: 0.6, sustain: true, rel: 0.4 }));
      [392, 494, 587, 784, 988, 1175, 1568].forEach((f, i) => fm({ f, ratio: 2, idx: 1.8, dur: 0.9, vol: 0.08, delay: 0.1 + i * 0.085, rev: 0.55, pan: Math.sin(i) * 0.5 }));
      nz({ dur: 1.2, vol: 0.12, atk: 0.5, fl: [3000, 9000, 1, 'highpass'], rev: 0.4 });
      kick(actx.currentTime, 0.45, { f: 110, low: 36 }); break; }
    case 'thunder':
      duck(0.4, 0.8, 0.8);
      nz({ dur: 0.1, vol: 0.5, fl: [8000, 1500, 0.8, 'highpass'], rev: 0.4 }); // crack
      nz({ dur: 2.2, vol: 0.55, atk: 0.15, brown: true, fl: [1800, 60, 0.8], rev: 0.7, delay: 0.05 });
      voice({ f: 60, slide: 30, dur: 1.8, type: 'sine', vol: 0.4, atk: 0.1, rev: 0.4, delay: 0.1 }); break;
    case 'cast':
      voice({ f: 400, slide: 1600, dur: 0.3, type: 'sine', vol: 0.12, rev: 0.4 });
      fm({ f: 1200, ratio: 1.5, idx: 4, dur: 0.4, vol: 0.08, rev: 0.4 });
      nz({ dur: 0.25, vol: 0.12, atk: 0.05, fl: [1500, 6000, 3, 'bandpass'], rev: 0.3 }); break;
    case 'zap': {
      const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain(), curve = new Float32Array(16);
      for (let i = 0; i < 16; i++) curve[i] = 400 + Math.random() * 2400;
      o.type = 'sawtooth'; o.frequency.setValueCurveAtTime(curve, t, 0.14);
      g.gain.setValueAtTime(0.07 * att, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g); out(g, { pan, rev: 0.2 }); o.start(t); o.stop(t + 0.18);
      nz({ dur: 0.1, vol: v(0.2), fl: [9000, 3000, 1, 'highpass'], pan }); break; }
    case 'fuse':
      nz({ dur: 0.07, vol: v(0.08), fl: [7000, 5000, 3, 'bandpass'], pan });
      voice({ f: 1800 + Math.random() * 600, dur: 0.03, type: 'square', vol: v(0.02), pan }); break;
    case 'ui':
      fm({ f: 880 * pv, ratio: 2, idx: 1, dur: 0.18, vol: 0.06, rev: 0.3 }); break;
  }
}
function uiTone(f, d, v) {
  try { if (!actx || muted) return; if (f < 300) voice({ f, dur: d || 0.12, type: 'triangle', vol: (v || 0.06) * 2, slide: f * 0.7 }); else fm({ f, ratio: 2, idx: 1, dur: 0.22, vol: (v || 0.05) * 1.4, rev: 0.3 }); } catch (e) {}
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
function drawGlow(x, y, r, color, alpha) { // called hundreds of times a frame: swap just the two state fields instead of save()/restore()
  const a0 = ctx.globalAlpha, op0 = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = a0; ctx.globalCompositeOperation = op0;
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
  if (e.code === 'KeyN') toggleMusic();
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
$('go-menu-btn').addEventListener('click', () => showTitle());
$('mute').addEventListener('click', () => toggleMute());
$('music-btn').addEventListener('click', () => { initAudio(); toggleMusic(); });
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
function toggleMute() {
  muted = !muted; $('mute').textContent = muted ? '🔇' : '🔊';
  // silence the master bus too, so sounds already scheduled ahead (music look-ahead, delayed SFX) stop at once
  if (actx) masterGain.gain.setTargetAtTime(muted ? 0 : 0.8, actx.currentTime, 0.02);
}
