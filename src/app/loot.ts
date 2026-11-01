// The loot tag (what Leo can do with a piece of loot) and the bag (what he's carrying).
import type { Point } from '../core/level';
import {
  type Action,
  actionsHere,
  danger,
  dropLoot,
  inventoryUsed,
  inventoryValue,
  key,
  lootAt,
  lootGone,
  moveAp,
  type State,
  tileNow,
} from '../core/game';
import { lootPictureUrl } from '../render/characters';
import { project } from '../render/iso';
import { game } from './game';
import { computed } from './preview';
import { doThere, walkTo } from './moves';
import { $, sfx } from './common';
import { view, world } from './camera';
import { say, updateHud } from './hud';

// Loot: click it for what Leo can do

/** A camera panel or power box that's still on, which Leo can walk over to and use. */
export function boxHere(t: Point): 'panel' | 'fuse' | null {
  if (!game.level || !game.state || game.state.layer !== 'floor') return null;
  const tile = tileNow(game.level, game.state, t.x, t.y);
  if (tile === 'panel' && !game.state.camerasOff) return 'panel';
  if (tile === 'fuse' && !game.state.lasersOff) return 'fuse';
  return null;
}
/** Index of loot still on this tile, or null. */
export function lootHere(t: Point): number | null {
  if (!game.level || !game.state || game.state.layer !== 'floor') return null;
  const tile = tileNow(game.level, game.state, t.x, t.y);
  if (tile !== 'case' && tile !== 'plinth' && tile !== 'safe' && tile !== 'lamp') return null;
  const li = lootAt(game.level, t.x, t.y);
  return li >= 0 && !lootGone(game.state, li) ? li : null;
}
/** Where Leo would stand to work on a tile this turn (where he is, or the best spot beside it). */
export function standFor(target: Point): { at: Point; ap: number; danger: number } | null {
  const near = (p: Point) => Math.max(Math.abs(p.x - target.x), Math.abs(p.y - target.y)) === 1;
  if (near(game.state.leo)) return { at: { ...game.state.leo }, ap: 0, danger: 0 };
  const reach = computed().reach;
  let best: { at: Point; ap: number; d: number } | null = null;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const p = { x: target.x + dx, y: target.y + dy };
      const cost = reach.cost.get(key(p.x, p.y));
      if ((!dx && !dy) || cost === undefined) continue;
      const ap = moveAp(game.state, cost);
      if (ap >= game.state.ap) continue; // leave a point for the job itself
      const d = danger(game.level, game.state, p);
      // Prefer: not caught, then cheapest, then least noticed.
      if (
        !best ||
        (d < 2 && best.d === 2) ||
        ((d === 2) === (best.d === 2) && (ap < best.ap || (ap === best.ap && d < best.d)))
      )
        best = { at: p, ap, d };
    }
  return best && { at: best.at, ap: best.ap, danger: best.d };
}
/** The reachable tile closest to a target that's too far to work on this turn. */
function closerTo(target: Point): Point | null {
  let best: Point | null = null;
  let bd = Infinity;
  for (const [k, cost] of computed().reach.cost) {
    if (!cost || moveAp(game.state, cost) > game.state.ap) continue;
    const [x, y] = k.split(',').map(Number);
    if (danger(game.level, game.state, { x, y }) === 2) continue; // not into a guard's arms
    const d =
      Math.max(Math.abs(x - target.x), Math.abs(y - target.y)) * 10 +
      moveAp(game.state, cost) * 4 +
      danger(game.level, game.state, { x, y }) * 6;
    if (d < bd) {
      bd = d;
      best = { x, y };
    }
  }
  return best;
}
/** Shorter labels for actions on the loot tag. */
const VERBS: Partial<Record<Action['kind'], string>> = {
  take: 'Steal it',
  'pick-case': 'Pick the lock',
  'smash-case': 'Smash the glass',
  'crack-safe': 'Crack the safe',
};
/** A tag by the loot: what it is, and what Leo can do about it, with what each costs. */
export function openLootMenu(target: Point): void {
  const li = lootHere(target);
  if (li === null) return;
  const loot = game.level.def.loot[li];
  const stand = standFor(target);
  const choices: { label: string; detail: string; run?: () => void; blocked?: string; loud?: boolean }[] = [];
  if (stand) {
    const there = { ...game.state, leo: stand.at, ap: game.state.ap - stand.ap } as State;
    const walk = stand.ap ? `walk over (${stand.ap} AP), then ` : '';
    const warn =
      stand.danger === 2
        ? ' · a guard would catch him there'
        : stand.danger === 1
          ? ' · a guard would notice'
          : '';
    for (const a of actionsHere(game.level, there).filter(
      (x) => x.at.x === target.x && x.at.y === target.y,
    )) {
      const noise = a.noise >= 6 ? 'loud: guards will come running' : a.noise > 0 ? 'quiet' : 'silent';
      const k = key(target.x, target.y);
      const goes =
        a.kind === 'pick-case'
          ? game.state.perks.casePicks
          : a.kind === 'crack-safe'
            ? game.state.perks.safeCracks
            : 1;
      const steps = goes > 1 ? ` (${game.state.picks[k] ?? 0}/${goes})` : '';
      choices.push({
        label: (VERBS[a.kind] ?? a.label) + steps,
        detail: `${walk}${a.ap} AP${goes > 1 ? ' a go' : ''} · ${noise}${warn}`,
        blocked: a.blocked,
        loud: a.noise >= 6,
        run: () =>
          walkTo(stand.at, () => {
            doThere(target, a.kind);
            // Locks that take several goes: reopen the tag for the next go.
            if (
              lootHere(target) !== null &&
              game.state.status === 'playing' &&
              game.state.ap > 0 &&
              !game.busy
            )
              openLootMenu(target);
          }),
      });
      // The bag's full: offer to put something down to make room for this.
      if (a.blocked?.startsWith('No room')) {
        const used = inventoryUsed(game.level, game.state);
        for (const old of game.state.inventory) {
          const o = game.level.def.loot[old];
          if (used - o.space + loot.space > game.state.perks.spaces) continue;
          choices.push({
            label: `Swap: leave ${o.name}`,
            detail: `${walk}put it down, then ${(VERBS[a.kind] ?? a.label).toLowerCase()} · $${o.value.toLocaleString('en-US')} → $${loot.value.toLocaleString('en-US')}`,
            run: () =>
              walkTo(stand.at, () => {
                putDown(old);
                doThere(target, a.kind);
              }),
          });
        }
      }
    }
  } else {
    const closer = closerTo(target);
    if (closer)
      choices.push({
        label: 'Walk closer',
        detail: `${moveAp(game.state, computed().reach.cost.get(key(closer.x, closer.y)) ?? 0)} AP`,
        run: () => walkTo(closer),
      });
  }
  const pic = lootPictureUrl(loot.name, loot.category);
  const box = $('loot-menu');
  box.innerHTML = `<div class="lm-head">${pic ? `<img src="${pic}" alt="">` : ''}<div><b>${loot.name}</b><span>est. $${loot.value.toLocaleString('en-US')} · ${loot.space} space${loot.space === 1 ? '' : 's'}</span></div></div>
    ${stand ? '' : '<p class="lm-note">Too far to reach and work on this turn. Leo needs to get beside it with an action point to spare.</p>'}
    ${choices.map((c, i) => `<button data-i="${i}" class="${c.loud ? 'loud' : ''}" ${c.blocked || !c.run ? 'disabled' : ''}><span class="k">${c.run ? i + 1 : '·'}</span><span class="lm-label">${c.label}</span><small>${c.blocked ?? c.detail}</small></button>`).join('')}
    <button class="quiet lm-close">Never mind (Esc)</button>`;
  game.lootChoices = choices.map((c) => () => {
    if (c.blocked || !c.run) return;
    closeLootMenu();
    c.run();
  });
  box
    .querySelectorAll<HTMLButtonElement>('button[data-i]')
    .forEach((b) => b.addEventListener('click', () => game.lootChoices[Number(b.dataset.i)]?.()));
  box.querySelector('.lm-close')!.addEventListener('click', closeLootMenu);
  game.lootMenu = target;
  box.classList.remove('hidden');
  placeLootMenu();
  sfx('click');
}
/** Keeps the tag beside its loot (the camera may be moving), and on screen. */
export function placeLootMenu(): void {
  if (!game.lootMenu) return;
  const box = $('loot-menu');
  const p = world.toGlobal(project(view.proj, game.lootMenu.x + 0.5, game.lootMenu.y + 0.5, 50));
  const w = box.offsetWidth;
  const h = box.offsetHeight;
  const x = p.x + 34 + w > window.innerWidth - 8 ? p.x - 34 - w : p.x + 34;
  box.style.left = `${Math.max(8, x)}px`;
  box.style.top = `${Math.max(8, Math.min(window.innerHeight - h - 8, p.y - h / 2))}px`;
}
/** Closes the loot tag. */
export function closeLootMenu(): void {
  game.lootMenu = null;
  game.lootChoices = [];
  $('loot-menu').classList.add('hidden');
}
/** Puts a piece of loot down where Leo stands (free), and shows it. */
function putDown(li: number): void {
  game.state.log = [];
  if (!dropLoot(game.level, game.state, li)) return;
  sfx('take');
  game.version++;
  updateHud();
  say(game.state.log.join(' '));
  renderBag();
}
// The bag: what Leo's carrying

export function bagOpen(): boolean {
  return !$('bag').classList.contains('hidden');
}
/** Opens or closes the bag panel. */
export function toggleBag(open = !bagOpen()): void {
  $('bag').classList.toggle('hidden', !open);
  if (open) renderBag();
}
/** Fills the bag panel: each item with picture, value, size and a Put down button. */
export function renderBag(): void {
  if (!bagOpen() || !game.state) return;
  const used = inventoryUsed(game.level, game.state);
  const canDrop = game.state.status === 'playing' && game.state.layer === 'floor' && !game.busy;
  const box = $('bag');
  box.innerHTML = `<div class="bag-head"><b>Leo’s bag</b><span>${used} / ${game.state.perks.spaces} spaces · $${inventoryValue(game.level, game.state).toLocaleString('en-US')}</span></div>
    <div class="bag-slots" style="--n:${game.state.perks.spaces}">${Array.from({ length: game.state.perks.spaces }, (_, i) => `<i class="${i < used ? 'full' : ''}"></i>`).join('')}</div>
    ${
      game.state.inventory.length
        ? `<ul class="bag-items">${game.state.inventory
            .map((li) => {
              const l = game.level.def.loot[li];
              return `<li><img src="${lootPictureUrl(l.name, l.category)}" alt=""><div><b>${l.name}</b><span>$${l.value.toLocaleString('en-US')} · ${l.space} space${l.space === 1 ? '' : 's'}</span></div><button data-drop="${li}" ${canDrop ? '' : 'disabled'} title="${canDrop ? 'Put it down here, to make room' : 'Not from up here'}">Put down</button></li>`;
            })
            .join('')}</ul>`
        : '<p class="bag-empty">Empty. Go steal something.</p>'
    }
    ${game.state.dropped.length ? `<p class="bag-note">Left behind: ${game.state.dropped.map((d) => game.level.def.loot[d.li].name).join(', ')}. Walk back to pick it up (1 AP).</p>` : '<p class="bag-note">Putting something down is free. It stays where you leave it, to pick up later.</p>'}
    <button class="quiet bag-close">Close (I or Esc)</button>`;
  box
    .querySelectorAll<HTMLButtonElement>('[data-drop]')
    .forEach((b) => b.addEventListener('click', () => putDown(Number(b.dataset.drop))));
  box.querySelector('.bag-close')!.addEventListener('click', () => toggleBag(false));
}
