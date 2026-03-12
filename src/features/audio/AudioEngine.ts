import type { AudioConfig } from '@/entities/pattern'

/**
 * WebAudio synthesis engine. Plain TypeScript class — not a hook.
 * Supports four modes: bilateral, binaural, drone, rhythmic.
 * Each mode can be enriched with optional layers:
 * - bilateral: stereo detune for richer tone
 * - drone: singing bowl strikes, pink noise, pitch LFO
 * - rhythmic: sub-bass oscillator, pitch bend from dot Y
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

  // Singing bowl
  private bowlInterval: ReturnType<typeof setInterval> | null = null
  private bowlFirstTimeout: ReturnType<typeof setTimeout> | null = null

  // Pink noise
  private noiseSource: AudioBufferSourceNode | null = null
  private noiseGain: GainNode | null = null

  // Pitch LFO for drone
  private pitchLfo: OscillatorNode | null = null
  private pitchLfoGains: GainNode[] = []

  // Pitch bend (rhythmic, Y-driven)
  private pitchBendRange = 0
  private pitchBendBaseFreq = 0

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
    const detune = config.bilateralDetune ?? 0

    this.pannerNode = ctx.createStereoPanner()
    this.pannerNode.pan.value = 0
    this.pannerNode.connect(this.masterGain!)

    if (detune > 0) {
      // Dual oscillators with ±detune for richer bilateral tone
      const oscA = ctx.createOscillator()
      oscA.type = config.waveform
      oscA.frequency.value = config.frequency - detune

      const oscB = ctx.createOscillator()
      oscB.type = config.waveform
      oscB.frequency.value = config.frequency + detune

      const gainA = ctx.createGain()
      gainA.gain.value = 0.6

      const gainB = ctx.createGain()
      gainB.gain.value = 0.6

      oscA.connect(gainA)
      gainA.connect(this.pannerNode)
      oscB.connect(gainB)
      gainB.connect(this.pannerNode)

      oscA.start()
      oscB.start()
      this.oscillators.push(oscA, oscB)
      this.gains.push(gainA, gainB)
    } else {
      const osc = ctx.createOscillator()
      osc.type = config.waveform
      osc.frequency.value = config.frequency

      const gain = ctx.createGain()
      gain.gain.value = 1

      osc.connect(gain)
      gain.connect(this.pannerNode)

      osc.start()
      this.oscillators.push(osc)
      this.gains.push(gain)
    }

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

    // Pitch LFO: slow ±N Hz modulation on all drone oscillators
    if (config.pitchLFO && config.pitchLFO > 0) {
      this.startPitchLFO(ctx, config.pitchLFO)
    }

    // Pink noise layer
    if (config.pinkNoise && config.pinkNoise > 0) {
      this.startPinkNoise(ctx, config.pinkNoise)
    }

    // Singing bowl periodic strikes
    if (config.singingBowlInterval && config.singingBowlInterval > 0) {
      this.startSingingBowl(ctx, config.frequency, config.singingBowlInterval)
    }

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

    // Sub-bass oscillator
    if (config.subBass && config.subBass > 0) {
      const sub = ctx.createOscillator()
      sub.type = 'sine'
      sub.frequency.value = config.subBass

      const subGain = ctx.createGain()
      subGain.gain.value = 0.1 // ~-20dB

      sub.connect(subGain)
      subGain.connect(this.masterGain!)
      sub.start()
      this.oscillators.push(sub)
      this.gains.push(subGain)
    }

    // Pitch bend support (Y-driven)
    if (config.pitchBendRange && config.pitchBendRange > 0) {
      this.pitchBendRange = config.pitchBendRange
      this.pitchBendBaseFreq = config.frequency
    }

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

  /** Set pitch bend from normalized Y. value: -1 (top) to 1 (bottom). */
  setPitchBend(normalizedY: number): void {
    if (this.pitchBendRange <= 0 || !this.ctx) return
    // First oscillator in rhythmic mode is the main tone
    const osc = this.oscillators[0]
    if (!osc) return
    const offset = normalizedY * this.pitchBendRange
    const now = this.ctx.currentTime
    osc.frequency.cancelScheduledValues(now)
    osc.frequency.linearRampToValueAtTime(
      this.pitchBendBaseFreq + offset,
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

  // ── Audio layers ────────────────────────────────────────

  /**
   * Singing bowl: inharmonic partials with exponential decay.
   * Strikes once immediately, then repeats at the given interval.
   */
  private startSingingBowl(_ctx: AudioContext, baseFreq: number, intervalMs: number): void {
    // First strike delayed 5s to let the drone establish,
    // then repeat at intervalMs after that
    const firstStrikeDelay = 5000
    this.bowlFirstTimeout = setTimeout(() => {
      if (this.isPlaying && this.ctx) {
        this.strikeBowl(this.ctx, baseFreq)
      }
      this.bowlInterval = setInterval(() => {
        if (this.isPlaying && this.ctx) {
          this.strikeBowl(this.ctx, baseFreq)
        }
      }, intervalMs)
    }, firstStrikeDelay)
  }

  /** Single singing bowl strike: 5 inharmonic partials with decay */
  private strikeBowl(ctx: AudioContext, baseFreq: number): void {
    // Inharmonic partial ratios characteristic of Tibetan singing bowls
    const partials = [1.0, 2.71, 5.04, 8.09, 11.65]
    const now = ctx.currentTime

    for (let i = 0; i < partials.length; i++) {
      const freq = baseFreq * partials[i]
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      // Characteristic frequency drift (wobble)
      osc.frequency.linearRampToValueAtTime(
        freq * (1 + (Math.random() - 0.5) * 0.003),
        now + 3,
      )

      const gain = ctx.createGain()
      // Higher partials start quieter and decay faster
      const startGain = 0.25 / (1 + i * 0.8)
      const decayTime = 5 / (1 + i * 0.5)
      gain.gain.setValueAtTime(startGain, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + decayTime)

      osc.connect(gain)
      gain.connect(this.masterGain!)

      osc.start(now)
      osc.stop(now + decayTime + 0.1)
    }
  }

  /** Pink noise generated via Paul Kellet's algorithm, looped buffer */
  private startPinkNoise(ctx: AudioContext, level: number): void {
    const bufferSize = ctx.sampleRate * 2
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    }

    this.noiseSource = ctx.createBufferSource()
    this.noiseSource.buffer = buffer
    this.noiseSource.loop = true

    this.noiseGain = ctx.createGain()
    this.noiseGain.gain.value = level

    this.noiseSource.connect(this.noiseGain)
    this.noiseGain.connect(this.masterGain!)
    this.noiseSource.start()
  }

  /** Slow pitch modulation on all current drone oscillators */
  private startPitchLFO(ctx: AudioContext, rangeHz: number): void {
    this.pitchLfo = ctx.createOscillator()
    this.pitchLfo.type = 'sine'
    this.pitchLfo.frequency.value = 0.07 // ~4s per wobble cycle

    for (const osc of this.oscillators) {
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = rangeHz
      this.pitchLfo.connect(lfoGain)
      lfoGain.connect(osc.frequency)
      this.pitchLfoGains.push(lfoGain)
    }

    this.pitchLfo.start()
  }

  // ── Phase transition bell ─────────────────────────────

  /**
   * Bell-like strike for eyes-closed phase transitions.
   * Distinct timbre from Sama periodic bowl: brighter, shorter decay,
   * different partial ratios (harmonic bell vs inharmonic bowl).
   *
   * 'close' = single warm strike (signal to close eyes)
   * 'open'  = two brighter strikes 400ms apart (signal to open eyes)
   */
  strikePhaseTransition(type: 'close' | 'open'): void {
    const ctx = this.ctx
    if (!ctx || !this.masterGain) return

    // Bell level is independent of this.volume because masterGain already applies it.
    // Drone oscillators use gain ~0.7 each (3-4 of them), so bell needs ~1.5+ to cut through.
    if (type === 'close') {
      // Single strike, boosted to match perceived loudness of double open-strike.
      // 360Hz sits above drone harmonics to avoid masking.
      this.strikeBell(ctx, 360, 1.8)
    } else {
      this.strikeBell(ctx, 420, 1.3)
      setTimeout(() => {
        if (this.ctx) this.strikeBell(this.ctx, 420, 0.85)
      }, 400)
    }
  }

  /**
   * Single bell strike: harmonic partials with slow decay.
   * Rich, resonant meditation bell that cuts through drone textures.
   */
  private strikeBell(ctx: AudioContext, baseFreq: number, level: number): void {
    const partials = [1.0, 2.0, 3.0, 4.24, 5.41]
    const gains =    [1.0, 0.6, 0.3, 0.15, 0.08]
    const decays =   [6.0, 4.5, 3.0, 2.0,  1.5]
    const now = ctx.currentTime

    for (let i = 0; i < partials.length; i++) {
      const freq = baseFreq * partials[i]
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq

      const gain = ctx.createGain()
      const startGain = level * gains[i]
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(startGain, now + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.001, now + decays[i])

      osc.connect(gain)
      gain.connect(this.masterGain!)

      osc.start(now)
      osc.stop(now + decays[i] + 0.1)
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
    // Singing bowl interval + first strike timeout
    if (this.bowlFirstTimeout !== null) {
      clearTimeout(this.bowlFirstTimeout)
      this.bowlFirstTimeout = null
    }
    if (this.bowlInterval !== null) {
      clearInterval(this.bowlInterval)
      this.bowlInterval = null
    }

    // Pink noise
    if (this.noiseSource) {
      try { this.noiseSource.stop() } catch { /* already stopped */ }
      this.noiseSource.disconnect()
      this.noiseSource = null
    }
    if (this.noiseGain) {
      this.noiseGain.disconnect()
      this.noiseGain = null
    }

    // Pitch LFO
    if (this.pitchLfo) {
      try { this.pitchLfo.stop() } catch { /* already stopped */ }
      this.pitchLfo.disconnect()
      this.pitchLfo = null
    }
    for (const g of this.pitchLfoGains) {
      g.disconnect()
    }
    this.pitchLfoGains = []

    // Reset pitch bend
    this.pitchBendRange = 0
    this.pitchBendBaseFreq = 0

    // Core oscillators and gains
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
