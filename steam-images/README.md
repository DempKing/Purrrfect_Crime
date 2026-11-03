# Steam images

Every picture the Steam page needs, at Steam's sizes, made from the game's painted key art (the crew on a
moonlit rooftop) with the logo set as on the title screen. The folders match the sections of the upload
pages in Steamworks (Store Presence > Graphical Assets, and the Library and Community pages).

| Folder         | File                               | Steamworks slot                 | Size      |
| -------------- | ---------------------------------- | ------------------------------- | --------- |
| `store/`       | `header_capsule.png`               | Header capsule                  | 920x430   |
|                | `small_capsule.png`                | Small capsule                   | 462x174   |
|                | `main_capsule.png`                 | Main capsule                    | 1232x706  |
|                | `vertical_capsule.png`             | Vertical capsule                | 748x896   |
|                | `page_background.png`              | Page background                 | 1438x810  |
| `screenshots/` | `01_intro.png` ... `12_letter.png` | Screenshots (at least 5)        | 1920x1080 |
| `library/`     | `library_capsule.png`              | Library capsule                 | 600x900   |
|                | `library_header.png`               | Library header                  | 920x430   |
|                | `library_hero.png`                 | Library hero (no text)          | 3840x1240 |
|                | `library_logo.png`                 | Library logo (transparent)      | 1280x720  |
| `community/`   | `community_icon.jpg`               | Community icon                  | 184x184   |
|                | `icons/client_icon.ico`            | Client icon (Windows)           | 16 to 256 |
|                | `icons/icon_<size>.png`            | Client icons (Linux), shortcuts | 16 to 256 |
| `events/`      | `event_cover.png`                  | Event / announcement cover      | 800x450   |
|                | `event_header.png`                 | Event / announcement header     | 1920x622  |

The screenshots, in order: the opening cinematic, a heist in each district (Old Town, Museum Mile, the
Harbor, Downtown and NightClaw's Midnight Museum), the lock picking minigame, Leo's lair, the black
market, Leo's skills, the planning board, and NightClaw's first letter.

The capsules show the logo large enough to read at their smallest size, and none of them carry taglines
or review quotes. The library hero has no text, because Steam lays the library logo over it. The icons
are Leo's red bow tie (the one on his calling card) in front of a full moon.

## Making them again

After changing the art, re-render them (both use Playwright's Chromium):

- `npm run steam:art` redraws everything except the screenshots (`scripts/steam-art.mjs`).
- `npm run steam:screenshots` builds the game and retakes the screenshots from it, through the browser
  test hook (`scripts/steam-screenshots.mjs`).
