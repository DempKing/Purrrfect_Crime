// The game's changing state (the heist being played, animation, camera, input) in one shared object.
import { type Level, type LevelDef, parseLevel, type Point } from '../core/level';
import { ALL_LEVELS } from '../levels';
import { type Ability, leoReach, newHeist, type Notice, type RivalPlan, type State } from '../core/game';
import { newProfile, type Profile } from '../meta/profile';
import type { TutorialEvents } from '../meta/tutorial';
import type { Actor, Ripple } from '../render/view';
import { CORNER_GALLERY } from '../levels/tutorial';
import type { Segment } from './actors';

/** Heists on offer at the lair, in order. The tutorial can be replayed like any other. */
export const JOBS: LevelDef[] = ALL_LEVELS;
// The game's changing state

/** Camera zoom: where it starts and how far it goes. */
export const ZOOM_START = 1.9;
export const ZOOM_MAX = 3;
/** Everything about the running game that changes as it's played, in one place. */
export interface Game {
  // The heist being played and the save it belongs to.
  level: Level;
  state: State;
  inHeist: boolean;
  slot: number; // which save slot
  profile: Profile;
  tutorial: { step: number; ev: TutorialEvents; hidden: boolean } | null;
  rivalPlan: RivalPlan | null; // tonight's rival for this heist, if any
  rivalWasIn: boolean; // the rival has already arrived

  // Animation.
  slowMotion: number; // the browser tests slow animations down to catch them mid-step
  guards: Actor[]; // how each guard is drawn (smooth positions between tiles)
  queue: Segment[]; // moves waiting to be animated
  busy: boolean; // an animation is playing, so input waits
  afterAnim: (() => void) | null; // what to do once the queue is done
  ripples: Ripple[]; // noise rings on the floor
  noisesSeen: number;

  // Camera.
  targetAngle: number; // the angle the camera is turning to
  zoom: number;
  zoomNow: number; // eases towards zoom
  focus: { x: number; y: number } | null; // the point the camera looks at, easing after Leo

  // Input and the preview of a move.
  hover: Point | null; // tile under the mouse
  selected: Point | null; // keyboard/controller cursor (touch: first tap previews)
  version: number; // bumped whenever the state changes, so cached work is redone
  cache: {
    v: number;
    reach: ReturnType<typeof leoReach>;
    vision: Set<string>;
    cameraVision: Set<string>;
    footprints: Point[];
    rivalPath: Point[];
  } | null;
  riskVersion: number; // which version the danger marks were worked out for
  riskQueue: (Point & { ends: boolean })[]; // tiles still to check for danger
  targeting: Ability | null; // the gadget being aimed
  lootMenu: Point | null; // the loot tag that's open
  lootChoices: (() => void)[]; // its buttons, for the number keys
  leaveOk: boolean; // the player said yes to leaving the lair without tapping NightClaw
  lastHaul: number;
  alerts: { n: Notice; until: number }[]; // who-noticed-what markers on the map
  restartArmed: number; // time of the first Restart press (it takes two)
  bannerTimer: number;

  // Art loading in the background.
  artReady: Promise<void>;
  artLoaded: boolean;
}
const startLevel = parseLevel(CORNER_GALLERY);
export const game: Game = {
  level: startLevel,
  state: newHeist(startLevel),
  inHeist: false,
  slot: 0,
  profile: newProfile(),
  tutorial: null,
  rivalPlan: null,
  rivalWasIn: false,
  slowMotion: 1,
  guards: [],
  queue: [],
  busy: false,
  afterAnim: null,
  ripples: [],
  noisesSeen: 0,
  targetAngle: 0,
  zoom: ZOOM_START,
  zoomNow: ZOOM_START,
  focus: null,
  hover: null,
  selected: null,
  version: 0,
  cache: null,
  riskVersion: -1,
  riskQueue: [],
  targeting: null,
  lootMenu: null,
  lootChoices: [],
  leaveOk: false,
  lastHaul: 0,
  alerts: [],
  restartArmed: 0,
  bannerTimer: 0,
  artReady: Promise.resolve(),
  artLoaded: false,
};
