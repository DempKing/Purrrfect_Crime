// window.__pc: lets the browser tests (and the Steam screenshot script) read the state, find tiles on screen,
// start levels and open the lair.
import { updateHud } from './hud';
import { lockpickTest } from '../ui/lockpick';
import { danger, key, leoReach, lootAt, moveAp } from '../core/game';
import { TUTORIAL } from '../meta/tutorial';
import { project } from '../render/iso';
import { leo, syncActors } from './actors';
import { view, world } from './camera';
import { act } from './clicks';
import { sound } from './common';
import { game, JOBS } from './game';
import { risk } from './preview';
import { startHeist } from './turn';
import { showLair } from './between';
import type { LairTab } from '../ui/screens';

/** Puts the test hook on window.__pc. */
export function installTestHook(): void {
  (window as unknown as { __pc: unknown }).__pc = {
    get state() {
      return game.state;
    },
    get busy() {
      return game.busy;
    },
    get profile() {
      return game.profile;
    },
    get inHeist() {
      return game.inHeist;
    },
    get tutorialStep() {
      return game.tutorial ? (TUTORIAL[game.tutorial.step]?.id ?? 'done') : null;
    },
    startHeist: (id: string) => startHeist(JOBS.find((j) => j.id === id)!),
    /** Opens the lair on a tab (for screenshots: set up the profile first). */
    lair: (tab: LairTab = 'heists') => showLair(tab),
    levels: JOBS.map((j) => ({ id: j.id, challenge: !!j.challenge, finale: !!j.finale })),
    /** What ending the turn on a tile would bring (once worked out), for the tests. */
    riskAt: (x: number, y: number) => risk.get(key(x, y)),
    /** After a test changes the state directly: work out reach and the rest again. */
    refresh: () => {
      game.version++;
      syncActors();
      updateHud();
    },
    lootIndexAt: (x: number, y: number) => lootAt(game.level, x, y),
    /** Clicks a tile, as the mouse would (without having to find it on screen). */
    act: (x: number, y: number) => act({ x, y }),
    get music() {
      return sound.nowPlaying;
    },
    get slot() {
      return game.slot;
    },
    get targeting() {
      return game.targeting;
    },
    screenOf: (x: number, y: number) => world.toGlobal(project(view.proj, x + 0.5, y + 0.5)),
    /** Lock picking minigame result to use without playing it ('hit', 'slip'), or null to play it. */
    set autoPick(v: 'hit' | 'slip' | null) {
      lockpickTest.auto = v;
    },
    set slowMotion(k: number) {
      game.slowMotion = k;
    },
    /** Where Leo is drawn right now, mid-step included. */
    leoOnScreen: () => world.toGlobal(project(view.proj, leo.x, leo.y)),
    /** A tile Leo can reach this turn where he'd be caught or set off the alarm. */
    dangerTile: () => {
      for (const [k, cost] of leoReach(game.level, game.state).cost) {
        const [x, y] = k.split(',').map(Number);
        if (
          cost > 0 &&
          moveAp(game.state, cost) <= game.state.ap &&
          danger(game.level, game.state, { x, y }) === 2
        )
          return { x, y };
      }
      return null;
    },
  };
}
