# Music

The game plays a different track on each screen. Put the files here, named after the screen, as `.mp3`
(about 128 kbps is plenty). The build copies them next to the game; a missing one falls back to the next
in line, and in a heist to the synthesised band.

| File | When it plays | Suggested track (Kevin MacLeod, incompetech.com) |
| --- | --- | --- |
| `title.mp3` | Title screen | "Hep Cats" |
| `lair.mp3` | The lair, the city map | "Local Forecast - Elevator" |
| `market.mp3` | The black market tab | "Bossa Antigua" |
| `planning.mp3` | The planning board before a heist | "Investigations" |
| `heist.mp3` | Sneaking about | "Sneaky Snitch" |
| `alert.mp3` | A guard is suspicious or searching | "Spy Glass" |
| `chase.mp3` | The alarm is ringing | "Run Amok" |
| `report.mp3` | The heist report | "Funkorama" |
| `finale.mp3` | NightClaw's museum and lair | "Mysterioso March" |

All of these are free for commercial games under **Creative Commons Attribution 4.0**: the only condition is
a credit. Download them from https://incompetech.com/music/royalty-free/music.html (search by title).

For every track you add, add its credit to `credits.json` here, and it shows in the game's end credits:

```json
[
  { "track": "Sneaky Snitch", "artist": "Kevin MacLeod (incompetech.com)", "license": "Licensed under Creative Commons: By Attribution 4.0 License, http://creativecommons.org/licenses/by/4.0/" }
]
```

Any other music works too, as long as its licence allows commercial use (CC0, or CC BY with a credit).
Avoid CC BY-NC (no commercial use) and CC BY-ND.
