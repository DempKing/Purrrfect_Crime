// NightClaw's theme, made live with Web Audio: the music for his museum and his bell-tower lair.
// 88 bpm in D minor, darker and grander than the other heists. Sneaking: a tolling bell, an organ and a
// harpsichord rippling through the chords. Suspicious: timpani, low tremolo strings and a wordless choir.
// Alarm: driving drums, racing strings and brass. The same layers as the heist theme (heistMusic.ts).
import { type Adaptive, adaptiveLayers, type Intensity, stopper } from './heistMusic';
import { boom, hit, hz, noise, outputStage, reverb, sequencer, tone } from './synth';

const BPM = 88;
const STEP = 60 / BPM / 4; // a 16th note

/** The chords: bass root (MIDI) and the organ voicing. */
const CHORDS = {
  Dm: { root: 38, organ: [50, 53, 57, 62] },
  C: { root: 36, organ: [48, 52, 55, 60] },
  Bb: { root: 46, organ: [50, 53, 58, 62] },
  A7: { root: 45, organ: [49, 52, 55, 61] },
} as const;
type ChordName = keyof typeof CHORDS;
const FORM: ChordName[] = ['Dm', 'Dm', 'C', 'C', 'Bb', 'Bb', 'A7', 'A7'];

/** The harpsichord's ripple through the chord, per 16th: which organ note (0-3), and an octave up or not. */
// prettier-ignore
const RIPPLE: [number, number][] = [
  [0, 12], [1, 12], [2, 12], [3, 12], [2, 24], [3, 12], [2, 12], [1, 12],
  [0, 12], [1, 12], [2, 12], [3, 12], [1, 24], [2, 24], [3, 12], [2, 12],
];
/** The chase's racing strings, per 16th of the bar (semitones from the root). */
const RACE = [0, 1, 0, -1, 0, 3, 7, 3, 0, 1, 0, -1, 0, 7, 10, 7];

/** Plays NightClaw's theme from `startAt` at the given intensity, until stopped. */
export function playFinaleTheme(
  ctx: BaseAudioContext,
  dest: AudioNode,
  startAt: number,
  level: Intensity = 1,
): Adaptive {
  const out = outputStage(ctx, dest, startAt, 1.2);
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -20;
  glue.ratio.value = 3;
  const clean = ctx.createBiquadFilter();
  clean.type = 'highpass';
  clean.frequency.value = 38;
  const mix = ctx.createGain();
  mix.gain.value = 0.78;
  mix.connect(clean).connect(glue).connect(out);
  // A big stone hall.
  const hall = reverb(ctx, 3.5, 2.2);
  const wet = ctx.createGain();
  wet.gain.value = 0.32;
  hall.connect(wet).connect(mix);
  const L = adaptiveLayers(ctx, mix, startAt, level);
  const hiss = noise(ctx, 2, 'white');

  /** A church bell: a few inharmonic partials, struck and ringing a long time. */
  const bell = (note: number, at: number, vol: number) => {
    for (const [ratio, v, ring] of [
      [0.5, 0.6, 4],
      [1, 1, 3.5],
      [1.19, 0.5, 2.5],
      [1.5, 0.35, 2],
      [2.0, 0.3, 1.5],
      [2.74, 0.2, 1],
    ]) {
      const o = ctx.createOscillator();
      o.frequency.value = hz(note) * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(vol * v, at + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, at + ring);
      o.connect(g);
      g.connect(L.base);
      g.connect(hall);
      o.start(at);
      o.stop(at + ring + 0.05);
    }
  };
  /** The organ: soft square and saw voices, slow to swell. */
  const organ = (note: number, at: number, dur: number) => {
    tone(ctx, L.base, {
      type: 'square',
      note,
      at,
      dur,
      vol: 0.018,
      attack: 0.5,
      release: 0.6,
      lowpass: 1100,
    });
    tone(ctx, L.base, {
      type: 'sawtooth',
      note: note - 12,
      at,
      dur,
      vol: 0.015,
      attack: 0.5,
      release: 0.6,
      lowpass: 600,
    });
  };
  /** The harpsichord: a bright, quick pluck. */
  const harpsichord = (note: number, at: number, vol: number) =>
    tone(ctx, L.sneak, {
      type: 'sawtooth',
      note,
      at,
      dur: 0.02,
      vol,
      release: 0.35,
      lowpass: 5200,
      lowpassTo: 1400,
    });
  /** The choir: soft detuned saws through a vowel-like filter ("aah"). */
  const vowel = ctx.createBiquadFilter();
  vowel.type = 'bandpass';
  vowel.frequency.value = 800;
  vowel.Q.value = 1.2;
  vowel.connect(L.alert);
  vowel.connect(hall);
  const choir = (notes: readonly number[], at: number, dur: number) => {
    for (const n of notes)
      for (const d of [-10, 0, 10])
        tone(ctx, vowel, {
          type: 'sawtooth',
          note: n + 12,
          at,
          dur,
          vol: 0.012,
          detune: d,
          attack: 0.8,
          release: 1,
        });
  };

  const stopSeq = sequencer(ctx, STEP, startAt, (i, at) => {
    const bar = Math.floor(i / 16);
    const s = i % 16;
    const name = FORM[bar % FORM.length];
    const c = CHORDS[name];
    const changed = bar % 2 === 0; // the chords change every two bars

    // Base: the organ under each chord, and the bell tolling when it changes.
    if (s === 0 && changed) {
      for (const n of c.organ) organ(n, at, 32 * STEP);
      bell(c.root + 24, at, 0.09);
    }

    // Sneaking: the harpsichord ripple and a low plucked bass on 1 and 3.
    const [which, up] = RIPPLE[s];
    harpsichord(c.organ[which] + up - 12, at, s % 4 === 0 ? 0.065 : 0.05);
    if (s === 0 || s === 8)
      tone(ctx, L.sneak, {
        type: 'triangle',
        note: c.root,
        at,
        dur: 0.1,
        vol: 0.18,
        release: 0.4,
        lowpass: 900,
      });

    // Suspicious: a timpani roll into each bar, low tremolo strings, the choir.
    if (s >= 12) boom(ctx, L.alert, at, 90, 70, 0.3, 0.07 + (s - 12) * 0.035);
    if (s === 0) boom(ctx, L.alert, at, 95, 55, 0.9, 0.3);
    tone(ctx, L.alert, {
      type: 'sawtooth',
      note: c.root + (s % 2 ? 7 : 12),
      at,
      dur: STEP * 0.6,
      vol: 0.011,
      release: 0.04,
      lowpass: 1500,
    });
    if (s === 0 && changed) choir(c.organ.slice(1), at, 30 * STEP);

    // Alarm: drums, an octave bass, racing strings and brass on the chord changes.
    if (s === 0 || s === 3 || s === 8 || s === 11) boom(ctx, L.chase, at, 130, 45, 0.25, 0.45);
    if (s === 4 || s === 12) {
      hit(ctx, L.chase, hiss, at, { type: 'bandpass', freq: 1700, q: 0.9, dur: 0.18, vol: 0.4 });
      boom(ctx, L.chase, at, 210, 150, 0.08, 0.25);
    }
    hit(ctx, L.chase, hiss, at, {
      type: 'highpass',
      freq: 8500,
      dur: 0.035,
      vol: s % 2 ? 0.05 : 0.1,
      pan: -0.2,
    });
    if (s % 2 === 0)
      tone(ctx, L.chase, {
        type: 'sawtooth',
        note: c.root - 12 + (s % 4 ? 12 : 0),
        at,
        dur: STEP * 1.4,
        vol: 0.06,
        lowpass: 650,
        lowpassTo: 240,
      });
    tone(ctx, L.chase, {
      type: 'sawtooth',
      note: c.root + 12 + RACE[s],
      at,
      dur: STEP * 0.7,
      vol: 0.022,
      release: 0.04,
      lowpass: 2200,
    });
    if (changed ? s === 0 || s === 6 : s === 10)
      for (const n of c.organ)
        for (const d of [-8, 8])
          tone(ctx, L.chase, {
            type: 'sawtooth',
            note: n + 12,
            at,
            dur: s === 0 ? 0.3 : 0.12,
            vol: 0.012,
            detune: d,
            lowpass: 2600,
            lowpassTo: 700,
            release: 0.15,
          });
  });

  return {
    setIntensity: (l) => L.setIntensity(l),
    stop: stopper(ctx, out, stopSeq),
  };
}
