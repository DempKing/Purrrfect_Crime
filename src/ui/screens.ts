// The screens between heists, built as plain DOM over the game canvas: the title and save slots,
// the narrator, the calling card, the morning paper, the heist report, the city map, the lair and
// the briefing before a heist.
import { parseLevel, type LevelDef, type LootCategory } from '../core/level';
import { RIVALS, type RivalPlan } from '../core/game';
import type { Paper } from '../meta/newspaper';
import { LETTERS, delivery, hasLetter, type Letter } from '../meta/letters';
import { MASTHEAD } from '../meta/newspaper';
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
  attributePoints,
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

// --- Title and save slots ---------------------------------------------------------------------

export interface TitleCallbacks {
  onPlay: (slot: number) => void;
  onNew: (slot: number) => void;
  onDelete: (slot: number) => void;
}

function slotSummary(p: Profile): string {
  const where = !p.tutorialDone ? 'In the tutorial' : !p.lairOwned ? 'Looking for a lair' : `Day ${p.day} · ${p.heists} heist${p.heists === 1 ? '' : 's'}`;
  return `Level ${playerLevel(p.xp)} · ${where} · ${p.catnip.toLocaleString('en-US')} Catnip`;
}

export function titleScreen(slots: (Profile | null)[], cb: TitleCallbacks): void {
  const el = show(
    `<div class="card big title-card">
      <div class="kicker">Prototype M4 · The Heights</div>
      <h1>Purrrfect Crime</h1>
      <p>Leo Tuxedo is new in town, sharply dressed and short of Catnip. The museums are full of treasures
        and the guards are half asleep. Time to make a name for himself.</p>
      <div class="slots">
        ${slots
          .map((p, i) =>
            p
              ? `<div class="slot"><div><b>Game ${i + 1}</b><br><span class="small">${slotSummary(p)}</span></div>
                  <div class="row-buttons"><button class="primary" data-play="${i}">Continue</button><button data-delete="${i}">Delete</button></div></div>`
              : `<div class="slot empty"><div><b>Game ${i + 1}</b><br><span class="small">Empty</span></div>
                  <div class="row-buttons"><button data-new="${i}">New game</button></div></div>`,
          )
          .join('')}
      </div>
      <p class="small">Placeholder art throughout. Generated sprites replace it later. Games save in this browser.</p>
    </div>`,
    'overlay',
  );
  on(el, '[data-play]', (e) => cb.onPlay(Number((e.currentTarget as HTMLElement).dataset.play)));
  on(el, '[data-new]', (e) => cb.onNew(Number((e.currentTarget as HTMLElement).dataset.new)));
  on(el, '[data-delete]', (e) => {
    const b = e.currentTarget as HTMLElement;
    if (b.dataset.armed) return cb.onDelete(Number(b.dataset.delete));
    b.dataset.armed = '1';
    b.textContent = 'Really delete?';
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
      ${r.rival ? `<p class="rival-line">${r.rival.won ? `You beat ${esc(RIVALS[r.rival.id].name)} to the prize.` : `${esc(RIVALS[r.rival.id].name)} got the centrepiece this time. Replay to take it yourself.`}</p>` : ''}
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
        ${L.body.map((b) => `<p>${esc(b)}</p>`).join('')}
        <p class="sign">— NC ${SEAL_SVG}</p>
      </div>
      <div class="row-buttons"><button id="letter-ok" class="primary">${esc(button)}</button></div>
    </div>`,
    'overlay dark',
  );
  on(el, '#letter-ok', done);
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
  districts: { id: string; name: string; levels: LevelDef[] }[];
  onHeist: (def: LevelDef) => void;
  onSell: (id: number) => void;
  onSellAll: () => void;
  onPaper: (index: number) => void;
  onRaise: (id: Attribute) => void;
  onLearn: (id: SkillId) => void;
  onUpgrade: (id: Room) => void;
  onLetter: (index: number) => void;
  onQuit: () => void;
}

export type LairTab = 'heists' | 'leo' | 'market' | 'lair' | 'papers';

const pips = (n: number, of: number) => `<span class="pips">${Array.from({ length: of }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;

export function lair(p: Profile, cb: LairCallbacks, tab: LairTab = 'heists'): void {
  const lvl = playerLevel(p.xp);
  const into = p.xp - xpForLevel(lvl);
  const need = xpForLevel(lvl + 1) - xpForLevel(lvl);
  const wanted = demand(p.day);
  const points = attributePoints(p);

  // A heist opens once the one before it is cleared; anything already cleared stays open. NightClaw's
  // challenge opens with his second letter.
  const unlocked = (i: number) =>
    cb.jobs[i].challenge ? hasLetter(p, 2) : i === 0 || !!p.records[cb.jobs[i].id] || !!p.records[cb.jobs[i - 1].id];
  const job = (def: LevelDef) => {
    const i = cb.jobs.indexOf(def);
    const rec = p.records[def.id];
    const centre = def.loot.find((l) => def.map[l.at.y][l.at.x] === 'G');
    if (!unlocked(i))
      return `<div class="job locked"><div><b>${esc(def.name)}</b> <span class="badge">locked</span><p class="small">Clear ${esc(cb.jobs[i - 1].name)} first.</p></div></div>`;
    return `<div class="job">
        <div><b>${esc(def.name)}</b>${rec ? ' <span class="badge">cleared</span>' : ' <span class="badge new">new</span>'}
          <p class="small">${esc(def.objective)}</p>
          <p class="small">${def.loot.length} piece${def.loot.length === 1 ? '' : 's'} of loot${centre ? ` · centrepiece: ${esc(centre.name)}${rec?.centrepiece ? ' ✓' : ''}` : ''}${rec ? ` · best ${rec.bestTurns} turns${rec.flawless ? ' · flawless ✓' : ''}` : ''}</p>
          ${rec?.lostTo ? `<p class="small rival-line">${esc(RIVALS[rec.lostTo].name)} got away with the ${esc(centre?.name ?? 'centrepiece')}. Replay to steal it yourself.</p>` : ''}
          ${p.rivals[def.id] && p.rooms.planning >= 1 ? `<p class="small rival-line">Rumour: ${esc(RIVALS[p.rivals[def.id]!.id].name)} is after the ${esc(centre?.name ?? 'centrepiece')}.</p>` : ''}
          ${rec ? '<p class="small warn">Replay: the loot is back on display, but the fences will call it hot and pay half.</p>' : ''}</div>
        <button class="primary" data-job="${i}">${rec ? 'Replay' : 'Plan the heist'}</button>
      </div>`;
  };
  const campaign = cb.jobs.slice(1).filter((d) => !d.challenge);
  const flawless = campaign.filter((d) => p.records[d.id]?.flawless).length;
  const challenge = hasLetter(p, 3)
    ? `<div class="card challenge"><b>The NightClaw Challenge</b> ${pips(flawless, campaign.length)}<p class="small">${flawless} of ${campaign.length} centrepieces taken in a flawless heist (never seen, no alarms). NightClaw wants every one.${campaign.length < 25 ? ' More of the city opens in later builds.' : ''}</p></div>`
    : '';
  const heists = challenge + cb.districts
    .filter((d) => d.levels.some((l) => unlocked(cb.jobs.indexOf(l))))
    .map((d) => `<h2 class="section district">${esc(d.name)}</h2>${d.levels.map(job).join('')}`)
    .join('');

  const attributes = ATTRIBUTES.map((a) => {
    const rank = p.attributes[a.id];
    const why = canRaise(p, a.id);
    const next = a.ranks[rank];
    return `<div class="up"><div><b>${a.name}</b> ${pips(rank, a.ranks.length)}<br><span class="small">${esc(a.blurb)}</span>
        ${next ? `<br><span class="small next">Next: ${esc(next)}</span>` : ''}</div>
      ${next ? `<button data-raise="${a.id}" ${why ? 'disabled' : ''} title="${esc(why ?? '')}">${catnip(attributeCost(p, a.id))}</button>` : '<span class="badge">max</span>'}</div>`;
  }).join('');
  const trees = TREES.map(
    (t) => `<div class="tree"><h3>${t.name} <span class="small">${t.blurb}</span></h3>
      ${SKILLS.filter((s) => s.tree === t.id)
        .map((s) => {
          const owned = p.skills.includes(s.id);
          const why = canLearn(p, s.id);
          return `<div class="skill ${owned ? 'owned' : ''} ${s.later ? 'later' : ''}"><div><b>${s.name}</b> <span class="small">level ${s.level}</span><br><span class="small">${esc(s.text)}</span>
            ${!owned && why && why !== 'Not enough Catnip.' ? `<br><span class="small warn">${esc(why)}</span>` : ''}</div>
            ${owned ? '<span class="badge">learned</span>' : `<button data-learn="${s.id}" ${why ? 'disabled' : ''} title="${esc(why ?? '')}">${catnip(s.cost)}</button>`}</div>`;
        })
        .join('')}</div>`,
  ).join('');
  const rivalry = (Object.entries(p.rivalRecord) as [keyof typeof RIVALS, { won: number; lost: number }][])
    .map(([id, r]) => `<li>${esc(RIVALS[id].name)}: beaten ${r.won} time${r.won === 1 ? '' : 's'}, lost ${r.lost}</li>`)
    .join('');
  const leo = `
    <p>Attribute points: <b>${points}</b> <span class="small">(one per level, plus Catnip for training)</span></p>
    <div class="ups">${attributes}</div>
    <h2 class="section">Skills</h2>
    <div class="trees">${trees}</div>
    ${rivalry ? `<h2 class="section">Rivals</h2><ul class="trophies">${rivalry}</ul>` : ''}`;

  const collector = collectorWants(p);
  const stash = p.stash
    .map(
      (s) => `<tr><td><b>${esc(s.name)}</b>${s.centrepiece ? ' <span class="badge">centrepiece</span>' : ''}${s.hot ? ' <span class="badge hot">hot</span>' : ''}${s.id === collector ? ' <span class="badge new">collector ×1.5</span>' : ''}<br><span class="small">${CATEGORY_NAMES[s.category]} · ${esc(s.levelName)} · est. ${money(s.value)}</span></td>
        <td class="price">${catnip(priceOf(p, s))}${s.category === wanted ? ' <span class="badge">+25%</span>' : ''}</td>
        <td><button data-sell="${s.id}">Sell</button></td></tr>`,
    )
    .join('');
  const office = p.rooms.fence ? ` The Fence's Office adds ${p.rooms.fence * 5}%.` : '';
  const market = `
    <p class="demand">This week's buyers want <b>${CATEGORY_NAMES[wanted]}</b>: +${Math.round(DEMAND_BONUS * 100)}%. Demand changes every three days (one heist is one day).</p>
    <p class="small">The fence pays one Catnip per $10 of an item's estimated value, minus his cut: you get ${Math.round(fenceRate(lvl) * 100)}% at your level, 2% more each level.${office} Hold things for a better week, or sell now.</p>
    ${p.stash.length ? `<table class="stash">${stash}</table><div class="row-buttons"><button id="sell-all" class="primary">Sell everything (${catnip(p.stash.reduce((n, s) => n + priceOf(p, s), 0))})</button></div>` : '<p>The stash is empty. Go steal something.</p>'}
    <p class="small">Lifetime sales: ${catnip(p.soldTotal)} Catnip.</p>`;

  const rooms = ROOMS.map((r) => {
    const tier = p.rooms[r.id];
    const cost = upgradeCost(p, r.id);
    const why = canUpgrade(p, r.id);
    const now = tier ? r.tiers[tier - 1].text : 'Not built yet.';
    const next = r.tiers[tier];
    return `<div class="up"><div><b>${r.name}</b> ${pips(tier, r.tiers.length)}<br><span class="small">${esc(now)}</span>
        ${next ? `<br><span class="small next">${tier ? 'Next' : 'Build'}: ${esc(next.text)}</span>` : ''}</div>
      ${cost !== null ? `<button data-upgrade="${r.id}" ${why ? 'disabled' : ''} title="${esc(why ?? '')}">${catnip(cost)}</button>` : '<span class="badge">max</span>'}</div>`;
  }).join('');
  const trophies = Object.entries(p.records)
    .filter(([, r]) => r.centrepiece)
    .map(([id]) => {
      const def = cb.jobs.find((j) => j.id === id);
      const c = def?.loot.find((l) => def.map[l.at.y][l.at.x] === 'G');
      return c ? `<li>${esc(c.name)} <span class="small">· ${esc(def!.name)}${p.records[id].flawless ? ' · flawless' : ''}</span></li>` : '';
    })
    .join('');
  const letters = p.letters.length
    ? `<h2 class="section">Letters</h2>${p.letters.map((l, i) => `<button class="paper-link" data-letter="${i}"><span class="small">Day ${l.day} · signed NC</span><br><b>Letter ${l.id}: ${esc(LETTERS[l.id].title)}</b></button>`).join('')}`
    : '';
  const lairTab = `
    <p class="small">Every upgrade fixes up the building a little more.</p>
    <div class="ups">${rooms}</div>
    ${letters}
    ${p.rooms.trophy ? `<h2 class="section">Trophy Room</h2>${trophies ? `<ul class="trophies">${trophies}</ul>` : '<p class="small">Empty shelves, waiting for centrepieces.</p>'}` : ''}`;

  const papers = p.papers.length
    ? p.papers.map((pp, i) => `<button class="paper-link" data-paper="${i}"><span class="small">Day ${pp.day} · ${esc(pp.place)}</span><br><b>${esc(pp.headline)}</b></button>`).join('')
    : '<p>No front pages yet.</p>';

  const body = { heists, leo, market, lair: lairTab, papers }[tab];
  const names: Record<LairTab, string> = {
    heists: 'Heists',
    leo: `Leo${points ? ` (${points})` : ''}`,
    market: `Black market${p.stash.length ? ` (${p.stash.length})` : ''}`,
    lair: 'Lair',
    papers: 'Front pages',
  };
  const el = show(
    `<div class="lair">
      <header class="lair-head">
        <div class="lair-art" aria-hidden="true">${lairSvg(lairCondition(p), p.rooms.mailbox > 0)}</div>
        <div class="lair-stats">
          <div class="title">Leo's lair</div>
          <div>Level <b>${lvl}</b> <span class="xpbar small-bar"><span style="width:${Math.min(100, (into / need) * 100)}%"></span></span> <span class="small">${into}/${need} XP</span></div>
          <div>Catnip ${catnip(p.catnip)} · Day ${p.day} · Heists ${p.heists}</div>
        </div>
        <button id="lair-quit" class="quit" title="Back to the title screen">Save &amp; quit</button>
      </header>
      <nav class="tabs">
        ${(Object.keys(names) as LairTab[]).map((t) => `<button data-tab="${t}" class="${t === tab ? 'on' : ''}">${names[t]}</button>`).join('')}
      </nav>
      <section class="tab-body">${body}</section>
    </div>`,
  );
  on(el, '[data-tab]', (e) => lair(p, cb, (e.currentTarget as HTMLElement).dataset.tab as LairTab));
  on(el, '[data-job]', (e) => cb.onHeist(cb.jobs[Number((e.currentTarget as HTMLElement).dataset.job)]));
  on(el, '[data-sell]', (e) => cb.onSell(Number((e.currentTarget as HTMLElement).dataset.sell)));
  on(el, '#sell-all', cb.onSellAll);
  on(el, '[data-paper]', (e) => cb.onPaper(Number((e.currentTarget as HTMLElement).dataset.paper)));
  on(el, '[data-raise]', (e) => cb.onRaise((e.currentTarget as HTMLElement).dataset.raise as Attribute));
  on(el, '[data-learn]', (e) => cb.onLearn((e.currentTarget as HTMLElement).dataset.learn as SkillId));
  on(el, '[data-upgrade]', (e) => cb.onUpgrade((e.currentTarget as HTMLElement).dataset.upgrade as Room));
  on(el, '[data-letter]', (e) => cb.onLetter(Number((e.currentTarget as HTMLElement).dataset.letter)));
  on(el, '#lair-quit', cb.onQuit);
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

export function briefing(def: LevelDef, p: Profile, rival: RivalPlan | null, onStart: () => void, onBack: () => void): void {
  const tier = p.rooms.planning;
  const level = parseLevel(def);
  const rec = p.records[def.id];
  const S = 16;
  const cells: string[] = [];
  if (tier >= 1)
    for (let y = 0; y < level.h; y++)
      for (let x = 0; x < level.w; x++) {
        const t = level.tiles[y][x];
        const fill =
          t === 'wall' || t === 'panel' || t === 'fuse'
            ? '#3b4366'
            : ({ pillar: '#59608a', exit: '#2f7d5b', door: '#8a6a45', marble: '#2a3150', keydoor: '#8a93a8', vault: '#c0c6d4', glass: '#5b88a8', kennel: '#9c4a2a', desk: '#7a5634', keycard: '#5ef0ff', gap: def.gaps === 'water' ? '#0f2a44' : '#06070d', wire: def.gaps === 'water' ? '#0f2a44' : '#06070d' } as Record<string, string>)[t] ?? '#1f2540';
        cells.push(`<rect x="${x * S}" y="${y * S}" width="${S}" height="${S}" fill="${fill}"/>`);
        if (level.ducts[y][x]) cells.push(`<rect x="${x * S + 5}" y="${y * S + 5}" width="6" height="6" fill="#5ec8ff" opacity="0.5"/>`);
        if (t === 'wire') cells.push(`<line x1="${x * S}" y1="${y * S + 8}" x2="${x * S + S}" y2="${y * S + 8}" stroke="#c8ccd8" stroke-width="1.5"/>`);
        if (t === 'laser') cells.push(`<line x1="${x * S}" y1="${y * S + 8}" x2="${x * S + S}" y2="${y * S + 8}" stroke="#ff2a2a" stroke-width="2"/>`);
        if (t === 'panel' || t === 'fuse') cells.push(`<rect x="${x * S + 4}" y="${y * S + 4}" width="8" height="8" fill="${t === 'panel' ? '#55d6c2' : '#f2c94c'}"/>`);
      }
  const marks: string[] = [];
  if (tier >= 1) {
    for (const l of def.loot) marks.push(`<circle cx="${l.at.x * S + 8}" cy="${l.at.y * S + 8}" r="${def.map[l.at.y][l.at.x] === 'G' ? 6 : 4}" fill="${def.map[l.at.y][l.at.x] === 'G' ? '#f2c46b' : '#9fe8ff'}"/>`);
    marks.push(`<text x="${level.start.x * S + 8}" y="${level.start.y * S + 12}" text-anchor="middle" font-size="11" fill="#fff">L</text>`);
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
        ? `<p class="rumour"><b>Rumour board:</b> word is ${esc(RIVALS[rival.id].name)} has an eye on the ${esc(centre)} tonight.${tier >= 2 && entrance ? ` They’ll come in on turn ${rival.arrive}, by the spot marked R.` : ' A better Planning Table would tell you when, and where they’ll come in.'} Get it first.</p>`
        : '<p class="small"><b>Rumour board:</b> no rival thieves are after this one.</p>';
  const plan = tier
    ? `<svg class="plan" viewBox="0 0 ${level.w * S} ${level.h * S}">${cells.join('')}${marks.join('')}</svg>
       <p class="small legend"><span style="color:#f2c46b">●</span> centrepiece · <span style="color:#9fe8ff">●</span> loot · <span style="color:#5ec8ff">■</span> vents · <span style="color:#ff2a2a">—</span> lasers${tier >= 2 ? ' · <span style="color:#c77dff">■</span> cameras · <span style="color:#ffd27a">●</span> lamps' : ''}${tier >= 3 ? ' · <span style="color:#ff8a5a">- -</span> guard routes' : ''}</p>`
    : '<p class="small">Build a Planning Table at the lair to see the floor plan before you go in.</p>';
  const el = show(
    `<div class="card big briefing">
      <div class="kicker">Briefing</div>
      <h1>${esc(def.name)}</h1>
      <p>${esc(def.objective)}</p>
      <p class="small">${def.loot.length} pieces of loot · ${level.guards.length} guard${level.guards.length === 1 ? '' : 's'}${tier >= 2 ? ` · ${level.cameras.length} camera${level.cameras.length === 1 ? '' : 's'}` : ''}${rec ? ` · best ${rec.bestTurns} turns` : ''}</p>
      ${def.tip ? `<p class="tip"><b>New here:</b> ${esc(def.tip)}</p>` : ''}
      <p class="small"><b>On duty:</b> ${level.guards.map((g) => `${esc(g.name)}${g.kind && g.kind !== 'watch' ? ` (${{ sleepy: 'sleepy', captain: 'captain', sniffer: 'sniffer' }[g.kind]})` : ''}`).join(', ')}</p>
      ${plan}
      ${rumour}
      <div class="row-buttons"><button id="go" class="primary">Start the heist</button><button id="back">Back to the lair</button></div>
    </div>`,
    'overlay',
  );
  on(el, '#go', onStart);
  on(el, '#back', onBack);
}
