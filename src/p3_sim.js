// ======================= CAMERA / AMBIENT =======================
function baseScale() { return Math.max(0.65, Math.min(1, W / 1000)); }
function updateCamera(dt, snap) {
  const z = baseScale() * (1 + zoomKick), vw = W / z, vh = H / z;
  let tx = player.x + player.vx * 0.25 - vw / 2, ty = player.y + player.vy * 0.25 - vh / 2 - 20;
  if (introT > 0) { const bo = enemies.find(e => e.type === 'dragon'); if (bo) { tx = bo.x - vw / 2; ty = bo.y - vh / 2 - 40; } }
  tx = vw >= WORLD_W ? (WORLD_W - vw) / 2 : Math.max(0, Math.min(WORLD_W - vw, tx));
  // on phones let the camera scroll past the world edge so action near it clears the HUD (top) and controls (bottom)
  const padT = W < 900 ? 130 / z : 0, padB = W < 900 ? 250 / z : 0, lo = -padT, hi = WORLD_H - vh + padB;
  ty = hi < lo ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, ty));
  const k = snap ? 1 : 1 - Math.pow(0.0004, dt);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
}
function initAmbient() {
  ambient = [];
  const n = biome.amb === 'snow' ? 90 : (biome.amb === 'ember' ? 55 : 32);
  for (let i = 0; i < n; i++) ambient.push(newAmbient(true));
}
function newAmbient(anywhere) {
  const a = { x: rand(0, W), y: anywhere ? rand(0, H) : -10, ph: rand(0, TAU), s: rand(2, 5), col: biome.ambCols[Math.floor(Math.random() * biome.ambCols.length)] };
  if (biome.amb === 'ember') { a.y = anywhere ? rand(0, H) : H + 10; }
  return a;
}
function updateAmbient(dt) {
  for (let i = 0; i < ambient.length; i++) {
    const a = ambient[i]; a.ph += dt * 2;
    if (biome.amb === 'snow') { a.y += (40 + a.s * 12) * dt; a.x += Math.sin(a.ph) * 22 * dt - 10 * dt; }
    else if (biome.amb === 'ember') { a.y -= (35 + a.s * 14) * dt; a.x += Math.sin(a.ph) * 25 * dt; }
    else { a.y += (30 + a.s * 8) * dt; a.x += (Math.sin(a.ph) * 30 + 18) * dt; }
    if (a.y > H + 12 || a.y < -14 || a.x > W + 14 || a.x < -14) ambient[i] = newAmbient(false);
  }
}

// ======================= SIMULATION =======================
function stepSimulation(dt) {
  shake = Math.max(0, shake - dt * 28);
  zoomKick = Math.max(0, zoomKick - dt * 0.18);
  flashA = Math.max(0, flashA - dt * 2.2);
  bannerT = Math.max(0, bannerT - dt); bmT += dt;
  if (typeof stepFeats === 'function') stepFeats(dt);
  player.invuln = Math.max(0, player.invuln - dt); player.hitFlash = Math.max(0, player.hitFlash - dt);
  player.dashCd = Math.max(0, player.dashCd - dt / cdrMul()); player.spinCd = Math.max(0, player.spinCd - dt / cdrMul());
  player.barrier = Math.max(0, (player.barrier || 0) - dt);
  if (player.shieldT > 0) {
    const sec = Math.ceil(player.shieldT); player.shieldT = Math.max(0, player.shieldT - dt);
    if (Math.ceil(player.shieldT) !== sec) renderBuffHud();
    if (player.shieldT <= 0) { addFloatText(player.x, player.y - 70, 'Shield faded', '#adb5bd', 16); spawnBurst(player.x, player.y - 24, '#ffe066', 12, 'dot'); }
  }
  player.warpT = Math.max(0, (player.warpT || 0) - dt);
  const edt = player.warpT > 0 ? dt * 0.4 : dt; // enemy-side timestep (Hourglass slow)
  if (player.cast < 3) { player.castT -= dt; if (player.castT <= 0) { player.cast++; player.castT = player.cast < 3 ? 4 * cdrMul() : 0; } }
  if (gM().regen > 0) healPlayer(gM().regen * dt);
  updateFx(dt);
  for (const en of enemies) if (en.eAff === 'vampiric' && en.hp < en.maxHp) en.hp = Math.min(en.maxHp, en.hp + en.maxHp * 0.025 * dt);

  player.atkCooldown = Math.max(0, player.atkCooldown - dt); player.atkTimer = Math.max(0, player.atkTimer - dt);
  player.spinTime = Math.max(0, player.spinTime - dt);
  if (frenzyCd > 0) frenzyCd -= dt;
  if (frenzyT > 0) {
    frenzyT -= dt; comboT = Math.max(comboT, 1.5); // the fire keeps the combo alive
    if (particles.length < MAXP) particles.push({ x: player.x + rand(-14, 14), y: player.y - rand(0, 40), vx: rand(-20, 20), vy: rand(-90, -40), life: 0.6, maxLife: 0.6, color: Math.random() < 0.5 ? '#ff7a1a' : '#ffd43b', size: rand(3, 6), kind: 'ember', g: -30 });
    frenzyTick -= dt;
    if (frenzyTick <= 0) { frenzyTick = 0.3; forEachEnemy(o => { if (!o.flying && o.type !== 'dragon' && Math.hypot(o.x - player.x, o.y - player.y) < 88 + o.r) damageEnemy(o, Math.max(4, Math.round(atkDmg() * 0.3)), Math.atan2(o.y - player.y, o.x - player.x), 60, true); }); }
    if (frenzyT <= 0) { frenzyT = 0; frenzyCd = 5; combo = Math.floor(combo / 2); addFloatText(player.x, player.y - 70, 'Frenzy fades', '#ffa94d', 16); }
  }
  if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }

  // spawning / wave clear
  if (waveQueue.length > 0) {
    spawnTimer -= dt;
    if (spawnTimer <= 0 && enemies.length < maxAlive()) { spawnEnemy(waveQueue.shift()); spawnTimer = 1.3; }
  } else if (enemies.length === 0) {
    if (clearTimer === null) { clearTimer = slainT > 0 ? 3.7 : 1.7; settleVillage(); if (!villageResult) { addFloatText(player.x, player.y - 80, 'WAVE CLEARED!', '#ffd43b', 26); flash('#ffe066', 0.18); } }
    else { clearTimer -= dt; if (clearTimer <= 0) { clearTimer = null; openUpgradeModal(); return; } }
  }

  for (let i = props.length - 1; i >= 0; i--) {
    const p = props[i];
    if (p.fuse !== undefined) { p.fuse -= dt; if (p.fuse <= 0) destroyProp(i); }
  }

  // --- player movement ---
  const inp = getInput();
  if (player.dashTime > 0) {
    player.dashTime -= dt; player.x += player.dashVx * dt; player.y += player.dashVy * dt;
    ghosts.push({ x: player.x, y: player.y, facing: player.facing, walkPhase: player.walkPhase, life: 0.26 });
  } else {
    const spdm = player.speed * (1 + gM().spd + (hasBuff('tonic') ? 0.2 : 0) + (frenzyT > 0 ? 0.18 : 0));
    const ak = 1 - Math.pow(0.8, dt * 60); // frame-rate independent acceleration
    player.vx += (inp.ix * spdm - player.vx) * ak; player.vy += (inp.iy * spdm - player.vy) * ak;
    player.x += player.vx * dt; player.y += player.vy * dt;
  }
  player.x = Math.max(40, Math.min(WORLD_W - 40, player.x)); player.y = Math.max(50, Math.min(WORLD_H - 40, player.y));
  pushOutOfTrees(player, 10);
  const sp = Math.hypot(player.vx, player.vy);
  if (sp > 18) {
    player.walkPhase += dt * sp * 0.055;
    if (inp.mag > 0.1) player.facing = Math.atan2(inp.iy, inp.ix);
    if (Math.random() < dt * 9 && particles.length < MAXP) particles.push({ x: player.x + rand(-6, 6), y: player.y + 2, vx: rand(-14, 14), vy: rand(-18, -6), life: 0.45, maxLife: 0.45, color: biome.path2, size: rand(3, 5), kind: 'smoke', g: 0 });
  } else player.walkPhase = 0;

  // --- auto attack ---
  let nearest = null, nd = Infinity;
  for (const e of enemies) { if (e.flying) continue; const d = Math.hypot(e.x - player.x, e.y - player.y) - e.r; if (d < nd) { nd = d; nearest = e; } }
  for (const p of props) { const d = Math.hypot(p.x - player.x, p.y - player.y) - p.r; if (d < nd) { nd = d; nearest = p; } }
  if (nearest && nd <= player.range && player.atkCooldown <= 0 && player.spinTime <= 0 && player.dashTime <= 0) {
    player.facing = Math.atan2(nearest.y - player.y, nearest.x - player.x);
    player.atkCooldown = player.atkRate / (1 + gM().atkspd + (frenzyT > 0 ? 0.35 : 0)); player.atkTimer = player.atkDuration; player.atkDir *= -1;
    hitStop = 0.025; shake = Math.max(shake, 3.5); sfx('swing');
    player.swings = (player.swings || 0) + 1;
    slashes.push({ x: player.x, y: player.y - 20, ang: player.facing, dir: player.atkDir, life: 0.2, maxLife: 0.2, R: player.range * 0.95, color: bladeStyle().glow || '#ffffff', thrust: player.cone > 0 });
    if (player.evo && player.evo.world && player.swings % 3 === 0) shockwave();
    let tempestUsed = false;
    forEachEnemy(e => {
      if (e.flying) return;
      if (Math.hypot(e.x - player.x, e.y - player.y) <= player.range + e.r + 14 && (!player.cone || Math.abs(normalizeAngle(Math.atan2(e.y - player.y, e.x - player.x) - player.facing)) < player.cone + 0.25)) {
        const crit = Math.random() < critCh();
        const ang = Math.atan2(e.y - player.y, e.x - player.x);
        const hit = damageEnemy(e, Math.round(atkDmg() * (crit ? 2 : 1)), ang, player.weapon === 'greatsword' ? 330 : 230, false, crit);
        if (hit) healPlayer(vampAmt());
        if (hit && crit && player.evo && player.evo.tempest && !tempestUsed) { tempestUsed = true; lightningStrike(e.x, e.y); }
        if (hit && player.lightning > 0) {
          const zap = Math.round(atkDmg() * (0.5 + 0.1 * player.lightning));
          const others = enemies.filter(o => o !== e && !o.flying && Math.hypot(o.x - e.x, o.y - e.y) < 190)
            .sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y)).slice(0, player.lightning);
          for (const o of others) {
            addBolt(e.x, e.y - 24, o.x, o.y - 24);
            damageEnemy(o, zap, Math.atan2(o.y - e.y, o.x - e.x), 100, true);
            spawnBurst(o.x, o.y - 22, '#74c0fc', 8, 'spark');
          }
        }
      }
    });
    checkPropsInRadius(player.x, player.y, player.range + 10, true);
    deflectProjectiles(player.x, player.y, player.range + 18);
  }

  // --- timber: chop a nearby tree when idle and nothing else is in reach ---
  tickTrees(dt);
  if (!(nearest && nd <= player.range) && inp.mag < 0.15 && player.atkCooldown <= 0 && player.spinTime <= 0 && player.dashTime <= 0 && !enemies.some(e => !e.flying && Math.hypot(e.x - player.x, e.y - player.y) - e.r < player.range + 50)) {
    let tt = null, td = Infinity;
    for (const t of trees) { if (!treeAlive(t)) continue; const d = Math.hypot(t.x - player.x, t.y - player.y) - 14; if (d < td) { td = d; tt = t; } }
    if (tt && td <= player.range * 0.9) {
      player.facing = Math.atan2(tt.y - player.y, tt.x - player.x);
      player.atkCooldown = player.atkRate / (1 + gM().atkspd); player.atkTimer = player.atkDuration; player.atkDir *= -1;
      slashes.push({ x: player.x, y: player.y - 20, ang: player.facing, dir: player.atkDir, life: 0.2, maxLife: 0.2, R: player.range * 0.95, color: '#d9b27c', thrust: player.cone > 0 });
      chopTree(tt, atkDmg(), player.x);
    }
  }
  // --- player tends the village with carried timber ---
  if (village && wood > 0) {
    player.repairT = (player.repairT || 0) - dt;
    if (player.repairT <= 0) {
      const h = village.houses.find(h => Math.hypot(h.x - player.x, h.y - player.y) < 80 && (h.dead ? wood >= REBUILD_COST : h.hp < h.maxHp));
      if (h) { player.repairT = 0.6; if (h.dead) { wood -= REBUILD_COST; rebuildHouse(h); } else { wood--; repairHouse(h, 0.12); } }
    }
  }

  // --- pickups (magnetised when close or after a clear) ---
  for (let i = pickups.length - 1; i >= 0; i--) {
    const pk = pickups[i]; pk.bob += dt * 4; pk.age = (pk.age || 0) + dt;
    const dist = Math.hypot(pk.x - player.x, pk.y - player.y);
    if (pk.type === 'wood' && (wood >= WOOD_MAX || pk.claim)) continue;
    const mag = clearTimer !== null ? 560 : (dist < 95 ? 320 : 0);
    if (mag > 0 && dist > 1) { pk.x += (player.x - pk.x) / dist * mag * dt; pk.y += (player.y - pk.y) / dist * mag * dt; }
    if (dist < 42) {
      if (pk.type === 'wood') { const n = Math.min(pk.n, WOOD_MAX - wood); wood += n; pk.n -= n; addFloatText(player.x, player.y - 40, `+${n} 🪵`, '#d9b27c'); sfx('coin'); if (pk.n > 0) continue; }
      else if (pk.type === 'loot') offerItem(pk.item);
      else if (pk.type === 'gold') { gold += pk.val; addFloatText(player.x, player.y - 40, `+${pk.val}G`, '#ffd43b'); sfx('coin'); }
      else if (pk.type === 'potion') { player.hp = Math.min(player.maxHp, player.hp + 45); addFloatText(player.x, player.y - 40, '+45 HP', '#69db7c'); sfx('potion'); spawnBurst(player.x, player.y - 20, '#69db7c', 10, 'ember'); }
      else if (pk.type === 'shield') { player.shieldT = SHIELD_TIME; renderBuffHud(); addFloatText(player.x, player.y - 40, `SHIELD ${SHIELD_TIME}s!`, '#ffe066'); sfx('block'); sfx('potion'); addRing(player.x, player.y - 24, 70, '#ffe066', 0.4, 5); }
      else { player.swordTier++; player.damage += 8; addFloatText(player.x, player.y - 40, `SWORD LV.${player.swordTier}!`, '#74c0fc'); sfx('potion'); }
      pickups.splice(i, 1);
    }
  }

  // --- traps ---
  for (const h of hazards) {
    h.timer = (h.timer + dt) % 3.2;
    if (h.timer > 2.0) forEachEnemy(e => { if (!e.flying && Math.hypot(e.x - h.x, e.y - h.y) < h.r + e.r * 0.5 && e.hitFlash <= 0) damageEnemy(e, 22, 0, 40, true); });
  }

  updateCompanions(dt); updateVillage(dt); updateVillagers(dt); updateCamp(dt);
  // --- enemy AI ---
  forEachEnemy(e => {
    e.hitFlash = Math.max(0, e.hitFlash - dt); e.vx *= 0.82; e.vy *= 0.82;
    e.x = Math.max(45, Math.min(WORLD_W - 45, e.x + e.vx * edt)); e.y = Math.max(55, Math.min(WORLD_H - 45, e.y + e.vy * edt));
    if (e.type !== 'dragon') pushOutOfTrees(e, e.r * 0.6);
    if (e.stun > 0) { e.stun -= edt; return; }
    if (e.type === 'dragon') updateDragon(e, edt);
    else if (e.type === 'archer') updateArcher(e, edt);
    else if (e.type === 'bomber') updateBomber(e, edt);
    else updateMelee(e, edt);
  });
  separateEnemies();

  // --- projectiles ---
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i]; if (!p) continue;
    const pdt = p.friendly ? dt : edt;
    p.x += p.vx * pdt; p.y += p.vy * pdt; p.life -= pdt;
    if (p.kind === 'fire' && Math.random() < 0.7 && particles.length < MAXP) particles.push({ x: p.x, y: p.y - 22, vx: rand(-20, 20), vy: rand(-30, 10), life: 0.3, maxLife: 0.3, color: p.col || (p.friendly ? '#74c0fc' : '#ff922b'), size: rand(5, 9), kind: 'ember', g: 0 });
    let dead = p.life <= 0 || p.x < 10 || p.y < 10 || p.x > WORLD_W - 10 || p.y > WORLD_H - 10;
    if (!dead && p.friendly && p.pierce) {
      for (const e of [...enemies]) if (!e.flying && !p.hit.includes(e) && Math.hypot(e.x - p.x, e.y - p.y) < e.r + (p.r || 14)) { p.hit.push(e); damageEnemy(e, p.dmg, Math.atan2(p.vy, p.vx), 260, true, false, p); }
      if (Math.random() < 0.8 && particles.length < MAXP) particles.push({ x: p.x, y: p.y - 22, vx: rand(-30, 30), vy: rand(-30, 30), life: 0.3, maxLife: 0.3, color: p.col || '#b197fc', size: rand(5, 8), kind: 'ember', g: 0 });
    } else if (!dead && p.friendly) {
      for (const e of enemies) {
        if (!e.flying && Math.hypot(e.x - p.x, e.y - p.y) < e.r + 12) {
          const ang = Math.atan2(p.vy, p.vx);
          if (p.soft) { suppressUlt = true; damageEnemy(e, p.dmg, ang, 150, false, false, p); suppressUlt = false; }
          else damageEnemy(e, p.dmg, ang, 200, true, true);
          dead = true; break;
        }
      }
    } else if (!dead) {
      if (Math.hypot(player.x - p.x, player.y - p.y) < 22 + p.r * 0.4) { damagePlayer(p.dmg, p.x - p.vx * 0.1, p.y - p.vy * 0.1); dead = true; }
      else for (const c of companions) if (!c.down && Math.hypot(c.x - p.x, c.y - p.y) < c.r + 8) { damageComp(c, p.dmg, p.x - p.vx * 0.1, p.y - p.vy * 0.1); dead = true; break; }
    }
    if (projectiles[i] !== p) continue;
    if (dead) { if (p.kind === 'fire') { spawnBurst(p.x, p.y - 20, '#ff922b', 12, 'spark'); glows.push({ x: p.x, y: p.y - 20, r: 60, life: 0.2, maxLife: 0.2, color: '#ff922b' }); } projectiles.splice(i, 1); }
  }
  // --- meteors ---
  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i]; m.delay -= dt;
    if (m.delay < 0.3 && Math.random() < 0.8 && particles.length < MAXP) particles.push({ x: m.x + rand(-10, 10), y: m.y - (m.delay / 0.3) * 520, vx: rand(-20, 20), vy: rand(-10, 20), life: 0.3, maxLife: 0.3, color: '#ff922b', size: rand(6, 10), kind: 'ember', g: 0 });
    if (m.delay <= 0) {
      explosionFx(m.x, m.y, m.r, '#ffa94d', true); sfx('meteor');
      suppressUlt = true;
      forEachEnemy(e => { if (!e.flying && Math.hypot(e.x - m.x, e.y - m.y) <= m.r + e.r) { e.hasShield = false;
    let md = m.dmg;
    if (e.type === 'dragon') { // dragons shrug off most of a storm: 40% per meteor, and a storm can take at most 30% of max HP
      if (e.stormId !== m.storm) { e.stormId = m.storm; e.stormDmg = 0; }
      md = Math.min(Math.round(md * 0.4), Math.max(0, Math.round(e.maxHp * 0.3) - e.stormDmg)); e.stormDmg += md;
      if (md <= 0) return;
    }
    damageEnemy(e, md, Math.atan2(e.y - m.y, e.x - m.x), 380, true); } });
      suppressUlt = false;
      checkPropsInRadius(m.x, m.y, m.r);
      meteors.splice(i, 1);
    }
  }
  // --- boss shockwaves ---
  for (let i = novas.length - 1; i >= 0; i--) {
    const n = novas[i]; n.r += n.speed * dt;
    if (!n.hit && Math.abs(Math.hypot(player.x - n.x, player.y - n.y) - n.r) < 26) { n.hit = true; damagePlayer(n.dmg, n.x, n.y); }
    n.hc = n.hc || [];
    for (const c of companions) if (!c.down && !n.hc.includes(c) && Math.abs(Math.hypot(c.x - n.x, c.y - n.y) - n.r) < 28) { n.hc.push(c); damageComp(c, n.dmg, n.x, n.y); }
    if (n.r >= n.maxR) novas.splice(i, 1);
  }

  // --- visual effect timers ---
  for (const arr of [rings, glows, slashes, bolts, ghosts]) for (let i = arr.length - 1; i >= 0; i--) { arr[i].life -= dt; if (arr[i].life <= 0) arr.splice(i, 1); }
  for (let i = scorches.length - 1; i >= 0; i--) { scorches[i].life -= dt; if (scorches[i].life <= 0) scorches.splice(i, 1); }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (p.kind === 'smoke') { p.vx *= 0.97; }
    if (p.life <= 0) { particles[i] = particles[particles.length - 1]; particles.pop(); } // swap-remove: O(1) instead of splice
  }
  for (let i = floatTexts.length - 1; i >= 0; i--) { const f = floatTexts[i]; f.y -= 38 * dt; f.life -= dt; if (f.life <= 0) floatTexts.splice(i, 1); }
}

function separateEnemies() {
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i]; if (a.flying) continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j]; if (b.flying) continue;
      let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      const min = (a.r + b.r) * 0.85;
      if (d < min) {
        if (d < 0.001) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d = Math.hypot(dx, dy); }
        const push = (min - d) / 2, nx = dx / d, ny = dy / d;
        const wa = a.type === 'dragon' ? 0.1 : 1, wb = b.type === 'dragon' ? 0.1 : 1;
        a.x -= nx * push * wa; a.y -= ny * push * wa; b.x += nx * push * wb; b.y += ny * push * wb;
      }
    }
  }
}
function pushOutOfTrees(ent, radius) {
  for (const t of trees) {
    if (!treeAlive(t)) continue;
    const dx = ent.x - t.x, dy = ent.y - t.y, d = Math.hypot(dx, dy), min = 12 + radius;
    if (d < min) { if (d < 0.001) { ent.x += min; continue; } ent.x = t.x + dx / d * min; ent.y = t.y + dy / d * min; }
  }
}

// ======================= ENEMY AI =======================
function updateMelee(e, dt) {
  e.atkCd = Math.max(0, e.atkCd - dt);
  const t = getTarget(e, dt, false), o = t.obj, tr = targetRadius(t);
  const dx = o.x - e.x, dy = o.y - e.y, dist = Math.hypot(dx, dy), ta = Math.atan2(dy, dx);
  e.facing += normalizeAngle(ta - e.facing) * Math.min(1, (e.hasShield ? 3.2 : 8) * dt);
  if (e.windup > 0) {
    e.windup -= dt;
    if (e.windup <= 0) { e.atkCd = 1.15; if (dist <= e.r + 44 + tr) strikeTarget(e, t); }
    return;
  }
  if (dist > e.r + 28 + tr) { e.x += Math.cos(ta) * e.speed * dt; e.y += Math.sin(ta) * e.speed * dt; e.walkPhase += dt * e.speed * 0.065; }
  else if (e.atkCd <= 0) e.windup = 0.38;
}
function updateArcher(e, dt) {
  e.atkCd = Math.max(0, e.atkCd - dt);
  const t = getTarget(e, dt, true), o = t.obj;
  const dx = o.x - e.x, dy = o.y - e.y, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  if (e.aim > 0) {
    e.aim -= dt; e.facing = e.aimAng;
    if (e.aim > 0.25) e.aimAng = ang;
    if (e.aim <= 0) { shootProjectile('arrow', e.x, e.y, e.aimAng, 540, e.damage, 1.7, 10); e.atkCd = 2.1; sfx('shoot'); }
    return;
  }
  e.facing += normalizeAngle(ang - e.facing) * Math.min(1, 8 * dt);
  if (dist < 240 || dist > 350) {
    const m = dist < 240 ? -1 : 1;
    e.x += Math.cos(ang) * e.speed * m * dt; e.y += Math.sin(ang) * e.speed * m * dt; e.walkPhase += dt * e.speed * 0.065;
  } else { e.x += Math.cos(ang + Math.PI / 2) * e.dir * 55 * dt; e.y += Math.sin(ang + Math.PI / 2) * e.dir * 55 * dt; e.walkPhase += dt * 3; }
  if (e.atkCd <= 0 && dist < 440) { e.aim = 0.85; e.aimAng = ang; }
}
function updateBomber(e, dt) {
  const t = getTarget(e, dt, false), o = t.obj, tr = targetRadius(t);
  const dx = o.x - e.x, dy = o.y - e.y, dist = Math.hypot(dx, dy), ta = Math.atan2(dy, dx);
  e.facing = ta;
  if (e.fuse > 0) { e.fuse -= dt; sfx('fuse'); if (e.fuse <= 0) killEnemy(e); return; }
  if (dist > e.r + 36 + tr) { e.x += Math.cos(ta) * e.speed * dt; e.y += Math.sin(ta) * e.speed * dt; e.walkPhase += dt * e.speed * 0.07; }
  else e.fuse = 0.65;
}

// ---- Dragon boss (two phases, skin per biome) ----
function updateDragon(d, dt) {
  d.wingPhase += dt * (d.enraged ? 9 : 6); d.aiTimer -= dt;
  // chain-follow tail
  let px = d.x - Math.cos(d.facing) * 28, py = d.y - Math.sin(d.facing) * 12;
  for (const s of d.tail) { const dx = s.x - px, dy = s.y - py, dd = Math.hypot(dx, dy) || 1; s.x = px + dx / dd * 15; s.y = py + dy / dd * 15; px = s.x; py = s.y; }
  if (!d.enraged && d.hp < d.maxHp * 0.5 && d.aiState !== 'fly_telegraph') enrageDragon(d);
  const rage = d.enraged ? 1.3 : 1;
  const st = d.aiState;
  if (st === 'chase') {
    const ang = Math.atan2(player.y - d.y, player.x - d.x); d.facing = ang;
    d.x += Math.cos(ang) * d.speed * rage * dt; d.y += Math.sin(ang) * d.speed * rage * dt; d.walkPhase += dt * 6;
    if (Math.hypot(player.x - d.x, player.y - d.y) < d.r + 36) { damagePlayer(d.damage, d.x, d.y); d.aiState = 'recover'; d.aiTimer = 1.5; }
    else if (d.aiTimer <= 0) {
      const opts = ['breath', 'fly']; if (d.enraged) opts.push('barrage', 'nova', 'barrage');
      const pick = opts[Math.floor(Math.random() * opts.length)];
      if (pick === 'breath') { d.aiState = 'breath_telegraph'; d.aiTimer = 1.1 / rage; d.facing = Math.atan2(player.y - d.y, player.x - d.x); sfx('roar'); }
      else if (pick === 'fly') { d.aiState = 'fly_telegraph'; d.flying = true; d.aiTimer = 1.4; d.targetX = d.x; d.targetY = d.y; }
      else if (pick === 'barrage') { d.aiState = 'barrage_telegraph'; d.aiTimer = 0.9; d.volley = 0; }
      else { d.aiState = 'nova_telegraph'; d.aiTimer = 1.0; }
    }
  } else if (st === 'breath_telegraph') {
    if (d.aiTimer <= 0) { d.aiState = 'breath_fire'; d.aiTimer = 0.85; shake = 10; }
  } else if (st === 'breath_fire') {
    for (let k = 0; k < 4; k++) {
      const sp = d.facing + (Math.random() - 0.5) * 0.55, v = 280 + Math.random() * 190;
      if (particles.length < MAXP) particles.push({ x: d.x + Math.cos(d.facing) * 45, y: d.y + Math.sin(d.facing) * 45 - 40, vx: Math.cos(sp) * v, vy: Math.sin(sp) * v, life: 0.45, maxLife: 0.45, color: Math.random() > 0.4 ? d.skin.fire[0] : d.skin.fire[1], size: rand(7, 11), kind: 'ember', g: 0 });
    }
    sfx('fire'); shake = Math.max(shake, 4);
    const pd = Math.hypot(player.x - d.x, player.y - d.y), pa = Math.atan2(player.y - d.y, player.x - d.x);
    if (pd < 260 && Math.abs(normalizeAngle(pa - d.facing)) < 0.36) damagePlayer(d.damage, d.x, d.y);
    for (const c of companions) if (!c.down && Math.hypot(c.x - d.x, c.y - d.y) < 260 && Math.abs(normalizeAngle(Math.atan2(c.y - d.y, c.x - d.x) - d.facing)) < 0.4) damageComp(c, d.damage, d.x, d.y);
    if (d.aiTimer <= 0) { d.aiState = 'recover'; d.aiTimer = 2.1; addFloatText(d.x, d.y - 100, 'EXHAUSTED! STRIKE NOW!', '#69db7c', 18); }
  } else if (st === 'fly_telegraph') {
    d.targetX += (player.x - d.targetX) * 4 * dt; d.targetY += (player.y - d.targetY) * 4 * dt;
    if (d.aiTimer <= 0) {
      d.flying = false; d.x = d.targetX; d.y = d.targetY; shake = 18; zoomKick = 0.04;
      explosionFx(d.x, d.y, 115, d.skin.glow, true);
      if (Math.hypot(player.x - d.x, player.y - d.y) < 115) damagePlayer(d.damage + 6, d.x, d.y);
      hurtAllies(d.x, d.y, 115, d.damage + 6);
      d.aiState = 'recover'; d.aiTimer = 2.2; addFloatText(d.x, d.y - 100, 'VULNERABLE!', '#69db7c', 18);
    }
  } else if (st === 'barrage_telegraph') {
    d.facing = Math.atan2(player.y - d.y, player.x - d.x);
    if (d.aiTimer <= 0) { fireVolley(d, d.volley); d.volley++; d.aiState = 'barrage_wait'; d.aiTimer = 0.5; }
  } else if (st === 'barrage_wait') {
    if (d.aiTimer <= 0) {
      if (d.volley < 3) { d.facing = Math.atan2(player.y - d.y, player.x - d.x); fireVolley(d, d.volley); d.volley++; d.aiTimer = 0.5; }
      else { d.aiState = 'recover'; d.aiTimer = 1.6; }
    }
  } else if (st === 'nova_telegraph') {
    if (d.aiTimer <= 0) {
      novas.push({ x: d.x, y: d.y, r: 30, maxR: 420, speed: 400, dmg: d.damage, hit: false });
      addRing(d.x, d.y, 420, d.skin.glow, 1.0, 10); shake = 14; sfx('boom'); flash(d.skin.glow, 0.2);
      d.aiState = 'recover'; d.aiTimer = 1.8;
    }
  } else if (st === 'recover') {
    if (d.aiTimer <= 0) { d.aiState = 'chase'; d.aiTimer = d.enraged ? 2.0 : 2.6; }
  }
}
function fireVolley(d, n) {
  const base = Math.atan2(player.y - d.y, player.x - d.x), count = 5, spread = 0.9;
  for (let i = 0; i < count; i++) {
    const a = base + (i - (count - 1) / 2) * (spread / (count - 1)) + (n % 2 ? 0.08 : 0);
    shootProjectile('fire', d.x + Math.cos(a) * 40, d.y + Math.sin(a) * 30, a, 290, Math.round(d.damage * 0.7), 3.2, 14);
  }
  sfx('fire'); sfx('roar'); shake = Math.max(shake, 6);
}
function enrageDragon(d) {
  d.enraged = true; d.aiState = 'recover'; d.aiTimer = 1.4; d.flying = false;
  sfx('roar'); flash('#ff2a2a', 0.5); shake = 22; zoomKick = 0.07; slowT = 0.5;
  addRing(d.x, d.y, 360, '#ff4d4d', 0.9, 12);
  addFloatText(d.x, d.y - 110, 'ENRAGED!', '#ff6b6b', 28);
  waveQueue.unshift('grunt', 'grunt'); spawnTimer = 0.5;
}

// ======================= MAIN LOOP =======================
let lastTime = performance.now();
function update(now) {
  const rdt = Math.min(0.05, (now - lastTime) / 1000); lastTime = now;
  time += rdt; if (introT > 0) introT -= rdt; if (slainT > 0) slainT -= rdt; if (impactT > 0) impactT -= rdt; if (impactCd > 0) impactCd -= rdt;
  let dt = rdt;
  if (slowT > 0) { slowT -= rdt; dt = rdt * 0.3; }
  if (introT > 0 && state === 'play') dt = Math.min(dt, rdt * 0.35);
  if (state === 'play') {
    if (hitStop > 0) hitStop -= rdt; else stepSimulation(dt);
  }
  updateAmbient(rdt);
  if (state === 'title') tbDraw(rdt);
  else { updateCamera(rdt, false);
  render();
  updateHUD(); }
  requestAnimationFrame(update);
}
