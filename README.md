# 🐾 Purrrfect Crime

A turn-based stealth heist game. You play **Leo Tuxedo**, a young, sharply dressed newcomer cat burglar
out to make a name for himself. Sneak through grand museums at night, past bulldog guards, cameras,
lasers and rival thieves. Fence the loot on the black market for **Catnip**, upgrade Leo and his lair,
and catch the eye of the legendary **NightClaw**.

There's no combat: stay hidden in the shadows and vents. Get caught and you restart the level.

**Status:** prototype M0 (grey-box). One test level with placeholder shapes: a rotating isometric camera,
two action points per turn, one bulldog guard with a vision cone and patrol, steal the Moonstone, escape.

## Play the prototype

**https://dempking.github.io/Purrrfect_Crime/** once GitHub Pages is switched on for this repository
(Settings → Pages → Source: **GitHub Actions**). Every push to `main` is tested, built and published there.

Controls: click a tile to move (blue costs 1 action point, yellow costs 2; on a phone, tap once to preview
and again to move). Red tiles are what the bulldog can see, and orange dots are where he walks next.
**Q / E** turn the camera, **F** steals, **Space** ends the turn, **R** restarts.

## Run it

```bash
npm install
npm run dev        # builds with source maps and serves on http://localhost:8100
npm run build      # dist/index.html: one self-contained file
npm test           # rules tests, plus a solver that proves the level can be beaten
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
| M0 | Grey-box prototype: one map, camera rotation, action-point movement, one bulldog guard, caught = restart |
| M1 | Stealth sandbox: light, noise, alert states, cameras, lasers, vents, lockpicking, loot, escape |
| M2 | Vertical slice: the tutorial level with real art, narrator, calling card and newspaper, black market, lair |
| M3 | Progression: attributes, skill trees, lair upgrades, difficulty, saves |
| M4 | Content: levels 1–25, rivals, all bulldog types, NightClaw's first letters, the challenge museum |
| M5 | Endgame: the NightClaw Challenge, NightClaw's Lair, ending |
| M6 | Ship: Steam, settings, accessibility, balance and polish |
