// The briefing before a heist: what the Planning Table knows about the job.
import { laserAxis, type LevelDef, parseLevel, the } from '../../core/level';
import type { Profile } from '../../meta/profile';
import { type RivalPlan, RIVALS } from '../../core/game';
import { allLoot } from '../../core/exhibits';
import { portrait } from '../pictures';
import { charImageUrl, lootPictureUrl } from '../../render/characters';
import { esc, on, show } from './common';

// The briefing: what the Planning Table knows

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
export function briefing(
  def: LevelDef,
  p: Profile,
  rival: RivalPlan | null,
  onStart: () => void,
  onBack: () => void,
  photo?: Promise<string>,
): void {
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
            : ((
                {
                  pillar: '#a9c2db',
                  stack: '#a9c2db',
                  exit: '#f0e442',
                  door: '#e9c46a',
                  marble: '#2d5f92',
                  keydoor: '#e9c46a',
                  vault: '#e9c46a',
                  glass: '#7fb0d8',
                  kennel: '#c9772f',
                  desk: '#a9c2db',
                  keycard: '#f0e442',
                  crate: '#c9a66b',
                  tidal: '#3f6f8e',
                  'belt-e': '#16385c',
                  'belt-w': '#16385c',
                  paint: '#e0314b',
                  gap: '#0f2a44',
                  wire: '#0f2a44',
                } as Record<string, string>
              )[t] ?? '#24538a');
        cells.push(`<rect x="${x * S}" y="${y * S}" width="${S}" height="${S}" fill="${fill}"/>`);
        if (level.ducts[y][x])
          cells.push(
            `<rect x="${x * S + 5}" y="${y * S + 5}" width="6" height="6" fill="none" stroke="#dce9f5" stroke-dasharray="2 1" opacity="0.8"/>`,
          );
        if (t === 'wire')
          cells.push(
            `<line x1="${x * S}" y1="${y * S + 8}" x2="${x * S + S}" y2="${y * S + 8}" stroke="#c8ccd8" stroke-width="1.5"/>`,
          );
        if (t === 'laser')
          cells.push(
            laserAxis(level, x, y) === 'x'
              ? `<line x1="${x * S}" y1="${y * S + 8}" x2="${x * S + S}" y2="${y * S + 8}" stroke="#ff2a2a" stroke-width="2"/>`
              : `<line x1="${x * S + 8}" y1="${y * S}" x2="${x * S + 8}" y2="${y * S + S}" stroke="#ff2a2a" stroke-width="2"/>`,
          );
        if (t === 'panel' || t === 'fuse')
          cells.push(
            `<rect x="${x * S + 4}" y="${y * S + 4}" width="8" height="8" fill="${t === 'panel' ? '#55d6c2' : '#f2c94c'}"/>`,
          );
      }
  const marks: string[] = [];
  if (tier >= 1) {
    for (const l of allLoot(def))
      marks.push(
        def.map[l.at.y][l.at.x] === 'G'
          ? `<circle cx="${l.at.x * S + 8}" cy="${l.at.y * S + 8}" r="11" fill="none" stroke="#e0314b" stroke-width="2.5"/><circle cx="${l.at.x * S + 8}" cy="${l.at.y * S + 8}" r="4" fill="#f0e442"/>`
          : `<circle cx="${l.at.x * S + 8}" cy="${l.at.y * S + 8}" r="3.5" fill="#f7f1e0"/>`,
      );
    marks.push(
      `<text x="${level.start.x * S + 8}" y="${level.start.y * S + 13}" text-anchor="middle" font-size="13" font-weight="700" fill="#f0e442">L</text>`,
    );
  }
  if (tier >= 2) {
    for (const lamp of level.lamps)
      marks.push(
        `<circle cx="${lamp.at.x * S + 8}" cy="${lamp.at.y * S + 8}" r="${lamp.radius * S}" fill="#ffd27a" opacity="0.12"/><circle cx="${lamp.at.x * S + 8}" cy="${lamp.at.y * S + 8}" r="3" fill="#ffd27a"/>`,
      );
    for (const c of level.cameras)
      marks.push(
        `<rect x="${c.at.x * S + 3}" y="${c.at.y * S + 3}" width="10" height="10" rx="2" fill="#c77dff"/>`,
      );
  }
  if (tier >= 3)
    for (const g of level.guards) {
      const pts = [g.start, ...g.route].map((q) => `${q.x * S + 8},${q.y * S + 8}`).join(' ');
      marks.push(
        `<polyline points="${pts}" fill="none" stroke="#ff8a5a" stroke-width="2" stroke-dasharray="4 3"/><circle cx="${g.start.x * S + 8}" cy="${g.start.y * S + 8}" r="4" fill="#ff8a5a"/>`,
      );
    }
  const centre =
    def.loot.find((l) => level.plinth && l.at.x === level.plinth.x && l.at.y === level.plinth.y)?.name ??
    'prize';
  const entrance =
    rival && def.rivalEntrances ? def.rivalEntrances[rival.entrance % def.rivalEntrances.length] : null;
  if (rival && entrance && tier >= 2)
    marks.push(
      `<text x="${entrance.x * S + 8}" y="${entrance.y * S + 12}" text-anchor="middle" font-size="12" fill="#b05cff">R</text>`,
    );
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
      const art =
        kind === 'sniffer' ? 'dog' : kind === 'robo' ? 'robot' : kind === 'nightclaw' ? 'nightclaw' : 'guard';
      const route =
        tier >= 3
          ? `Walks a beat of ${g.route.length} stop${g.route.length === 1 ? '' : 's'}.`
          : 'Beat unknown: a better Planning Table would show it.';
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
