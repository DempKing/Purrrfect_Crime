// NightClaw's letters.
import { delivery, type Letter, LETTERS } from '../../meta/letters';
import type { Profile } from '../../meta/profile';
import { esc, on, show } from './common';

// --- NightClaw's letters -------------------------------------------------------------------------------

/** NightClaw's seal: a black wax disc with three claw marks. */
export const SEAL_SVG = `<svg viewBox="0 0 40 40" class="seal" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="#1b1b22" stroke="#4a3a52" stroke-width="2"/>
  <path d="M13 10 Q15 20 12 30 M20 9 Q22 20 19 31 M27 10 Q29 20 26 30" stroke="#b9a7d9" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`;
export function letter(l: Letter, p: Profile, done: () => void, button = 'Fold it away'): void {
  const L = LETTERS[l.id];
  const el = show(
    `<div class="letter-wrap">
      <p class="small letter-how">${l.id === 3 ? 'Folded small, inside the music box:' : esc(delivery(p))}</p>
      <div class="letter">
        <div class="kicker">Letter ${l.id} · ${esc(L.title)} · day ${l.day}</div>
        <div class="hand-written">${L.body.map((b) => `<p>${esc(b)}</p>`).join('')}</div>
        <p class="sign"><span class="hand-written">NC</span> ${SEAL_SVG}</p>
      </div>
      <div class="row-buttons"><button id="letter-ok" class="primary">${esc(button)}</button></div>
    </div>`,
    'overlay dark',
  );
  on(el, '#letter-ok', done);
}
