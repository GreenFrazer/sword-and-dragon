// ======================= LIVING SOUNDSCAPE =======================
// A continuous, procedurally generated world bed that follows biome, weather, blood moons, villages and fights, plus
// stochastic wildlife (birds, crickets, wolves, ember pops, ice chimes, anvil clinks) panned around the listener.
// At low health the music is muffled behind a lowpass and a heartbeat takes over (rate rises as health falls).
var amb = null, ambNextOne = 0, ambBeatAt = 0, ambLowK = 0, ambFight = 0, ambCrackAt = 0;
function ambInit() {
  if (amb || !actx || !noiseBuf) return;
  const bus = actx.createGain(); bus.gain.value = 0; bus.connect(masterGain);
  const rv = actx.createGain(); rv.gain.value = 0.25; bus.connect(rv); rv.connect(revIn);
  const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 20000; lp.Q.value = 0.5; // music muffler
  try { musicBus.disconnect(masterGain); musicBus.connect(lp); lp.connect(masterGain); } catch (e) {}
  const mkBed = (buf, type, f, q, lfoHz, lfoDepth) => {
    const s = actx.createBufferSource(); s.buffer = buf; s.loop = true;
    const fl = actx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = actx.createGain(); g.gain.value = 0;
    s.connect(fl); fl.connect(g); g.connect(bus);
    if (lfoHz) { const l = actx.createOscillator(), lg = actx.createGain(); l.frequency.value = lfoHz; lg.gain.value = lfoDepth; l.connect(lg); lg.connect(fl.frequency); l.start(); }
    s.start(0, Math.random() * 2);
    return g;
  };
  amb = {
    bus, lp,
    wind: mkBed(brownBuf, 'lowpass', 260, 0.3, 0.08, 70),      // soft, low gusts (no hiss)
    howl: mkBed(noiseBuf, 'bandpass', 900, 7, 0.07, 380),     // thin whistling wind
    rain: mkBed(noiseBuf, 'highpass', 3200, 0.4, 0, 0),
    patter: mkBed(noiseBuf, 'bandpass', 1500, 0.6, 0.3, 200),
    leaves: mkBed(noiseBuf, 'bandpass', 2600, 0.8, 0.17, 700),
    rumble: mkBed(brownBuf, 'lowpass', 85, 1.2, 0.09, 25)
  };
}
function ambSet(g, v, tc) { g.gain.setTargetAtTime(v, actx.currentTime, tc || 1.2); }
function ambPan() { return (Math.random() * 2 - 1) * 0.85; }
function ambBird(pan) {
  const base = 2200 + Math.random() * 1800, n = 2 + (Math.random() * 3 | 0), sp = 0.07 + Math.random() * 0.05;
  for (let i = 0; i < n; i++) {
    const f = base * (1 + (i % 2) * 0.18 + Math.random() * 0.06);
    voice({ f, slide: f * (Math.random() < 0.5 ? 1.5 : 0.7), dur: 0.07, type: 'sine', vol: 0.028, atk: 0.008, delay: i * sp, pan, bus: amb.bus, rev: 0.5 });
  }
}
function ambCricket(pan) {
  const f = 4300 + Math.random() * 500, n = 4 + (Math.random() * 4 | 0);
  for (let i = 0; i < n; i++) voice({ f, dur: 0.035, type: 'sine', vol: 0.016, atk: 0.004, delay: i * 0.058, pan, bus: amb.bus });
}
function ambWolf(pan) {
  const f = 300 + Math.random() * 80, d = 2.6;
  const o = (g, v) => voice({ f: f * g, slide: f * g * 1.35, dur: d, type: 'sawtooth', n: 2, spread: 9, vol: v, atk: 0.9, rel: 1.1, sustain: true, vib: [5.5, 14], fl: [900, 1500, 3, 'bandpass'], pan, bus: amb.bus, rev: 0.8 });
  o(1, 0.05); o(1.5, 0.018);
  voice({ f: f * 1.35, slide: f * 0.8, dur: 1.4, type: 'sawtooth', vol: 0.04, atk: 0.1, rel: 0.7, sustain: true, vib: [5, 10], fl: [800, 500, 3, 'bandpass'], delay: d, pan, bus: amb.bus, rev: 0.8 });
}
function ambChime(pan) { const f = 1200 * Math.pow(2, [0, 3, 7, 10, 12][Math.random() * 5 | 0] / 12); fm({ f, ratio: 3.01, idx: 1.1, dur: 2.2, vol: 0.02, pan, bus: amb.bus, rev: 0.9 }); }
function ambAnvil(pan) {
  const n = 2 + (Math.random() * 3 | 0);
  for (let i = 0; i < n; i++) { const d = i * (0.34 + Math.random() * 0.08); fm({ f: 1550 + Math.random() * 200, ratio: 2.76, idx: 2.4, dur: 0.35, vol: 0.02, delay: d, pan, bus: amb.bus, rev: 0.55 }); nz({ dur: 0.03, vol: 0.02, fl: [4000, 1200, 1], delay: d, pan, bus: amb.bus }); }
}
function ambCrackle() {
  const pan = ambPan(); nz({ dur: 0.02 + Math.random() * 0.03, vol: 0.03 + Math.random() * 0.04, fl: [3500 + Math.random() * 3000, 900, 1.2, 'bandpass'], pan, bus: amb.bus });
}
function ambOneShot(night) {
  const pan = ambPan();
  if (bloodMoon) { if (Math.random() < 0.7) ambWolf(pan); else ambCricket(pan); return; }
  if (village && Math.random() < 0.4) return ambAnvil(pan);
  if (camp && Math.random() < 0.35) { // distant axe thuds
    for (let i = 0; i < 3; i++) voice({ f: 140, slide: 70, dur: 0.1, type: 'triangle', vol: 0.03, delay: i * 0.62, pan, bus: amb.bus, rev: 0.6 });
    return;
  }
  if (biomeIdx <= 1) { if (night && weather === 'clear') ambCricket(pan); else if (weather === 'clear') ambBird(pan); }
  else if (biomeIdx === 2) ambChime(pan);
  else if (Math.random() < 0.5) nz({ dur: 1.4, vol: 0.05, atk: 0.4, brown: true, fl: [220, 50, 1], pan, bus: amb.bus, rev: 0.5 }); // distant magma groan
}
function ambHeartbeat(k) { // k 0..1 danger; deep lub-dub through the sfx bus so it cuts through
  const v = 0.2 + 0.3 * k;
  voice({ f: 70, slide: 38, dur: 0.16, type: 'sine', vol: v, atk: 0.004 });
  voice({ f: 62, slide: 34, dur: 0.18, type: 'sine', vol: v * 0.75, atk: 0.004, delay: 0.17 });
  nz({ dur: 0.07, vol: 0.04 * k, brown: true, fl: [300, 80, 1] });
}
function ambTick(dt) {
  if (!actx || muted) return;
  ambInit(); if (!amb) return;
  const now = actx.currentTime, live = state === 'play' || state === 'upgrade' || state === 'title';
  const alive = state === 'play' && player && player.hp > 0;
  // --- danger: heartbeat + muffled music when low on health ---
  const frac = alive ? player.hp / Math.max(1, player.maxHp) : 1;
  const lowT = alive && frac < 0.35 ? Math.min(1, (0.35 - frac) / 0.3) : 0;
  ambLowK += (lowT - ambLowK) * Math.min(1, dt * 2.5);
  amb.lp.frequency.setTargetAtTime(20000 * Math.pow(0.04, ambLowK), now, 0.15); // 20 kHz -> ~800 Hz
  if (ambLowK > 0.08 && now >= ambBeatAt) { ambHeartbeat(ambLowK); ambBeatAt = now + 60 / (66 + 60 * ambLowK); }
  // --- bed levels ---
  ambFight += ((state === 'play' && enemies.length > 0 ? 1 : 0) - ambFight) * Math.min(1, dt * 1.2);
  const b = Math.max(0, biomeIdx), w = weather, bm = bloodMoon;
  const vol = live ? (1 - 0.45 * ambFight) * (1 - 0.6 * ambLowK) * (state === 'upgrade' ? 0.5 : 1) : 0;
  ambSet(amb.bus, 0.9 * vol);
  ambSet(amb.wind, ([0.02, 0.03, 0.05, 0.04][b] + (w === 'storm' ? 0.04 : 0) + (w === 'blizzard' ? 0.1 : 0) + (bm ? 0.03 : 0)));
  ambSet(amb.howl, 0); // retired: whistling noise read as static
  ambSet(amb.rain, w === 'storm' ? 0.04 : w === 'rain' ? 0.025 : 0);
  ambSet(amb.patter, w === 'storm' ? 0.035 : w === 'rain' ? 0.022 : 0);
  ambSet(amb.leaves, 0); // retired: white-noise rustle read as static
  ambSet(amb.rumble, (b === 3 ? 0.28 : 0.04) + (w === 'storm' ? 0.1 : 0) + (bm ? 0.1 : 0));
  // --- one-shots ---
  if (live && state !== 'title' && now >= ambNextOne) {
    ambNextOne = now + (bm ? 7 : 2.2) + Math.random() * (bm ? 9 : 5);
    if (ambFight < 0.5) ambOneShot(bm || b === 1);
  }
  if (b === 3 && live && state !== 'title' && now >= ambCrackAt) { ambCrackAt = now + 0.05 + Math.random() * 0.4; ambCrackle(); }
}
