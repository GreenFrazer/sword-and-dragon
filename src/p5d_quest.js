
// ======================= HERALD'S BOUNTIES: WoW-style quests =======================
// On non-boss waves from wave 2 a Herald waits near the hero with a gold "!". Walk up to accept a
// bounty picked to suit the wave (archers, shields, the rare, trees, crates, charges...). A tracker
// shows progress; when it is done the Herald shows a gold "?": walk back to collect gold, an item
// and embers. Finish before the wave clears or the bounty is lost (a finished one is still paid).
var herald = null, quest = null, questsDone = 0;
const qCount = t => waveQueue.filter(x => x === t).length + enemies.filter(e => e.type === t).length;
const QUESTS = [
  { id: 'slay', title: 'Thin the Ranks', unit: 'goblins slain', need: w => 6 + Math.floor(w * 0.8), ok: () => waveQueue.length >= 8 },
  { id: 'archer', title: 'Cut the Bowstrings', unit: 'archers slain', need: () => Math.min(5, qCount('archer')), ok: () => qCount('archer') >= 3 },
  { id: 'brute', title: 'Giant Slayer', unit: 'brutes slain', need: () => Math.min(4, qCount('brute')), ok: () => qCount('brute') >= 3 },
  { id: 'shield', title: 'Shieldbreaker', unit: 'shields broken', need: () => 3, ok: () => qCount('shield') >= 4 },
  { id: 'rare', title: 'Wanted: Dead', unit: 'rare elite slain', need: () => 1, ok: () => qCount('rare') > 0, w: 4 },
  { id: 'timber', title: 'Timber for the Town', unit: 'trees felled', need: () => 3, ok: () => trees.filter(treeAlive).length >= 8 },
  { id: 'crate', title: 'Smash and Grab', unit: 'crates and barrels broken', need: () => 3, ok: () => props.length >= 4 },
  { id: 'charge', title: 'Cavalry Drill', unit: 'Cavalry Charges landed', need: () => 2, ok: () => typeof cavalryCharge === 'function' },
  { id: 'clean', title: 'Untouchable', unit: 'slain without being hit', need: () => 8, ok: () => waveQueue.length >= 10 },
  { id: 'combo', title: 'Blood and Rhythm', unit: 'combo reached', need: w => 12 + Math.min(10, w), ok: () => waveQueue.length >= 14 }
];

function spawnHerald(w) {
  herald = null; quest = null;
  if (w < 2 || w % 3 === 0) return;
  const pool = []; for (const q of QUESTS) if (q.ok()) for (let i = 0; i < (q.w || 1); i++) pool.push(q);
  if (!pool.length) return;
  const def = pool[Math.floor(Math.random() * pool.length)];
  const a = rand(0, TAU), h = { x: Math.max(80, Math.min(WORLD_W - 80, player.x + Math.cos(a) * 170)), y: Math.max(90, Math.min(WORLD_H - 70, player.y + Math.sin(a) * 120)) };
  pushOutOfTrees(h, 16);
  herald = { ...h, type: 'herald', ally: true, fem: Math.random() < 0.5, facing: 0, walkPhase: 0, vx: 0, vy: 0, hitFlash: 0, invuln: 0, r: 16, st: 'offer', def, fade: 1 };
}
function acceptQuest() {
  const d = herald.def;
  quest = { id: d.id, title: d.title, unit: d.unit, need: Math.max(1, d.need(wave)), prog: 0 };
  herald.st = 'active';
  addFloatText(herald.x, herald.y - 100, 'Quest accepted: ' + d.title, '#ffd43b', 17); sfx('scroll');
  addRing(herald.x, herald.y, 70, '#ffd43b', 0.4, 4);
}
// progress hooks, called from the game's own events
function questEvent(kind, a) {
  if (!quest || herald.st !== 'active') return;
  const q = quest, add = n => { q.prog = Math.min(q.need, q.prog + n); if (q.prog >= q.need) questDone(); };
  if (kind === 'kill') {
    if (q.id === 'slay' || q.id === 'clean') add(1);
    else if (q.id === a.type || (q.id === 'rare' && a.rare)) add(1);
  } else if (kind === 'hurt') { if (q.id === 'clean' && q.prog > 0) { q.prog = 0; addFloatText(player.x, player.y - 92, 'Untouchable: count reset', '#ffa8a8', 14); } }
  else if (kind === 'combo') { if (q.id === 'combo' && a > q.prog) { q.prog = Math.min(q.need, a); if (q.prog >= q.need) questDone(); } }
  else if (kind === q.id) add(1); // shield, timber, crate, charge
}
function questDone() {
  herald.st = 'done'; sfx('ready');
  addFloatText(player.x, player.y - 96, quest.title + ' complete! Return to the Herald', '#ffe066', 17);
}
function questReward(atX, atY, courier) {
  questsDone++;
  const g = Math.round((40 + wave * 12) * goldMul());
  for (let i = 0; i < 4; i++) pickups.push({ x: atX + rand(-30, 30), y: atY + 26 + rand(-8, 12), type: 'gold', val: Math.round(g / 4), bob: i });
  spawnLoot(atX, atY + 40, 0.35 + Math.min(0.4, wave * 0.03));
  healPlayer(Math.round(player.maxHp * 0.15));
  bannerText = 'QUEST COMPLETE'; bannerSub = quest.title + ' · +' + g + ' gold · +15 embers'; bannerT = 2.6;
  flash('#ffe066', 0.25); addRing(atX, atY, 140, '#ffd43b', 0.6, 7); spawnBurst(atX, atY - 50, '#ffd43b', 24, 'spark'); sfx('quest');
  if (courier) addFloatText(player.x, player.y - 110, 'The Herald sends your reward', '#ffe066', 15);
  herald.st = 'thanks'; quest = null;
}
// wave cleared: pay out a finished bounty, drop an unfinished one
function questWaveEnd() {
  if (!herald) return;
  if (herald.st === 'done') questReward(player.x, player.y, true);
  else if (herald.st === 'active') { addFloatText(player.x, player.y - 110, 'Bounty failed: ' + quest.title, '#ff8787', 16); quest = null; }
  herald.st = 'thanks';
}
function stepQuest(dt) {
  if (!herald) return;
  const d = Math.hypot(player.x - herald.x, player.y - herald.y);
  herald.facing = Math.atan2(player.y - herald.y, player.x - herald.x);
  if (herald.st === 'offer' && d < 72) acceptQuest();
  else if (herald.st === 'done' && d < 80) questReward(herald.x, herald.y, false);
  else if (herald.st === 'active' && quest.id === 'combo') questEvent('combo', combo);
  if (herald.st === 'thanks') { herald.fade -= dt * 0.5; if (herald.fade <= 0) herald = null; }
}

// ---------- drawing ----------
function drawHerald() {
  const h = herald; if (!h) return;
  ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, h.fade));
  drawHumanoid(h, false);
  // feathered cap
  ctx.translate(h.x, h.y);
  ctx.fillStyle = '#5f3dc4'; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, -51, 13, 5, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -53, 9, Math.PI, TAU); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#ffd43b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(6, -56); ctx.quadraticCurveTo(18, -70, 24, -64 + Math.sin(time * 3) * 2); ctx.stroke();
  ctx.restore();
}
// the quest marker is drawn after lighting and darkness (screen space) so it always glows, even under a Blood Moon
function drawHeraldGlyph() {
  const h = herald; if (!h || !(h.st === 'offer' || h.st === 'done' || h.st === 'active')) return;
  const p = worldToScreen(h.x, h.y - 88), z = baseScale() * (1 + zoomKick);
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(z, z); drawQuestGlyph(0, 0, h.st === 'offer' ? '!' : '?', h.st === 'active'); ctx.restore();
}
function drawQuestGlyph(x, y, ch, grey) {
  const b = Math.sin(time * 3.2) * 5;
  if (!grey) drawGlow(x, y + b - 12, 34, '#ffd43b', 0.55 + 0.2 * Math.sin(time * 5));
  ctx.font = "900 38px Georgia, 'Times New Roman', serif"; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  ctx.lineWidth = 6; ctx.strokeStyle = '#2b1a05'; ctx.strokeText(ch, x, y + b);
  const g = ctx.createLinearGradient(0, y + b - 30, 0, y + b);
  if (grey) { g.addColorStop(0, '#dee2e6'); g.addColorStop(1, '#868e96'); } else { g.addColorStop(0, '#fff3bf'); g.addColorStop(0.5, '#ffd43b'); g.addColorStop(1, '#e8890c'); }
  ctx.fillStyle = g; ctx.fillText(ch, x, y + b);
}
// screen-edge glyph pointing to the Herald when it has something for you
function drawHeraldIndicator() {
  const h = herald; if (!h || (h.st !== 'offer' && h.st !== 'done')) return;
  const s = worldToScreen(h.x, h.y - 40);
  if (s.x > 30 && s.x < W - 30 && s.y > 30 && s.y < H - 30) return;
  const a = Math.atan2(s.y - H / 2, s.x - W / 2), m = 40;
  const x = Math.max(m, Math.min(W - m, s.x)), y = Math.max(m + 70, Math.min(H - m - 100, s.y));
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = '#ffd43b'; ctx.strokeStyle = '#2b1a05'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(4, -10); ctx.lineTo(4, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.font = "900 26px Georgia, serif"; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = '#2b1a05';
  ctx.strokeText(h.st === 'offer' ? '!' : '?', x - Math.cos(a) * 6, y + 9); ctx.fillStyle = '#ffd43b'; ctx.fillText(h.st === 'offer' ? '!' : '?', x - Math.cos(a) * 6, y + 9); ctx.restore();
}
// quest tracker (HTML, left column above the party list)
function updateQuestHud() {
  const h = herald, st = h ? h.st : '';
  const show = st === 'offer' || st === 'active' || st === 'done';
  setStyle('quest-hud', 'display', show ? 'block' : 'none');
  setClass('quest-hud', 'done', st === 'done');
  if (show) {
    if (st === 'offer') { setText('qh-title', '❗ A Herald has a bounty'); setText('qh-obj', 'Walk to the Herald to accept'); setStyle('qh-fill', 'width', '0%'); }
    else if (st === 'active') { setText('qh-title', quest.title); setText('qh-obj', `${quest.prog}/${quest.need} ${quest.unit}`); setStyle('qh-fill', 'width', `${Math.round(quest.prog / quest.need * 100)}%`); }
    else { setText('qh-title', '✔ ' + h.def.title); setText('qh-obj', 'Return to the Herald for your reward'); setStyle('qh-fill', 'width', '100%'); }
  }
  // keep clear of the boss / rare nameplate where they share the top-left (phones, narrow windows)
  const qh = $('quest-hud'), bh = $('boss-hud');
  let dy = 0;
  if (show && hudCache['boss-huddisplay'] === 'flex' && bh.getBoundingClientRect && qh.getBoundingClientRect) {
    const b = bh.getBoundingClientRect(), q = qh.getBoundingClientRect();
    if (b.left < q.right && b.right > q.left) dy = Math.max(0, Math.ceil(b.bottom + 8 - qh.offsetTop));
  }
  setStyle('quest-hud', 'transform', dy ? `translateY(${dy}px)` : '');
  const off = show && qh.offsetHeight ? qh.offsetHeight + 8 + dy : 0;
  setStyle('party', 'transform', off ? `translateY(${off}px)` : '');
}
