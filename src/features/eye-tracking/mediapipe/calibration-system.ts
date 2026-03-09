import { RidgeRegression } from './ridge-regression'
import { buildFeatureVector } from './iris-extractor'
import type { EyeFeatures, CalibrationData, GazePrediction } from './types'

interface CalibrationSample {
  screenX: number
  screenY: number
  features: EyeFeatures[]
}

/**
 * Maps iris features → screen coordinates via ridge regression.
 * Two models: one for X, one for Y.
 *
 * Calibration flow:
 *   1. addPoint() for each of the 9 calibration points (with collected samples)
 *   2. train() to fit the models
 *   3. predict() during session
 */
export class CalibrationSystem {
  private points: CalibrationSample[] = []
  private modelX: RidgeRegression
  private modelY: RidgeRegression
  private readonly lambda: number

  constructor(lambda: number = 0.1) {
    this.lambda = lambda
    this.modelX = new RidgeRegression(lambda)
    this.modelY = new RidgeRegression(lambda)
  }

  /** Add a calibration point with collected eye feature samples */
  addPoint(screenX: number, screenY: number, samples: EyeFeatures[]): void {
    if (samples.length === 0) return
    this.points.push({ screenX, screenY, features: samples })
  }

  /** Train both models. Returns training accuracy in pixels. */
  train(): { accuracyPx: number } {
    const X: number[][] = []
    const yX: number[] = []
    const yY: number[] = []

    for (const point of this.points) {
      for (const sample of point.features) {
        X.push(buildFeatureVector(sample))
        yX.push(point.screenX)
        yY.push(point.screenY)
      }
    }

    if (X.length === 0) return { accuracyPx: Infinity }

    // Diagnostic: log feature ranges per calibration point
    if (typeof console !== 'undefined') {
      console.group('[CalibrationSystem] Training diagnostics')
      console.log(`Samples: ${X.length}, Features: ${X[0].length}, Points: ${this.points.length}`)
      for (const point of this.points) {
        const vecs = point.features.map(f => buildFeatureVector(f))
        const avgVec = vecs[0].map((_, j) => vecs.reduce((s, v) => s + v[j], 0) / vecs.length)
        console.log(
          `  Point (${point.screenX}, ${point.screenY}): ${vecs.length} samples, ` +
          `avgIrisX=${avgVec[0].toFixed(4)}, avgIrisY=${avgVec[1].toFixed(4)}`
        )
      }
      // Feature range across all samples
      const D = X[0].length
      for (let j = 0; j < D; j++) {
        const vals = X.map(row => row[j])
        const min = Math.min(...vals)
        const max = Math.max(...vals)
        console.log(`  Feature[${j}]: min=${min.toFixed(6)}, max=${max.toFixed(6)}, range=${(max - min).toFixed(6)}`)
      }
      console.groupEnd()
    }

    this.modelX.train(X, yX)
    this.modelY.train(X, yY)

    // Compute training accuracy
    let totalError = 0
    for (let i = 0; i < X.length; i++) {
      const predX = this.modelX.predict(X[i])
      const predY = this.modelY.predict(X[i])
      if (predX == null || predY == null) continue
      const dx = predX - yX[i]
      const dy = predY - yY[i]
      totalError += Math.sqrt(dx * dx + dy * dy)
    }

    const accuracyPx = totalError / X.length

    if (typeof console !== 'undefined') {
      const wX = this.modelX.getWeights()
      const wY = this.modelY.getWeights()
      console.group('[CalibrationSystem] Model weights')
      console.log(`  weightsX: [${wX?.map(w => w.toFixed(2)).join(', ')}]`)
      console.log(`  weightsY: [${wY?.map(w => w.toFixed(2)).join(', ')}]`)
      console.log(`  Training accuracy: ${accuracyPx.toFixed(1)}px`)
      console.groupEnd()
    }

    return { accuracyPx }
  }

  /** Predict screen coordinates from eye features */
  predict(features: EyeFeatures): GazePrediction | null {
    const vec = buildFeatureVector(features)
    const x = this.modelX.predict(vec)
    const y = this.modelY.predict(vec)
    if (x == null || y == null) return null

    // Confidence based on eye openness (closed eyes = low confidence)
    const confidence = Math.min(features.leftEyeOpenness, features.rightEyeOpenness)

    return { x, y, confidence }
  }

  hasModel(): boolean {
    return this.modelX.hasModel() && this.modelY.hasModel()
  }

  /** Clear all calibration data and models */
  reset(): void {
    this.points = []
    this.modelX = new RidgeRegression(this.lambda)
    this.modelY = new RidgeRegression(this.lambda)
  }

  /** Serialize for Dexie/localStorage persistence */
  exportCalibration(): CalibrationData | null {
    const wX = this.modelX.getWeights()
    const wY = this.modelY.getWeights()
    if (!wX || !wY) return null
    return {
      weightsX: wX,
      weightsY: wY,
      lambda: this.lambda,
      timestamp: Date.now(),
    }
  }

  /** Restore from serialized data */
  importCalibration(data: CalibrationData): void {
    this.modelX = new RidgeRegression(data.lambda)
    this.modelY = new RidgeRegression(data.lambda)
    this.modelX.setWeights(data.weightsX)
    this.modelY.setWeights(data.weightsY)
  }
}
