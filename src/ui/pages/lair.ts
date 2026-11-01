// The lair: heists, Leo's skills, the black market, rooms and old papers.
import { type LevelDef, the } from '../../core/level';
import {
  type Attribute,
  attributeCost,
  ATTRIBUTES,
  canLearn,
  canRaise,
  canUpgrade,
  lairCondition,
  type Room,
  ROOMS,
  type SkillId,
  SKILLS,
  TREES,
  upgradeCost,
} from '../../meta/progression';
import {
  collectorWants,
  demand,
  DEMAND_BONUS,
  fenceRate,
  playerLevel,
  priceOf,
  type Profile,
  xpForLevel,
} from '../../meta/profile';
import { challengeProgress, hasLetter, LETTERS } from '../../meta/letters';
import { allLoot } from '../../core/exhibits';
import { RIVALS } from '../../core/game';
import { portrait } from '../pictures';
import { ACHIEVEMENTS } from '../../meta/achievements';
import { lootPictureUrl } from '../../render/characters';
import { MASTHEAD } from '../../meta/newspaper';
import { CATEGORY_NAMES, catnip, esc, FENCE_SVG, money, on, sfx, show, tilt } from './common';
import { SEAL_SVG } from './letters';

// The lair

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
/** Filled and empty dots, e.g. for room tiers. */
const pips = (n: number, of: number) =>
  `<span class="pips">${Array.from({ length: of }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
/** The lair screen: tabs for heists, Leo, the market, rooms and papers. */
export function lair(p: Profile, cb: LairCallbacks, tab: LairTab = 'heists'): void {
  // Leo's level and XP bar.
  const lvl = playerLevel(p.xp);
  const into = p.xp - xpForLevel(lvl);
  const need = xpForLevel(lvl + 1) - xpForLevel(lvl);
  const wanted = demand(p.day);

  // Heists tab: the job cards. A heist unlocks when the one before is cleared (the challenge: after Letter 2).
  const unlocked = (i: number) =>
    cb.jobs[i].finale
      ? hasLetter(p, 4)
      : cb.jobs[i].challenge
        ? hasLetter(p, 2)
        : i === 0 || !!p.records[cb.jobs[i].id] || !!p.records[cb.jobs[i - 1].id];
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
      .map(
        (d) =>
          `<section class="district-board"><h2 class="section district" style="--tilt:${tilt(d.id, 2)}deg">${esc(d.name)}</h2><div class="cards">${d.levels.map(job).join('')}</div></section>`,
      )
      .join('');

  // Leo tab: attributes, skill trees and the rivalry record.
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
    .map(
      ([id, r]) =>
        `<li>${esc(RIVALS[id].name)}: beaten ${r.won} time${r.won === 1 ? '' : 's'}, lost ${r.lost}</li>`,
    )
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

  // Market tab: the fence and Leo's stash.
  const collector = collectorWants(p);
  const office = p.rooms.fence ? ` My office takes ${p.rooms.fence * 5}% less off you.` : '';
  const total = p.stash.reduce((n, s) => n + priceOf(p, s), 0);
  const goods = p.stash
    .map((s, i) => {
      const deal =
        s.category === wanted
          ? `+${Math.round(DEMAND_BONUS * 100)}% this week`
          : s.id === collector
            ? 'collector ×1.5'
            : s.hot
              ? 'hot: half price'
              : '';
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

  // Lair tab: rooms, trophies and letters.
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
      return c
        ? `<li>${esc(c.revealed ? 'NightClaw’s old collar' : c.name)} <span class="small">· ${esc(def!.name)}${p.records[id].flawless ? ' · flawless' : ''}</span></li>`
        : '';
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

  // Papers tab: old front pages.
  const papers = p.papers.length
    ? `<div class="clippings">${p.papers.map((pp, i) => `<button class="paper-link clipping" data-paper="${i}" style="--tilt:${tilt(`paper${pp.day}`, 2.5)}deg"><span class="clip-mast">${MASTHEAD}</span><span class="small">Day ${pp.day} · ${esc(pp.place)}</span><b>${esc(pp.headline)}</b></button>`).join('')}</div>`
    : '<p class="hand">No front pages yet.</p>';

  // Show the chosen tab and wire up its buttons.
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
  // Selling animation: item slides to the fence, till rings, then the totals update.
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
/** The lair picture, which looks better as rooms are built. */
function lairSvg(condition: number, mailbox: boolean): string {
  const c = condition;
  const wall = c > 0.5 ? '#5b5170' : '#4a3f4f';
  const window = (x: number, lit: boolean, boarded: boolean) =>
    `<rect x="${x}" y="38" width="16" height="14" fill="${lit ? '#f2c46b' : '#2a2230'}" opacity="${lit ? 0.9 : 1}"/>` +
    (boarded
      ? `<path d="M${x - 1} 40 L${x + 17} 50 M${x - 1} 48 L${x + 17} 42" stroke="#8a6a45" stroke-width="3"/>`
      : '');
  return `<svg viewBox="0 0 120 90">
  <rect x="0" y="0" width="120" height="90" fill="#141a2e"/><circle cx="100" cy="16" r="8" fill="#e9e3c9"/>
  <rect x="18" y="26" width="84" height="60" fill="${wall}" stroke="#2a2230"/><path d="M14 28 L60 8 L106 28Z" fill="${c > 0.3 ? '#4a3a52' : '#3a2f3f'}"/>
  ${window(28, c > 0.15, c < 0.15)}${window(76, true, false)}${c > 0.4 ? window(52, true, false).replace('y="38"', 'y="34"') : ''}
  <rect x="52" y="60" width="16" height="26" fill="${c > 0.6 ? '#6b2a2a' : '#2a2230'}"/>
  ${c > 0.75 ? '<text x="60" y="22" text-anchor="middle" font-size="8" fill="#ff5ad1" font-family="Trebuchet MS, sans-serif" style="filter:drop-shadow(0 0 2px #ff5ad1)">LEO’S</text>' : '<rect x="34" y="18" width="30" height="7" fill="#6b4b2a" transform="rotate(-6 49 21)"/>'}
  ${mailbox ? '<rect x="76" y="70" width="8" height="8" fill="#a83232"/><rect x="79" y="78" width="2" height="8" fill="#555"/>' : ''}
</svg>`;
}
