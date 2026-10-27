// Procedural Web Audio API Synthesizer + Haptic Feedback + Pou Voice Recorder & Lip-Sync

class SoundManager {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public vibrate(pattern: number | number[] = 18) {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore on unsupported devices
    }
  }

  public playTap() {
    this.vibrate(12);
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.06);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public playLaugh(pitch = 1.35) {
    this.vibrate([20, 30, 20]);
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [420, 540, 480, 640];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = now + idx * 0.075;
      osc.frequency.setValueAtTime(freq * (pitch / 1.35), start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.18 * (pitch / 1.35), start + 0.065);
      gain.gain.setValueAtTime(0.16, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.072);
    });
  }

  public playEat(isHealthy: boolean) {
    this.vibrate([25, 40, 25]);
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isHealthy ? 'triangle' : 'sawtooth';
      const start = now + i * 0.11;
      const baseFreq = isHealthy ? 320 + i * 90 : 220 - i * 25;
      osc.frequency.setValueAtTime(baseFreq, start);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, start + 0.09);
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.095);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.1);
    }
  }

  public playCoin() {
    this.vibrate(15);
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.07); // E6
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playBubble() {
    this.vibrate(8);
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const startFreq = 380 + Math.random() * 280;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 2.1, now + 0.08);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playShower() {
    this.vibrate([15, 20, 15]);
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.35;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.25;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.35);
  }

  public playJump() {
    this.vibrate(14);
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.14);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.155);
  }

  public playHitHazard() {
    this.vibrate([40, 30, 50]);
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(170, now);
    osc.frequency.linearRampToValueAtTime(75, now + 0.22);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playSnore() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(85, now + 0.45);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.48);
  }

  public playVictoryFanfare() {
    this.vibrate([30, 40, 30, 40, 80]);
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = now + i * 0.11;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.34);
    });
  }

  // Synthesize Pou-style voice repetition + lip-sync envelope for simulated/fallback or TTS phrases
  public playPouSynthSpeech(
    pitch: number,
    durationMs: number,
    onMouthOpenChange: (openness: number) => void,
    onComplete?: () => void
  ) {
    const ctx = this.getContext();
    const syllables = Math.max(4, Math.floor(durationMs / 130));
    let idx = 0;

    const timer = window.setInterval(() => {
      if (idx >= syllables) {
        window.clearInterval(timer);
        onMouthOpenChange(0);
        onComplete?.();
        return;
      }

      if (ctx && !this.muted) {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const base = (310 + (idx % 4) * 65 + Math.random() * 50) * pitch;
        osc.frequency.setValueAtTime(base, now);
        osc.frequency.exponentialRampToValueAtTime(base * 1.18, now + 0.09);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      }

      const openAmount = 0.45 + Math.random() * 0.55;
      onMouthOpenChange(openAmount);
      window.setTimeout(() => onMouthOpenChange(0.1), 70);
      idx++;
    }, 125);
  }
}

export const sound = new SoundManager();
