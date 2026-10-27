// The narrator's tutorial for the Corner Gallery: short steps, each waiting for the player to do the thing.
// Steps whose thing is optional (a dash, which is loud) also have a "Got it" button.
import type { State } from '../core/game';

/** What the player has done so far this heist, recorded by the controller. */
export interface TutorialEvents {
  moved: boolean;
  dashed: boolean;
  rotated: boolean;
  onMarble: boolean;
}

export interface TutorialStep {
  id: string;
  text: string;
  /** Show a "Got it" button: the step can be passed without doing it. */
  optional?: boolean;
  done: (s: State, ev: TutorialEvents) => boolean;
}

const inHallEast = (s: State) => s.layer === 'floor' && s.leo.y <= 4 && s.leo.x >= 16;
const pastCorridor = (s: State) => s.leo.y >= 5 && s.leo.x >= 14;
const inGallery = (s: State) => s.leo.x <= 8 && s.leo.y >= 6;

export const TUTORIAL: TutorialStep[] = [
  {
    id: 'move',
    text: "Evening, kid. Every turn you get two action points, the blue dots up top. Click a blue tile and you'll walk there for one of them.",
    done: (_, ev) => ev.moved,
  },
  {
    id: 'dash',
    text: "Yellow tiles cost both points: that's a dash. It gets you further, but it's loud, and any guard within four tiles will hear it. Save it for when nobody's near.",
    optional: true,
    done: (_, ev) => ev.dashed,
  },
  {
    id: 'camera',
    text: "Turn the view with Q and E, or the arrow buttons. Walls in your way drop down so you can always see yourself.",
    done: (_, ev) => ev.rotated,
  },
  {
    id: 'light',
    text: "That's Gus, the night guard. Red tiles are what he can see. Lamplight lets him see a long way, moonlight less, and in the dark he can barely see past his nose. The badge up top tells you how lit you are. Keep to the dark along the far wall and let him walk by.",
    done: (s) => inHallEast(s) || pastCorridor(s) || inGallery(s),
  },
  {
    id: 'noise',
    text: "Marble floors squeak. The rings show how far the sound carries. If Gus hears you he gets a yellow question mark and comes to look. Stand still in the dark until he gives up.",
    done: (s, ev) => (ev.onMarble && s.guards.every((g) => g.mode === 'patrol')) || pastCorridor(s) || inGallery(s),
  },
  {
    id: 'cameras',
    text: "There's a camera at the bottom of that corridor. Purple is what it sees, and if it sees you the alarm goes off. It turns every turn: wait until it looks away, then get through in one move.",
    done: (s) => (pastCorridor(s) && s.leo.y >= 8) || inGallery(s),
  },
  {
    id: 'vents',
    text: "West of here is a hallway full of lasers. Go under it. Stand on the grate, climb in with the button at the bottom, crawl along the duct and climb out in the gallery. Nobody can see you in a vent, but crawling is slow.",
    done: (s) => inGallery(s) && s.layer === 'floor',
  },
  {
    id: 'lockpick',
    text: "Stand next to a display case and pick the lock. It takes two goes, and it's quiet. Smashing the glass is quicker, but the whole building will hear it.",
    done: (s) => s.inventory.length > 0,
  },
  {
    id: 'loot',
    text: "Every piece takes up inventory space, and you've got six. Grab both small pieces and the Moonlit Pearl from its plinth. That's the centrepiece, the prize of the place.",
    optional: true,
    done: (s) => s.inventory.length >= 3,
  },
  {
    id: 'escape',
    text: "Now out through the side door, the green tile. You'll leave your calling card on the way out, so the papers know who to thank.",
    done: (s) => s.status === 'escaped',
  },
];

/** Moves past every step that's already done, from `from`. Returns the new step index. */
export function advance(s: State, ev: TutorialEvents, from: number): number {
  let i = from;
  while (i < TUTORIAL.length && TUTORIAL[i].done(s, ev)) i++;
  return i;
}
