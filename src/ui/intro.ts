// The opening cinematic for a new game: Leo naps in the living room while his owner watches the news about
// NightClaw's latest heist. The owner goes to bed, Leo puts on his tuxedo and slips out of the window.
// The camera sits where the TV is, so the room is lit by its blue flicker. Drawn on a 1280x720 canvas;
// the words (news captions, the goodnight bubble) are HTML on top.
import { capturePadButton } from './gamepad';

export interface IntroHooks {
  sound: (name: 'whoosh' | 'door' | 'creak' | 'pounce') => void;
  /** The music's moments: the news comes on, the TV goes off, the fade to black, or the intro ends early. */
  music: (moment: 'news' | 'tv-off' | 'fade' | 'end') => void;
}

const W = 1280;
const H = 720;
const FLOOR_Y = 440; // where the back wall meets the floor
const END = 30.6; // seconds, when the screen is fully black
// Leo's colors.
const FUR = '#16141c';
const WHITE = '#eceaf2';
const JACKET = '#2b2638'; // a touch lighter than his fur, so the tailcoat shows
const LAPEL = '#463e5c';
const GOLD = '#e2b13c';

// The script, in seconds.
const T = {
  tvOff: 15.5,
  standUp: 16,
  goodnight: 17.1,
  walkOff: 18.9,
  doorShut: 21.4,
  earTwitch: 21.8,
  eyeOpen: 22.2,
  headUp: 22.8,
  lookWindow: 23.5,
  puff: 24.1,
  sneak: 25.3,
  atWindow: 27.6,
  hop: 28.0,
  out: 28.6,
  fade: 29.3,
};

/** What the news anchor says, and when each line starts. The last line is cut off by the TV going off. */
const NEWS = [
  { at: 1.6, text: 'Good evening. Our top story tonight: a daring theft at the Grand Exhibition Hall.' },
  {
    at: 5.7,
    text: 'The Midnight Music Box, one of the rarest treasures in the world, vanished last night from behind three locked doors.',
  },
  {
    at: 9.9,
    text: 'There were no alarms and no footprints. The thief left just one thing behind: a calling card, signed by NightClaw.',
  },
  { at: 14.1, text: 'Police are asking anyone who saw something unusual to come forward and—' },
];
const CARD_AT = 12.2; // the calling card appears on the TV

/** NightClaw's calling card: midnight blue, three silver claw marks. */
const NIGHTCLAW_CARD = `<svg viewBox="0 0 120 76" aria-hidden="true">
  <rect x="2" y="2" width="116" height="72" rx="6" fill="#151a3d" stroke="#b9c3e6" stroke-width="2"/>
  <path d="M44 16 Q52 32 48 50 M58 14 Q66 30 62 50 M72 16 Q80 32 76 50" fill="none" stroke="#dfe6ff" stroke-width="4" stroke-linecap="round"/>
  <text x="60" y="66" text-anchor="middle" font-family="Georgia, serif" font-size="10" fill="#dfe6ff">— N. C. —</text>
</svg>`;

// Small timing helpers.
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** 0 before a, 1 after b, a straight ramp between. */
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const ease = (v: number) => v * v * (3 - 2 * v);
const lerp = (a: number, b: number, v: number) => a + (b - a) * v;

/** Plays the intro. `atBlack` runs once the screen is black (start the tutorial there), then it fades away. */
export function playIntro(hooks: IntroHooks, atBlack: () => void): Promise<void> {
  const box = document.createElement('div');
  box.className = 'intro';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'Intro');
  box.innerHTML = `<div class="intro-stage">
      <canvas width="${W}" height="${H}" aria-hidden="true"></canvas>
      <div class="intro-tv hidden"><span>Left at the scene</span>${NIGHTCLAW_CARD}</div>
      <div class="intro-bubble hidden">Goodnight, Leo. Sleep tight.</div>
      <div class="intro-news hidden">
        <div class="intro-chyron"><b>BREAKING</b><span>Midnight Music Box stolen</span></div>
        <p class="intro-caption"></p>
      </div>
      <button class="intro-skip" type="button">Skip ▸▸</button>
      <p class="sr-only" role="status" aria-live="polite"></p>
    </div>`;
  document.body.appendChild(box);
  const ctx = box.querySelector('canvas')!.getContext('2d')!;
  const tvCard = box.querySelector<HTMLElement>('.intro-tv')!;
  const bubble = box.querySelector<HTMLElement>('.intro-bubble')!;
  const news = box.querySelector<HTMLElement>('.intro-news')!;
  const caption = box.querySelector<HTMLElement>('.intro-caption')!;
  const status = box.querySelector<HTMLElement>('[role=status]')!;

  // Music and one-off sounds, each played once when its moment passes.
  const cues: [number, () => void][] = [
    [NEWS[0].at, () => hooks.music('news')],
    [T.tvOff, () => hooks.music('tv-off')],
    [T.doorShut, () => hooks.sound('door')],
    [T.puff, () => hooks.sound('whoosh')],
    [T.atWindow, () => hooks.sound('creak')],
    [T.hop, () => hooks.sound('pounce')],
    [T.fade, () => hooks.music('fade')],
  ];
  let cueIdx = 0;

  const start = performance.now();
  let t = 0;
  let ended = false;

  return new Promise((resolve) => {
    /** Black screen: hand over to the game, then fade the cover away. */
    const finish = () => {
      if (ended) return;
      ended = true;
      if (t < T.fade) hooks.music('end'); // skipped: stop whatever is playing
      capturePadButton(null);
      removeEventListener('keydown', onKey, true);
      box.classList.add('black');
      atBlack();
      // Two frames so the game draws under the cover before it fades.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          box.classList.add('leaving');
          setTimeout(() => {
            box.remove();
            resolve();
          }, 950);
        }),
      );
    };

    // Skipping: the button, Esc / Enter / Space, or any controller button.
    box.querySelector('.intro-skip')!.addEventListener('click', finish);
    const onKey = (e: KeyboardEvent) => {
      e.stopImmediatePropagation(); // the screens underneath don't see keys during the intro
      if (e.repeat) return;
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        finish();
      }
    };
    addEventListener('keydown', onKey, true);
    // Wait a moment, so the press that started the new game doesn't skip it.
    setTimeout(() => !ended && capturePadButton(() => finish()), 400);

    const frame = (now: number) => {
      if (ended) return;
      t = (now - start) / 1000;
      while (cueIdx < cues.length && t >= cues[cueIdx][0]) cues[cueIdx++][1]();
      draw();
      words();
      if (t >= END) return finish();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });

  /** The HTML on top of the picture: news captions, the calling card on the TV, the goodnight bubble. */
  function words() {
    const tvOn = t < T.tvOff;
    news.classList.toggle('hidden', !tvOn || t < NEWS[0].at);
    tvCard.classList.toggle('hidden', !tvOn || t < CARD_AT);
    // The current line types itself out.
    const line = [...NEWS].reverse().find((l) => t >= l.at);
    if (line && tvOn) {
      const shown = line.text.slice(0, Math.floor((t - line.at) * 42));
      if (caption.textContent !== shown) caption.textContent = shown;
      if (status.textContent !== line.text) status.textContent = `News: ${line.text}`;
    }
    // The goodnight bubble sits above the owner's head.
    const sayIt = t >= T.goodnight + 0.2 && t < T.walkOff + 0.3;
    bubble.classList.toggle('hidden', !sayIt);
    if (sayIt) {
      const o = ownerAt(t);
      bubble.style.left = `${(o.x / W) * 100}%`;
      bubble.style.top = `${((o.headY - 70) / H) * 100}%`;
      if (!status.textContent!.startsWith('Owner'))
        status.textContent = 'Owner: Goodnight, Leo. Sleep tight.';
    }
  }

  /** One frame of the picture. */
  function draw() {
    const tvOn = t < T.tvOff;
    ctx.save();
    ctx.clearRect(0, 0, W, H);

    const windowOpen = ease(ramp(t, T.atWindow, T.hop));
    drawRoom(windowOpen);
    drawCouch();
    if (t < T.walkOff + 3) drawOwner(ownerAt(t));
    drawLeo();

    // Light: the TV's blue flicker from behind the camera, the warm lamp, and the dark once the TV is off.
    ctx.globalCompositeOperation = 'lighter';
    if (tvOn) {
      const flicker =
        0.2 + Math.sin(t * 11) * 0.04 + Math.sin(t * 29.3) * 0.03 + (Math.sin(t * 2.3) > 0.97 ? 0.08 : 0);
      const tv = ctx.createRadialGradient(W / 2, H + 120, 60, W / 2, H + 120, 1000);
      tv.addColorStop(0, `rgba(90, 140, 255, ${flicker + 0.12})`);
      tv.addColorStop(1, 'rgba(40, 70, 180, 0)');
      ctx.fillStyle = tv;
      ctx.fillRect(0, 0, W, H);
    }
    const lamp = ctx.createRadialGradient(1150, 230, 10, 1150, 230, 420);
    lamp.addColorStop(0, 'rgba(255, 180, 100, 0.32)');
    lamp.addColorStop(1, 'rgba(255, 140, 60, 0)');
    ctx.fillStyle = lamp;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    // The blink of darkness when the TV clicks off, settling to a dimmer room.
    const off = ramp(t, T.tvOff, T.tvOff + 0.15);
    if (off > 0) {
      ctx.fillStyle = `rgba(4, 4, 16, ${0.28 * off + 0.3 * (1 - ramp(t, T.tvOff + 0.15, T.tvOff + 0.6)) * off})`;
      ctx.fillRect(0, 0, W, H);
    }

    // Vignette and cinema bars.
    const vig = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 820);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(0, 0, 0, 0.62)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, 34);
    ctx.fillRect(0, H - 34, W, 34);

    // Fade in from black at the start, out to black at the end.
    const black = Math.max(1 - ramp(t, 0, 1.4), ramp(t, T.fade, END - 0.1));
    if (black > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${black})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  /** The back wall with its window and lamp, and the wooden floor with a rug. */
  function drawRoom(open: number) {
    // Wall and floor.
    const wall = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
    wall.addColorStop(0, '#1b1830');
    wall.addColorStop(1, '#2c2645');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, FLOOR_Y);
    ctx.fillStyle = '#171324';
    ctx.fillRect(0, FLOOR_Y - 14, W, 14); // skirting board
    const floor = ctx.createLinearGradient(0, FLOOR_Y, 0, H);
    floor.addColorStop(0, '#2a1d19');
    floor.addColorStop(1, '#3d2a22');
    ctx.fillStyle = floor;
    ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
    // Floorboards, spreading toward the camera.
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 2;
    for (let i = -8; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(W / 2 + i * 90, FLOOR_Y);
      ctx.lineTo(W / 2 + i * 190, H);
      ctx.stroke();
    }

    // The window, with the night outside.
    const wx = 110;
    const wy = 96;
    const ww = 220;
    const wh = 236;
    const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
    sky.addColorStop(0, '#0b1030');
    sky.addColorStop(1, '#26305e');
    ctx.fillStyle = sky;
    ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = '#fff6d8';
    for (const [sx, sy] of [
      [130, 120],
      [170, 160],
      [205, 112],
      [300, 190],
      [145, 205],
      [240, 140],
    ])
      ctx.fillRect(sx, sy, 2, 2);
    ctx.beginPath();
    ctx.arc(268, 146, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#f4ecc8';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(276, 140, 19, 0, Math.PI * 2);
    ctx.fillStyle = '#0d1334';
    ctx.fill(); // a crescent
    // Rooftops across the street, with a few lit windows.
    ctx.fillStyle = '#0a0b1a';
    ctx.beginPath();
    ctx.moveTo(wx, wy + wh);
    for (const [x, y] of [
      [110, 270],
      [150, 270],
      [150, 250],
      [190, 230],
      [230, 250],
      [230, 262],
      [268, 262],
      [268, 240],
      [300, 240],
      [300, 258],
      [330, 258],
    ])
      ctx.lineTo(x, y);
    ctx.lineTo(wx + ww, wy + wh);
    ctx.fill();
    ctx.fillStyle = '#f1c56a';
    ctx.fillRect(170, 262, 8, 10);
    ctx.fillRect(280, 268, 8, 10);
    // The glass: the lower half slides up when Leo opens it.
    const mid = wy + wh / 2;
    const lift = open * (wh / 2 - 8);
    ctx.fillStyle = 'rgba(140, 170, 255, 0.08)';
    ctx.fillRect(wx, wy, ww, wh / 2);
    ctx.fillRect(wx, mid - lift, ww, wh / 2);
    ctx.strokeStyle = '#120f1f';
    ctx.lineWidth = 10;
    ctx.strokeRect(wx, wy, ww, wh);
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy);
    ctx.lineTo(wx + ww / 2, mid);
    ctx.stroke();
    ctx.strokeRect(wx + 4, mid - lift, ww - 8, wh / 2 - 4); // the lower sash
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, mid - lift);
    ctx.lineTo(wx + ww / 2, mid - lift + wh / 2 - 4);
    ctx.stroke();
    // The sill.
    ctx.fillStyle = '#3a2f4a';
    ctx.fillRect(wx - 16, wy + wh, ww + 32, 12);
    // Curtains, swaying once the window is open.
    const sway = open * Math.sin(t * 5) * 8;
    ctx.fillStyle = '#4b2440';
    for (const [x0, side] of [
      [wx - 34, 1],
      [wx + ww + 34, -1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x0, wy - 22);
      ctx.lineTo(x0 + side * 52, wy - 22);
      ctx.quadraticCurveTo(x0 + side * (34 + sway), wy + wh / 2, x0 + side * (48 + sway * 1.6), wy + wh + 34);
      ctx.lineTo(x0, wy + wh + 34);
      ctx.fill();
    }
    ctx.fillStyle = '#120f1f';
    ctx.fillRect(wx - 50, wy - 30, ww + 100, 8); // curtain rail

    // Moonlight through the window, across the floor (stronger once it's open).
    ctx.fillStyle = `rgba(160, 190, 255, ${0.05 + open * 0.05})`;
    ctx.beginPath();
    ctx.moveTo(wx, FLOOR_Y);
    ctx.lineTo(wx + ww, FLOOR_Y);
    ctx.lineTo(wx + ww + 190, H);
    ctx.lineTo(wx + 60, H);
    ctx.fill();

    // A framed picture of a fish above the couch.
    ctx.fillStyle = '#120f1f';
    ctx.fillRect(560, 110, 160, 104);
    ctx.fillStyle = '#3b5a6e';
    ctx.fillRect(570, 120, 140, 84);
    ctx.fillStyle = '#e09a4a';
    ctx.beginPath();
    ctx.ellipse(632, 162, 34, 16, 0, 0, Math.PI * 2);
    ctx.moveTo(664, 162);
    ctx.lineTo(690, 146);
    ctx.lineTo(690, 178);
    ctx.fill();

    // The floor lamp on the right.
    ctx.fillStyle = '#120f1f';
    ctx.fillRect(1146, 236, 8, FLOOR_Y - 236);
    ctx.fillRect(1124, FLOOR_Y - 8, 52, 8);
    ctx.fillStyle = '#e9b46a';
    ctx.beginPath();
    ctx.moveTo(1112, 236);
    ctx.lineTo(1188, 236);
    ctx.lineTo(1172, 180);
    ctx.lineTo(1128, 180);
    ctx.fill();

    // The rug.
    ctx.fillStyle = '#5a2632';
    ctx.beginPath();
    ctx.ellipse(620, 610, 400, 78, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9944a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(620, 610, 370, 64, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  /** The couch against the back wall. */
  function drawCouch() {
    const x0 = 360;
    const x1 = 960;
    ctx.fillStyle = '#2e3d5c';
    rounded(x0 + 20, 250, x1 - x0 - 40, 130, 26); // back
    ctx.fillStyle = '#34466a';
    rounded(x0 + 40, 345, x1 - x0 - 80, 44, 14); // seat cushions
    ctx.fillStyle = '#26334d';
    rounded(x0 + 30, 382, x1 - x0 - 60, 54, 10); // front
    ctx.fillStyle = '#2a3856';
    rounded(x0, 300, 70, 136, 22); // arms
    rounded(x1 - 70, 300, 70, 136, 22);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(660, 262);
    ctx.lineTo(660, 380);
    ctx.stroke();
    // A cushion and a throw blanket.
    ctx.fillStyle = '#c9944a';
    rounded(420, 300, 74, 60, 16);
  }

  /** Where the owner is and what they're doing at time `at`. */
  function ownerAt(at: number) {
    const stand = ease(ramp(at, T.standUp, T.standUp + 0.9));
    const walk = ramp(at, T.walkOff, T.walkOff + 2.2);
    const x = lerp(770, 1420, walk);
    const hipY = lerp(368, 300, stand);
    const remote = ramp(at, T.tvOff - 0.45, T.tvOff - 0.15) * (1 - ramp(at, T.tvOff + 0.3, T.tvOff + 0.7));
    const lean =
      ease(ramp(at, T.goodnight, T.goodnight + 0.4)) * (1 - ease(ramp(at, T.walkOff - 0.3, T.walkOff)));
    return { x, hipY, headY: hipY - 147, stand, walking: walk > 0 && walk < 1, remote, lean };
  }

  /** The owner: front on, in a cozy sweater, lit by the TV. */
  function drawOwner(o: ReturnType<typeof ownerAt>) {
    const { x, hipY, stand, remote, lean } = o;
    const step = o.walking ? Math.sin(t * 9) : 0;
    const bob = o.walking ? Math.abs(step) * 4 : 0;
    const shoulderY = hipY - 105 - bob;
    const tilt = -lean * 0.12; // leaning down toward Leo
    ctx.save();
    ctx.translate(x, 0);

    // Legs: seated, the thighs come toward the camera; standing, straight down (and stepping when walking).
    ctx.fillStyle = '#262c45';
    for (const side of [-1, 1]) {
      const swing = side * step * 10;
      if (stand < 0.5)
        rounded(side * 26 - 16, hipY + 20, 32, 448 - hipY - 20, 12); // shins (the lap is drawn over the body)
      else rounded(side * 20 - 18 + swing, hipY - 8, 36, 448 - hipY + 8 - (swing > 0 ? 4 : 0), 14);
      ctx.fillStyle = '#15151d';
      rounded(
        side * 22 - 20 + (stand < 0.5 ? 0 : swing),
        440 - (swing > 0 && stand >= 0.5 ? 4 : 0),
        40,
        14,
        6,
      );
      ctx.fillStyle = '#262c45';
    }

    ctx.translate(0, hipY);
    ctx.rotate(tilt);
    ctx.translate(0, -hipY);
    // Body and arms.
    ctx.fillStyle = '#6e3b5c';
    rounded(-48, shoulderY, 96, hipY - shoulderY + 14, 30);
    ctx.fillStyle = '#5c304d';
    rounded(-62, shoulderY + 8, 24, 92, 12); // the left arm, resting
    if (remote > 0) {
      // The right arm comes up to point the remote at the TV (at the camera).
      rounded(38, shoulderY + 8 + remote * 10, 24, lerp(92, 52, remote), 12);
      ctx.fillStyle = '#e0ad8a';
      ctx.beginPath();
      ctx.arc(50, shoulderY + lerp(102, 64, remote), lerp(11, 16, remote), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111';
      rounded(40, shoulderY + lerp(88, 44, remote), 20, lerp(18, 30, remote), 4);
      if (t >= T.tvOff - 0.05 && t < T.tvOff + 0.12) {
        ctx.fillStyle = '#ff4a4a';
        ctx.fillRect(47, shoulderY + 44, 6, 4);
      }
    } else rounded(38, shoulderY + 8, 24, 92, 12);
    if (stand < 0.5) {
      // Seated: the lap comes toward the camera, with a knee on each side.
      ctx.fillStyle = '#2f3656';
      rounded(-56, hipY - 6, 112, 34, 16);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, hipY - 2);
      ctx.lineTo(0, hipY + 26);
      ctx.stroke();
    }
    ctx.fillStyle = '#e0ad8a';
    for (const hx of remote === 0 ? [-50, 50] : [-50]) {
      ctx.beginPath();
      ctx.arc(hx, shoulderY + 102, 11, 0, Math.PI * 2);
      ctx.fill();
    }

    // Head and hair.
    const hy = shoulderY - 40;
    ctx.fillStyle = '#e0ad8a';
    ctx.fillRect(-12, shoulderY - 14, 24, 18); // neck
    ctx.beginPath();
    ctx.arc(0, hy, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2418';
    ctx.beginPath();
    ctx.arc(0, hy - 6, 36, Math.PI * 0.95, Math.PI * 2.05);
    ctx.quadraticCurveTo(30, hy - 30, -10, hy - 22);
    ctx.fill();
    ctx.fillRect(-36, hy - 8, 10, 30);
    ctx.fillRect(26, hy - 8, 10, 30);
    // Face: eyes on the TV (blinking now and then), down at Leo when saying goodnight.
    const blink = (t % 4.3 < 0.12 && t < T.tvOff) || (t > T.standUp && t < T.standUp + 0.15);
    const lookDown = lean * 6;
    ctx.fillStyle = '#1c1233';
    for (const ex of [-12, 12]) {
      if (blink) ctx.fillRect(ex - 5, hy + 2 + lookDown, 10, 2);
      else {
        ctx.beginPath();
        ctx.arc(ex - lean * 3, hy + 2 + lookDown, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.strokeStyle = '#7a3e3a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (lean > 0.3)
      ctx.arc(0, hy + 14, 7, 0.15 * Math.PI, 0.85 * Math.PI); // a smile for Leo
    else {
      ctx.moveTo(-6, hy + 18);
      ctx.lineTo(6, hy + 18);
    }
    ctx.stroke();
    ctx.restore();
  }

  /** Leo: a sleepy house cat on the rug, then (puff!) the gentleman thief, off to the window. */
  function drawLeo() {
    const cx = 560;
    const cy = 612;
    const puff = ramp(t, T.puff, T.puff + 0.7);
    if (puff < 0.3) drawCat(cx, cy);
    if (puff > 0.3) drawSuitedLeo(cx);
    if (puff > 0 && puff < 1) {
      // A cloud of smoke and a few sparkles.
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + 0.4;
        const r = 20 + ease(puff) * 80;
        ctx.fillStyle = `rgba(220, 220, 235, ${0.85 * (1 - puff)})`;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * r, cy - 60 + Math.sin(a) * r * 0.7, 34 * (1 - puff * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(255, 226, 122, ${1 - puff})`;
      for (let i = 0; i < 6; i++) {
        const a = i * 1.7;
        ctx.fillRect(cx + Math.cos(a) * (60 + puff * 70), cy - 80 + Math.sin(a) * (40 + puff * 50), 5, 5);
      }
    }
  }

  /** The curled-up cat: breathing, an ear twitch, one eye, then head up, looking around. */
  function drawCat(cx: number, cy: number) {
    const breath = Math.sin(t * 2.2);
    const lift = ease(ramp(t, T.headUp, T.headUp + 0.4)) * 22;
    const eyeR = ease(ramp(t, T.eyeOpen, T.eyeOpen + 0.2)); // the right eye opens first
    const eyeL = ease(ramp(t, T.headUp, T.headUp + 0.2));
    // Looking right toward the hallway, then left at the window.
    const look = t < T.lookWindow ? 1 : lerp(1, -1, ease(ramp(t, T.lookWindow, T.lookWindow + 0.3)));
    const twitch = t > T.earTwitch && t < T.earTwitch + 0.25 ? Math.sin((t - T.earTwitch) * 60) * 0.2 : 0;
    const black = FUR;

    // Shadow, tail, body.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(cx + 10, cy + 34, 100, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = 'round';
    ctx.strokeStyle = black;
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(cx - 66, cy + 6);
    ctx.quadraticCurveTo(cx - 40, cy + 44, cx + 22, cy + 34);
    ctx.stroke();
    ctx.strokeStyle = WHITE;
    ctx.beginPath();
    ctx.moveTo(cx + 14, cy + 35);
    ctx.lineTo(cx + 30, cy + 32);
    ctx.stroke();
    ctx.fillStyle = black;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 80, 36 + breath * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // A soft rim of light along his back, so the black fur reads against the rug.
    ctx.strokeStyle = 'rgba(150, 170, 230, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 78, 34 + breath * 1.5, 0, Math.PI * 1.05, Math.PI * 1.85);
    ctx.stroke();
    // White front paws.
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.ellipse(cx + 58, cy + 30, 12, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 80, cy + 27, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // The head, resting on the paws (lifting up when he wakes).
    const hx = cx + 72;
    const hy = cy - 4 - lift + breath;
    ctx.fillStyle = black;
    ctx.beginPath();
    ctx.ellipse(hx - 14, hy + 12, 24, 22, 0, 0, Math.PI * 2); // neck
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.ellipse(hx - 4, hy + 24, 16, 12, 0, 0, Math.PI * 2); // white chest
    ctx.fill();
    drawHead(hx, hy, { eyeL, eyeR, look, twitch, turn: 0, monocle: 0 });

    // Zzz while he's asleep.
    if (t < T.earTwitch) {
      ctx.fillStyle = 'rgba(230, 236, 255, 0.85)';
      ctx.font = '700 22px Nunito, sans-serif';
      for (let i = 0; i < 3; i++) {
        const p = (t * 0.45 + i / 3) % 1;
        ctx.globalAlpha = Math.sin(p * Math.PI);
        ctx.fillText('z', hx + 24 + p * 40, hy - 30 - p * 60);
      }
      ctx.globalAlpha = 1;
    }
  }

  /** Leo in his tuxedo: sits up proudly, sneaks to the window, leaps onto the sill and out. */
  function drawSuitedLeo(startX: number) {
    const walk = ramp(t, T.sneak, T.atWindow);
    const hop = ramp(t, T.hop, T.out);
    const out = ramp(t, T.out, T.out + 0.4);
    if (out >= 1) return;

    // Feet position and size: the floor, then an arc up to the sill (farther away, so smaller).
    let fx = lerp(startX, 236, walk);
    let fy = 650;
    let size = 1;
    if (hop > 0) {
      fx = lerp(236, 214, hop);
      fy = lerp(650, 332, ease(hop)) - Math.sin(hop * Math.PI) * 90;
      size = lerp(1, 0.8, hop);
    }
    // Stepping out: back through the open half of the window, getting smaller.
    if (out > 0) {
      fy = lerp(332, 300, out);
      size = lerp(0.8, 0.56, out);
    }
    const appear = ramp(t, T.puff + 0.2, T.puff + 0.5); // a little pop in the puff
    if (appear < 1) size *= 0.8 + Math.sin(appear * Math.PI) * 0.25 + appear * 0.2;

    ctx.save();
    if (out > 0) {
      // Only what's still inside the window opening shows.
      ctx.beginPath();
      ctx.rect(110, 96, 220, 236);
      ctx.clip();
      ctx.globalAlpha = 1 - out;
    }
    if (hop === 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(fx, fy + 2, 70, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.translate(fx, fy);
    ctx.scale(size, size);
    if (t < T.sneak) drawSuitSitting();
    else drawSuitSide(walk > 0 && walk < 1 ? (t - T.sneak) * 9 : 0, hop > 0 && hop < 1 ? hop : 0);
    ctx.restore();
  }

  /** Suited Leo sitting up, facing the camera, with a gleam off his monocle. (Origin: between his feet.) */
  function drawSuitSitting() {
    // The tail curls round his right side.
    tail(28, -10, 72, -4, 64, -50);
    // Haunches, then the jacket over his body.
    ctx.fillStyle = FUR;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * 30, -18, 22, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = JACKET;
    ctx.beginPath();
    ctx.moveTo(-36, -6);
    ctx.quadraticCurveTo(-42, -72, -18, -94);
    ctx.lineTo(18, -94);
    ctx.quadraticCurveTo(42, -72, 36, -6);
    ctx.closePath();
    ctx.fill();
    rim(() => {
      ctx.moveTo(-36, -10);
      ctx.quadraticCurveTo(-42, -72, -18, -94);
    });
    // Shirt front, lapels, studs and a gold button.
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.moveTo(-16, -94);
    ctx.lineTo(16, -94);
    ctx.lineTo(0, -38);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = LAPEL;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-18, -92);
    ctx.lineTo(-1, -38);
    ctx.moveTo(18, -92);
    ctx.lineTo(1, -38);
    ctx.stroke();
    ctx.fillStyle = FUR;
    for (const y of [-74, -60]) {
      ctx.beginPath();
      ctx.arc(0, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(0, -28, 4, 0, Math.PI * 2);
    ctx.fill();
    // White front paws.
    ctx.fillStyle = WHITE;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * 12, -5, 11, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Head (looking pleased with himself) and the bow tie under it.
    const glint = ramp(t, T.puff + 0.6, T.puff + 1.1);
    drawHead(0, -122, {
      eyeL: 1,
      eyeR: 1,
      look: 0,
      twitch: 0,
      turn: 0,
      monocle: glint > 0 && glint < 1 ? glint : 0.001,
    });
    bowTie(0, -92);
  }

  /**
   * Suited Leo side on, facing left toward the window. `step` drives the sneaking walk (0 = standing);
   * `leap` (0..1 through the jump) stretches him out. (Origin: under his middle, on the ground.)
   */
  function drawSuitSide(step: number, leap: number) {
    const bodyY = leap ? -46 : -40 - Math.abs(Math.sin(step)) * 2; // low and sneaky
    ctx.save();
    if (leap) ctx.rotate(lerp(-0.35, 0.25, leap)); // nose up on the way up, down on the way to the sill
    // A leg from the body to the floor, with a white paw. Far legs are darker.
    const leg = (hipX: number, off: number, far: boolean) => {
      let footX = hipX + Math.sin(step + off) * 12;
      let footY = -Math.max(0, Math.cos(step + off)) * (step ? 8 : 0);
      if (leap) {
        footX = hipX + (hipX < 0 ? -28 : 30);
        footY = -6;
      }
      ctx.strokeStyle = far ? '#0c0b10' : FUR;
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hipX, bodyY + 6);
      ctx.lineTo(footX, footY - 4);
      ctx.stroke();
      ctx.fillStyle = far ? '#a9a6b4' : WHITE;
      ctx.beginPath();
      ctx.ellipse(footX - 2, footY - 3, 9, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    // The tail streams out behind, held low while sneaking.
    tail(46, bodyY - 2, 92, bodyY - 6, 100, bodyY - (leap ? 20 : 48));
    leg(-30, Math.PI, true);
    leg(34, 0, true);
    // Body, then the tailcoat with its tails swinging.
    ctx.fillStyle = FUR;
    ctx.beginPath();
    ctx.ellipse(0, bodyY, 54, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    const swing = Math.sin(step * 2) * 4 + leap * 8;
    ctx.fillStyle = JACKET;
    ctx.beginPath();
    ctx.ellipse(-6, bodyY - 2, 48, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(26, bodyY + 4);
    ctx.lineTo(70, bodyY + 18 + swing);
    ctx.lineTo(60, bodyY + 22 + swing);
    ctx.lineTo(30, bodyY + 16);
    ctx.closePath();
    ctx.fill();
    rim(() => ctx.ellipse(-6, bodyY - 2, 46, 19, 0, Math.PI * 1.1, Math.PI * 1.9));
    ctx.strokeStyle = LAPEL;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-44, bodyY - 14);
    ctx.quadraticCurveTo(-30, bodyY, -26, bodyY + 14);
    ctx.stroke();
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.ellipse(-48, bodyY - 2, 9, 14, 0, 0, Math.PI * 2); // shirt front
    ctx.fill();
    ctx.fillStyle = GOLD;
    for (const bx of [-20, -8]) {
      ctx.beginPath();
      ctx.arc(bx, bodyY + 12, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    leg(-30, 0, false);
    leg(34, Math.PI, false);
    // Head turned toward the window, bow tie under the chin.
    drawHead(-54, bodyY - 34, { eyeL: 1, eyeR: 1, look: -1, twitch: 0, turn: -1, monocle: 0.001 });
    bowTie(-50, bodyY - 8);
    ctx.restore();
  }

  /**
   * Leo's head, the same in every pose: black, white muzzle, pink ears and nose, gold eyes (or sleepy arcs).
   * `turn` -1 shifts the face left; `monocle` > 0 adds his gold monocle (0..1 also plays a gleam).
   */
  function drawHead(
    hx: number,
    hy: number,
    o: { eyeL: number; eyeR: number; look: number; twitch: number; turn: number; monocle: number },
  ) {
    const dx = o.turn * 7;
    ctx.fillStyle = FUR;
    ctx.beginPath();
    ctx.arc(hx, hy, 28, 0, Math.PI * 2);
    ctx.fill();
    // Ears (the right one can twitch).
    for (const [ex, rot] of [
      [-14, 0],
      [14, o.twitch],
    ]) {
      ctx.save();
      ctx.translate(hx + ex + dx * 0.3, hy - 16);
      ctx.rotate(rot + ex * 0.012);
      ctx.fillStyle = FUR;
      ctx.beginPath();
      ctx.moveTo(-12, 4);
      ctx.lineTo(0, -26);
      ctx.lineTo(12, 4);
      ctx.fill();
      ctx.fillStyle = '#c07a8a';
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(0, -16);
      ctx.lineTo(6, 0);
      ctx.fill();
      ctx.restore();
    }
    // White muzzle and pink nose.
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.ellipse(hx + dx, hy + 12, 15, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d98a9a';
    ctx.beginPath();
    ctx.moveTo(hx + dx - 4, hy + 5);
    ctx.lineTo(hx + dx + 4, hy + 5);
    ctx.lineTo(hx + dx, hy + 10);
    ctx.fill();
    // Eyes: sleepy arcs, opening into gold.
    for (const [ex, open] of [
      [-11, o.eyeL],
      [11, o.eyeR],
    ]) {
      const x = hx + dx + ex;
      if (open < 0.1) {
        ctx.strokeStyle = '#8a8798';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x, hy - 4, 6, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#f2c53d';
        ctx.beginPath();
        ctx.ellipse(x, hy - 3, 7, 6 * open, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.ellipse(x + o.look * 3, hy - 3, 2, 5 * open, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (o.monocle <= 0) return;
    // The monocle over his right eye, with its little gold chain.
    const mx = hx + dx + 11;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(mx, hy - 3, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mx + 6, hy + 5);
    ctx.quadraticCurveTo(mx + 14, hy + 22, mx + 4, hy + 32);
    ctx.stroke();
    // The gleam: a four-pointed star that grows and fades.
    if (o.monocle < 1 && o.monocle > 0.01) {
      const g = Math.sin(o.monocle * Math.PI) * 12;
      ctx.fillStyle = '#fff8d6';
      ctx.beginPath();
      ctx.moveTo(mx + 6, hy - 10 - g);
      ctx.lineTo(mx + 8, hy - 10);
      ctx.lineTo(mx + 6 + g, hy - 8);
      ctx.lineTo(mx + 8, hy - 6);
      ctx.lineTo(mx + 6, hy - 6 + g);
      ctx.lineTo(mx + 4, hy - 6);
      ctx.lineTo(mx + 6 - g, hy - 8);
      ctx.lineTo(mx + 4, hy - 10);
      ctx.closePath();
      ctx.fill();
    }
  }

  /** His red bow tie, centered on (x, y). */
  function bowTie(x: number, y: number) {
    ctx.fillStyle = '#d8262f';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 15, y - 8);
    ctx.lineTo(x - 15, y + 8);
    ctx.closePath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 15, y - 8);
    ctx.lineTo(x + 15, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#a81b22';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  /** A thick black tail along a curve, with a white tip. */
  function tail(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = FUR;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
    ctx.stroke();
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.arc(x1, y1, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  /** A soft line of TV and moon light along an edge, so black on black still reads. */
  function rim(path: () => void) {
    ctx.strokeStyle = 'rgba(150, 170, 230, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    path();
    ctx.stroke();
  }

  /** A filled rounded rectangle. */
  function rounded(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, Math.max(0, h), r);
    ctx.fill();
  }
}
