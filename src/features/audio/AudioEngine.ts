import type { AudioConfig } from '@/entities/pattern'

/**
 * WebAudio synthesis engine. Plain TypeScript class — not a hook.
 * Supports four modes: bilateral, binaural, drone, rhythmic.
 *
 * AudioContext is deferred to first user gesture (init()).
 */
export class AudioEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private pannerNode: StereoPannerNode | null = null
  private oscillators: OscillatorNode[] = []
  private gains: GainNode[] = []
  private lfo: OscillatorNode | null = null
  private lfoGain: GainNode | null = null
  private volume = 0.5
  private currentMode: AudioConfig['mode'] | null = null
  private isPlaying = false

  /** Call on first user gesture (click/tap) */
  init(): void {
    if (this.ctx) return
    this.ctx = new AudioContext()
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0
    this.masterGain.connect(this.ctx.destination)
  }

  private ensureCtx(): AudioContext {
    if (!this.ctx) this.init()
    return this.ctx!
  }

  // ── Mode starters ─────────────────────────────────────

  startBilateral(config: AudioConfig): void {
    this.stopNodes()
    const ctx = this.ensureCtx()
    this.currentMode = 'bilateral'

    const osc = ctx.createOscillator()
    osc.type = config.waveform
    osc.frequency.value = config.frequency

    const gain = ctx.createGain()
    gain.gain.value = 1

    this.pannerNode = ctx.createStereoPanner()
    this.pannerNode.pan.value = 0

    osc.connect(gain)
    gain.connect(this.pannerNode)
    this.pannerNode.connect(this.masterGain!)

    osc.start()
    this.oscillators.push(osc)
    this.gains.push(gain)

    this.fadeIn()
  }

  startBinaural(config: AudioConfig): void {
    this.stopNodes()
    const ctx = this.ensureCtx()
    this.currentMode = 'binaural'
    const delta = config.binauralDelta ?? 4

    // Left oscillator
    const oscL = ctx.createOscillator()
    oscL.type = config.waveform
    oscL.frequency.value = config.frequency

    const panL = ctx.createStereoPanner()
    panL.pan.value = -1

    const gainL = ctx.createGain()
    gainL.gain.value = 1

    oscL.connect(gainL)
    gainL.connect(panL)
    panL.connect(this.masterGain!)

    // Right oscillator (frequency + delta)
    const oscR = ctx.createOscillator()
    oscR.type = config.waveform
    oscR.frequency.value = config.frequency + delta

    const panR = ctx.createStereoPanner()
    panR.pan.value = 1

    const gainR = ctx.createGain()
    gainR.gain.value = 1

    oscR.connect(gainR)
    gainR.connect(panR)
    panR.connect(this.masterGain!)

    oscL.start()
    oscR.start()
    this.oscillators.push(oscL, oscR)
    this.gains.push(gainL, gainR)

    this.fadeIn()
  }

  startDrone(config: AudioConfig): void {
    this.stopNodes()
    const ctx = this.ensureCtx()
    this.currentMode = 'drone'
    const intervals = config.droneIntervals ?? [1, 1.5, 2, 0.5]

    for (let i = 0; i < intervals.length; i++) {
      const freq = config.frequency * intervals[i]
      // Slight detune for organic shimmer: ±2-3 cents
      const detuneCents = (Math.random() - 0.5) * 6

      const osc = ctx.createOscillator()
      osc.type = i % 2 === 0 ? 'sine' : 'triangle'
      osc.frequency.value = freq
      osc.detune.value = detuneCents

      const gain = ctx.createGain()
      // Sub-octave quieter
      gain.gain.value = intervals[i] < 1 ? 0.3 : 0.7

      osc.connect(gain)
      gain.connect(this.masterGain!)

      osc.start()
      this.oscillators.push(osc)
      this.gains.push(gain)
    }

    // Slow amplitude LFO (0.1 Hz) for breathing effect
    this.lfo = ctx.createOscillator()
    this.lfo.type = 'sine'
    this.lfo.frequency.value = 0.1

    this.lfoGain = ctx.createGain()
    this.lfoGain.gain.value = 0.15 // modulation depth

    this.lfo.connect(this.lfoGain)
    this.lfoGain.connect(this.masterGain!.gain)
    this.lfo.start()

    this.fadeIn()
  }

  startRhythmic(config: AudioConfig): void {
    this.stopNodes()
    const ctx = this.ensureCtx()
    this.currentMode = 'rhythmic'
    const bpm = config.rhythmBPM ?? 60
    const lfoFreq = bpm / 60 // Hz

    const osc = ctx.createOscillator()
    osc.type = config.waveform
    osc.frequency.value = config.frequency

    const oscGain = ctx.createGain()
    oscGain.gain.value = 1

    // Amplitude modulation LFO for rhythmic pulsing
    this.lfo = ctx.createOscillator()
    this.lfo.type = 'sine'
    this.lfo.frequency.value = lfoFreq

    this.lfoGain = ctx.createGain()
    this.lfoGain.gain.value = 0.4 // pulse depth

    this.lfo.connect(this.lfoGain)
    this.lfoGain.connect(oscGain.gain)

    osc.connect(oscGain)
    oscGain.connect(this.masterGain!)

    osc.start()
    this.lfo.start()
    this.oscillators.push(osc)
    this.gains.push(oscGain)

    this.fadeIn()
  }

  /** Start the correct mode based on config. Call from a user gesture context! */
  start(config: AudioConfig): void {
    const ctx = this.ensureCtx()
    // Resume suspended context (browser autoplay policy)
    if (ctx.state === 'suspended') {
      void ctx.resume()
    }

    switch (config.mode) {
      case 'bilateral':
        this.startBilateral(config)
        break
      case 'binaural':
        this.startBinaural(config)
        break
      case 'drone':
        this.startDrone(config)
        break
      case 'rhythmic':
        this.startRhythmic(config)
        break
    }
    this.isPlaying = true
  }

  // ── Pan control (bilateral mode only) ─────────────────

  /** Set stereo pan. value: -1 (left) to 1 (right). Smooth ramp. */
  setPan(value: number): void {
    if (!this.pannerNode || !this.ctx || this.currentMode !== 'bilateral') return
    const now = this.ctx.currentTime
    this.pannerNode.pan.cancelScheduledValues(now)
    this.pannerNode.pan.linearRampToValueAtTime(
      Math.max(-1, Math.min(1, value)),
      now + 0.05,
    )
  }

  // ── Volume control ────────────────────────────────────

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value))
    if (!this.masterGain || !this.ctx || !this.isPlaying) return
    const now = this.ctx.currentTime
    this.masterGain.gain.cancelScheduledValues(now)
    this.masterGain.gain.linearRampToValueAtTime(this.volume, now + 0.05)
  }

  getVolume(): number {
    return this.volume
  }

  // ── Lifecycle ─────────────────────────────────────────

  pause(): void {
    if (!this.masterGain || !this.ctx) return
    this.isPlaying = false
    const now = this.ctx.currentTime
    this.masterGain.gain.cancelScheduledValues(now)
    this.masterGain.gain.linearRampToValueAtTime(0, now + 0.1)
  }

  resume(): void {
    if (!this.masterGain || !this.ctx) return
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume()
    }
    this.isPlaying = true
    const now = this.ctx.currentTime
    this.masterGain.gain.cancelScheduledValues(now)
    this.masterGain.gain.linearRampToValueAtTime(this.volume, now + 0.1)
  }

  stop(): void {
    if (!this.masterGain || !this.ctx) return
    this.isPlaying = false
    const now = this.ctx.currentTime
    this.masterGain.gain.cancelScheduledValues(now)
    this.masterGain.gain.linearRampToValueAtTime(0, now + 0.3)

    // Cleanup after fade
    setTimeout(() => this.stopNodes(), 350)
  }

  destroy(): void {
    this.stopNodes()
    if (this.ctx) {
      void this.ctx.close()
      this.ctx = null
      this.masterGain = null
    }
  }

  // ── Internal ──────────────────────────────────────────

  private fadeIn(): void {
    if (!this.masterGain || !this.ctx) return
    const now = this.ctx.currentTime
    this.masterGain.gain.cancelScheduledValues(now)
    this.masterGain.gain.setValueAtTime(0, now)
    this.masterGain.gain.linearRampToValueAtTime(this.volume, now + 0.1)
  }

  private stopNodes(): void {
    for (const osc of this.oscillators) {
      try { osc.stop() } catch { /* already stopped */ }
      osc.disconnect()
    }
    for (const gain of this.gains) {
      gain.disconnect()
    }
    if (this.lfo) {
      try { this.lfo.stop() } catch { /* already stopped */ }
      this.lfo.disconnect()
      this.lfo = null
    }
    if (this.lfoGain) {
      this.lfoGain.disconnect()
      this.lfoGain = null
    }
    if (this.pannerNode) {
      this.pannerNode.disconnect()
      this.pannerNode = null
    }
    this.oscillators = []
    this.gains = []
    this.currentMode = null
  }
}
