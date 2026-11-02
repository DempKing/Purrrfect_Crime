// Building blocks for music made live with Web Audio: notes, drums, noise, reverb and a step sequencer.
// The intro's sounds (introSounds.ts) and the main menu theme (menuTheme.ts) are made from these.

export interface Playing {
  /** Fades out over `fade` seconds (the TV switching off is near-instant) and stops. */
  stop(fade?: number): void;
}

/** MIDI note number to frequency in Hz. */
export const hz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** A buffer of noise: white (hiss) or brown (a low rumble). */
export function noise(ctx: BaseAudioContext, seconds: number, kind: 'white' | 'brown'): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    last = kind === 'brown' ? (last + 0.02 * w) / 1.02 : w;
    d[i] = kind === 'brown' ? last * 3.5 : w;
  }
  return buf;
}

/** A simple room reverb: decaying noise as the impulse response. */
export function reverb(ctx: BaseAudioContext, seconds: number, decay: number): ConvolverNode {
  const len = Math.ceil(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  const conv = ctx.createConvolver();
  conv.buffer = buf;
  return conv;
}

/** Calls `fn(step, time)` for each step a little ahead of time, until the returned function is called. */
export function sequencer(
  ctx: BaseAudioContext,
  stepSeconds: number,
  startAt: number,
  fn: (step: number, at: number) => void,
) {
  let next = startAt;
  let step = 0;
  // Live: keep 0.3s ahead. Rendering offline (for tests): schedule the whole length at once.
  const offline = typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext;
  const tick = () => {
    const until = offline ? (ctx as OfflineAudioContext).length / ctx.sampleRate : ctx.currentTime + 0.3;
    while (next < until) {
      fn(step++, next);
      next += stepSeconds;
    }
  };
  tick();
  if (offline) return () => {};
  const id = setInterval(tick, 50);
  return () => clearInterval(id);
}

export interface Tone {
  type: OscillatorType;
  note: number; // MIDI note
  at: number;
  dur: number; // seconds held before the release
  vol: number;
  attack?: number;
  release?: number;
  detune?: number; // cents
  lowpass?: number; // Hz, with an optional sweep down to `lowpassTo`
  lowpassTo?: number;
  pan?: number;
}

/** One note: an oscillator through an optional low-pass filter and a volume envelope. */
export function tone(ctx: BaseAudioContext, out: AudioNode, o: Tone): void {
  const attack = o.attack ?? 0.005;
  const release = o.release ?? 0.08;
  const osc = ctx.createOscillator();
  osc.type = o.type;
  osc.frequency.value = hz(o.note);
  osc.detune.value = o.detune ?? 0;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, o.at);
  g.gain.linearRampToValueAtTime(o.vol, o.at + attack);
  g.gain.setValueAtTime(o.vol, o.at + Math.max(attack, o.dur));
  g.gain.exponentialRampToValueAtTime(0.0001, o.at + Math.max(attack, o.dur) + release);
  let node: AudioNode = osc;
  if (o.lowpass) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(o.lowpass, o.at);
    if (o.lowpassTo) f.frequency.exponentialRampToValueAtTime(o.lowpassTo, o.at + o.dur + release);
    node.connect(f);
    node = f;
  }
  node.connect(g);
  if (o.pan) {
    const p = ctx.createStereoPanner();
    p.pan.value = o.pan;
    g.connect(p);
    p.connect(out);
  } else g.connect(out);
  osc.start(o.at);
  osc.stop(o.at + Math.max(attack, o.dur) + release + 0.05);
}

/** A burst of filtered noise: drums, ticks, the crash in the sting. */
export function hit(
  ctx: BaseAudioContext,
  out: AudioNode,
  buf: AudioBuffer,
  at: number,
  o: { type: BiquadFilterType; freq: number; q?: number; dur: number; vol: number; pan?: number },
): void {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = o.type;
  f.frequency.value = o.freq;
  f.Q.value = o.q ?? 1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(o.vol, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + o.dur);
  src.connect(f).connect(g);
  if (o.pan) {
    const p = ctx.createStereoPanner();
    p.pan.value = o.pan;
    g.connect(p).connect(out);
  } else g.connect(out);
  src.start(at, Math.random() * (buf.duration - o.dur - 0.01));
  src.stop(at + o.dur + 0.02);
}

/** A drum: a sine that drops in pitch (a kick, or a timpani for the sting). */
export function boom(
  ctx: BaseAudioContext,
  out: AudioNode,
  at: number,
  from: number,
  to: number,
  dur: number,
  vol: number,
) {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + dur * 0.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

/** The output stage both sounds share: a volume we can fade, and a clean stop. */
export function outputStage(ctx: BaseAudioContext, dest: AudioNode, startAt: number, fadeIn: number) {
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, startAt);
  out.gain.linearRampToValueAtTime(1, startAt + fadeIn);
  out.connect(dest);
  return out;
}
