# Music

The game plays a different track on each screen. Put the files here, named after the screen, as `.mp3`
(about 128 kbps is plenty). The build copies them next to the game; a missing one falls back to the next
in line, and in a heist to the synthesized band.

| File | When it plays | Track |
| --- | --- | --- |
| `heist.mp3` | Sneaking about | "Surreptitious", Tanner Helland |
| `alert.mp3` | A guard is suspicious or searching | "Ominosity", Tanner Helland |
| `chase.mp3` | The alarm is ringing | "Thugs", Tanner Helland |
| `report.mp3` | The heist report | "Daybreak", Tanner Helland |
| `finale.mp3` | NightClaw's museum and lair | "Purgatory's Mansion", Tanner Helland |

These come from https://github.com/tannerhelland/free-music, under **Creative Commons Attribution 4.0**: free
for commercial games, with a credit (in `credits.json`, shown in the end credits). They were re-encoded at
112 kbps with a short fade in and out so the loop point is gentle.

The title screen, the opening cinematic and the screens between heists have our own music, made live in the
game (no files needed): `src/menuTheme.ts` (the spy theme on the title screen), `src/introSounds.ts` (the TV
news theme and the cozy room in the intro) and `src/lairTheme.ts` (the lair theme: the lair, the city map, the
black market and the planning board).

Other good sources: Kevin MacLeod at https://incompetech.com (CC BY 4.0).

For every track you add, add its credit to `credits.json` here, and it shows in the game's end credits:

```json
[
  { "track": "Sneaky Snitch", "artist": "Kevin MacLeod (incompetech.com)", "license": "Licensed under Creative Commons: By Attribution 4.0 License, http://creativecommons.org/licenses/by/4.0/" }
]
```

Any other music works too, as long as its license allows commercial use (CC0, or CC BY with a credit).
Avoid CC BY-NC (no commercial use) and CC BY-ND.
