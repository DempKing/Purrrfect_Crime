// Between heists: the paper, the narrator, the city map, the lair and the title screen.
import { Container } from 'pixi.js';
import { CORNER_GALLERY } from '../levels/tutorial';
import {
  buyLair,
  completeHeist,
  deleteSlot,
  lastSlot,
  loadSlot,
  loadSlots,
  narratorBuysTutorialLoot,
  newProfile,
  sell,
} from '../meta/profile';
import * as screens from '../ui/screens';
import { type LevelDef, parseLevel } from '../core/level';
import { loadProps } from '../render/props';
import { loadCharacters, loadLootIcons } from '../render/characters';
import { loadSurfaces } from '../render/surfaces';
import { loadFlats } from '../render/flats';
import { newHeist } from '../core/game';
import { learn, perksFor, raise, upgrade } from '../meta/progression';
import { HeistView, type Overlay } from '../render/view';
import { project } from '../render/iso';
import { deliverLetters } from '../meta/letters';
import { DISTRICTS } from '../levels';
import { leaveHeist, rivalPlanFor, showReport, startHeist } from './turn';
import { game, JOBS } from './game';
import { award, changeSettings, persist, settings, sfx, sound, storage } from './common';
import { liveAlerts } from './notices';
import { app } from './camera';

// Between heists

export function goOn(): void {
  leaveHeist();
  if (!game.profile.tutorialDone) return startHeist(CORNER_GALLERY);
  if (!game.profile.narratorPaid) return narratorPays();
  if (!game.profile.lairOwned) return cityMap();
  showLair();
}
/** The end of the story: NightClaw's farewell, the title, the credits, and the morning paper. */
export function ending(r: ReturnType<typeof completeHeist>): void {
  const nc = { name: 'NightClaw', portrait: screens.NIGHTCLAW_SVG };
  screens.narratorScene(
    [
      '“Tap, tap.” He doesn’t jump. He turns round slowly, and for a long moment he just looks at you.',
      '“Do you know how long it has been since anyone crept up on me? Neither do I. Long enough to forget what it feels like.”',
      'He nods at what’s in your paw. “You found it. That collar is the only thing I never stole. I wore it when I was a kitten, before I was anybody. The tag says Midnight: that was my name, once.”',
      '“Keep it. You have earned it, and I have no more use for it. The city needs a thief who is better than its locks, and it has one now.”',
      'He lifts his hat. “Goodnight, Leo. Legendary suits you.” And he’s gone, out of the belfry window, into the dark.',
    ],
    'Legendary?',
    () =>
      screens.legendaryCard(() =>
        screens.credits(() => screens.newspaper(r.paper, true, () => showReport(r))),
      ),
    nc,
  );
}
function narratorPays(): void {
  leaveHeist();
  screens.narratorScene(
    [
      'Not bad for a first night, kid. Not bad at all.',
      "Now, nobody in this city will touch loot from a cat they've never heard of. So I'll buy the lot myself: the pearl, the brooch and the mouse. Call it an investment.",
      "Here: <b>500 Catnip</b>. Don't spend it on sardines.",
      'One more thing. A thief needs a headquarters, somewhere to plan, to stash the goods and to meet the right people. I know just the place.',
    ],
    'Show me',
    () => {
      narratorBuysTutorialLoot(game.profile, CORNER_GALLERY.id);
      persist();
      cityMap();
    },
  );
}
function cityMap(): void {
  leaveHeist();
  screens.cityMap(game.profile, () => {
    if (!buyLair(game.profile)) return;
    persist();
    screens.narratorScene(
      [
        "It's yours. Leaky roof, boarded windows, one light bulb. Home sweet home.",
        'The back room has a door onto the black market: sell your loot there for Catnip. The fences pay better as you make a name for yourself.',
        'Every heist makes the morning paper, and every paper keeps a tally of what you took. Start small: the Cobblestone Coin Museum, here in Old Town. Good luck, kid.',
      ],
      'Enter the lair',
      () => showLair(),
    );
  });
}
const photos = new Map<string, Promise<string>>();
/** A photo of a heist's building for the planning board: the game draws the level, from behind Leo, off screen. */
function levelPhoto(def: LevelDef): Promise<string> {
  const cached = photos.get(def.id);
  if (cached) return cached;
  const shot = (async () => {
    await Promise.all([loadProps(), loadCharacters(), loadSurfaces(), loadFlats(), loadLootIcons(def.loot)]);
    const lv = parseLevel(def);
    const st = newHeist(lv, perksFor(game.profile), null);
    const v = new HeistView();
    let best = 0;
    for (let k = 0; k < 4; k++)
      if (
        project({ angle: (k * Math.PI) / 2, cx: lv.w / 2, cy: lv.h / 2 }, st.leo.x + 0.5, st.leo.y + 0.5)
          .depth >
        project({ angle: (best * Math.PI) / 2, cx: lv.w / 2, cy: lv.h / 2 }, st.leo.x + 0.5, st.leo.y + 0.5)
          .depth
      )
        best = k;
    v.proj = { angle: (best * Math.PI) / 2, cx: lv.w / 2, cy: lv.h / 2 };
    v.time = 2;
    const actor = (x: number, y: number, facing: number) => ({ x: x + 0.5, y: y + 0.5, facing, bob: 0 });
    const none: Overlay = {
      reach1: new Set(),
      reach2: new Set(),
      vision: new Set(),
      cameraVision: new Set(),
      footprints: [],
      rivalPath: [],
      path: [],
      pathDanger: new Map(),
      hover: null,
      targets: new Set(),
      risky: new Map(),
      alerts: liveAlerts(),
    };
    v.draw(
      lv,
      st,
      none,
      actor(st.leo.x, st.leo.y, 2),
      st.guards.map((g) => actor(g.x, g.y, g.facing)),
      [],
      undefined,
    );
    const holder = new Container();
    holder.addChild(v.root);
    const b = holder.getLocalBounds();
    v.root.scale.set(Math.min(1, 900 / b.width));
    const url = await app.renderer.extract.base64({ target: holder, format: 'png' });
    holder.destroy({ children: true });
    return url;
  })();
  photos.set(def.id, shot);
  shot.catch(() => photos.delete(def.id));
  return shot;
}
function showLair(tab: screens.LairTab = 'heists'): void {
  sound.setScene(tab === 'market' ? 'market' : 'lair');
  leaveHeist();
  // NightClaw's letters wait at the door until they've been read.
  deliverLetters(game.profile);
  award();
  const unread = game.profile.letters.find((l) => !l.read);
  if (unread) {
    persist();
    sfx('chime');
    return screens.letter(unread, game.profile, () => {
      unread.read = true;
      persist();
      showLair(tab);
    });
  }
  screens.lair(
    game.profile,
    {
      jobs: JOBS,
      districts: DISTRICTS,
      onHeist: (def) => (
        sound.setScene('planning'),
        screens.briefing(
          def,
          game.profile,
          rivalPlanFor(def),
          () => startHeist(def),
          () => showLair(),
          levelPhoto(def),
        )
      ),
      onSell: (id) => {
        sell(game.profile, id);
        persist();
        showLair('market');
      },
      onSellAll: () => {
        for (const s of [...game.profile.stash]) sell(game.profile, s.id);
        persist();
        showLair('market');
      },
      onPaper: (i) =>
        screens.newspaper(game.profile.papers[i], false, () => showLair('papers'), 'Back to the lair'),
      onRaise: (id) => {
        raise(game.profile, id);
        persist();
        showLair('leo');
      },
      onLearn: (id) => {
        learn(game.profile, id);
        persist();
        showLair('leo');
      },
      onUpgrade: (id) => {
        upgrade(game.profile, id);
        persist();
        showLair('lair');
      },
      onLetter: (i) =>
        screens.letter(game.profile.letters[i], game.profile, () => showLair('lair'), 'Back to the lair'),
      onSettings: () => screens.settingsScreen(settings, changeSettings, () => showLair(tab)),
      onQuit: showTitle,
    },
    tab,
  );
}
export function quit(): void {
  if (!game.profile.lairOwned) return showTitle();
  showLair();
}
export function showTitle(): void {
  leaveHeist();
  sound.setScene('title');
  screens.titleScreen(loadSlots(storage()), {
    lastSlot: lastSlot(storage()),
    onPlay: (i) => {
      const p = loadSlot(storage(), i);
      if (!p) return showTitle();
      game.slot = i;
      game.profile = p;
      goOn();
    },
    onNew: (i) => {
      game.slot = i;
      game.profile = newProfile();
      persist();
      startHeist(CORNER_GALLERY);
    },
    onDelete: (i) => {
      deleteSlot(storage(), i);
      showTitle();
    },
    onSettings: () => screens.settingsScreen(settings, changeSettings, showTitle),
    onCredits: () => screens.credits(showTitle, true),
  });
}
