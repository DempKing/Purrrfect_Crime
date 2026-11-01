// After a heist: the calling card, the morning paper and the heist report.
import { MASTHEAD, type Paper } from '../../meta/newspaper';
import { type LootCategory, the } from '../../core/level';
import { lootPictureUrl } from '../../render/characters';
import { fenceRate, type HeistReport, playerLevel, type Profile, xpForLevel } from '../../meta/profile';
import { rivalRooftop, rooftopPicture } from '../pictures';
import { RIVALS } from '../../core/game';
import { CARD_SVG, esc, money, on, sfx, show } from './common';

// The calling card and the paper

export function callingCard(done: () => void): void {
  show(
    `<div class="card-beat"><div class="calling-card">${CARD_SVG}</div><p>Leo leaves his calling card</p></div>`,
    'overlay dark',
  );
  setTimeout(done, 1900);
}
function photoSvg(centrepiece: boolean): string {
  return centrepiece
    ? `<svg viewBox="0 0 80 56"><rect width="80" height="56" fill="#cfc8b8"/><rect x="28" y="22" width="24" height="30" fill="#efe9da" stroke="#555"/><rect x="24" y="18" width="32" height="6" fill="#e2dccb" stroke="#555"/><rect x="33" y="11" width="14" height="8" fill="#fff" stroke="#222"/><circle cx="40" cy="15" r="2" fill="#a81b22"/></svg>`
    : `<svg viewBox="0 0 80 56"><rect width="80" height="56" fill="#cfc8b8"/><rect x="20" y="30" width="40" height="22" fill="#8a7a66" stroke="#444"/><path d="M22 30 L22 12 L58 12 L58 30" fill="none" stroke="#666" stroke-dasharray="3 2"/><path d="M30 46 l4 -3 l2 4 M48 48 l3 -4 l3 3" stroke="#bcd" fill="none"/></svg>`;
}
export function newspaper(paper: Paper, spin: boolean, done: () => void, button = 'Continue'): void {
  const photos = paper.photos
    .map(
      (p) =>
        `<figure>${photoSvg(p.centrepiece)}<figcaption><b>${esc(p.name)}</b> · est. ${money(p.value)}<br>${esc(p.caption)}</figcaption></figure>`,
    )
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
  if (r.rival && !r.rival.won)
    return `<figure class="report-photo"><img src="${rivalRooftop(r.rival.id)}" alt=""><figcaption>${esc(RIVALS[r.rival.id].name)}, with the prize. Next time.</figcaption></figure>`;
  if (!prize) return '';
  return `<figure class="report-photo"><img src="${rooftopPicture(prize.name)}" alt=""><figcaption>Leo and ${the(esc(prize.name))}, on the rooftop</figcaption></figure>`;
}
/** Sounds for the screens; main.ts plugs the game's sound in. */

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
      ${r.rival ? `<p class="rival-line">${r.rival.caught ? `The guards caught ${esc(RIVALS[r.rival.id].name)}. One less thief in town.` : r.rival.won ? `You beat ${esc(RIVALS[r.rival.id].name)} to the prize.` : `${esc(RIVALS[r.rival.id].name)} got the centrepiece this time. Replay to take it yourself.`}</p>` : ''}
      ${r.ncWaiting ? '<p class="rival-line">You got out, but NightClaw is still waiting for you to find him. Creep up and tap him on the shoulder to finish it.</p>' : ''}
      ${r.finale ? '<p class="levelup-note">NightClaw’s collar has the top shelf of the Trophy Room to itself. It is not for sale.</p>' : ''}
      ${
        r.items.length
          ? `<div class="haul"><div class="haul-head">The haul <b>$<span id="haul">0</span></b></div><div class="evidence">${r.items.map((i) => `<figure class="loot-drop">${lootPic(i.name, i.category)}<figcaption>${esc(i.name)}<br><b>$${i.value.toLocaleString('en-US')}</b></figcaption></figure>`).join('')}</div>
        <p class="small">${r.items.length} piece${r.items.length === 1 ? '' : 's'} went to the stash${r.replay ? ', but this is a replay, so the fences call it hot and pay half' : ''}.</p></div>`
          : '<p>Nothing to sell this time.</p>'
      }
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
    const confetti = Array.from(
      { length: 28 },
      (_, i) =>
        `<i style="--a:${(i / 28) * 360}deg;--d:${60 + (i % 5) * 18}px;--c:${['#ffd23f', '#ff4d5e', '#1fc8b4', '#7b3fe4', '#3a6ff0'][i % 5]}"></i>`,
    ).join('');
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
      if (haulEl)
        tween(
          260,
          (k) => (haulEl.textContent = Math.round(from + (upTo - from) * k).toLocaleString('en-US')),
        );
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
  if (
    matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.body.classList.contains('reduce-motion')
  )
    finish();
}
