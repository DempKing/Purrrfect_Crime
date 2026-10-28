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
art/characters/   Leo, the guards (bulldogs), rivals, NightClaw, narrator
art/tiles/        floors and walls, by district
art/props/        display cases, plinths, paintings, furniture
art/loot/         item icons, in-world sprites, newspaper photos
art/security/     cameras, lasers, plates, panels, vault doors
art/screens/      city map, lair stages, newspaper, letters, ending art
art/models/       3D models (.glb), rendered into sprites
```

## Uploading

The web uploader takes at most 100 files at a time, and 25 MB per file. For a big set:

- **Zip it.** Put the files in a few zips of up to 25 MB each and upload the zips; they'll be unpacked into
  the folders above. Open a folder first (for example `art/models/`) so the files land there.
- At the bottom of the upload page, choose **Commit directly to the main branch**. The other option makes a
  side branch and a pull request, and nothing reaches the game until that's merged.
- For hundreds of files, GitHub Desktop (or `git push`) has no file-count limit, and allows up to 100 MB per file.

`art/models/` holds 3D models (`.glb`); they're rendered into isometric sprites from four angles.
