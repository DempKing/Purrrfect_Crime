# 🐾 Purrrfect Crime

A turn-based stealth heist game. You play **Leo Tuxedo**, a young, sharply dressed newcomer cat burglar
out to make a name for himself. Sneak through grand museums at night, past bulldog guards, cameras,
lasers and rival thieves. Fence the loot on the black market for **Catnip**, upgrade Leo and his lair,
and catch the eye of the legendary **NightClaw**.

There's no combat: stay hidden in the shadows and vents. Get caught and you restart the level.

**Status:** prototype M1 (stealth sandbox), placeholder art. **The Night Gallery** is a dark museum
with lamplight and moonlight, noisy marble, two bulldogs who get suspicious before they catch you,
sweeping cameras and a camera panel, lasers and a fuse box, locked doors, display cases to pick or smash,
vents, a bag that holds 6 and an alarm countdown. The M0 warm-up, **The Grey Gallery**, is still there.

## Play the prototype

**https://dempking.github.io/Purrrfect_Crime/** once GitHub Pages is switched on for this repository
(Settings → Pages → Source: **GitHub Actions**). Every push to `main` is tested, built and published there.

Controls: click a tile to move (blue costs 1 action point, yellow costs 2; on a phone, tap once to preview
and again to move). The planned path turns yellow where a bulldog would notice Leo and red where he'd be
caught or set off the alarm. Red tiles are what the bulldogs see, purple what the cameras see, and orange
dots are where the bulldogs walk next. Actions (pick, smash, take, panel, fuse, vents) appear as buttons
at the bottom, or press **1–9**. **Q / E** turn the camera, **Space** ends the turn, **R** restarts.

## Run it

```bash
npm install
npm run dev        # builds with source maps and serves on http://localhost:8100
npm run build      # dist/index.html: one self-contained file
npm test           # rules tests, a solver for the warm-up and a known winning route for the Night Gallery
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

- **Web:** for playtesting, at https://dempking.github.io/Purrrfect_Crime/ once the first build is up and
  GitHub Pages is switched on for this repository.
- **Steam:** Windows, macOS and Linux, packaged with Electron.

## Milestones

| # | Milestone |
| --- | --- |
| M0 ✓ | Grey-box prototype: one map, camera rotation, action-point movement, one bulldog guard, caught = restart |
| M1 ✓ | Stealth sandbox: light, noise, alert states, cameras, lasers, vents, lockpicking, loot, escape |
| M2 | Vertical slice: the tutorial level with real art, narrator, calling card and newspaper, black market, lair |
| M3 | Progression: attributes, skill trees, lair upgrades, difficulty, saves |
| M4 | Content: levels 1–25, rivals, all bulldog types, NightClaw's first letters, the challenge museum |
| M5 | Endgame: the NightClaw Challenge, NightClaw's Lair, ending |
| M6 | Ship: Steam, settings, accessibility, balance and polish |
