# 🐾 Purrrfect Crime

A turn-based stealth heist game. You play **Leo Tuxedo**, a young, sharply dressed newcomer cat burglar
out to make a name for himself. Sneak through grand museums at night, past the guards, cameras,
lasers and rival thieves. Fence the loot on the black market for **Catnip**, upgrade Leo and his lair,
and catch the eye of the legendary **NightClaw**.

There's no combat: stay hidden in the shadows and vents. Get caught and you restart the level.

**Status:** prototype M3 (progression), placeholder art. Three save slots, each with a difficulty chosen
once (Casual, Professional, Mastermind, Legendary: more guards and cameras, bigger rewards, and no
checkpoints or undo on the top two). At the lair Leo spends attribute points and Catnip on six
attributes, learns skills from three trees (Shadow, Tech, Acrobat), and builds six rooms: the Planning
Table (a briefing map before each heist that shows more per tier), the Workshop (bottle caps), the
Fence's Office, the Scratching Tower, the Trophy Room and the Mailbox. In a heist, gadgets and active
skills sit in a row above the actions; aim them at the highlighted tiles. On the easier difficulties a
chalk paw print marks a checkpoint, and Undo (Z) takes back a turn. Underneath is the M2 slice: the
tutorial and narrator, the calling card and newspaper, the black market, and the lair.

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
npm test           # rules, skills, progression, market and newspaper tests, plus winning routes on every difficulty
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
| M3 ✓ | Progression: attributes, skill trees, lair upgrades, difficulty, saves |
| M4 | Content: levels 1–25, rivals, all guard types, NightClaw's first letters, the challenge museum |
| M5 | Endgame: the NightClaw Challenge, NightClaw's Lair, ending |
| M6 | Ship: Steam, settings, accessibility, balance and polish |
