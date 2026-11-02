// The settings screen: sound, speed, accessibility and controls.
import type { Settings } from '../../settings';
import { on, sfx, show } from './common';
import { controlsSection } from './controls';
import { escToClose } from './title';

// Settings

/** The settings panel. Changes apply immediately; `onClose` returns to the previous screen. */
export function settingsScreen(st: Settings, onChange: (s: Settings) => void, onClose: () => void): void {
  const slider = (id: keyof Settings, label: string) =>
    `<label class="setting"><span>${label}</span><input type="range" min="0" max="100" step="5" data-range="${id}" value="${Math.round((st[id] as number) * 100)}" aria-label="${label}"><output>${Math.round((st[id] as number) * 100)}%</output></label>`;
  const choice = (id: keyof Settings, label: string, options: [string, string][]) =>
    `<div class="setting"><span id="lbl-${id}">${label}</span><div class="seg" role="radiogroup" aria-labelledby="lbl-${id}">${options
      .map(
        ([v, l]) =>
          `<button role="radio" aria-checked="${st[id] === v}" class="${st[id] === v ? 'on' : ''}" data-choice="${id}" data-value="${v}">${l}</button>`,
      )
      .join('')}</div></div>`;
  const toggle = (id: keyof Settings, label: string, hint: string) =>
    `<label class="setting"><span>${label}<br><span class="small">${hint}</span></span><input type="checkbox" data-toggle="${id}" ${st[id] ? 'checked' : ''}></label>`;
  const el = show(
    `<div class="sheet settings" role="dialog" aria-label="Settings">
      <h1 class="sheet-title">Settings</h1>
      <h2 class="section">Sound</h2>
      ${slider('master', 'Volume')}${slider('music', 'Music')}${slider('sfx', 'Sound effects')}
      <h2 class="section">Play</h2>
      ${choice('speed', 'Animation speed', [
        ['normal', 'Normal'],
        ['fast', 'Fast'],
        ['instant', 'Instant'],
      ])}
      ${toggle('hints', 'Tutorial tips', 'The narrator’s tips during the first heist.')}
      ${toggle('lockpickGame', 'Lock picking minigame', 'Stop a spinning pick to open locks. Off: every go works.')}
      <h2 class="section">Accessibility</h2>
      ${toggle('largeText', 'Larger text', 'Bigger text in the HUD and on every screen.')}
      ${toggle('reduceMotion', 'Reduce motion', 'No spinning newspapers or rolling credits; quicker animations.')}
      ${choice('palette', 'Colors', [
        ['standard', 'Standard'],
        ['colorblind', 'Color-blind friendly'],
      ])}
      <h2 class="section">Controls</h2>
      <div class="controls"></div>
      <div class="row-buttons"><button id="settings-ok" class="primary">Done</button></div>
    </div>`,
    'overlay',
  );
  const change = (patch: Partial<Settings>) => {
    Object.assign(st, patch);
    onChange(st);
  };
  el.querySelectorAll<HTMLInputElement>('[data-range]').forEach((i) =>
    i.addEventListener('input', () => {
      i.nextElementSibling!.textContent = `${i.value}%`;
      change({ [i.dataset.range!]: Number(i.value) / 100 } as Partial<Settings>);
    }),
  );
  // A sample click when the volume or effects slider is let go, to hear the new level.
  el.querySelectorAll<HTMLInputElement>('[data-range="master"], [data-range="sfx"]').forEach((i) =>
    i.addEventListener('change', () => sfx('click')),
  );
  el.querySelectorAll<HTMLInputElement>('[data-toggle]').forEach((i) =>
    i.addEventListener('change', () => change({ [i.dataset.toggle!]: i.checked } as Partial<Settings>)),
  );
  on(el, '[data-choice]', (e) => {
    const b = e.currentTarget as HTMLElement;
    change({ [b.dataset.choice!]: b.dataset.value } as Partial<Settings>);
    b.parentElement!.querySelectorAll('button').forEach((x) => {
      x.classList.toggle('on', x === b);
      x.setAttribute('aria-checked', String(x === b));
    });
  });
  controlsSection(el.querySelector<HTMLElement>('.controls')!, st, change);
  on(el, '#settings-ok', onClose);
  escToClose(el, onClose);
  // Start at the top (Sound), not scrolled down to the Done button.
  el.querySelector<HTMLElement>('[data-range="master"]')?.focus();
}
