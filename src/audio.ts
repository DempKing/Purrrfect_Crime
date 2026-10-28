// Sound, all synthesised with Web Audio, so there are no files to load: a sneaky jazz loop that adds layers
// as the guards grow suspicious and turns into a big-band chase when an alarm trips, and short effects for
// footsteps, locks, glass, dogs, robots and the rest. Silent until the first click or key press (browsers
// won't start audio before then), and silent where Web Audio isn't available.

export type Sfx =
  | 'tick'
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

/** 0 silence, 1 the sneaky loop, 2 plus vibraphone (someone's suspicious), 3 the chase (an alarm). */
export type Tension = 0 | 1 | 2 | 3;

const BPM = { calm: 92, chase: 150 };
// A ii–V–I–vi loop in D minor-ish, as walking-bass roots and chord tones (MIDI note numbers).
const BARS = [
  { bass: [38, 41, 45, 43], chord: [62, 65, 69, 72] }, // Dm7
  { bass: [43, 47, 50, 49], chord: [59, 62, 65, 69] }, // G7
  { bass: [36, 40, 43, 45], chord: [60, 64, 67, 71] }, // Cmaj7
  { bass: [45, 44, 43, 40], chord: [57, 60, 64, 67] }, // Am7
];
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** Which music fits where. Each scene plays art/music/<scene>.mp3 if it's there (see art/music/README.md). */
export type MusicScene = 'title' | 'lair' | 'market' | 'planning' | 'heist' | 'alert' | 'chase' | 'report' | 'finale';
/** If a scene's track is missing, the next one along that has one. */
const MUSIC_FALLBACK: Record<MusicScene, MusicScene[]> = {
  title: ['title', 'lair'],
  lair: ['lair', 'title'],
  market: ['market', 'lair', 'title'],
  planning: ['planning', 'lair', 'title'],
  heist: ['heist'],
  alert: ['alert', 'heist'],
  chase: ['chase', 'alert', 'heist'],
  report: ['report', 'lair', 'title'],
  finale: ['finale', 'heist'],
};
const HEIST_SCENES: MusicScene[] = ['heist', 'alert', 'chase', 'finale'];

export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private tension: Tension = 0;
  private beat = 0; // eighth notes since the music started
  private nextAt = 0;
  private timer = 0;
  private levels = { master: 0.8, music: 0.6, sfx: 0.8 };
  private scene: MusicScene | null = null;
  private finale = false;
  private tracks = new Map<MusicScene, { el: HTMLAudioElement; ok: boolean | null; vol: number }>();
  private playing: MusicScene | null = null;
  private fadeTimer = 0;

  /** Starts the audio context; call from a user gesture. Safe to call again. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
      const len = ctx.sampleRate;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyLevels();
      this.pickTrack();
      this.nextAt = ctx.currentTime + 0.1;
      this.timer = window.setInterval(() => this.schedule(), 25);
    } catch {
      this.ctx = null;
    }
  }

  setLevels(master: number, music: number, sfx: number): void {
    this.levels = { master, music, sfx };
    this.applyLevels();
  }

  private applyLevels(): void {
    for (const t of this.tracks.values()) t.el.volume = this.trackVolume(t.vol);
    if (!this.ctx || !this.master || !this.musicBus || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.levels.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.levels.music * 0.5, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.levels.sfx, t, 0.05);
  }

  /** In a heist: calm, suspicious, chase. Picks the heist's music to match. */
  setTension(t: Tension): void {
    this.tension = t;
    if (t > 0) this.setScene(this.finale && t < 3 ? 'finale' : t >= 3 ? 'chase' : t >= 2 ? 'alert' : 'heist');
  }

  /** NightClaw's places get their own heist music. */
  setFinale(on: boolean): void {
    this.finale = on;
  }

  /** Changes the music for a screen, crossfading. Takes effect once audio is unlocked by a click or key. */
  setScene(scene: MusicScene): void {
    if (scene === this.scene) return;
    this.scene = scene;
    if (!HEIST_SCENES.includes(scene)) this.tension = 0;
    this.pickTrack();
  }

  private track(scene: MusicScene) {
    let t = this.tracks.get(scene);
    if (!t) {
      const el = new Audio();
      el.loop = true;
      el.preload = 'auto';
      const entry = { el, ok: null as boolean | null, vol: 0 };
      el.addEventListener('canplaythrough', () => {
        if (entry.ok === null) {
          entry.ok = true;
          this.pickTrack();
        }
      }, { once: true });
      el.addEventListener('error', () => {
        entry.ok = false;
        this.pickTrack();
      }, { once: true });
      el.src = `music/${scene}.mp3`;
      t = entry;
      this.tracks.set(scene, t);
    }
    return t;
  }

  /** The first track in the scene's list that exists; while one is still being checked, waits for it. */
  private pickTrack(): void {
    if (!this.ctx || !this.scene) return;
    for (const s of MUSIC_FALLBACK[this.scene]) {
      const t = this.track(s);
      if (t.ok === null) return;
      if (t.ok) return this.fadeTo(s);
    }
    this.fadeTo(null); // no file: the synthesised music in a heist, quiet elsewhere
  }

  private trackVolume(v: number): number {
    return Math.max(0, Math.min(1, v * this.levels.master * this.levels.music));
  }

  /** Fades the playing track out and another in, over a second or so. */
  private fadeTo(scene: MusicScene | null): void {
    this.playing = scene;
    window.clearInterval(this.fadeTimer);
    this.fadeTimer = window.setInterval(() => {
      let busy = false;
      for (const [s, t] of this.tracks) {
        const want = s === this.playing ? 1 : 0;
        if (want && t.el.paused) void t.el.play().catch(() => {});
        t.vol += Math.max(-0.05, Math.min(0.05, want - t.vol));
        t.el.volume = this.trackVolume(t.vol);
        if (!want && t.vol <= 0 && !t.el.paused) t.el.pause();
        if (t.vol !== want) busy = true;
      }
      if (!busy) window.clearInterval(this.fadeTimer);
    }, 50);
  }

  stop(): void {
    window.clearInterval(this.timer);
    void this.ctx?.close();
    this.ctx = null;
  }

  // --- building blocks ----------------------------------------------------------------------------

  private tone(bus: GainNode, type: OscillatorType, freq: number, at: number, dur: number, vol: number, slideTo?: number, attack = 0.005): void {
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

  private hiss(bus: GainNode, at: number, dur: number, vol: number, filter: BiquadFilterType, freq: number, sweepTo?: number, q = 1): void {
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

  // --- the music ---------------------------------------------------------------------------------

  /** Schedules the next few eighth notes, a little ahead of time. */
  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    while (this.nextAt < ctx.currentTime + 0.12) {
      // The synthesised band plays in heists that have no music file.
      if (this.tension > 0 && !this.playing && this.scene && HEIST_SCENES.includes(this.scene)) this.playEighth(this.nextAt, this.beat);
      const chase = this.tension === 3;
      const eighth = 60 / (chase ? BPM.chase : BPM.calm) / 2;
      // Swing: long-short eighths.
      this.nextAt += this.beat % 2 === 0 ? eighth * 1.3 : eighth * 0.7;
      this.beat = (this.beat + 1) % 32;
    }
  }

  private playEighth(at: number, beat: number): void {
    const bus = this.musicBus!;
    const bar = BARS[Math.floor(beat / 8) % BARS.length];
    const quarter = Math.floor((beat % 8) / 2);
    const onBeat = beat % 2 === 0;
    const chase = this.tension === 3;
    // Walking bass on every quarter note.
    if (onBeat) this.tone(bus, 'triangle', midi(bar.bass[quarter]), at, chase ? 0.18 : 0.32, 0.5, undefined, 0.01);
    // The ride cymbal: ding, ding-a ding.
    if (onBeat || quarter % 2 === 1) this.hiss(bus, at, onBeat ? 0.12 : 0.06, onBeat ? 0.05 : 0.035, 'highpass', 7000);
    // Brushes on 2 and 4.
    if (onBeat && quarter % 2 === 1) this.hiss(bus, at, 0.18, chase ? 0.14 : 0.08, 'bandpass', 2500, 1200, 0.7);
    if (this.tension >= 2 && onBeat && quarter === 0) {
      // Vibraphone: a soft chord at the top of each bar.
      for (const n of bar.chord) this.tone(bus, 'sine', midi(n), at, 1.1, 0.06, undefined, 0.01);
    }
    if (chase) {
      // Big-band stabs and a kick on every beat.
      if (onBeat) this.tone(bus, 'sine', 90, at, 0.12, 0.6, 45);
      if (beat % 8 === 0 || beat % 8 === 5) for (const n of bar.chord) this.tone(bus, 'sawtooth', midi(n), at, 0.16, 0.05);
    }
  }

  // --- effects -------------------------------------------------------------------------------------

  play(name: Sfx, delay = 0): void {
    const ctx = this.ctx;
    const b = this.sfxBus;
    if (!ctx || !b) return;
    const t = ctx.currentTime + delay;
    switch (name) {
      case 'step-carpet':
        return this.hiss(b, t, 0.06, 0.08, 'lowpass', 500);
      case 'step-marble':
        this.hiss(b, t, 0.04, 0.12, 'highpass', 3000);
        return this.tone(b, 'sine', 1800, t, 0.03, 0.04);
      case 'creak':
        return this.tone(b, 'sawtooth', 180, t, 0.35, 0.08, 120, 0.05);
      case 'pick':
        this.tone(b, 'square', 3200, t, 0.02, 0.05);
        return this.tone(b, 'square', 2600, t + 0.07, 0.02, 0.05);
      case 'smash':
        this.hiss(b, t, 0.5, 0.5, 'highpass', 2000, 6000);
        for (let i = 0; i < 6; i++) this.tone(b, 'sine', 3000 + Math.random() * 3000, t + i * 0.04, 0.12, 0.06);
        return;
      case 'take':
        this.tone(b, 'triangle', midi(76), t, 0.12, 0.12);
        return this.tone(b, 'triangle', midi(83), t + 0.08, 0.25, 0.12);
      case 'door':
        this.tone(b, 'sine', 120, t, 0.15, 0.3, 70);
        return this.hiss(b, t, 0.08, 0.08, 'lowpass', 800);
      case 'vent':
        return this.tone(b, 'triangle', 220, t, 0.25, 0.1, 160);
      case 'beep':
        this.tone(b, 'square', 880, t, 0.06, 0.05);
        return this.tone(b, 'square', 1320, t + 0.08, 0.1, 0.05);
      case 'dials':
        for (let i = 0; i < 3; i++) this.tone(b, 'square', 1500, t + i * 0.06, 0.015, 0.05);
        return;
      case 'click':
        return this.tone(b, 'square', 1000, t, 0.015, 0.06);
      case 'clink':
        this.tone(b, 'sine', 2600, t, 0.25, 0.12);
        return this.tone(b, 'sine', 3900, t + 0.12, 0.2, 0.06);
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
        [midi(55), midi(54), midi(53)].forEach((f, i) => this.tone(b, 'sawtooth', f, t + i * 0.3, 0.3, 0.08, undefined, 0.03));
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
        [72, 76, 79, 84, 88, 91].forEach((n, i) => this.tone(b, 'triangle', midi(n), t + i * 0.06, 0.35, 0.09));
        [84, 88, 91, 96].forEach((n) => this.tone(b, 'sawtooth', midi(n), t + 0.4, 0.9, 0.025, undefined, 0.02));
        this.hiss(b, t + 0.4, 0.6, 0.05, 'highpass', 6000);
        return;
    }
  }
}

/** The sounds a turn's log calls for, in order, for things that aren't a direct result of a click. */
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
