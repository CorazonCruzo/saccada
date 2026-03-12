import { matMul, matTranspose, matVecMul, matInverse } from './matrix-math'

/**
 * Ridge regression with closed-form solution.
 * Predicts a single scalar (X or Y screen coordinate) from a feature vector.
 *
 * Two instances needed: one for X, one for Y.
 *
 * weights = (X^T X + λI)^-1 X^T y
 */
export class RidgeRegression {
  private weights: number[] | null = null
  private readonly lambda: number

  constructor(lambda: number = 1.0) {
    this.lambda = lambda
  }

  /**
   * Train on data.
   * @param X - Feature matrix (N samples x D features)
   * @param y - Target values (N samples)
   */
  train(X: number[][], y: number[]): void {
    if (X.length === 0 || X.length !== y.length) return

    const D = X[0].length
    const Xt = matTranspose(X)       // D x N
    const XtX = matMul(Xt, X)        // D x D

    // Add regularization: XtX + λI (skip last element = bias term)
    for (let i = 0; i < D - 1; i++) {
      XtX[i][i] += this.lambda
    }

    const inv = matInverse(XtX)      // D x D
    if (!inv) return                  // Singular — shouldn't happen with λ > 0

    const Xty = matVecMul(Xt, y)     // D x 1
    this.weights = matVecMul(inv, Xty)
  }

  /** Predict from a single feature vector */
  predict(features: number[]): number | null {
    if (!this.weights) return null
    let sum = 0
    for (let i = 0; i < features.length; i++) {
      sum += features[i] * this.weights[i]
    }
    return sum
  }

  hasModel(): boolean {
    return this.weights !== null
  }

  getWeights(): number[] | null {
    return this.weights ? [...this.weights] : null
  }

  setWeights(weights: number[]): void {
    this.weights = [...weights]
  }
}
