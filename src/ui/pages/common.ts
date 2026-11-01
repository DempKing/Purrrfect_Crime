// Shared helpers for the screens: escaping, money formatting, the screen container, small pictures.
import type { LootCategory } from '../../core/level';
import { NIGHTCLAW_PICTURE } from '../pictures';

const root = () => document.getElementById('screens')!;
export const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export const money = (n: number) => `$${n.toLocaleString('en-US')}`;
export const catnip = (n: number) => `<span class="nip">${n.toLocaleString('en-US')}</span>`;
/** A small tilt for things laid on a desk or pinned to a board, the same for the same thing every time. */
export const tilt = (seed: string, max = 1.6) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return (((h >>> 0) % 1000) / 1000 - 0.5) * 2 * max;
};
export const CATEGORY_NAMES: Record<LootCategory, string> = {
  jewel: 'Jewels',
  painting: 'Paintings',
  artefact: 'Artefacts',
  curiosity: 'Curiosities',
};
/** The narrator: an old grey cat in a trilby, placeholder until the generated portrait arrives. */
export const NARRATOR_SVG = `<svg class="portrait" viewBox="0 0 64 64" aria-hidden="true">
  <circle cx="32" cy="34" r="22" fill="#8a8f9c"/><path d="M14 22 L18 4 L28 16Z M50 22 L46 4 L36 16Z" fill="#8a8f9c"/>
  <path d="M10 18 Q32 4 54 18 L50 22 Q32 14 14 22Z" fill="#2b2d35"/><rect x="18" y="8" width="28" height="10" rx="3" fill="#2b2d35"/>
  <rect x="18" y="15" width="28" height="3" fill="#a83232"/>
  <ellipse cx="24" cy="32" rx="3.5" ry="4" fill="#e9d36b"/><ellipse cx="40" cy="32" rx="3.5" ry="4" fill="#e9d36b"/>
  <circle cx="40" cy="32" r="6.5" fill="none" stroke="#d9b36c" stroke-width="1.5"/><path d="M46 33 Q50 40 48 46" stroke="#d9b36c" fill="none"/>
  <path d="M29 40 L35 40 L32 43Z" fill="#d98a9a"/><path d="M32 43 Q28 47 24 45 M32 43 Q36 47 40 45" stroke="#2b2d35" fill="none" stroke-width="1.5"/>
  <path d="M10 40 L22 41 M10 45 L22 43 M54 40 L42 41 M54 45 L42 43" stroke="#d8dbe2" stroke-width="1"/>
</svg>`;
/** Slick Whiskers, the fence: a raccoon in a trench coat and a fedora, his bandit mask doing the work of shades,
 * a gold tooth, a gold chain, and his ringed tail curled up behind the counter. */
export const FENCE_SVG = `<svg viewBox="0 0 220 230" aria-hidden="true">
  <g stroke="#1c1233" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M178 228 C214 196 214 132 186 104 C176 96 166 104 172 114 C190 140 186 186 160 212Z" fill="#8d8899"/>
    <path d="M196 118 L176 124 M204 146 L182 146 M200 176 L178 170" stroke="#3a3446" stroke-width="10"/>
    <path d="M30 230 C34 170 60 140 110 138 C160 140 186 170 190 230Z" fill="#c8a06a"/>
    <path d="M110 140 L82 230 M110 140 L138 230" fill="none"/>
    <path d="M70 150 L110 196 L150 150 L138 138 L110 170 L82 138Z" fill="#a8824a"/>
    <path d="M96 150 Q110 176 124 150" fill="none" stroke="#ffc93c" stroke-width="4"/>
    <circle cx="110" cy="172" r="6" fill="#ffc93c"/>
    <path d="M58 70 L64 34 L88 54Z" fill="#8d8899"/><path d="M64 60 L67 44 L78 54Z" fill="#2a2433" stroke-width="3"/>
    <path d="M162 70 L156 34 L132 54Z" fill="#8d8899"/><path d="M156 60 L153 44 L142 54Z" fill="#2a2433" stroke-width="3"/>
    <path d="M58 86 C58 58 162 58 162 86 C162 112 140 132 122 140 L110 146 L98 140 C80 132 58 112 58 86Z" fill="#a19cae"/>
    <path d="M70 108 Q110 128 150 108 Q140 136 110 142 Q80 136 70 108Z" fill="#f4f0e6" stroke-width="3"/>
    <path d="M60 84 C72 70 96 74 108 86 L112 86 C124 74 148 70 160 84 C158 102 140 106 126 100 L110 96 L94 100 C80 106 62 102 60 84Z" fill="#2a2433"/>
    <circle cx="88" cy="88" r="7" fill="#fff3b0" stroke-width="3"/><circle cx="132" cy="88" r="7" fill="#fff3b0" stroke-width="3"/>
    <circle cx="90" cy="89" r="3" fill="#1c1233" stroke="none"/><circle cx="134" cy="89" r="3" fill="#1c1233" stroke="none"/>
    <path d="M60 52 L160 52 L150 18 C140 6 80 6 70 18Z" fill="#5a3a22"/>
    <path d="M36 56 Q110 38 184 56 Q110 70 36 56Z" fill="#6b4628"/>
    <path d="M68 44 L152 44" stroke="#2a1a10" stroke-width="8"/>
    <ellipse cx="110" cy="116" rx="9" ry="6" fill="#1c1233"/>
    <path d="M98 128 Q110 136 124 126" fill="none"/>
    <rect x="113" y="128" width="7" height="7" fill="#ffc93c" stroke-width="2.5"/>
    <path d="M88 120 L52 114 M90 126 L54 130 M132 120 L168 114 M130 126 L166 130" stroke-width="2.5"/>
  </g>
</svg>`;
/** NightClaw's portrait, for when he speaks. */
export const NIGHTCLAW_SVG = `<img class="portrait" src="${NIGHTCLAW_PICTURE}" alt="">`;
/** Leo's calling card: white, with his red bow tie. */
export const CARD_SVG = `<svg viewBox="0 0 120 76" class="card-svg" aria-hidden="true">
  <rect x="2" y="2" width="116" height="72" rx="6" fill="#f7f4ec" stroke="#1b1b22" stroke-width="2"/>
  <path d="M40 30 L58 38 L40 46Z M80 30 L62 38 L80 46Z" fill="#d8262f"/><circle cx="60" cy="38" r="4" fill="#a81b22"/>
  <text x="60" y="64" text-anchor="middle" font-family="Georgia, serif" font-size="10" fill="#1b1b22">— L. T. —</text>
</svg>`;
export let sfx: (name: 'tick' | 'coin' | 'levelup' | 'click' | 'take' | 'sell') => void = () => {};
export function setScreenSound(fn: typeof sfx): void {
  sfx = fn;
}
export function show(html: string, cls = ''): HTMLElement {
  const r = root();
  r.innerHTML = `<div class="screen ${cls}">${html}</div>`;
  r.classList.remove('hidden');
  return r.firstElementChild as HTMLElement;
}
export function hideScreens(): void {
  const r = root();
  r.innerHTML = '';
  r.classList.add('hidden');
}
export function on(el: HTMLElement, sel: string, fn: (e: Event) => void): void {
  el.querySelectorAll<HTMLElement>(sel).forEach((b) => b.addEventListener('click', fn));
}
