// The screens between heists, built as plain DOM over the game canvas: the title, the narrator,
// the calling card, the morning paper, the heist report, the city map and the lair.
import type { LevelDef, LootCategory } from '../core/level';
import type { Paper } from '../meta/newspaper';
import { MASTHEAD } from '../meta/newspaper';
import {
  LAIR_PRICE,
  DEMAND_BONUS,
  demand,
  fenceRate,
  playerLevel,
  priceOf,
  xpForLevel,
  type HeistReport,
  type Profile,
} from '../meta/profile';

const root = () => document.getElementById('screens')!;
const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const money = (n: number) => `$${n.toLocaleString('en-US')}`;
const catnip = (n: number) => `<span class="nip">${n.toLocaleString('en-US')}</span>`;
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

// --- Title -----------------------------------------------------------------------------------

export function titleScreen(hasSave: boolean, onNew: () => void, onContinue: () => void): void {
  const el = show(
    `<div class="card big title-card">
      <div class="kicker">Prototype M2 · vertical slice</div>
      <h1>Purrrfect Crime</h1>
      <p>Leo Tuxedo is new in town, sharply dressed and short of Catnip. The museums are full of treasures
        and the guards are half asleep. Time to make a name for himself.</p>
      <div class="row-buttons">
        ${hasSave ? '<button id="continue" class="primary">Continue</button>' : ''}
        <button id="new" class="${hasSave ? '' : 'primary'}">New game</button>
      </div>
      ${hasSave ? '<p class="small">Starting a new game replaces your saved one.</p>' : ''}
      <p class="small">Placeholder art throughout. Generated sprites replace it later. Progress saves in this browser.</p>
    </div>`,
    'overlay',
  );
  on(el, '#continue', onContinue);
  let armed = !hasSave;
  on(el, '#new', (e) => {
    if (armed) return onNew();
    armed = true;
    (e.currentTarget as HTMLElement).textContent = 'Really start again?';
  });
}

// --- The narrator, between heists --------------------------------------------------------------

/** A sequence of narrator lines with a Next button; the last button runs `done`. */
export function narratorScene(lines: string[], last: string, done: () => void): void {
  let i = 0;
  const el = show(`<div class="card big scene"><div class="speaker">${NARRATOR_SVG}<div><div class="kicker">The narrator</div><p id="line"></p></div></div><div class="row-buttons"><button id="next" class="primary"></button></div></div>`, 'overlay');
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

// --- The calling card and the paper ------------------------------------------------------------------

export function callingCard(done: () => void): void {
  show(`<div class="card-beat"><div class="calling-card">${CARD_SVG}</div><p>Leo leaves his calling card.</p></div>`, 'overlay dark');
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

export function heistReport(r: HeistReport, p: Profile, done: () => void): void {
  const lvl = playerLevel(p.xp);
  const into = p.xp - xpForLevel(lvl);
  const need = xpForLevel(lvl + 1) - xpForLevel(lvl);
  const el = show(
    `<div class="card big report">
      <div class="kicker">Heist report · ${esc(r.levelName)}</div>
      <h1>${r.flawless ? 'Flawless.' : 'Got away.'} ${r.turns} turns.</h1>
      <table class="xp">${r.xp.map((l) => `<tr><td>${esc(l.label)}</td><td>+${l.amount} XP</td></tr>`).join('')}
        <tr class="total"><td>Total</td><td>+${r.xpTotal} XP</td></tr></table>
      ${r.levelAfter > r.levelBefore ? `<p class="levelup">Level up! Leo is now level ${r.levelAfter}. The fences pay ${Math.round(fenceRate(r.levelAfter) * 100)}% now.</p>` : ''}
      <div class="xpbar"><span style="width:${Math.min(100, (into / need) * 100)}%"></span></div>
      <p class="small">Level ${lvl} · ${into}/${need} XP to level ${lvl + 1}</p>
      <p>${r.items.length ? `${r.items.length} piece${r.items.length === 1 ? '' : 's'} went to the stash${r.replay ? ', but this is a replay, so the fences call it hot and pay half' : ''}.` : 'Nothing to sell this time.'}</p>
      <div class="row-buttons"><button id="report-ok" class="primary">Continue</button></div>
    </div>`,
    'overlay',
  );
  on(el, '#report-ok', done);
}

// --- The city map: buying the lair ---------------------------------------------------------------------

export function cityMap(p: Profile, onBuy: () => void): void {
  const blocks: string[] = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 6; c++) {
      const x = 20 + c * 95;
      const y = 20 + r * 85;
      blocks.push(`<rect x="${x}" y="${y}" width="80" height="68" rx="4" class="block"/>`);
    }
  const el = show(
    `<div class="citymap">
      <div class="card map-head"><div class="speaker">${NARRATOR_SVG}<p>Every thief needs a headquarters, kid. There's an abandoned building on the edge of Old Town. It's a wreck, but it's cheap. Click it.</p></div></div>
      <svg viewBox="0 0 600 370" class="map-svg">
        <rect width="600" height="370" fill="#141a2e"/>
        ${blocks.join('')}
        <text x="60" y="14" class="district">OLD TOWN</text><text x="250" y="14" class="district">MUSEUM MILE</text><text x="450" y="14" class="district">THE HEIGHTS</text>
        <text x="60" y="366" class="district">HARBOUR</text><text x="420" y="366" class="district">DOWNTOWN</text>
        <g class="landmark"><rect x="115" y="20" width="80" height="68" rx="4"/><text x="155" y="58">Corner Gallery</text></g>
        <g class="landmark"><rect x="210" y="105" width="80" height="68" rx="4"/><text x="250" y="143">City Museum</text></g>
        <g id="lair-building" class="for-sale" role="button" tabindex="0"><rect x="20" y="190" width="80" height="68" rx="4"/>
          <text x="60" y="222">Abandoned</text><text x="60" y="236">building</text><text x="60" y="250" class="price">${LAIR_PRICE} Catnip</text></g>
      </svg>
      <div id="buy-box" class="card buy-box hidden"><p>Buy the abandoned building for ${catnip(LAIR_PRICE)} Catnip? It will be your lair.</p>
        <div class="row-buttons"><button id="buy" class="primary">Buy it</button><button id="not-yet">Not yet</button></div></div>
      <p class="small">You have ${catnip(p.catnip)} Catnip.</p>
    </div>`,
    'overlay',
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
  onHeist: (def: LevelDef) => void;
  onSell: (id: number) => void;
  onSellAll: () => void;
  onPaper: (index: number) => void;
}

export type LairTab = 'heists' | 'market' | 'papers' | 'upgrades';

export function lair(p: Profile, cb: LairCallbacks, tab: LairTab = 'heists'): void {
  const lvl = playerLevel(p.xp);
  const into = p.xp - xpForLevel(lvl);
  const need = xpForLevel(lvl + 1) - xpForLevel(lvl);
  const wanted = demand(p.day);

  const heists = cb.jobs
    .map((def, i) => {
      const rec = p.records[def.id];
      const centre = def.loot.find((l) => def.map[l.at.y][l.at.x] === 'G');
      return `<div class="job">
        <div><b>${esc(def.name)}</b>${rec ? ' <span class="badge">cleared</span>' : ' <span class="badge new">new</span>'}
          <p class="small">${esc(def.objective)}</p>
          <p class="small">${def.loot.length} pieces of loot${centre ? ` · centrepiece: ${esc(centre.name)}${rec?.centrepiece ? ' ✓' : ''}` : ''}${rec ? ` · best ${rec.bestTurns} turns${rec.flawless ? ' · flawless ✓' : ''}` : ''}</p>
          ${rec ? '<p class="small warn">Replay: the loot is back on display, but the fences will call it hot and pay half.</p>' : ''}</div>
        <button class="primary" data-job="${i}">${rec ? 'Replay' : 'Plan the heist'}</button>
      </div>`;
    })
    .join('');

  const stash = p.stash
    .map(
      (s) => `<tr><td><b>${esc(s.name)}</b>${s.centrepiece ? ' <span class="badge">centrepiece</span>' : ''}${s.hot ? ' <span class="badge hot">hot</span>' : ''}<br><span class="small">${CATEGORY_NAMES[s.category]} · ${esc(s.levelName)} · est. ${money(s.value)}</span></td>
        <td class="price">${catnip(priceOf(p, s))}${s.category === wanted ? ' <span class="badge">+25%</span>' : ''}</td>
        <td><button data-sell="${s.id}">Sell</button></td></tr>`,
    )
    .join('');
  const market = `
    <p class="demand">This week's buyers want <b>${CATEGORY_NAMES[wanted]}</b>: +${Math.round(DEMAND_BONUS * 100)}%. Demand changes every three days (one heist is one day).</p>
    <p class="small">The fence pays one Catnip per $10 of an item's estimated value, minus his cut: you get ${Math.round(fenceRate(lvl) * 100)}% at your level, 2% more each level. Hold things for a better week, or sell now.</p>
    ${p.stash.length ? `<table class="stash">${stash}</table><div class="row-buttons"><button id="sell-all" class="primary">Sell everything (${catnip(p.stash.reduce((n, s) => n + priceOf(p, s), 0))})</button></div>` : '<p>The stash is empty. Go steal something.</p>'}
    <p class="small">Lifetime sales: ${catnip(p.soldTotal)} Catnip.</p>`;

  const papers = p.papers.length
    ? p.papers.map((pp, i) => `<button class="paper-link" data-paper="${i}"><span class="small">Day ${pp.day} · ${esc(pp.place)}</span><br><b>${esc(pp.headline)}</b></button>`).join('')
    : '<p>No front pages yet.</p>';

  const upgrades = `<p>The building is a wreck: boarded windows, a leaky roof and one flickering bulb. Upgrades for the planning table,
    workshop, fence's office, gym, trophy room and mailbox, plus Leo's attributes and skills, arrive in the next milestone.</p>`;

  const body = { heists, market, papers, upgrades }[tab];
  const el = show(
    `<div class="lair">
      <header class="lair-head">
        <div class="lair-art" aria-hidden="true">${LAIR_SVG}</div>
        <div class="lair-stats">
          <div class="title">Leo's lair</div>
          <div>Level <b>${lvl}</b> <span class="xpbar small-bar"><span style="width:${Math.min(100, (into / need) * 100)}%"></span></span> <span class="small">${into}/${need} XP</span></div>
          <div>Catnip ${catnip(p.catnip)} · Day ${p.day} · Heists ${p.heists}</div>
        </div>
      </header>
      <nav class="tabs">
        ${(['heists', 'market', 'papers', 'upgrades'] as LairTab[])
          .map((t) => `<button data-tab="${t}" class="${t === tab ? 'on' : ''}">${{ heists: 'Heists', market: `Black market${p.stash.length ? ` (${p.stash.length})` : ''}`, papers: 'Front pages', upgrades: 'Upgrades' }[t]}</button>`)
          .join('')}
      </nav>
      <section class="tab-body">${body}</section>
    </div>`,
  );
  on(el, '[data-tab]', (e) => lair(p, cb, (e.currentTarget as HTMLElement).dataset.tab as LairTab));
  on(el, '[data-job]', (e) => cb.onHeist(cb.jobs[Number((e.currentTarget as HTMLElement).dataset.job)]));
  on(el, '[data-sell]', (e) => cb.onSell(Number((e.currentTarget as HTMLElement).dataset.sell)));
  on(el, '#sell-all', cb.onSellAll);
  on(el, '[data-paper]', (e) => cb.onPaper(Number((e.currentTarget as HTMLElement).dataset.paper)));
}

/** The run-down lair, placeholder: boarded windows, a crooked sign, one lit window. */
const LAIR_SVG = `<svg viewBox="0 0 120 90">
  <rect x="0" y="0" width="120" height="90" fill="#141a2e"/><circle cx="100" cy="16" r="8" fill="#e9e3c9"/>
  <rect x="18" y="26" width="84" height="60" fill="#4a3f4f" stroke="#2a2230"/><path d="M14 28 L60 8 L106 28Z" fill="#3a2f3f"/>
  <rect x="28" y="38" width="16" height="14" fill="#2a2230"/><path d="M27 40 L45 50 M27 48 L45 42" stroke="#8a6a45" stroke-width="3"/>
  <rect x="76" y="38" width="16" height="14" fill="#f2c46b" opacity="0.85"/>
  <rect x="52" y="60" width="16" height="26" fill="#2a2230"/>
  <rect x="34" y="18" width="30" height="7" fill="#6b4b2a" transform="rotate(-6 49 21)"/>
</svg>`;
