// NightClaw's challenge museum, opened by his second letter. He chose every lock, lens and laser in it.
import type { LevelDef } from '../core/level';

/**
 * The Midnight Museum. Leo comes in at the foyer, whose glass wall looks onto the hall of plates, where
 * Ward walks and Snooze dozes beside a keycard NightClaw seems to have dropped. The laser corridor (the
 * fuse box is back in the foyer) leads up to the great hall: Captain Vigil's rounds, a guard dog, a camera
 * and a searchlight. The curator's office, off the hall, has the vault combination in its desk. The
 * keycard opens the Midnight Wing, whose antechamber has motion sensors and Nosey the sniffer; the vault
 * beyond it holds the Midnight Music Box. Out through the skylight in the great hall.
 */
export const MIDNIGHT_MUSEUM: LevelDef = {
  id: 'nc-midnight-museum',
  name: 'The Midnight Museum',
  challenge: true,
  tip: 'NightClaw built this one himself, from every trick in the city: glass, plates, lasers, a keycard, a guard dog, motion sensors and a vault.',
  objective: 'Steal the Midnight Music Box from the vault in the Midnight Wing, and leave by the skylight.',
  ambient: 'dark',
  xp: 500,
  par: 40,
  map: [
    '##############################',
    '##############################',
    '##############E###############',
    '#..L......................L..#',
    '#............................#',
    '#.....P...P........P...P.....#',
    '#............................#',
    '#........B...................#',
    '####+#########..#########K####',
    '#......#######..#####L.......#',
    '#.N....#######..#####........#',
    '#......#######xx#####........#',
    '#....D.#######..#####........#',
    '#F############..#########Q####',
    '#......L.|.D.......k##.......#',
    '#........|..^..^....##.......#',
    '#.................^.##...G...#',
    '#.@......|...^..^...##D.....D#',
    '#........|.^.....D..##########',
    '##############################',
  ],
  moonlight: [
    { x: 11, y: 3, w: 8, h: 5 }, // under the skylight
    { x: 21, y: 9, w: 8, h: 4 },
  ],
  lamps: [
    { at: { x: 7, y: 14 }, radius: 2 },
    { at: { x: 3, y: 3 }, radius: 2 },
    { at: { x: 26, y: 3 }, radius: 2 },
    { at: { x: 21, y: 9 }, radius: 2 },
  ],
  motion: [{ x: 21, y: 9, w: 8, h: 4 }],
  spotlights: [{ path: [{ x: 4, y: 5 }, { x: 9, y: 5 }, { x: 14, y: 5 }, { x: 19, y: 5 }, { x: 24, y: 5 }, { x: 19, y: 5 }, { x: 14, y: 5 }, { x: 9, y: 5 }], radius: 1 }],
  cameras: [
    { at: { x: 28, y: 3 }, sweep: [3, 4], range: 6 },
    { at: { x: 22, y: 14 }, sweep: [1, 0], range: 4 },
  ],
  guards: [
    { name: 'Ward', start: { x: 10, y: 16 }, route: [{ x: 19, y: 16 }, { x: 10, y: 16 }] },
    { name: 'Snooze', kind: 'sleepy', start: { x: 18, y: 15 }, route: [{ x: 18, y: 14 }] },
    { name: 'Vigil', kind: 'captain', start: { x: 2, y: 4 }, route: [{ x: 27, y: 4 }, { x: 27, y: 6 }, { x: 2, y: 6 }, { x: 2, y: 4 }] },
    { name: 'Nosey', kind: 'sniffer', start: { x: 22, y: 9 }, route: [{ x: 28, y: 9 }, { x: 22, y: 9 }] },
  ],
  loot: [
    { at: { x: 25, y: 16 }, name: 'Midnight Music Box', value: 25000, space: 2, category: 'curiosity' },
    { at: { x: 22, y: 17 }, name: 'NightClaw’s First Calling Card', value: 6000, space: 1, category: 'curiosity' },
    { at: { x: 28, y: 17 }, name: 'The Black Pearl of Pawsburg', value: 9000, space: 1, category: 'jewel' },
    { at: { x: 11, y: 14 }, name: 'Portrait of a Gentleman Cat', value: 5500, space: 3, category: 'painting' },
    { at: { x: 17, y: 18 }, name: 'Silver Mouse Automaton', value: 4000, space: 2, category: 'artefact' },
    { at: { x: 5, y: 12 }, name: 'The Curator’s Pocket Watch', value: 2500, space: 1, category: 'artefact' },
  ],
};
