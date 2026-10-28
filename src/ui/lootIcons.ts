// A drawn picture for every piece of loot that has no painted one: picked from its name (coins, gems, a
// framed painting, a pocket watch, a scroll, a figurine...) and coloured by what it's made of. Plain SVG, so
// the menus can show it as it is and the heists can turn it into a texture.
import type { LootCategory } from '../core/level';

const INK = '#22190f';

/** Colours for what a thing is made of: [light, mid, dark]. */
const MATERIALS: [RegExp, [string, string, string]][] = [
  [/jade/i, ['#b8f0c8', '#4fb37a', '#1f6b45']],
  [/sapphire/i, ['#bfe0ff', '#2f6fe0', '#14307a']],
  [/emerald/i, ['#c8ffd8', '#22b35e', '#0d5a2c']],
  [/ruby/i, ['#ffc8d0', '#e0263f', '#7a0d1a']],
  [/rose quartz/i, ['#ffe0ea', '#f2a6bf', '#b5677f']],
  [/opal/i, ['#f4fbff', '#a8d8f0', '#8a7fd0']],
  [/faience/i, ['#a8f0f0', '#2fb3b8', '#13666b']],
  [/ice|crystal/i, ['#f0fbff', '#bfe6f5', '#7fb0c8']],
  [/ivory|bone|skull|fang|comb/i, ['#fffaf0', '#e8dcc0', '#a8987a']],
  [/silver|platinum|pewter|herring/i, ['#ffffff', '#c8cdd8', '#6e7584']],
  [/bronze/i, ['#f0b880', '#b8763a', '#6b3f18']],
  [/coral/i, ['#ffd0c0', '#f0705a', '#a83a2a']],
  [/black pearl|black/i, ['#8a8aa8', '#3a3a52', '#14141f']],
];
const GOLD: [string, string, string] = ['#fff1b0', '#e2b13c', '#8a6418'];

function material(name: string): [string, string, string] {
  return MATERIALS.find(([r]) => r.test(name))?.[1] ?? GOLD;
}

/** A gem's colour, by its name. */
function gemColour(name: string): [string, string, string] {
  if (/sapphire/i.test(name)) return ['#bfe0ff', '#2f6fe0', '#14307a'];
  if (/emerald/i.test(name)) return ['#c8ffd8', '#22b35e', '#0d5a2c'];
  if (/ruby|royal flush/i.test(name)) return ['#ffc8d0', '#e0263f', '#7a0d1a'];
  if (/topaz|siam/i.test(name)) return ['#fff2b8', '#f2b52a', '#8a5a0d'];
  if (/opal/i.test(name)) return ['#ffffff', '#b8e0f8', '#9a8ae0'];
  if (/quartz/i.test(name)) return ['#ffe8f0', '#f0a8c8', '#a85a7a'];
  return ['#ffffff', '#d8f0ff', '#7fa8c8']; // diamonds
}

/** A number from a name, for small differences between pictures of the same kind. */
function hash(s: string): number {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
}

const grad = (id: string, [a, b, c]: [string, string, string]) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="0.5" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`;
const stroke = `stroke="${INK}" stroke-width="2" stroke-linejoin="round"`;

function painting(name: string): string {
  const h = hash(name);
  const sky = [['#1d2b5a', '#3a5a9a'], ['#5a2a3a', '#e0905a'], ['#2a4a3a', '#8ab07a'], ['#3a2a5a', '#9a7ad0']][Math.floor(h * 4)];
  let scene = `<rect x="11" y="15" width="42" height="34" fill="url(#sky)"/><path d="M11 40 Q24 33 34 38 T53 36 V49 H11Z" fill="#2a3a22" opacity="0.85"/><circle cx="${20 + h * 22}" cy="23" r="4" fill="#fff3c4"/>`;
  if (/portrait|pug|gentleman|chairman|fishmonger|earring|mona|whiskers/i.test(name)) {
    const dog = /pug|fishmonger/i.test(name);
    scene = `<rect x="11" y="15" width="42" height="34" fill="${sky[0]}"/><path d="M18 49 Q32 34 46 49Z" fill="#2a2030"/>${dog ? '<ellipse cx="32" cy="31" rx="9" ry="8" fill="#c8a070"/><ellipse cx="32" cy="34" rx="4" ry="3" fill="#3a2a1a"/>' : '<path d="M24 25 L25 17 L29 22 L35 22 L39 17 L40 25 Q40 36 32 36 Q24 36 24 25Z" fill="#1d1d24"/><circle cx="29" cy="27" r="1.4" fill="#d9e85a"/><circle cx="35" cy="27" r="1.4" fill="#d9e85a"/>'}${/earring/i.test(name) ? '<circle cx="40" cy="31" r="1.8" fill="#fff"/>' : ''}`;
  } else if (/sea|storm|kraken|underwater/i.test(name)) {
    scene = `<rect x="11" y="15" width="42" height="34" fill="${/underwater/i.test(name) ? '#1a5a7a' : '#2a3450'}"/><path d="M11 34 Q17 28 23 34 T35 34 T47 34 T53 33 V49 H11Z" fill="#2f6f9a"/><path d="M11 41 Q17 36 23 41 T35 41 T53 40" fill="none" stroke="#bfe6f5" stroke-width="1.5"/>${/kraken/i.test(name) ? '<path d="M24 49 Q22 38 28 36 M32 49 Q34 36 40 38" stroke="#3a1a3a" stroke-width="3" fill="none"/>' : ''}`;
  } else if (/fish|tuna|sardine|goldfish|lilies/i.test(name)) {
    scene = `<rect x="11" y="15" width="42" height="34" fill="${sky[0]}"/><ellipse cx="32" cy="42" rx="16" ry="4" fill="#e8dcc0"/><path d="M20 36 Q30 28 40 36 Q30 42 20 36Z M40 36 L46 31 L46 41Z" fill="${/gold|lilies/i.test(name) ? '#f2a03a' : '#9ab0c0'}"/>`;
  } else if (/cubist|mouse|yarn|composition|prank|period/i.test(name)) {
    scene = `<rect x="11" y="15" width="42" height="34" fill="${/blue/i.test(name) ? '#2f5aa8' : '#e8dcc0'}"/><rect x="15" y="19" width="14" height="12" fill="#e0263f"/><rect x="31" y="25" width="18" height="10" fill="#f2c94c"/><circle cx="24" cy="40" r="6" fill="#2f6fe0"/><path d="M36 38 L48 46 L36 46Z" fill="#1d1d24"/>`;
  } else if (/poker|dog/i.test(name)) {
    scene = `<rect x="11" y="15" width="42" height="34" fill="#2a4a2a"/><rect x="20" y="30" width="8" height="12" rx="1" fill="#fff" transform="rotate(-12 24 36)"/><rect x="30" y="29" width="8" height="12" rx="1" fill="#fff" transform="rotate(8 34 35)"/><circle cx="26" cy="22" r="5" fill="#c8a070"/><circle cx="40" cy="22" r="5" fill="#8a6a4a"/>`;
  } else if (/invisible/i.test(name)) {
    scene = `<rect x="11" y="15" width="42" height="34" fill="#f6f1e4"/>`;
  } else if (/drawing|sketch|engraver|ink/i.test(name)) {
    scene = `<rect x="11" y="15" width="42" height="34" fill="#efe2c4"/><path d="M18 42 Q26 22 32 30 T46 24" fill="none" stroke="#5a3a1a" stroke-width="1.5"/><circle cx="30" cy="26" r="5" fill="none" stroke="#5a3a1a" stroke-width="1.2"/>`;
  } else if (/sunset|rooftop/i.test(name)) {
    scene = `<rect x="11" y="15" width="42" height="34" fill="#e0905a"/><circle cx="32" cy="36" r="8" fill="#fff0a0"/><path d="M11 40 H17 V32 H23 V38 H29 V30 H35 V40 H41 V34 H47 V40 H53 V49 H11Z" fill="#2a1a2a"/>`;
  }
  const frame = h > 0.5 ? GOLD : ['#c89a6a', '#7a4a22', '#3a200a'];
  return `<defs>${grad('fr', frame as [string, string, string])}<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>
    <rect x="5" y="9" width="54" height="46" rx="2" fill="url(#fr)" ${stroke}/>${scene}<rect x="11" y="15" width="42" height="34" fill="none" stroke="${INK}" stroke-width="1.5"/>`;
}

function scroll(name: string): string {
  const map = /chart|map|sea/i.test(name);
  return `<path d="M12 16 H50 V48 H12Z" fill="${map ? '#e8d6a8' : '#efe2c4'}" ${stroke}/>${map ? '<path d="M18 40 Q24 28 30 34 T44 22" fill="none" stroke="#a8462a" stroke-width="1.5" stroke-dasharray="3 2"/><text x="40" y="44" font-size="9" fill="#a8462a" font-family="serif">x</text><circle cx="22" cy="24" r="3" fill="none" stroke="#5a3a1a"/>' : '<path d="M18 24 H44 M18 30 H44 M18 36 H38" stroke="#5a4a3a" stroke-width="1.5"/>'}
    <rect x="8" y="12" width="8" height="40" rx="4" fill="#c8a070" ${stroke}/><rect x="46" y="12" width="8" height="40" rx="4" fill="#c8a070" ${stroke}/>${/charter|deeds|sealed/i.test(name) ? `<circle cx="38" cy="42" r="5" fill="#b3261e" ${stroke}/>` : ''}`;
}

function papers(name: string): string {
  const card = /calling card/i.test(name);
  if (card) return `<rect x="10" y="20" width="44" height="28" rx="3" fill="#fbf7ea" ${stroke} transform="rotate(-6 32 34)"/><path d="M24 30 L32 34 L24 38Z M40 30 L32 34 L40 38Z" fill="#d8262f"/>`;
  const money = /dollar|bonds|ious|cash|takings/i.test(name);
  return `<rect x="14" y="16" width="38" height="30" fill="${money ? '#cfe3c0' : '#efe2c4'}" ${stroke} transform="rotate(8 32 32)"/><rect x="12" y="20" width="38" height="30" fill="${money ? '#d8ecc8' : '#f6eed8'}" ${stroke} transform="rotate(-4 32 34)"/>${money ? '<circle cx="31" cy="35" r="6" fill="none" stroke="#3a6a2a" stroke-width="1.5"/><text x="28" y="39" font-size="10" fill="#3a6a2a" font-family="serif">$</text>' : /stamps/i.test(name) ? '<rect x="18" y="26" width="10" height="12" fill="#e0263f" stroke="#fff" stroke-dasharray="2 1"/><rect x="31" y="26" width="10" height="12" fill="#2f6fe0" stroke="#fff" stroke-dasharray="2 1"/>' : '<path d="M18 30 H44 M18 35 H44 M18 40 H36" stroke="#5a4a3a" stroke-width="1.4"/>'}`;
}

function book(name: string): string {
  const col = /memoir|nightclaw/i.test(name) ? '#2a1a3a' : /moby/i.test(name) ? '#1f3a5a' : /ledger/i.test(name) ? '#2a4a2a' : '#6b2a1e';
  return `<path d="M14 14 H48 Q52 14 52 18 V50 H18 Q14 50 14 46Z" fill="${col}" ${stroke}/><path d="M18 46 H52" stroke="#efe2c4" stroke-width="3"/><rect x="24" y="22" width="20" height="8" fill="none" stroke="#e2b13c" stroke-width="1.5"/><path d="M14 14 V46" stroke="#e2b13c" stroke-width="2"/>`;
}

function coins(name: string): string {
  const m = material(name);
  const many = /bag|coins|set|planchets|shipwreck|doubloons|scale/i.test(name);
  const one = (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#m)" ${stroke}/><circle cx="${x}" cy="${y}" r="${r * 0.72}" fill="none" stroke="${m[2]}" stroke-width="1.5"/><path d="M${x - r * 0.3} ${y - r * 0.15} L${x - r * 0.2} ${y - r * 0.45} L${x} ${y - r * 0.25} L${x + r * 0.2} ${y - r * 0.45} L${x + r * 0.3} ${y - r * 0.15} Q${x + r * 0.3} ${y + r * 0.3} ${x} ${y + r * 0.3} Q${x - r * 0.3} ${y + r * 0.3} ${x - r * 0.3} ${y - r * 0.15}Z" fill="${m[2]}" opacity="0.7"/>`;
  if (/bag/i.test(name)) return `<defs>${grad('m', m)}</defs><path d="M20 22 Q14 52 32 54 Q50 52 44 22Z" fill="#8a6a3a" ${stroke}/><path d="M22 22 Q32 16 42 22" fill="none" ${stroke}/>${one(32, 22, 7)}${one(24, 18, 6)}${one(40, 18, 6)}`;
  return `<defs>${grad('m', m)}</defs>${many ? one(22, 40, 11) + one(42, 40, 11) + one(32, 24, 13) : one(32, 32, 20)}`;
}

function gem(name: string): string {
  const g = gemColour(name);
  const many = /diamonds|emeralds/i.test(name);
  const one = (x: number, y: number, s: number) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-14 -6 L-8 -14 H8 L14 -6 L0 14Z" fill="${g[1]}" ${stroke}/><path d="M-14 -6 H14 M-8 -14 L-4 -6 L0 14 M8 -14 L4 -6 L0 14 M-4 -6 L0 -14 L4 -6" fill="none" stroke="${g[2]}" stroke-width="1"/><path d="M-8 -14 L-4 -6 H-14Z" fill="${g[0]}"/></g>`;
  if (/uncut|nugget|geode|meteorite/i.test(name)) return rock(name);
  return many ? one(22, 38, 0.9) + one(42, 38, 0.9) + one(32, 24, 1) : one(32, 32, 1.5);
}

function rock(name: string): string {
  const gold = /gold|nugget/i.test(name);
  const geode = /geode/i.test(name);
  const col = gold ? GOLD : /emerald/i.test(name) ? (['#b8f0c8', '#3fa86a', '#14502c'] as [string, string, string]) : (['#8a8a9a', '#4a4a5a', '#1d1d2a'] as [string, string, string]);
  return `<defs>${grad('m', col)}</defs><path d="M14 38 L20 20 L36 14 L50 24 L52 42 L36 52 L20 50Z" fill="url(#m)" ${stroke}/>${geode ? '<ellipse cx="34" cy="34" rx="12" ry="10" fill="#7a4ab0"/><path d="M26 34 L30 28 L34 34 L38 27 L42 34" fill="none" stroke="#e0c8ff" stroke-width="2"/>' : '<path d="M22 30 L30 26 M38 36 L44 32" stroke="#ffffff" opacity="0.5" stroke-width="2"/>'}`;
}

function pearls(name: string): string {
  const m = material(name);
  const black = /black/i.test(name);
  const fill = black ? '#3a3a52' : '#f6f2ea';
  if (/cufflinks/i.test(name)) return `<circle cx="22" cy="32" r="10" fill="${/diamond/i.test(name) ? '#d8f0ff' : fill}" ${stroke}/><circle cx="42" cy="32" r="10" fill="${/diamond/i.test(name) ? '#d8f0ff' : fill}" ${stroke}/><circle cx="19" cy="29" r="3" fill="#fff" opacity="0.7"/><circle cx="39" cy="29" r="3" fill="#fff" opacity="0.7"/><rect x="18" y="42" width="8" height="5" fill="${m[1]}" ${stroke}/><rect x="38" y="42" width="8" height="5" fill="${m[1]}" ${stroke}/>`;
  if (/captain|moonlit|black pearl of/i.test(name)) return `<ellipse cx="32" cy="44" rx="18" ry="6" fill="#d8b8c8" ${stroke}/><circle cx="32" cy="34" r="12" fill="${fill}" ${stroke}/><circle cx="28" cy="30" r="4" fill="#fff" opacity="0.8"/>`;
  let beads = '';
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * (0.1 + (i / 10) * 0.8);
    beads += `<circle cx="${32 - Math.cos(a) * 20}" cy="${18 + Math.sin(a) * 26}" r="4.2" fill="${fill}" stroke="${INK}" stroke-width="1.2"/>`;
  }
  return beads;
}

function crown(name: string): string {
  const m = material(name);
  const tiara = /tiara/i.test(name);
  const jewel = /narwhal/i.test(name) ? '#bfe6f5' : /coral/i.test(name) ? '#f0705a' : '#e0263f';
  return `<defs>${grad('m', m)}</defs>${
    tiara
      ? `<path d="M10 44 Q32 30 54 44 L50 46 Q32 36 14 46Z" fill="url(#m)" ${stroke}/><path d="M20 39 L22 28 L26 37 L32 20 L38 37 L42 28 L44 39" fill="url(#m)" ${stroke}/>${/narwhal/i.test(name) ? `<path d="M32 20 L33 6 L31 6Z" fill="#f0f0f0" ${stroke}/>` : ''}`
      : `<path d="M12 46 L10 22 L22 32 L32 16 L42 32 L54 22 L52 46Z" fill="url(#m)" ${stroke}/><rect x="12" y="44" width="40" height="7" fill="url(#m)" ${stroke}/>`
  }<circle cx="32" cy="${tiara ? 28 : 36}" r="4" fill="${jewel}" ${stroke}/>${/pharaoh/i.test(name) ? '<path d="M20 46 L22 52 M44 46 L42 52" stroke="#2f6fe0" stroke-width="4"/>' : ''}`;
}

function medal(name: string): string {
  const m = material(name);
  if (/chain/i.test(name)) return `<defs>${grad('m', m)}</defs><path d="M12 12 Q32 46 52 12" fill="none" stroke="${m[1]}" stroke-width="5" stroke-dasharray="5 2"/><circle cx="32" cy="42" r="12" fill="url(#m)" ${stroke}/><path d="M32 35 L34 40 L39 40 L35 43 L37 48 L32 45 L27 48 L29 43 L25 40 L30 40Z" fill="${m[2]}"/>`;
  const many = /medals/i.test(name);
  const one = (x: number, col: string) => `<path d="M${x - 6} 10 H${x + 6} L${x + 4} 30 H${x - 4}Z" fill="${col}" ${stroke}/><circle cx="${x}" cy="38" r="10" fill="url(#m)" ${stroke}/><path d="M${x} 32 L${x + 2} 37 L${x + 7} 37 L${x + 3} 40 L${x + 5} 45 L${x} 42 L${x - 5} 45 L${x - 3} 40 L${x - 7} 37 L${x - 2} 37Z" fill="${m[2]}"/>`;
  return `<defs>${grad('m', m)}</defs>${many ? one(20, '#2f4fa8') + one(44, '#a8262f') : one(32, '#2f4fa8')}`;
}

function trophy(name: string): string {
  return `<defs>${grad('m', material(name))}</defs><path d="M18 12 H46 V24 Q46 38 32 40 Q18 38 18 24Z" fill="url(#m)" ${stroke}/><path d="M18 16 Q8 16 10 26 Q12 32 19 30 M46 16 Q56 16 54 26 Q52 32 45 30" fill="none" ${stroke}/><rect x="29" y="40" width="6" height="6" fill="url(#m)" ${stroke}/><rect x="20" y="46" width="24" height="8" fill="#3a2a1a" ${stroke}/>${/polo/i.test(name) ? '<path d="M27 22 L37 30 M37 22 L27 30" stroke="#fff" stroke-width="1.5"/>' : ''}`;
}

function bell(name: string): string {
  const col = /sapphire/i.test(name) ? gemColour('sapphire') : /ruby/i.test(name) ? gemColour('ruby') : material(name);
  return `<defs>${grad('m', col)}</defs><path d="M32 10 Q20 12 18 30 Q17 40 10 46 H54 Q47 40 46 30 Q44 12 32 10Z" fill="url(#m)" ${stroke}/><circle cx="32" cy="50" r="5" fill="${col[1]}" ${stroke}/><rect x="29" y="5" width="6" height="6" fill="${col[1]}" ${stroke}/>`;
}

function egg(name: string): string {
  const m = /dodo/i.test(name) ? (['#fbf6ea', '#e8dcc0', '#9a8a6a'] as [string, string, string]) : material(name);
  return `<defs>${grad('m', m)}</defs><ellipse cx="32" cy="50" rx="16" ry="5" fill="#3a2a1a" opacity="0.4"/><path d="M32 8 Q48 10 48 34 Q48 50 32 50 Q16 50 16 34 Q16 10 32 8Z" fill="url(#m)" ${stroke}/>${/dodo/i.test(name) ? '<circle cx="26" cy="26" r="2" fill="#9a8a6a"/><circle cx="36" cy="34" r="1.6" fill="#9a8a6a"/>' : '<path d="M18 30 Q32 36 46 30" fill="none" stroke="#8a6418" stroke-width="1.5"/>'}<ellipse cx="26" cy="20" rx="3" ry="5" fill="#fff" opacity="0.6"/>`;
}

function mask(name: string): string {
  if (/eyepatch/i.test(name)) return `<path d="M8 22 Q32 30 56 18" fill="none" ${stroke}/><path d="M20 24 Q32 22 36 30 Q34 44 24 42 Q16 38 20 24Z" fill="#1d1d24" ${stroke}/><path d="M22 34 L32 34 M27 29 L27 39" stroke="#e8dcc0" stroke-width="1.5"/>`;
  const gold = /death|gold/i.test(name);
  return `<defs>${grad('m', gold ? GOLD : ['#fbf7ea', '#e8e2d4', '#9a9282'])}</defs><path d="M10 22 Q32 8 54 22 Q56 40 40 46 Q32 40 24 46 Q8 40 10 22Z" fill="url(#m)" ${stroke}/><path d="M18 26 Q24 22 28 28 Q22 32 18 26Z M46 26 Q40 22 36 28 Q42 32 46 26Z" fill="${INK}"/>${gold ? '<path d="M18 12 L20 4 L26 12 M46 12 L44 4 L38 12" fill="#e2b13c" stroke="#22190f" stroke-width="1.5"/>' : ''}`;
}

function watch(name: string): string {
  const m = material(name);
  if (/music box/i.test(name)) return `<defs>${grad('m', ['#5a3a6a', '#2a1a3a', '#14081f'])}</defs><rect x="10" y="28" width="44" height="24" rx="2" fill="url(#m)" ${stroke}/><path d="M10 28 L16 12 H58 L54 28" fill="#3a2a4a" ${stroke}/><circle cx="32" cy="40" r="5" fill="#e2b13c"/><path d="M40 20 Q44 16 48 20" stroke="#e2b13c" fill="none" stroke-width="1.5"/>`;
  return `<defs>${grad('m', m)}</defs><path d="M32 8 Q40 2 44 8" fill="none" stroke="${m[1]}" stroke-width="2.5"/><rect x="29" y="8" width="6" height="6" fill="url(#m)" ${stroke}/><circle cx="32" cy="34" r="20" fill="url(#m)" ${stroke}/><circle cx="32" cy="34" r="15" fill="#fbf6ea" stroke="${INK}" stroke-width="1.5"/><path d="M32 34 L32 24 M32 34 L39 37" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
}

function instrument(name: string): string {
  const m = material(name);
  if (/telescope/i.test(name)) return `<defs>${grad('m', m)}</defs><path d="M10 44 L44 18 L50 26 L16 52Z" fill="url(#m)" ${stroke}/><path d="M42 16 L52 28" stroke="${INK}" stroke-width="5"/><path d="M24 38 L30 44" stroke="${m[2]}" stroke-width="2"/>`;
  if (/lens/i.test(name)) return `<circle cx="32" cy="32" r="22" fill="#d8f0ff" ${stroke}/><circle cx="32" cy="32" r="16" fill="none" stroke="#7fa8c8" stroke-width="2"/><circle cx="32" cy="32" r="9" fill="none" stroke="#7fa8c8" stroke-width="2"/><circle cx="25" cy="25" r="4" fill="#fff"/>`;
  if (/scales/i.test(name)) return `<defs>${grad('m', m)}</defs><path d="M32 10 V48 M14 18 H50" ${stroke} fill="none"/><path d="M8 34 L14 18 L20 34Z M44 34 L50 18 L56 34Z" fill="url(#m)" ${stroke}/><rect x="22" y="48" width="20" height="6" fill="url(#m)" ${stroke}/>`;
  if (/die\b|handle/i.test(name)) return `<defs>${grad('m', m)}</defs><rect x="20" y="10" width="24" height="36" rx="3" fill="url(#m)" ${stroke}/><circle cx="32" cy="50" r="7" fill="url(#m)" ${stroke}/><text x="26" y="34" font-size="14" fill="${m[2]}" font-family="serif">$</text>`;
  // An astrolabe, sextant or compass: a brass ring with spokes and a pointer.
  return `<defs>${grad('m', m)}</defs><circle cx="32" cy="32" r="22" fill="url(#m)" ${stroke}/><circle cx="32" cy="32" r="16" fill="#2a2a3a" stroke="${INK}" stroke-width="1.5"/><path d="M32 16 V48 M16 32 H48 M21 21 L43 43 M43 21 L21 43" stroke="${m[1]}" stroke-width="1.2"/><path d="M32 18 L36 32 L32 46 L28 32Z" fill="${m[0]}" ${stroke}/>`;
}

function vessel(name: string): string {
  if (/globe/i.test(name)) return `<circle cx="32" cy="28" r="18" fill="#d8f0ff" opacity="0.9" ${stroke}/><path d="M24 34 L28 22 L30 34Z" fill="#e0263f"/><path d="M20 34 Q32 30 44 34" stroke="#fff" stroke-width="2" fill="none"/><path d="M18 44 H46 L42 54 H22Z" fill="#6b4a2a" ${stroke}/>`;
  if (/tankard/i.test(name)) return `<defs>${grad('m', material('pewter'))}</defs><rect x="16" y="14" width="26" height="38" rx="3" fill="url(#m)" ${stroke}/><path d="M42 20 Q54 22 52 34 Q50 42 42 42" fill="none" ${stroke}/><path d="M16 20 H42" stroke="#6e7584" stroke-width="2"/>`;
  if (/can\b|tin\b/i.test(name)) return `<defs>${grad('m', material(name))}</defs><ellipse cx="32" cy="16" rx="18" ry="5" fill="url(#m)" ${stroke}/><path d="M14 16 V48 Q32 54 50 48 V16" fill="${/soup/i.test(name) ? '#e0263f' : 'url(#m)'}" ${stroke}/><rect x="14" y="26" width="36" height="12" fill="${/soup/i.test(name) ? '#fbf7ea' : '#2f6fe0'}" opacity="0.9"/>`;
  if (/jar|canopic/i.test(name)) return `<path d="M20 22 Q16 50 32 52 Q48 50 44 22Z" fill="#c8b890" ${stroke}/><path d="M22 12 Q32 6 42 12 L44 22 H20Z" fill="#2fb3b8" ${stroke}/><path d="M26 32 H38 M28 38 H36" stroke="#2fb3b8" stroke-width="2"/>`;
  // A bottle (a message in it, or a ship).
  return `<path d="M26 8 H38 V18 Q50 22 50 34 V50 Q50 54 46 54 H18 Q14 54 14 50 V34 Q14 22 26 18Z" fill="#a8d8c0" opacity="0.85" ${stroke}/><rect x="27" y="4" width="10" height="6" fill="#8a6a3a" ${stroke}/>${/ship/i.test(name) ? '<path d="M20 44 H44 L40 50 H24Z" fill="#6b4a2a"/><path d="M32 26 V44 L42 42Z" fill="#fbf7ea"/>' : '<rect x="22" y="32" width="20" height="10" fill="#efe2c4" transform="rotate(-10 32 37)"/>'}`;
}

function box(name: string): string {
  const cash = /cash|takings|petty|donations/i.test(name);
  const crate = /crate|capsule/i.test(name);
  const col = crate ? '#a07a48' : cash ? '#4a5a6a' : /snuff/i.test(name) ? '#c8cdd8' : /untitled/i.test(name) ? '#c8a878' : '#5a3a2a';
  return `<path d="M10 24 L32 16 L54 24 L32 32Z" fill="${col}" ${stroke} opacity="0.9"/><path d="M10 24 V46 L32 54 V32Z" fill="${col}" ${stroke}/><path d="M54 24 V46 L32 54 V32Z" fill="${col}" ${stroke} opacity="0.75"/>${cash ? '<path d="M24 22 L40 22" stroke="#14141f" stroke-width="3"/><text x="38" y="44" font-size="10" fill="#e2b13c" font-family="serif">$</text>' : crate ? '<path d="M10 34 L32 42 L54 34" stroke="#5a3a1a" stroke-width="1.5" fill="none"/>' : '<circle cx="32" cy="42" r="2.5" fill="#e2b13c"/>'}`;
}

function bone(name: string): string {
  if (/fang/i.test(name)) return `<path d="M24 10 Q42 10 42 18 Q40 40 30 56 Q24 36 24 10Z" fill="#f4ecd8" ${stroke}/><path d="M24 14 Q34 12 41 16" stroke="#a8987a" stroke-width="1.5" fill="none"/>`;
  if (/skull/i.test(name)) return `<path d="M10 30 Q12 14 30 14 Q48 14 54 26 Q50 30 40 32 Q48 36 52 40 Q40 44 28 42 Q12 42 10 30Z" fill="#f4ecd8" ${stroke}/><circle cx="26" cy="26" r="4" fill="${INK}"/>`;
  if (/comb/i.test(name)) return `<rect x="10" y="18" width="44" height="10" rx="3" fill="#e8dcc0" ${stroke}/><path d="M14 28 V46 M19 28 V46 M24 28 V46 M29 28 V46 M34 28 V46 M39 28 V46 M44 28 V46 M49 28 V46" stroke="#a8987a" stroke-width="3"/>`;
  return `<path d="M14 22 Q8 16 14 12 Q20 10 20 18 L44 42 Q52 40 52 48 Q50 54 44 50 Q46 56 40 54 Q34 52 40 46 L18 24 Q10 26 14 22Z" fill="#f4ecd8" ${stroke}/>`;
}

function shell(): string {
  return `<path d="M32 52 Q10 50 10 30 Q10 12 30 10 Q48 10 50 26 Q50 38 38 40 Q28 40 28 30 Q28 22 36 24" fill="none" stroke="${INK}" stroke-width="2"/><path d="M32 52 Q10 50 10 30 Q10 12 30 10 Q48 10 50 26 Q50 38 38 40Z" fill="#e8c8a0" opacity="0.9"/><path d="M32 52 Q10 50 10 30 Q10 12 30 10 Q48 10 50 26 Q50 38 38 40 Q28 40 28 30 Q28 22 36 24" fill="none" stroke="${INK}" stroke-width="2"/>`;
}

/** A small figure on a base: a cat, a mouse, a fish, a swan, a hippo, a beetle, a whale, a mermaid... */
function figurine(name: string): string {
  const m = material(name);
  let shape: string;
  if (/mouse|automaton|netsuke/i.test(name)) shape = '<ellipse cx="28" cy="36" rx="15" ry="9" fill="url(#m)"/><path d="M38 30 Q50 32 56 39 Q48 43 38 42Z" fill="url(#m)"/><circle cx="40" cy="25" r="6" fill="url(#m)"/><circle cx="49" cy="36" r="1.6" fill="#22190f"/><path d="M14 38 Q4 38 6 30 Q8 24 14 28" fill="none" stroke="#22190f" stroke-width="2"/>';
  else if (/fish|sardine|herring|fishbone/i.test(name)) shape = '<path d="M10 32 Q28 14 46 32 Q28 48 10 32Z M46 32 L56 22 L56 42Z" fill="url(#m)"/><circle cx="18" cy="30" r="2" fill="#22190f"/><path d="M26 24 Q30 32 26 40" stroke="#22190f" fill="none" stroke-width="1.2"/>';
  else if (/swan/i.test(name)) shape = '<path d="M12 40 Q20 30 40 34 Q52 36 50 42 Z" fill="url(#m)"/><path d="M40 34 Q44 18 36 14 Q30 12 30 18" fill="none" stroke="url(#m)" stroke-width="5"/>';
  else if (/hippo/i.test(name)) shape = '<path d="M10 36 Q10 22 30 22 Q48 22 52 30 Q56 40 46 42 H14Z" fill="url(#m)"/><circle cx="44" cy="27" r="1.6" fill="#22190f"/>';
  else if (/scarab/i.test(name)) shape = '<ellipse cx="32" cy="32" rx="13" ry="16" fill="url(#m)"/><path d="M32 16 V48 M20 26 L12 20 M44 26 L52 20 M20 38 L12 44 M44 38 L52 44" stroke="#22190f" stroke-width="2"/>';
  else if (/whale/i.test(name)) shape = '<path d="M8 36 Q12 20 34 22 Q52 24 50 36 L58 30 L56 42 L48 40 Q34 46 8 36Z" fill="url(#m)"/>';
  else if (/mermaid|figurehead/i.test(name)) shape = '<circle cx="30" cy="16" r="6" fill="url(#m)"/><path d="M24 22 Q22 34 30 40 Q40 46 46 40 Q38 42 34 34 Q38 26 34 22Z" fill="url(#m)"/>';
  else if (/marten|stuffed/i.test(name)) shape = '<path d="M10 40 Q12 26 30 28 Q44 28 48 22 L54 26 L50 32 Q44 40 30 40Z" fill="#7a4a22"/><path d="M10 40 Q4 30 10 24" stroke="#5a3a1a" stroke-width="4" fill="none"/>';
  else if (/whoopee|cushion|bed|stole|scratching|mink/i.test(name)) return cushion(name);
  else if (/balloon/i.test(name)) shape = '<circle cx="26" cy="30" r="12" fill="url(#m)"/><circle cx="40" cy="22" r="7" fill="url(#m)"/><circle cx="40" cy="38" r="6" fill="url(#m)"/>';
  // A cat, sitting up.
  else shape = '<path d="M22 46 Q18 30 24 22 L22 10 L29 17 L35 17 L42 10 L40 22 Q46 30 42 46Z" fill="url(#m)"/><path d="M42 44 Q52 42 50 30" stroke="url(#m)" stroke-width="4" fill="none"/>';
  return `<defs>${grad('m', m)}</defs><g stroke="${INK}" stroke-width="2" stroke-linejoin="round">${shape}</g><rect x="14" y="46" width="36" height="8" rx="2" fill="#3a2a1a" ${stroke}/>`;
}

function cushion(name: string): string {
  if (/mink|stole/i.test(name)) return `<path d="M8 30 Q20 18 32 26 Q44 34 56 24 Q58 40 44 44 Q30 48 20 40 Q12 36 8 30Z" fill="#7a5a3a" ${stroke}/><path d="M14 30 Q22 26 30 32" stroke="#a8825a" stroke-width="2" fill="none"/>`;
  if (/scratching/i.test(name)) return `<defs>${grad('m', GOLD)}</defs><rect x="26" y="10" width="12" height="38" fill="#c8a878" ${stroke}/><path d="M26 16 H38 M26 22 H38 M26 28 H38 M26 34 H38 M26 40 H38" stroke="#8a6a3a" stroke-width="1.5"/><rect x="14" y="46" width="36" height="8" fill="url(#m)" ${stroke}/>`;
  const glass = /glass/i.test(name);
  return `<path d="M10 30 Q10 16 32 16 Q54 16 54 30 Q54 46 32 46 Q10 46 10 30Z" fill="${glass ? '#d8f0ff' : '#c8506a'}" opacity="${glass ? 0.8 : 1}" ${stroke}/><path d="M54 30 L60 34 L58 28Z" fill="${glass ? '#d8f0ff' : '#c8506a'}" ${stroke}/>`;
}

function misc(name: string): string | null {
  if (/key/i.test(name)) return `<defs>${grad('m', GOLD)}</defs><circle cx="20" cy="20" r="10" fill="none" stroke="url(#m)" stroke-width="6"/><circle cx="20" cy="20" r="10" fill="none" ${stroke}/><path d="M27 27 L50 50 M42 42 L48 36 M46 46 L52 40" stroke="#e2b13c" stroke-width="5" stroke-linecap="round"/>`;
  if (/dice/i.test(name)) return `<defs>${grad('m', GOLD)}</defs><rect x="8" y="22" width="24" height="24" rx="4" fill="url(#m)" ${stroke} transform="rotate(-10 20 34)"/><rect x="32" y="16" width="24" height="24" rx="4" fill="url(#m)" ${stroke} transform="rotate(12 44 28)"/><circle cx="20" cy="34" r="2.5" fill="${INK}"/><circle cx="40" cy="24" r="2.2" fill="${INK}"/><circle cx="48" cy="32" r="2.2" fill="${INK}"/>`;
  if (/chips/i.test(name)) return [0, 1, 2, 3].map((i) => `<ellipse cx="32" cy="${44 - i * 7}" rx="18" ry="6" fill="#d8dce8" ${stroke}/>`).join('') + `<ellipse cx="32" cy="23" rx="10" ry="3" fill="none" stroke="#6e7584" stroke-dasharray="3 2"/>`;
  if (/roulette ball/i.test(name)) return `<circle cx="32" cy="32" r="18" fill="#fbf7ea" ${stroke}/><path d="M20 26 L26 20 L32 26 L38 20 L44 26" stroke="#e0263f" stroke-width="2" fill="none"/><circle cx="26" cy="26" r="4" fill="#fff"/>`;
  if (/pen\b|fountain/i.test(name)) return `<defs>${grad('m', material(name))}</defs><path d="M12 52 L18 40 L44 14 L50 20 L24 46Z" fill="url(#m)" ${stroke}/><path d="M12 52 L18 40 L24 46Z" fill="${INK}"/>`;
  if (/fork|knife/i.test(name)) return `<defs>${grad('m', material('silver'))}</defs><path d="M30 54 V28 Q22 26 22 14 V8 M26 8 V18 M30 8 V18 M34 8 V14 Q34 26 30 28" fill="none" stroke="url(#m)" stroke-width="4"/><path d="M30 54 V28" ${stroke}/>`;
  if (/pipe/i.test(name)) return `<path d="M8 22 L36 30 Q38 30 38 34 V46 Q38 54 46 54 Q54 54 54 46 V30 H38" fill="#6b3f18" ${stroke}/><ellipse cx="46" cy="30" rx="8" ry="3" fill="#2a1a0a"/>`;
  if (/gramophone|tape of/i.test(name)) return /tape/i.test(name) ? `<rect x="8" y="16" width="48" height="32" rx="3" fill="#2a2a3a" ${stroke}/><circle cx="22" cy="32" r="6" fill="#efe2c4"/><circle cx="42" cy="32" r="6" fill="#efe2c4"/>` : `<circle cx="32" cy="32" r="24" fill="#14141f" ${stroke}/><circle cx="32" cy="32" r="17" fill="none" stroke="#3a3a4a"/><circle cx="32" cy="32" r="8" fill="#e0263f"/><circle cx="32" cy="32" r="1.5" fill="#fff"/>`;
  if (/yarn/i.test(name)) return `<defs>${grad('m', GOLD)}</defs><circle cx="32" cy="32" r="20" fill="url(#m)" ${stroke}/><path d="M16 24 Q32 34 48 22 M14 34 Q32 44 50 32 M20 46 Q32 20 44 14" fill="none" stroke="#8a6418" stroke-width="1.5"/><path d="M50 40 Q58 50 52 56" fill="none" stroke="#e2b13c" stroke-width="2"/>`;
  if (/banana/i.test(name)) return `<path d="M10 40 Q20 30 40 34 Q50 36 52 42 Q34 48 10 40Z" fill="#9ab0c0" ${stroke}/><path d="M14 24 Q32 34 50 22 Q48 30 32 34 Q18 32 14 24Z" fill="#f2d22a" ${stroke}/><path d="M18 36 L46 26" stroke="#c8c8c8" stroke-width="4"/>`;
  if (/neon/i.test(name)) return `<rect x="6" y="18" width="52" height="28" rx="4" fill="#1d1d2a" ${stroke}/><text x="32" y="38" text-anchor="middle" font-size="14" font-family="sans-serif" font-weight="bold" fill="#ff5ad0" stroke="#ffd0f0" stroke-width="0.6">MEOW</text>`;
  if (/feather/i.test(name)) return `<defs>${grad('m', GOLD)}</defs><path d="M14 54 Q20 30 50 10 Q48 34 22 48Z" fill="url(#m)" ${stroke}/><path d="M14 54 Q30 34 48 14" stroke="#8a6418" stroke-width="1.5" fill="none"/>`;
  if (/bar\b|reserve|bullion/i.test(name) && !/mouse/i.test(name)) return `<defs>${grad('m', GOLD)}</defs><path d="M10 40 L18 26 H52 L46 40Z" fill="url(#m)" ${stroke}/><path d="M10 40 H46 V48 H10Z" fill="#c8961e" ${stroke}/><path d="M46 40 L52 26 V34 L46 48Z" fill="#8a6418" ${stroke}/>`;
  if (/lantern/i.test(name)) return `<defs>${grad('m', GOLD)}</defs><path d="M22 18 H42 L44 50 H20Z" fill="#fff3c4" ${stroke}/><path d="M20 18 H44 L38 10 H26Z M18 50 H46 V54 H18Z" fill="url(#m)" ${stroke}/><circle cx="32" cy="6" r="3" fill="none" ${stroke}/>`;
  if (/monocles/i.test(name)) return `<path d="M10 28 L32 20 L54 28 L32 36Z" fill="#5a3a2a" ${stroke}/><circle cx="24" cy="38" r="7" fill="#d8f0ff" ${stroke}/><circle cx="40" cy="40" r="7" fill="#d8f0ff" ${stroke}/>`;
  if (/prized possession|collar/i.test(name)) return `<path d="M10 26 Q32 52 54 26" fill="none" stroke="#2a1a3a" stroke-width="7"/><path d="M10 26 Q32 52 54 26" fill="none" stroke="#e2b13c" stroke-width="1.5"/><circle cx="32" cy="44" r="7" fill="#e2b13c" ${stroke}/>`;
  return null;
}

/** The SVG picture for a piece of loot. */
export function lootIconSvg(name: string, category?: LootCategory): string {
  const body =
    (category === 'painting' ? null : misc(name)) ??
    (/chart|map\b|papyrus|charter/i.test(name)
      ? scroll(name)
      : category === 'painting' || /oils|portrait|painting/i.test(name)
        ? painting(name)
        : /cufflinks|pearl/i.test(name) && !/collar|earring/i.test(name)
          ? pearls(name)
          : /tiara|crown/i.test(name)
            ? crown(name)
            : /medal|chain/i.test(name)
              ? medal(name)
              : /cup|trophy/i.test(name)
                ? trophy(name)
                : /bell/i.test(name)
                  ? bell(name)
                  : /egg/i.test(name)
                    ? egg(name)
                    : /mask|eyepatch/i.test(name)
                      ? mask(name)
                      : /amber|trilobite/i.test(name)
                        ? `<path d="M32 8 Q52 24 48 40 Q44 54 32 54 Q20 54 16 40 Q12 24 32 8Z" fill="#f0a030" opacity="0.9" ${stroke}/><path d="M28 34 Q32 28 36 34 Q32 40 28 34Z M26 32 L22 28 M38 32 L42 28 M27 37 L22 40 M37 37 L42 40" fill="#3a1a0a" stroke="#3a1a0a" stroke-width="1.2"/>`
                        : /ammonite|shell/i.test(name)
                          ? shell()
                          : /fang|bone|skull|comb/i.test(name)
                            ? bone(name)
                            : /watch|clock|music box/i.test(name)
                              ? watch(name)
                              : /astrolabe|sextant|compass|lens|telescope|scales|\bdie\b|handle/i.test(name)
                                ? instrument(name)
                                : /coin|doubloon|penny|florin|sovereign|piece of eight|sixpence|planchet|proof set|shipwreck silver/i.test(name)
                                  ? coins(name)
                                  : /bonds|ious|deeds|stamps|records|calling card|dollar/i.test(name)
                                    ? papers(name)
                                    : /ledger|logbook|memoirs|moby|book/i.test(name)
                                      ? book(name)
                                      : /bottle|jar|tankard|globe|\bcan\b|\btin\b/i.test(name)
                                        ? vessel(name)
                                        : /diamond|sapphire|emerald|ruby|opal|topaz|siam|nugget|geode|meteorite|brooch|cameo/i.test(name) && !/fish|swan|bell/i.test(name)
                                          ? /brooch|cameo/i.test(name) ? `<ellipse cx="32" cy="32" rx="18" ry="22" fill="#e2b13c" ${stroke}/><ellipse cx="32" cy="32" rx="13" ry="17" fill="#f2c8b0"/><path d="M28 22 Q36 22 36 30 Q36 36 32 38 Q34 44 30 46 Q26 38 28 22Z" fill="#fbf7ea"/>` : gem(name)
                                          : /box|chest|crate|capsule|petty cash|takings|cash/i.test(name)
                                            ? box(name)
                                            : /cat|kitten|mouse|fish|sardine|swan|hippo|scarab|whale|netsuke|figurehead|marten|cushion|bed|stole|scratching|balloon/i.test(name)
                                              ? figurine(name)
                                              : category === 'jewel'
                                                ? gem(name)
                                                : category === 'artefact'
                                                  ? figurine(name)
                                                  : box(name));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128">${body}</svg>`;
}

export function lootIconUrl(name: string, category?: LootCategory): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(lootIconSvg(name, category))}`;
}

/** The file name for a piece of loot's picture: art/models/loot_<this>.webp. */
export function lootSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
