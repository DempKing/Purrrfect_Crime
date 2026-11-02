// The lock picking minigame: a pick sweeps around the lock and the player stops it in the gold notch.
// One round is one go at a lock (one action point): a hit sets a pin, a miss slips and makes noise.
import { capturePadButton } from './gamepad';

/** The kinds of lock, and how each plays: spin speed (degrees a second) and notch width (degrees). */
export const LOCK_FEEL = {
  'pick-door': { name: 'Door lock', speed: 150, notch: 46, reverse: false },
  'pick-case': { name: 'Display case lock', speed: 210, notch: 40, reverse: false },
  'crack-safe': { name: 'Safe dial', speed: 290, notch: 36, reverse: false },
  'turn-dials': { name: 'Vault dial', speed: 380, notch: 32, reverse: true },
} as const;
export type LockKind = keyof typeof LOCK_FEEL;

export interface LockpickRound {
  kind: LockKind;
  pinsDone: number; // pins already set on this lock
  pinsNeeded: number;
  speedMult: number; // Leo's Dexterity slows the pick (1 = normal)
  noiseTiles: number; // how far a slip is heard, shown to the player
  confirmKeys: string[]; // keys that stop the pick (lower-case KeyboardEvent.key)
  confirmButtons: number[]; // controller buttons that stop the pick
  cancelButtons: number[]; // controller buttons that back out
  reduceMotion: boolean;
  sound: (name: 'tick' | 'pin' | 'slip') => void;
}

export type LockpickResult = 'hit' | 'slip' | 'cancel';

let openNow = false;

/** For the browser tests: when set, every round ends at once with this result. */
export const lockpickTest = { auto: null as LockpickResult | null };

/** Is the minigame on screen? (Other input should leave it alone.) */
export function lockpickOpen(): boolean {
  return openNow;
}

/** Smallest distance between two angles, in degrees. */
const angleGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

/** Plays one round. Resolves once the result has been shown (or the player backs out). */
export function playLockpick(r: LockpickRound): Promise<LockpickResult> {
  if (lockpickTest.auto) return Promise.resolve(lockpickTest.auto);
  const feel = LOCK_FEEL[r.kind];
  const speed = feel.speed * r.speedMult;
  const dir = feel.reverse && r.pinsDone % 2 === 1 ? -1 : 1; // the vault turns the other way every other pin

  // The overlay: a title, the dial, a status line and two buttons.
  const box = document.createElement('div');
  box.className = 'overlay lockpick';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', feel.name);
  box.innerHTML = `<div class="sheet lockpick-card">
      <h2>${feel.name}</h2>
      <canvas width="840" height="840" aria-label="Stop the pick inside the gold notch"></canvas>
      <p class="lockpick-status" role="status" aria-live="polite">Pin ${r.pinsDone + 1} of ${r.pinsNeeded}</p>
      <div class="row-buttons"><button class="primary lp-pick" type="button">Pick!</button><button class="lp-cancel" type="button">Cancel</button></div>
      <p class="small">Stop the pick in the gold notch. A slip is heard ${r.noiseTiles} tiles away.</p>
    </div>`;
  document.body.appendChild(box);
  openNow = true;
  const canvas = box.querySelector('canvas')!;
  const ctx = canvas.getContext('2d')!;
  const status = box.querySelector<HTMLElement>('.lockpick-status')!;

  // Round state.
  let angle = Math.random() * 360; // where the pick points (0 = up, clockwise)
  let shownAngle = angle; // where it was last drawn: what the player is looking at
  const target = (angle + 120 + Math.random() * 120) % 360; // center of the notch, well away from the pick
  let result: LockpickResult | null = null;
  let resultT = 0; // seconds since the result, for the flash and closing
  let last = performance.now();
  let tickAcc = 0;

  return new Promise((resolve) => {
    const finish = () => {
      openNow = false;
      capturePadButton(null);
      removeEventListener('keydown', onKey, true);
      box.remove();
      resolve(result ?? 'cancel');
    };

    /** The player stops the pick. Judged on what was on screen at the press, or where the pick is now. */
    const attempt = () => {
      if (result) return;
      const sincePaint = Math.min(0.05, (performance.now() - last) / 1000);
      const live = (angle + speed * dir * sincePaint + 360) % 360;
      const hitAt = [shownAngle, live].find((a) => angleGap(a, target) <= feel.notch / 2);
      angle = hitAt ?? shownAngle; // freeze the pick where it was judged
      result = hitAt !== undefined ? 'hit' : 'slip';
      if (result === 'hit') {
        status.textContent =
          r.pinsDone + 1 >= r.pinsNeeded ? 'Click! It’s open.' : `Pin ${r.pinsDone + 1} set`;
        status.className = 'lockpick-status ok';
        r.sound('pin');
      } else {
        status.textContent = 'CLANK!';
        status.className = 'lockpick-status bad';
        r.sound('slip');
        if (!r.reduceMotion) box.querySelector('.lockpick-card')!.classList.add('shake');
      }
      draw();
    };
    const cancel = () => {
      if (result) return;
      result = 'cancel';
      finish();
    };

    // Input: press (not release) on the dial or the button, the confirm keys, the controller.
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      attempt();
    });
    box.querySelector('.lp-pick')!.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      attempt();
    });
    box.querySelector('.lp-cancel')!.addEventListener('click', cancel);
    const onKey = (e: KeyboardEvent) => {
      e.stopImmediatePropagation(); // the heist doesn't see keys while the lock is open
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        e.preventDefault();
        cancel();
      } else if (k === ' ' || k === 'enter' || r.confirmKeys.includes(k)) {
        e.preventDefault();
        attempt();
      }
    };
    addEventListener('keydown', onKey, true);
    // Wait a moment before listening to the controller, so the press that opened the lock isn't counted.
    setTimeout(() => {
      if (openNow && !result)
        capturePadButton((b) => {
          if (r.confirmButtons.includes(b)) attempt();
          else if (r.cancelButtons.includes(b)) cancel();
        });
    }, 200);

    // Drawing: the canvas is 840px square, laid out from its center.
    const C = 420;
    const R = 330;
    const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
    function draw() {
      shownAngle = angle;
      ctx.clearRect(0, 0, 840, 840);

      // Noise rings after a slip.
      if (result === 'slip')
        for (let i = 0; i < 2; i++) {
          const t = Math.min(1, resultT / 0.6 - i * 0.3);
          if (t <= 0) continue;
          ctx.beginPath();
          ctx.arc(C, C, R + 10 + t * 70, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(224, 49, 75, ${1 - t})`;
          ctx.lineWidth = 10;
          ctx.stroke();
        }

      // Brass face with a dark rim.
      const face = ctx.createRadialGradient(C - 90, C - 110, 40, C, C, R);
      face.addColorStop(0, '#f7d98d');
      face.addColorStop(0.55, '#d1a24d');
      face.addColorStop(1, '#8a6224');
      ctx.beginPath();
      ctx.arc(C, C, R + 18, 0, Math.PI * 2);
      ctx.fillStyle = '#1c1233';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(C, C, R, 0, Math.PI * 2);
      ctx.fillStyle = face;
      ctx.fill();

      // Tick marks every 10 degrees, longer every 30.
      for (let d = 0; d < 360; d += 10) {
        const a = rad(d);
        const r0 = R - (d % 30 === 0 ? 42 : 26);
        ctx.beginPath();
        ctx.moveTo(C + Math.cos(a) * r0, C + Math.sin(a) * r0);
        ctx.lineTo(C + Math.cos(a) * (R - 10), C + Math.sin(a) * (R - 10));
        ctx.strokeStyle = 'rgba(28, 18, 51, 0.55)';
        ctx.lineWidth = d % 30 === 0 ? 6 : 3;
        ctx.stroke();
      }

      // The gold notch (green flash on a hit).
      const a0 = rad(target - feel.notch / 2);
      const a1 = rad(target + feel.notch / 2);
      ctx.beginPath();
      ctx.arc(C, C, R - 30, a0, a1);
      ctx.strokeStyle = '#1c1233';
      ctx.lineWidth = 58;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(C, C, R - 30, a0, a1);
      ctx.strokeStyle = result === 'hit' ? '#5fd38d' : '#ffe27a';
      ctx.lineWidth = 46 + (result === 'hit' ? Math.min(1, resultT / 0.3) * 20 : 0);
      ctx.stroke();

      // The keyhole.
      ctx.beginPath();
      ctx.arc(C, C, 112, 0, Math.PI * 2);
      ctx.fillStyle = '#3a2a14';
      ctx.fill();
      ctx.fillStyle = '#0a0c18';
      ctx.beginPath();
      ctx.arc(C, C - 22, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(C - 20, C - 4);
      ctx.lineTo(C + 20, C - 4);
      ctx.lineTo(C + 30, C + 70);
      ctx.lineTo(C - 30, C + 70);
      ctx.closePath();
      ctx.fill();

      // The pick: a steel bar from the keyhole to the rim, with a hooked tip.
      ctx.save();
      ctx.translate(C, C);
      ctx.rotate(rad(angle));
      ctx.lineCap = 'round';
      for (const [color, width] of [
        ['#1c1233', 22],
        [result === 'hit' ? '#5fd38d' : result === 'slip' ? '#e0314b' : '#e8edf5', 11],
      ] as const) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(R - 24, 0);
        ctx.lineTo(R - 24, -26);
        ctx.stroke();
      }
      ctx.restore();

      // Pins below the keyhole: green once set (this round's included, on a hit).
      const done = r.pinsDone + (result === 'hit' ? 1 : 0);
      const w = 44;
      const gap = 14;
      const total = r.pinsNeeded * w + (r.pinsNeeded - 1) * gap;
      for (let i = 0; i < r.pinsNeeded; i++) {
        const x = C - total / 2 + i * (w + gap);
        ctx.fillStyle = '#1c1233';
        ctx.beginPath();
        ctx.roundRect(x - 4, C + 146, w + 8, 46, 12);
        ctx.fill();
        ctx.fillStyle = i < done ? '#5fd38d' : '#3d3560';
        ctx.beginPath();
        ctx.roundRect(x, C + 150, w, 38, 9);
        ctx.fill();
      }
    }

    // Frame loop: the pick spins until the player stops it; the result shows briefly, then the lock closes.
    const frame = (now: number) => {
      if (!openNow) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!result) {
        const step = speed * dt * dir;
        angle = (angle + step + 360) % 360;
        tickAcc += Math.abs(step);
        if (tickAcc >= 30) {
          tickAcc -= 30;
          r.sound('tick');
        }
      } else {
        resultT += dt;
        if (resultT >= (result === 'hit' ? 0.45 : 0.7)) return finish();
      }
      draw();
      requestAnimationFrame(frame);
    };
    draw();
    requestAnimationFrame(frame);
  });
}
