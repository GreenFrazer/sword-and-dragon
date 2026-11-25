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

function pips(n, max, cls) { let s = ''; for (let i = 0; i < max; i++) s += `<i class="${i < n ? 'on' : ''}"></i>`; return s; }
function wStat(k) {
  const w = WEAPONS[k];
  return [['DAMAGE', w.dmg / 1.9], ['SPEED', 0.25 / w.rate], ['REACH', w.range / 150], ['CRIT', w.crit / 0.28]].map(([n, v]) => `<span>${n}</span><div class="tm-pips">${pips(Math.max(1, Math.round(v * 10)), 10)}</div>`).join('');
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
    }).join('') + `</div><div class="tm-pd" style="margin:14px 0 4px">${storageOK ? 'Progress saves in this browser.' : '⚠ This viewer blocks saving.'} Back up your progress with this code and paste it back later (or on another device):</div><textarea id="tm-code" rows="2" spellcheck="false">${metaCode()}</textarea><button class="tm-buy" id="tm-load" style="margin-top:6px">LOAD CODE</button><span id="tm-codemsg" style="margin-left:10px;font-size:11px;color:#ffb347"></span>`;
  } else {
    const K = [['W A S D', 'Move'], ['SPACE', 'Dash'], ['E', 'Spin'], ['Q', 'Meteor Storm'], ['F', 'Cast (3 charges)'], ['P', 'Pause'], ['M', 'Mute']];
    h = `<div class="tm-ph">CHRONICLE</div><div class="tm-pd">Your sword strikes on its own &mdash; you decide where to stand.</div><div class="tm-keys-grid">` + K.map(k => `<div class="tm-k"><span class="tm-cap">${k[0]}</span>${k[1]}</div>`).join('') + `<div class="tm-k"><span class="tm-cap">DRAG</span>Touch move</div></div><ul class="tm-tips">` + TIPS.slice(0, 5).map(t => `<li>${t}</li>`).join('') + '</ul>';
  }
  if (id !== 'play') h += '<button class="tm-back show" id="tm-back">◀ BACK TO MENU</button>';
  p.innerHTML = h;
  const ta = $('tm-code');
  if (ta) { ta.addEventListener('keydown', e => e.stopPropagation()); ta.onclick = () => { try { ta.select(); } catch (e) {} };
    $('tm-load').onclick = () => { const ok = loadCode(ta.value); if (ok) renderMenu(); else $('tm-codemsg').textContent = 'That code is not valid.'; }; }
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
    meta.unlocked = { sword: true };
    for (const k of Object.keys(WEAPONS)) if (o.m.unlocked && o.m.unlocked[k] === true) meta.unlocked[k] = true;
    if (Number.isFinite(o.b) && o.b > bestWave) { bestWave = Math.min(9999, Math.floor(o.b)); try { localStorage.setItem('swordDragonBestWave', String(bestWave)); } catch (e) {} }
    saveMeta(); return true;
  } catch (e) { return false; }
}
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
  beginning = true; initAudio(); sfx('roar'); sfx('wave');
  const m = $('title-modal'); m.classList.add('leaving');
  setTimeout(() => { m.classList.remove('leaving'); beginning = false; startGame(); }, 720);
}
function renderTitleMenu() { renderMenu(); }
function showTitle() {
  ['gameover-modal', 'upgrade-modal', 'merchant-modal', 'pause-modal'].forEach(id => $(id).style.display = 'none');
  state = 'title'; panelFocus = false; menuIdx = 0; subIdx = 0; beginning = false;
  $('title-modal').style.display = 'flex'; renderMenu();
}
