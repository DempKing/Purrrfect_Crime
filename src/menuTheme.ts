// The main menu theme, made live with Web Audio: an original spy / covert-mission tune.
// 116 bpm in A minor. A sneaky chromatic bass riff, finger snaps and brushed drums, vibraphone chords,
// a twangy surf-guitar lead with spring echo, and muted brass stabs in the bridge.
//
// Form (bars): intro 0-3 (bass and snaps), A 4-11 (the groove), B 12-19 (the tune), bridge 20-23 (brass),
// B' 24-31 (the tune again, doubled on vibes), then back to A. About a minute before it repeats.
import { boom, hit, hz, noise, outputStage, type Playing, reverb, sequencer, tone } from './synth';

const BPM = 116;
const STEP = 60 / BPM / 4; // a 16th note
const EIGHTH = STEP * 2;

/** The chords: bass root (MIDI), the vibraphone voicing, and the bass riff (semitones from the root, per 8th). */
const CHORDS = {
  Am: { root: 45, voicing: [57, 60, 64, 67, 71], riff: [0, -1, 3, 0, 5, 6, 5, 3] }, // A minor 9
  Dm: { root: 38, voicing: [53, 57, 60, 64], riff: [0, -1, 3, 0, 5, 6, 5, 3] }, // D minor 9
  F: { root: 41, voicing: [57, 60, 64, 71], riff: [0, -1, 7, 0, 9, 7, 4, 2] }, // F major 7 #11
  E7: { root: 40, voicing: [56, 62, 67], riff: [0, -1, 4, 7, 10, 8, 7, 4] }, // E7 #9, the spy chord
} as const;
type ChordName = keyof typeof CHORDS;
const VERSE: ChordName[] = ['Am', 'Am', 'Dm', 'Am', 'F', 'E7', 'Am', 'E7'];
const BRIDGE: ChordName[] = ['F', 'E7', 'F', 'E7'];

/** The tune: [bar of the section, 8th within the bar, length in 8ths, MIDI note]. */
// prettier-ignore
const TUNE: [number, number, number, number][] = [
  [0, 0, 3, 76], [0, 3, 1, 79], [0, 4, 2, 81], [0, 6, 2, 76],
  [1, 0, 1, 75], [1, 1, 1, 74], [1, 2, 4, 72], [1, 6, 2, 69],
  [2, 0, 3, 77], [2, 3, 1, 74], [2, 4, 2, 81], [2, 6, 2, 77],
  [3, 0, 6, 76], [3, 6, 1, 72], [3, 7, 1, 74],
  [4, 0, 2, 77], [4, 2, 2, 76], [4, 4, 2, 72], [4, 6, 2, 69],
  [5, 0, 3, 68], [5, 3, 1, 71], [5, 4, 4, 74],
  [6, 0, 2, 72], [6, 2, 1, 71], [6, 3, 5, 69],
  [7, 0, 2, 76], [7, 2, 2, 75], [7, 4, 4, 74],
];
/** The second time through, it ends low, ready to loop back to the groove. */
// prettier-ignore
const TUNE_ENDING: [number, number, number, number][] = [
  ...TUNE.filter(([bar]) => bar < 6),
  [6, 0, 2, 72], [6, 2, 1, 71], [6, 3, 3, 69], [6, 6, 2, 64],
  [7, 0, 8, 64],
];

type Section = 'intro' | 'A' | 'B' | 'bridge' | 'B2';
/** Which section a bar is in, and its chord. Bar 32 loops back to bar 4 (the intro plays once). */
function barInfo(bar: number): { section: Section; chord: ChordName; inSection: number } {
  const b = bar < 32 ? bar : 4 + ((bar - 4) % 28);
  if (b < 4) return { section: 'intro', chord: 'Am', inSection: b };
  if (b < 12) return { section: 'A', chord: VERSE[b - 4], inSection: b - 4 };
  if (b < 20) return { section: 'B', chord: VERSE[b - 12], inSection: b - 12 };
  if (b < 24) return { section: 'bridge', chord: BRIDGE[b - 20], inSection: b - 20 };
  return { section: 'B2', chord: VERSE[b - 24], inSection: b - 24 };
}

/** Plays the main menu theme from `startAt` until stopped. */
export function playMenuTheme(ctx: BaseAudioContext, dest: AudioNode, startAt: number): Playing {
  const out = outputStage(ctx, dest, startAt, 0.6);
  // Glue: a gentle compressor over everything.
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -20;
  glue.ratio.value = 3;
  const mix = ctx.createGain();
  mix.gain.value = 0.42;
  // Clear out rumble below what small speakers can play.
  const clean = ctx.createBiquadFilter();
  clean.type = 'highpass';
  clean.frequency.value = 38;
  mix.connect(clean).connect(glue).connect(out);
  // A springy reverb and a slapback echo for the guitar (and a little of the vibes).
  const spring = reverb(ctx, 1.6, 3);
  const springWet = ctx.createGain();
  springWet.gain.value = 0.3;
  spring.connect(springWet).connect(mix);
  const slap = ctx.createDelay(1);
  slap.delayTime.value = 0.11;
  const slapBack = ctx.createGain();
  slapBack.gain.value = 0.28;
  slap.connect(slapBack).connect(slap);
  slapBack.connect(mix);
  // A soft clip that gives the guitar its bite.
  const bite = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(((i / (curve.length - 1)) * 2 - 1) * 2.5);
  bite.curve = curve;
  const guitarBus = ctx.createGain();
  guitarBus.gain.value = 0.5;
  bite.connect(guitarBus);
  guitarBus.connect(mix);
  guitarBus.connect(spring);
  guitarBus.connect(slap);

  const hiss = noise(ctx, 2, 'white');

  /** Upright-ish bass: a plucked saw and a sine underneath, the filter closing fast. */
  const bass = (note: number, at: number) => {
    tone(ctx, mix, {
      type: 'sawtooth',
      note,
      at,
      dur: EIGHTH * 0.7,
      vol: 0.055,
      lowpass: 900,
      lowpassTo: 220,
      release: 0.06,
    });
    tone(ctx, mix, { type: 'sine', note, at, dur: EIGHTH * 0.75, vol: 0.08, release: 0.05 });
  };

  /** A vibraphone note: a sine and its bright 4th partial, with the motor's tremolo. */
  const vibe = (note: number, at: number, vol: number, ring = 1.4) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + ring);
    const trem = ctx.createGain();
    trem.gain.value = 0.7;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const depth = ctx.createGain();
    depth.gain.value = 0.3;
    lfo.connect(depth).connect(trem.gain);
    for (const [mult, v] of [
      [1, 1],
      [4, 0.12],
    ]) {
      const o = ctx.createOscillator();
      o.frequency.value = hz(note) * mult;
      const og = ctx.createGain();
      og.gain.value = v;
      o.connect(og).connect(g);
      o.start(at);
      o.stop(at + ring + 0.05);
    }
    g.connect(trem);
    trem.connect(mix);
    trem.connect(spring);
    lfo.start(at);
    lfo.stop(at + ring + 0.05);
  };

  /** The surf guitar: a bright saw through a wah-ish band-pass, slid up into long notes, with vibrato. */
  const guitar = (note: number, at: number, dur: number) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const f = hz(note);
    if (dur > EIGHTH * 1.5) {
      o.frequency.setValueAtTime(f * Math.pow(2, -1 / 12), at);
      o.frequency.exponentialRampToValueAtTime(f, at + 0.06);
    } else o.frequency.setValueAtTime(f, at);
    // Vibrato that comes in once the note has settled.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.8;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, at);
    depth.gain.linearRampToValueAtTime(f * 0.008, at + Math.min(0.35, dur));
    lfo.connect(depth).connect(o.frequency);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 1.4;
    band.frequency.setValueAtTime(1800, at);
    band.frequency.exponentialRampToValueAtTime(1000, at + 0.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.5, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.3, at + 0.25);
    g.gain.setValueAtTime(0.3, at + Math.max(0.25, dur));
    g.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(0.25, dur) + 0.2);
    o.connect(band).connect(g).connect(bite);
    const end = at + Math.max(0.25, dur) + 0.25;
    o.start(at);
    o.stop(end);
    lfo.start(at);
    lfo.stop(end);
  };

  /** Muted brass: a stab of detuned saws, the filter snapping shut. */
  const brass = (notes: readonly number[], at: number, dur: number, vol: number) => {
    for (const n of notes)
      for (const d of [-8, 8])
        tone(ctx, mix, {
          type: 'sawtooth',
          note: n + 12,
          at,
          dur,
          vol,
          detune: d,
          lowpass: 2600,
          lowpassTo: 600,
          release: 0.12,
        });
  };

  /** Finger snap: a short, bright crack. */
  const snap = (at: number) =>
    hit(ctx, mix, hiss, at, { type: 'bandpass', freq: 2900, q: 2.5, dur: 0.05, vol: 0.55, pan: 0.15 });
  /** Brushed snare: a soft swish. */
  const brush = (at: number, vol = 0.22) =>
    hit(ctx, mix, hiss, at, { type: 'bandpass', freq: 2300, q: 0.7, dur: 0.2, vol });
  /** Ride cymbal: a shimmery tap. */
  const ride = (at: number, vol: number) =>
    hit(ctx, mix, hiss, at, { type: 'bandpass', freq: 7200, q: 2.5, dur: 0.45, vol, pan: -0.25 });
  /** Bongos: a high and a low drum. */
  const bongo = (at: number, high: boolean) =>
    boom(ctx, mix, at, high ? 380 : 250, high ? 300 : 190, 0.12, 0.22);

  const stopSeq = sequencer(ctx, STEP, startAt, (i, at) => {
    const bar = Math.floor(i / 16);
    const s = i % 16;
    const { section, chord, inSection } = barInfo(bar);
    const c = CHORDS[chord];

    // The bass riff, on every 8th.
    if (s % 2 === 0) {
      const step = c.riff[s / 2];
      if (step >= 0) bass(c.root + step, at);
    }

    // Snaps on 2 and 4 from the second half of the intro, and through the groove.
    if ((s === 4 || s === 12) && ((section === 'intro' && inSection >= 2) || section === 'A')) snap(at);

    // Drums from the groove on: soft kick, ride pattern, brushes in the tune sections.
    if (section !== 'intro') {
      if (s === 0 || s === 8 || (section === 'bridge' && (s === 4 || s === 12)))
        boom(ctx, mix, at, 120, 50, 0.28, 0.32);
      if ([0, 4, 6, 8, 12, 14].includes(s)) ride(at, s % 4 === 0 ? 0.09 : 0.05);
      if (section !== 'A' && (s === 4 || s === 12)) brush(at);
      if ((section === 'B' || section === 'B2') && [2, 3, 10, 11, 14].includes(s))
        bongo(at, s !== 10 && s !== 11);
      // A brushed fill into the last tune, and a cymbal swell as it lands.
      if (section === 'bridge' && inSection === 3 && s >= 8) brush(at, 0.08 + (s - 8) * 0.03);
      if (section === 'B2' && inSection === 0 && s === 0)
        hit(ctx, mix, hiss, at, { type: 'highpass', freq: 5000, dur: 1.6, vol: 0.18 });
    }

    // Vibraphone chords: on the 1 and the "and" of 3 in the groove and tunes; a high shimmer in the intro.
    if (section === 'intro' && s === 0 && inSection % 2 === 0)
      for (const n of c.voicing) vibe(n + 12, at, 0.035, 2.2);
    if ((section === 'A' || section === 'B' || section === 'B2') && (s === 0 || s === 10))
      for (const n of c.voicing) vibe(n, at, s === 0 ? 0.085 : 0.06);

    // The bridge: muted brass hits on the off-beats.
    if (section === 'bridge') {
      if (s === 0) brass(c.voicing, at, 0.28, 0.035);
      if (s === 3 || s === 6 || s === 10) brass(c.voicing, at, 0.08, 0.03);
      if (s === 12) brass(c.voicing, at, 0.4, 0.035);
    }

    // The tune on the surf guitar (doubled an octave up on vibes the second time).
    if ((section === 'B' || section === 'B2') && s % 2 === 0)
      for (const [b, eighth, len, note] of section === 'B' ? TUNE : TUNE_ENDING)
        if (b === inSection && eighth === s / 2) {
          guitar(note, at, len * EIGHTH - 0.03);
          if (section === 'B2') vibe(note + 12, at, 0.03, 1);
        }
  });

  return {
    stop(fade = 1.5) {
      const now = ctx.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(out.gain.value, now);
      out.gain.linearRampToValueAtTime(0, now + fade);
      stopSeq();
      setTimeout(() => out.disconnect(), (fade + 2.5) * 1000);
    },
  };
}
