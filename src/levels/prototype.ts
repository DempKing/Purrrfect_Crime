// The grey-box test level for milestone M0: two rooms, one bulldog, one prize.
import type { LevelDef } from '../core/level';

export const PROTOTYPE: LevelDef = {
  id: 'm0-gallery',
  name: 'The Grey Gallery',
  centrepiece: 'the Moonstone',
  objective: 'Steal the Moonstone from its plinth, then slip out through the exit.',
  map: [
    '###################',
    '#L.....#..........#',
    '#......#..D....D..#',
    '#......#..........#',
    '#..P...#...P..P...#',
    '#.........#G#.....#',
    '#..D...#..........#',
    '#......#...P..P...#',
    '#......#..........E',
    '#..P...#..D....D..#',
    '#.................#',
    '###################',
  ],
  guards: [
    {
      name: 'Brutus',
      start: { x: 9, y: 3 },
      route: [
        { x: 17, y: 3 },
        { x: 17, y: 8 },
        { x: 9, y: 8 },
        { x: 9, y: 3 },
      ],
    },
  ],
};
