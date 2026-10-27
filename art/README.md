# Art

Generated sprites for Purrrfect Crime go here. The full spec (sizes, facing directions, animation lists)
is in [§12.1 of the design doc](../docs/GAME_DESIGN.md#121-generated-sprites-what-to-produce).

## Quick spec

- 2:1 isometric. Floor tiles 128 × 64 px; full walls 128 × 192 px.
- Characters about 96 px tall on a 128 × 128 canvas, feet at the bottom centre.
- Transparent PNG, no baked-in shadows, neutral night lighting from the top left.
- Characters in 4 facing directions: `ne`, `se`, `sw`, `nw`.
- Name files `group_name_direction_animation_frame.png`, for example `leo_se_walk_03.png`.

Don't worry if your files don't follow the naming yet; upload them as they are and they'll be sorted and
renamed when they're wired into the game.

## Folders

```
art/characters/   Leo, bulldog guards, rivals, NightClaw, narrator
art/tiles/        floors and walls, by district
art/props/        display cases, plinths, paintings, furniture
art/loot/         item icons, in-world sprites, newspaper photos
art/security/     cameras, lasers, plates, panels, vault doors
art/screens/      city map, lair stages, newspaper, letters, ending art
```

## Uploading

On github.com, open this repository and use **Add file → Upload files**. GitHub takes up to 100 files and
25 MB per file per upload, so a big set goes up in a few rounds. Zips are fine too (keep each under
25 MB); they'll be unpacked into the folders above.
