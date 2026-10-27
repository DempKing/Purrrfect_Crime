// A known way through the Night Gallery, kept as a test so level changes can't make it unwinnable.
// Vent to the security office and kill the cameras, crawl under the hall to the side gallery and
// smash two cases where nobody can hear, pick the door, wait for Brutus to pass, take the Night Opal
// from the dim north wall, and run down the east side of the hall to the exit.
export type RouteStep = [number, number] | { a: string; x: number; y: number };

export const NIGHT_GALLERY_ROUTE: RouteStep[][] = [
  [[4, 14], { a: 'enter-vent', x: 4, y: 14 }],
  [[5, 9]],
  [[5, 3]],
  [[2, 3], { a: 'exit-vent', x: 2, y: 3 }],
  [[2, 1], { a: 'panel', x: 2, y: 0 }],
  [[2, 3], { a: 'enter-vent', x: 2, y: 3 }],
  [[5, 6]],
  [[6, 11]],
  [[12, 11]],
  [[18, 11]],
  [[22, 10]],
  [[22, 8], { a: 'exit-vent', x: 22, y: 8 }],
  [[20, 3]],
  [{ a: 'smash-case', x: 19, y: 2 }, { a: 'smash-case', x: 21, y: 2 }],
  [[18, 5], { a: 'pick-door', x: 17, y: 5 }],
  [{ a: 'pick-door', x: 17, y: 5 }],
  [],
  [],
  [],
  [[12, 1]],
  [{ a: 'take', x: 11, y: 2 }, [14, 1]],
  [[16, 9]],
  [[22, 13]],
  [[23, 13]],
];
