// Controller support, through the browser's Gamepad API (standard mapping: Xbox, PlayStation, Switch Pro and most
// others). On the map the controller drives the same cursor the arrow keys do; anywhere there are buttons to press
// (the menus, the loot tag, the bag, the caught card, or the heist's own buttons after View/Select) the D-pad moves
// between them and A presses one.
//
//   D-pad / left stick   move the cursor (or between buttons)
//   A                    go there / do what's there (or press the button)
//   B                    cancel, close, back
//   X                    end the turn
//   Y                    the bag
//   LB / RB              turn the camera
//   LT / RT              zoom out / in
//   right stick          pan the camera; click either stick to bring it back to Leo
//   View / Select        the heist's buttons: actions, gadgets, Restart, Quit…
//   Menu / Start         settings

export interface PadHooks {
  /** The buttons to move between, or null when the controller drives the map. */
  menuRoot(): HTMLElement | null;
  /** In a heist with nothing open over it. */
  onMap(): boolean;
  moveCursor(dx: number, dy: number): void;
  confirm(): void;
  endTurn(): void;
  bag(): void;
  turnCamera(dir: 1 | -1): void;
  zoomBy(k: number): void;
  pan(dx: number, dy: number): void;
  recentre(): void;
  settings(): void;
  /** View/Select: the heist's buttons get the controller (or give it back). */
  toggleHud(): void;
  /** B, when nothing of the game's own wants it: what Esc would do. */
  cancel(): void;
  connected(name: string): void;
  /** After A pressed one of the buttons. */
  pressed(): void;
}

const A = 0, B = 1, X = 2, Y = 3, LB = 4, RB = 5, LT = 6, RT = 7, VIEW = 8, MENU = 9, L3 = 10, R3 = 11, UP = 12, DOWN = 13, LEFT = 14, RIGHT = 15;
const DEAD = 0.45;
const FIRST_REPEAT = 320;
const REPEAT = 130;

const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function visible(el: HTMLElement): boolean {
  if ((el as HTMLButtonElement).disabled) return false;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return false;
  const st = getComputedStyle(el);
  return st.visibility !== 'hidden' && st.display !== 'none';
}

/** The nearest button in a direction on screen, by centre; the first one (a primary, if any) when nothing is focused. */
export function nextFocus(root: HTMLElement, from: Element | null, dx: number, dy: number): HTMLElement | null {
  const all = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(visible);
  if (!all.length) return null;
  if (!from || !all.includes(from as HTMLElement)) return all.find((e) => e.classList.contains('primary')) ?? all[0];
  const a = from.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  let best: HTMLElement | null = null;
  let score = Infinity;
  for (const el of all) {
    if (el === from) continue;
    const r = el.getBoundingClientRect();
    const ex = r.left + r.width / 2 - ax;
    const ey = r.top + r.height / 2 - ay;
    const along = ex * dx + ey * dy;
    if (along <= 4) continue;
    const across = Math.abs(ex * dy - ey * dx);
    const s = along + across * 2.5;
    if (s < score) {
      score = s;
      best = el;
    }
  }
  return best;
}

export function startGamepad(h: PadHooks): void {
  const prev: boolean[] = [];
  let heldDir = '';
  let nextRepeat = 0;
  let last = performance.now();
  let active = false;

  window.addEventListener('gamepadconnected', (e) => h.connected((e as GamepadEvent).gamepad.id));
  // A mouse or a key press hands control back: the controller's focus ring goes.
  const off = () => {
    if (active) document.body.classList.remove('pad');
    active = false;
  };
  window.addEventListener('mousemove', off);
  window.addEventListener('mousedown', off);

  const press = (b: number) => {
    if (!active) {
      active = true;
      document.body.classList.add('pad');
    }
    const root = h.menuRoot();
    if (b === MENU) return h.settings();
    if (root) {
      if (b === A) {
        const f = document.activeElement as HTMLElement | null;
        if (f && root.contains(f) && f !== document.body) {
          f.click();
          h.pressed();
        }
        else nextFocus(root, null, 0, 0)?.focus();
      } else if (b === B) h.cancel();
      else if (b === VIEW) h.toggleHud();
      return;
    }
    if (!h.onMap()) return;
    if (b === A) h.confirm();
    else if (b === B) h.cancel();
    else if (b === X) h.endTurn();
    else if (b === Y) h.bag();
    else if (b === LB) h.turnCamera(1);
    else if (b === RB) h.turnCamera(-1);
    else if (b === LT) h.zoomBy(0.8);
    else if (b === RT) h.zoomBy(1.25);
    else if (b === L3 || b === R3) h.recentre();
    else if (b === VIEW) h.toggleHud();
  };

  const direction = (dx: number, dy: number) => {
    const root = h.menuRoot();
    if (root) {
      const f = document.activeElement as HTMLElement | null;
      // A slider takes left and right itself.
      if (f instanceof HTMLInputElement && f.type === 'range' && root.contains(f) && dx) {
        if (dx > 0) f.stepUp();
        else f.stepDown();
        f.dispatchEvent(new Event('input', { bubbles: true }));
        f.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      const to = nextFocus(root, f && root.contains(f) ? f : null, dx, dy);
      to?.focus();
      to?.scrollIntoView({ block: 'nearest' });
    } else if (h.onMap()) h.moveCursor(dx, dy);
  };

  const loop = () => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const pad = [...(navigator.getGamepads?.() ?? [])].find((p) => p && p.connected);
    if (pad) {
      const down = (i: number) => !!pad.buttons[i]?.pressed || (pad.buttons[i]?.value ?? 0) > 0.5;
      for (const b of [A, B, X, Y, LB, RB, LT, RT, VIEW, MENU, L3, R3]) {
        const d = down(b);
        if (d && !prev[b]) press(b);
        prev[b] = d;
      }
      // The D-pad or the left stick: one step, then repeating while held.
      const lx = pad.axes[0] ?? 0;
      const ly = pad.axes[1] ?? 0;
      let dx = down(LEFT) ? -1 : down(RIGHT) ? 1 : Math.abs(lx) > DEAD ? Math.sign(lx) : 0;
      let dy = down(UP) ? -1 : down(DOWN) ? 1 : Math.abs(ly) > DEAD ? Math.sign(ly) : 0;
      // A stick held mostly one way goes that way, so diagonals don't flicker.
      if (!down(LEFT) && !down(RIGHT) && !down(UP) && !down(DOWN) && dx && dy) {
        if (Math.abs(lx) > Math.abs(ly) * 1.6) dy = 0;
        else if (Math.abs(ly) > Math.abs(lx) * 1.6) dx = 0;
      }
      const dir = dx || dy ? `${dx},${dy}` : '';
      if (dir && (dir !== heldDir || now >= nextRepeat)) {
        if (!active) {
          active = true;
          document.body.classList.add('pad');
        }
        direction(dx, dy);
        nextRepeat = now + (dir !== heldDir ? FIRST_REPEAT : REPEAT);
      }
      heldDir = dir;
      // The right stick pans.
      const rx = pad.axes[2] ?? 0;
      const ry = pad.axes[3] ?? 0;
      if (h.onMap() && Math.hypot(rx, ry) > 0.2) h.pan(rx * dt, ry * dt);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
