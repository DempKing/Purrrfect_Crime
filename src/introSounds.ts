// Sounds for the opening cinematic, made live with Web Audio (no files):
// - the TV news theme: an urgent "breaking news" sting and bed, squeezed through a small TV speaker;
// - the cozy room once the TV is off: a warm pad, a music-box lullaby, a ticking clock and crickets outside.
// Each one starts at a given time and keeps going until stopped.
import { boom, hit, noise, outputStage, type Playing, reverb, sequencer, tone } from './synth';

export type { Playing } from './synth';

/**
 * The TV news theme, 120 bpm in D minor: a big sting (brass chord, timpani, crash), then an urgent bed
 * of pulsing bass, drums, a teletype-style ticker and brass stabs. Everything goes through a "TV speaker"
 * filter, so it sounds like it's coming from the set rather than the game.
 */
export function playNewsTheme(ctx: BaseAudioContext, dest: AudioNode, startAt: number): Playing {
  const out = outputStage(ctx, dest, startAt, 0.02);
  // The TV speaker: no deep bass, no sparkle, a bit of midrange honk, and squashed loud.
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 140;
  const honk = ctx.createBiquadFilter();
  honk.type = 'peaking';
  honk.frequency.value = 2400;
  honk.gain.value = 4;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 6500;
  const squash = ctx.createDynamicsCompressor();
  squash.threshold.value = -18;
  squash.ratio.value = 4;
  const mix = ctx.createGain();
  mix.gain.value = 0.55;
  mix.connect(hp).connect(honk).connect(lp).connect(squash).connect(out);

  const hiss = noise(ctx, 2, 'white');
  // One chord per bar: Dm, Bb, Gm, A.
  const BARS = [
    { root: 38, chord: [62, 65, 69] },
    { root: 34, chord: [62, 65, 70] },
    { root: 31, chord: [62, 67, 70] },
    { root: 33, chord: [61, 64, 69] },
  ];
  const TICKER = [1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0]; // the teletype rhythm, one bar of 16ths

  /** A brass stab: detuned saws with the filter closing fast. */
  const stab = (notes: number[], at: number, dur: number, vol: number) => {
    for (const n of notes)
      for (const d of [-9, 9])
        tone(ctx, mix, {
          type: 'sawtooth',
          note: n,
          at,
          dur,
          vol,
          detune: d,
          lowpass: 4200,
          lowpassTo: 700,
          release: 0.18,
        });
  };

  // The opening sting: DA... da-DAAA, with timpani and a crash.
  stab([50, 57, 62, 65, 69], startAt, 0.32, 0.05);
  boom(ctx, mix, startAt, 110, 55, 0.9, 0.9);
  hit(ctx, mix, hiss, startAt, { type: 'highpass', freq: 5000, dur: 1.6, vol: 0.35 });
  stab([50, 57, 62, 65, 69], startAt + 0.5, 0.12, 0.045);
  stab(
    [50, 57, 62, 66, 69].map((n) => n + 2),
    startAt + 0.75,
    0.9,
    0.05,
  );
  boom(ctx, mix, startAt + 0.75, 120, 60, 1.2, 0.9);

  // The bed starts after the sting.
  const STEP = 0.125; // a 16th note at 120 bpm
  const stopSeq = sequencer(ctx, STEP, startAt + 2, (i, at) => {
    const s = i % 16;
    const bar = BARS[Math.floor(i / 16) % 4];
    if (s === 0) {
      // A held string pad for the bar, and a brass stab every other bar.
      for (const n of bar.chord)
        for (const d of [-7, 7])
          tone(ctx, mix, {
            type: 'sawtooth',
            note: n - 12,
            at,
            dur: 1.9,
            vol: 0.018,
            detune: d,
            attack: 0.25,
            lowpass: 1400,
            release: 0.2,
          });
      if (Math.floor(i / 16) % 2 === 0) stab(bar.chord, at, 0.18, 0.04);
    }
    if (s === 6 && Math.floor(i / 16) % 2 === 1) stab(bar.chord, at, 0.14, 0.035);
    // Pulsing bass in 8ths, jumping an octave on the off-beats.
    if (s % 2 === 0)
      tone(ctx, mix, {
        type: 'sawtooth',
        note: bar.root + (s % 4 === 2 ? 12 : 0),
        at,
        dur: 0.09,
        vol: 0.16,
        lowpass: 600,
        lowpassTo: 200,
      });
    // Drums: kick, a clap on 2 and 4, ticking hats.
    if (s === 0 || s === 8 || s === 10) boom(ctx, mix, at, 140, 48, 0.22, 0.7);
    if (s === 4 || s === 12)
      hit(ctx, mix, hiss, at, { type: 'bandpass', freq: 1700, q: 0.8, dur: 0.14, vol: 0.5 });
    hit(ctx, mix, hiss, at, { type: 'highpass', freq: 8000, dur: 0.03, vol: s % 2 ? 0.08 : 0.15 });
    // The ticker: short high beeps, like news coming in over the wire.
    if (TICKER[s])
      tone(ctx, mix, {
        type: 'square',
        note: s % 4 === 0 ? 86 : 81,
        at,
        dur: 0.035,
        vol: 0.022,
        release: 0.02,
      });
  });

  return {
    stop(fade = 0.02) {
      const now = ctx.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(out.gain.value, now);
      out.gain.linearRampToValueAtTime(0, now + fade);
      stopSeq();
      setTimeout(() => out.disconnect(), (fade + 1.5) * 1000);
    },
  };
}

/**
 * The cozy room after the TV goes off, in F-sharp major so it sits happily under "Home": a slow warm pad,
 * a music-box lullaby with a little reverb, a soft clock tick-tock, faint crickets through the window
 * (on the left) and a low room hum.
 */
export function playCozyRoom(ctx: BaseAudioContext, dest: AudioNode, startAt: number): Playing {
  const out = outputStage(ctx, dest, startAt, 1.5);
  const mix = ctx.createGain();
  mix.gain.value = 1.6;
  const warm = ctx.createBiquadFilter();
  warm.type = 'lowpass';
  warm.frequency.value = 7000;
  mix.connect(warm).connect(out);
  const room = reverb(ctx, 2.4, 2.5);
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  room.connect(wet).connect(warm);

  // The room hum: brown noise, very low and quiet.
  const hum = ctx.createBufferSource();
  hum.buffer = noise(ctx, 4, 'brown');
  hum.loop = true;
  const humF = ctx.createBiquadFilter();
  humF.type = 'lowpass';
  humF.frequency.value = 320;
  const humG = ctx.createGain();
  humG.gain.value = 0.025;
  hum.connect(humF).connect(humG).connect(mix);
  hum.start(startAt);

  // The lullaby, 3/4 at 80 bpm: (beat, MIDI note). F# major: 5 3 1 | 2 - 3 | 4 3 2 | 1 - - | 5 6 5 | 3 - 1 | 2 3 2 | 1 - -
  const BEAT = 0.75;
  const TUNE: [number, number][] = [
    [0, 85],
    [1, 82],
    [2, 78],
    [3, 80],
    [5, 82],
    [6, 83],
    [7, 82],
    [8, 80],
    [9, 78],
    [12, 85],
    [13, 87],
    [14, 85],
    [15, 82],
    [17, 78],
    [18, 80],
    [19, 82],
    [20, 80],
    [21, 78],
  ];
  const LOOP = 24; // beats, 18 seconds
  // Pad chords, one per two bars (6 beats): F#maj7, Bmaj7, D#m7, B/C#.
  const PADS = [
    [54, 58, 61, 65],
    [59, 63, 66, 70],
    [51, 58, 61, 66],
    [49, 59, 63, 66],
  ];
  const tick = noise(ctx, 1, 'white');

  /** A music-box note: a sine with a bell-like overtone, plucked and ringing out. */
  const musicBox = (note: number, at: number) => {
    for (const [mult, vol] of [
      [0, 0.07],
      [12, 0.018],
      [19.02, 0.008],
    ] as const) {
      tone(ctx, mix, {
        type: 'sine',
        note: note + mult,
        at,
        dur: 0.01,
        vol,
        attack: 0.003,
        release: mult ? 0.6 : 1.6,
      });
      tone(ctx, room, { type: 'sine', note: note + mult, at, dur: 0.01, vol, attack: 0.003, release: 1.2 });
    }
  };

  const stopSeq = sequencer(ctx, BEAT / 4, startAt, (i, at) => {
    const beat = i / 4;
    const inLoop = beat % LOOP;
    // Pads: soft sine and triangle voices, slow to swell and fade.
    if (inLoop % 6 === 0)
      for (const n of PADS[(inLoop / 6) % 4])
        for (const type of ['sine', 'triangle'] as const)
          tone(ctx, mix, {
            type,
            note: n,
            at,
            dur: 4.2,
            vol: type === 'sine' ? 0.022 : 0.01,
            attack: 1.6,
            release: 2.2,
            lowpass: 1100,
            detune: type === 'sine' ? -4 : 4,
          });
    // The tune (after a short breath at the start).
    if (beat >= 1.5) for (const [b, n] of TUNE) if (inLoop === (b + 2) % LOOP) musicBox(n, at);
    // The clock: tick... tock, on every beat.
    if (i % 4 === 0)
      hit(ctx, mix, tick, at, {
        type: 'bandpass',
        freq: beat % 2 ? 2300 : 3100,
        q: 6,
        dur: 0.035,
        vol: 0.18,
        pan: 0.35,
      });
    // Crickets outside: now and then, a few quick chirps.
    if (i % 4 === 2 && Math.random() < 0.3)
      for (let c = 0; c < 3; c++)
        tone(ctx, mix, {
          type: 'sine',
          note: 109 + Math.random() * 0.3,
          at: at + c * 0.09,
          dur: 0.035,
          vol: 0.006,
          attack: 0.01,
          release: 0.03,
          pan: -0.6,
        });
  });

  return {
    stop(fade = 1.2) {
      const now = ctx.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(out.gain.value, now);
      out.gain.linearRampToValueAtTime(0, now + fade);
      stopSeq();
      setTimeout(
        () => {
          hum.stop();
          out.disconnect();
        },
        (fade + 2.5) * 1000,
      );
    },
  };
}

/** The TV switching off: a short click and the faint high whine of the set dying away. */
export function playTvOff(ctx: BaseAudioContext, dest: AudioNode, at: number): void {
  hit(ctx, dest, noise(ctx, 0.5, 'white'), at, { type: 'bandpass', freq: 1800, q: 2, dur: 0.04, vol: 0.5 });
  const whine = ctx.createOscillator();
  whine.frequency.setValueAtTime(15000, at);
  whine.frequency.exponentialRampToValueAtTime(9000, at + 0.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.012, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.6);
  whine.connect(g).connect(dest);
  whine.start(at);
  whine.stop(at + 0.65);
}
