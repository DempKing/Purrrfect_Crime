// The title screen and the save slots.
import { playerLevel, type Profile } from '../../meta/profile';
import { KEY_ART } from '../pictures';
import { on, show } from './common';

// --- Title and save slots ---------------------------------------------------------------------

export interface TitleCallbacks {
  /** The game played last, if there is one. */
  lastSlot: number | null;
  onPlay: (slot: number) => void;
  onNew: (slot: number) => void;
  onDelete: (slot: number) => void;
  onSettings: () => void;
  onCredits: () => void;
}
function slotSummary(p: Profile): string {
  const where = !p.tutorialDone
    ? 'In the tutorial'
    : !p.lairOwned
      ? 'Looking for a lair'
      : `Day ${p.day} · ${p.heists} heist${p.heists === 1 ? '' : 's'}`;
  return `Level ${playerLevel(p.xp)} · ${where}<br>${p.catnip.toLocaleString('en-US')} Catnip${p.legendary ? ' · <b>Legendary</b>' : ''}`;
}
/**
 * The title: the logo over the key art, and a menu (Continue, New Game, Load), with Credits in the bottom left
 * and Settings in the bottom right. Load and "which game to replace" open as a panel over it; Esc closes it.
 */
export function titleScreen(slots: (Profile | null)[], cb: TitleCallbacks): void {
  const saved = slots.some(Boolean);
  const last = cb.lastSlot !== null && slots[cb.lastSlot] ? cb.lastSlot : slots.findIndex(Boolean);
  const free = slots.findIndex((p) => !p);
  const el = show(
    `<div class="title-art" style="background-image:url(${KEY_ART})"></div>
    <div class="poster">
      <h1 class="logo"><span>Purrrfect</span><span>Crime</span></h1>
      <p class="poster-tagline">Sneak in. Steal big. Leave nothing but a calling card.</p>
      <nav class="title-menu" aria-label="Main menu">
        ${saved ? `<button id="continue" class="primary"><b>Continue</b><small>${last >= 0 ? `Game ${last + 1} · ${slotSummary(slots[last]!).replace('<br>', ' · ')}` : ''}</small></button>` : ''}
        <button id="new-game" class="${saved ? '' : 'primary'}"><b>New game</b>${free < 0 ? '<small>All three games are in use: pick one to replace</small>' : ''}</button>
        <button id="load" ${saved ? '' : 'disabled'}><b>Load</b></button>
      </nav>
      <div id="slot-panel" class="slot-panel hidden" role="dialog"></div>
    </div>
    <button id="title-credits" class="corner-btn left">Credits</button>
    <button id="title-settings" class="corner-btn right">Settings</button>`,
    'title-screen',
  );
  const panel = el.querySelector<HTMLElement>('#slot-panel')!;
  /** The three games as tags, to load or (for a new game) replace. */
  const openPanel = (mode: 'load' | 'replace') => {
    panel.innerHTML = `<h2>${mode === 'load' ? 'Load a game' : 'Replace which game?'}</h2><div class="slots">${slots
      .map((p, i) => {
        const body = p
          ? `<div class="tag-body"><span class="tag-no">Game ${i + 1}</span><span class="tag-info">${slotSummary(p)}</span></div>
              <div class="row-buttons">${mode === 'load' ? `<button class="primary" data-play="${i}">Load</button><button class="quiet" data-delete="${i}">Delete</button>` : `<button class="primary" data-replace="${i}">Replace</button>`}</div>`
          : `<div class="tag-body"><span class="tag-no">Game ${i + 1}</span><span class="tag-info">Empty</span></div>
              <div class="row-buttons"><button class="primary" data-new="${i}">New game</button></div>`;
        return `<div class="slot ${p ? '' : 'empty'}">${body}</div>`;
      })
      .join('')}</div><button class="quiet" id="panel-close">Back (Esc)</button>`;
    panel.classList.remove('hidden');
    on(panel, '[data-play]', (e) => cb.onPlay(Number((e.currentTarget as HTMLElement).dataset.play)));
    on(panel, '[data-new]', (e) => cb.onNew(Number((e.currentTarget as HTMLElement).dataset.new)));
    on(panel, '[data-replace]', (e) => {
      const b = e.currentTarget as HTMLElement;
      if (b.dataset.armed) return cb.onNew(Number(b.dataset.replace));
      b.dataset.armed = '1';
      b.textContent = 'Really replace it?';
    });
    on(panel, '[data-delete]', (e) => {
      const b = e.currentTarget as HTMLElement;
      if (b.dataset.armed) return cb.onDelete(Number(b.dataset.delete));
      b.dataset.armed = '1';
      b.textContent = 'Really delete?';
    });
    on(panel, '#panel-close', closePanel);
  };
  const closePanel = () => panel.classList.add('hidden');
  on(el, '#continue', () => last >= 0 && cb.onPlay(last));
  on(el, '#new-game', () => (free >= 0 ? cb.onNew(free) : openPanel('replace')));
  on(el, '#load', () => openPanel('load'));
  on(el, '#title-settings', cb.onSettings);
  on(el, '#title-credits', cb.onCredits);
  escToClose(el, () => !panel.classList.contains('hidden') && (closePanel(), true));
}
/**
 * Esc for whatever is open on a screen: `close` returns true if it closed something. The listener goes away with
 * the screen.
 */
export function escToClose(el: HTMLElement, close: () => boolean | void): void {
  const onKey = (e: KeyboardEvent) => {
    if (!el.isConnected) return window.removeEventListener('keydown', onKey);
    if (e.key === 'Escape' && close() !== false) e.preventDefault();
  };
  window.addEventListener('keydown', onKey);
}
