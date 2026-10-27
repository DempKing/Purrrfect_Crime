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

// The tutorial, played the way the narrator teaches it: follow Gus into the hall, wait in the dark along
// the far wall while he walks back, cross the marble, slip down the corridor while the camera looks
// away, crawl under the laser hallway, pick one case, smash the other, take the pearl and leave.
export const CORNER_GALLERY_ROUTE: RouteStep[][] = [
  [[6, 3]],
  [[10, 4]],
  [[14, 4]],
  [[18, 4]],
  [],
  [[17, 8]],
  [[15, 11], { a: 'enter-vent', x: 15, y: 11 }],
  [[11, 11]],
  [[7, 11]],
  [{ a: 'exit-vent', x: 7, y: 11 }, [6, 8]],
  [{ a: 'pick-case', x: 6, y: 7 }, { a: 'pick-case', x: 6, y: 7 }],
  [[3, 8], { a: 'smash-case', x: 2, y: 7 }],
  [{ a: 'take', x: 4, y: 9 }, [1, 10]],
  [[0, 11]],
];
