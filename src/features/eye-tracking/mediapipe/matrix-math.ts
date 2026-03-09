/**
 * Minimal matrix math for ridge regression on small matrices (11x11).
 * No external dependencies. All operations on 2D number arrays.
 */

/** Multiply A (m x n) by B (n x p) → C (m x p) */
export function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length
  const n = B.length
  const p = B[0].length
  const C: number[][] = Array.from({ length: m }, () => new Array(p).fill(0))
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < p; j++) {
      let sum = 0
      for (let k = 0; k < n; k++) {
        sum += A[i][k] * B[k][j]
      }
      C[i][j] = sum
    }
  }
  return C
}

/** Transpose A (m x n) → A^T (n x m) */
export function matTranspose(A: number[][]): number[][] {
  const m = A.length
  const n = A[0].length
  const T: number[][] = Array.from({ length: n }, () => new Array(m).fill(0))
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      T[j][i] = A[i][j]
    }
  }
  return T
}

/** Multiply matrix A (m x n) by vector v (length n) → result (length m) */
export function matVecMul(A: number[][], v: number[]): number[] {
  const m = A.length
  const result = new Array(m).fill(0)
  for (let i = 0; i < m; i++) {
    let sum = 0
    for (let j = 0; j < v.length; j++) {
      sum += A[i][j] * v[j]
    }
    result[i] = sum
  }
  return result
}

/**
 * Invert square matrix A via Gaussian elimination with partial pivoting.
 * Returns null if matrix is singular.
 */
export function matInverse(A: number[][]): number[][] | null {
  const n = A.length
  // Build augmented matrix [A | I]
  const aug: number[][] = A.map((row, i) => {
    const ext = new Array(n).fill(0)
    ext[i] = 1
    return [...row, ...ext]
  })

  for (let col = 0; col < n; col++) {
    // Partial pivoting: find max abs value in column
    let maxRow = col
    let maxVal = Math.abs(aug[col][col])
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(aug[row][col])
      if (val > maxVal) {
        maxVal = val
        maxRow = row
      }
    }

    if (maxVal < 1e-12) return null // Singular

    // Swap rows
    if (maxRow !== col) {
      const tmp = aug[col]
      aug[col] = aug[maxRow]
      aug[maxRow] = tmp
    }

    // Eliminate column
    const pivot = aug[col][col]
    for (let j = 0; j < 2 * n; j++) {
      aug[col][j] /= pivot
    }
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = aug[row][col]
      for (let j = 0; j < 2 * n; j++) {
        aug[row][j] -= factor * aug[col][j]
      }
    }
  }

  // Extract right half (inverse)
  return aug.map((row) => row.slice(n))
}

/** Create n x n identity matrix */
export function matIdentity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) => {
    const row = new Array(n).fill(0)
    row[i] = 1
    return row
  })
}
