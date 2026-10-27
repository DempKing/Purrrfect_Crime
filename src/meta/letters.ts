// NightClaw's letters. The first two come from two triggers, in whichever order Leo reaches them (ten
// heists, and 10,000 Catnip sold on the black market); the third is hidden inside the challenge item.
import type { Profile } from './profile';

export type LetterId = 1 | 2 | 3;

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
      'Here is my challenge. Clear every heist in this city, and take every centrepiece in a flawless heist: never seen, no alarms. A centrepiece lost to a rival still counts once you have taken it back yourself.',
      'Do that, and I will write one last time.',
    ],
  },
};

export const hasLetter = (p: Profile, id: LetterId) => p.letters.some((l) => l.id === id);

/**
 * Posts Letters 1 and 2 as their triggers are reached, in order: the first trigger reached brings Letter 1,
 * the second brings Letter 2. Returns the letters that just arrived.
 */
export function deliverLetters(p: Profile): LetterId[] {
  const triggers = (p.heists >= TRIGGER_HEISTS ? 1 : 0) + (p.soldTotal >= TRIGGER_SOLD ? 1 : 0);
  const out: LetterId[] = [];
  for (const id of [1, 2] as LetterId[])
    if (triggers >= id && !hasLetter(p, id)) {
      p.letters.push({ id, day: p.day, read: false });
      out.push(id);
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
  return p.rooms.mailbox ? 'In the mailbox, on heavy black paper:' : 'Pinned to the lair door with a single claw, since there’s no mailbox:';
}
