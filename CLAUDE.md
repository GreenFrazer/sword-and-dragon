# CLAUDE.md — Sword & Dragon

Single-file, zero-dependency HTML5 canvas action RPG. Read `README.md` for features, controls and layout. This file covers what you need to change the code safely.

## Golden rules

- **Edit `src/`, never `index.html` directly.** `index.html` is generated: run `./build.sh` after every change and commit both `src/` and `index.html`.
- **The game must stay one self-contained file.** No libraries, no build tooling, no image/audio files, no network requests. Graphics are canvas-drawn, audio is Web Audio synthesis.
- **Keep it mobile friendly.** It is played on iPhone (Home Screen web app and file viewers). Every action needs a touch route (no keyboard-only features), and scrollable modals need `touch-action: pan-y`.
- **UK spelling** in text and comments.
- Don't claim something works without running it. See Testing.

## Build order matters

`build.sh` concatenates the parts in this order into one `<script>`:

`p0_head.html` (HTML + CSS + markup, ends with `<script>`) → `p1_core.js` → `p2_logic.js` → `p2b_village.js` → `p3_sim.js` → `p4_render.js` → `p5_gear.js` → `p6_fx.js` → `p8a_titlebg.js` → `p8b_menu.js` → `p7_start.js` (last: starts the game).

Consequences:
- All parts share one global scope. A later `function` declaration overrides an earlier one (for example `showTitle` and `renderTitleMenu` in `p8b_menu.js` replace the ones in `p5_gear.js`).
- `let`/`const` are not usable before their line runs. Anything touched during start-up before its declaration needs `var` (see `fxDirty`, `storageOK` in `p1_core.js`). The game only starts in `p7_start.js`, after everything is defined.
- `theme.css` is a reference copy; the build uses the CSS already inlined in `p0_head.html` (marked `/* @@THEME */`). Change both, or paste `theme.css` over that block.

## Architecture in brief

- **State:** global `state` is one of `title | play | upgrade | gameover | paused`. `resetGame()` starts a run; `startWave(w)` builds each wave (village on `w % 3 === 2`, boss on `w % 3 === 0`, biome = `floor((w-1)/3) % 4`).
- **Loop:** `update(now)` in `p3_sim.js` runs `stepSimulation(dt)`, then `render()` and `updateHUD()`. On the title screen it runs `tbDraw()` (animated backdrop) instead.
- **Damage:** `damageEnemy()`, `killEnemy()`, `damagePlayer()` in `p2_logic.js`. Iterate enemies with `forEachEnemy()` (it snapshots the list); killing a dragon clears `projectiles` and kills the rest, so loops must tolerate arrays changing under them.
- **Player stats:** base values live on `player`; gear bonuses come from `player.g` via helpers (`atkDmg()`, `critCh()`, `vampAmt()`, `cdrMul()`, `goldMul()`) in `p5_gear.js`. Use these instead of reading `player.damage` directly.
- **Persistence:** `meta` (embers, Forge levels, unlocked weapons) and `bestWave` use `localStorage` inside `try/catch`. Some viewers block it, so there is a copy/paste save code (`metaCode()` / `loadCode()` in `p8b_menu.js`, also shown on the game-over screen).
- **Timber:** trees carry `hp/fell/regrow/grow/shake`; always test `treeAlive(t)` before using a tree (collision, shadows, minimap). Wood piles are `pickups` of type `'wood'` (`n` logs, `claim` set when a villager targets one). `wood` is a run stock (cap `WOOD_MAX`), reset in `resetGame()`. Villager hauling is `updateVillagers()` in `p2b_village.js`. Normal swings call `checkPropsInRadius(..., true)` so they don't chop trees by accident.
- **Menu:** title UI is `p8b_menu.js` (`renderMenu`, `menuKey`, `beginRun`); backdrop is `p8a_titlebg.js`. HTML ids used by code include `title-modal`, `menu-list`, `menu-panel`, `start-btn`, `forge-btn`, `go-code`; keep them if you edit markup.

## Testing

```sh
./build.sh
node tests/sim7.js sword 30000      # also: greatsword, daggers, spear
node tests/wood7.js sword           # timber scenario (prints 'wood: all checks passed')
```

`tests/sim7.js` runs the built `index.html` headlessly in a Node `vm` with a stubbed canvas and DOM. It navigates the menu, plays through waves (loot, elites, evolutions, bosses) and forces game over. Success prints `errors: 0`. Runs are random, so run a couple of weapons after risky changes; a crash prints `ERR frame N` with a stack.

Limits of the test: it does not render pixels or check feel, layout or touch input. For UI work, load `index.html` in a real browser (Playwright with Chrome works) and take screenshots at desktop (about 1440×860) and phone (about 390×780, touch) sizes.

Test-harness gotchas: the stub allows only one pending `requestAnimationFrame`, so don't add a second rAF loop (drive extra animation from `update`); new canvas element ids must be added to `canvasIds` in the test; guard browser-only globals (`navigator`, `btoa`) with `typeof` checks.

## Hosting

Served as a static site (GitHub Pages from `main`, root). `manifest.webmanifest`, `sw.js` (network-first offline cache) and `icons/` make it installable on iOS via Share → Add to Home Screen. If you add files the game needs offline, add them to `FILES` in `sw.js` and bump `CACHE`.
