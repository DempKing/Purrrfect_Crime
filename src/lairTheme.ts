// The lair theme, made live with Web Audio: an original laid-back hideout groove for every screen between
// heists (the lair, the city map, the black market, skills, the planning board).
// 92 bpm swing in F major. Warm electric piano chords, a walking upright bass, brushed swing drums,
// and a lazy clarinet tune.
//
// Form (bars): intro 0-1 (piano and bass, once), then A 2-9, A' 10-17, bridge 18-25, A' 26-33, and back to bar 2.
// About 80 seconds before it repeats.
import { hit, hz, noise, outputStage, type Playing, reverb, sequencer, tone } from './synth';

const BPM = 92;
const BEAT = 60 / BPM;
const SWING = 0.64; // where the off-beat 8th lands, as a share of the beat (0.5 would be straight)

/** The chords: bass root (MIDI), the 3rd above it for the walking bass, and the piano voicing. */
const CHORDS = {
  Gm9: { root: 43, third: 3, voicing: [58, 62, 65, 69] },
  C13: { root: 36, third: 4, voicing: [58, 62, 64, 69] },
  Fmaj9: { root: 41, third: 4, voicing: [57, 60, 64, 67] },
  D7b9: { root: 38, third: 4, voicing: [54, 60, 63] },
  Bbmaj9: { root: 46, third: 4, voicing: [57, 60, 62, 65] },
  Bbm6: { root: 46, third: 3, voicing: [55, 58, 61, 65] },
  Am7: { root: 45, third: 3, voicing: [55, 60, 64] },
  D7: { root: 38, third: 4, voicing: [54, 60, 64] },
  C7sus: { root: 36, third: 5, voicing: [58, 62, 65, 67] },
} as const;
type ChordName = keyof typeof CHORDS;
const INTRO: ChordName[] = ['Fmaj9', 'C7sus'];
const A: ChordName[] = ['Gm9', 'C13', 'Fmaj9', 'D7b9', 'Gm9', 'C13', 'Fmaj9', 'Fmaj9'];
const BRIDGE: ChordName[] = ['Bbmaj9', 'Bbm6', 'Am7', 'D7', 'Gm9', 'C13', 'Fmaj9', 'C7sus'];

/** Tunes: [bar of the section, swung 8th within the bar (0-7), length in 8ths, MIDI note]. */
// prettier-ignore
const TUNE_A: [number, number, number, number][] = [
  [0, 0, 2, 70], [0, 2, 1, 72], [0, 3, 1, 74], [0, 4, 4, 77],
  [1, 0, 2, 76], [1, 2, 2, 74], [1, 4, 1, 72], [1, 5, 3, 69],
  [2, 0, 3, 72], [2, 3, 1, 69], [2, 4, 2, 67], [2, 6, 2, 64],
  [3, 0, 2, 66], [3, 2, 2, 69], [3, 4, 2, 72], [3, 6, 2, 75],
  [4, 0, 4, 74], [4, 4, 1, 77], [4, 5, 1, 74], [4, 6, 2, 72],
  [5, 0, 2, 70], [5, 2, 2, 69], [5, 4, 4, 67],
  [6, 0, 2, 69], [6, 2, 1, 72], [6, 3, 5, 76],
  [7, 0, 6, 72],
];
/** The second A ends home, on F. */
// prettier-ignore
const TUNE_A2: [number, number, number, number][] = [
  ...TUNE_A.filter(([bar]) => bar < 6),
  [6, 0, 2, 69], [6, 2, 1, 67], [6, 3, 5, 65],
];
// prettier-ignore
const TUNE_BRIDGE: [number, number, number, number][] = [
  [0, 0, 3, 74], [0, 3, 1, 72], [0, 4, 4, 69],
  [1, 0, 3, 73], [1, 3, 1, 70], [1, 4, 4, 67],
  [2, 0, 2, 72], [2, 2, 2, 76], [2, 4, 4, 79],
  [3, 0, 2, 78], [3, 2, 2, 76], [3, 4, 2, 72], [3, 6, 2, 69],
  [4, 0, 3, 70], [4, 3, 1, 74], [4, 4, 4, 77],
  [5, 0, 2, 76], [5, 2, 2, 74], [5, 4, 2, 72], [5, 6, 2, 70],
  [6, 0, 4, 69], [6, 4, 4, 72],
  [7, 0, 4, 74], [7, 4, 2, 72], [7, 6, 2, 70],
];

type Section = 'intro' | 'A' | 'A2' | 'bridge';
/** Which section a bar is in, its chord and the next bar's (for the bass to walk toward). */
function barInfo(bar: number): { section: Section; chord: ChordName; next: ChordName; inSection: number } {
  const at = (b: number) => (b < 34 ? b : 2 + ((b - 2) % 32));
  const info = (b: number): { section: Section; chord: ChordName; inSection: number } => {
    if (b < 2) return { section: 'intro', chord: INTRO[b], inSection: b };
    if (b < 10) return { section: 'A', chord: A[b - 2], inSection: b - 2 };
    if (b < 18) return { section: 'A2', chord: A[b - 10], inSection: b - 10 };
    if (b < 26) return { section: 'bridge', chord: BRIDGE[b - 18], inSection: b - 18 };
    return { section: 'A2', chord: A[b - 26], inSection: b - 26 };
  };
  const now = info(at(bar));
  return { ...now, next: info(at(bar + 1)).chord };
}

/** Plays the lair theme from `startAt` until stopped. */
export function playLairTheme(ctx: BaseAudioContext, dest: AudioNode, startAt: number): Playing {
  const out = outputStage(ctx, dest, startAt, 0.8);
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -20;
  glue.ratio.value = 3;
  const clean = ctx.createBiquadFilter();
  clean.type = 'highpass';
  clean.frequency.value = 38;
  const mix = ctx.createGain();
  mix.gain.value = 0.52;
  mix.connect(clean).connect(glue).connect(out);
  // A small, warm room.
  const room = reverb(ctx, 1.8, 3);
  const wet = ctx.createGain();
  wet.gain.value = 0.22;
  room.connect(wet).connect(mix);
  // The piano drifts gently left and right, like an old electric piano's tremolo.
  const pan = ctx.createStereoPanner();
  const panLfo = ctx.createOscillator();
  panLfo.frequency.value = 2.6;
  const panDepth = ctx.createGain();
  panDepth.gain.value = 0.35;
  panLfo.connect(panDepth).connect(pan.pan);
  panLfo.start(startAt);
  const piano = ctx.createGain();
  piano.gain.value = 1;
  piano.connect(pan);
  pan.connect(mix);
  pan.connect(room);

  const hiss = noise(ctx, 2, 'white');
  // The brushes' quiet swirl, always there under the groove (from the A section on).
  const swirl = ctx.createBufferSource();
  swirl.buffer = noise(ctx, 3, 'white');
  swirl.loop = true;
  const swirlF = ctx.createBiquadFilter();
  swirlF.type = 'bandpass';
  swirlF.frequency.value = 3200;
  swirlF.Q.value = 0.6;
  const swirlG = ctx.createGain();
  swirlG.gain.setValueAtTime(0, startAt);
  swirlG.gain.linearRampToValueAtTime(0.012, startAt + 2 * 4 * BEAT + 1);
  const swirlLfo = ctx.createOscillator();
  swirlLfo.frequency.value = BPM / 60 / 2;
  const swirlDepth = ctx.createGain();
  swirlDepth.gain.value = 0.006;
  swirlLfo.connect(swirlDepth).connect(swirlG.gain);
  swirl.connect(swirlF).connect(swirlG).connect(mix);
  swirl.start(startAt);
  swirlLfo.start(startAt);

  /** An electric piano note: FM bell "tine" at the start, mellowing into a warm sine. */
  const ep = (note: number, at: number, dur: number, vol: number) => {
    const f = hz(note);
    const car = ctx.createOscillator();
    car.frequency.value = f;
    const mod = ctx.createOscillator();
    mod.frequency.value = f;
    const index = ctx.createGain();
    index.gain.setValueAtTime(f * 2.2, at);
    index.gain.exponentialRampToValueAtTime(f * 0.25, at + 0.35);
    mod.connect(index).connect(car.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.006);
    g.gain.exponentialRampToValueAtTime(vol * 0.45, at + 0.6);
    g.gain.setValueAtTime(vol * 0.45, at + Math.max(0.6, dur));
    g.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(0.6, dur) + 0.35);
    car.connect(g).connect(piano);
    const end = at + Math.max(0.6, dur) + 0.4;
    car.start(at);
    mod.start(at);
    car.stop(end);
    mod.stop(end);
  };

  /** Upright bass: a round sine with a little plucked edge. */
  const bass = (note: number, at: number) => {
    tone(ctx, mix, { type: 'sine', note, at, dur: BEAT * 0.8, vol: 0.075, release: 0.08 });
    tone(ctx, mix, {
      type: 'triangle',
      note: note + 12,
      at,
      dur: 0.05,
      vol: 0.03,
      release: 0.06,
      lowpass: 1200,
    });
  };

  /** The clarinet: a hollow square wave, softened, with breath and a slow vibrato. */
  const clarinet = (note: number, at: number, dur: number) => {
    const f = hz(note);
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = f;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, at);
    depth.gain.linearRampToValueAtTime(f * 0.006, at + Math.min(0.4, dur));
    lfo.connect(depth).connect(o.frequency);
    const soft = ctx.createBiquadFilter();
    soft.type = 'lowpass';
    soft.frequency.setValueAtTime(900, at);
    soft.frequency.linearRampToValueAtTime(1900, at + 0.08);
    soft.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.07, at + 0.05);
    g.gain.setValueAtTime(0.07, at + dur);
    g.gain.linearRampToValueAtTime(0, at + dur + 0.12);
    o.connect(soft).connect(g);
    g.connect(mix);
    g.connect(room);
    const end = at + dur + 0.15;
    o.start(at);
    lfo.start(at);
    o.stop(end);
    lfo.stop(end);
    // A breath of air at the start of the note.
    hit(ctx, mix, hiss, at, { type: 'bandpass', freq: 2400, q: 1, dur: 0.08, vol: 0.02 });
  };

  /** Swing time: where 8th number `k` (0-7) of the bar starts, from the start of its beat. */
  const offbeat = (k: number) => (k % 2 ? SWING * BEAT : 0);

  const stopSeq = sequencer(ctx, BEAT, startAt, (i, at) => {
    const bar = Math.floor(i / 4);
    const beat = i % 4;
    const { section, chord, next, inSection } = barInfo(bar);
    const c = CHORDS[chord];

    // Walking bass: root, 3rd, 5th, then a half step into the next chord's root.
    const nextRoot = CHORDS[next].root;
    const walk = [c.root, c.root + c.third, c.root + 7, nextRoot + (bar % 2 ? 1 : -1)];
    bass(section === 'intro' ? c.root + (beat === 3 ? 7 : 0) : walk[beat], at);

    // Electric piano comping, "Charleston" style: on 1, and the off-beat of 2 (swapped every other bar).
    const hits = bar % 2 === 0 ? [0, 3] : [1, 5];
    for (const k of hits)
      if (Math.floor(k / 2) === beat)
        for (const n of c.voicing) ep(n, at + offbeat(k), k === 0 || k === 5 ? BEAT * 1.2 : BEAT * 0.5, 0.09);
    if (section === 'intro' && beat === 0) for (const n of c.voicing) ep(n + 12, at + BEAT * 2, BEAT, 0.02);

    // Brushed swing drums from the A section on.
    if (section !== 'intro') {
      // Ride: 1, 2 + its swung off-beat, 3, 4 + its swung off-beat.
      hit(ctx, mix, hiss, at, {
        type: 'bandpass',
        freq: 7000,
        q: 2.5,
        dur: 0.4,
        vol: beat % 2 ? 0.07 : 0.05,
        pan: -0.2,
      });
      if (beat % 2)
        hit(ctx, mix, hiss, at + SWING * BEAT, {
          type: 'bandpass',
          freq: 7000,
          q: 2.5,
          dur: 0.25,
          vol: 0.035,
          pan: -0.2,
        });
      // Hi-hat "chick" with the foot on 2 and 4, and a soft brush slap.
      if (beat % 2) {
        hit(ctx, mix, hiss, at, { type: 'highpass', freq: 6000, dur: 0.05, vol: 0.06, pan: 0.2 });
        hit(ctx, mix, hiss, at, { type: 'bandpass', freq: 2000, q: 0.7, dur: 0.16, vol: 0.09 });
      }
    }

    // The tune on clarinet.
    const tune =
      section === 'A' ? TUNE_A : section === 'A2' ? TUNE_A2 : section === 'bridge' ? TUNE_BRIDGE : [];
    for (const [b, k, len, note] of tune)
      if (b === inSection && Math.floor(k / 2) === beat) {
        const start = at + offbeat(k);
        const dur = len * (BEAT / 2) - 0.04;
        clarinet(note, start, dur);
      }
  });

  return {
    stop(fade = 1.5) {
      const now = ctx.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(out.gain.value, now);
      out.gain.linearRampToValueAtTime(0, now + fade);
      stopSeq();
      setTimeout(
        () => {
          swirl.stop();
          swirlLfo.stop();
          panLfo.stop();
          out.disconnect();
        },
        (fade + 2.5) * 1000,
      );
    },
  };
}
