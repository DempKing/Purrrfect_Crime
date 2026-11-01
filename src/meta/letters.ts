// NightClaw's letters. Letters 1 and 2: after 10 heists and after selling 10,000 Catnip (either order).
// Letter 3: inside the challenge prize. Letter 4: when the challenge is done.
import type { LevelDef } from '../core/level';
import { ALL_LEVELS } from '../levels';
import type { Profile } from './profile';

export type LetterId = 1 | 2 | 3 | 4;

export interface Letter {
  id: LetterId;
  day: number;
  read: boolean;
}

/** What NightClaw dares Leo to steal in Letter 2, and where. */
export const CHALLENGE_ITEM = 'Midnight Music Box';
export const CHALLENGE_PLACE = 'the Midnight Museum';

export const TRIGGER_HEISTS = 10;
export const TRIGGER_SOLD = 10000;

/** The letters' titles and text. */
export const LETTERS: Record<LetterId, { title: string; body: string[] }> = {
  1: {
    title: 'A fan',
    body: [
      'Dear Mr Tuxedo,',
      'I have been watching your work, and I am becoming a fan of it. The calling card is a nice touch. A little showy, but so was I, once.',
      'Keep your paws light and your bow tie straight. I will be in touch.',
    ],
  },
  2: {
    title: 'A challenge',
    body: [
      'Mr Tuxedo,',
      `You are better than I expected. Let us find out whether you are as good as I hope. For one night only, ${CHALLENGE_PLACE} is open to you. Every lock, lens and laser in it was chosen by me.`,
      `In its vault sits the ${CHALLENGE_ITEM}. Bring it home, and open it.`,
    ],
  },
  3: {
    title: 'Inside the music box',
    body: [
      'So. You opened it.',
      'Yes, Leo: I am NightClaw. For a very long time I have been looking for a thief to match me, and I think I may have found one.',
      'Here is my challenge. Clear every heist in this city, and take every centerpiece in a flawless heist: never seen, no alarms. A centerpiece lost to a rival still counts once you have taken it back yourself.',
      'Do that, and I will write one last time.',
    ],
  },
  4: {
    title: 'An invitation',
    body: [
      'Leo,',
      'Every centerpiece in the city, and not one of them missed. I have not seen work like it since I was young, and I was very good.',
      'One test is left. My lair is in the old bell tower on Moon Street; the door will not be locked, but nothing else will be easy. In it is the thing I treasure most. Take it, and then come and find me. If I see you first, we will try again another night.',
      'I will be waiting.',
    ],
  },
};

/** The NightClaw Challenge: every centerpiece taken in a flawless heist. */
export const CHALLENGE_LEVELS: LevelDef[] = ALL_LEVELS.filter((l) => !l.challenge && !l.finale);

/** How many centerpieces have been taken flawlessly. */
export function challengeProgress(p: Profile): { done: number; of: number } {
  return {
    done: CHALLENGE_LEVELS.filter((l) => p.records[l.id]?.flawless).length,
    of: CHALLENGE_LEVELS.length,
  };
}

/** Is the NightClaw Challenge complete? */
export function challengeDone(p: Profile): boolean {
  const { done, of } = challengeProgress(p);
  return done === of;
}

/** Has this letter arrived? */
export const hasLetter = (p: Profile, id: LetterId) => p.letters.some((l) => l.id === id);

/** Delivers Letters 1 and 2 as their triggers are met (whichever comes first is Letter 1). Returns new letters. */
export function deliverLetters(p: Profile): LetterId[] {
  const triggers = (p.heists >= TRIGGER_HEISTS ? 1 : 0) + (p.soldTotal >= TRIGGER_SOLD ? 1 : 0);
  const out: LetterId[] = [];
  for (const id of [1, 2] as LetterId[])
    if (triggers >= id && !hasLetter(p, id)) {
      p.letters.push({ id, day: p.day, read: false });
      out.push(id);
    }
  // The challenge done: the invitation to his lair.
  if (hasLetter(p, 3) && !hasLetter(p, 4) && challengeDone(p)) {
    p.letters.push({ id: 4, day: p.day, read: false });
    out.push(4);
  }
  return out;
}

/** The music box comes home: Letter 3 is inside it. */
export function openMusicBox(p: Profile): boolean {
  if (hasLetter(p, 3)) return false;
  p.letters.push({ id: 3, day: p.day, read: false });
  return true;
}

/** How the letter turned up at the lair. */
export function delivery(p: Profile): string {
  return p.rooms.mailbox
    ? 'In the mailbox, on heavy black paper:'
    : 'Pinned to the lair door with a single claw, since there’s no mailbox:';
}
