// Sound: our own music and the sound effects, all made live with Web Audio (no audio files).
// The pieces are in src/*Theme.ts and src/heistMusic.ts; in a heist the music follows the tension.
// Silent until the first click or key press.

import { playFinaleTheme } from './finaleTheme';
import { type Adaptive, type Intensity, playHeistTheme } from './heistMusic';
import { playLairTheme } from './lairTheme';
import { playMenuTheme } from './menuTheme';
import { playReportTheme } from './reportTheme';
import type { Playing } from './synth';

export type Sfx =
  | 'tick'
  | 'unlock'
  | 'safe-open'
  | 'hatch'
  | 'ui'
  | 'sell'
  | 'coin'
  | 'levelup'
  | 'step-carpet'
  | 'step-marble'
  | 'creak'
  | 'pick'
  | 'smash'
  | 'take'
  | 'door'
  | 'vent'
  | 'beep'
  | 'dials'
  | 'click'
  | 'clink'
  | 'clank'
  | 'bark'
  | 'splash'
  | 'alarm'
  | 'caught'
  | 'escape'
  | 'whoosh'
  | 'chime'
  | 'robot'
  | 'pounce'
  | 'tap'
  | 'achievement';

/** Music intensity: 0 silent, 1 sneaky, 2 suspicious, 3 chase (alarm). */
export type Tension = 0 | 1 | 2 | 3;

/** MIDI note number to frequency in Hz. */
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** Music scenes: where the player is, which picks the piece that plays (MUSIC below). */
export type MusicScene =
  | 'title'
  | 'intro'
  | 'lair'
  | 'market'
  | 'planning'
  | 'heist'
  | 'alert'
  | 'chase'
  | 'report'
  | 'finale';
/** One of our pieces: starts at `now`; the heist pieces start at a tension level and can follow it. */
type Piece = (ctx: AudioContext, out: AudioNode, now: number, level: Intensity) => Playing | Adaptive;
const menuTheme: Piece = (ctx, out, now) => playMenuTheme(ctx, out, now + 0.05);
const lairTheme: Piece = (ctx, out, now) => playLairTheme(ctx, out, now + 0.05);
const reportTheme: Piece = (ctx, out, now) => playReportTheme(ctx, out, now + 0.05);
const heistTheme: Piece = (ctx, out, now, level) => playHeistTheme(ctx, out, now + 0.05, level);
const finaleTheme: Piece = (ctx, out, now, level) => playFinaleTheme(ctx, out, now + 0.05, level);
/**
 * Which piece each scene plays. Scenes that share a piece share it without restarting: the lair theme carries
 * on from the lair to the black market to the planning board, and the heist theme just changes its level
 * when a guard gets suspicious or the alarm goes off.
 */
const MUSIC: Record<MusicScene, Piece | null> = {
  title: menuTheme,
  intro: null, // the intro plays its own music (introSounds.ts)
  lair: lairTheme,
  market: lairTheme,
  planning: lairTheme,
  heist: heistTheme,
  alert: heistTheme,
  chase: heistTheme,
  report: reportTheme,
  finale: finaleTheme, // NightClaw's places, at every level of tension
};
const HEIST_SCENES: MusicScene[] = ['heist', 'alert', 'chase', 'finale'];

/**
 * iPhone and iPad mute Web Audio (all the effects and live music) when the ring/silent switch is on silent.
 * Asking for media playback, or playing a silent media element, lets the game be heard like a video.
 */
let unmuted = false;
function unmuteIOS(): void {
  if (unmuted) return;
  unmuted = true;
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = 'playback';
  } catch {
    // Not supported: the silent clip below does the job.
  }
  // A tenth of a second of silence (8 kHz, 8-bit WAV), looping quietly in the background.
  const samples = 800;
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const text = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  text(36, 'data');
  view.setUint32(40, samples, true);
  bytes.fill(128, 44); // 8-bit silence is the middle value
  try {
    const el = new Audio(URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' })));
    el.loop = true;
    el.setAttribute('playsinline', '');
    void el.play().catch(() => {});
  } catch {
    // No media playback here (tests, old browsers): nothing to unmute.
  }
}

export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private tension: Tension = 0;
  private levels = { master: 0.8, music: 0.6, sfx: 0.8 };
  private scene: MusicScene | null = null;
  private finale = false;
  private live: { scene: MusicScene; piece: Piece; playing: Playing | Adaptive } | null = null; // the piece playing now

  /**
   * Plays something made live (like the intro's music) on the music or effects volume.
   * Does nothing (returns null) until the first click or key press has started the sound.
   */
  synth<T>(bus: 'music' | 'sfx', play: (ctx: AudioContext, out: AudioNode, now: number) => T): T | null {
    if (!this.ctx || !this.musicBus || !this.sfxBus) return null;
    // The music bus sits at half the music volume; lift the music to a comfortable level over it.
    const out = this.ctx.createGain();
    out.gain.value = bus === 'music' ? 4 : 1;
    out.connect(bus === 'music' ? this.musicBus : this.sfxBus);
    return play(this.ctx, out, this.ctx.currentTime);
  }

  /** Starts the audio context; call from a user gesture. Safe to call again. */
  unlock(): void {
    unmuteIOS();
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    try {
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
      this.musicBus = ctx.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus = ctx.createGain();
      this.sfxBus.connect(this.master);
      // A little room: every effect also goes, quietly, through a short reverb.
      const len2 = Math.floor(ctx.sampleRate * 1.4);
      const ir = ctx.createBuffer(2, len2, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d2 = ir.getChannelData(c);
        for (let i = 0; i < len2; i++) d2[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len2, 3.2);
      }
      const verb = ctx.createConvolver();
      verb.buffer = ir;
      const wet = ctx.createGain();
      wet.gain.value = 0.22;
      this.sfxBus.connect(verb).connect(wet).connect(this.master);
      const len = ctx.sampleRate;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyLevels();
      this.pickMusic();
    } catch {
      this.ctx = null;
    }
  }

  /** Sets the master, music and effects volumes (0..1). */
  setLevels(master: number, music: number, sfx: number): void {
    this.levels = { master, music, sfx };
    this.applyLevels();
  }

  /** Applies the volumes to the audio graph. */
  private applyLevels(): void {
    if (!this.ctx || !this.master || !this.musicBus || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.levels.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.levels.music * 0.5, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.levels.sfx, t, 0.05);
  }

  /** In a heist: sneaking, suspicious, chase. The heist music follows along. */
  setTension(t: Tension): void {
    this.tension = t;
    if (t > 0) this.setScene(this.finale ? 'finale' : t >= 3 ? 'chase' : t >= 2 ? 'alert' : 'heist', true);
  }

  /** The scene whose music is playing (for the tests). */
  get nowPlaying(): MusicScene | null {
    return this.live?.scene ?? null;
  }

  /** NightClaw's places get their own heist music. */
  setFinale(on: boolean): void {
    this.finale = on;
  }

  /** Moves the music to a scene (once audio is unlocked). `again` re-applies it, for a change of tension. */
  setScene(scene: MusicScene, again = false): void {
    if (scene === this.scene && !again) return;
    this.scene = scene;
    if (!HEIST_SCENES.includes(scene)) this.tension = 0;
    this.pickMusic();
  }

  /** Starts the scene's piece (fading out the last one), or keeps it going if the scene shares it. */
  private pickMusic(): void {
    if (!this.ctx || !this.scene) return;
    const piece = MUSIC[this.scene];
    const level: Intensity = this.tension >= 3 ? 3 : this.tension === 2 ? 2 : 1;
    if (this.live && this.live.piece !== piece) {
      this.live.playing.stop(1.5);
      this.live = null;
    }
    if (!piece) return;
    if (this.live) {
      this.live.scene = this.scene;
      if ('setIntensity' in this.live.playing) this.live.playing.setIntensity(level);
    } else {
      const playing = this.synth('music', (ctx, out, now) => piece(ctx, out, now, level));
      if (playing) this.live = { scene: this.scene, piece, playing };
    }
  }

  /** Stops all music. */
  stop(): void {
    this.live = null;
    void this.ctx?.close();
    this.ctx = null;
  }

  // Building blocks

  private tone(
    bus: GainNode,
    type: OscillatorType,
    freq: number,
    at: number,
    dur: number,
    vol: number,
    slideTo?: number,
    attack = 0.005,
  ): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(bus);
    o.start(at);
    o.stop(at + dur + 0.02);
  }

  /** Filtered noise: brushes, glass, splashes. */
  private hiss(
    bus: GainNode,
    at: number,
    dur: number,
    vol: number,
    filter: BiquadFilterType,
    freq: number,
    sweepTo?: number,
    q = 1,
  ): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, at);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, at + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(at, Math.random() * 0.5);
    src.stop(at + dur + 0.02);
  }

  /** A struck-metal sound (locks, latches, bottle caps). */
  private metal(
    bus: GainNode,
    at: number,
    freq: number,
    dur: number,
    vol: number,
    ratios = [1, 2.76, 5.4, 8.93],
  ): void {
    ratios.forEach((r, i) =>
      this.tone(
        bus,
        'sine',
        freq * r * (1 + (Math.random() - 0.5) * 0.01),
        at,
        dur / (1 + i * 0.6),
        vol / (1 + i * 0.9),
        undefined,
        0.001,
      ),
    );
  }

  /** A soft, low knock: a falling sine and a puff of low noise. */
  private thud(bus: GainNode, at: number, freq: number, vol: number, dur = 0.16): void {
    this.tone(bus, 'sine', freq, at, dur, vol, freq * 0.45, 0.002);
    this.hiss(bus, at, dur * 0.4, vol * 0.35, 'lowpass', freq * 4);
  }

  /** A little random variation, so repeated sounds aren't identical. */
  private vary(x: number, amount = 0.08): number {
    return x * (1 + (Math.random() - 0.5) * 2 * amount);
  }

  // Effects

  play(name: Sfx, delay = 0): void {
    const ctx = this.ctx;
    const b = this.sfxBus;
    if (!ctx || !b) return;
    const t = ctx.currentTime + delay;
    switch (name) {
      case 'step-carpet':
        // A padded paw on carpet: a soft low thump with a brush of fabric.
        this.thud(b, t, this.vary(110), 0.12, 0.08);
        return this.hiss(b, t, 0.05, 0.035, 'bandpass', this.vary(1400), undefined, 0.8);
      case 'step-marble':
        // Claws on stone: a tick with a bit of the hall's echo.
        this.hiss(b, t, 0.03, 0.1, 'highpass', 4500);
        this.metal(b, t, this.vary(2400, 0.12), 0.05, 0.025);
        return this.thud(b, t, 140, 0.06, 0.06);
      case 'creak':
        // An old board giving: a wobbling, grinding squeal.
        for (let k = 0; k < 3; k++)
          this.tone(
            b,
            'sawtooth',
            this.vary(210 - k * 30, 0.05),
            t + k * 0.09,
            0.22,
            0.05,
            this.vary(150 - k * 20),
            0.03,
          );
        return this.hiss(b, t, 0.4, 0.04, 'bandpass', 700, 400, 6);
      case 'pick':
        // Picks in a lock: a scrape and two tiny pins clicking.
        this.hiss(b, t, 0.09, 0.05, 'bandpass', this.vary(5200), 3800, 4);
        this.metal(b, t + 0.05, this.vary(3100, 0.1), 0.06, 0.05, [1, 2.3]);
        this.metal(b, t + 0.13, this.vary(3600, 0.1), 0.06, 0.04, [1, 2.3]);
        return;
      case 'unlock':
        // Unlock: pins clicking, then the bolt.
        [0, 0.07, 0.13].forEach((d, k) => this.metal(b, t + d, 2800 + k * 350, 0.05, 0.045, [1, 2.2]));
        this.thud(b, t + 0.22, 160, 0.35, 0.14);
        this.metal(b, t + 0.22, 820, 0.35, 0.12);
        this.tone(b, 'triangle', midi(84), t + 0.32, 0.4, 0.05);
        return;
      case 'safe-open':
        // The last tumbler drops, the handle turns, the heavy door swings.
        this.thud(b, t, 90, 0.45, 0.25);
        this.metal(b, t, 520, 0.5, 0.12);
        this.tone(b, 'sawtooth', 70, t + 0.18, 0.6, 0.05, 55, 0.08);
        this.hiss(b, t + 0.18, 0.6, 0.05, 'lowpass', 400);
        return;
      case 'smash':
        // An impact, the pane bursting, and shards tinkling down.
        this.thud(b, t, 120, 0.5, 0.2);
        this.hiss(b, t, 0.35, 0.45, 'highpass', 1800, 7000);
        for (let k = 0; k < 14; k++)
          this.metal(b, t + 0.03 + Math.random() * 0.6, 2500 + Math.random() * 4500, 0.12, 0.03, [1, 2.4]);
        return;
      case 'take':
        // A rustle into the sack and a bright little jingle.
        this.hiss(b, t, 0.18, 0.08, 'bandpass', 2200, 900, 1.2);
        this.tone(b, 'triangle', midi(79), t + 0.08, 0.12, 0.1);
        this.tone(b, 'triangle', midi(84), t + 0.15, 0.12, 0.1);
        return this.tone(b, 'triangle', midi(91), t + 0.22, 0.35, 0.08);
      case 'door':
        // A latch clicks, the hinges groan, the door bumps against the stop.
        this.metal(b, t, 1900, 0.06, 0.06, [1, 2.6]);
        this.tone(b, 'sawtooth', this.vary(160), t + 0.05, 0.35, 0.035, this.vary(240), 0.06);
        this.hiss(b, t + 0.05, 0.35, 0.03, 'bandpass', 900, 600, 8);
        return this.thud(b, t + 0.4, 95, 0.3, 0.18);
      case 'vent':
        // Crawling in a duct: the thin metal bonging under each paw.
        this.thud(b, t, this.vary(90), 0.16, 0.12);
        this.hiss(b, t, 0.3, 0.07, 'bandpass', this.vary(240), undefined, 14);
        return this.hiss(b, t, 0.22, 0.04, 'bandpass', this.vary(560), undefined, 18);
      case 'hatch':
        // A vent grate lifting out: a scrape, a clang and the duct's hollow boom.
        this.hiss(b, t, 0.18, 0.06, 'bandpass', 3000, 1500, 3);
        this.metal(b, t + 0.12, 640, 0.6, 0.12, [1, 2.1, 3.7, 5.9]);
        this.hiss(b, t + 0.12, 0.7, 0.08, 'bandpass', 180, undefined, 10);
        return this.thud(b, t + 0.12, 70, 0.25, 0.3);
      case 'beep':
        // A card reader: a clean two-tone chirp, then the magnetic lock releasing.
        this.tone(b, 'sine', 1320, t, 0.07, 0.07);
        this.tone(b, 'sine', 1760, t + 0.09, 0.12, 0.07);
        return this.thud(b, t + 0.22, 130, 0.2, 0.1);
      case 'dials':
        // A safe dial spinning: ratcheting ticks that ring a little inside the box.
        for (let k = 0; k < 6; k++) this.metal(b, t + k * 0.05, this.vary(1700, 0.04), 0.06, 0.04, [1, 3.1]);
        return this.thud(b, t + 0.32, 200, 0.12, 0.08);
      case 'clank':
        // A pick slipping in a lock: a heavy metal clank and a rattle.
        this.thud(b, t, 110, 0.45, 0.18);
        this.metal(b, t, 820, 0.35, 0.22, [1, 2.3, 3.6]);
        this.metal(b, t + 0.07, 1350, 0.18, 0.1);
        this.metal(b, t + 0.13, 1150, 0.12, 0.07);
        return;
      case 'click':
        // A switch or a lever: a crisp mechanical snap.
        this.metal(b, t, 2200, 0.04, 0.06, [1, 2.7]);
        return this.thud(b, t, 300, 0.1, 0.04);
      case 'ui':
        // Menu buttons: a soft wooden tock.
        this.tone(b, 'sine', 1100, t, 0.05, 0.08, 700, 0.001);
        return this.hiss(b, t, 0.02, 0.03, 'bandpass', 2500);
      case 'sell':
        // The fence's till: a drawer bell and coins counted out.
        this.metal(b, t, 1568, 0.7, 0.1, [1, 2.0, 3.0]);
        for (let k = 0; k < 5; k++)
          this.metal(b, t + 0.18 + k * 0.06, this.vary(3200, 0.1), 0.1, 0.035, [1, 2.4]);
        return;
      case 'clink':
        // A bottle cap bouncing three times across the floor.
        [0, 0.16, 0.27].forEach((d, k) =>
          this.metal(b, t + d, this.vary(2600), 0.18 - k * 0.04, 0.09 - k * 0.025),
        );
        return;
      case 'bark':
        for (const d of [0, 0.22]) {
          this.tone(b, 'sawtooth', 320, t + d, 0.12, 0.2, 180, 0.01);
          this.hiss(b, t + d, 0.1, 0.1, 'bandpass', 900);
        }
        return;
      case 'splash':
        return this.hiss(b, t, 0.7, 0.4, 'lowpass', 3000, 300);
      case 'alarm':
        for (let i = 0; i < 4; i++) this.tone(b, 'square', 640, t + i * 0.45, 0.4, 0.07, 960, 0.02);
        return;
      case 'caught':
        // A sad trombone.
        [midi(55), midi(54), midi(53)].forEach((f, i) =>
          this.tone(b, 'sawtooth', f, t + i * 0.3, 0.3, 0.08, undefined, 0.03),
        );
        return this.tone(b, 'sawtooth', midi(52), t + 0.9, 0.8, 0.08, midi(50), 0.03);
      case 'escape':
        [72, 76, 79, 84].forEach((n, i) => this.tone(b, 'triangle', midi(n), t + i * 0.09, 0.3, 0.1));
        return;
      case 'whoosh':
        return this.hiss(b, t, 1.1, 0.25, 'bandpass', 300, 3000, 0.8);
      case 'chime':
        [79, 84, 88].forEach((n, i) => this.tone(b, 'sine', midi(n), t + i * 0.15, 1.2, 0.08));
        return;
      case 'robot':
        return this.tone(b, 'square', 220, t, 0.18, 0.05, 440);
      case 'pounce':
        return this.hiss(b, t, 0.25, 0.1, 'bandpass', 800, 2400);
      case 'tap':
        this.tone(b, 'sine', 300, t, 0.08, 0.2);
        return this.tone(b, 'sine', 300, t + 0.18, 0.08, 0.2);
      case 'achievement':
        [84, 88, 91, 96].forEach((n, i) => this.tone(b, 'triangle', midi(n), t + i * 0.07, 0.4, 0.07));
        return;
      case 'tick':
        // A counter clicking over.
        this.tone(b, 'square', 1800, t, 0.03, 0.04);
        return;
      case 'coin':
        // Two bright notes, like a coin into the bag.
        this.tone(b, 'square', midi(88), t, 0.07, 0.05);
        this.tone(b, 'square', midi(95), t + 0.06, 0.22, 0.05);
        return;
      case 'levelup':
        // A rising arpeggio and a held major chord.
        [72, 76, 79, 84, 88, 91].forEach((n, i) =>
          this.tone(b, 'triangle', midi(n), t + i * 0.06, 0.35, 0.09),
        );
        [84, 88, 91, 96].forEach((n) =>
          this.tone(b, 'sawtooth', midi(n), t + 0.4, 0.9, 0.025, undefined, 0.02),
        );
        this.hiss(b, t + 0.4, 0.6, 0.05, 'highpass', 6000);
        return;
    }
  }
}

/** Sounds to play for things in a turn's log (not direct results of a click). */
export function soundsInLog(log: string[]): Sfx[] {
  const out: Sfx[] = [];
  const text = log.join(' ');
  if (/Woof/.test(text)) out.push('bark');
  if (/SPLASH/.test(text)) out.push('splash');
  if (/Creeeak/.test(text)) out.push('creak');
  if (/CRASH/.test(text)) out.push('smash');
  if (/heat signature|Robo|power down/.test(text)) out.push('robot');
  if (/Alarm!/.test(text)) out.push('alarm');
  return out;
}
