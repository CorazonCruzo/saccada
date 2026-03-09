import { describe, it, expect } from 'vitest'
import { matMul, matTranspose, matVecMul, matInverse, matIdentity } from './matrix-math'

describe('matIdentity', () => {
  it('creates 3x3 identity', () => {
    expect(matIdentity(3)).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ])
  })
})

describe('matTranspose', () => {
  it('transposes 2x3 → 3x2', () => {
    const A = [[1, 2, 3], [4, 5, 6]]
    expect(matTranspose(A)).toEqual([
      [1, 4],
      [2, 5],
      [3, 6],
    ])
  })

  it('transpose of identity is identity', () => {
    const I = matIdentity(3)
    expect(matTranspose(I)).toEqual(I)
  })
})

describe('matMul', () => {
  it('multiplies 2x3 by 3x2', () => {
    const A = [[1, 2, 3], [4, 5, 6]]
    const B = [[7, 8], [9, 10], [11, 12]]
    expect(matMul(A, B)).toEqual([
      [1*7+2*9+3*11, 1*8+2*10+3*12],
      [4*7+5*9+6*11, 4*8+5*10+6*12],
    ])
  })

  it('A * I = A', () => {
    const A = [[1, 2], [3, 4]]
    const I = matIdentity(2)
    expect(matMul(A, I)).toEqual(A)
  })

  it('I * A = A', () => {
    const A = [[5, 6], [7, 8]]
    const I = matIdentity(2)
    expect(matMul(I, A)).toEqual(A)
  })
})

describe('matVecMul', () => {
  it('multiplies 2x2 matrix by 2-vector', () => {
    const A = [[1, 2], [3, 4]]
    expect(matVecMul(A, [5, 6])).toEqual([17, 39])
  })

  it('identity * v = v', () => {
    const v = [1, 2, 3]
    expect(matVecMul(matIdentity(3), v)).toEqual(v)
  })
})

describe('matInverse', () => {
  it('inverse of identity is identity', () => {
    const I = matIdentity(3)
    const inv = matInverse(I)
    expect(inv).not.toBeNull()
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(inv![i][j]).toBeCloseTo(i === j ? 1 : 0, 10)
      }
    }
  })

  it('inverse of 2x2 known matrix', () => {
    // [[4, 7], [2, 6]] → inverse is [[0.6, -0.7], [-0.2, 0.4]]
    const A = [[4, 7], [2, 6]]
    const inv = matInverse(A)!
    expect(inv[0][0]).toBeCloseTo(0.6)
    expect(inv[0][1]).toBeCloseTo(-0.7)
    expect(inv[1][0]).toBeCloseTo(-0.2)
    expect(inv[1][1]).toBeCloseTo(0.4)
  })

  it('A * A^-1 = I', () => {
    const A = [[2, 1, 1], [4, 3, 3], [8, 7, 9]]
    const inv = matInverse(A)!
    const product = matMul(A, inv)
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(product[i][j]).toBeCloseTo(i === j ? 1 : 0, 8)
      }
    }
  })

  it('returns null for singular matrix', () => {
    const A = [[1, 2], [2, 4]] // row 2 = 2 * row 1
    expect(matInverse(A)).toBeNull()
  })

  it('works on 11x11 matrix (regression-sized)', () => {
    // Diagonally dominant → guaranteed invertible
    const n = 11
    const A = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? n + 1 : Math.sin(i + j)))
    )
    const inv = matInverse(A)
    expect(inv).not.toBeNull()
    const product = matMul(A, inv!)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        expect(product[i][j]).toBeCloseTo(i === j ? 1 : 0, 6)
      }
    }
  })
})
