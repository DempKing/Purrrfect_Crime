# 🐾 Purrrfect Crime

A turn-based stealth heist game. You play **Leo Tuxedo**, a young, sharply dressed newcomer cat burglar
out to make a name for himself. Sneak through grand museums at night, past the guards, cameras,
lasers and rival thieves. Fence the loot on the black market for **Catnip**, upgrade Leo and his lair,
and catch the eye of the legendary **NightClaw**.

There's no combat: stay hidden in the shadows and vents. Get caught and you restart the level.

**Status:** prototype M4 in progress (content), placeholder art. There's **one mode, the hardest**: no
difficulty choice, no checkpoints, no undo, and every level is designed to be beaten flawlessly.
**Old Town, Museum Mile, The Heights and Harbour are built**: after the
tutorial come the Cobblestone Coin Museum (a sleepy guard, creaky floorboards, a safe), the Clocktower
Archive (a captain who calls for help, rafters for Ceiling Climb), the Pawnbroker Penthouse (a sniffer
who smells through walls, pulsing lasers) and the Opera House Costume Vault (moving spotlights). Museum Mile follows
with five dim halls: Natural History (pressure plates), the Egyptian Wing (motion sensors), the Modern
Art Atrium, the Gem & Mineral Hall and the Planetarium. The Heights brings card-reader doors (the
Millionaire's Mansion), rooftop gaps and wires for Tightrope (the Sky Garden Hotel), glass walls (the
Glass Tower Auction), guard dogs and water (the Yacht Club) and a vault with a combination (the
Observatory Estate). Harbour has crates to hide in (the Customs Warehouse), a lighthouse beam (the
Lighthouse Collection), the tide (the Shipwreck Museum), a fish market where sniffers can't smell a cat
(the Fish Market Bank) and light switches (the Aquarium Gala). **NightClaw's letters** arrive after ten heists and 10,000 Catnip of sales; the
second opens his challenge museum, the Midnight Museum. **Rival thieves** (Mittens, Luna, Sammy and
Professor Paws) sometimes race Leo for the centrepiece, with a warning on the lair's rumour board. Each
level opens when the one before it is cleared. Underneath is M3's progression (save slots, attributes,
skill trees, lair rooms, the briefing) and the M2 slice (narrator, newspaper, black market).

## Play the prototype

**https://dempking.github.io/Purrrfect_Crime/** — every push to `main` is tested, built and published there.

In a heist: click a tile to move (blue costs 1 action point, yellow costs 2; on a phone, tap once to preview
and again to move). The planned path turns yellow where a guard would notice Leo and red where he'd be
caught or set off the alarm. Red tiles are what the guards see, purple what the cameras see, and orange
dots are where the guards walk next. Actions (pick, smash, take, panel, fuse, vents) appear as buttons
at the bottom, or press **1–9**. **Q / E** turn the camera, **Space** ends the turn, **R** restarts.

## Run it

```bash
npm install
npm run dev        # builds with source maps and serves on http://localhost:8100
npm run build      # dist/index.html: one self-contained file
npm test           # rules, skills, progression, market and newspaper tests, plus a flawless route through every level
npm run solve -- l1-coin-museum --clean --write   # find (and save) flawless routes while designing a level
npm run typecheck
node tests/e2e.mjs # plays the built game in a headless browser (needs Playwright)
```

## Code map

```
src/core/      the rules, with no drawing: level parsing, movement and action points, guard sight
               and patrols, the turn order, and a solver that searches every way a heist can go
src/levels/    level maps (text grids) and guard routes
src/render/    PixiJS isometric renderer: projection, rotating camera, grey-box art
src/main.ts    input, animation, turn flow and the HUD
tests/         unit tests (npm test) and the browser playthrough (tests/e2e.mjs)
```

## Documents

| Document | What's in it |
| --- | --- |
| [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) | The full design: turns and camera, stealth, security, rivals, loot and the black market, progression, the lair, story and NightClaw's letters, tutorial, 25 levels, art and sprite spec, tech plan, milestones, decisions |
| [docs/ORIGINAL_BRIEF.md](docs/ORIGINAL_BRIEF.md) | The original pitch and decisions, word for word |
| [art/README.md](art/README.md) | Where generated sprites go and how to upload them |

## Platforms

- **Web:** for playtesting, at https://dempking.github.io/Purrrfect_Crime/ (published by GitHub Actions on every push).
- **Steam:** Windows, macOS and Linux, packaged with Electron.

## Milestones

| # | Milestone |
| --- | --- |
| M0 ✓ | Grey-box prototype: one map, camera rotation, action-point movement, one guard, caught = restart |
| M1 ✓ | Stealth sandbox: light, noise, alert states, cameras, lasers, vents, lockpicking, loot, escape |
| M2 ✓ (art pending) | Vertical slice: the tutorial level with real art, narrator, calling card and newspaper, black market, lair |
| M3 ✓ | Progression: attributes, skill trees, lair upgrades, saves |
| M4 (Old Town ✓, Museum Mile ✓, The Heights ✓, Harbour ✓, rivals ✓, letters 1–3 ✓, challenge museum ✓) | Content: levels 1–25, rivals, all guard types, NightClaw's first letters, the challenge museum |
| M5 | Endgame: the NightClaw Challenge, NightClaw's Lair, ending |
| M6 | Ship: Steam, settings, accessibility, balance and polish |
