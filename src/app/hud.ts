// The HUD: messages, banners, the status card, and the caught and escaped screens.
import {
  abilities,
  actionsHere,
  AP_PER_TURN,
  flooded,
  hiddenAt,
  inventoryUsed,
  inventoryValue,
  key,
  lightNow,
  moveAp,
  tideTurnsLeft,
} from '../core/game';
import { type Point, the } from '../core/level';
import type { Tension } from '../audio';
import { ABILITY_ICONS } from '../ui/pictures';
import { completeHeist } from '../meta/profile';
import * as screens from '../ui/screens';
import { project, screenDir } from '../render/iso';
import { keyName, padName } from '../controls';
import { $, award, changeSettings, money, persist, settings, sfx, sound } from './common';
import { game } from './game';
import { renderBag } from './loot';
import { runAction, startAbility } from './actions';
import { leaveHeist, showReport } from './turn';
import { ending } from './between';
import { view, world } from './camera';
import { clickAction } from './clicks';
import { computed } from './preview';

// HUD

export function say(text: string): void {
  $('message').textContent = text;
}
/** A big message across the screen for a moment. */
export function banner(text: string): void {
  const b = $('banner');
  b.textContent = text;
  b.classList.add('show');
  clearTimeout(game.bannerTimer);
  game.bannerTimer = window.setTimeout(() => b.classList.remove('show'), 1100);
}
/** Shows an element by id. */
function show(id: string): void {
  $(id).classList.remove('hidden');
}
/** Hides an element by id. */
export function hide(id: string): void {
  $(id).classList.add('hidden');
}
const LIGHT_NAMES = ['In shadow', 'Dim light', 'In the light'];
/** Refreshes the HUD: turn, AP, light, bag, rival, alarm, and the action and gadget buttons. */
export function updateHud(): void {
  // Turn, action points and the bag.
  $('turn').textContent = String(game.state.turn);
  $('ap').innerHTML = Array.from(
    { length: AP_PER_TURN },
    (_, i) => `<span class="pip ${i < game.state.ap ? 'on' : ''}"></span>`,
  ).join('');
  const extras = [game.state.card === 'leo' ? 'keycard' : '', game.state.combination ? 'the combination' : '']
    .filter(Boolean)
    .join(', ');
  const haulNow = inventoryValue(game.level, game.state);
  $('inventory').innerHTML =
    `Inventory <b>${inventoryUsed(game.level, game.state)}/${game.state.perks.spaces}</b> · <span class="haul-now${haulNow > game.lastHaul ? ' bump' : ''}">${money(haulNow)}</span>${extras ? ` · ${extras}` : ''}`;
  game.lastHaul = haulNow;
  renderBag();
  // The rival line (arrival only shown early with a good Planning Table), plus tide and lockdown.
  const r = game.state.rival;
  const rl = $('rival');
  const prize =
    game.level.def.loot.find(
      (l) => game.level.plinth && l.at.x === game.level.plinth.x && l.at.y === game.level.plinth.y,
    )?.name ?? 'prize';
  const rivalText = !r
    ? ''
    : r.phase === 'waiting'
      ? game.profile.rooms.planning >= 2
        ? `${r.name} arrives on turn ${r.arrive}`
        : game.profile.rooms.planning >= 1
          ? `${r.name} is coming tonight`
          : ''
      : r.phase === 'in'
        ? `${r.name} is after ${the(prize)}!`
        : r.phase === 'leaving'
          ? `${r.name} has ${the(prize)} and is getting away`
          : game.state.rivalBeaten
            ? `You beat ${r.name} to it`
            : game.state.rivalLoot.length
              ? `${r.name} got away with ${the(prize)}`
              : `${r.name} has fled`;
  const lock =
    game.level.def.timeLock && game.state.turn < game.level.def.timeLock
      ? `Time lock opens on turn ${game.level.def.timeLock}`
      : '';
  const tide = game.level.def.tide
    ? `${flooded(game.level, game.state) ? 'High' : 'Low'} tide · it turns in ${tideTurnsLeft(game.level, game.state)} turn${tideTurnsLeft(game.level, game.state) === 1 ? '' : 's'}`
    : '';
  rl.textContent = [rivalText, tide, lock].filter(Boolean).join(' · ');
  rl.classList.toggle('hidden', !rivalText && !tide && !lock);
  // How lit Leo's tile is.
  const hidden = hiddenAt(game.level, game.state, game.state.leo);
  const l =
    game.state.layer !== 'floor' || hidden
      ? -1
      : lightNow(game.level, game.state, game.state.leo.x, game.state.leo.y);
  const li = $('light');
  li.textContent = hidden
    ? 'In a crate'
    : l < 0
      ? game.state.layer === 'vent'
        ? 'In the vents'
        : 'In the rafters'
      : LIGHT_NAMES[l];
  li.className = `light l${l < 0 ? 'v' : l}`;
  // Alarm / lockdown banner, and the music's tension.
  const al = $('alarm');
  if (game.state.lockdown && game.state.status === 'playing') {
    al.textContent = `LOCKDOWN · lie low: the exits open once the guards catch ${game.state.rival && (game.state.rival.phase === 'in' || game.state.rival.phase === 'leaving') ? game.state.rival.name : 'the intruder'}`;
    show('alarm');
  } else if (game.state.alarm !== null && game.state.status === 'playing') {
    al.textContent = game.state.alarmByLeo
      ? `ALARM · lockdown in ${game.state.alarm} turn${game.state.alarm === 1 ? '' : 's'}${game.state.camerasOff ? '' : ' · shut it off at the camera panel'}`
      : `ALARM · ${game.state.alarmBy ?? 'a rival'} set it off, not you · lie low and stay out of sight, and it won't be pinned on you · lockdown in ${game.state.alarm}`;
    show('alarm');
  } else hide('alarm');
  ($('end') as HTMLButtonElement).disabled = game.busy || game.state.status !== 'playing';
  const tension: Tension =
    game.state.status !== 'playing'
      ? 1
      : game.state.alarm !== null
        ? 3
        : game.state.guards.some((g) => !g.asleep && g.mode !== 'patrol')
          ? 2
          : 1;
  if (game.inHeist) sound.setTension(tension);

  // Gadgets and active skills, with what's left of each.
  const ab = $('abilities');
  const list = game.state.status === 'playing' ? abilities(game.level, game.state) : [];
  ab.innerHTML = '';
  for (const a of list) {
    const b = document.createElement('button');
    b.className = `ability${game.targeting === a.kind ? ' on' : ''}`;
    b.dataset.ability = a.kind;
    b.disabled = game.busy || (!!a.blocked && game.targeting !== a.kind);
    b.title = a.blocked ?? `${a.ap} action point`;
    const icon = ABILITY_ICONS[a.kind];
    b.innerHTML = `${icon ? `<img class="ab-icon" src="${icon}" alt="">` : ''}${a.name}${a.left < 99 ? ` <span class="count">×${a.left}</span>` : ''}`;
    b.addEventListener('click', () => startAbility(a.kind));
    ab.appendChild(b);
  }
  ab.classList.toggle('hidden', list.length === 0);

  // The action buttons for what Leo can do here.
  const bar = $('actions');
  const acts = game.busy ? [] : actionsHere(game.level, game.state);
  bar.innerHTML = '';
  acts.forEach((a, i) => {
    const b = document.createElement('button');
    b.className = `act${a.noise >= 4 ? ' loud' : ''}`;
    b.dataset.kind = a.kind;
    b.dataset.at = `${a.at.x},${a.at.y}`;
    b.disabled = !!a.blocked;
    b.title =
      a.blocked ??
      `${a.ap} action point${a.ap === 1 ? '' : 's'}${a.noise ? `, noise ${a.noise}` : ', silent'}`;
    b.innerHTML = `<span class="k">${i + 1}</span>${a.label}${a.noise ? ` <span class="noise">${'◉'.repeat(Math.min(3, Math.ceil(a.noise / 2)))}</span>` : ''}`;
    b.addEventListener('click', () => runAction(a));
    bar.appendChild(b);
  });
  bar.classList.toggle('hidden', acts.length === 0);
}
/** Leo was caught: shows who did it and the Busted card. */
export function caught(): void {
  sfx('caught');
  $('caught-who').textContent = game.state.caughtBy ?? 'A guard';
  say(
    `Caught by ${game.state.caughtBy ?? 'a guard'}${game.state.caughtWhy ? `: ${game.state.caughtWhy}` : ''}.`,
  );
  $('caught-why').textContent = game.state.caughtWhy
    ? `${game.state.caughtWhy[0].toUpperCase()}${game.state.caughtWhy.slice(1)}.`
    : '';
  // Wait a moment so the player sees where it happened.
  const done = game.state;
  setTimeout(() => game.state === done && show('caught'), 1700);
}
/** Leo got out: the report, then whatever comes next. */
export function escaped(): void {
  const done = game.state;
  setTimeout(() => {
    if (game.state !== done) return;
    leaveHeist();
    const report = () => {
      const r = completeHeist(game.profile, game.level, done);
      if (game.tutorial) game.profile.tutorialDone = true;
      game.tutorial = null;
      persist();
      award(r);
      sfx('whoosh');
      return r;
    };
    sfx('escape');
    if (game.level.def.finale && done.tagged && !game.profile.legendary) return ending(report());
    screens.callingCard(() => {
      const r = report();
      screens.newspaper(r.paper, true, () => showReport(r));
    });
  }, 500);
}
/** Moves the keyboard/controller cursor in a screen direction (picks the grid step that looks closest). */
export function moveCursor(sx: number, sy: number): void {
  if (game.busy || game.state.status !== 'playing') return;
  const from = game.selected ?? { ...game.state.leo };
  let best = { x: 0, y: 0 };
  let score = -Infinity;
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, -1],
    [1, -1],
    [-1, 1],
  ]) {
    const d = screenDir(view.proj, dx, dy);
    const len = Math.hypot(d.x, d.y) || 1;
    const sc = (d.x * sx + d.y * sy) / len;
    if (sc > score) {
      score = sc;
      best = { x: dx, y: dy };
    }
  }
  game.selected = {
    x: Math.min(game.level.w - 1, Math.max(0, from.x + best.x)),
    y: Math.min(game.level.h - 1, Math.max(0, from.y + best.y)),
  };
  const a = clickAction(game.selected);
  const cost = computed().reach.cost.get(key(game.selected.x, game.selected.y));
  const ok = document.body.classList.contains('pad')
    ? padName(settings.pad.confirm[0])
    : keyName(settings.keys.confirm[0]);
  say(
    a
      ? `${a.label}: press ${ok}.`
      : cost !== undefined && cost > 0
        ? `${ok}: move here (${moveAp(game.state, cost)} action point${moveAp(game.state, cost) === 1 ? '' : 's'}).`
        : 'Leo can’t get there this turn.',
  );
}
/** The settings, opened mid-heist: the heist waits underneath. */
export function openSettingsInHeist(): void {
  screens.settingsScreen(settings, changeSettings, () => screens.hideScreens());
}
/** Finale: a click on NightClaw's body counts as a click on his tile. */
export function nightClawUnder(cx: number, cy: number): Point | null {
  if (!game.inHeist || !game.level?.def.finale) return null;
  const nc = game.state.guards.find((g) => g.kind === 'nightclaw');
  if (!nc) return null;
  const feet = world.toGlobal(project(view.proj, nc.x + 0.5, nc.y + 0.5));
  const head = world.toGlobal(project(view.proj, nc.x + 0.5, nc.y + 0.5, 110));
  const half = Math.max(14, (feet.y - head.y) * 0.3);
  return Math.abs(cx - feet.x) < half && cy < feet.y + half * 0.6 && cy > head.y
    ? { x: nc.x, y: nc.y }
    : null;
}
