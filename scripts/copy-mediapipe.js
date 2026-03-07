/**
 * Copy MediaPipe face_mesh WASM binaries from node_modules to public/.
 * WebGazer loads them at runtime from a relative path (./mediapipe/face_mesh),
 * which Vite serves from public/. These are ~16MB of binaries that should
 * not be committed to git.
 */
import { cpSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = resolve(__dirname, '../node_modules/webgazer/src/mediapipe')
const dest = resolve(__dirname, '../public/mediapipe')

if (!existsSync(src)) {
  console.warn('[copy-mediapipe] Source not found, skipping:', src)
  process.exit(0)
}

cpSync(src, dest, { recursive: true })
console.log('[copy-mediapipe] Copied mediapipe WASM to public/mediapipe/')
