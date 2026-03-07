import { createRoot } from 'react-dom/client'
import './app/styles/globals.css'
import { App } from './app/App.tsx'

// StrictMode removed: MediaPipe WASM (used by WebGazer) crashes on
// double initialization caused by StrictMode's dev-mode remount.
// See: https://github.com/google-ai-edge/mediapipe/issues/3807
createRoot(document.getElementById('root')!).render(<App />)
