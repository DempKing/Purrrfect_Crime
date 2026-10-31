// The morning paper after each heist: a headline written for how it went, photos of the empty displays
// with the estimated value of each piece, and side stories. Deterministic, so a day's paper never changes.
import { the } from '../core/level';

export interface Photo {
  name: string;
  value: number;
  caption: string;
  centrepiece: boolean;
}

export interface Story {
  title: string;
  body: string;
}

export interface Paper {
  day: number;
  levelId: string;
  place: string;
  headline: string;
  subhead: string;
  photos: Photo[];
  total: number;
  stories: Story[];
}

export interface HeistFacts {
  day: number;
  levelId: string;
  place: string;
  items: { name: string; value: number; centrepiece: boolean }[];
  centrepieceName: string | null;
  guards: string[];
  seen: boolean;
  alarm: boolean;
  turns: number;
  first: boolean;
  replay: boolean;
  /** A rival who raced Leo for the centrepiece, and who won. */
  rival?: { name: string; won: boolean; prize: string; caught?: boolean; caughtBy?: string | null } | null;
}

export const MASTHEAD = 'The Whisker Times';

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function pick<T>(list: T[], seed: number): T {
  return list[(seed >>> 0) % list.length];
}

const money = (n: number) => `$${n.toLocaleString('en-US')}`;

export function writePaper(f: HeistFacts): Paper {
  const seed = hash(`${f.day}|${f.levelId}`);
  const PLACE = f.place.toUpperCase();
  const centre = f.items.find((i) => i.centrepiece);
  const CENTRE = centre?.name.toUpperCase();
  const guard = f.guards.length ? pick(f.guards, seed >>> 3) : 'the night watch';

  let headline: string;
  let subhead: string;
  if (f.rival?.caught) {
    // Two thieves in, one hauled off by the guards.
    const NAME = f.rival.name.toUpperCase();
    headline = centre ? `${NAME} NABBED AS TUXEDO CAT ESCAPES WITH THE ${CENTRE}` : pick([`${NAME} NABBED AT ${PLACE}`, `GUARDS COLLAR ${NAME} AT ${PLACE}`], seed);
    subhead = `${f.rival.caughtBy ?? 'A guard'} caught ${f.rival.name} red-pawed at ${f.place} last night${centre ? `, but the tuxedo cat slipped away with ${the(centre.name)} in the confusion` : '; the other thief, in a bow tie, was never found'}.`;
  } else if (f.rival && !f.rival.won) {
    headline = `${f.rival.name.toUpperCase()} BEATS TUXEDO CAT TO THE ${f.rival.prize.toUpperCase()}`;
    subhead = `Two thieves in one night at ${f.place}. Only one of them got ${the(f.rival.prize)}.`;
  } else if (f.rival && f.rival.won) {
    headline = `TUXEDO CAT BEATS ${f.rival.name.toUpperCase()} TO THE ${f.rival.prize.toUpperCase()}`;
    subhead = `Witnesses describe a race through ${f.place}, and a calling card on the empty plinth.`;
  } else if (f.first) {
    headline = `NEW CAT IN TOWN: TUXEDO THIEF HITS ${PLACE}`;
    subhead = `A calling card with a red bow tie was all the burglar left behind${centre ? `, on the plinth where ${the(centre.name)} used to sit` : ''}.`;
  } else if (!f.seen && !f.alarm && centre) {
    headline = pick([`GHOST IN A TUXEDO: ${CENTRE} VANISHES FROM ${PLACE}`, `NOBODY SAW A THING: ${CENTRE} GONE`, `NOT A WHISKER OUT OF PLACE AT ${PLACE}`], seed);
    subhead = `No alarm, no sighting, no clue, apart from the calling card where ${the(centre.name)} should be.`;
  } else if (f.alarm) {
    headline = pick([`ALARMS BLARE AS TUXEDO CAT STRIKES ${PLACE}`, `SIRENS, SPOTLIGHTS AND STILL NO CAT AT ${PLACE}`, `LOCKDOWN TOO LATE AT ${PLACE}`], seed);
    subhead = `Police arrived to find the alarm ringing, the displays empty and a calling card by the door.`;
  } else if (f.seen) {
    headline = pick([`GUARD SWEARS HE SAW "A SHADOW IN A BOW TIE"`, `${guard.toUpperCase()}: "IT WAS RIGHT THERE, THEN IT WASN'T"`], seed);
    subhead = `${guard} glimpsed something at ${f.place} last night. By the time he looked again, the loot was gone.`;
  } else if (f.centrepieceName && !centre) {
    headline = `${f.centrepieceName.toUpperCase()} SAFE, BUT ${f.items.length === 1 ? 'A TREASURE' : `${f.items.length} TREASURES`} TAKEN AT ${PLACE}`;
    subhead = `The tuxedo cat left the star of the show behind. Experts are baffled; the curator is relieved.`;
  } else {
    headline = `TUXEDO CAT STRIKES AGAIN AT ${PLACE}`;
    subhead = `Another quiet night, another empty display case and another calling card.`;
  }
  if (f.replay) subhead += ' It is the second time this month the thief has visited.';

  const photos: Photo[] = f.items.map((i) => ({
    name: i.name,
    value: i.value,
    centrepiece: i.centrepiece,
    caption: i.centrepiece ? `${the(i.name).replace(/^t/, 'T')}'s plinth, with only a calling card left on it.` : pick([`The empty case where ${the(i.name)} stood.`, `Where ${the(i.name)} used to be.`, `Gone: ${the(i.name)}.`], hash(i.name) + seed),
  }));
  const total = f.items.reduce((n, i) => n + i.value, 0);

  const stories: Story[] = [
    {
      title: 'Police baffled',
      body: pick(
        [
          `Chief Barkley says the force is "following several leads" after the theft of an estimated ${money(total)} in treasures.`,
          `"We'll have this cat in a carrier by the weekend," promised Chief Barkley. Insurers valued the haul at ${money(total)}.`,
          `Officers dusted ${f.place} for paw prints and found ${f.turns > 20 ? 'quite a lot of them' : 'almost none'}.`,
        ],
        seed >>> 5,
      ),
    },
    {
      title: 'Rumours',
      body: pick(
        [
          'Old-timers at the docks say the city has not seen work this neat since the days of the legendary NightClaw.',
          'Is NightClaw back? A collector claims a black card with a silver claw was slipped under his door last week.',
          'Fences across the city report a rush of new stock. Asked where it came from, every one of them said "a cat".',
        ],
        seed >>> 7,
      ),
    },
    {
      title: 'Advertisement',
      body: pick(
        [
          'FRESHCATCH SARDINES: now 20% more sardine. Ask your grocer.',
          'Is your museum secure? BULLWARK GUARD SERVICES: our staff never sleep (much).',
          'Lost: one ball of yarn, much loved. Reward. Apply to the Whisker Times.',
        ],
        seed >>> 9,
      ),
    },
  ];

  return { day: f.day, levelId: f.levelId, place: f.place, headline, subhead, photos, total, stories };
}

/** The morning after Leo crept up on NightClaw. */
export function finalePaper(day: number): Paper {
  return {
    day,
    levelId: 'nc-lair',
    place: 'the old bell tower',
    headline: 'NIGHTCLAW’S SUCCESSOR?',
    subhead: 'A note pinned to the door of the old bell tower on Moon Street says the legendary NightClaw has retired. It is signed with a claw mark, and it names a successor: a young cat in a tuxedo.',
    photos: [],
    total: 0,
    stories: [
      { title: 'The end of an era', body: 'For forty years NightClaw was the thief this city told its kittens about. Detectives who spent their careers chasing him say they will miss him. One cried.' },
      { title: 'Who is the Tuxedo Cat?', body: 'Every museum in the city has had a visit, and every centrepiece has gone, with not one guard who could swear they saw him. Curators are advised to check under their plinths.' },
      { title: 'Bell tower empty', body: 'Police who searched the tower found only an empty armchair, a cooling cup of milk and, on a velvet cushion, the dent where something small and precious used to lie.' },
    ],
  };
}
