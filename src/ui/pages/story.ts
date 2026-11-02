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
/** One credit: what (or who) on the left, who (or a quip) across from it, and an optional small note. */
type Credit = [left: string, right: string, note?: string];
/** The credits, in blocks with a heading. */
export const CREDITS: { heading: string; rows: Credit[] }[] = [
  {
    heading: 'Starring',
    rows: [
      ['Leo Tuxedo', 'As himself'],
      ['NightClaw', 'Retired'],
      ['The narrator', 'Bought the first pearl'],
    ],
  },
  {
    heading: 'The competition',
    rows: [
      ['Mischief Mittens', 'A sore loser'],
      ['Luna Luck', 'Felt lucky'],
      ['Sammy Swipes', 'Fastest paws in town'],
      ['Professor Paws', 'Overthought it'],
    ],
  },
  {
    heading: 'Also featuring',
    rows: [
      ['The night watch', 'Never saw a thing'],
      ['The sleepy guards', 'Saw even less'],
      ['The captains', 'Almost saw something'],
      ['The sniffer dogs', 'Smelled something'],
      ['The Robo-Guards', 'Beep'],
      ['The Whisker Times', 'Printed every word'],
    ],
  },
  {
    heading: 'Made by',
    rows: [
      ['Game', 'Demp'],
      ['Music', 'Demp', 'The title, intro, lair, heist, NightClaw and report themes'],
      ['Sound effects', 'Demp'],
    ],
  },
  {
    heading: 'Art and type',
    rows: [
      ['3D models', 'Poly Haven', 'polyhaven.com · CC0'],
      ['Luckiest Guy', 'Astigmatic', 'Font · Apache License 2.0'],
      ['Nunito', 'Vernon Adams', 'Font · SIL Open Font License'],
      ['Patrick Hand', 'Patrick Wagesreiter', 'Font · SIL Open Font License'],
      ['UnifrakturMaguntia', 'j. ‘mach’ wust', 'Font · SIL Open Font License'],
      ['Homemade Apple', 'Font Diner', 'Font · Apache License 2.0'],
      ['Game engine', 'PixiJS', 'MIT License'],
    ],
  },
  { heading: 'And', rows: [['You', 'For playing, flawlessly']] },
];
/** The credits (with a Back button when opened from the title menu). */
export function credits(done: () => void, fromMenu = false): void {
  const el = show(
    `<div class="credits${fromMenu ? ' rolling' : ''}"><div class="roll">
      <h1>Purrrfect Crime</h1>
      ${CREDITS.map(
        (b) =>
          `<section class="credit-block"><h2>${esc(b.heading)}</h2><dl>${b.rows
            .map(
              ([left, right, note]) =>
                `<dt>${esc(left)}</dt><dd><b>${esc(right)}</b>${note ? `<span class="credit-note">${esc(note)}</span>` : ''}</dd>`,
            )
            .join('')}</dl></section>`,
      ).join('')}
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
