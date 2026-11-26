// ======================= TITLE MENU (custom UI) =======================
const MENU = [
  { id: 'play', label: 'BEGIN THE HUNT', sub: 'Wave after wave. A dragon every third.' },
  { id: 'armoury', label: 'ARMOURY', sub: 'Choose the steel you carry' },
  { id: 'forge', label: 'THE FORGE', sub: 'Temper your legend with embers' },
  { id: 'lore', label: 'CHRONICLE', sub: 'Controls & battle lore' }
];
const WCOL = { sword: '#9ad1ff', greatsword: '#ff8a5c', daggers: '#c4a3ff', spear: '#74e08a' };
const SVGW = {
  sword: '<svg class="ic" viewBox="0 0 64 64"><path d="M32 3 L37 32 L37 44 L27 44 L27 32Z" fill="var(--wc)" opacity=".95"/><path d="M32 3 L32 44" stroke="#fff" stroke-opacity=".7" stroke-width="1.5"/><rect x="16" y="44" width="32" height="5" rx="2" fill="#d9a441"/><rect x="29" y="49" width="6" height="9" fill="#6b3a1e"/><circle cx="32" cy="60" r="3.5" fill="#d9a441"/></svg>',
  greatsword: '<svg class="ic" viewBox="0 0 64 64"><path d="M32 1 L42 26 L40 46 L24 46 L22 26Z" fill="var(--wc)" opacity=".95"/><path d="M32 4 L32 46" stroke="#2a0c04" stroke-opacity=".5" stroke-width="3"/><path d="M32 4 L32 44" stroke="#fff" stroke-opacity=".6" stroke-width="1"/><path d="M10 46 Q32 40 54 46 L52 51 Q32 46 12 51Z" fill="#d9a441"/><rect x="29" y="50" width="6" height="9" fill="#6b3a1e"/><circle cx="32" cy="61" r="3" fill="#d9a441"/></svg>',
  daggers: '<svg class="ic" viewBox="0 0 64 64"><g transform="rotate(-32 32 34)"><path d="M32 6 L36 30 L28 30Z" fill="var(--wc)"/><rect x="23" y="30" width="18" height="4" fill="#d9a441"/><rect x="30" y="34" width="4" height="12" fill="#6b3a1e"/></g><g transform="rotate(32 32 34)"><path d="M32 6 L36 30 L28 30Z" fill="var(--wc)"/><rect x="23" y="30" width="18" height="4" fill="#d9a441"/><rect x="30" y="34" width="4" height="12" fill="#6b3a1e"/></g></svg>',
  spear: '<svg class="ic" viewBox="0 0 64 64"><g transform="rotate(38 32 32)"><path d="M32 0 L40 14 L32 22 L24 14Z" fill="var(--wc)"/><rect x="30.5" y="20" width="3" height="42" fill="#7a4a24"/><path d="M26 24 L32 20 L38 24 L35 30 L29 30Z" fill="#c1272d" opacity=".9"/></g></svg>'
};
const SVGF = {
  vit: '<svg viewBox="0 0 40 40"><path d="M20 35 C6 24 5 13 12 9 C16 7 19 9 20 12 C21 9 24 7 28 9 C35 13 34 24 20 35Z" fill="#e8453c" stroke="#ffb347" stroke-width="1.5"/></svg>',
  might: '<svg viewBox="0 0 40 40"><path d="M8 32 L26 14 L30 10 L32 8 L33 12 L29 16 L11 34Z" fill="#cfd6e6" stroke="#ffb347" stroke-width="1.2"/><rect x="5" y="31" width="9" height="4" transform="rotate(-45 9 33)" fill="#d9a441"/></svg>',
  fort: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="13" fill="#e8b42c" stroke="#8a5a0c" stroke-width="2"/><circle cx="20" cy="20" r="8.5" fill="none" stroke="#8a5a0c" stroke-width="1.5"/><path d="M20 13 L20 27 M16 17 Q20 14 24 17 M16 23 Q20 26 24 23" stroke="#8a5a0c" stroke-width="1.5" fill="none"/></svg>',
  wind: '<svg viewBox="0 0 40 40"><path d="M6 14 H24 a4 4 0 1 0 -4 -4 M6 21 H30 a4 4 0 1 1 -4 4 M6 28 H18" stroke="#8ce99a" stroke-width="3" stroke-linecap="round" fill="none"/></svg>'
};
const SVG_EMBER = '<svg viewBox="0 0 24 24"><path d="M12 2 C13 7 19 9 19 15 A7 7 0 0 1 5 15 C5 11 8 10 9 6 C10 8 11 8 11 8 C11 6 11 4 12 2Z" fill="#ff7a1a"/><path d="M12 11 C13 14 16 15 15 18 A3.5 3.5 0 0 1 9 18 C9 15 12 14 12 11Z" fill="#ffd76a"/></svg>';
const SVG_LOCK = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" fill="#ffb347"/><path d="M8 11 V7 a4 4 0 0 1 8 0 V11" stroke="#ffb347" stroke-width="2.2" fill="none"/></svg>';
const TIPS = ['Swing at arrows and fireballs to <b>reflect</b> them back.', 'Shielded foes fall to <b>Spin</b> or a hit from <b>behind</b>.', 'Shoot a <b>bomber</b> when it stands among its friends.', 'Every <b>third wave</b> a dragon descends — learn its tells.', 'Villagers reward you. <b>Defend</b> their homes and a hero may join you.', 'Elites drop <b>loot</b>. Legendary gear changes how you play.', 'Complete a build to unlock an <b>Evolution</b> at level-up.'];
let menuIdx = 0, subIdx = 0, panelFocus = false, beginning = false;

function pips(n, max) { let s = ''; for (let i = 0; i < max; i++) s += `<i class="${i < n ? 'on' : ''}"></i>`; return s; }
function wStat(k) {
  const w = WEAPONS[k];
  return [['DAMAGE', w.dmg / 1.9], ['SPEED', 0.25 / w.rate], ['REACH', w.range / 150], ['CRIT', w.crit / 0.28]].map(([n, v]) => `<span>${n}</span><div class="tm-pips">${pips(Math.max(1, Math.round(v * 10)), 10)}</div>`).join('');
}
function omenCard() {
  const o = todaysOmen(), on = !!meta.omenOn, st = streakNow(), rdy = dailyReady();
  return `<div class="omen${on ? ' on' : ''}"><div class="omen-h"><span>TODAY'S OMEN</span><em>${rdy ? '🌅 DAILY HUNT +' + dailyBonus() + ' EMBERS' : '✔ DAILY HUNT DONE'}${st ? ' · 🔥 ' + st + '-DAY STREAK' : ''}</em></div><div class="omen-b"><div><b>${o.name}</b><small>${o.desc}</small></div><button id="omen-btn" class="hire-n${on ? ' on' : ''}">${on ? '☠ OMEN TAKEN' : 'TAKE THE OMEN'}<small>×${o.mul} EMBERS</small></button></div></div>`;
}
function renderMenu() {
  const ml = $('menu-list'); if (!ml) return;
  ml.innerHTML = MENU.map((m, i) => `<button class="tm-item${i === menuIdx ? ' sel' : ''}${i === 0 ? ' primary' : ''}" data-i="${i}"><span class="tm-cur"></span><span class="tm-lab">${m.label}</span><small>${m.sub}</small></button>`).join('');
  ml.querySelectorAll('.tm-item').forEach((b, i) => {
    b.onmouseenter = () => { if (menuIdx !== i && !beginning) { menuIdx = i; panelFocus = false; subIdx = 0; uiTone(520); renderMenu(); } };
    b.onclick = () => { initAudio(); menuIdx = i; if (i === 0) beginRun(); else { panelFocus = true; subIdx = i === 1 ? Math.max(0, Object.keys(WEAPONS).indexOf(selectedWeapon)) : 0; uiTone(660); renderMenu(); const pn = $('menu-panel'); if (window.matchMedia && window.matchMedia('(max-width:960px)').matches && pn.scrollIntoView) pn.scrollIntoView({ behavior: 'smooth', block: 'start' }); } };
  });
  const id = MENU[menuIdx].id, p = $('menu-panel'), keys = Object.keys(WEAPONS);
  p.className = panelFocus ? 'focus' : '';
  let h = '';
  if (id === 'play') {
    const w = WEAPONS[selectedWeapon];
    h = `<div class="tm-ph">HUNT BRIEFING</div><div class="tm-pd">The Wyrm's ash blots out the sun. Villages burn, and something vast circles above them. Hold the line as long as you can.</div>
      <div class="tm-brief"><div class="tm-stat"><b>${w.name}</b><span>EQUIPPED</span></div><div class="tm-stat"><b>${bestWave > 1 ? 'WAVE ' + bestWave : '—'}</b><span>BEST RUN</span></div><div class="tm-stat"><b>${meta.embers}</b><span>EMBERS IN HAND</span></div><div class="tm-stat"><b>4 · 4</b><span>REALMS · WYRMS</span></div></div>
      ${omenCard()}
      <div class="tm-pd" style="margin:14px 0 4px">Hero</div><div class="hire-seg" id="hero-seg"><button class="hire-n${meta.hero !== 'f' ? ' on' : ''}" data-h="m">♂ MALE</button><button class="hire-n${meta.hero === 'f' ? ' on' : ''}" data-h="f">♀ FEMALE</button></div>
      <div class="tm-pd" style="margin:16px 0 0">${TIPS[Math.floor(time * 0.1 + menuIdx) % TIPS.length].replace(/<\/?b>/g, '')}</div>`;
  } else if (id === 'armoury') {
    h = `<div class="tm-ph">THE ARMOURY</div><div class="tm-pd">Every blade fights differently. Unlock new steel with embers earned in battle.</div><div class="tm-weps">` + keys.map((k, i) => {
      const w = WEAPONS[k], un = !!meta.unlocked[k], eq = selectedWeapon === k;
      return `<div class="tm-w${eq ? ' eq' : ''}${un ? '' : ' locked'}${panelFocus && subIdx === i ? ' hi' : ''}" data-k="${k}" style="--wc:${WCOL[k]}">${SVGW[k]}<div class="nm">${w.name.toUpperCase()}</div><div class="ds">${w.desc}</div><div class="tm-st">${wStat(k)}</div>${eq ? '<div class="tm-tag">EQUIPPED</div>' : ''}${un ? '' : `<div class="tm-lock">${SVG_LOCK}<span>${w.cost}</span><span class="tm-bal" style="display:inline-flex">${SVG_EMBER}</span><em>${meta.embers >= w.cost ? 'CLICK TO UNLOCK' : 'NEED MORE EMBERS'}</em></div>`}</div>`;
    }).join('') + '</div>';
  } else if (id === 'forge') {
    h = `<div class="tm-ph">THE FORGE <span class="tm-bal" style="margin-left:auto">${SVG_EMBER}${meta.embers}</span></div><div class="tm-pd">Embers are earned on every run, win or lose. What you temper here stays with you forever.</div><div class="tm-forge">` + FORGE.map((f, i) => {
      const lvl = meta[f.id] || 0, mx = lvl >= f.max, cost = f.cost(lvl);
      return `<div class="tm-f${panelFocus && subIdx === i ? ' hi' : ''}" data-f="${i}">${SVGF[f.id]}<div><div class="fn">${f.name.toUpperCase()}</div><div class="fd">${f.desc}</div><div class="fp">${pips(lvl, f.max)}</div></div><button class="tm-buy" ${mx || meta.embers < cost ? 'disabled' : ''}>${mx ? 'MASTERED' : 'TEMPER · ' + cost}</button></div>`;
    }).join('') + `</div><div class="tm-pd" style="margin:16px 0 6px">${storageOK ? '✔ Progress saves automatically in this browser.' : '⚠ This viewer blocks saving — use a link or file below to keep your progress.'} Move it to another device in one tap:</div><div class="tm-xfer"><button class="tm-buy" id="tm-link">📲 SAVE LINK</button><button class="tm-buy" id="tm-file">⬇ SAVE FILE</button><button class="tm-buy" id="tm-pick">⬆ LOAD FILE</button><input type="file" id="tm-fin" accept=".json,.txt,application/json,text/plain" style="display:none"></div><span id="tm-codemsg" style="font-size:11px;color:#ffb347"></span><details style="margin-top:8px"><summary class="tm-pd" style="cursor:pointer">Advanced: save code</summary><textarea id="tm-code" rows="2" spellcheck="false">${metaCode()}</textarea><button class="tm-buy" id="tm-load" style="margin-top:6px">LOAD CODE</button></details>`;
  } else {
    const K = [['W A S D', 'Move'], ['SPACE', 'Dash'], ['E', 'Spin'], ['Q', 'Meteor Storm'], ['F', 'Cast (3 charges)'], ['P', 'Pause'], ['M', 'Mute'], ['G', 'Hero (title screen)']];
    h = `<div class="tm-ph">CHRONICLE</div><div class="tm-pd">Your sword strikes on its own &mdash; you decide where to stand.</div><div class="tm-keys-grid">` + K.map(k => `<div class="tm-k"><span class="tm-cap">${k[0]}</span>${k[1]}</div>`).join('') + `<div class="tm-k"><span class="tm-cap">DRAG</span>Touch move</div></div><ul class="tm-tips">` + TIPS.slice(0, 5).map(t => `<li>${t}</li>`).join('') + '</ul>' + featsHtml();
  }
  if (id !== 'play') h += '<button class="tm-back show" id="tm-back">◀ BACK TO MENU</button>';
  p.innerHTML = h;
  const ta = $('tm-code');
  if (ta) { ta.addEventListener('keydown', e => e.stopPropagation()); ta.onclick = () => { try { ta.select(); } catch (e) {} };
    $('tm-load').onclick = () => { const ok = loadCode(ta.value); if (ok) renderMenu(); else $('tm-codemsg').textContent = 'That code is not valid.'; }; }
  if ($('tm-link')) {
    const msg = t => { $('tm-codemsg').textContent = t; };
    $('tm-link').onclick = () => shareSaveLink(msg);
    $('tm-file').onclick = () => saveFile(msg);
    $('tm-pick').onclick = () => $('tm-fin').click();
    $('tm-fin').onchange = e => { const f = e.target.files && e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const ok = loadCode(String(r.result).replace(/^[\s\S]*?"code"\s*:\s*"([^"]+)"[\s\S]*$/, '$1')); if (ok) renderMenu(); else msg('That file is not a valid save.'); }; r.readAsText(f); };
  }
  const ob = $('omen-btn'); if (ob) ob.onclick = () => { meta.omenOn = !meta.omenOn; saveMeta(); sfx(meta.omenOn ? 'legend' : 'block'); renderMenu(); };
  p.querySelectorAll('#hero-seg button').forEach(b => { b.onclick = () => setHero(b.dataset.h); });
  const bk = $('tm-back'); if (bk) bk.onclick = () => { panelFocus = false; menuIdx = 0; uiTone(400); renderMenu(); const ml2 = $('menu-list'); if (ml2 && ml2.scrollIntoView) ml2.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  p.querySelectorAll('.tm-w').forEach((el, i) => { el.onclick = () => { initAudio(); subIdx = i; panelFocus = true; pickWeapon(keys[i]); }; });
  p.querySelectorAll('.tm-f').forEach((el, i) => { el.onclick = () => { initAudio(); subIdx = i; panelFocus = true; buyForge(i); }; });
  $('embers-text').textContent = meta.embers;
  $('title-best').textContent = !storageOK ? '⚠ PROGRESS CANNOT SAVE IN THIS VIEWER — OPEN IN YOUR BROWSER' : (bestWave > 1 ? `BEST RUN · WAVE ${bestWave}` : 'NO RUN YET — THE WYRM AWAITS');
}
function metaCode() { try { return btoa(JSON.stringify({ m: meta, b: bestWave })); } catch (e) { return ''; } }
function loadCode(str) {
  try {
    const o = JSON.parse(atob((str || '').trim())); if (!o || !o.m) return false;
    const num = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v)) || 0));
    meta.embers = num(o.m.embers, 1e7);
    for (const f of FORGE) meta[f.id] = num(o.m[f.id], f.max);
    meta.hero = o.m.hero === 'f' ? 'f' : 'm';
    meta.feats = {}; if (o.m.feats) for (const f of FEATS) if (o.m.feats[f.id] === true) meta.feats[f.id] = true;
    meta.unlocked = { sword: true };
    for (const k of Object.keys(WEAPONS)) if (o.m.unlocked && o.m.unlocked[k] === true) meta.unlocked[k] = true;
    if (Number.isFinite(o.b) && o.b > bestWave) { bestWave = Math.min(9999, Math.floor(o.b)); try { localStorage.setItem('swordDragonBestWave', String(bestWave)); } catch (e) {} }
    saveMeta(); return true;
  } catch (e) { return false; }
}
function saveLink() { const base = /^https?:/.test(location.protocol) ? location.origin + location.pathname : 'https://greenfrazer.github.io/sword-and-dragon/'; return base + '#save=' + encodeURIComponent(metaCode()); }
async function shareSaveLink(msg) {
  const url = saveLink();
  try { if (navigator.share) { await navigator.share({ title: 'Sword & Dragon save', text: 'Open this on any device to continue your Sword & Dragon progress.', url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url); msg('✔ Link copied — open it on any device to continue.'); } catch (e) { msg('Copy blocked — use the save code below.'); }
}
function saveFile(msg) {
  try {
    const blob = new Blob([JSON.stringify({ game: 'sword-and-dragon', code: metaCode() })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sword-and-dragon-save.json';
    document.body.appendChild(a); a.click(); a.remove(); msg('✔ Save file downloaded.');
  } catch (e) { msg('Downloads blocked — use the save link.'); }
}
function goSaveUI() {
  const lk = $('go-link'); if (!lk) return;
  const show = storageOK ? 'none' : '';
  $('go-code').style.display = show; $('go-copy').style.display = show; $('go-code-note').style.display = show;
  lk.onclick = () => shareSaveLink(t => { lk.textContent = t; });
}
// opening a save link (…#save=CODE) restores progress, so progress follows the player between devices
function importSaveFromHash() {
  const m = /[#&]save=([^&]+)/.exec(location.hash || ''); if (!m) return;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  let code = ''; try { code = decodeURIComponent(m[1]); } catch (e) { return; }
  const has = meta.embers > 0 || bestWave > 1 || Object.keys(meta.unlocked || {}).length > 1;
  if (has && typeof confirm === 'function' && !confirm('Replace the progress on this device with the progress from this save link?')) return;
  if (loadCode(code)) { renderMenu(); const t = $('title-best'); if (t) t.textContent = '✔ SAVE LINK LOADED — PROGRESS RESTORED'; }
}
function setHero(h) { meta.hero = h === 'f' ? 'f' : 'm'; saveMeta(); sfx('block'); renderMenu(); }
function pickWeapon(k) {
  const w = WEAPONS[k];
  if (!meta.unlocked[k]) { if (meta.embers >= w.cost) { meta.embers -= w.cost; meta.unlocked[k] = true; selectedWeapon = k; saveMeta(); sfx('legend'); } else { uiTone(140, 0.12, 0.08); } }
  else { selectedWeapon = k; sfx('block'); }
  renderMenu();
}
function buyForge(i) {
  const f = FORGE[i], lvl = meta[f.id] || 0, cost = f.cost(lvl);
  if (lvl >= f.max || meta.embers < cost) { uiTone(140, 0.12, 0.08); return; }
  meta.embers -= cost; meta[f.id] = lvl + 1; saveMeta(); sfx('upgrade'); renderMenu();
}
function moveMenu(d) { menuIdx = (menuIdx + d + MENU.length) % MENU.length; subIdx = 0; uiTone(520); renderMenu(); }
function menuKey(e) {
  if (beginning) return;
  const c = e.code, up = c === 'ArrowUp' || c === 'KeyW', dn = c === 'ArrowDown' || c === 'KeyS', lf = c === 'ArrowLeft' || c === 'KeyA', rt = c === 'ArrowRight' || c === 'KeyD', ok = c === 'Enter' || c === 'Space';
  initAudio(); const id = MENU[menuIdx].id, wk = Object.keys(WEAPONS);
  if (c === 'KeyG') { setHero(meta.hero === 'f' ? 'm' : 'f'); return; }
  if (!panelFocus) {
    if (up) moveMenu(-1); else if (dn) moveMenu(1);
    else if (ok || rt) { if (id === 'play') beginRun(); else if (id !== 'lore') { panelFocus = true; subIdx = id === 'armoury' ? Math.max(0, wk.indexOf(selectedWeapon)) : 0; uiTone(660); renderMenu(); } }
    return;
  }
  if (c === 'Escape' || (lf && (id !== 'armoury' || subIdx % 2 === 0))) { panelFocus = false; uiTone(400); renderMenu(); return; }
  if (id === 'armoury') {
    if (lf) subIdx = Math.max(0, subIdx - 1); else if (rt) subIdx = Math.min(wk.length - 1, subIdx + 1); else if (up) subIdx = Math.max(0, subIdx - 2); else if (dn) subIdx = Math.min(wk.length - 1, subIdx + 2);
    else if (ok) { pickWeapon(wk[subIdx]); return; }
    uiTone(600); renderMenu();
  } else if (id === 'forge') {
    if (up) subIdx = Math.max(0, subIdx - 1); else if (dn) subIdx = Math.min(FORGE.length - 1, subIdx + 1); else if (ok) { buyForge(subIdx); return; }
    uiTone(600); renderMenu();
  }
}
function beginRun() {
  if (beginning || state !== 'title') return;
  beginning = true; initAudio(); sfx('roar'); // the wave horn plays once in startGame()
  const m = $('title-modal'); m.classList.add('leaving');
  setTimeout(() => { m.classList.remove('leaving'); beginning = false; startGame(); }, 720);
}
function renderTitleMenu() { renderMenu(); }
function showTitle() {
  ['gameover-modal', 'upgrade-modal', 'merchant-modal', 'pause-modal'].forEach(id => $(id).style.display = 'none');
  state = 'title'; panelFocus = false; menuIdx = 0; subIdx = 0; beginning = false; if (typeof coachHide === 'function') coachHide();
  $('title-modal').style.display = 'flex'; renderMenu();
}

// ======================= SHAREABLE RUN CARD =======================
var runCardText = '';
function drawRunCard(earned) {
  try {
    const c = $('go-card'); if (!c || !c.getContext) return; const g = c.getContext('2d'), W = 600, H = 340;
    const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#1a0a0c'); grd.addColorStop(0.6, '#3a1208'); grd.addColorStop(1, '#8a2a08');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    const mg = g.createRadialGradient(440, 110, 10, 440, 110, 120); mg.addColorStop(0, 'rgba(255,200,120,.9)'); mg.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = mg; g.fillRect(300, 0, 300, 260);
    g.fillStyle = '#0c0506'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, 270); for (let x = 0; x <= W; x += 30) g.lineTo(x, 270 - 24 * Math.abs(Math.sin(x * 0.021 + 1)) - 10); g.lineTo(W, H); g.fill();
    g.fillStyle = '#ffb347'; g.font = '600 13px Georgia,serif'; g.fillText('S W O R D  &  D R A G O N  —  A S H E S  O F  T H E  W Y R M', 26, 34);
    g.fillStyle = '#fff3d6'; g.font = '700 74px Georgia,serif'; g.fillText('WAVE ' + wave, 26, 118);
    g.fillStyle = '#ffd98a'; g.font = 'italic 20px Georgia,serif';
    const rank = wave >= 15 ? 'Wyrm-Bane' : wave >= 9 ? 'Dragon Slayer' : wave >= 6 ? 'Veteran' : wave >= 3 ? 'Squire' : 'Recruit';
    g.fillText(rank + ' · ' + WEAPONS[selectedWeapon].name, 30, 150);
    const st = [[kills, 'FOES SLAIN'], [bestCombo, 'BEST COMBO'], [gold, 'GOLD'], ['+' + earned, 'EMBERS']];
    st.forEach((s, i) => { const x = 30 + i * 140; g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x - 6, 178, 128, 62); g.fillStyle = '#ffb347'; g.fillRect(x - 6, 178, 3, 62); g.fillStyle = '#fff'; g.font = '700 28px Georgia,serif'; g.fillText(String(s[0]), x + 6, 214); g.fillStyle = '#c9b79c'; g.font = '11px sans-serif'; g.fillText(s[1], x + 6, 232); });
    g.fillStyle = '#ffd98a'; g.font = '600 15px Georgia,serif'; g.fillText('Can you beat me? greenfrazer.github.io/sword-and-dragon', 26, 316);
    runCardText = `I reached Wave ${wave} (${rank}) in Sword & Dragon — ${kills} foes slain, combo ×${bestCombo}. Can you beat me?`;
    $('go-share').textContent = '⚔ SHARE RUN';
  } catch (e) {}
}
(function () {
  const b = $('go-share'); if (!b) return;
  b.addEventListener('click', async () => {
    const url = 'https://greenfrazer.github.io/sword-and-dragon/', text = runCardText || 'Can you beat my run in Sword & Dragon?';
    try {
      const c = $('go-card');
      const blob = await new Promise(r => c.toBlob ? c.toBlob(r, 'image/png') : r(null));
      if (blob && typeof File !== 'undefined' && navigator.canShare) {
        const f = new File([blob], 'sword-and-dragon-run.png', { type: 'image/png' });
        if (navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], text, url }); return; }
      }
      if (navigator.share) { await navigator.share({ text, url }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text + ' ' + url); b.textContent = '✔ COPIED'; } catch (e) { b.textContent = 'HOLD THE CARD'; }
  });
})();

// ======================= DEEDS (feats): persistent goals that pay embers =======================
const FEATS = [
  { id: 'wc', name: 'Woodcutter', desc: 'Fell 25 trees in one run', e: 30, t: () => treesFelled >= 25 },
  { id: 'w5', name: 'First Blood', desc: 'Reach wave 5', e: 20, t: () => wave >= 5 },
  { id: 'w10', name: 'Hold the Line', desc: 'Reach wave 10', e: 50, t: () => wave >= 10 },
  { id: 'w20', name: 'Unbroken', desc: 'Reach wave 20', e: 150, t: () => wave >= 20 },
  { id: 'dr1', name: 'Wyrmslayer', desc: 'Slay a dragon', e: 40, t: () => bossKills >= 1 },
  { id: 'dr3', name: 'Scourge of Wyrms', desc: 'Slay 3 dragons in one run', e: 120, t: () => bossKills >= 3 },
  { id: 'k100', name: 'Reaper', desc: 'Slay 100 foes in one run', e: 40, t: () => kills >= 100 },
  { id: 'k500', name: 'Harvest of Ash', desc: 'Slay 500 foes in one run', e: 160, t: () => kills >= 500 },
  { id: 'c25', name: 'Unstoppable', desc: 'Reach a combo of 25', e: 40, t: () => bestCombo >= 25 },
  { id: 'c60', name: 'Whirlwind', desc: 'Reach a combo of 60', e: 120, t: () => bestCombo >= 60 },
  { id: 'fr', name: 'Wyrmfire Born', desc: 'Ignite Wyrmfire Frenzy', e: 30, t: () => frenzyCount >= 1 },
  { id: 'bm', name: 'Under the Red Moon', desc: 'Survive a Blood Moon', e: 40, t: () => bloodMoons >= 1 && !bloodMoon },
  { id: 'gd', name: 'Dragon\'s Hoard', desc: 'Hold 1000 gold', e: 50, t: () => gold >= 1000 }
];
var featT = 0, featQ = [], featShow = 0;
function featsDone() { return FEATS.filter(f => meta.feats && meta.feats[f.id]).length; }
function stepFeats(dt) {
  if (state === 'play' && (featT -= dt) <= 0) {
    featT = 0.5;
    if (!meta.feats) meta.feats = {};
    for (const f of FEATS) if (!meta.feats[f.id]) { let ok = false; try { ok = f.t(); } catch (e) {} if (ok) { meta.feats[f.id] = true; meta.embers += f.e; saveMeta(); featQ.push(f); } }
  }
  if (featShow > 0) { featShow -= dt; if (featShow <= 0) { const t = $('feat-toast'); if (t) t.style.top = '-120px'; } }
  else if (featQ.length) {
    const f = featQ.shift(), t = $('feat-toast'); featShow = 3.2;
    if (t) { t.innerHTML = `<div style="font-size:10px;letter-spacing:.3em;color:#ffb347">DEED ACHIEVED · ${featsDone()}/${FEATS.length}</div><div style="font-size:18px;font-weight:700">${f.name}</div><div style="font-size:12px;color:#c9b79c">${f.desc} — <b style="color:#ffd76a">+${f.e} embers</b></div>`; t.style.top = '64px'; }
    try { sfx('legend'); } catch (e) {}
  }
}
function featsHtml() {
  const d = featsDone();
  return `<div class="tm-ph" style="margin-top:18px">DEEDS <span class="tm-bal" style="margin-left:auto;font-size:13px">${d} / ${FEATS.length}</span></div><div class="tm-keys-grid" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr))">` + FEATS.map(f => { const on = meta.feats && meta.feats[f.id]; return `<div class="tm-k" style="opacity:${on ? 1 : .55};border-left:3px solid ${on ? '#ffb347' : '#4a3d3a'}"><span style="margin-right:8px">${on ? '🏆' : '🔒'}</span><span><b>${f.name}</b><br><small>${f.desc} · +${f.e} embers</small></span></div>`; }).join('') + '</div>';
}

// ---------- game over: a reason to go again, and the Forge right where you fell ----------
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
function renderGameOver(earned, prevBest) {
  coachHide();
  const rec = wave > prevBest && prevBest > 0, toBeat = prevBest + 1 - wave, nextDragon = Math.ceil(wave / 3) * 3;
  const t = $('go-title'); t.textContent = rec ? 'NEW RECORD · WAVE ' + wave : 'FALLEN ON WAVE ' + wave; setClassOn(t, 'rec', rec);
  let hook = prevBest === 0 ? 'Your first hunt is over. Every run earns embers; spend them and you will go further.'
    : rec ? `You went past your old best of wave ${prevBest}. The ballads will need a new verse.`
    : toBeat === 1 ? `<b>One more wave</b> would have been a new record (wave ${prevBest}).`
    : toBeat <= 3 ? `<b>${toBeat} waves</b> short of your record (wave ${prevBest}).`
    : `Your record stands at wave ${prevBest}.`;
  hook += wave % 3 === 0 ? ' The dragon still circles overhead.' : ` The next dragon waits at <b>wave ${nextDragon}</b>.`;
  $('go-hook').innerHTML = hook;
  renderGoOffer(earned);
}
function setClassOn(el, c, on) { if (el && el.classList) el.classList[on ? 'add' : 'remove'](c); }
function renderGoOffer(earned, bought) {
  const box = $('go-offer'); if (!box) return;
  const opts = FORGE.map((f, i) => ({ i, f, lvl: meta[f.id] || 0 })).filter(o => o.lvl < o.f.max).map(o => Object.assign(o, { cost: o.f.cost(o.lvl) })).sort((a, b) => a.cost - b.cost);
  const can = opts.filter(o => meta.embers >= o.cost).slice(0, 2);
  let h = `<div class="go-emb">${earned ? `<span class="go-plus">+${earned}</span>` : ''}${SVG_EMBER}<b>${meta.embers}</b><i>EMBERS</i></div>`;
  if (bought) h += `<div class="go-done">✔ ${bought.toUpperCase()} TEMPERED · IT RIDES WITH YOU NEXT RUN</div>`;
  if (can.length) h += `<div class="go-tp">Temper your hero before you rise:</div><div class="go-fx">` + can.map(o => `<button class="go-f" data-f="${o.i}">${SVGF[o.f.id] || ''}<span><b>${o.f.name.toUpperCase()} ${ROMAN[o.lvl + 1] || ''}</b><em>${o.f.desc}</em></span><u>${o.cost}${SVG_EMBER}</u></button>`).join('') + '</div>';
  else if (opts.length) { const o = opts[0], pct = Math.min(100, Math.round(meta.embers / o.cost * 100)); h += `<div class="go-prog">${o.cost - meta.embers} more embers to temper ${o.f.name} ${ROMAN[o.lvl + 1] || ''}.</div><div class="go-bar"><i style="width:${pct}%"></i></div>`; }
  else h += '<div class="go-done">THE FORGE HAS NOTHING LEFT TO TEACH YOU</div>';
  box.innerHTML = h;
  box.querySelectorAll('.go-f').forEach(b => { b.onclick = () => { const f = FORGE[+b.dataset.f]; buyForge(+b.dataset.f); flash('#ffb347', 0.25); $('go-code').value = metaCode(); renderGoOffer(earned, f.name); }; });
}

// ======================= COACHED FIRST HUNT =======================
// A short field guide on the very first run. Each step waits until the player has actually done it.
var coach = null, coachDone = false;
try { coachDone = localStorage.getItem('swordDragonCoach') === '1'; } catch (e) {}
function coachTouch() { return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false; }
const COACH = [
  { t: () => coachTouch() ? 'DRAG ANYWHERE TO MOVE<em>Your finger is the hero\'s compass.</em>' : 'MOVE WITH WASD OR THE ARROWS<em>Or click and drag on the field.</em>', hand: true, done: c => Math.hypot(player.x - c.x, player.y - c.y) > 150 },
  { t: () => 'YOUR BLADE STRIKES ON ITS OWN<em>Walk into the goblins. Swings also bat arrows back.</em>', done: c => kills >= c.k + 2 },
  { t: () => (coachTouch() ? 'TAP DASH' : 'PRESS SPACE TO DASH') + ' TO SLIP PAST DANGER<em>A burst of speed, and you can\'t be hit mid-dash.</em>', btn: 'btn-dash', done: () => player.dashCd > 0, wait: 660 },
  { t: () => (coachTouch() ? 'TAP CAST' : 'PRESS F TO CAST') + ' FOR A PIERCING BOLT<em>Three charges that refill over time.</em>', btn: 'btn-cast', done: () => player.cast < 3, wait: 660 },
  { t: () => 'CLEAR THE WAVE<em>Every third wave, a dragon comes. Good hunting.</em>', done: c => c.f > 240 }
];
function coachShow() {
  const st = COACH[coach.step];
  $('co-text').innerHTML = st.t();
  $('co-step').textContent = 'FIELD GUIDE';
  $('co-dots').innerHTML = COACH.map((_, i) => i <= coach.step ? '<b>◆</b>' : '◇').join('');
  const pl = $('coach').querySelector('.co-plate'); if (pl && pl.style) { pl.style.animation = 'none'; void pl.offsetWidth; pl.style.animation = ''; }
  setClassOn($('co-hand'), 'on', !!st.hand);
  ['btn-dash', 'btn-cast'].forEach(id => setClassOn($(id), 'coach-hi', st.btn === id));
  if (coach.step) sfx('block');
}
function coachHide() {
  setClassOn($('coach'), 'on', false); setClassOn($('co-hand'), 'on', false);
  ['btn-dash', 'btn-cast'].forEach(id => setClassOn($(id), 'coach-hi', false));
}
function coachFinish() {
  coachDone = true; coach = null; coachHide();
  try { localStorage.setItem('swordDragonCoach', '1'); } catch (e) {}
}
function coachTick() {
  if (coachDone || state !== 'play') return;
  if (!coach || coach.p !== player) {
    if (wave !== 1 || bestWave > 1) { coachDone = true; return; } // returning players skip it
    coach = { p: player, step: 0, f: 0, x: player.x, y: player.y, k: kills };
    setClassOn($('coach'), 'on', true); coachShow(); return;
  }
  coach.f++;
  const low = !!village || enemies.some(e => e.type === 'dragon'); // make room for the village / boss bar
  if (coach.low !== low) { coach.low = low; setClassOn($('coach'), 'low', low); }
  const st = COACH[coach.step];
  if (st.done(coach) || (st.wait && coach.f > st.wait)) {
    coach.step++; coach.f = 0; coach.k = kills;
    if (coach.step >= COACH.length) { coachFinish(); return; }
    coachShow();
  }
}
(function () { const b = $('co-skip'); if (b && b.addEventListener) b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); coachFinish(); }); })();
