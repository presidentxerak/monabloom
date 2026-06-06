"use client";

// Web Audio API ambient + crystalline sound engine for Flowermon.
// All audio is created on demand (after user gesture) to satisfy browser policy.

const MELODY_PATTERN = [0, 1, 2, 4, 2, 1, 0, 3, 2, 1, 4, 2];

interface GenrePreset {
  tempo: number; // ms between notes
  type: OscillatorType;
  base: number; // base note (Hz)
  scale: number[]; // semitone offsets
  ambient: number[]; // drone frequencies
  ambientType: OscillatorType;
  vol: number;
  beat?: boolean; // play a kick on every note (driving genres)
}

const GENRE_PRESETS: Record<string, GenrePreset> = {
  crystal: { tempo: 1600, type: "triangle", base: 523.25, scale: [0, 2, 4, 7, 9], ambient: [55, 82.41, 110, 164.81], ambientType: "sine", vol: 0.09 },
  lofi: { tempo: 1050, type: "sine", base: 392, scale: [0, 3, 5, 7, 10], ambient: [49, 73.42, 98, 146.83], ambientType: "sine", vol: 0.08 },
  arcade: { tempo: 560, type: "square", base: 523.25, scale: [0, 2, 4, 5, 7], ambient: [65.41, 98, 130.81, 196], ambientType: "triangle", vol: 0.05 },
  forest: { tempo: 1950, type: "sine", base: 587.33, scale: [0, 2, 5, 9, 12], ambient: [43.65, 65.41, 87.31, 130.81], ambientType: "sine", vol: 0.08 },
  techno: { tempo: 300, type: "sawtooth", base: 261.63, scale: [0, 3, 5, 7, 10], ambient: [49, 98, 49, 98], ambientType: "sawtooth", vol: 0.045, beat: true },
  chip: { tempo: 220, type: "square", base: 523.25, scale: [0, 2, 4, 7, 9, 12], ambient: [65.41, 130.81, 98, 196], ambientType: "square", vol: 0.045, beat: true },
};

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private ambientOscs: OscillatorNode[] = [];
  private melodyTimer: ReturnType<typeof setInterval> | null = null;
  private noteIndex = 0;
  genre = "crystal";
  enabled = false;

  setGenre(id: string) {
    if (!GENRE_PRESETS[id]) return;
    this.genre = id;
    if (this.enabled && this.ctx) {
      // Restart the loops with the new preset.
      if (this.melodyTimer) { clearInterval(this.melodyTimer); this.melodyTimer = null; }
      this.ambientOscs.forEach((o) => { try { o.stop(this.ctx!.currentTime + 0.3); } catch {} });
      this.ambientOscs = [];
      this.startAmbient(this.ctx);
      this.startMelody(this.ctx);
    }
  }

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.reverb = this.buildReverb(this.ctx);
      this.reverb.connect(this.master);
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private buildReverb(ctx: AudioContext): ConvolverNode {
    const conv = ctx.createConvolver();
    const len = ctx.sampleRate * 2.5;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
      }
    }
    conv.buffer = buf;
    return conv;
  }

  enable() {
    const ctx = this.getCtx();
    this.enabled = true;
    this.master!.gain.setTargetAtTime(0.35, ctx.currentTime, 2);
    this.startAmbient(ctx);
    this.startMelody(ctx);
  }

  disable() {
    if (!this.ctx || !this.master) return;
    this.enabled = false;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 1.2);
    if (this.melodyTimer) {
      clearInterval(this.melodyTimer);
      this.melodyTimer = null;
    }
    this.ambientOscs.forEach((o) => {
      try {
        o.stop(this.ctx!.currentTime + 1.5);
      } catch {}
    });
    this.ambientOscs = [];
  }

  toggle() {
    if (this.enabled) this.disable();
    else this.enable();
  }

  private startAmbient(ctx: AudioContext) {
    const preset = GENRE_PRESETS[this.genre];
    preset.ambient.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const flt = ctx.createBiquadFilter();

      osc.type = preset.ambientType;
      osc.frequency.value = freq;
      osc.detune.value = (i % 3 - 1) * 4;

      flt.type = "lowpass";
      flt.frequency.value = 300 + i * 80;
      flt.Q.value = 0.5;

      gain.gain.value = 0.05 / (i * 0.7 + 1);

      osc.connect(flt);
      flt.connect(gain);
      gain.connect(this.reverb!);

      osc.start();
      this.ambientOscs.push(osc);
    });
  }

  private startMelody(ctx: AudioContext) {
    const playNote = () => {
      if (!this.enabled || !this.reverb || !ctx) return;
      const preset = GENRE_PRESETS[this.genre];
      const semi = preset.scale[MELODY_PATTERN[this.noteIndex % MELODY_PATTERN.length] % preset.scale.length];
      const freq = preset.base * Math.pow(2, semi / 12);
      this.noteIndex++;
      this.playTone(ctx, freq, preset.type, preset.vol, preset.tempo / 1000 + 0.2);
      if (preset.beat) this.playKick(ctx);
    };
    playNote();
    this.melodyTimer = setInterval(playNote, GENRE_PRESETS[this.genre].tempo);
  }

  /** A short punchy kick drum for the driving genres (dry, straight to master). */
  private playKick(ctx: AudioContext) {
    if (!this.master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = "sine";
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.12);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    type: OscillatorType,
    vol: number,
    dur: number,
  ) {
    if (!this.reverb) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const flt = ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.value = freq;
    flt.type = "bandpass";
    flt.frequency.value = freq;
    flt.Q.value = 1.8;

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(flt);
    flt.connect(gain);
    gain.connect(this.reverb);

    osc.start(now);
    osc.stop(now + dur + 0.1);
  }

  playBloom() {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const chords = [523.25, 659.25, 783.99, 1046.5];
    chords.forEach((freq, i) => {
      setTimeout(() => this.playTone(ctx, freq, "triangle", 0.1, 1.0), i * 80);
    });
  }

  playSparkle() {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    [2093, 2637, 3136, 4186].forEach((freq, i) => {
      setTimeout(() => this.playTone(ctx, freq, "sine", 0.06, 0.35), i * 45);
    });
  }

  playSell() {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    [392, 523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      setTimeout(() => this.playTone(ctx, freq, "triangle", 0.08, 0.6), i * 60);
    });
  }
}

let _engine: SoundEngine | null = null;
export function getSoundEngine(): SoundEngine {
  if (typeof window === "undefined") return new SoundEngine();
  if (!_engine) _engine = new SoundEngine();
  return _engine;
}
