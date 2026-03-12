import { describe, it, expect } from 'vitest'
import { allPatterns, patternsById } from './configs'

describe('Pattern configs', () => {
  it('contains exactly 12 patterns', () => {
    expect(allPatterns).toHaveLength(12)
  })

  it('all IDs are unique', () => {
    const ids = allPatterns.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('patternsById contains all patterns', () => {
    for (const p of allPatterns) {
      expect(patternsById[p.id]).toBe(p)
    }
  })

  describe('amplitude ranges', () => {
    const moving = allPatterns.filter(p => p.trajectory !== 'fixation')

    it('moving patterns have amplitude >= 0.3', () => {
      for (const p of moving) {
        expect(p.trajectoryParams.amplitude, `${p.id} amplitude too low`).toBeGreaterThanOrEqual(0.3)
      }
    })

    it('moving patterns have amplitude <= 0.6', () => {
      for (const p of moving) {
        expect(p.trajectoryParams.amplitude, `${p.id} amplitude too high`).toBeLessThanOrEqual(0.6)
      }
    })

    it('fixation patterns have amplitude 0', () => {
      const fixation = allPatterns.filter(p => p.trajectory === 'fixation')
      for (const p of fixation) {
        expect(p.trajectoryParams.amplitude, `${p.id}`).toBe(0)
      }
    })
  })

  describe('audio config consistency', () => {
    it('bilateral patterns have frequency > 0', () => {
      const bilateral = allPatterns.filter(p => p.audioConfig.mode === 'bilateral')
      for (const p of bilateral) {
        expect(p.audioConfig.frequency, `${p.id}`).toBeGreaterThan(0)
      }
    })

    it('binaural patterns have binauralDelta', () => {
      const binaural = allPatterns.filter(p => p.audioConfig.mode === 'binaural')
      for (const p of binaural) {
        expect(p.audioConfig.binauralDelta, `${p.id}`).toBeDefined()
        expect(p.audioConfig.binauralDelta!, `${p.id}`).toBeGreaterThan(0)
      }
    })

    it('binaural patterns require headphones', () => {
      const binaural = allPatterns.filter(p => p.audioConfig.mode === 'binaural')
      for (const p of binaural) {
        expect(p.requiresHeadphones, `${p.id}`).toBe(true)
      }
    })

    it('bilateral patterns require headphones', () => {
      const bilateral = allPatterns.filter(p => p.audioConfig.mode === 'bilateral')
      for (const p of bilateral) {
        expect(p.requiresHeadphones, `${p.id}`).toBe(true)
      }
    })

    it('drone patterns have droneIntervals', () => {
      const drones = allPatterns.filter(p => p.audioConfig.mode === 'drone')
      for (const p of drones) {
        expect(p.audioConfig.droneIntervals, `${p.id}`).toBeDefined()
        expect(p.audioConfig.droneIntervals!.length, `${p.id}`).toBeGreaterThanOrEqual(2)
      }
    })

    it('rhythmic patterns have rhythmBPM', () => {
      const rhythmic = allPatterns.filter(p => p.audioConfig.mode === 'rhythmic')
      for (const p of rhythmic) {
        expect(p.audioConfig.rhythmBPM, `${p.id}`).toBeDefined()
        expect(p.audioConfig.rhythmBPM!, `${p.id}`).toBeGreaterThan(0)
      }
    })
  })

  describe('differentiation', () => {
    it('Pralokita vs EMDR Classic: different easing and frequency', () => {
      const pralokita = patternsById['pralokita']
      const emdr = patternsById['emdr_classic']
      expect(pralokita.trajectoryParams.easing).not.toBe(emdr.trajectoryParams.easing)
      expect(pralokita.audioConfig.frequency).not.toBe(emdr.audioConfig.frequency)
    })

    it('Pralokita has bilateralDetune', () => {
      const p = patternsById['pralokita']
      expect(p.audioConfig.bilateralDetune).toBe(2)
    })

    it('Sama vs Nimilita: different frequency and color', () => {
      const sama = patternsById['sama']
      const nimilita = patternsById['nimilita']
      expect(sama.audioConfig.frequency).not.toBe(nimilita.audioConfig.frequency)
      expect(sama.binduColor).not.toBe(nimilita.binduColor)
    })

    it('Sama has singing bowl', () => {
      const p = patternsById['sama']
      expect(p.audioConfig.singingBowlInterval).toBe(35_000)
    })

    it('Nimilita has pink noise', () => {
      const p = patternsById['nimilita']
      expect(p.audioConfig.pinkNoise).toBe(0.03)
    })

    it('Trataka has pitch LFO and pink noise', () => {
      const p = patternsById['trataka']
      expect(p.audioConfig.pitchLFO).toBe(3)
      expect(p.audioConfig.pinkNoise).toBe(0.02)
    })

    it('Ullokita vs Avalokita: different bias, speed, and audio features', () => {
      const u = patternsById['ullokita']
      const a = patternsById['avalokita']
      expect(u.trajectoryParams.bias).toBe('up')
      expect(a.trajectoryParams.bias).toBe('down')
      expect(u.cycleDuration).not.toBe(a.cycleDuration)
    })

    it('Ullokita has pitch bend', () => {
      const p = patternsById['ullokita']
      expect(p.audioConfig.pitchBendRange).toBe(15)
    })

    it('Avalokita has sub-bass', () => {
      const p = patternsById['avalokita']
      expect(p.audioConfig.subBass).toBe(65)
    })

    it('Anuvritta is fast (cycle < 1000ms)', () => {
      const p = patternsById['anuvritta']
      expect(p.cycleDuration).toBeLessThan(1000)
    })

    it('Sachi has smaller amplitude than Pralokita', () => {
      const s = patternsById['sachi']
      const p = patternsById['pralokita']
      expect(s.trajectoryParams.amplitude).toBeLessThan(p.trajectoryParams.amplitude)
    })

    it('all three drones have unique frequencies', () => {
      const droneIds = ['sama', 'nimilita', 'trataka']
      const freqs = droneIds.map(id => patternsById[id].audioConfig.frequency)
      expect(new Set(freqs).size).toBe(3)
    })
  })

  describe('phases', () => {
    it('every pattern has at least one phase', () => {
      for (const p of allPatterns) {
        expect(p.phases.length, `${p.id}`).toBeGreaterThanOrEqual(1)
      }
    })

    it('fixation patterns have no movement phases', () => {
      const fixation = allPatterns.filter(p => p.trajectory === 'fixation')
      for (const p of fixation) {
        const hasMovement = p.phases.some(ph => ph.type === 'movement')
        expect(hasMovement, `${p.id} fixation should not have movement`).toBe(false)
      }
    })

    it('moving patterns have at least one movement phase', () => {
      const moving = allPatterns.filter(p => p.trajectory !== 'fixation')
      for (const p of moving) {
        const hasMovement = p.phases.some(ph => ph.type === 'movement')
        expect(hasMovement, `${p.id} should have movement`).toBe(true)
      }
    })

    it('moving patterns have cycleDuration', () => {
      const moving = allPatterns.filter(p => p.trajectory !== 'fixation')
      for (const p of moving) {
        expect(p.cycleDuration, `${p.id}`).not.toBeNull()
        expect(p.cycleDuration!, `${p.id}`).toBeGreaterThan(0)
      }
    })
  })

  describe('visual', () => {
    it('only trataka uses flame visual', () => {
      for (const p of allPatterns) {
        if (p.id === 'trataka') {
          expect(p.visual).toBe('flame')
        } else {
          expect(p.visual, `${p.id}`).toBe('bindu')
        }
      }
    })
  })
})
