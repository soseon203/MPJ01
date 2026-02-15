/**
 * SoundManager - Web Audio API 기반 사운드 효과 합성
 * 외부 오디오 파일 없이 코드로 사운드 생성
 * 라스트타워 게임용 효과음 시스템
 */

export class SoundManager {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private _muted = false;
  private _volume = 0.3;

  // ===== Core Infrastructure =====

  /** Lazy-init AudioContext */
  private getCtx(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = this._volume;
      this.masterGain.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  private getMaster(): GainNode {
    this.getCtx();
    return this.masterGain!;
  }

  mute(): void {
    this._muted = true;
  }

  unmute(): void {
    this._muted = false;
  }

  get isMuted(): boolean {
    return this._muted;
  }

  setVolume(v: number): void {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) {
      this.masterGain.gain.value = this._volume;
    }
  }

  getVolume(): number {
    return this._volume;
  }

  // ===== Sound Primitives =====

  /** Play a single oscillator tone */
  playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.3,
    attack = 0.01,
    decay?: number,
    freqEnd?: number
  ): void {
    if (this._muted) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(freqEnd, 20),
        ctx.currentTime + duration
      );
    }

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
    const decayTime = decay ?? duration * 0.7;
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + attack + decayTime);

    osc.connect(gain);
    gain.connect(this.getMaster());
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.05);
  }

  /** Play filtered noise burst */
  playNoise(
    duration: number,
    volume = 0.15,
    filterFreq = 3000,
    filterType: BiquadFilterType = 'lowpass'
  ): void {
    if (this._muted) return;
    const ctx = this.getCtx();
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    if (bufferSize <= 0) return;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(200, filterFreq * 0.1),
      ctx.currentTime + duration
    );

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.getMaster());
    source.start(ctx.currentTime);
  }

  // ===== Tower Sounds =====

  /** Basic tower shoot - short blip (800Hz sine, 0.05s) */
  towerShoot(): void {
    this.playTone(800, 0.05, 'sine', 0.1, 0.003, 0.04);
    this.playNoise(0.02, 0.03, 4000);
  }

  // ===== Orb Attack Sounds =====

  /** Fire orb - low rumble + crackle (200Hz saw, 0.15s) */
  orbAttackFire(): void {
    this.playTone(200, 0.15, 'sawtooth', 0.12, 0.005, 0.12, 100);
    this.playNoise(0.08, 0.06, 2000);
  }

  /** Ice orb - high shimmer (2000Hz sine with vibrato, 0.1s) */
  orbAttackIce(): void {
    if (this._muted) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000, ctx.currentTime);

    vibrato.type = 'sine';
    vibrato.frequency.setValueAtTime(30, ctx.currentTime);
    vibratoGain.gain.setValueAtTime(100, ctx.currentTime);

    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.005);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.getMaster());
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
    vibrato.start(ctx.currentTime);
    vibrato.stop(ctx.currentTime + 0.12);
  }

  /** Lightning - white noise burst + high pitch (0.08s) */
  orbAttackLightning(): void {
    this.playNoise(0.08, 0.12, 6000, 'highpass');
    this.playTone(3000, 0.05, 'sawtooth', 0.08, 0.002, 0.04, 800);
  }

  /** Poison - bubbly low tone (300Hz triangle modulated, 0.12s) */
  orbAttackPoison(): void {
    if (this._muted) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, ctx.currentTime);

    mod.type = 'sine';
    mod.frequency.setValueAtTime(20, ctx.currentTime);
    modGain.gain.setValueAtTime(80, ctx.currentTime);

    mod.connect(modGain);
    modGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.getMaster());
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.14);
    mod.start(ctx.currentTime);
    mod.stop(ctx.currentTime + 0.14);
  }

  /** Dark - deep bass drop (100Hz to 50Hz, 0.2s) */
  orbAttackDark(): void {
    this.playTone(100, 0.2, 'sine', 0.15, 0.005, 0.18, 50);
    this.playTone(60, 0.15, 'triangle', 0.08, 0.01, 0.13, 30);
  }

  /** Nature - soft chime (1200Hz sine, 0.08s) */
  orbAttackNature(): void {
    this.playTone(1200, 0.08, 'sine', 0.08, 0.003, 0.06);
    this.playTone(1800, 0.06, 'sine', 0.04, 0.005, 0.04);
  }

  // ===== Enemy Sounds =====

  /** Hit sound - thud (150Hz sine, 0.05s) */
  enemyHit(): void {
    this.playTone(150, 0.05, 'sine', 0.08, 0.002, 0.04);
  }

  /** Death - descending tone (400->100Hz, 0.15s) */
  enemyDeath(): void {
    this.playTone(400, 0.15, 'sine', 0.1, 0.003, 0.12, 100);
    this.playNoise(0.08, 0.05, 3000);
  }

  /** Boss death - explosion: noise burst + low boom (0.5s) */
  bossDeath(): void {
    this.playNoise(0.35, 0.2, 3500);
    this.playTone(150, 0.3, 'sawtooth', 0.18, 0.005, 0.25, 40);
    setTimeout(() => {
      this.playTone(100, 0.25, 'sine', 0.12, 0.01, 0.2, 30);
      this.playNoise(0.2, 0.1, 2000);
    }, 120);
    setTimeout(() => this.playNoise(0.15, 0.06, 1500), 250);
  }

  /** Critical hit - sharp ping (1500Hz, 0.08s + short noise) */
  criticalHit(): void {
    this.playTone(1500, 0.08, 'sine', 0.12, 0.002, 0.06);
    this.playNoise(0.04, 0.04, 5000, 'highpass');
  }

  // ===== Economy Sounds =====

  /** Coin sound - two quick high pings (1200Hz+1500Hz) */
  goldEarned(): void {
    this.playTone(1200, 0.06, 'sine', 0.08, 0.003, 0.05);
    setTimeout(() => this.playTone(1500, 0.06, 'sine', 0.06, 0.003, 0.05), 50);
  }

  /** Soft chime for exp (900Hz sine, 0.06s) */
  expGained(): void {
    this.playTone(900, 0.06, 'sine', 0.06, 0.003, 0.05);
  }

  // ===== Progression Sounds =====

  /** Ascending arpeggio C-E-G-C (0.4s total) */
  levelUp(): void {
    // C4=261.6, E4=329.6, G4=392.0, C5=523.3
    this.playTone(261.6, 0.12, 'sine', 0.1, 0.005, 0.1);
    setTimeout(() => this.playTone(329.6, 0.12, 'sine', 0.09, 0.005, 0.1), 100);
    setTimeout(() => this.playTone(392.0, 0.12, 'sine', 0.08, 0.005, 0.1), 200);
    setTimeout(() => this.playTone(523.3, 0.15, 'sine', 0.1, 0.005, 0.12), 300);
  }

  /** Skill purchase - ascending two tones (0.2s) */
  skillPurchase(): void {
    this.playTone(600, 0.08, 'sine', 0.1, 0.005, 0.07);
    setTimeout(() => this.playTone(900, 0.12, 'sine', 0.1, 0.005, 0.1), 80);
  }

  // ===== Shop Sounds =====

  /** Shop open - page flip (short noise burst, 0.1s) */
  shopOpen(): void {
    this.playNoise(0.1, 0.08, 4000, 'highpass');
    this.playTone(600, 0.06, 'sine', 0.05, 0.005, 0.04);
  }

  /** Shop close - soft close (200Hz sine, 0.05s) */
  shopClose(): void {
    this.playTone(200, 0.05, 'sine', 0.06, 0.005, 0.04);
  }

  // ===== Game State Sounds =====

  /** Wave start - horn/alert (300Hz saw, 0.3s with attack) */
  waveStart(): void {
    this.playTone(300, 0.3, 'sawtooth', 0.12, 0.05, 0.25);
    setTimeout(() => this.playTone(450, 0.2, 'sawtooth', 0.1, 0.03, 0.15), 150);
  }

  /** Game over - sad descending (400->200->100Hz, 0.5s) */
  gameOver(): void {
    this.playTone(400, 0.2, 'sawtooth', 0.15, 0.01, 0.18, 200);
    setTimeout(() => this.playTone(200, 0.2, 'sawtooth', 0.12, 0.01, 0.18, 100), 200);
    setTimeout(() => this.playTone(100, 0.25, 'sawtooth', 0.1, 0.01, 0.22, 50), 400);
  }

  /** Synergy activate - magical chord (3 frequencies simultaneously, 0.3s) */
  synergyActivate(): void {
    // Major chord: root + major third + fifth
    this.playTone(440, 0.3, 'sine', 0.08, 0.01, 0.25);
    this.playTone(554.4, 0.3, 'sine', 0.06, 0.01, 0.25);
    this.playTone(659.3, 0.3, 'sine', 0.06, 0.01, 0.25);
    // Shimmer
    this.playNoise(0.1, 0.03, 6000, 'highpass');
  }

  // ===== UI Sounds =====

  /** UI click (1000Hz sine, 0.02s) */
  buttonClick(): void {
    this.playTone(1000, 0.02, 'sine', 0.06, 0.002, 0.015);
  }

  /** Card flip - quick ascending (800->1200Hz, 0.1s) */
  cardReveal(): void {
    this.playTone(800, 0.1, 'sine', 0.08, 0.005, 0.08, 1200);
  }

  // ===== Special Sounds =====

  /** Execute kill - dramatic slice (high to low swoosh, 0.15s) */
  executeKill(): void {
    this.playTone(2000, 0.15, 'sawtooth', 0.12, 0.002, 0.12, 200);
    this.playNoise(0.08, 0.06, 5000, 'highpass');
  }

  /** Freeze sound - ice crack (noise + high ring, 0.1s) */
  freezeSound(): void {
    this.playNoise(0.06, 0.06, 6000, 'highpass');
    this.playTone(2500, 0.1, 'sine', 0.08, 0.003, 0.08);
  }
}

/** Singleton sound manager instance */
export const soundManager = new SoundManager();
