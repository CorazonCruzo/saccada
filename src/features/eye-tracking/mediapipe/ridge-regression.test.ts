import { describe, it, expect } from 'vitest'
import { RidgeRegression } from './ridge-regression'

describe('RidgeRegression', () => {
  it('predict returns null when untrained', () => {
    const model = new RidgeRegression()
    expect(model.predict([1, 2, 3])).toBeNull()
  })

  it('hasModel is false when untrained', () => {
    const model = new RidgeRegression()
    expect(model.hasModel()).toBe(false)
  })

  it('hasModel is true after training', () => {
    const model = new RidgeRegression()
    model.train([[1, 1], [2, 1]], [3, 5])
    expect(model.hasModel()).toBe(true)
  })

  it('learns simple linear relationship: y = 2*x + 1', () => {
    const model = new RidgeRegression(0.001) // Low lambda for better fit
    // Features: [x, 1] (with bias term)
    const X = Array.from({ length: 100 }, (_, i) => [i, 1])
    const y = X.map(([x]) => 2 * x + 1)

    model.train(X, y)

    // Predict at x = 50
    const pred = model.predict([50, 1])!
    expect(pred).toBeCloseTo(101, 0) // 2*50 + 1 = 101
  })

  it('learns 2D linear: y = 3*x1 + 2*x2 + 5', () => {
    const model = new RidgeRegression(0.001)
    const X: number[][] = []
    const y: number[] = []
    for (let i = 0; i < 50; i++) {
      const x1 = i * 0.1
      const x2 = i * 0.2
      X.push([x1, x2, 1])
      y.push(3 * x1 + 2 * x2 + 5)
    }

    model.train(X, y)

    const pred = model.predict([1.0, 2.0, 1])!
    expect(pred).toBeCloseTo(3 * 1 + 2 * 2 + 5, 0) // 12
  })

  it('regularization shrinks non-bias weights', () => {
    const X = Array.from({ length: 20 }, (_, i) => [i, 1])
    const y = X.map(([x]) => 2 * x + 1)

    const lowLambda = new RidgeRegression(0.001)
    lowLambda.train(X, y)
    const wLow = lowLambda.getWeights()!

    const highLambda = new RidgeRegression(100)
    highLambda.train(X, y)
    const wHigh = highLambda.getWeights()!

    // Higher lambda → smaller non-bias weight magnitudes (last element = bias, not regularized)
    expect(Math.abs(wHigh[0])).toBeLessThan(Math.abs(wLow[0]))
  })

  it('does not crash on empty training data', () => {
    const model = new RidgeRegression()
    model.train([], [])
    expect(model.hasModel()).toBe(false)
  })

  it('getWeights returns a copy', () => {
    const model = new RidgeRegression(0.1)
    model.train([[1, 1], [2, 1]], [3, 5])
    const w1 = model.getWeights()!
    const w2 = model.getWeights()!
    expect(w1).toEqual(w2)
    w1[0] = 999
    expect(model.getWeights()![0]).not.toBe(999)
  })

  it('setWeights / predict roundtrip', () => {
    const model = new RidgeRegression()
    model.setWeights([2, 3, 1])
    expect(model.hasModel()).toBe(true)
    // 2*1 + 3*2 + 1*1 = 9
    expect(model.predict([1, 2, 1])).toBeCloseTo(9)
  })

  it('works with 11-feature vector (real use case)', () => {
    const model = new RidgeRegression(1.0)
    const D = 11
    const N = 50
    // Random-ish but deterministic features
    const X = Array.from({ length: N }, (_, i) =>
      Array.from({ length: D }, (_, j) => Math.sin(i * 0.3 + j * 0.7))
    )
    // Target: sum of features * index weight
    const trueWeights = Array.from({ length: D }, (_, j) => j + 1)
    const y = X.map((row) => row.reduce((s, f, j) => s + f * trueWeights[j], 0))

    model.train(X, y)
    expect(model.hasModel()).toBe(true)

    // Predict on a training sample — should be close
    const pred = model.predict(X[0])!
    expect(pred).toBeCloseTo(y[0], 0)
  })
})
