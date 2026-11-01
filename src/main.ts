// Purrrfect Crime: the entry point. Starts the graphics, wires up input and runs the frame loop.
// The game itself is spread over src/app/ (the UI and turn flow), src/core/ (the rules) and src/render/.
import 'pixi.js/unsafe-eval';
import { showTitle } from './app/between';
import { app, view, world } from './app/camera';
import { $, applySettings, sound } from './app/common';
import { game } from './app/game';
import { bindGamepad } from './app/gamepadWiring';
import { bindButtons, bindKeyboard, bindPointer } from './app/input';
import { tick } from './app/loop';
import { installTestHook } from './app/testHook';
import { loadCharacters } from './render/characters';
import { loadFlats } from './render/flats';
import { loadProps } from './render/props';
import { loadSurfaces } from './render/surfaces';
import * as screens from './ui/screens';

// --- boot -------------------------------------------------------------------------------------

/** Starts the game: the graphics, the art, the input, then the title screen and the frame loop. */
async function boot(): Promise<void> {
  await app.init({
    resizeTo: window,
    background: 0x0a0c18,
    antialias: true,
    resolution: Math.min(2, window.devicePixelRatio || 1),
    autoDensity: true,
  });
  screens.setScreenSound((n) => sound.play(n));
  game.artReady = Promise.all([loadProps(), loadCharacters(), loadSurfaces(), loadFlats()]).then(
    () => void (game.artLoaded = true),
    (e) => console.error('Sprites failed to load', e),
  );
  $('stage').appendChild(app.canvas);
  world.addChild(view.root);
  app.stage.addChild(world);

  bindPointer();
  bindButtons();
  bindKeyboard();
  bindGamepad();
  installTestHook();

  applySettings();
  showTitle();

  // Keep animations in real time on slow machines (but don't leap ahead after the tab was hidden).
  app.ticker.add((tk) => tick(Math.min(0.2, tk.deltaMS / 1000)));
}

boot().catch((e: unknown) => {
  // Without this, a device that can't start the graphics would just show a blank page.
  console.error(e);
  const box = document.getElementById('screens')!;
  box.classList.remove('hidden');
  box.innerHTML = `<div class="screen overlay"><div class="card big"><div class="kicker">Something went wrong</div>
    <h1>The game couldn't start.</h1><p>Your browser couldn't start the graphics. Try another browser, or turn on hardware acceleration.</p>
    <p class="small">${String((e as Error)?.message ?? e).replace(/[<>&]/g, '')}</p></div></div>`;
});
