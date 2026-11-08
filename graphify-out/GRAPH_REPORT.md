# Graph Report - Purrrfect_Crime  (2026-11-08)

## Corpus Check
- 132 files · ~150,261 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 131 file(s) not represented in the graph (top: .glb 120, .woff2 5, (none) 3)

## Summary
- 1758 nodes · 5204 edges · 91 communities (88 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 43 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `81fddb87`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- abilities.ts
- Heist App: HUD, Turns & Loot
- Music & Sound
- Controls, Gamepad & Settings
- Character & Loot Art
- Floor & Wall Textures
- Walls, Furniture & Props Drawing
- Lair & Progression
- Profile, Saves & Newspaper
- Heist Actions & Level Parsing
- Web Deploy Workflow
- Levels & Districts
- Menus & Story Screens
- Loot Icons
- Heist View & Projection
- Floor Marks & Overlays
- walls.ts
- Portraits & Key Art
- Intro Cinematic
- noticed.ts
- key
- Museum Exhibits
- Browser Playthrough Test
- Character Drawing
- Art Preparation Tool
- steps
- State
- meta/letters.ts
- TypeScript Config
- Sprite Manifest
- Package Info
- light.ts
- Dev Dependencies
- npm Scripts
- Steam Art Script
- report.ts
- 3D Model Baker Page
- 3D Model Baker
- Prop sprite: classic_laptop
- Prop sprite: ClassicConsole_01
- Prop sprite: coffee_table_round_01
- Steam Screenshot Script
- Build Script
- Prop sprite: CoffeeCart_01
- Prop sprite: concrete_cat_statue
- Prop sprite: concrete_road_barrier
- Prop sprite: covered_car
- Prop sprite: dining_chair_02
- Prop sprite: dining_table
- Prop sprite: drawer_cabinet
- Prop sprite: drill_press_01
- Prop sprite: exterior_aircon_unit
- Prop sprite: fancy_picture_frame_01
- Prop sprite: fancy_picture_frame_02
- Prop sprite: fire_alarm
- Prop sprite: fire_hydrant
- Prop sprite: garden_gnome
- Prop sprite: gothic_coffee_table
- Prop sprite: gothic_statue
- Prop sprite: GothicCabinet_01
- Prop sprite: hand_truck
- Prop sprite: hanging_picture_frame_01
- Prop sprite: horse_statue_01
- Prop sprite: industrial_microscope
- Prop sprite: industrial_pastic_container
- Prop sprite: industrial_storage_cart
- Prop sprite: island_tree_01
- Prop sprite: korean_fire_extinguisher_01
- Prop sprite: lambis_shell
- Prop sprite: Lantern_01
- Prop sprite: lifebuoy
- Prop sprite: lion_head
- Prop sprite: mantel_clock_01
- Prop sprite: marble_bust_01
- Prop sprite: medical_box
- Prop sprite: metal_jerrycan
- Prop sprite: metal_office_desk
- Prop sprite: metal_tool_chest
- Prop sprite: metal_toolbox
- Prop sprite: Shelf_01
- Prop sprite: Sofa_01
- Prop sprite: Ukulele_01
- Prop sprite: WetFloorSign_01
- Prop sprite: WoodenTable_02
- Test Runner
- Lock Picking Test
- eslint.config.mjs
- .prettierrc.json
- eslint@9.14.0
- @fontsource/patrick-hand@5.3.0
- assets.d.ts

## God Nodes (most connected - your core abstractions)
1. `project()` - 82 edges
2. `$` - 72 edges
3. `key()` - 68 edges
4. `tileNow()` - 47 edges
5. `w` - 45 edges
6. `d` - 45 edges
7. `h` - 45 edges
8. `Point` - 38 edges
9. `State` - 37 edges
10. `actionsHere()` - 35 edges

## Surprising Connections (you probably didn't know these)
- `solve()` --calls--> `actionsHere()`  [EXTRACTED]
  tools/solve.ts → src/core/actions.ts
- `solve()` --calls--> `doAction()`  [EXTRACTED]
  tools/solve.ts → src/core/actions.ts
- `distanceMap()` --calls--> `blocksMove()`  [EXTRACTED]
  tools/solve.ts → src/core/level.ts
- `solve()` --calls--> `blocksMove()`  [EXTRACTED]
  tools/solve.ts → src/core/level.ts
- `solve()` --calls--> `moveAp()`  [EXTRACTED]
  tools/solve.ts → src/core/movement.ts

## Import Cycles
- 2-file cycle: `src/app/between.ts -> src/app/turn.ts -> src/app/between.ts`
- 2-file cycle: `src/app/hud.ts -> src/app/turn.ts -> src/app/hud.ts`
- 2-file cycle: `src/app/notices.ts -> src/app/turn.ts -> src/app/notices.ts`
- 2-file cycle: `src/app/actions.ts -> src/app/hud.ts -> src/app/actions.ts`
- 2-file cycle: `src/app/actions.ts -> src/app/moves.ts -> src/app/actions.ts`
- 2-file cycle: `src/app/camera.ts -> src/app/loot.ts -> src/app/camera.ts`
- 2-file cycle: `src/app/hud.ts -> src/app/loot.ts -> src/app/hud.ts`
- 2-file cycle: `src/app/loot.ts -> src/app/preview.ts -> src/app/loot.ts`
- 2-file cycle: `src/app/moves.ts -> src/app/notices.ts -> src/app/moves.ts`
- 2-file cycle: `src/app/clicks.ts -> src/app/hud.ts -> src/app/clicks.ts`
- 2-file cycle: `src/meta/profile.ts -> src/meta/progression.ts -> src/meta/profile.ts`
- 2-file cycle: `src/core/actions.ts -> src/core/noticed.ts -> src/core/actions.ts`
- 2-file cycle: `src/core/sight.ts -> src/core/state.ts -> src/core/sight.ts`
- 2-file cycle: `src/core/light.ts -> src/core/sight.ts -> src/core/light.ts`
- 3-file cycle: `src/app/between.ts -> src/app/notices.ts -> src/app/turn.ts -> src/app/between.ts`
- 3-file cycle: `src/app/between.ts -> src/app/turn.ts -> src/app/hud.ts -> src/app/between.ts`
- 3-file cycle: `src/app/hud.ts -> src/app/turn.ts -> src/app/loot.ts -> src/app/hud.ts`
- 3-file cycle: `src/app/hud.ts -> src/app/turn.ts -> src/app/notices.ts -> src/app/hud.ts`
- 3-file cycle: `src/app/hud.ts -> src/app/turn.ts -> src/app/restart.ts -> src/app/hud.ts`
- 3-file cycle: `src/app/actions.ts -> src/app/hud.ts -> src/app/clicks.ts -> src/app/actions.ts`

## Communities (91 total, 3 thin omitted)

### Community 0 - "abilities.ts"
Cohesion: 0.07
Nodes (47): ABILITY_NAMES, ABILITY_RANGE, ABILITY_TARGET, AbilityInfo, BOTTLE_CAP_NOISE, Ability, AP_PER_TURN, CRAWL (+39 more)

### Community 1 - "Heist App: HUD, Turns & Loot"
Cohesion: 0.07
Nodes (130): cancelTargeting(), performAction(), pinsNeeded(), runAbility(), runAction(), startAbility(), leo, play() (+122 more)

### Community 2 - "Music & Sound"
Cohesion: 0.06
Nodes (69): introMusic(), finaleTheme(), HEIST_SCENES, heistTheme(), lairTheme(), menuTheme(), midi(), MUSIC (+61 more)

### Community 3 - "Controls, Gamepad & Settings"
Cohesion: 0.06
Nodes (45): actionForButton(), actionForKey(), cleanKeys(), cleanPad(), defaultKeys(), defaultPad(), KEY_ACTIONS, KEY_NAMES (+37 more)

### Community 4 - "Character & Loot Art"
Cohesion: 0.03
Nodes (11): CHAR_FILES, CharFrame, CharFrameName, CharName, frames, icons, loot, LOOT_FILES (+3 more)

### Community 5 - "Floor & Wall Textures"
Cohesion: 0.04
Nodes (25): AQUA, CARPET, CHECKER, COBBLE, CONCRETE, CREAK, DISTRICT_LOOKS, FILES (+17 more)

### Community 6 - "Walls, Furniture & Props Drawing"
Cohesion: 0.16
Nodes (38): tileHash(), lootPicture(), sprite(), crate(), crateStack(), desk(), displayCase(), drawBeam() (+30 more)

### Community 7 - "Lair & Progression"
Cohesion: 0.10
Nodes (37): challengeProgress(), collectorWants(), demand(), DOLLARS_PER_CATNIP, fenceRate(), priceOf(), attributeCost(), AttributeInfo (+29 more)

### Community 8 - "Profile, Saves & Newspaper"
Cohesion: 0.11
Nodes (28): LootCategory, CORNER_GALLERY_ROUTE, openMusicBox(), finalePaper(), buyLair(), CATEGORIES, completeHeist(), deleteSlot() (+20 more)

### Community 9 - "Heist Actions & Level Parsing"
Cohesion: 0.11
Nodes (45): canSteal(), steal(), doAction(), ALARM_TURNS, BASE_PERKS, planGuards(), CameraDef, GuardDef (+37 more)

### Community 10 - "Web Deploy Workflow"
Cohesion: 0.06
Nodes (37): outputs, runs-on, steps, concurrency, cancel-in-progress, group, environment, if (+29 more)

### Community 11 - "Levels & Districts"
Cohesion: 0.10
Nodes (29): LevelDef, CASINO, GRAND_BANK, MINT, MISCHIEF, TREASURY, AQUARIUM, CUSTOMS_WAREHOUSE (+21 more)

### Community 12 - "Menus & Story Screens"
Cohesion: 0.12
Nodes (34): allLoot(), laserAxis(), LAIR_PRICE, charImageUrl(), briefing(), GUARD_NOTES, cityMap(), CARD_SVG (+26 more)

### Community 13 - "Loot Icons"
Cohesion: 0.16
Nodes (31): bell(), bone(), book(), box(), coins(), crown(), cushion(), egg() (+23 more)

### Community 14 - "Heist View & Projection"
Cohesion: 0.13
Nodes (27): pixi.js, beaconFacing(), spotlightsNow(), Notice, drawEffects(), drawLootHops(), drawSpotlights(), drawViewCones() (+19 more)

### Community 15 - "Floor Marks & Overlays"
Cohesion: 0.18
Nodes (29): drawCachedTile(), drawFloor(), drawFloorMarks(), drawLayerPlan(), floorColor(), belt(), paint(), decoyCard() (+21 more)

### Community 16 - "walls.ts"
Cohesion: 0.04
Nodes (18): NEIGHBORS, clockFace(), onWall(), FILES, FlatName, STANDING_FLATS, textures, WALL_FLATS (+10 more)

### Community 17 - "Portraits & Key Art"
Cohesion: 0.07
Nodes (4): ABILITY_ICONS, KEY_ART, PORTRAITS, RIVAL_ROOFTOP

### Community 18 - "Intro Cinematic"
Cohesion: 0.20
Nodes (25): W(), clamp01(), ease(), IntroHooks, lerp(), NEWS, playIntro(), bowTie() (+17 more)

### Community 19 - "noticed.ts"
Cohesion: 0.14
Nodes (40): useAbility(), near8(), BARK_RANGE, CAPTAIN_CALL, GUARD_STEPS, NOISE, SEARCH_STEPS, disturbances() (+32 more)

### Community 20 - "key"
Cohesion: 0.17
Nodes (33): abilityTargets(), blocksThrow(), throwable(), actionsHere(), lootGone(), near4(), take(), GuardStep (+25 more)

### Community 21 - "Museum Exhibits"
Cohesion: 0.09
Nodes (22): BUST, BY_DISTRICT, BY_LEVEL, CAT_IDOL, CAT_STATUE, CHEST, CONCH, districtOfLevel() (+14 more)

### Community 22 - "Browser Playthrough Test"
Cohesion: 0.15
Nodes (14): action(), clickTile(), COIN, endTurnIfStill(), errors, idle(), keyboard, letterTitles (+6 more)

### Community 23 - "Character Drawing"
Cohesion: 0.37
Nodes (13): charFrame(), actorTint(), drawGuard(), drawLeo(), drawNightClaw(), drawRival(), drawRobo(), faceSprite() (+5 more)

### Community 24 - "Art Preparation Tool"
Cohesion: 0.12
Nodes (13): byName, CHARACTERS, chars, FRAMES, known, LOOT, MODEL_LOOT, named (+5 more)

### Community 25 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, GRAPHIFY_BACKEND, GRAPHIFY_FORCE, runs-on, steps, jobs (+15 more)

### Community 26 - "State"
Cohesion: 0.17
Nodes (14): ActionKind, Perks, pathTo(), State, args, distanceMap(), formatRoute(), Heap (+6 more)

### Community 27 - "meta/letters.ts"
Cohesion: 0.10
Nodes (25): RivalId, RIVALS, Achievement, ACHIEVEMENTS, CHALLENGE_ITEM, CHALLENGE_PLACE, challengeDone(), deliverLetters() (+17 more)

### Community 28 - "TypeScript Config"
Cohesion: 0.13
Nodes (14): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, noUnusedLocals, noUnusedParameters (+6 more)

### Community 29 - "Sprite Manifest"
Cohesion: 0.14
Nodes (13): croissant, ax, ay, h, mount, scale, size, w (+5 more)

### Community 30 - "Package Info"
Cohesion: 0.15
Nodes (12): description, @fontsource/nunito@5.3.0, @types/three@0.170.0, typescript@5.9.3, license, name, private, productName (+4 more)

### Community 31 - "light.ts"
Cohesion: 0.39
Nodes (8): beaconCache, beaconTiles(), lightAt(), lightCache, lightMap(), lightNow(), clearLine(), inCone()

### Community 32 - "Dev Dependencies"
Cohesion: 0.17
Nodes (12): devDependencies, @fontsource/homemade-apple@5.3.0, @fontsource/luckiest-guy@5.3.0, @fontsource/unifrakturmaguntia@5.3.0, pixi.js@8.21.0, prettier@3.4.2, @types/node@22.15.0, @fontsource/homemade-apple (+4 more)

### Community 33 - "npm Scripts"
Cohesion: 0.17
Nodes (12): scripts, balance, build, dev, format, format:check, lint, solve (+4 more)

### Community 34 - "Steam Art Script"
Cohesion: 0.17
Nodes (6): ART, { chromium }, KEYART, out, root, sizes

### Community 35 - "report.ts"
Cohesion: 0.16
Nodes (19): the(), HeistFacts, MASTHEAD, money(), Photo, pick(), Story, writePaper() (+11 more)

### Community 36 - "3D Model Baker Page"
Cohesion: 0.18
Nodes (9): three@0.170.0, three, Baked, BakeOptions, key, loader, renderer, rim (+1 more)

### Community 37 - "3D Model Baker"
Cohesion: 0.20
Nodes (9): esbuild@0.24.2, esbuild, catalog, DEFAULTS, manifestFile, models, out, require (+1 more)

### Community 38 - "Prop sprite: classic_laptop"
Cohesion: 0.22
Nodes (9): classic_laptop, ax, ay, h, mount, scale, size, w (+1 more)

### Community 39 - "Prop sprite: ClassicConsole_01"
Cohesion: 0.22
Nodes (9): ClassicConsole_01, ax, ay, h, mount, scale, size, w (+1 more)

### Community 40 - "Prop sprite: coffee_table_round_01"
Cohesion: 0.22
Nodes (9): coffee_table_round_01, ax, ay, h, mount, scale, size, w (+1 more)

### Community 41 - "Steam Screenshot Script"
Cohesion: 0.22
Nodes (5): { chromium }, HEISTS, out, root, STASH

### Community 42 - "Build Script"
Cohesion: 0.22
Nodes (7): dev, fontFaces, FONTS, html, js, out, root

### Community 43 - "Prop sprite: CoffeeCart_01"
Cohesion: 0.25
Nodes (8): CoffeeCart_01, ax, ay, h, mount, scale, size, w

### Community 44 - "Prop sprite: concrete_cat_statue"
Cohesion: 0.25
Nodes (8): concrete_cat_statue, ax, ay, h, mount, scale, size, w

### Community 45 - "Prop sprite: concrete_road_barrier"
Cohesion: 0.25
Nodes (8): concrete_road_barrier, ax, ay, h, mount, scale, size, w

### Community 46 - "Prop sprite: covered_car"
Cohesion: 0.25
Nodes (8): covered_car, ax, ay, h, mount, scale, size, w

### Community 47 - "Prop sprite: dining_chair_02"
Cohesion: 0.25
Nodes (8): dining_chair_02, ax, ay, h, mount, scale, size, w

### Community 48 - "Prop sprite: dining_table"
Cohesion: 0.25
Nodes (8): dining_table, ax, ay, h, mount, scale, size, w

### Community 49 - "Prop sprite: drawer_cabinet"
Cohesion: 0.25
Nodes (8): drawer_cabinet, ax, ay, h, mount, scale, size, w

### Community 50 - "Prop sprite: drill_press_01"
Cohesion: 0.25
Nodes (8): drill_press_01, ax, ay, h, mount, scale, size, w

### Community 51 - "Prop sprite: exterior_aircon_unit"
Cohesion: 0.25
Nodes (8): exterior_aircon_unit, ax, ay, h, mount, scale, size, w

### Community 52 - "Prop sprite: fancy_picture_frame_01"
Cohesion: 0.25
Nodes (8): fancy_picture_frame_01, ax, ay, h, mount, scale, size, w

### Community 53 - "Prop sprite: fancy_picture_frame_02"
Cohesion: 0.25
Nodes (8): fancy_picture_frame_02, ax, ay, h, mount, scale, size, w

### Community 54 - "Prop sprite: fire_alarm"
Cohesion: 0.25
Nodes (8): fire_alarm, ax, ay, h, mount, scale, size, w

### Community 55 - "Prop sprite: fire_hydrant"
Cohesion: 0.25
Nodes (8): fire_hydrant, ax, ay, h, mount, scale, size, w

### Community 56 - "Prop sprite: garden_gnome"
Cohesion: 0.25
Nodes (8): garden_gnome, ax, ay, h, mount, scale, size, w

### Community 57 - "Prop sprite: gothic_coffee_table"
Cohesion: 0.25
Nodes (8): gothic_coffee_table, ax, ay, h, mount, scale, size, w

### Community 58 - "Prop sprite: gothic_statue"
Cohesion: 0.25
Nodes (8): gothic_statue, ax, ay, h, mount, scale, size, w

### Community 59 - "Prop sprite: GothicCabinet_01"
Cohesion: 0.25
Nodes (8): GothicCabinet_01, ax, ay, h, mount, scale, size, w

### Community 60 - "Prop sprite: hand_truck"
Cohesion: 0.25
Nodes (8): hand_truck, ax, ay, h, mount, scale, size, w

### Community 61 - "Prop sprite: hanging_picture_frame_01"
Cohesion: 0.25
Nodes (8): hanging_picture_frame_01, ax, ay, h, mount, scale, size, w

### Community 62 - "Prop sprite: horse_statue_01"
Cohesion: 0.25
Nodes (8): horse_statue_01, ax, ay, h, mount, scale, size, w

### Community 63 - "Prop sprite: industrial_microscope"
Cohesion: 0.25
Nodes (8): industrial_microscope, ax, ay, h, mount, scale, size, w

### Community 64 - "Prop sprite: industrial_pastic_container"
Cohesion: 0.25
Nodes (8): industrial_pastic_container, ax, ay, h, mount, scale, size, w

### Community 65 - "Prop sprite: industrial_storage_cart"
Cohesion: 0.25
Nodes (8): industrial_storage_cart, ax, ay, h, mount, scale, size, w

### Community 66 - "Prop sprite: island_tree_01"
Cohesion: 0.25
Nodes (8): island_tree_01, ax, ay, h, mount, scale, size, w

### Community 67 - "Prop sprite: korean_fire_extinguisher_01"
Cohesion: 0.25
Nodes (8): korean_fire_extinguisher_01, ax, ay, h, mount, scale, size, w

### Community 68 - "Prop sprite: lambis_shell"
Cohesion: 0.25
Nodes (8): lambis_shell, ax, ay, h, mount, scale, size, w

### Community 69 - "Prop sprite: Lantern_01"
Cohesion: 0.25
Nodes (8): Lantern_01, ax, ay, h, mount, scale, size, w

### Community 70 - "Prop sprite: lifebuoy"
Cohesion: 0.25
Nodes (8): lifebuoy, ax, ay, h, mount, scale, size, w

### Community 71 - "Prop sprite: lion_head"
Cohesion: 0.25
Nodes (8): lion_head, ax, ay, h, mount, scale, size, w

### Community 72 - "Prop sprite: mantel_clock_01"
Cohesion: 0.25
Nodes (8): mantel_clock_01, ax, ay, h, mount, scale, size, w

### Community 73 - "Prop sprite: marble_bust_01"
Cohesion: 0.25
Nodes (8): marble_bust_01, ax, ay, h, mount, scale, size, w

### Community 74 - "Prop sprite: medical_box"
Cohesion: 0.25
Nodes (8): medical_box, ax, ay, h, mount, scale, size, w

### Community 75 - "Prop sprite: metal_jerrycan"
Cohesion: 0.25
Nodes (8): metal_jerrycan, ax, ay, h, mount, scale, size, w

### Community 76 - "Prop sprite: metal_office_desk"
Cohesion: 0.25
Nodes (8): metal_office_desk, ax, ay, h, mount, scale, size, w

### Community 77 - "Prop sprite: metal_tool_chest"
Cohesion: 0.25
Nodes (8): metal_tool_chest, ax, ay, h, mount, scale, size, w

### Community 78 - "Prop sprite: metal_toolbox"
Cohesion: 0.25
Nodes (8): metal_toolbox, ax, ay, h, mount, scale, size, w

### Community 79 - "Prop sprite: Shelf_01"
Cohesion: 0.25
Nodes (8): Shelf_01, ax, ay, h, mount, scale, size, w

### Community 80 - "Prop sprite: Sofa_01"
Cohesion: 0.25
Nodes (8): Sofa_01, ax, ay, h, mount, scale, size, w

### Community 81 - "Prop sprite: Ukulele_01"
Cohesion: 0.25
Nodes (8): Ukulele_01, ax, ay, h, mount, scale, size, w

### Community 82 - "Prop sprite: WetFloorSign_01"
Cohesion: 0.25
Nodes (8): WetFloorSign_01, ax, ay, h, mount, scale, size, w

### Community 83 - "Prop sprite: WoodenTable_02"
Cohesion: 0.25
Nodes (8): WoodenTable_02, ax, ay, h, mount, scale, size, w

### Community 84 - "Test Runner"
Cohesion: 0.25
Nodes (5): entries, files, outdir, res, root

### Community 85 - "Lock Picking Test"
Cohesion: 0.25
Nodes (4): { chromium }, errors, require, root

### Community 86 - "eslint.config.mjs"
Cohesion: 0.29
Nodes (6): @eslint/js@9.14.0, globals@15.12.0, typescript-eslint@8.13.0, @eslint/js, globals, typescript-eslint

### Community 87 - ".prettierrc.json"
Cohesion: 0.50
Nodes (3): printWidth, singleQuote, trailingComma

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `pixi.js` connect `Heist View & Projection` to `Dev Dependencies`, `Heist App: HUD, Turns & Loot`, `Character & Loot Art`, `Floor & Wall Textures`, `Walls, Furniture & Props Drawing`, `Floor Marks & Overlays`, `walls.ts`, `Character Drawing`, `Package Info`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Should `abilities.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07088989441930618 - nodes in this community are weakly interconnected._
- **Why does `Playing` connect `Music & Sound` to `Heist App: HUD, Turns & Loot`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `Heist App: HUD, Turns & Loot` be split into smaller, more focused modules?**
  _Cohesion score 0.06841524488583312 - nodes in this community are weakly interconnected._
- **Why does `$` connect `Heist App: HUD, Turns & Loot` to `Music & Sound`, `Controls, Gamepad & Settings`, `Profile, Saves & Newspaper`, `Heist View & Projection`, `meta/letters.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Should `Music & Sound` be split into smaller, more focused modules?**
  _Cohesion score 0.05711086226203808 - nodes in this community are weakly interconnected._
- **Should `Controls, Gamepad & Settings` be split into smaller, more focused modules?**
  _Cohesion score 0.06418219461697723 - nodes in this community are weakly interconnected._