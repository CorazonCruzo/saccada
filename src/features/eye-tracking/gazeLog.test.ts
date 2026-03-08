import { describe, it, expect } from 'vitest'
import { GazeLog } from './gazeLog'

describe('GazeLog', () => {
  it('starts empty', () => {
    const log = new GazeLog()
    expect(log.length).toBe(0)
    expect(log.getPoints()).toEqual([])
  })

  it('records a point', () => {
    const log = new GazeLog()
    log.record({ x: 100, y: 200, t: 0 })
    expect(log.length).toBe(1)
    expect(log.getPoints()[0]).toEqual({ x: 100, y: 200, t: 0 })
  })

  it('throttles to ~10fps (100ms interval)', () => {
    const log = new GazeLog()
    log.record({ x: 0, y: 0, t: 0 })
    log.record({ x: 1, y: 1, t: 50 })   // too soon
    log.record({ x: 2, y: 2, t: 99 })   // still too soon
    log.record({ x: 3, y: 3, t: 100 })  // OK
    expect(log.length).toBe(2)
    expect(log.getPoints()[0].x).toBe(0)
    expect(log.getPoints()[1].x).toBe(3)
  })

  it('records multiple points at correct intervals', () => {
    const log = new GazeLog()
    for (let t = 0; t <= 1000; t += 100) {
      log.record({ x: t, y: t, t })
    }
    // 0, 100, 200, ..., 1000 = 11 points
    expect(log.length).toBe(11)
  })

  it('clears all data', () => {
    const log = new GazeLog()
    log.record({ x: 10, y: 20, t: 0 })
    log.record({ x: 30, y: 40, t: 200 })
    expect(log.length).toBe(2)

    log.clear()
    expect(log.length).toBe(0)
    expect(log.getPoints()).toEqual([])
  })

  it('can record again after clear', () => {
    const log = new GazeLog()
    log.record({ x: 10, y: 20, t: 0 })
    log.clear()
    log.record({ x: 50, y: 60, t: 0 })
    expect(log.length).toBe(1)
    expect(log.getPoints()[0]).toEqual({ x: 50, y: 60, t: 0 })
  })

  it('preserves point data accurately', () => {
    const log = new GazeLog()
    log.record({ x: 123.456, y: 789.012, t: 500 })
    const pt = log.getPoints()[0]
    expect(pt.x).toBe(123.456)
    expect(pt.y).toBe(789.012)
    expect(pt.t).toBe(500)
  })
})
