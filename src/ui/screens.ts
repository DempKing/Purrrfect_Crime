// The screens between heists, built as plain DOM over the game canvas: the title and save slots,
// the narrator, the calling card, the morning paper, the heist report, the city map, the lair and
// the briefing before a heist. They're dressed as things from a 1960s caper (a film poster, luggage
// tags, index cards on cork, a ledger, blueprints, a manila case file); the look lives in styles.css.
import { parseLevel, the, type LevelDef, type LootCategory } from '../core/level';
import { RIVALS, type RivalPlan } from '../core/game';
import { allLoot } from '../core/exhibits';
import type { Paper } from '../meta/newspaper';
import { LETTERS, challengeProgress, delivery, hasLetter, type Letter } from '../meta/letters';
import { ACHIEVEMENTS, type Achievement } from '../meta/achievements';
import type { Settings } from '../settings';
import { MASTHEAD } from '../meta/newspaper';
import { charImageUrl, lootPictureUrl } from '../render/characters';
import { KEY_ART, LEGEND_PICTURE, NIGHTCLAW_PICTURE, portrait, rivalRooftop, rooftopPicture } from './pictures';
import {
  LAIR_PRICE,
  DEMAND_BONUS,
  collectorWants,
  demand,
  fenceRate,
  playerLevel,
  priceOf,
  xpForLevel,
  type HeistReport,
  type Profile,
} from '../meta/profile';
import {
  ATTRIBUTES,
  ROOMS,
  SKILLS,
  TREES,
  attributeCost,
  canLearn,
  canRaise,
  canUpgrade,
  lairCondition,
  upgradeCost,
  type Attribute,
  type Room,
  type SkillId,
} from '../meta/progression';

const root = () => document.getElementById('screens')!;
const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const money = (n: number) => `$${n.toLocaleString('en-US')}`;
const catnip = (n: number) => `<span class="nip">${n.toLocaleString('en-US')}</span>`;

/** A small tilt for things laid on a desk or pinned to a board, the same for the same thing every time. */
const tilt = (seed: string, max = 1.6) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return (((h >>> 0) % 1000) / 1000 - 0.5) * 2 * max;
};

const CATEGORY_NAMES: Record<LootCategory, string> = { jewel: 'Jewels', painting: 'Paintings', artefact: 'Artefacts', curiosity: 'Curiosities' };

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
const FENCE_SVG = `<svg viewBox="0 0 220 230" aria-hidden="true">
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
const CARD_SVG = `<svg viewBox="0 0 120 76" class="card-svg" aria-hidden="true">
  <rect x="2" y="2" width="116" height="72" rx="6" fill="#f7f4ec" stroke="#1b1b22" stroke-width="2"/>
  <path d="M40 30 L58 38 L40 46Z M80 30 L62 38 L80 46Z" fill="#d8262f"/><circle cx="60" cy="38" r="4" fill="#a81b22"/>
  <text x="60" y="64" text-anchor="middle" font-family="Georgia, serif" font-size="10" fill="#1b1b22">— L. T. —</text>
</svg>`;

function show(html: string, cls = ''): HTMLElement {
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

function on(el: HTMLElement, sel: string, fn: (e: Event) => void): void {
  el.querySelectorAll<HTMLElement>(sel).forEach((b) => b.addEventListener('click', fn));
}

// --- Title and save slots ---------------------------------------------------------------------

export interface TitleCallbacks {
  /** The game played last, if there is one. */
  lastSlot: number | null;
  onPlay: (slot: number) => void;
  onNew: (slot: number) => void;
  onDelete: (slot: number) => void;
  onSettings: () => void;
  onCredits: () => void;
}

function slotSummary(p: Profile): string {
  const where = !p.tutorialDone ? 'In the tutorial' : !p.lairOwned ? 'Looking for a lair' : `Day ${p.day} · ${p.heists} heist${p.heists === 1 ? '' : 's'}`;
  return `Level ${playerLevel(p.xp)} · ${where}<br>${p.catnip.toLocaleString('en-US')} Catnip${p.legendary ? ' · <b>Legendary</b>' : ''}`;
}

/**
 * The title: the logo over the key art, and a menu (Continue, New Game, Load), with Credits in the bottom left
 * and Settings in the bottom right. Load and "which game to replace" open as a panel over it; Esc closes it.
 */
export function titleScreen(slots: (Profile | null)[], cb: TitleCallbacks): void {
  const saved = slots.some(Boolean);
  const last = cb.lastSlot !== null && slots[cb.lastSlot] ? cb.lastSlot : slots.findIndex(Boolean);
  const free = slots.findIndex((p) => !p);
  const el = show(
    `<div class="title-art" style="background-image:url(${KEY_ART})"></div>
    <div class="poster">
      <h1 class="logo"><span>Purrrfect</span><span>Crime</span></h1>
      <p class="poster-tagline">Sneak in. Steal big. Leave nothing but a calling card.</p>
      <nav class="title-menu" aria-label="Main menu">
        ${saved ? `<button id="continue" class="primary"><b>Continue</b><small>${last >= 0 ? `Game ${last + 1} · ${slotSummary(slots[last]!).replace('<br>', ' · ')}` : ''}</small></button>` : ''}
        <button id="new-game" class="${saved ? '' : 'primary'}"><b>New game</b>${free < 0 ? '<small>All three games are in use: pick one to replace</small>' : ''}</button>
        <button id="load" ${saved ? '' : 'disabled'}><b>Load</b></button>
      </nav>
      <div id="slot-panel" class="slot-panel hidden" role="dialog"></div>
    </div>
    <button id="title-credits" class="corner-btn left">Credits</button>
    <button id="title-settings" class="corner-btn right">Settings</button>`,
    'title-screen',
  );
  const panel = el.querySelector<HTMLElement>('#slot-panel')!;
  /** The three games as tags, to load or (for a new game) replace. */
  const openPanel = (mode: 'load' | 'replace') => {
    panel.innerHTML = `<h2>${mode === 'load' ? 'Load a game' : 'Replace which game?'}</h2><div class="slots">${slots
      .map((p, i) => {
        const body = p
          ? `<div class="tag-body"><span class="tag-no">Game ${i + 1}</span><span class="tag-info">${slotSummary(p)}</span></div>
              <div class="row-buttons">${mode === 'load' ? `<button class="primary" data-play="${i}">Load</button><button class="quiet" data-delete="${i}">Delete</button>` : `<button class="primary" data-replace="${i}">Replace</button>`}</div>`
          : `<div class="tag-body"><span class="tag-no">Game ${i + 1}</span><span class="tag-info">Empty</span></div>
              <div class="row-buttons"><button class="primary" data-new="${i}">New game</button></div>`;
        return `<div class="slot ${p ? '' : 'empty'}">${body}</div>`;
      })
      .join('')}</div><button class="quiet" id="panel-close">Back (Esc)</button>`;
    panel.classList.remove('hidden');
    on(panel, '[data-play]', (e) => cb.onPlay(Number((e.currentTarget as HTMLElement).dataset.play)));
    on(panel, '[data-new]', (e) => cb.onNew(Number((e.currentTarget as HTMLElement).dataset.new)));
    on(panel, '[data-replace]', (e) => {
      const b = e.currentTarget as HTMLElement;
      if (b.dataset.armed) return cb.onNew(Number(b.dataset.replace));
      b.dataset.armed = '1';
      b.textContent = 'Really replace it?';
    });
    on(panel, '[data-delete]', (e) => {
      const b = e.currentTarget as HTMLElement;
      if (b.dataset.armed) return cb.onDelete(Number(b.dataset.delete));
      b.dataset.armed = '1';
      b.textContent = 'Really delete?';
    });
    on(panel, '#panel-close', closePanel);
  };
  const closePanel = () => panel.classList.add('hidden');
  on(el, '#continue', () => last >= 0 && cb.onPlay(last));
  on(el, '#new-game', () => (free >= 0 ? cb.onNew(free) : openPanel('replace')));
  on(el, '#load', () => openPanel('load'));
  on(el, '#title-settings', cb.onSettings);
  on(el, '#title-credits', cb.onCredits);
  escToClose(el, () => !panel.classList.contains('hidden') && (closePanel(), true));
}

/**
 * Esc for whatever is open on a screen: `close` returns true if it closed something. The listener goes away with
 * the screen.
 */
function escToClose(el: HTMLElement, close: () => boolean | void): void {
  const onKey = (e: KeyboardEvent) => {
    if (!el.isConnected) return window.removeEventListener('keydown', onKey);
    if (e.key === 'Escape' && close() !== false) e.preventDefault();
  };
  window.addEventListener('keydown', onKey);
}

// --- Settings ---------------------------------------------------------------------------------------------

/** The settings panel. Every change applies at once (`onChange`); `onClose` goes back to whatever was open. */
export function settingsScreen(st: Settings, onChange: (s: Settings) => void, onClose: () => void): void {
  const slider = (id: keyof Settings, label: string) =>
    `<label class="setting"><span>${label}</span><input type="range" min="0" max="100" step="5" data-range="${id}" value="${Math.round((st[id] as number) * 100)}" aria-label="${label}"><output>${Math.round((st[id] as number) * 100)}%</output></label>`;
  const choice = (id: keyof Settings, label: string, options: [string, string][]) =>
    `<div class="setting"><span id="lbl-${id}">${label}</span><div class="seg" role="radiogroup" aria-labelledby="lbl-${id}">${options
      .map(([v, l]) => `<button role="radio" aria-checked="${st[id] === v}" class="${st[id] === v ? 'on' : ''}" data-choice="${id}" data-value="${v}">${l}</button>`)
      .join('')}</div></div>`;
  const toggle = (id: keyof Settings, label: string, hint: string) =>
    `<label class="setting"><span>${label}<br><span class="small">${hint}</span></span><input type="checkbox" data-toggle="${id}" ${st[id] ? 'checked' : ''}></label>`;
  const el = show(
    `<div class="sheet settings" role="dialog" aria-label="Settings">
      <h1 class="sheet-title">Settings</h1>
      <h2 class="section">Sound</h2>
      ${slider('master', 'Volume')}${slider('music', 'Music')}${slider('sfx', 'Sound effects')}
      <h2 class="section">Play</h2>
      ${choice('speed', 'Animation speed', [['normal', 'Normal'], ['fast', 'Fast'], ['instant', 'Instant']])}
      ${toggle('hints', 'Tutorial tips', 'The narrator’s tips during the first heist.')}
      <h2 class="section">Accessibility</h2>
      ${toggle('largeText', 'Larger text', 'Bigger text in the HUD and on every screen.')}
      ${toggle('reduceMotion', 'Reduce motion', 'No spinning newspapers or rolling credits; quicker animations.')}
      ${choice('palette', 'Colours', [['standard', 'Standard'], ['colourblind', 'Colour-blind friendly']])}
      <p class="small note">Keyboard: arrow keys move the cursor, Enter moves Leo there (or does what's there), Space ends the turn, 1–9 pick an action, Q and E turn the camera, WASD pans it (C recentres on Leo), + and − (or the mouse wheel) zoom, Esc cancels.</p>
      <div class="row-buttons"><button id="settings-ok" class="primary">Done</button></div>
    </div>`,
    'overlay',
  );
  const change = (patch: Partial<Settings>) => {
    Object.assign(st, patch);
    onChange(st);
  };
  el.querySelectorAll<HTMLInputElement>('[data-range]').forEach((i) =>
    i.addEventListener('input', () => {
      i.nextElementSibling!.textContent = `${i.value}%`;
      change({ [i.dataset.range!]: Number(i.value) / 100 } as Partial<Settings>);
    }),
  );
  el.querySelectorAll<HTMLInputElement>('[data-toggle]').forEach((i) => i.addEventListener('change', () => change({ [i.dataset.toggle!]: i.checked } as Partial<Settings>)));
  on(el, '[data-choice]', (e) => {
    const b = e.currentTarget as HTMLElement;
    change({ [b.dataset.choice!]: b.dataset.value } as Partial<Settings>);
    b.parentElement!.querySelectorAll('button').forEach((x) => {
      x.classList.toggle('on', x === b);
      x.setAttribute('aria-checked', String(x === b));
    });
  });
  on(el, '#settings-ok', onClose);
  escToClose(el, onClose);
  el.querySelector<HTMLElement>('#settings-ok')?.focus();
}

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

// --- The narrator, between heists --------------------------------------------------------------

/** A sequence of lines (the narrator's, unless someone else is speaking) with a Next button; the last button runs `done`. */
export function narratorScene(lines: string[], last: string, done: () => void, speaker = { name: 'The narrator', portrait: NARRATOR_SVG }): void {
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

// --- The ending -------------------------------------------------------------------------------------------

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

export const CREDITS: [string, string][] = [
  ['Leo Tuxedo', 'as himself'],
  ['NightClaw', 'retired'],
  ['Mischief Mittens · Luna Luck · Sammy Swipes · Professor Paws', 'the competition'],
  ['The Guards of the city', 'who never once saw a thing'],
  ['The narrator', 'who bought the first pearl'],
  ['The Whisker Times', 'for the front pages'],
  ['Made by', 'DempKing, with Claude'],
  ['And you', 'for playing, flawlessly'],
];

/** The music's credits, from art/music/credits.json (the build puts them on the page). */
function musicCredits(): { track: string; artist: string; license: string }[] {
  return (window as unknown as { MUSIC_CREDITS?: { track: string; artist: string; license: string }[] }).MUSIC_CREDITS ?? [];
}

/** The end titles. From the title menu (`fromMenu`), with a Back button and Esc; at the end of the story, on to the paper. */
export function credits(done: () => void, fromMenu = false): void {
  const el = show(
    `<div class="credits${fromMenu ? ' rolling' : ''}"><div class="roll">
      <h1>Purrrfect Crime</h1>
      ${CREDITS.map(([who, what]) => `<p><span class="credit-what">${esc(what)}</span><b>${esc(who)}</b></p>`).join('')}
      ${[...new Set(musicCredits().map((m) => m.artist))].map((artist) => {
        const mine = musicCredits().filter((m) => m.artist === artist);
        return `<p><span class="credit-what">Music</span><b>${esc(artist)}</b><span>${mine.map((m) => `“${esc(m.track)}”`).join(' · ')}</span><span class="small">${esc(mine[0].license)}</span></p>`;
      }).join('')}
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

// --- The calling card and the paper ------------------------------------------------------------------

export function callingCard(done: () => void): void {
  show(`<div class="card-beat"><div class="calling-card">${CARD_SVG}</div><p>Leo leaves his calling card</p></div>`, 'overlay dark');
  setTimeout(done, 1900);
}

function photoSvg(centrepiece: boolean): string {
  return centrepiece
    ? `<svg viewBox="0 0 80 56"><rect width="80" height="56" fill="#cfc8b8"/><rect x="28" y="22" width="24" height="30" fill="#efe9da" stroke="#555"/><rect x="24" y="18" width="32" height="6" fill="#e2dccb" stroke="#555"/><rect x="33" y="11" width="14" height="8" fill="#fff" stroke="#222"/><circle cx="40" cy="15" r="2" fill="#a81b22"/></svg>`
    : `<svg viewBox="0 0 80 56"><rect width="80" height="56" fill="#cfc8b8"/><rect x="20" y="30" width="40" height="22" fill="#8a7a66" stroke="#444"/><path d="M22 30 L22 12 L58 12 L58 30" fill="none" stroke="#666" stroke-dasharray="3 2"/><path d="M30 46 l4 -3 l2 4 M48 48 l3 -4 l3 3" stroke="#bcd" fill="none"/></svg>`;
}

export function newspaper(paper: Paper, spin: boolean, done: () => void, button = 'Continue'): void {
  const photos = paper.photos
    .map((p) => `<figure>${photoSvg(p.centrepiece)}<figcaption><b>${esc(p.name)}</b> · est. ${money(p.value)}<br>${esc(p.caption)}</figcaption></figure>`)
    .join('');
  const el = show(
    `<div class="paper ${spin ? 'spin' : ''}">
      <div class="masthead">${MASTHEAD}</div>
      <div class="dateline"><span>Morning edition</span><span>Day ${paper.day}</span><span>One Catnip</span></div>
      <h2>${esc(paper.headline)}</h2>
      <p class="sub">${esc(paper.subhead)}</p>
      <div class="photos">${photos || '<p class="small">No photos: nothing was taken.</p>'}</div>
      <p class="total">Estimated haul: <b>${money(paper.total)}</b></p>
      <div class="stories">${paper.stories.map((s) => `<div><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></div>`).join('')}</div>
      <div class="row-buttons"><button id="paper-ok" class="primary">${esc(button)}</button></div>
    </div>`,
    'overlay',
  );
  on(el, '#paper-ok', done);
}

/** A small picture of a piece of loot: its painting, or a drawing of it. */
function lootPic(name: string, category?: LootCategory): string {
  return `<img class="loot-pic" src="${lootPictureUrl(name, category)}" alt="">`;
}

/** The night's snapshot: Leo on the rooftop with the prize, or the rival who beat him to it. */
function reportPhoto(r: HeistReport): string {
  const prize = r.items.find((i) => i.centrepiece);
  if (r.rival && !r.rival.won) return `<figure class="report-photo"><img src="${rivalRooftop(r.rival.id)}" alt=""><figcaption>${esc(RIVALS[r.rival.id].name)}, with the prize. Next time.</figcaption></figure>`;
  if (!prize) return '';
  return `<figure class="report-photo"><img src="${rooftopPicture(prize.name)}" alt=""><figcaption>Leo and ${the(esc(prize.name))}, on the rooftop</figcaption></figure>`;
}

/** Sounds for the screens; main.ts plugs the game's sound in. */
let sfx: (name: 'tick' | 'coin' | 'levelup' | 'click' | 'take' | 'sell') => void = () => {};
export function setScreenSound(fn: typeof sfx): void {
  sfx = fn;
}

/**
 * The heist report, as a score screen that plays out: the result pops up, each XP line slides in and counts up
 * into the total, the level bar fills from where Leo was (a burst and a fanfare for every level he crosses),
 * then the haul drops in piece by piece with its value rolling up. A click or a key skips to the end.
 */
export function heistReport(r: HeistReport, p: Profile, done: () => void): void {
  const xpAfter = p.xp;
  const xpBefore = Math.max(0, xpAfter - r.xpTotal);
  const haul = r.items.reduce((n, i) => n + i.value, 0);
  const el = show(
    `<div class="sheet report score">
      <div class="score-top">
        <div><p class="score-kicker">Heist report · day ${r.paper.day}</p><h1>${esc(r.levelName)}</h1>
        <p class="report-result"><span class="stamp ${r.flawless ? 'blue' : ''} pop-in">${r.flawless ? 'Flawless!' : 'Got away!'}</span><span class="turns">${r.turns} turns</span></p></div>
        ${reportPhoto(r)}
      </div>
      <ol class="xp-lines">${r.xp.map((l, i) => `<li class="xp-line" data-i="${i}"><span>${esc(l.label)}</span><b>+<span class="n">0</span> XP</b></li>`).join('')}</ol>
      <div class="xp-total">Total <b>+<span id="xp-total">0</span> XP</b></div>
      <div class="level-meter">
        <div class="lvl-badge"><small>Level</small><b id="lvl-num">${playerLevel(xpBefore)}</b></div>
        <div class="meter"><div class="xpbar big"><span id="xp-fill"></span></div><p class="small" id="xp-into"></p></div>
      </div>
      <div class="levelups" id="levelups"></div>
      ${r.rival ? `<p class="rival-line">${r.rival.won ? `You beat ${esc(RIVALS[r.rival.id].name)} to the prize.` : `${esc(RIVALS[r.rival.id].name)} got the centrepiece this time. Replay to take it yourself.`}</p>` : ''}
      ${r.ncWaiting ? '<p class="rival-line">You got out, but NightClaw is still waiting for you to find him. Creep up and tap him on the shoulder to finish it.</p>' : ''}
      ${r.finale ? '<p class="levelup-note">NightClaw’s collar has the top shelf of the Trophy Room to itself. It is not for sale.</p>' : ''}
      ${r.items.length ? `<div class="haul"><div class="haul-head">The haul <b>$<span id="haul">0</span></b></div><div class="evidence">${r.items.map((i) => `<figure class="loot-drop">${lootPic(i.name, i.category)}<figcaption>${esc(i.name)}<br><b>$${i.value.toLocaleString('en-US')}</b></figcaption></figure>`).join('')}</div>
        <p class="small">${r.items.length} piece${r.items.length === 1 ? '' : 's'} went to the stash${r.replay ? ', but this is a replay, so the fences call it hot and pay half' : ''}.</p></div>` : '<p>Nothing to sell this time.</p>'}
      <div class="row-buttons"><button id="report-ok" class="primary">Skip</button></div>
    </div>`,
    'overlay',
  );
  const q = <T extends HTMLElement>(sel: string) => el.querySelector(sel) as T;
  const fill = q<HTMLElement>('#xp-fill');
  const into = q<HTMLElement>('#xp-into');
  const lvlNum = q<HTMLElement>('#lvl-num');
  const totalEl = q<HTMLElement>('#xp-total');
  const haulEl = el.querySelector<HTMLElement>('#haul');
  const ok = q<HTMLButtonElement>('#report-ok');
  const lines = [...el.querySelectorAll<HTMLElement>('.xp-line')];
  const drops = [...el.querySelectorAll<HTMLElement>('.loot-drop')];
  const shownLevel = { n: playerLevel(xpBefore) };

  /** Shows the bar for an XP total: its level, how full, and how far to the next. */
  const meter = (xp: number) => {
    const lvl = playerLevel(xp);
    const from = xpForLevel(lvl);
    const to = xpForLevel(lvl + 1);
    fill.style.width = `${Math.min(100, ((xp - from) / (to - from)) * 100)}%`;
    into.textContent = `${Math.round(xp - from)} / ${to - from} XP to level ${lvl + 1}`;
    if (lvl > shownLevel.n) {
      for (let l = shownLevel.n + 1; l <= lvl; l++) levelUp(l);
      shownLevel.n = lvl;
    }
    lvlNum.textContent = String(lvl);
  };
  const levelUp = (l: number) => {
    sfx('levelup');
    lvlNum.parentElement!.classList.remove('bump');
    void lvlNum.offsetWidth;
    lvlNum.parentElement!.classList.add('bump');
    const burst = document.createElement('div');
    burst.className = 'levelup-burst';
    const confetti = Array.from({ length: 28 }, (_, i) => `<i style="--a:${(i / 28) * 360}deg;--d:${60 + (i % 5) * 18}px;--c:${['#ffd23f', '#ff4d5e', '#1fc8b4', '#7b3fe4', '#3a6ff0'][i % 5]}"></i>`).join('');
    burst.innerHTML = `<div class="confetti">${confetti}</div><b>Level up!</b><span>Level ${l} · the fences pay ${Math.round(fenceRate(l) * 100)}% now</span>`;
    q<HTMLElement>('#levelups').appendChild(burst);
  };

  // The show, as a list of steps on a clock; Skip runs straight to the end.
  const timers: number[] = [];
  let finished = false;
  const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  const tween = (ms: number, step: (k: number) => void, then?: () => void) => {
    const t0 = performance.now();
    const frame = (now: number) => {
      if (finished) return;
      const k = Math.min(1, (now - t0) / ms);
      step(1 - Math.pow(1 - k, 3));
      if (k < 1) requestAnimationFrame(frame);
      else then?.();
    };
    requestAnimationFrame(frame);
  };
  meter(xpBefore);
  let total = 0;
  let t = 500;
  lines.forEach((li, i) => {
    const amount = r.xp[i].amount;
    at(t, () => {
      li.classList.add('in');
      sfx('tick');
      const start = total;
      total += amount;
      tween(350, (k) => {
        li.querySelector('.n')!.textContent = String(Math.round(amount * k));
        totalEl.textContent = String(Math.round(start + amount * k));
      });
    });
    t += 420;
  });
  at(t + 150, () => {
    totalEl.parentElement!.classList.add('done');
    sfx('coin');
  });
  t += 500;
  const fillMs = Math.min(3200, 900 + (playerLevel(xpAfter) - playerLevel(xpBefore)) * 900);
  at(t, () => tween(fillMs, (k) => meter(xpBefore + (xpAfter - xpBefore) * k)));
  t += fillMs + 300;
  drops.forEach((d, i) => {
    at(t + i * 280, () => {
      d.classList.add('in');
      sfx('coin');
      const upTo = r.items.slice(0, i + 1).reduce((n, it) => n + it.value, 0);
      const from = r.items.slice(0, i).reduce((n, it) => n + it.value, 0);
      if (haulEl) tween(260, (k) => (haulEl.textContent = Math.round(from + (upTo - from) * k).toLocaleString('en-US')));
    });
  });
  t += drops.length * 280 + 200;
  const finish = () => {
    if (finished) return;
    finished = true;
    timers.forEach((id) => window.clearTimeout(id));
    lines.forEach((li, i) => {
      li.classList.add('in');
      li.querySelector('.n')!.textContent = String(r.xp[i].amount);
    });
    totalEl.textContent = String(r.xpTotal);
    totalEl.parentElement!.classList.add('done');
    meter(xpAfter);
    drops.forEach((d) => d.classList.add('in'));
    if (haulEl) haulEl.textContent = haul.toLocaleString('en-US');
    ok.textContent = 'Continue';
  };
  at(t, finish);
  ok.addEventListener('click', () => (finished ? done() : finish()));
  el.addEventListener('pointerdown', (e) => {
    if (!finished && e.target !== ok) finish();
  });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('reduce-motion')) finish();
}

// --- NightClaw's letters -------------------------------------------------------------------------------

/** NightClaw's seal: a black wax disc with three claw marks. */
const SEAL_SVG = `<svg viewBox="0 0 40 40" class="seal" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="#1b1b22" stroke="#4a3a52" stroke-width="2"/>
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

// --- The city map: buying the lair ---------------------------------------------------------------------

export function cityMap(p: Profile, onBuy: () => void): void {
  // A printed street map: blocks between the streets, the river along the bottom, district names.
  const blocks: string[] = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 6; c++) {
      const x = 24 + c * 94;
      const y = 30 + r * 92;
      // The landmarks, the park and the lair are drawn on their own.
      if ((c === 1 && r === 0) || (c === 2 && r === 1) || (c === 4 && r === 1) || (c === 0 && r === 2)) continue;
      blocks.push(`<rect x="${x}" y="${y}" width="78" height="74" class="block"/>`);
    }
  const el = show(
    `<div class="citymap">
      <div class="caption-box map-head"><div class="speaker"><div class="portrait-frame">${NARRATOR_SVG}</div><div><span class="speaker-name">The narrator</span><p>Every thief needs a headquarters, kid. There's an abandoned building on the edge of Old Town. It's a wreck, but it's cheap. Find it on the map.</p></div></div></div>
      <svg viewBox="0 0 600 380" class="map-svg">
        <rect width="600" height="380" class="map-paper"/>
        <path d="M0 330 C120 310 200 352 320 336 C430 322 520 348 600 330 L600 380 L0 380Z" class="river"/>
        ${blocks.join('')}
        <g class="park"><rect x="400" y="122" width="78" height="74"/><circle cx="425" cy="148" r="9"/><circle cx="452" cy="170" r="11"/><circle cx="440" cy="140" r="7"/></g>
        <text x="80" y="20" class="district">OLD TOWN</text><text x="300" y="20" class="district">MUSEUM MILE</text><text x="510" y="20" class="district">THE HEIGHTS</text>
        <text x="110" y="364" class="district">HARBOUR</text><text x="470" y="364" class="district">DOWNTOWN</text>
        <text x="300" y="318" class="street">RIVER STREET</text>
        <g class="landmark"><rect x="118" y="30" width="78" height="74"/><text x="157" y="70">Corner Gallery</text></g>
        <g class="landmark"><rect x="212" y="122" width="78" height="74"/><text x="251" y="162">City Museum</text></g>
        <g id="lair-building" class="for-sale" role="button" tabindex="0" aria-label="The abandoned building, for sale"><rect x="24" y="214" width="78" height="74"/>
          <text x="63" y="246">Abandoned</text><text x="63" y="260">building</text></g>
        <g class="marked" aria-hidden="true">
          <path d="M14 250 C10 214 40 202 66 205 C100 208 116 230 110 258 C104 290 64 300 36 292 C18 286 12 268 16 248" class="marker"/>
          <text x="140" y="300" class="scribble">for sale! ${LAIR_PRICE} Catnip</text><path d="M136 292 C122 286 112 280 106 272" class="marker thin"/></g>
        <path d="M560 40 L560 70 M552 48 L560 36 L568 48" class="compass"/><text x="560" y="84" class="street">N</text>
      </svg>
      <div id="buy-box" class="note-card buy-box hidden"><p>Buy the abandoned building for ${catnip(LAIR_PRICE)} Catnip? It will be your lair.</p>
        <div class="row-buttons"><button id="buy" class="primary">Buy it</button><button id="not-yet" class="quiet">Not yet</button></div></div>
      <p class="small">You have ${catnip(p.catnip)} Catnip.</p>
    </div>`,
    'overlay desk-bg',
  );
  const b = el.querySelector('#lair-building')!;
  const box = el.querySelector('#buy-box')!;
  const ask = () => box.classList.remove('hidden');
  b.addEventListener('click', ask);
  b.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && ask());
  on(el, '#buy', onBuy);
  on(el, '#not-yet', () => box.classList.add('hidden'));
}

// --- The lair -------------------------------------------------------------------------------------------

export interface LairCallbacks {
  jobs: LevelDef[];
  districts: { id: string; name: string; levels: LevelDef[] }[];
  onHeist: (def: LevelDef) => void;
  onSell: (id: number) => void;
  onSellAll: () => void;
  onPaper: (index: number) => void;
  onRaise: (id: Attribute) => void;
  onLearn: (id: SkillId) => void;
  onUpgrade: (id: Room) => void;
  onLetter: (index: number) => void;
  onSettings: () => void;
  onQuit: () => void;
}

export type LairTab = 'heists' | 'leo' | 'market' | 'lair' | 'papers';

const pips = (n: number, of: number) => `<span class="pips">${Array.from({ length: of }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;

export function lair(p: Profile, cb: LairCallbacks, tab: LairTab = 'heists'): void {
  const lvl = playerLevel(p.xp);
  const into = p.xp - xpForLevel(lvl);
  const need = xpForLevel(lvl + 1) - xpForLevel(lvl);
  const wanted = demand(p.day);

  // A heist opens once the one before it is cleared; anything already cleared stays open. NightClaw's
  // challenge opens with his second letter.
  const unlocked = (i: number) =>
    cb.jobs[i].finale ? hasLetter(p, 4) : cb.jobs[i].challenge ? hasLetter(p, 2) : i === 0 || !!p.records[cb.jobs[i].id] || !!p.records[cb.jobs[i - 1].id];
  const job = (def: LevelDef) => {
    const i = cb.jobs.indexOf(def);
    const rec = p.records[def.id];
    const centre = def.loot.find((l) => def.map[l.at.y][l.at.x] === 'G');
    const t = tilt(def.id);
    if (!unlocked(i))
      return `<article class="job locked" style="--tilt:${t}deg"><span class="pin"></span><h3>${esc(def.name)}</h3><p class="typed">${def.finale ? 'NightClaw will write when his challenge is done.' : `Clear ${esc(cb.jobs[i - 1].name)} first.`}</p></article>`;
    const rumour = p.rivals[def.id] && p.rooms.planning >= 1 ? p.rivals[def.id]! : null;
    return `<article class="job" style="--tilt:${t}deg">
        <span class="pin"></span>
        ${rec ? `<span class="stamp ${rec.flawless ? 'blue' : ''}">${rec.flawless ? 'Flawless' : 'Cleared'}</span>` : '<span class="stamp new">New</span>'}
        <h3>${esc(def.name)}</h3>
        <p class="objective">${esc(def.objective)}</p>
        <ul class="facts">
          <li>${allLoot(def).length} piece${allLoot(def).length === 1 ? '' : 's'} of loot</li>
          ${centre ? `<li>Prize: ${esc(centre.name)}${rec?.centrepiece ? ' <span class="tick">✓</span>' : ''}</li>` : ''}
          ${rec ? `<li>Best: ${rec.bestTurns} turns</li>` : ''}
        </ul>
        ${rec?.lostTo ? `<p class="scrawl rival-line">${esc(RIVALS[rec.lostTo].name)} got away with ${the(esc(centre?.name ?? 'centrepiece'))}. Replay to steal it yourself.</p>` : ''}
        ${rumour ? `<p class="scrawl rival-line">Rumour: ${esc(RIVALS[rumour.id].name)} is after ${the(esc(centre?.name ?? 'centrepiece'))}.</p>` : ''}
        ${rec ? '<p class="small warn">Replay: the loot is back, but the fences will call it hot and pay half.</p>' : ''}
        <button class="primary" data-job="${i}">${rec ? 'Replay' : 'Plan the heist'}</button>
      </article>`;
  };
  const progress = challengeProgress(p);
  const challenge = p.legendary
    ? '<div class="challenge note-card"><b>Leo Tuxedo, Legendary.</b><p>NightClaw has retired. The city is yours: every heist can be replayed, and the fences are still buying.</p></div>'
    : hasLetter(p, 4)
      ? '<div class="challenge note-card"><b>The NightClaw Challenge: done.</b><p>Every centrepiece, every one flawless. NightClaw is waiting in his lair.</p></div>'
      : hasLetter(p, 3)
        ? `<div class="challenge note-card"><b>The NightClaw Challenge</b> ${pips(progress.done, progress.of)}<p>${progress.done} of ${progress.of} centrepieces taken in a flawless heist (never seen, no alarms). NightClaw wants every one.</p></div>`
        : '';
  const heists =
    challenge +
    cb.districts
      .filter((d) => d.levels.some((l) => unlocked(cb.jobs.indexOf(l))))
      .map((d) => `<section class="district-board"><h2 class="section district" style="--tilt:${tilt(d.id, 2)}deg">${esc(d.name)}</h2><div class="cards">${d.levels.map(job).join('')}</div></section>`)
      .join('');

  const attributes = ATTRIBUTES.map((a) => {
    const rank = p.attributes[a.id];
    const why = canRaise(p, a.id);
    const next = a.ranks[rank];
    return `<div class="up"><div><b>${a.name}</b> ${pips(rank, a.ranks.length)}<br><span class="small">${esc(a.blurb)}</span>
        ${next ? `<br><span class="small next">Next: ${esc(next)}</span>` : ''}</div>
      ${next ? `<button data-raise="${a.id}" ${why ? 'disabled' : ''} title="${esc(why ?? '')}">${catnip(attributeCost(p, a.id))}</button>` : '<span class="stamp small-stamp">Max</span>'}</div>`;
  }).join('');
  const trees = TREES.map(
    (t) => `<div class="tree"><h3>${t.name} <span class="small">${t.blurb}</span></h3>
      ${SKILLS.filter((s) => s.tree === t.id)
        .map((s) => {
          const owned = p.skills.includes(s.id);
          const why = canLearn(p, s.id);
          return `<div class="skill ${owned ? 'owned' : ''} ${s.later ? 'later' : ''}"><div><b>${s.name}</b> <span class="small">level ${s.level}</span><br><span class="small">${esc(s.text)}</span>
            ${!owned && why && why !== 'Not enough Catnip.' ? `<br><span class="small warn">${esc(why)}</span>` : ''}</div>
            ${owned ? '<span class="stamp small-stamp blue">Learned</span>' : `<button data-learn="${s.id}" ${why ? 'disabled' : ''} title="${esc(why ?? '')}">${catnip(s.cost)}</button>`}</div>`;
        })
        .join('')}</div>`,
  ).join('');
  const rivalry = (Object.entries(p.rivalRecord) as [keyof typeof RIVALS, { won: number; lost: number }][])
    .map(([id, r]) => `<li>${esc(RIVALS[id].name)}: beaten ${r.won} time${r.won === 1 ? '' : 's'}, lost ${r.lost}</li>`)
    .join('');
  const leo = `
    <div class="dossier-head">
      <div class="mugshot"><img src="${portrait('leo')}" alt="Leo Tuxedo's mugshot"><span class="mug-board">L. TUXEDO · ${String(lvl).padStart(2, '0')}</span></div>
      <dl class="typed facts-sheet">
        <dt>Subject</dt><dd>Leo Tuxedo</dd>
        <dt>Known as</dt><dd>${p.legendary ? 'Legendary' : 'The tuxedo cat'}</dd>
        <dt>Level</dt><dd>${lvl}</dd>
      </dl>
    </div>
    <h2 class="section">Attributes</h2>
    <div class="ups">${attributes}</div>
    <h2 class="section">Skills</h2>
    <div class="trees">${trees}</div>
    ${rivalry ? `<h2 class="section">Rivals</h2><ul class="trophies">${rivalry}</ul>` : ''}
    <h2 class="section">Achievements <span class="small">${p.achievements.length} of ${ACHIEVEMENTS.length}</span></h2>
    <div class="achievements">${ACHIEVEMENTS.map((a) => {
      const got = p.achievements.includes(a.id);
      const shown = got || !a.secret;
      return `<div class="achievement ${got ? 'got' : ''}"><span class="medal" aria-hidden="true">${shown ? esc(a.name.replace(/^(The|A|An) /, '').slice(0, 1)) : '?'}</span><div><b>${shown ? esc(a.name) : 'A secret'}</b><br><span class="small">${shown ? esc(a.text) : 'Keep going.'}</span></div></div>`;
    }).join('')}</div>`;

  const collector = collectorWants(p);
  const office = p.rooms.fence ? ` My office takes ${p.rooms.fence * 5}% less off you.` : '';
  const total = p.stash.reduce((n, s) => n + priceOf(p, s), 0);
  const goods = p.stash
    .map((s, i) => {
      const deal = s.category === wanted ? `+${Math.round(DEMAND_BONUS * 100)}% this week` : s.id === collector ? 'collector ×1.5' : s.hot ? 'hot: half price' : '';
      return `<div class="ware${s.centrepiece ? ' prize-ware' : ''}" style="--tilt:${tilt(`ware${s.id}`, 4)}deg;--i:${i}" data-ware="${s.id}">
        <img src="${lootPictureUrl(s.name, s.category)}" alt="">
        <div class="price-tag"><b>${priceOf(p, s).toLocaleString('en-US')}</b><span class="nip"></span>${deal ? `<small>${deal}</small>` : ''}</div>
        <p class="ware-name">${esc(s.name)}<span>${CATEGORY_NAMES[s.category]} · est. ${money(s.value)}</span></p>
        <button data-sell="${s.id}">Sell</button>
      </div>`;
    })
    .join('');
  const line = !p.stash.length
    ? 'Empty-pawed again? Come back when you’ve got something shiny.'
    : `Psst. ${CATEGORY_NAMES[wanted]} are moving this week: I’ll go ${Math.round(DEMAND_BONUS * 100)}% over.${office} Everything else, one Catnip per ten bucks, less my ${100 - Math.round(fenceRate(lvl) * 100)}%.`;
  const market = `
    <div class="booth">
      <div class="alley" aria-hidden="true"><div class="bulb"><i></i></div><div class="sign">PAWN<span>·</span>NO QUESTIONS</div></div>
      <div class="stall">
        <div class="awning" aria-hidden="true"></div>
        <div class="fence-row">
          <div class="fence-guy">${FENCE_SVG}</div>
          <div class="speech"><b>Slick Whiskers, the fence</b>${line}</div>
        </div>
        <div class="counter">
          ${p.stash.length ? `<div class="wares">${goods}</div>` : '<p class="empty-counter">The counter’s bare.</p>'}
        </div>
        <div class="till">
          <div><small>Lifetime sales</small><b>${catnip(p.soldTotal)}</b></div>
          ${p.stash.length ? `<button id="sell-all" class="primary">Sell the lot · ${catnip(total)}</button>` : ''}
        </div>
      </div>
    </div>`;

  const rooms = ROOMS.map((r) => {
    const tier = p.rooms[r.id];
    const cost = upgradeCost(p, r.id);
    const why = canUpgrade(p, r.id);
    const now = tier ? r.tiers[tier - 1].text : 'Not built yet.';
    const next = r.tiers[tier];
    return `<div class="up room ${tier ? 'built' : ''}"><div><b>${r.name}</b> ${pips(tier, r.tiers.length)}<br><span class="small">${esc(now)}</span>
        ${next ? `<br><span class="small next">${tier ? 'Next' : 'Build'}: ${esc(next.text)}</span>` : ''}</div>
      ${cost !== null ? `<button data-upgrade="${r.id}" ${why ? 'disabled' : ''} title="${esc(why ?? '')}">${catnip(cost)}</button>` : '<span class="stamp small-stamp">Done</span>'}</div>`;
  }).join('');
  const trophies = Object.entries(p.records)
    .filter(([, r]) => r.centrepiece)
    .map(([id]) => {
      const def = cb.jobs.find((j) => j.id === id);
      const c = def?.loot.find((l) => def.map[l.at.y][l.at.x] === 'G');
      return c ? `<li>${esc(c.revealed ? 'NightClaw’s old collar' : c.name)} <span class="small">· ${esc(def!.name)}${p.records[id].flawless ? ' · flawless' : ''}</span></li>` : '';
    })
    .join('');
  const letters = p.letters.length
    ? `<h2 class="section">Letters</h2><div class="envelopes">${p.letters.map((l, i) => `<button class="paper-link envelope" data-letter="${i}" style="--tilt:${tilt(`letter${i}`, 2)}deg"><span class="small">Day ${l.day}</span><b>Letter ${l.id}: ${esc(LETTERS[l.id].title)}</b>${SEAL_SVG}</button>`).join('')}</div>`
    : '';
  const lairTab = `
    <p class="blueprint-title">Plans for the lair <span>every upgrade fixes the building up a little more</span></p>
    <div class="ups">${rooms}</div>
    ${letters}
    ${p.rooms.trophy ? `<h2 class="section">Trophy Room</h2>${trophies ? `<ul class="trophies">${trophies}</ul>` : '<p class="small">Empty shelves, waiting for centrepieces.</p>'}` : ''}`;

  const papers = p.papers.length
    ? `<div class="clippings">${p.papers.map((pp, i) => `<button class="paper-link clipping" data-paper="${i}" style="--tilt:${tilt(`paper${pp.day}`, 2.5)}deg"><span class="clip-mast">${MASTHEAD}</span><span class="small">Day ${pp.day} · ${esc(pp.place)}</span><b>${esc(pp.headline)}</b></button>`).join('')}</div>`
    : '<p class="hand">No front pages yet.</p>';

  const body = { heists, leo, market, lair: lairTab, papers }[tab];
  const names: Record<LairTab, string> = {
    heists: 'Heists',
    leo: 'Leo',
    market: `Black market${p.stash.length ? ` (${p.stash.length})` : ''}`,
    lair: 'Lair',
    papers: 'Front pages',
  };
  const el = show(
    `<div class="lair">
      <header class="lair-head">
        <figure class="polaroid" aria-hidden="true">${lairSvg(lairCondition(p), p.rooms.mailbox > 0)}<figcaption>Home sweet hideout</figcaption></figure>
        <div class="lair-id">
          <h1 class="nameplate">Leo’s Lair</h1>
          ${p.legendary ? '<span class="badge legend stamp blue">Legendary</span>' : ''}
          <dl class="lair-stats typed">
            <dt>Level</dt><dd>${lvl} <span class="xpbar small-bar"><span style="width:${Math.min(100, (into / need) * 100)}%"></span></span> <span class="small">${into}/${need} XP</span></dd>
            <dt>Catnip</dt><dd>${catnip(p.catnip)}</dd>
            <dt>Day</dt><dd>${p.day} · ${p.heists} heist${p.heists === 1 ? '' : 's'}</dd>
          </dl>
        </div>
        <div class="lair-buttons"><button id="lair-settings" class="quiet" title="Sound, speed, accessibility">Settings</button><button id="lair-quit" class="quiet" title="Back to the title screen">Save &amp; quit</button></div>
      </header>
      <nav class="tabs" role="tablist">
        ${(Object.keys(names) as LairTab[]).map((t) => `<button role="tab" aria-selected="${t === tab}" data-tab="${t}" class="${t === tab ? 'on' : ''}">${names[t]}</button>`).join('')}
      </nav>
      <section class="tab-body tab-${tab}">${body}</section>
    </div>`,
    'lair-screen',
  );
  on(el, '[data-tab]', (e) => lair(p, cb, (e.currentTarget as HTMLElement).dataset.tab as LairTab));
  on(el, '[data-job]', (e) => cb.onHeist(cb.jobs[Number((e.currentTarget as HTMLElement).dataset.job)]));
  // Selling: the piece slides over to the fence, the till rings, Catnip pops up, then the books update.
  const sellOne = (ware: HTMLElement | null, then: () => void, delay = 0) => {
    window.setTimeout(() => {
      if (ware) {
        ware.classList.add('sold');
        const pop = document.createElement('b');
        pop.className = 'catnip-pop';
        pop.textContent = `+${ware.querySelector('.price-tag b')?.textContent ?? ''}`;
        ware.appendChild(pop);
      }
      sfx('sell');
    }, delay);
    window.setTimeout(then, delay + 650);
  };
  on(el, '[data-sell]', (e) => {
    const id = Number((e.currentTarget as HTMLElement).dataset.sell);
    el.querySelectorAll<HTMLButtonElement>('[data-sell], #sell-all').forEach((b) => (b.disabled = true));
    sellOne(el.querySelector<HTMLElement>(`[data-ware="${id}"]`), () => cb.onSell(id));
  });
  on(el, '#sell-all', () => {
    const wares = [...el.querySelectorAll<HTMLElement>('[data-ware]')];
    el.querySelectorAll<HTMLButtonElement>('[data-sell], #sell-all').forEach((b) => (b.disabled = true));
    wares.forEach((w, i) => sellOne(w, () => {}, i * 140));
    window.setTimeout(cb.onSellAll, wares.length * 140 + 700);
  });
  on(el, '[data-paper]', (e) => cb.onPaper(Number((e.currentTarget as HTMLElement).dataset.paper)));
  on(el, '[data-raise]', (e) => cb.onRaise((e.currentTarget as HTMLElement).dataset.raise as Attribute));
  on(el, '[data-learn]', (e) => cb.onLearn((e.currentTarget as HTMLElement).dataset.learn as SkillId));
  on(el, '[data-upgrade]', (e) => cb.onUpgrade((e.currentTarget as HTMLElement).dataset.upgrade as Room));
  on(el, '[data-letter]', (e) => cb.onLetter(Number((e.currentTarget as HTMLElement).dataset.letter)));
  on(el, '#lair-quit', cb.onQuit);
  on(el, '#lair-settings', cb.onSettings);
}

/** The lair, placeholder art that fixes itself up as rooms are built: boards come off, lights go on, a neon sign. */
function lairSvg(condition: number, mailbox: boolean): string {
  const c = condition;
  const wall = c > 0.5 ? '#5b5170' : '#4a3f4f';
  const window = (x: number, lit: boolean, boarded: boolean) =>
    `<rect x="${x}" y="38" width="16" height="14" fill="${lit ? '#f2c46b' : '#2a2230'}" opacity="${lit ? 0.9 : 1}"/>` + (boarded ? `<path d="M${x - 1} 40 L${x + 17} 50 M${x - 1} 48 L${x + 17} 42" stroke="#8a6a45" stroke-width="3"/>` : '');
  return `<svg viewBox="0 0 120 90">
  <rect x="0" y="0" width="120" height="90" fill="#141a2e"/><circle cx="100" cy="16" r="8" fill="#e9e3c9"/>
  <rect x="18" y="26" width="84" height="60" fill="${wall}" stroke="#2a2230"/><path d="M14 28 L60 8 L106 28Z" fill="${c > 0.3 ? '#4a3a52' : '#3a2f3f'}"/>
  ${window(28, c > 0.15, c < 0.15)}${window(76, true, false)}${c > 0.4 ? window(52, true, false).replace('y="38"', 'y="34"') : ''}
  <rect x="52" y="60" width="16" height="26" fill="${c > 0.6 ? '#6b2a2a' : '#2a2230'}"/>
  ${c > 0.75 ? '<text x="60" y="22" text-anchor="middle" font-size="8" fill="#ff5ad1" font-family="Trebuchet MS, sans-serif" style="filter:drop-shadow(0 0 2px #ff5ad1)">LEO’S</text>' : '<rect x="34" y="18" width="30" height="7" fill="#6b4b2a" transform="rotate(-6 49 21)"/>'}
  ${mailbox ? '<rect x="76" y="70" width="8" height="8" fill="#a83232"/><rect x="79" y="78" width="2" height="8" fill="#555"/>' : ''}
</svg>`;
}

// --- The briefing: what the Planning Table knows -----------------------------------------------------

/** What each kind of guard is like, for the notes on the planning board. */
const GUARD_NOTES: Record<string, string> = {
  watch: 'Regular patrol. Sees a long way into lamplight, hardly anything in the dark.',
  sleepy: 'Dozes on the job. Any noise nearby wakes him up.',
  captain: 'The captain. Sharper eyes than the rest: give him a wide berth.',
  sniffer: 'A nose that smells Leo through walls, close up. Hide in a crate.',
  robo: 'A Robo-Guard. Ignores thrown things and sees heat in the dark. Cut the power to stop it.',
  nightclaw: 'The legend himself. Don’t let him see you coming.',
};

/**
 * The planning board before a heist: a photo of the place (the game draws it), the prize, the floor plan, a card
 * for every guard, sticky notes, and red string between the clues. What's on it grows with the Planning Table.
 */
export function briefing(def: LevelDef, p: Profile, rival: RivalPlan | null, onStart: () => void, onBack: () => void, photo?: Promise<string>): void {
  const tier = p.rooms.planning;
  const level = parseLevel(def);
  const rec = p.records[def.id];
  const S = 16;
  const cells: string[] = [];
  if (tier >= 1)
    for (let y = 0; y < level.h; y++)
      for (let x = 0; x < level.w; x++) {
        const t = level.tiles[y][x];
        // Drawn like a blueprint: white walls on blue paper.
        const fill =
          t === 'wall' || t === 'panel' || t === 'fuse' || t === 'switch'
            ? '#dce9f5'
            : ({ pillar: '#a9c2db', stack: '#a9c2db', exit: '#f0e442', door: '#e9c46a', marble: '#2d5f92', keydoor: '#e9c46a', vault: '#e9c46a', glass: '#7fb0d8', kennel: '#c9772f', desk: '#a9c2db', keycard: '#f0e442', crate: '#c9a66b', tidal: '#3f6f8e', 'belt-e': '#16385c', 'belt-w': '#16385c', paint: '#e0314b', gap: '#0f2a44', wire: '#0f2a44' } as Record<string, string>)[t] ?? '#24538a';
        cells.push(`<rect x="${x * S}" y="${y * S}" width="${S}" height="${S}" fill="${fill}"/>`);
        if (level.ducts[y][x]) cells.push(`<rect x="${x * S + 5}" y="${y * S + 5}" width="6" height="6" fill="none" stroke="#dce9f5" stroke-dasharray="2 1" opacity="0.8"/>`);
        if (t === 'wire') cells.push(`<line x1="${x * S}" y1="${y * S + 8}" x2="${x * S + S}" y2="${y * S + 8}" stroke="#c8ccd8" stroke-width="1.5"/>`);
        if (t === 'laser') cells.push(`<line x1="${x * S}" y1="${y * S + 8}" x2="${x * S + S}" y2="${y * S + 8}" stroke="#ff2a2a" stroke-width="2"/>`);
        if (t === 'panel' || t === 'fuse') cells.push(`<rect x="${x * S + 4}" y="${y * S + 4}" width="8" height="8" fill="${t === 'panel' ? '#55d6c2' : '#f2c94c'}"/>`);
      }
  const marks: string[] = [];
  if (tier >= 1) {
    for (const l of allLoot(def))
      marks.push(
        def.map[l.at.y][l.at.x] === 'G'
          ? `<circle cx="${l.at.x * S + 8}" cy="${l.at.y * S + 8}" r="11" fill="none" stroke="#e0314b" stroke-width="2.5"/><circle cx="${l.at.x * S + 8}" cy="${l.at.y * S + 8}" r="4" fill="#f0e442"/>`
          : `<circle cx="${l.at.x * S + 8}" cy="${l.at.y * S + 8}" r="3.5" fill="#f7f1e0"/>`,
      );
    marks.push(`<text x="${level.start.x * S + 8}" y="${level.start.y * S + 13}" text-anchor="middle" font-size="13" font-weight="700" fill="#f0e442">L</text>`);
  }
  if (tier >= 2) {
    for (const lamp of level.lamps) marks.push(`<circle cx="${lamp.at.x * S + 8}" cy="${lamp.at.y * S + 8}" r="${lamp.radius * S}" fill="#ffd27a" opacity="0.12"/><circle cx="${lamp.at.x * S + 8}" cy="${lamp.at.y * S + 8}" r="3" fill="#ffd27a"/>`);
    for (const c of level.cameras) marks.push(`<rect x="${c.at.x * S + 3}" y="${c.at.y * S + 3}" width="10" height="10" rx="2" fill="#c77dff"/>`);
  }
  if (tier >= 3)
    for (const g of level.guards) {
      const pts = [g.start, ...g.route].map((q) => `${q.x * S + 8},${q.y * S + 8}`).join(' ');
      marks.push(`<polyline points="${pts}" fill="none" stroke="#ff8a5a" stroke-width="2" stroke-dasharray="4 3"/><circle cx="${g.start.x * S + 8}" cy="${g.start.y * S + 8}" r="4" fill="#ff8a5a"/>`);
    }
  const centre = def.loot.find((l) => level.plinth && l.at.x === level.plinth.x && l.at.y === level.plinth.y)?.name ?? 'prize';
  const entrance = rival && def.rivalEntrances ? def.rivalEntrances[rival.entrance % def.rivalEntrances.length] : null;
  if (rival && entrance && tier >= 2) marks.push(`<text x="${entrance.x * S + 8}" y="${entrance.y * S + 12}" text-anchor="middle" font-size="12" fill="#b05cff">R</text>`);
  const rumour =
    tier < 1
      ? ''
      : rival
        ? `<p class="rumour"><img class="rival-mug" src="${portrait(rival.id)}" alt=""><b>Rumour:</b> word is ${esc(RIVALS[rival.id].name)} has an eye on ${the(esc(centre))} tonight.${tier >= 2 && entrance ? ` They’ll come in on turn ${rival.arrive}, by the spot marked R.` : ' A better Planning Table would tell you when, and where they’ll come in.'} Get it first.</p>`
        : '<p class="rumour quiet-rumour"><b>Rumour:</b> no rival thieves are after this one.</p>';
  const plan = tier
    ? `<svg class="plan" viewBox="0 0 ${level.w * S} ${level.h * S}">${cells.join('')}${marks.join('')}</svg>
       <p class="legend">red ring: the prize · dots: loot · dashed squares: vents · red lines: lasers${tier >= 2 ? ' · purple: cameras · yellow: lamps' : ''}${tier >= 3 ? ' · orange dashes: guard routes' : ''}</p>`
    : '<p class="no-plan">No floor plan yet. Build a Planning Table at the lair to see it before you go in.</p>';
  const prize = def.loot.find((l) => level.plinth && l.at.x === level.plinth.x && l.at.y === level.plinth.y);
  const others = allLoot(def).filter((l) => l !== prize);
  const lasers = def.map.join('').split('x').length - 1;
  const tilt = (i: number) => `--tilt:${((i * 37) % 7) - 3}deg`;
  const guardCards = level.guards
    .map((g, i) => {
      const kind = g.kind ?? 'watch';
      const art = kind === 'sniffer' ? 'dog' : kind === 'robo' ? 'robot' : kind === 'nightclaw' ? 'nightclaw' : 'guard';
      const route = tier >= 3 ? `Walks a beat of ${g.route.length} stop${g.route.length === 1 ? '' : 's'}.` : 'Beat unknown: a better Planning Table would show it.';
      return `<figure class="mug-card" style="${tilt(i + 3)}"><span class="pin"></span><img src="${charImageUrl(art)}" alt=""><figcaption><b>${esc(g.name)}</b><span>${GUARD_NOTES[kind]}</span><span class="route">${route}</span></figcaption></figure>`;
    })
    .join('');
  const el = show(
    `<div class="board-wrap">
      <div class="board">
        <svg class="strings" aria-hidden="true"></svg>
        <header class="board-title" style="--tilt:-1.5deg"><span class="pin"></span><small>The job${rec ? ` · ${rec.flawless ? 'pulled off flawlessly' : 'done before'}, best ${rec.bestTurns} turns` : ''}</small><h1>${esc(def.name)}</h1></header>
        <figure class="snap target linked" style="--tilt:-3deg"><span class="pin"></span><div class="snap-img" id="level-photo"><span>Developing…</span></div><figcaption>The place</figcaption></figure>
        <div class="sticky-note objective-note" style="--tilt:2deg"><span class="pin"></span><b>The plan</b>${esc(def.objective)}</div>
        ${prize ? `<figure class="snap prize linked" style="--tilt:4deg"><span class="pin"></span><img src="${lootPictureUrl(prize.name, prize.category)}" alt=""><figcaption>${esc(prize.name)} <b>$${prize.value.toLocaleString('en-US')}</b></figcaption></figure>` : ''}
        <div class="plan-card linked" style="--tilt:-1deg"><span class="pin"></span><b class="card-label">Floor plan</b>${plan}</div>
        <div class="facts-card" style="--tilt:1.5deg"><span class="pin"></span><b class="card-label">What we know</b><ul>
          <li><b>${allLoot(def).length}</b> pieces of loot</li>
          <li><b>${level.guards.length}</b> guard${level.guards.length === 1 ? '' : 's'}</li>
          ${tier >= 2 ? `<li><b>${level.cameras.length}</b> camera${level.cameras.length === 1 ? '' : 's'}</li><li><b>${lasers}</b> laser${lasers === 1 ? '' : 's'}</li>` : '<li class="dim">Cameras and lasers: unknown</li>'}
        </ul></div>
        ${def.tip ? `<div class="sticky-note tip-note" style="--tilt:-2.5deg"><span class="pin"></span><b>New here</b>${esc(def.tip)}</div>` : ''}
        <div class="guards-strip">${guardCards}</div>
        ${rumour ? `<div class="rumour-card linked" style="--tilt:2deg"><span class="pin"></span>${rumour}</div>` : ''}
        ${tier >= 1 && others.length ? `<div class="loot-strip" style="--tilt:-0.5deg"><span class="pin"></span><b class="card-label">Also worth a look</b><div class="loot-row">${others.map((l) => `<figure><img src="${lootPictureUrl(l.name, l.category)}" alt=""><figcaption>${esc(l.name)}<br><b>$${l.value.toLocaleString('en-US')}</b></figcaption></figure>`).join('')}</div></div>` : ''}
        <div class="board-buttons"><button id="go" class="primary big-go">Let’s do this!</button><button id="back">Back to the lair</button></div>
      </div>
    </div>`,
    'overlay board-bg',
  );
  on(el, '#go', onStart);
  on(el, '#back', onBack);
  // The level's photo, when the game has drawn it.
  photo?.then((url) => {
    const box = el.querySelector('#level-photo');
    if (box) box.innerHTML = `<img src="${url}" alt="">`;
    requestAnimationFrame(() => strings(el));
  });
  // Red string from pin to pin between the main clues.
  const strings = (root: HTMLElement) => {
    const board = root.querySelector<HTMLElement>('.board');
    const svg = root.querySelector<SVGSVGElement>('.strings');
    if (!board || !svg || !board.isConnected) return;
    const b = board.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${b.width} ${b.height}`);
    const pins = [...root.querySelectorAll<HTMLElement>('.linked > .pin')].map((pin) => {
      const r = pin.getBoundingClientRect();
      return { x: r.left + r.width / 2 - b.left, y: r.top + r.height / 2 - b.top };
    });
    svg.innerHTML = pins
      .slice(1)
      .map((q, n) => {
        const a = pins[n];
        const sag = Math.min(60, Math.hypot(q.x - a.x, q.y - a.y) * 0.18);
        return `<path d="M${a.x} ${a.y} Q${(a.x + q.x) / 2} ${(a.y + q.y) / 2 + sag} ${q.x} ${q.y}"/>`;
      })
      .join('');
  };
  requestAnimationFrame(() => strings(el));
  const onResize = () => (el.isConnected ? strings(el) : window.removeEventListener('resize', onResize));
  window.addEventListener('resize', onResize);
}
