/**
 * Procedural Web Audio system. Produces all game sounds from oscillators,
 * so the game ships with no external audio assets.
 *
 * Audio context is created lazily on first user interaction. Browsers block
 * playing before a user gesture, so we avoid even constructing the context
 * until the player has clicked something.
 */

type SoundName =
  | "click"
  | "card"
  | "hit"
  | "block"
  | "victory"
  | "defeat"
  | "poison"
  | "relic"
  | "bossPhase"
  | "error";

interface ToneOpts {
  freq?: number;
  duration?: number;
  type?: OscillatorType;
  gain?: number;
  slide?: number;
}

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private enabled = true;

  /** Call this from the first user gesture to warm up the audio context. */
  ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const Ctor =
        (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        this.enabled = false;
        return null;
      }
      try {
        this.ctx = new Ctor();
      } catch {
        this.enabled = false;
        return null;
      }
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {
        /* ignore */
      });
    }
    return this.ctx;
  }

  private tone(opts: ToneOpts): void {
    const {
      freq = 440,
      duration = 0.08,
      type = "sine",
      gain = 0.045,
      slide = 0,
    } = opts;
    const ctx = this.ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, freq + slide),
        ctx.currentTime + duration
      );
    }
    amp.gain.setValueAtTime(0.0001, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }

  private chord(notes: number[], duration = 0.16, gain = 0.035): void {
    notes.forEach((freq, i) => {
      setTimeout(() => this.tone({ freq, duration, gain, type: "triangle" }), i * 30);
    });
  }

  play(name: SoundName): void {
    switch (name) {
      case "click":
        this.tone({ freq: 660, duration: 0.04, type: "square", gain: 0.025 });
        break;
      case "card":
        this.chord([420, 620, 840], 0.11, 0.028);
        break;
      case "hit":
        this.tone({ freq: 140, duration: 0.12, type: "sawtooth", gain: 0.05, slide: -60 });
        break;
      case "block":
        this.chord([260, 390], 0.13, 0.035);
        break;
      case "victory":
        this.chord([523, 659, 784, 1046], 0.24, 0.04);
        break;
      case "defeat":
        this.chord([300, 220, 150], 0.28, 0.048);
        break;
      case "poison":
        this.tone({ freq: 210, duration: 0.16, type: "triangle", gain: 0.035, slide: -80 });
        break;
      case "relic":
        this.chord([540, 720, 960], 0.22, 0.04);
        break;
      case "bossPhase":
        this.chord([180, 360, 540, 720], 0.3, 0.05);
        break;
      case "error":
        this.tone({ freq: 170, duration: 0.12, type: "square", gain: 0.03 });
        break;
    }
  }
}

export const audio = new AudioSystem();
