import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AudioEngine } from './AudioEngine'
import type { AudioConfig } from '@/entities/pattern'

// ── WebAudio mock ────────────────────────────────────────

function createMockParam(initial = 0) {
  return {
    value: initial,
    cancelScheduledValues: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  }
}

function createMockOscillator() {
  return {
    type: 'sine' as OscillatorType,
    frequency: createMockParam(440),
    detune: createMockParam(0),
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
}

function createMockGain() {
  return {
    gain: createMockParam(1),
    connect: vi.fn(),
    disconnect: vi.fn(),
  }
}

function createMockPanner() {
  return {
    pan: createMockParam(0),
    connect: vi.fn(),
    disconnect: vi.fn(),
  }
}

function createMockBufferSource() {
  return {
    buffer: null as AudioBuffer | null,
    loop: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
}

function createMockContext() {
  return {
    state: 'running' as AudioContextState,
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn(() => createMockOscillator()),
    createGain: vi.fn(() => createMockGain()),
    createStereoPanner: vi.fn(() => createMockPanner()),
    createBuffer: vi.fn((_channels: number, length: number, sampleRate: number) => ({
      getChannelData: vi.fn(() => new Float32Array(length)),
      sampleRate,
      length,
      numberOfChannels: _channels,
      duration: length / sampleRate,
    })),
    createBufferSource: vi.fn(() => createMockBufferSource()),
  }
}

let mockCtx: ReturnType<typeof createMockContext>

beforeEach(() => {
  mockCtx = createMockContext()
  // Regular function (not arrow) to work with `new`
  vi.stubGlobal('AudioContext', function MockAudioContext() {
    return mockCtx
  })
  vi.useFakeTimers()
})

// ── Helpers ──────────────────────────────────────────────

const bilateral: AudioConfig = { mode: 'bilateral', frequency: 396, waveform: 'sine' }
const bilateralDetuned: AudioConfig = { mode: 'bilateral', frequency: 285, waveform: 'sine', bilateralDetune: 2 }
const binaural: AudioConfig = { mode: 'binaural', frequency: 200, waveform: 'sine', binauralDelta: 6 }
const drone: AudioConfig = { mode: 'drone', frequency: 196, waveform: 'sine', droneIntervals: [1, 1.5, 2.5] }
const droneWithBowl: AudioConfig = { mode: 'drone', frequency: 196, waveform: 'sine', droneIntervals: [1, 1.5], singingBowlInterval: 5000 }
const droneWithNoise: AudioConfig = { mode: 'drone', frequency: 130, waveform: 'sine', droneIntervals: [1, 1.5], pinkNoise: 0.03 }
const droneWithPitchLFO: AudioConfig = { mode: 'drone', frequency: 165, waveform: 'sine', droneIntervals: [1, 1.5], pitchLFO: 3 }
const rhythmic: AudioConfig = { mode: 'rhythmic', frequency: 396, waveform: 'sine', rhythmBPM: 60 }
const rhythmicWithSubBass: AudioConfig = { mode: 'rhythmic', frequency: 196, waveform: 'sine', rhythmBPM: 45, subBass: 65 }
const rhythmicWithPitchBend: AudioConfig = { mode: 'rhythmic', frequency: 432, waveform: 'triangle', rhythmBPM: 50, pitchBendRange: 15 }

// ── Tests ────────────────────────────────────────────────

describe('AudioEngine', () => {
  describe('init / lifecycle', () => {
    it('creates AudioContext on init()', () => {
      const engine = new AudioEngine()
      engine.init()
      // masterGain created = context initialized
      expect(mockCtx.createGain).toHaveBeenCalled()
    })

    it('init() is idempotent', () => {
      const engine = new AudioEngine()
      engine.init()
      engine.init()
      // createGain called only once (for masterGain)
      expect(mockCtx.createGain).toHaveBeenCalledOnce()
    })

    it('destroy() closes context', () => {
      const engine = new AudioEngine()
      engine.init()
      engine.destroy()
      expect(mockCtx.close).toHaveBeenCalled()
    })
  })

  describe('bilateral mode', () => {
    it('creates oscillator at config frequency', () => {
      const engine = new AudioEngine()
      engine.start(bilateral)
      expect(mockCtx.createOscillator).toHaveBeenCalled()
      expect(mockCtx.createStereoPanner).toHaveBeenCalled()
    })

    it('detuned bilateral creates 2 oscillators', () => {
      const engine = new AudioEngine()
      engine.start(bilateralDetuned)
      // 2 oscillators for ±2Hz detune
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2)
      const oscs = mockCtx.createOscillator.mock.results.map(r => r.value)
      expect(oscs[0].frequency.value).toBe(285 - 2) // 283
      expect(oscs[1].frequency.value).toBe(285 + 2) // 287
    })

    it('setPan updates panner smoothly', () => {
      const engine = new AudioEngine()
      engine.start(bilateral)
      const panner = mockCtx.createStereoPanner.mock.results[0].value
      engine.setPan(0.7)
      expect(panner.pan.linearRampToValueAtTime).toHaveBeenCalled()
    })

    it('setPan clamps to [-1, 1]', () => {
      const engine = new AudioEngine()
      engine.start(bilateral)
      const panner = mockCtx.createStereoPanner.mock.results[0].value
      engine.setPan(5)
      expect(panner.pan.linearRampToValueAtTime).toHaveBeenCalledWith(1, expect.any(Number))
      engine.setPan(-5)
      expect(panner.pan.linearRampToValueAtTime).toHaveBeenCalledWith(-1, expect.any(Number))
    })

    it('setPan is no-op in non-bilateral modes', () => {
      const engine = new AudioEngine()
      engine.start(drone)
      engine.setPan(0.5)
      // No panner created for drone
      expect(mockCtx.createStereoPanner).not.toHaveBeenCalled()
    })
  })

  describe('binaural mode', () => {
    it('creates 2 oscillators with frequency offset', () => {
      const engine = new AudioEngine()
      engine.start(binaural)
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2)
      const oscs = mockCtx.createOscillator.mock.results.map(r => r.value)
      expect(oscs[0].frequency.value).toBe(200)
      expect(oscs[1].frequency.value).toBe(206) // 200 + 6
    })

    it('hard-pans L=-1 and R=+1', () => {
      const engine = new AudioEngine()
      engine.start(binaural)
      const panners = mockCtx.createStereoPanner.mock.results.map(r => r.value)
      expect(panners[0].pan.value).toBe(-1)
      expect(panners[1].pan.value).toBe(1)
    })
  })

  describe('drone mode', () => {
    it('creates oscillators for each interval', () => {
      const engine = new AudioEngine()
      engine.start(drone)
      // 3 intervals + 1 amplitude LFO = 4 oscillators
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(4)
    })

    it('sub-intervals get lower gain', () => {
      const droneWithSub: AudioConfig = {
        mode: 'drone', frequency: 130, waveform: 'sine',
        droneIntervals: [1, 1.5, 2, 0.5],
      }
      const engine = new AudioEngine()
      engine.start(droneWithSub)
      // 4 intervals + 1 LFO = 5 createGain calls (4 for intervals + 1 for LFO)
      const gains = mockCtx.createGain.mock.results.map(r => r.value)
      // Last interval is 0.5 (sub-octave), corresponding gain is gains[3]
      // gains[0..3] are interval gains, gains[4] is LFO gain, gains[5] is master (from init)
      // Actually, master gain is created first via init(), so gains order is:
      // [master, interval0, interval1, interval2, interval3, lfoGain]
      // interval3 corresponds to 0.5 interval
      expect(gains[4].gain.value).toBe(0.3) // sub-octave quieter
    })
  })

  describe('drone + singing bowl', () => {
    it('delays first strike by 5 seconds', () => {
      const engine = new AudioEngine()
      engine.start(droneWithBowl)
      // Only drone oscs + amp LFO, no bowl yet: 2 + 1 = 3
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(3)
      // After 5s, first bowl strike: +5 partials
      vi.advanceTimersByTime(5000)
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(8)
    })

    it('strikes again at interval after first strike', () => {
      const engine = new AudioEngine()
      engine.start(droneWithBowl)
      vi.advanceTimersByTime(5000) // first strike
      const callsBefore = mockCtx.createOscillator.mock.calls.length
      vi.advanceTimersByTime(5000) // interval strike
      // 5 more partials
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(callsBefore + 5)
    })

    it('clears interval and timeout on stop', () => {
      const engine = new AudioEngine()
      engine.start(droneWithBowl)
      engine.stop()
      vi.advanceTimersByTime(400) // past the stopNodes timeout
      const callsAfterStop = mockCtx.createOscillator.mock.calls.length
      vi.advanceTimersByTime(10000)
      expect(mockCtx.createOscillator.mock.calls.length).toBe(callsAfterStop)
    })
  })

  describe('drone + pink noise', () => {
    it('creates buffer source with looping', () => {
      const engine = new AudioEngine()
      engine.start(droneWithNoise)
      expect(mockCtx.createBufferSource).toHaveBeenCalledOnce()
      expect(mockCtx.createBuffer).toHaveBeenCalledOnce()
      const src = mockCtx.createBufferSource.mock.results[0].value
      expect(src.loop).toBe(true)
      expect(src.start).toHaveBeenCalled()
    })

    it('noise gain matches config level', () => {
      const engine = new AudioEngine()
      engine.start(droneWithNoise)
      // Gains: master, drone0, drone1, ampLFO, noiseGain
      const allGains = mockCtx.createGain.mock.results.map(r => r.value)
      const noiseGain = allGains[allGains.length - 1]
      expect(noiseGain.gain.value).toBe(0.03)
    })
  })

  describe('drone + pitch LFO', () => {
    it('creates pitch LFO oscillator connected to drone frequencies', () => {
      const engine = new AudioEngine()
      engine.start(droneWithPitchLFO)
      // 2 drone oscs + 1 amp LFO + 1 pitch LFO = 4 oscillators
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(4)
      // Pitch LFO gains: one per drone oscillator = 2
      const allGains = mockCtx.createGain.mock.results.map(r => r.value)
      // Last 2 gains should be pitch LFO gains with value = 3 (pitchLFO range)
      const pitchLfoGains = allGains.slice(-2)
      expect(pitchLfoGains[0].gain.value).toBe(3)
      expect(pitchLfoGains[1].gain.value).toBe(3)
    })
  })

  describe('rhythmic mode', () => {
    it('creates oscillator and amplitude LFO', () => {
      const engine = new AudioEngine()
      engine.start(rhythmic)
      // 1 main osc + 1 LFO = 2 oscillators
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2)
    })
  })

  describe('rhythmic + sub-bass', () => {
    it('adds sub-bass oscillator', () => {
      const engine = new AudioEngine()
      engine.start(rhythmicWithSubBass)
      // 1 main + 1 LFO + 1 sub-bass = 3 oscillators
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(3)
      const oscs = mockCtx.createOscillator.mock.results.map(r => r.value)
      expect(oscs[2].frequency.value).toBe(65)
    })

    it('sub-bass gain is ~-20dB (0.1)', () => {
      const engine = new AudioEngine()
      engine.start(rhythmicWithSubBass)
      // Gains: master, oscGain, lfoGain, subGain
      const allGains = mockCtx.createGain.mock.results.map(r => r.value)
      const subGain = allGains[allGains.length - 1]
      expect(subGain.gain.value).toBe(0.1)
    })
  })

  describe('rhythmic + pitch bend', () => {
    it('setPitchBend modulates main oscillator frequency', () => {
      const engine = new AudioEngine()
      engine.start(rhythmicWithPitchBend)
      const osc = mockCtx.createOscillator.mock.results[0].value
      engine.setPitchBend(0.5)
      // 432 + 0.5 * 15 = 439.5
      expect(osc.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(
        439.5,
        expect.any(Number),
      )
    })

    it('setPitchBend is no-op without pitchBendRange', () => {
      const engine = new AudioEngine()
      engine.start(rhythmic) // no pitchBendRange
      const osc = mockCtx.createOscillator.mock.results[0].value
      engine.setPitchBend(0.5)
      expect(osc.frequency.linearRampToValueAtTime).not.toHaveBeenCalled()
    })
  })

  describe('volume', () => {
    it('setVolume ramps master gain', () => {
      const engine = new AudioEngine()
      engine.start(bilateral)
      engine.setVolume(0.8)
      expect(engine.getVolume()).toBe(0.8)
    })

    it('setVolume clamps to [0, 1]', () => {
      const engine = new AudioEngine()
      engine.setVolume(2)
      expect(engine.getVolume()).toBe(1)
      engine.setVolume(-1)
      expect(engine.getVolume()).toBe(0)
    })
  })

  describe('pause / resume', () => {
    it('pause fades master to 0', () => {
      const engine = new AudioEngine()
      engine.start(bilateral)
      const masterGain = mockCtx.createGain.mock.results[0].value
      engine.pause()
      expect(masterGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, expect.any(Number))
    })

    it('resume fades master to volume', () => {
      const engine = new AudioEngine()
      engine.start(bilateral)
      engine.setVolume(0.7)
      engine.pause()
      engine.resume()
      const masterGain = mockCtx.createGain.mock.results[0].value
      expect(masterGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.7, expect.any(Number))
    })

    it('resume calls ctx.resume() if suspended', () => {
      mockCtx.state = 'suspended'
      const engine = new AudioEngine()
      engine.start(bilateral)
      engine.pause()
      engine.resume()
      expect(mockCtx.resume).toHaveBeenCalled()
    })
  })

  describe('strikePhaseTransition', () => {
    it('close: creates 5 oscillators (one bell strike)', () => {
      const engine = new AudioEngine()
      engine.init()
      mockCtx.createOscillator.mockClear()
      engine.strikePhaseTransition('close')
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(5)
    })

    it('close: first oscillator frequency is 360Hz (baseFreq * 1.0)', () => {
      const engine = new AudioEngine()
      engine.init()
      mockCtx.createOscillator.mockClear()
      engine.strikePhaseTransition('close')
      const osc = mockCtx.createOscillator.mock.results[0].value
      expect(osc.frequency.value).toBe(360)
    })

    it('open: creates 5 oscillators immediately + 5 more after 400ms', () => {
      const engine = new AudioEngine()
      engine.init()
      mockCtx.createOscillator.mockClear()
      engine.strikePhaseTransition('open')
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(5)
      vi.advanceTimersByTime(400)
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(10)
    })

    it('open: first oscillator frequency is 420Hz', () => {
      const engine = new AudioEngine()
      engine.init()
      mockCtx.createOscillator.mockClear()
      engine.strikePhaseTransition('open')
      const osc = mockCtx.createOscillator.mock.results[0].value
      expect(osc.frequency.value).toBe(420)
    })

    it('close bell gain is fixed at 1.8 (volume-independent, masterGain handles volume)', () => {
      const engine = new AudioEngine()
      engine.init()
      engine.setVolume(0.8)
      mockCtx.createGain.mockClear()
      engine.strikePhaseTransition('close')
      const bellGain = mockCtx.createGain.mock.results[0].value
      const rampCall = bellGain.gain.linearRampToValueAtTime.mock.calls[0]
      expect(rampCall[0]).toBeCloseTo(1.8)
    })

    it('open bell gain is fixed at 1.3 (volume-independent)', () => {
      const engine = new AudioEngine()
      engine.init()
      engine.setVolume(0.8)
      mockCtx.createGain.mockClear()
      engine.strikePhaseTransition('open')
      const bellGain = mockCtx.createGain.mock.results[0].value
      const rampCall = bellGain.gain.linearRampToValueAtTime.mock.calls[0]
      expect(rampCall[0]).toBeCloseTo(1.3)
    })

    it('bell gain does not change with volume (masterGain handles it)', () => {
      const engine = new AudioEngine()
      engine.init()
      engine.setVolume(0.3)
      mockCtx.createGain.mockClear()
      engine.strikePhaseTransition('close')
      const bellGain = mockCtx.createGain.mock.results[0].value
      const rampCall = bellGain.gain.linearRampToValueAtTime.mock.calls[0]
      expect(rampCall[0]).toBeCloseTo(1.8)
    })

    it('no-op when context not initialized', () => {
      const engine = new AudioEngine()
      // Not calling init()
      engine.strikePhaseTransition('close')
      expect(mockCtx.createOscillator).not.toHaveBeenCalled()
    })
  })

  describe('stop / cleanup', () => {
    it('stop fades out then disconnects after timeout', () => {
      const engine = new AudioEngine()
      engine.start(bilateral)
      const osc = mockCtx.createOscillator.mock.results[0].value
      engine.stop()
      // Not stopped yet (waiting for fade)
      expect(osc.stop).not.toHaveBeenCalled()
      vi.advanceTimersByTime(400)
      expect(osc.stop).toHaveBeenCalled()
      expect(osc.disconnect).toHaveBeenCalled()
    })

    it('mode switch stops previous nodes', () => {
      const engine = new AudioEngine()
      engine.start(bilateral)
      const firstOsc = mockCtx.createOscillator.mock.results[0].value
      engine.start(drone) // switches mode
      expect(firstOsc.stop).toHaveBeenCalled()
    })
  })
})
