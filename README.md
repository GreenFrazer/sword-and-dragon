# Sword & Dragon — Ashes of the Wyrm

A single-file, zero-dependency 2.5D action RPG that runs in any modern browser, desktop or mobile. Your hero fights on their own; you decide where to stand. Survive wave after wave across four biomes, defend villages, recruit companions and slay a dragon every third wave.

Everything is procedural: graphics are drawn on an HTML5 canvas, and sound effects and music are synthesised with the Web Audio API. There are no image or audio files.

## Play

**Online:** https://greenfrazer.github.io/sword-and-dragon/ (GitHub Pages, served from `main`).

Or open `index.html` locally in a browser.

- **Desktop:** double-click the file, or serve the folder with any static host.
- **iPhone / iPad:** open the link above in **Safari**, then Share → **Add to Home Screen** for a full-screen app that keeps your progress. The repo includes a web app manifest, icons and a small offline service worker for this. Document viewers and in-app previewers usually block saved data (see [Saving progress](#saving-progress)).

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | WASD / arrow keys | Drag anywhere |
| Dash | Space | DASH button |
| Spin attack (breaks shields) | E | SPIN button |
| Meteor Storm | Q (charges as you fight) | METEOR button |
| Cast (piercing bolt, 3 charges) | F | CAST button |
| Pause | P / Esc | ❚❚ button |
| Mute | M | 🔊 button |

Your weapon attacks automatically. Swings deflect arrows and fireballs back at enemies.

## Features

- **Four biomes** (Emerald Meadow and three more) with their own dragon bosses, ground art, weather and music.
- **Waves and bosses:** a dragon with multi-phase attacks every third wave.
- **Village defence:** raiders attack houses and villagers; save them for gold and a chance to recruit a companion (squire, ranger or cleric). Fallen companions leave a grave you can revive them at.
- **Weapons:** Longsword, Greatsword, Twin Daggers and Spear, each with different speed, reach and crit.
- **Loot:** gear in weapon, armour and trinket slots with Common to Legendary rarity, random bonuses and legendary effects.
- **Two towns:** from wave 5, village waves defend two towns (3 houses and 2 houses) on opposite sides of the map. The raid is much bigger, and enemies come in from the edge nearest each town and favour their own town's houses, so beating one raid never ends the wave. Off-screen arrows are labelled A and B.
- **Timber:** stand still near a tree and the hero fells it (enemies always come first). Logs are carried (up to 12) and mend or rebuild village houses when you walk up to them; villagers fetch loose piles and haul them to the houses too. Surplus sells at the merchant. Stumps regrow after two waves.
- **Woodcutters:** on waves without a village, a small camp appears with three townsfolk who collect abandoned log piles (after about 6 seconds, so you get first pick) and flee from any enemy that comes close. Their stockpile is yours: walk up to the camp, or they bring it to the next village wave.
- **Blood Moons:** from wave 4, some plain waves turn crimson and dark, with a bigger swarm, red-eyed foes, more elites and double gold (plus bonus embers).
- **Elite enemies** (Swift, Vampiric, Volatile, Guarded) that always drop loot.
- **Blessings and Evolutions:** level-up choices, plus special Evolutions when a build is complete.
- **Warhorse and Cavalry Charge:** walk with no foe nearby and the hero whistles up a warhorse (a short cast bar over their head). Mounted, you ride about 70% faster, which makes crossing between two towns quick. Gallop into a foe for a **Cavalry Charge**: a big hit to everything nearby that stuns, flings foes and shatters shields, then the hero leaps from the saddle. Taking a hit throws you off (dazed), and reining in beside a foe makes you dismount to fight. No button needed, so it works the same on touch.
- **Rare Hunts:** on some non-boss waves (from wave 2) a named **Rare Elite** stalks in with a silver nameplate, a ★ on the minimap and an off-screen arrow. It fights like a raid boss in miniature, with telegraphed abilities you beat by where you stand: **Flame Pools** under your feet (they burn other foes too, so lure the pack in), a **Leaping Slam** onto your spot and a **Frontal Cleave**. At half health it rallies minions; at a quarter it runs for the map edge, and if it gets there it escapes with its hoard. Slay it for two high-rarity loot drops, a gold shower and +30 embers.
- **Herald's Bounties (quests):** on non-boss waves from wave 2, a Herald waits near you with a glowing gold **!**. Walk up to accept a bounty suited to the wave (slay archers or brutes, break shields, fell trees, smash crates, land Cavalry Charges, hit a combo, kill the rare, or slay foes without being hit). A quest tracker shows progress; when it's done the Herald shows a gold **?**: walk back for gold, an item, a heal and +15 embers. A finished bounty is still paid if the wave ends first; an unfinished one is lost.
- **Cast** ability and the **Meteor Storm** ultimate.
- **The Forge:** embers earned every run buy permanent upgrades (Vitality, Might, Fortune, Second Wind) and unlock weapons.
- **Visual effects:** a sun that arcs across each wave casting long shadows from everything (the dragon's shadow sweeps the ground when it flies), dynamic lighting, bloom, colour grading, weather (rain, storms, blizzards, ash), fog, fireflies, animated grass, a boss intro and a custom animated title screen.

## Saving progress

Embers, Forge upgrades, unlocked weapons and best wave are stored in the browser's `localStorage`. Some viewers (for example document previewers on iOS) block or discard that storage. As a workaround:

- The **game-over screen** shows a save code with a **Copy Save Code** button.
- Paste it into **The Forge → Load Code** to restore your progress, including on another device.

## Project layout

```
index.html        The built, playable game (single file)
manifest.webmanifest, sw.js, icons/   Home Screen app settings, offline cache, icons
src/              Source parts, concatenated in order by build.sh
  p0_head.html    HTML, CSS and HUD / modal markup
  theme.css       UI theme (also inlined into p0_head.html)
  p1_core.js      Setup, audio, biomes, ground art, input
  p2_logic.js     Game state, upgrades, waves, damage, effects
  p2b_village.js  Villages and companions
  p3_sim.js       Simulation, camera, enemy and boss AI, main loop
  p4_render.js    Rendering and HUD updates
  p5_gear.js      Weapons, Forge, loot, elites, evolutions, Cast
  p5b_mount.js    Warhorse mount and Cavalry Charge
  p5c_rare.js     Rare Hunts: named rare elites, their abilities and rewards
  p5d_quest.js    Herald's Bounties: quest giver, quest pool, tracker
  p6_fx.js        Lighting, bloom, weather, fog, music
  p8a_titlebg.js  Animated title-screen backdrop
  p8b_menu.js     Title menu (Armoury, Forge, Chronicle)
  p7_start.js     Game start-up
build.sh          Assembles src/ into index.html
tests/sim7.js     Headless simulation test (Node.js)
tests/wood7.js    Headless timber scenario test (chop, haul, repair, regrow)
tests/towns7.js   Headless two-town test (layout, raids, wave length)
tests/mount7.js   Headless warhorse test (summon, gallop, charge, dazed)
tests/rare7.js    Headless rare-hunt test (abilities, pools, rally, flee, hoard)
tests/quest7.js   Headless quest test (every bounty type, turn-in, courier, failure)
```

`theme.css` is kept as a separate reference; the build uses the copy already inlined in `p0_head.html`, so edit both if you change styles.

## Development

```sh
./build.sh                        # rebuild index.html from src/
node tests/sim7.js sword 30000    # headless run: weapon, frame count
node tests/wood7.js sword         # timber scenario checks
```

The test drives the game loop with a stubbed canvas and DOM and walks through menu navigation, waves, loot, evolutions and game over. It prints `errors: 0` on success. Valid weapons are `sword`, `greatsword`, `daggers` and `spear`.

## Status

Built iteratively with Claude. The headless test above runs without errors, and the menus have been checked in desktop Chrome and an emulated phone viewport. Gameplay feel, balance and behaviour on real iOS devices have not been fully play-tested.
