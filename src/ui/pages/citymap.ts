// The city map, where the player buys the lair.
import { LAIR_PRICE, type Profile } from '../../meta/profile';
import { catnip, NARRATOR_SVG, on, show } from './common';

// The city map: buying the lair

export function cityMap(p: Profile, onBuy: () => void): void {
  // A printed street map: blocks between the streets, the river along the bottom, district names.
  const blocks: string[] = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 6; c++) {
      const x = 24 + c * 94;
      const y = 30 + r * 92;
      // The landmarks, the park and the lair are drawn on their own.
      if ((c === 1 && r === 0) || (c === 2 && r === 1) || (c === 4 && r === 1) || (c === 0 && r === 2))
        continue;
      blocks.push(`<rect x="${x}" y="${y}" width="78" height="74" class="block"/>`);
    }
  const el = show(
    `<div class="citymap">
      <div class="caption-box map-head"><div class="speaker"><div class="portrait-frame">${NARRATOR_SVG}</div><div><span class="speaker-name">The narrator</span><p>Every thief needs a headquarters, kid. There's an abandoned building on the edge of Old Town. It's a wreck, but it's cheap. Find it on the map.</p></div></div></div>
      <svg viewBox="0 0 600 380" class="map-svg">
        <rect width="600" height="380" class="map-paper"/>
        <path d="M0 330 C120 310 200 352 320 336 C430 322 520 348 600 330 L600 380 L0 380Z" class="river"/>
        ${blocks.join('')}
        <g class="park"><rect x="400" y="122" width="78" height="74"/><circle cx="425" cy="148" r="9"/><circle cx="452" cy="170" r="11"/><circle cx="440" cy="140" r="7"/></g>
        <text x="80" y="20" class="district">OLD TOWN</text><text x="300" y="20" class="district">MUSEUM MILE</text><text x="510" y="20" class="district">THE HEIGHTS</text>
        <text x="110" y="364" class="district">HARBOUR</text><text x="470" y="364" class="district">DOWNTOWN</text>
        <text x="300" y="318" class="street">RIVER STREET</text>
        <g class="landmark"><rect x="118" y="30" width="78" height="74"/><text x="157" y="70">Corner Gallery</text></g>
        <g class="landmark"><rect x="212" y="122" width="78" height="74"/><text x="251" y="162">City Museum</text></g>
        <g id="lair-building" class="for-sale" role="button" tabindex="0" aria-label="The abandoned building, for sale"><rect x="24" y="214" width="78" height="74"/>
          <text x="63" y="246">Abandoned</text><text x="63" y="260">building</text></g>
        <g class="marked" aria-hidden="true">
          <path d="M14 250 C10 214 40 202 66 205 C100 208 116 230 110 258 C104 290 64 300 36 292 C18 286 12 268 16 248" class="marker"/>
          <text x="140" y="300" class="scribble">for sale! ${LAIR_PRICE} Catnip</text><path d="M136 292 C122 286 112 280 106 272" class="marker thin"/></g>
        <path d="M560 40 L560 70 M552 48 L560 36 L568 48" class="compass"/><text x="560" y="84" class="street">N</text>
      </svg>
      <div id="buy-box" class="note-card buy-box hidden"><p>Buy the abandoned building for ${catnip(LAIR_PRICE)} Catnip? It will be your lair.</p>
        <div class="row-buttons"><button id="buy" class="primary">Buy it</button><button id="not-yet" class="quiet">Not yet</button></div></div>
      <p class="small">You have ${catnip(p.catnip)} Catnip.</p>
    </div>`,
    'overlay desk-bg',
  );
  const b = el.querySelector('#lair-building')!;
  const box = el.querySelector('#buy-box')!;
  const ask = () => box.classList.remove('hidden');
  b.addEventListener('click', ask);
  b.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && ask());
  on(el, '#buy', onBuy);
  on(el, '#not-yet', () => box.classList.add('hidden'));
}
