// Running Leo's actions and aiming gadgets.
import {
  abilities,
  type Ability,
  type Action,
  doAction,
  faceToward,
  key,
  LOCK_SLIP_NOISE,
  VAULT_DIALS,
  tileNow,
  useAbility,
} from '../core/game';
import type { Sfx } from '../audio';
import type { Point } from '../core/level';
import { game } from './game';
import { say, updateHud } from './hud';
import { confirmLeave, floatText, leavingWithoutTap, shake } from './moves';
import { anim, settings, sfx } from './common';
import { LOCK_FEEL, type LockKind, playLockpick } from '../ui/lockpick';
import { leo, play } from './actors';
import { afterLeoActs } from './notices';

/** How many goes each kind of lock takes (one pin per go). */
function pinsNeeded(kind: LockKind): number {
  const p = game.state.perks;
  return kind === 'pick-door'
    ? p.doorPicks
    : kind === 'pick-case'
      ? p.casePicks
      : kind === 'crack-safe'
        ? p.safeCracks
        : VAULT_DIALS;
}

/** Runs one of Leo's actions, with its sound and effects. Locks go through the lock picking minigame first. */
export function runAction(a: Action): void {
  if (game.busy || game.state.status !== 'playing') return;
  if (a.blocked) return say(a.blocked);
  if (a.kind in LOCK_FEEL && settings.lockpickGame) {
    const kind = a.kind as LockKind;
    game.busy = true; // nothing else happens while the lock is open
    void playLockpick({
      kind,
      pinsDone: game.state.picks[key(a.at.x, a.at.y)] ?? 0,
      pinsNeeded: pinsNeeded(kind),
      speedMult: game.state.perks.lockSpeed,
      noiseTiles: Math.round(LOCK_SLIP_NOISE[kind] * game.state.perks.noise),
      confirmKeys: settings.keys.confirm,
      confirmButtons: settings.pad.confirm,
      cancelButtons: settings.pad.cancel,
      reduceMotion: settings.reduceMotion,
      sound: (n) => sfx(n === 'pin' ? 'pick' : n === 'slip' ? 'clank' : 'tick'),
    }).then((res) => {
      game.busy = false;
      if (res !== 'cancel') performAction(a, res === 'slip');
      else updateHud();
    });
    return;
  }
  performAction(a, false);
}

/** Does the action and shows what came of it. `slipped`: the lock picking minigame was missed. */
function performAction(a: Action, slipped: boolean): void {
  game.state.log = [];
  const invBefore = [...game.state.inventory];
  if (!doAction(game.level, game.state, a.kind, a.at, { slipped }))
    return say('Leo can’t do that right now.');
  if (slipped) {
    floatText(a.at, 'CLANK!', 'red');
    shake();
  }
  // Show the payoff where it happened: loot value, CRASH, click...
  for (const li of game.state.inventory.filter((i) => !invBefore.includes(i))) {
    const l = game.level.def.loot[li];
    const center = !!game.level.plinth && l.at.x === game.level.plinth.x && l.at.y === game.level.plinth.y;
    floatText(l.at, `+$${l.value.toLocaleString('en-US')}`, center ? 'big' : '');
    sfx('coin');
  }
  if (a.kind === 'smash-case') {
    floatText(a.at, 'CRASH!', 'red');
    shake();
  } else if (
    !slipped &&
    (a.kind === 'pick-case' || a.kind === 'pick-door' || a.kind === 'crack-safe') &&
    game.state.inventory.length === invBefore.length
  )
    floatText(a.at, a.kind === 'crack-safe' ? 'clunk…' : 'click…', 'small');
  // The action's sound.
  const actionSound: Partial<Record<Action['kind'], Sfx>> = {
    'pick-case': 'pick',
    'pick-door': 'pick',
    take: 'take',
    'crack-safe': 'dials',
    'swipe-card': 'beep',
    'read-notes': 'click',
    'turn-dials': 'dials',
    lights: 'click',
    panel: 'click',
    fuse: 'click',
    'enter-vent': 'hatch',
    'exit-vent': 'hatch',
    'climb-up': 'door',
    'climb-down': 'door',
    drop: 'door',
    tap: 'tap',
  };
  let snd = actionSound[a.kind];
  // A lock opening gets its own sound.
  const opened =
    game.state.inventory.length > invBefore.length ||
    (a.kind === 'pick-door' && tileNow(game.level, game.state, a.at.x, a.at.y) !== 'door');
  if (opened && (a.kind === 'pick-door' || a.kind === 'pick-case')) snd = 'unlock';
  if (opened && a.kind === 'crack-safe') snd = 'safe-open';
  if (snd && !slipped) sfx(snd);
  if (
    a.kind !== 'enter-vent' &&
    a.kind !== 'exit-vent' &&
    a.kind !== 'climb-up' &&
    a.kind !== 'climb-down' &&
    a.kind !== 'drop'
  )
    leo.work = 1;
  if (game.state.inventory.length && a.kind !== 'take' && /^Got /.test(game.state.log.join(' '))) sfx('take');
  game.selected = null;
  game.version++;
  afterLeoActs();
  if (a.at.x !== game.state.leo.x || a.at.y !== game.state.leo.y)
    leo.facing = faceToward(game.state.leo, a.at);
}
/** Starts aiming a gadget (or uses it straight away if it needs no target). */
export function startAbility(kind: Ability): void {
  if (game.busy || game.state.status !== 'playing') return;
  if (game.targeting === kind) return cancelTargeting();
  const a = abilities(game.level, game.state).find((x) => x.kind === kind);
  if (!a) return;
  if (a.blocked) return say(a.blocked);
  if (a.target === 'self') return runAbility(kind);
  game.targeting = kind;
  game.selected = null;
  say(
    a.target === 'camera'
      ? `${a.name}: click a camera within reach. Esc to cancel.`
      : `${a.name}: click one of the highlighted tiles. Esc to cancel.`,
  );
  updateHud();
}
/** Stops aiming a gadget. */
export function cancelTargeting(): void {
  game.targeting = null;
  say('');
  updateHud();
}
/** Uses a gadget or skill, on `at` if it needs a target. */
export function runAbility(kind: Ability, at?: Point): void {
  if (kind === 'pounce' && at && leavingWithoutTap(at)) return confirmLeave(() => runAbility(kind, at));
  const from = { ...game.state.leo };
  game.state.log = [];
  game.targeting = null;
  if (!useAbility(game.level, game.state, kind, at)) {
    updateHud();
    return say('Leo can’t do that right now.');
  }
  game.selected = null;
  game.version++;
  sfx(kind === 'bottle-cap' ? 'clink' : kind === 'pounce' ? 'pounce' : kind === 'smoke' ? 'whoosh' : 'beep');
  if (kind === 'pounce')
    return play(
      [
        {
          who: 'leo',
          from,
          to: { ...game.state.leo },
          facing: faceToward(from, game.state.leo),
          t: 0,
          dur: anim(0.35),
          leap: true,
        },
      ],
      afterLeoActs,
    );
  afterLeoActs();
  if (at) leo.facing = faceToward(game.state.leo, at);
}
