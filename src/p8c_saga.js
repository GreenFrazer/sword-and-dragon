
// ======================= THE WAYSTONE: RUN SAVES =======================
// Every cleared wave inscribes the whole run (hero, build, gear, party, gold, buffs) as a "saga".
// The title menu offers CONTINUE; the merchant screen shows the waystone with REST HERE (save & quit)
// and CARRY TO ANOTHER DEVICE (a #run= link, which also rescues players whose viewer blocks storage,
// and bridges Safari and a Home Screen app, which keep separate storage on iOS).
var runId = '', runPaid = 0, sagaMem = null; // sagaMem: in-memory copy for viewers that block localStorage
const SAGA_KEY = 'swordDragonSaga';
const SAGA_SKIP = { x: 1, y: 1, vx: 1, vy: 1, mount: 1, mountCast: 1, mountIn: 1, mountT: 1, dashTime: 1, spinTime: 1, invuln: 1, hitFlash: 1, atkTimer: 1, shieldT: 1, barrier: 1, walkPhase: 1, down: 1, rev: 1, windup: 1, stun: 1, gx: 1, gy: 1 };
function primsOf(o) { const r = {}; for (const k in o) { const v = o[k]; if (SAGA_SKIP[k]) continue; if ((typeof v === 'number' && Number.isFinite(v)) || typeof v === 'boolean' || (typeof v === 'string' && v.length < 60)) r[k] = v; } return r; }
function newRunId() { return Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

function sagaSnapshot(w) {
  return {
    v: 1, id: runId, w, t: Date.now(), wp: player.weapon || selectedWeapon, hero: meta.hero,
    gold, kills, bc: bestCombo, bm: bloodMoons, fc: frenzyCount, bk: bossKills, rk: rareKills, qd: questsDone, tf: treesFelled, wood, cs: campStock,
    buffs: Object.assign({}, activeBuffs), omen: runOmen ? runOmen.id : '', paid: runPaid,
    p: Object.assign(primsOf(player), { upg: Object.assign({}, player.upg), evo: Object.assign({}, player.evo) }),
    gear: SLOTS.map(s => gear[s] ? { slot: s, rarity: gear[s].rarity, name: gear[s].name, power: gear[s].power, aff: gear[s].aff.map(a => ({ k: a.k, v: a.v })) } : null),
    comp: companions.map(primsOf)
  };
}
function sagaCode(s) { try { return btoa(unescape(encodeURIComponent(JSON.stringify(s)))); } catch (e) { return ''; } }
function sagaParse(code) {
  try {
    const s = JSON.parse(decodeURIComponent(escape(atob(String(code || '').trim()))));
    if (!s || s.v !== 1 || !WEAPONS[s.wp] || !s.p || typeof s.p !== 'object') return null;
    s.w = Math.floor(Number(s.w)); if (!(s.w >= 2 && s.w <= 999)) return null;
    return s;
  } catch (e) { return null; }
}
function readSaga() {
  let s = null;
  try { const c = localStorage.getItem(SAGA_KEY); if (c) s = sagaParse(c); } catch (e) {}
  return s || sagaMem;
}
function writeSaga(s) { sagaMem = s; try { localStorage.setItem(SAGA_KEY, sagaCode(s)); } catch (e) {} }
function clearSaga() { sagaMem = null; try { localStorage.removeItem(SAGA_KEY); } catch (e) {} }
// inscribed when a wave is cleared (merchant opens) and again as the next wave starts, so purchases are kept
function inscribeSaga(w) { if (!player || !runId) return; writeSaga(sagaSnapshot(w)); }
function sagaIsThisRun() { const s = readSaga(); return !!(s && runId && s.id === runId); }
// called when a run ends in death: the saga of this run is gone (an older saga from another run is kept)
function sagaRunOver() { if (sagaIsThisRun()) clearSaga(); }
// embers already paid out (quitting cashes out) travel with the saga so a resumed run can't be paid twice
function sagaNotePaid() { const s = readSaga(); if (s && s.id === runId) { s.paid = runPaid; writeSaga(s); } }

// ---------- restore ----------
const sagaNum = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
function restoreGear(g) {
  if (!g || SLOTS.indexOf(g.slot) < 0 || !Array.isArray(g.aff)) return null;
  const rarity = Math.floor(sagaNum(g.rarity, 0, 3, 0));
  const aff = g.aff.filter(a => a && AFFIX[a.k]).slice(0, 4).map(a => ({ k: a.k, v: sagaNum(a.v, 0, 50, 0) }));
  return { slot: g.slot, rarity, aff, power: sagaNum(g.power, 0, 999, 1), legend: rarity === 3 ? LEGEND[g.slot] : null, name: String(g.name || 'Relic').slice(0, 40) };
}
function resumeSaga(s) {
  selectedWeapon = s.wp; state = 'play';
  resetGame(); // a fresh world; everything below is laid over it
  runId = String(s.id || newRunId()).slice(0, 24); runPaid = sagaNum(s.paid, 0, 1e7, 0);
  runOmen = OMENS.find(o => o.id === s.omen) || null;
  gold = Math.floor(sagaNum(s.gold, 0, 1e9, 0)); kills = Math.floor(sagaNum(s.kills, 0, 1e7, 0)); bestCombo = Math.floor(sagaNum(s.bc, 0, 1e6, 0));
  bloodMoons = Math.floor(sagaNum(s.bm, 0, 999, 0)); frenzyCount = Math.floor(sagaNum(s.fc, 0, 9999, 0)); bossKills = Math.floor(sagaNum(s.bk, 0, 999, 0));
  rareKills = Math.floor(sagaNum(s.rk, 0, 999, 0)); questsDone = Math.floor(sagaNum(s.qd, 0, 999, 0)); treesFelled = Math.floor(sagaNum(s.tf, 0, 1e5, 0));
  wood = Math.floor(sagaNum(s.wood, 0, WOOD_MAX, 0)); campStock = Math.floor(sagaNum(s.cs, 0, 999, 0));
  activeBuffs = {}; if (s.buffs) for (const k in BUFFS) if (s.buffs[k] > 0) activeBuffs[k] = Math.floor(sagaNum(s.buffs[k], 0, 9, 0));
  // the hero: only fields a fresh hero has, of the same type, are taken
  for (const k in s.p) { if (k === 'upg' || k === 'evo' || SAGA_SKIP[k]) continue; const v = s.p[k]; if (k in player && typeof player[k] === typeof v && typeof v !== 'object') player[k] = typeof v === 'number' ? sagaNum(v, -1e6, 1e6, player[k]) : v; }
  player.upg = {}; if (s.p.upg) for (const u of UPGRADES) if (s.p.upg[u.id] > 0) player.upg[u.id] = Math.floor(sagaNum(s.p.upg[u.id], 0, u.max, 0));
  player.evo = {}; if (s.p.evo) for (const e of EVOS) if (s.p.evo[e.id] === true) player.evo[e.id] = true;
  player.weapon = s.wp; player.mount = 0; player.x = WORLD_W / 2; player.y = WORLD_H / 2; player.vx = player.vy = 0; player.invuln = 2;
  gear = { weapon: null, armor: null, trinket: null };
  if (Array.isArray(s.gear)) for (const g of s.gear) { const it = restoreGear(g); if (it) gear[it.slot] = it; }
  const hp = player.hp, mx = player.maxHp; recalcGear(); player.maxHp = mx; player.hp = Math.max(1, Math.min(mx, hp)); // gearHp came back with the hero, so nothing is added twice
  companions = [];
  if (Array.isArray(s.comp)) for (const sc of s.comp.slice(0, 3)) {
    if (!sc || !CTYPES[sc.type]) continue;
    recruitCompanion(sc.type, sc.hired ? { hired: true } : null);
    const c = companions[companions.length - 1];
    for (const k in sc) { const v = sc[k]; if (SAGA_SKIP[k] || k === 'ally' || k === 'type') continue; if ((k in c && typeof c[k] === typeof v) || k === 'hired' || k === 'wavesLeft') c[k] = typeof v === 'number' ? sagaNum(v, -1e6, 1e6, 0) : (typeof v === 'string' ? v.slice(0, 40) : v); }
    c.slot = companions.length - 1; c.x = player.x + rand(-60, 60); c.y = player.y + 50; c.maxHp = compMaxHp(c); c.hp = Math.max(1, Math.min(c.maxHp, c.hp));
  }
  rebuildParty(); renderBuffHud();
  wave = s.w; biomeIdx = -1; enemies = []; pickups = []; projectiles = []; floatTexts = []; particles = [];
  startWave(wave);
  bannerSub = 'The saga continues · ' + bannerSub; bannerT = 3.4;
  cam.x = player.x - W / 2; cam.y = player.y - H / 2; updateCamera(1, true);
  addRing(player.x, player.y, 150, '#7fe0ff', 0.9, 8); addRing(player.x, player.y, 90, '#ffd76a', 0.6, 5);
  spawnBurst(player.x, player.y - 24, '#7fe0ff', 26, 'ember'); flash('#7fe0ff', 0.35); sfx('wave');
}

// ---------- title: CONTINUE ----------
function continueSaga() {
  if (beginning || state !== 'title') return;
  const s = readSaga(); if (!s) { renderMenu(); return; }
  beginning = true; initAudio(); sfx('legend');
  const m = $('title-modal'); m.classList.add('leaving');
  setTimeout(() => { m.classList.remove('leaving'); m.style.display = 'none'; beginning = false; resumeSaga(s); }, 720);
}
function agoText(t) {
  const m = Math.max(0, Math.round((Date.now() - (t || 0)) / 60000));
  return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago';
}
const RUNESTONE = '<svg class="ws-stone" viewBox="0 0 60 80"><path d="M14 76 L10 22 Q12 6 30 4 Q48 6 50 22 L46 76Z" fill="#3a3646" stroke="#6b6680" stroke-width="2"/><path d="M18 74 L15 24 Q17 11 30 9" fill="none" stroke="#56506a" stroke-width="2"/><g class="ws-runes" stroke="#7fe0ff" stroke-width="2.4" fill="none" stroke-linecap="round"><path d="M30 18 L30 34 M30 22 L37 27 M30 26 L23 31"/><path d="M24 42 L36 42 M30 38 L30 52 L37 48"/><path d="M25 60 L30 56 L35 60 L30 66Z"/></g><ellipse cx="30" cy="77" rx="24" ry="3" fill="#7fe0ff" opacity=".25"/></svg>';
function sagaPanelHtml() {
  const s = readSaga(); if (!s) return '';
  const w = WEAPONS[s.wp], bi = Math.floor((s.w - 1) / 3) % BIOMES.length;
  const gearH = (s.gear || []).filter(Boolean).map(g => { const it = restoreGear(g); return it ? `<span class="saga-g" style="--rc:${RARITY[it.rarity].c}">${SLOT_ICON[it.slot]} ${it.name}</span>` : ''; }).join('');
  const party = (s.comp || []).filter(c => c && CTYPES[c.type]).map(c => `<span class="saga-g" style="--rc:#69db7c">${CTYPES[c.type].icon} ${String(c.name || CTYPES[c.type].name).slice(0, 30)}</span>`).join('');
  const bless = Object.keys((s.p && s.p.upg) || {}).map(k => { const u = UPGRADES.find(x => x.id === k); return u ? `<span class="ub">${u.icon}<b>${s.p.upg[k]}</b></span>` : ''; }).join('')
    + Object.keys((s.p && s.p.evo) || {}).map(k => { const e = EVOS.find(x => x.id === k); return e ? `<span class="ub">${e.icon}<b>★</b></span>` : ''; }).join('');
  return `<div class="tm-ph">THE WAYSTONE</div><div class="saga-hd">${RUNESTONE}<div class="tm-pd">Your saga was inscribed ${agoText(s.t)}. Pick up at the start of <b style="color:var(--gold)">wave ${s.w}</b> in ${BIOMES[bi].name}, exactly as you left it.</div></div>
    <div class="tm-brief"><div class="tm-stat"><b>WAVE ${s.w}</b><span>NEXT BATTLE</span></div><div class="tm-stat"><b>${w.name}</b><span>WEAPON</span></div><div class="tm-stat"><b>${Math.floor(s.gold) || 0}</b><span>GOLD</span></div><div class="tm-stat"><b>${Math.floor(s.kills) || 0}</b><span>FOES SLAIN</span></div></div>
    ${bless ? `<div class="saga-row">${bless}</div>` : ''}${gearH || party ? `<div class="saga-row">${gearH}${party}</div>` : ''}
    <div class="tm-xfer" style="margin-top:14px"><button class="tm-buy saga-go" id="saga-go">▶ CONTINUE THE SAGA</button></div>
    <div class="tm-xfer"><button class="tm-buy" id="saga-carry">📲 CARRY TO ANOTHER DEVICE</button><button class="tm-buy" id="saga-drop">✖ ABANDON SAGA</button></div><span id="saga-msg" class="saga-msg"></span>`;
}
function bindSagaPanel() {
  const go = $('saga-go'); if (!go) return;
  go.onclick = () => continueSaga();
  $('saga-carry').onclick = () => shareSagaLink(readSaga(), t => { $('saga-msg').textContent = t; });
  const d = $('saga-drop'); let armed = false;
  d.onclick = () => {
    if (!armed) { armed = true; d.textContent = 'TAP AGAIN TO ABANDON'; uiTone(200, 0.12, 0.08); return; }
    clearSaga(); sfx('block'); menuIdx = 0; renderMenu();
  };
}
// the menu gains CONTINUE (first, selected by default) whenever a saga is waiting
function syncSagaMenu() {
  const s = readSaga(), i = MENU.findIndex(m => m.id === 'cont'), play = MENU.find(m => m.id === 'play');
  if (s && i < 0) { MENU.unshift({ id: 'cont', label: 'CONTINUE · WAVE ' + s.w, sub: 'Resume your saga from the waystone' }); if (state === 'title' && !panelFocus) menuIdx = 0; }
  else if (s && i >= 0) MENU[i].label = 'CONTINUE · WAVE ' + s.w;
  else if (!s && i >= 0) { MENU.splice(i, 1); menuIdx = Math.max(0, Math.min(MENU.length - 1, menuIdx - (menuIdx > i ? 1 : 0))); }
  const go = $('tm-go'); if (go) go.textContent = s ? '▶ CONTINUE · WAVE ' + s.w : 'BEGIN THE HUNT';
  if (play) play.sub = s ? 'A new saga. Wave ' + s.w + ' is kept until your first waystone.' : 'Wave after wave. A dragon every third.';
}
var _renderMenuSaga = renderMenu;
renderMenu = function () { syncSagaMenu(); _renderMenuSaga(); };

// ---------- carry a saga between devices ----------
function sagaLink(s) { const base = typeof location !== 'undefined' && /^https?:/.test(location.protocol) ? location.origin + location.pathname : BASE_URL; return base + '#run=' + encodeURIComponent(sagaCode(s)); }
async function shareSagaLink(s, msg) {
  if (!s) { msg('No saga to carry yet.'); return; }
  const url = sagaLink(s);
  try { if (navigator.share) { await navigator.share({ title: 'Sword & Dragon — wave ' + s.w, text: 'Open this to continue my Sword & Dragon run at wave ' + s.w + '.', url }); msg('✔ Saga sent.'); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url); msg('✔ Link copied. Open it on any device to continue at wave ' + s.w + '.'); } catch (e) { msg('Copy blocked by this viewer.'); }
}
function importSagaFromHash() {
  if (typeof location === 'undefined') return;
  const m = /[#&]run=([^&]+)/.exec(location.hash || ''); if (!m) return;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  let s = null; try { s = sagaParse(decodeURIComponent(m[1])); } catch (e) {}
  const t = $('title-best');
  if (!s) { if (t) t.textContent = 'That saga link is damaged.'; return; }
  const cur = readSaga();
  if (cur && cur.id !== s.id && typeof confirm === 'function' && !confirm('Replace your saga at wave ' + cur.w + ' with the one at wave ' + s.w + '?')) return;
  writeSaga(s); menuIdx = 0; panelFocus = false; renderMenu();
  if (t) t.textContent = '✔ SAGA RECEIVED: CONTINUE AT WAVE ' + s.w;
}

// ---------- the waystone on the merchant screen ----------
function renderWaystone() {
  const el = $('waystone'); if (!el) return;
  const s = readSaga(), ok = s && s.id === runId;
  el.innerHTML = `<div class="ws-card${ok ? '' : ' off'}">${RUNESTONE}<div class="ws-t"><b>${ok ? 'SAGA INSCRIBED' : 'THE WAYSTONE'}</b><span>${ok ? (storageOK ? `Wave ${s.w} awaits. Close the game any time and continue from here.` : `This viewer can't keep saves. Carry your saga as a link to continue at wave ${s.w}.`) : 'Your saga could not be written.'}</span></div></div>
    <div class="ws-row"><button class="ws-b" id="ws-rest">⏸ REST HERE</button><button class="ws-b" id="ws-carry">📲 CARRY TO ANOTHER DEVICE</button></div><div class="ws-msg" id="ws-msg"></div>`;
  $('ws-rest').onclick = () => {
    inscribeSaga(wave + 1); cashOutRun(); sfx('block');
    $('merchant-modal').style.display = 'none'; showTitle();
    const t = $('title-best'); if (t) t.textContent = '⛰ SAGA SAVED AT WAVE ' + (wave + 1) + '. CONTINUE WHEN YOU RETURN';
  };
  $('ws-carry').onclick = () => { inscribeSaga(wave + 1); shareSagaLink(readSaga(), t => { $('ws-msg').textContent = t; }); };
}
var _openMerchantSaga = openMerchant;
openMerchant = function () { _openMerchantSaga(); inscribeSaga(wave + 1); renderWaystone(); };

// ---------- pause: SAVE & QUIT ----------
var _togglePauseSaga = togglePause;
togglePause = function () {
  _togglePauseSaga();
  if (state !== 'paused') return;
  const s = readSaga(), mine = s && s.id === runId, q = $('quit-btn'), n = $('pause-note');
  if (q) q.textContent = mine ? 'SAVE & QUIT' : 'MAIN MENU';
  if (n) n.textContent = mine ? `Your saga is kept at the waystone: you'll continue from the start of wave ${s.w}.` : 'Clear this wave to reach a waystone and save your run.';
};
