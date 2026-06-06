"use client";

// Web Audio API ambient + crystalline sound engine for Flowermon.
// All audio is created on demand (after user gesture) to satisfy browser policy.

const PENTATONIC_HZ = [261.63, 329.63, 392.0, 493.88, 523.25, 659.25, 783.99, 987.77];
const AMBIENT_FREQS = [55.0, 82.41, 110.0, 164.81];
const MELODY_PATTERN = [0, 2, 4, 7, 4, 2, 0, 5, 4, 2, 7, 4];

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private ambientOscs: OscillatorNode[] = [];
  private melodyTimer: ReturnType<typeof setInterval> | null = null;
  private noteIndex = 0;
  enabled = false;

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
    AMBIENT_FREQS.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const flt = ctx.createBiquadFilter();

      osc.type = "sine";
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
      const freq = PENTATONIC_HZ[MELODY_PATTERN[this.noteIndex % MELODY_PATTERN.length]];
      this.noteIndex++;
      this.playTone(ctx, freq * 2, "triangle", 0.09, 1.4);
    };
    playNote();
    this.melodyTimer = setInterval(playNote, 1600);
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
