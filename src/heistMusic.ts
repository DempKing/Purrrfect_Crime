// The heist theme, made live with Web Audio: one original piece that follows the heist.
// 100 bpm in C minor. Sneaking: a tiptoeing plucked bass, soft ticks and a celesta motif over a dark pad.
// Suspicious (a guard is searching): tremolo strings, rim clicks, a heartbeat and a high, uneasy note.
// Alarm: a chase, with driving drums, an octave bass, a racing string figure and brass stabs.
// The levels are layers of the same groove, faded in and out, so the music never jumps to another song.
import { boom, hit, noise, outputStage, type Playing, reverb, sequencer, tone } from './synth';

/** How tense the heist is: 1 sneaking, 2 a guard is suspicious, 3 the alarm is ringing. */
export type Intensity = 1 | 2 | 3;

/** A piece that follows the heist's tension. */
export interface Adaptive extends Playing {
  setIntensity(level: Intensity): void;
}

/**
 * The layer buses an adaptive piece plays into, and how they follow the intensity: `base` always plays,
 * `sneak` steps back for a chase, `alert` comes in when a guard is suspicious, `chase` with the alarm.
 */
export function adaptiveLayers(ctx: BaseAudioContext, into: AudioNode, startAt: number, level: Intensity) {
  const bus = (on: boolean) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(on ? 1 : 0, startAt);
    g.connect(into);
    return g;
  };
  const layers = { base: bus(true), sneak: bus(level < 3), alert: bus(level >= 2), chase: bus(level >= 3) };
  const targets = (l: Intensity) => ({
    sneak: l < 3 ? 1 : 0.25,
    alert: l >= 2 ? 1 : 0,
    chase: l >= 3 ? 1 : 0,
  });
  return {
    ...layers,
    /** Fades each layer toward the new level: quickly up when things get worse, slowly down as they calm. */
    setIntensity(l: Intensity, at = ctx.currentTime) {
      for (const [name, want] of Object.entries(targets(l)) as [keyof ReturnType<typeof targets>, number][]) {
        const g = layers[name].gain;
        g.cancelScheduledValues(at);
        g.setValueAtTime(g.value, at);
        g.linearRampToValueAtTime(want, at + (want > g.value ? 0.8 : 2.5));
      }
    },
  };
}

/** Stops a piece: fades its output, ends its sequencer and lets the tails ring out. */
export function stopper(
  ctx: BaseAudioContext,
  out: GainNode,
  stopSeq: () => void,
  cleanup: () => void = () => {},
) {
  return (fade = 1.5) => {
    const now = ctx.currentTime;
    out.gain.cancelScheduledValues(now);
    out.gain.setValueAtTime(out.gain.value, now);
    out.gain.linearRampToValueAtTime(0, now + fade);
    stopSeq();
    setTimeout(
      () => {
        cleanup();
        out.disconnect();
      },
      (fade + 2.5) * 1000,
    );
  };
}

const BPM = 100;
const STEP = 60 / BPM / 4; // a 16th note

/** The chords: bass root (MIDI) and a dark pad voicing. */
const CHORDS = {
  Cm: { root: 36, pad: [48, 55, 58, 62] }, // C minor 9
  Ab: { root: 44, pad: [51, 55, 56, 60] }, // A-flat major 7
  Fm: { root: 41, pad: [48, 53, 56, 60] }, // F minor
  G7: { root: 43, pad: [47, 50, 53, 56] }, // G7 flat 9, wanting to go home
} as const;
type ChordName = keyof typeof CHORDS;
const FORM: ChordName[] = [
  'Cm',
  'Cm',
  'Ab',
  'Ab',
  'Fm',
  'Fm',
  'G7',
  'G7',
  'Cm',
  'Cm',
  'Ab',
  'Ab',
  'Fm',
  'G7',
  'Cm',
  'G7',
];

/** The tiptoe bass, per 8th of the bar (semitones from the root; -1 = rest). */
const TIPTOE = [0, -1, -1, 7, -1, 0, 6, 7];
/** The celesta motif: four two-bar phrases of [8th within the two bars, MIDI note]. */
// prettier-ignore
const PHRASES: [number, number][][] = [
  [[0, 79], [1, 80], [2, 79], [6, 75], [8, 74], [9, 75], [10, 72]],
  [[0, 80], [1, 79], [2, 80], [6, 84], [8, 82], [10, 79]],
  [[0, 77], [2, 80], [4, 84], [7, 83], [8, 84], [12, 80]],
  [[0, 79], [1, 78], [2, 79], [4, 83], [6, 86], [8, 83], [10, 80], [12, 79]],
];
/** The chase's racing string figure, per 16th of the bar (semitones from the root). */
const RACE = [0, 0, 3, 0, 7, 0, 8, 7, 0, 0, 3, 0, 10, 8, 7, 3];

/** Plays the heist theme from `startAt` at the given intensity, until stopped. */
export function playHeistTheme(
  ctx: BaseAudioContext,
  dest: AudioNode,
  startAt: number,
  level: Intensity = 1,
): Adaptive {
  const out = outputStage(ctx, dest, startAt, 1);
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -20;
  glue.ratio.value = 3;
  const clean = ctx.createBiquadFilter();
  clean.type = 'highpass';
  clean.frequency.value = 38;
  const mix = ctx.createGain();
  mix.gain.value = 0.7;
  mix.connect(clean).connect(glue).connect(out);
  const room = reverb(ctx, 2, 2.8);
  const wet = ctx.createGain();
  wet.gain.value = 0.25;
  room.connect(wet).connect(mix);
  const L = adaptiveLayers(ctx, mix, startAt, level);
  const hiss = noise(ctx, 2, 'white');

  /** A plucked, pizzicato-like bass note. */
  const pluck = (bus: AudioNode, note: number, at: number, vol: number) => {
    tone(ctx, bus, {
      type: 'triangle',
      note,
      at,
      dur: 0.05,
      vol,
      release: 0.18,
      lowpass: 1400,
      lowpassTo: 300,
    });
    tone(ctx, bus, { type: 'sine', note, at, dur: 0.06, vol: vol * 0.8, release: 0.15 });
  };
  /** A celesta note: a bell-like sine and its bright 4th partial, ringing into the room. */
  const celesta = (note: number, at: number, vol: number) => {
    for (const [mult, v] of [
      [0, vol],
      [24, vol * 0.18],
    ] as const) {
      tone(ctx, L.sneak, {
        type: 'sine',
        note: note + mult,
        at,
        dur: 0.01,
        vol: v,
        attack: 0.003,
        release: mult ? 0.4 : 1.1,
      });
      tone(ctx, room, {
        type: 'sine',
        note: note + mult,
        at,
        dur: 0.01,
        vol: v * 0.8,
        attack: 0.003,
        release: 0.9,
      });
    }
  };
  /** Brass: a stab of detuned saws, the filter snapping shut. */
  const brass = (notes: readonly number[], at: number, dur: number, vol: number) => {
    for (const n of notes)
      for (const d of [-8, 8])
        tone(ctx, L.chase, {
          type: 'sawtooth',
          note: n + 12,
          at,
          dur,
          vol,
          detune: d,
          lowpass: 2800,
          lowpassTo: 700,
          release: 0.12,
        });
  };

  const stopSeq = sequencer(ctx, STEP, startAt, (i, at) => {
    const bar = Math.floor(i / 16);
    const s = i % 16;
    const pass = Math.floor(bar / FORM.length);
    const c = CHORDS[FORM[bar % FORM.length]];

    // Base: the dark pad, and soft off-beat ticks.
    if (s === 0)
      for (const n of c.pad)
        tone(ctx, L.base, {
          type: 'sawtooth',
          note: n,
          at,
          dur: 16 * STEP,
          vol: 0.012,
          attack: 0.6,
          release: 0.8,
          lowpass: 700,
        });
    if (s % 4 === 2)
      hit(ctx, L.base, hiss, at, { type: 'highpass', freq: 8000, dur: 0.03, vol: 0.05, pan: 0.2 });

    // Sneaking: the tiptoe bass and the celesta motif (a different octave and a few gaps on later passes).
    if (s % 2 === 0 && TIPTOE[s / 2] >= 0) pluck(L.sneak, c.root + 12 + TIPTOE[s / 2], at, 0.13);
    if (s % 2 === 0) {
      const phrase = PHRASES[Math.floor((bar % 8) / 2)];
      const eighth = ((bar % 2) * 16 + s) / 2;
      for (const [k, note] of phrase)
        if (k === eighth && (pass === 0 || Math.random() > 0.15))
          celesta(note - (pass % 2 ? 12 : 0), at, 0.06);
    }

    // Suspicious: tremolo strings on the top of the chord, rim clicks, a heartbeat, an uneasy high note.
    const [, , hi1, hi2] = c.pad;
    tone(ctx, L.alert, {
      type: 'sawtooth',
      note: (s % 2 ? hi1 : hi2) + 12,
      at,
      dur: STEP * 0.6,
      vol: 0.016,
      release: 0.04,
      lowpass: 2600,
    });
    if (s === 4 || s === 12)
      hit(ctx, L.alert, hiss, at, { type: 'bandpass', freq: 3600, q: 4, dur: 0.03, vol: 0.35 });
    if (s === 0 || s === 2) boom(ctx, L.alert, at, 70, 42, 0.25, s ? 0.3 : 0.45);
    if (s === 0 && bar % 2 === 0)
      for (const n of [79, 80])
        tone(ctx, L.alert, {
          type: 'sine',
          note: n,
          at,
          dur: 32 * STEP,
          vol: 0.008,
          attack: 1.5,
          release: 1,
        });

    // Alarm: driving drums, an octave bass in 8ths, the racing strings, brass stabs.
    if (s === 0 || s === 6 || s === 8 || s === 14) boom(ctx, L.chase, at, 130, 45, 0.25, 0.6);
    if (s === 4 || s === 12) {
      hit(ctx, L.chase, hiss, at, { type: 'bandpass', freq: 1800, q: 0.9, dur: 0.16, vol: 0.55 });
      boom(ctx, L.chase, at, 220, 160, 0.08, 0.25);
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
        note: c.root + (s % 4 ? 12 : 0),
        at,
        dur: STEP * 1.4,
        vol: 0.06,
        lowpass: 700,
        lowpassTo: 250,
      });
    tone(ctx, L.chase, {
      type: 'sawtooth',
      note: c.root + 24 + RACE[s],
      at,
      dur: STEP * 0.7,
      vol: 0.022,
      release: 0.04,
      lowpass: 2200,
    });
    if (bar % 2 === 0 ? s === 0 || s === 3 : s === 6 || s === 10)
      brass(c.pad, at, s === 0 ? 0.25 : 0.1, 0.022);
  });

  return {
    setIntensity: (l) => L.setIntensity(l),
    stop: stopper(ctx, out, stopSeq),
  };
}
