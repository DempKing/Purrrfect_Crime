// The shape of a heist in progress (State, guards, cameras, rivals) and newHeist() to start one.
import type { GuardKind, Level, Point } from './level';
import { type Ability, AP_PER_TURN, BASE_PERKS, type Perks } from './constants';
import { faceToward } from './sight';

// ---------------------------------------------------------------------------------------------
// Rival thieves

export type RivalId = 'mittens' | 'luna' | 'sammy' | 'paws';
export const RIVALS: Record<
  RivalId,
  { name: string; speed: number; hello: string; beaten: string; won: string }
> = {
  mittens: {
    name: 'Mischief Mittens',
    speed: 4,
    hello: 'Mischief Mittens tumbles in: “Ooh, a tuxedo! Let’s make some noise, shall we?”',
    beaten: 'Mischief Mittens hisses, knocks over a vase on principle, and is gone.',
    won: 'Mischief Mittens cackles off into the night with the prize.',
  },
  luna: {
    name: 'Luna Luck',
    speed: 6,
    hello: 'Luna Luck drops in without a sound: “Evening, Tuxedo. Try to keep up.”',
    beaten: 'Luna Luck tips an imaginary hat: “Lucky you. Next time.” She’s gone.',
    won: 'Luna Luck slips away with the prize. Of course she does.',
  },
  sammy: {
    name: 'Sammy Swipes',
    speed: 3,
    hello: 'Sammy Swipes squeezes in, pockets already clinking: “Don’t mind me, just browsing.”',
    beaten: 'Sammy Swipes grumbles and wriggles back out the way he came.',
    won: 'Sammy Swipes waddles off with the prize, and probably your spare change.',
  },
  paws: {
    name: 'Professor Paws',
    speed: 4,
    hello: 'Professor Paws lets himself in and adjusts his spectacles: “Ah. The amateur.”',
    beaten: 'Professor Paws makes a note in his little book and departs.',
    won: 'Professor Paws leaves with the prize, locking up neatly behind himself.',
  },
};
/** Which rival is coming tonight, when, and by which way in (an index into the level's rival entrances). */
export interface RivalPlan {
  id: RivalId;
  arrive: number;
  entrance: number;
}
export interface Rival {
  id: RivalId;
  name: string;
  x: number;
  y: number;
  facing: number;
  arrive: number;
  entrance: Point;
  phase: 'waiting' | 'in' | 'leaving' | 'gone';
  prize: boolean;
  alarmed: boolean; // Mittens has set off her alarm
  /** Collared by a guard: out of the heist, and whatever they'd taken goes back. */
  caught: boolean;
  caughtBy: string | null;
  /** Turns spent waiting for a way past the guards; after four they risk it. */
  waited?: number;
}
/** Unlimited uses, while Leo has the skill. */
export const UNLIMITED = 99;
/** Eight facings, clockwise from east. */
export const DIRS: Point[] = [
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
];
export type Light = 0 | 1 | 2;
 // dark, dim, lit
/** Where Leo is: on the floor, in a vent, or up in the rafters. Nobody sees him in the last two. */
export type Layer = 'floor' | 'vent' | 'rafter';
export type GuardMode = 'patrol' | 'suspicious' | 'searching';
export interface Guard {
  name: string;
  kind: GuardKind;
  asleep: boolean; // a sleepy guard at his post
  x: number;
  y: number;
  facing: number; // index into DIRS
  route: Point[];
  target: number; // index of the waypoint being walked to
  mode: GuardMode;
  /** 0: hasn't seen Leo. 1: glimpsed something; any further sighting is a catch. */
  meter: number;
  point: Point | null; // where he's going to look
  look: number; // turns left looking around at the point
  noticed: string[]; // disturbances he has already reacted to
}
export interface Camera {
  at: Point;
  sweep: number[];
  idx: number;
  range: number;
  offTurns: number; // looped or knocked out for this many more turns
}
export type Status = 'playing' | 'caught' | 'escaped';
export interface Noise {
  x: number;
  y: number;
  r: number;
}
/**
 * Something Leo should know about: who caught or spotted him, what set off an alarm, which loot was noticed missing.
 * `from` is where the guard or camera was, `at` the tile it was about (Leo, or the empty display).
 */
export interface Notice {
  kind: 'caught' | 'spotted' | 'alarm' | 'missing';
  who: string;
  from: Point | null;
  at: Point;
  /** A word or two to pop up over the spot. */
  label: string;
}
export interface State {
  leo: Point;
  layer: Layer;
  ap: number;
  turn: number;
  guards: Guard[];
  cameras: Camera[];
  status: Status;
  caughtBy: string | null;
  caughtWhy: string | null;
  /** What went wrong this step or turn, and where, so the player can see who noticed what (cleared by the UI). */
  notices: Notice[];
  inventory: number[]; // indexes into level.def.loot
  smashed: string[]; // cases whose glass is broken
  openDoors: string[];
  picks: Record<string, number>; // lock progress per tile
  camerasOff: boolean;
  lasersOff: boolean;
  alarm: number | null; // turns to lockdown
  /** For the stealth bonuses and the newspaper: was Leo ever glimpsed or filmed, did an alarm ever go off. */
  seen: boolean;
  alarmRaised: boolean;
  /** Whether the alarm ringing now is Leo's doing (if it isn't, a lockdown doesn't end the heist). */
  alarmByLeo: boolean;
  /** Who set off the alarm ringing now, when it wasn't Leo (a rival's name). */
  alarmBy: string | null;
  /** Locked down by somebody else's alarm: the exits are sealed until the rival is caught or gone. */
  lockdown: boolean;
  /** Turns left on a lockdown with no rival in the building to catch. */
  lockdownTurns: number;
  perks: Perks;
  charges: Partial<Record<Ability, number>>; // left this heist
  used: { ghostStep: boolean; vanish: boolean; laserMirror: boolean };
  smoke: { x: number; y: number; turns: number }[]; // smoke pellets: 3x3 clouds that block sight
  decoys: Point[]; // calling cards left as decoys
  lasersOffTurns: number; // lasers cut for a while (Fuse Kit, EMP Collar)
  napTurns: number; // Cat Nap: guards can't see Leo for this many of their turns
  rival: Rival | null;
  rivalLoot: number[]; // loot a rival has taken (the centrepiece, or whatever Sammy pocketed)
  /** Loot Leo has put down to make room: lying on the floor where he left it, to pick up again. */
  dropped: { li: number; x: number; y: number }[];
  rivalBeaten: boolean; // Leo took the centrepiece while a rival was after it
  /** Who has the level's keycard: nobody yet, Leo, or a rival who swiped it. */
  card: 'leo' | 'rival' | null;
  combination: boolean; // Leo has read the vault's combination
  tagged: boolean; // the finale: Leo crept up on NightClaw and tapped him on the shoulder
  lampsOff: number[]; // lamps switched off at a light switch (indexes into the level's lamps)
  wetPaws: number; // steps of paw prints still to leave, after walking through wet paint
  prints: { x: number; y: number; turns: number }[]; // paw prints, drying
  noises: Noise[]; // made this turn, for drawing
  log: string[]; // what just happened, for the HUD
}
export const key = (x: number, y: number) => `${x},${y}`;
export function newHeist(level: Level, perks: Perks = BASE_PERKS, rival: RivalPlan | null = null): State {
  const entrance = rival
    ? level.def.rivalEntrances?.[rival.entrance % (level.def.rivalEntrances?.length || 1)]
    : undefined;
  return {
    leo: { ...level.start },
    layer: 'floor',
    ap: AP_PER_TURN,
    turn: 1,
    guards: level.guards.map((g) => ({
      name: g.name,
      kind: g.kind ?? 'watch',
      asleep: g.kind === 'sleepy',
      x: g.start.x,
      y: g.start.y,
      facing: faceToward(g.start, g.route[0]),
      route: g.kind === 'sleepy' ? [{ ...g.start }] : g.route.map((p) => ({ ...p })),
      target: 0,
      mode: 'patrol',
      meter: 0,
      point: null,
      look: 0,
      noticed: [],
    })),
    cameras: level.cameras.map((c) => ({
      at: { ...c.at },
      sweep: [...c.sweep],
      idx: 0,
      range: c.range ?? 5,
      offTurns: 0,
    })),
    status: 'playing',
    caughtBy: null,
    caughtWhy: null,
    notices: [],
    inventory: [],
    smashed: [],
    openDoors: [],
    picks: {},
    camerasOff: false,
    lasersOff: false,
    alarm: null,
    seen: false,
    alarmRaised: false,
    alarmByLeo: false,
    alarmBy: null,
    lockdown: false,
    lockdownTurns: 0,
    perks: structuredClone(perks),
    charges: { ...perks.charges },
    used: { ghostStep: false, vanish: false, laserMirror: false },
    smoke: [],
    decoys: [],
    lasersOffTurns: 0,
    napTurns: 0,
    rival:
      rival && entrance && level.plinth
        ? {
            id: rival.id,
            name: RIVALS[rival.id].name,
            x: entrance.x,
            y: entrance.y,
            facing: 0,
            arrive: rival.arrive,
            entrance: { ...entrance },
            phase: 'waiting',
            prize: false,
            alarmed: false,
            caught: false,
            caughtBy: null,
          }
        : null,
    rivalLoot: [],
    dropped: [],
    rivalBeaten: false,
    card: null,
    combination: false,
    tagged: false,
    lampsOff: [],
    wetPaws: 0,
    prints: [],
    noises: [],
    log: [],
  };
}
