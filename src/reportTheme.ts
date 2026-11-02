// The heist report's theme, made live with Web Audio: an original bright "job done" tune.
// 132 bpm swing in B-flat major. A walking bass, a comping piano, swinging ride cymbal, and a muted trumpet.
// Sixteen bars, about half a minute, then round again.
import { stopper } from './heistMusic';
import { hit, hz, noise, outputStage, type Playing, reverb, sequencer, tone } from './synth';

const BPM = 132;
const BEAT = 60 / BPM;
const SWING = 0.64; // where the off-beat 8th lands, as a share of the beat

/** The chords: bass root (MIDI), the 3rd above it for the walking bass, and the piano voicing. */
const CHORDS = {
  Bb6: { root: 46, third: 4, voicing: [62, 65, 67, 70] },
  G7: { root: 43, third: 4, voicing: [59, 62, 65, 67] },
  Cm7: { root: 48, third: 3, voicing: [58, 60, 63, 67] },
  F7: { root: 41, third: 4, voicing: [57, 60, 63, 65] },
  Dm7: { root: 38, third: 3, voicing: [57, 60, 62, 65] },
  Bb7: { root: 46, third: 4, voicing: [62, 65, 68, 70] },
  Eb6: { root: 39, third: 4, voicing: [60, 63, 67, 70] },
  Edim: { root: 40, third: 3, voicing: [58, 61, 64, 67] },
} as const;
type ChordName = keyof typeof CHORDS;
// prettier-ignore
const FORM: ChordName[] = [
  'Bb6', 'G7', 'Cm7', 'F7', 'Dm7', 'G7', 'Cm7', 'F7',
  'Bb6', 'Bb7', 'Eb6', 'Edim', 'Bb6', 'G7', 'Cm7', 'F7',
];
/** The trumpet tune: [bar, swung 8th within the bar (0-7), length in 8ths, MIDI note]. */
// prettier-ignore
const TUNE: [number, number, number, number][] = [
  [0, 0, 1, 77], [0, 1, 1, 79], [0, 2, 2, 82], [0, 5, 3, 79],
  [1, 0, 2, 77], [1, 2, 1, 74], [1, 3, 1, 71], [1, 4, 4, 74],
  [2, 0, 1, 75], [2, 1, 1, 74], [2, 2, 2, 72], [2, 5, 3, 70],
  [3, 0, 2, 69], [3, 2, 2, 72], [3, 4, 2, 75], [3, 6, 2, 77],
  [4, 0, 3, 77], [4, 3, 1, 74], [4, 4, 4, 81],
  [5, 0, 2, 79], [5, 2, 2, 77], [5, 4, 2, 74], [5, 6, 2, 71],
  [6, 0, 2, 72], [6, 2, 2, 75], [6, 4, 2, 79], [6, 6, 2, 82],
  [7, 0, 4, 81], [7, 4, 4, 77],
  [8, 0, 1, 77], [8, 1, 1, 79], [8, 2, 2, 82], [8, 5, 3, 86],
  [9, 0, 2, 84], [9, 2, 2, 82], [9, 4, 4, 80],
  [10, 0, 2, 79], [10, 2, 2, 75], [10, 4, 4, 72],
  [11, 0, 2, 76], [11, 2, 2, 79], [11, 4, 4, 82],
  [12, 0, 3, 77], [12, 3, 1, 74], [12, 4, 4, 70],
  [13, 0, 2, 71], [13, 2, 2, 74], [13, 4, 4, 77],
  [14, 0, 2, 75], [14, 2, 2, 74], [14, 4, 4, 72],
  [15, 0, 6, 70],
];

/** Plays the report theme from `startAt` until stopped. */
export function playReportTheme(ctx: BaseAudioContext, dest: AudioNode, startAt: number): Playing {
  const out = outputStage(ctx, dest, startAt, 0.6);
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -20;
  glue.ratio.value = 3;
  const clean = ctx.createBiquadFilter();
  clean.type = 'highpass';
  clean.frequency.value = 38;
  const mix = ctx.createGain();
  mix.gain.value = 0.68;
  mix.connect(clean).connect(glue).connect(out);
  const room = reverb(ctx, 1.6, 3);
  const wet = ctx.createGain();
  wet.gain.value = 0.2;
  room.connect(wet).connect(mix);
  const hiss = noise(ctx, 2, 'white');

  /** Piano: a bright pluck with a soft body. */
  const piano = (note: number, at: number, dur: number, vol: number) => {
    tone(ctx, mix, { type: 'triangle', note, at, dur, vol, release: 0.25, lowpass: 3200, lowpassTo: 1200 });
    tone(ctx, mix, { type: 'sine', note: note + 12, at, dur: 0.02, vol: vol * 0.3, release: 0.2 });
  };
  /** Muted trumpet: a saw squeezed through a narrow, nasal band, with a late vibrato. */
  const trumpet = (note: number, at: number, dur: number) => {
    const f = hz(note);
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, at);
    depth.gain.linearRampToValueAtTime(f * 0.007, at + Math.min(0.3, dur));
    lfo.connect(depth).connect(o.frequency);
    const mute = ctx.createBiquadFilter();
    mute.type = 'bandpass';
    mute.frequency.value = 1500;
    mute.Q.value = 2.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.22, at + 0.025);
    g.gain.setValueAtTime(0.19, at + dur);
    g.gain.linearRampToValueAtTime(0, at + dur + 0.08);
    o.connect(mute).connect(g);
    g.connect(mix);
    g.connect(room);
    const end = at + dur + 0.1;
    o.start(at);
    lfo.start(at);
    o.stop(end);
    lfo.stop(end);
  };
  const offbeat = (k: number) => (k % 2 ? SWING * BEAT : 0);

  const stopSeq = sequencer(ctx, BEAT, startAt, (i, at) => {
    const bar = Math.floor(i / 4) % FORM.length;
    const beat = i % 4;
    const c = CHORDS[FORM[bar]];
    const next = CHORDS[FORM[(bar + 1) % FORM.length]];

    // Walking bass: root, 3rd, 5th, then a half step into the next chord.
    const walk = [c.root, c.root + c.third, c.root + 7, next.root + (bar % 2 ? 1 : -1)];
    tone(ctx, mix, { type: 'sine', note: walk[beat], at, dur: BEAT * 0.8, vol: 0.055, release: 0.06 });
    tone(ctx, mix, {
      type: 'triangle',
      note: walk[beat] + 12,
      at,
      dur: 0.04,
      vol: 0.025,
      release: 0.05,
      lowpass: 1200,
    });

    // Piano comping: the 1 and the off-beat of 2 (the other way round every other bar).
    const hits = bar % 2 === 0 ? [0, 3] : [1, 5];
    for (const k of hits)
      if (Math.floor(k / 2) === beat) for (const n of c.voicing) piano(n, at + offbeat(k), BEAT * 0.5, 0.028);

    // Drums: ride "ding, ding-a ding", hi-hat on 2 and 4, and a light snare now and then.
    hit(ctx, mix, hiss, at, {
      type: 'bandpass',
      freq: 7200,
      q: 2.5,
      dur: 0.35,
      vol: beat % 2 ? 0.08 : 0.06,
      pan: -0.2,
    });
    if (beat % 2) {
      hit(ctx, mix, hiss, at + SWING * BEAT, {
        type: 'bandpass',
        freq: 7200,
        q: 2.5,
        dur: 0.2,
        vol: 0.04,
        pan: -0.2,
      });
      hit(ctx, mix, hiss, at, { type: 'highpass', freq: 6000, dur: 0.05, vol: 0.07, pan: 0.2 });
    }
    if (beat === 3 && bar % 4 === 3)
      hit(ctx, mix, hiss, at + SWING * BEAT, { type: 'bandpass', freq: 1900, q: 0.8, dur: 0.12, vol: 0.12 });

    // The trumpet tune.
    for (const [b, k, len, note] of TUNE)
      if (b === bar && Math.floor(k / 2) === beat) trumpet(note, at + offbeat(k), len * (BEAT / 2) - 0.04);
  });

  return { stop: stopper(ctx, out, stopSeq) };
}
