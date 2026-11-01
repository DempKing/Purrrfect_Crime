// Achievement telegrams, the narrator's scenes, the ending and the credits.
import type { Achievement } from '../../meta/achievements';
import { LEGEND_PICTURE } from '../pictures';
import { esc, NARRATOR_SVG, on, show } from './common';
import { escToClose } from './title';

/** A little card in the corner: an achievement unlocked. */
export function toast(a: Achievement): void {
  const box = document.getElementById('toasts');
  if (!box) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.innerHTML = `<span class="tg-head">Telegram · achievement</span><b>${esc(a.name.toUpperCase())} STOP</b><span class="tg-body">${esc(a.text.replace(/\.$/, '').toUpperCase())} STOP</span>`;
  box.appendChild(t);
  setTimeout(() => t.classList.add('gone'), 4200);
  setTimeout(() => t.remove(), 5000);
}
// The narrator, between heists

/** A scene of dialogue lines with a Next button; the last button runs `done`. */
export function narratorScene(
  lines: string[],
  last: string,
  done: () => void,
  speaker = { name: 'The narrator', portrait: NARRATOR_SVG },
): void {
  let i = 0;
  const el = show(
    `<div class="scene caption-box"><div class="speaker"><div class="portrait-frame">${speaker.portrait}</div><div><span class="speaker-name">${esc(speaker.name)}</span><p id="line"></p></div></div><div class="row-buttons"><button id="next" class="primary"></button></div></div>`,
    'overlay',
  );
  const line = el.querySelector('#line')!;
  const next = el.querySelector<HTMLButtonElement>('#next')!;
  const render = () => {
    line.innerHTML = lines[i];
    next.textContent = i === lines.length - 1 ? last : 'Next';
  };
  next.addEventListener('click', () => {
    if (i < lines.length - 1) {
      i++;
      render();
    } else done();
  });
  render();
}
// The ending

export function legendaryCard(done: () => void): void {
  const el = show(
    `<div class="legendary certificate"><img class="cert-portrait" src="${LEGEND_PICTURE}" alt=""><p class="cert-small">Let it be known that NightClaw names his successor</p><h1>Leo Tuxedo</h1><p class="legend-title">Legendary</p>
      <p>The best thief this city has ever seen. Well, the best one still working.</p>
      <p class="cert-sign">NightClaw</p>
      <div class="row-buttons"><button id="legend-ok" class="primary">Roll the credits</button></div></div>`,
    'overlay dark',
  );
  on(el, '#legend-ok', done);
}
/** The credits. */
export const CREDITS: [string, string][] = [
  ['Leo Tuxedo', 'as himself'],
  ['NightClaw', 'retired'],
  ['Mischief Mittens · Luna Luck · Sammy Swipes · Professor Paws', 'the competition'],
  ['The Guards of the city', 'who never once saw a thing'],
  ['The narrator', 'who bought the first pearl'],
  ['The Whisker Times', 'for the front pages'],
  ['Made by', 'DempKing'],
  ['And you', 'for playing, flawlessly'],
];
/** The music's credits, from art/music/credits.json (the build puts them on the page). */
function musicCredits(): { track: string; artist: string; license: string }[] {
  return (
    (window as unknown as { MUSIC_CREDITS?: { track: string; artist: string; license: string }[] })
      .MUSIC_CREDITS ?? []
  );
}
/** The credits (with a Back button when opened from the title menu). */
export function credits(done: () => void, fromMenu = false): void {
  const el = show(
    `<div class="credits${fromMenu ? ' rolling' : ''}"><div class="roll">
      <h1>Purrrfect Crime</h1>
      ${[...new Set(musicCredits().map((m) => m.artist))]
        .map((artist) => {
          const mine = musicCredits().filter((m) => m.artist === artist);
          return `<p><span class="credit-what">Music</span><b>${esc(artist)}</b><span>${mine.map((m) => `“${esc(m.track)}”`).join(' · ')}</span><span class="small">${esc(mine[0].license)}</span></p>`;
        })
        .join('')}
      ${CREDITS.map(([who, what]) => `<p><span class="credit-what">${esc(what)}</span><b>${esc(who)}</b></p>`).join('')}
      ${fromMenu ? '' : '<p class="small">Free play continues: every heist is still there to replay, and the fences are still buying.</p>'}
      ${fromMenu ? '<p class="credit-end">Thanks for playing.</p>' : '<div class="row-buttons"><button id="credits-ok" class="primary">Read the morning paper</button></div>'}
    </div></div>${fromMenu ? '<button id="credits-ok" class="corner-btn right">Back (Esc)</button>' : ''}`,
    'overlay dark',
  );
  on(el, '#credits-ok', done);
  if (fromMenu) {
    escToClose(el, done);
    // Once the last line has rolled off the top, back to the title.
    el.querySelector('.roll')!.addEventListener('animationend', () => el.isConnected && done());
  }
}
