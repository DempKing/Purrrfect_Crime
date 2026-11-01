// The guards' turn, and starting and leaving a heist.
import { endTurn, type GuardStep, type RivalPlan } from '../core/game';
import { soundsInLog } from '../audio';
import { type LevelDef, parseLevel } from '../core/level';
import { CORNER_GALLERY } from '../levels/tutorial';
import { DISTRICTS } from '../levels';
import { completeHeist, rivalFor } from '../meta/profile';
import * as screens from '../ui/screens';
import { loadLootIcons } from '../render/characters';
import { closeLootMenu, toggleBag } from './loot';
import { game } from './game';
import { banner, caught, hide, say, updateHud } from './hud';
import { play, rival, type Segment, syncActors } from './actors';
import { $, anim, persist, settings, sfx, sound, tutorialUpdate } from './common';
import { showNotices } from './notices';
import { goOn } from './between';
import { cameraBehindLeo, view } from './camera';
import { restart } from './restart';

/** Ends Leo's turn: runs the guards and rival, then animates their moves. */
export function doEndTurn(): void {
  closeLootMenu();
  if (game.busy || game.state.status !== 'playing') return;
  game.selected = null;
  banner('Guards’ turn');
  // Run the rules for the guards' and rival's turn.
  const before = game.state.guards.map((g) => ({ x: g.x, y: g.y }));
  const alarmBefore = game.state.alarm !== null;
  const steps: GuardStep[] = endTurn(game.level, game.state);
  game.noisesSeen = 0;
  game.version++;
  // Turn their steps into animation segments.
  const last = before.map((p) => ({ ...p }));
  let rivalAt = { x: rival.x - 0.5, y: rival.y - 0.5 };
  const segs: Segment[] = steps.map((s) => {
    if (s.guard === -1) {
      // The rival's first step is their arrival: they appear rather than walk in.
      const from = game.rivalWasIn ? rivalAt : { x: s.to.x, y: s.to.y };
      if (!game.rivalWasIn && game.state.rival)
        window.setTimeout(() => banner(`${game.state.rival?.name ?? 'A rival'} is in the building!`), 300);
      game.rivalWasIn = true;
      rivalAt = { x: s.to.x, y: s.to.y };
      return {
        who: -1,
        from,
        to: { x: s.to.x, y: s.to.y },
        facing: s.to.facing,
        t: 0,
        dur: anim(0.16),
        gait: 'run',
      };
    }
    const from = last[s.guard];
    last[s.guard] = { x: s.to.x, y: s.to.y };
    const hurry = game.state.guards[s.guard]?.mode === 'searching';
    return {
      who: s.guard,
      from,
      to: { x: s.to.x, y: s.to.y },
      facing: s.to.facing,
      t: 0,
      dur: anim(hurry ? 0.17 : 0.22),
      gait: hurry ? 'run' : 'walk',
    };
  });
  game.busy = segs.length > 0;
  updateHud();
  sfx(...soundsInLog(game.state.log));
  const rivalAlarm = game.state.alarm !== null && !game.state.alarmByLeo && !alarmBefore;
  if (rivalAlarm)
    window.setTimeout(() => banner(`${game.state.alarmBy ?? 'A rival'} set off the alarm!`), 500);
  // After the animation: show what happened, then it's Leo's turn (or caught).
  play(segs, () => {
    syncActors();
    updateHud();
    if (game.state.log.length) say(game.state.log.join(' '));
    showNotices();
    tutorialUpdate();
    if (game.state.status === 'caught') return caught();
    updateHud();
    // Still asleep after a Cat Nap: the guards go again.
    if (game.state.ap <= 0) {
      banner('Zzz…');
      setTimeout(
        () => !game.busy && game.state.status === 'playing' && game.state.ap <= 0 && doEndTurn(),
        anim(700) + 50,
      );
      return;
    }
    banner(game.state.alarm !== null ? `Alarm! ${game.state.alarm} turns` : 'Your turn');
  });
}
/** Tonight's rival for a heist (none in the tutorial; rolled once and kept until played). */
export function rivalPlanFor(def: LevelDef): RivalPlan | null {
  if (def.id === CORNER_GALLERY.id) return null;
  const district = DISTRICTS.findIndex((d) => d.levels.includes(def));
  const plan = rivalFor(game.profile, def, Math.max(0, district));
  persist();
  return plan;
}
/** The heist report, with its own music. */
export function showReport(r: ReturnType<typeof completeHeist>): void {
  sound.setScene('report');
  screens.heistReport(r, game.profile, goOn);
}
/** Starts a heist: loads the level, rolls the rival, sets up the camera. */
export function startHeist(def: LevelDef): void {
  // Wait for the art if it hasn't finished loading.
  if (!game.artLoaded)
    return void game.artReady.then(() => {
      game.artLoaded = true;
      startHeist(def);
    });
  sound.setFinale(def.id.startsWith('nc-'));
  game.rivalPlan = rivalPlanFor(def);
  game.level = parseLevel(def);
  loadLootIcons(def.loot).catch((e) => console.error('Loot pictures failed', e));
  view.proj.cx = game.level.w / 2;
  view.proj.cy = game.level.h / 2;
  $('level-name').textContent = game.level.def.name;
  game.tutorial =
    def.id === CORNER_GALLERY.id && !game.profile.tutorialDone
      ? {
          step: 0,
          ev: { moved: false, dashed: false, rotated: false, onMarble: false },
          hidden: !settings.hints,
        }
      : null;
  screens.hideScreens();
  game.inHeist = true;
  document.body.classList.remove('meta');
  restart();
  cameraBehindLeo();
}
/** Leaves the heist for the screens between heists. */
export function leaveHeist(): void {
  $('leave-confirm').classList.add('hidden');
  toggleBag(false);
  closeLootMenu();
  game.inHeist = false;
  game.queue = [];
  game.busy = false;
  hide('caught');
  hide('help');
  game.targeting = null;
  $('narrator').classList.add('hidden');
  document.body.classList.add('meta');
  sound.setScene('lair');
}
