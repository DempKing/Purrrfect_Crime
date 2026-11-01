// Colours and sizes for drawing the heist, and the colour-blind palette switch.
export const WALL_H = 84;
export const STUB_H = 12;
/** How high the rafters are. */
export const RAFTER_Z = 92;
/** All the colours used for drawing. */
export const COL = {
  carpetA: 0x4a2a3c,
  carpetB: 0x44263a,
  marbleA: 0x7d8299,
  marbleB: 0x737891,
  floorLine: 0x2a2236,
  exit: 0x2f7d5b,
  wallTop: 0x8e95ad,
  wallA: 0x5b6280,
  wallB: 0x474d68,
  pillar: 0xb7b2a4,
  caseGlass: 0x9fd7ff,
  caseBase: 0x5a4a3a,
  plinth: 0xd8d2c0,
  reach1: 0x4aa3ff,
  reach2: 0xffc54a,
  vision: 0xff5a4a,
  camera: 0xc77dff,
  path: 0xffffff,
  warn: 0xffd23f,
  danger: 0xff3b30,
  step: 0xffb199,
  lampGlow: 0xffd27a,
  duct: 0x5ec8ff,
  laser: 0xff2a2a,
  target: 0x5ef0ff,
  rival: 0xb05cff,
  motion: 0xff6a6a,
  beam: 0xd9a066,
};
// Overlay colours: the standard set and a colour-blind friendly set (Okabe-Ito).
const STANDARD = {
  reach1: COL.reach1,
  reach2: COL.reach2,
  vision: COL.vision,
  camera: COL.camera,
  warn: COL.warn,
  danger: COL.danger,
  path: COL.path,
};
/** Colour-blind friendly overlay colours. */
const COLOURBLIND = {
  reach1: 0x0072b2,
  reach2: 0xf0e442,
  vision: 0xd55e00,
  camera: 0xcc79a7,
  warn: 0xf0e442,
  danger: 0xd55e00,
  path: 0xffffff,
};
export let hatchVision = false;
/** Switches between the standard and colour-blind overlay colours. */
export function setPalette(palette: 'standard' | 'colourblind'): void {
  Object.assign(COL, palette === 'colourblind' ? COLOURBLIND : STANDARD);
  hatchVision = palette === 'colourblind';
}
/** Loot colours by index, so each piece reads differently on its stand. */
export const LOOT_COLORS = [0x9fe8ff, 0xf2c46b, 0xf5f0ff, 0xffd84a, 0xe0314b, 0xd9b36c, 0x3fbf7f, 0xb6a4ff];
