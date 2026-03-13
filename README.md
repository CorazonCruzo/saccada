# Saccada

**Open-source browser-based eye movement practice combining ancient Drishti Bheda traditions, EMDR bilateral stimulation, and REM sleep neuroscience.**

Privacy by design: everything runs locally in your browser. No servers, no accounts, no telemetry.

[**Try Saccada**](https://saccada.vercel.app) · [Report Bug](https://github.com/CorazonCruzo/saccada/issues) · [Request Feature](https://github.com/CorazonCruzo/saccada/issues)

---

## 👁️ The Philosophy

Three traditions, millennia apart, independently discovered the same thing: rhythmic eye movements alter the state of consciousness.

1. **Drishti Bheda (Natya Shastra):** 2,000-year-old Indian classical dance tradition codifying 8 precise eye movements tied to specific emotional and cognitive states.
2. **EMDR:** Clinical standard for trauma processing through bilateral stimulation, discovered by Francine Shapiro in 1989 and recognized by the WHO for PTSD treatment.
3. **REM Neuroscience:** The brain's natural mechanism for consolidating memory and processing emotions via rapid eye movements during sleep.

Saccada is the first tool to bring all three together — free, open source, and running entirely in your browser.

The name comes from the French *saccade* (rapid eye movement, a neuroscience term) and the Argentine tango *sacada* (a displacement step). Stress on the second syllable: sa-KA-da.

---

## 🎯 12 Eye Movement Patterns

Each pattern is a unique combination of trajectory, speed, amplitude, sound profile, and guided instructions.

**From Drishti Bheda (Natya Shastra):**

| Pattern | Movement | Effect |
|---------|----------|--------|
| **Sama** | Steady central fixation | Concentration, mental stillness |
| **Alokita** | Wide circular gaze | Expanded peripheral awareness, oculomotor training |
| **Sachi** | Gentle horizontal, small amplitude | Mild anxiety reduction, good for beginners |
| **Pralokita** | Full bilateral (= EMDR) | Reduced emotional intensity of anxious thoughts |
| **Nimilita** | Half-closed eyes, defocused gaze | Deep relaxation, parasympathetic activation |
| **Ullokita** | Vertical with upward bias | Visual memory activation, spontaneous imagery |
| **Anuvritta** | Rapid vertical saccades | Intensive stimulation, exploratory (hypothesis) |
| **Avalokita** | Vertical with downward bias | Grounding, body awareness (hypothesis) |

**Additional patterns:**

| Pattern | Movement | Effect |
|---------|----------|--------|
| **Trataka** | Candle flame fixation | Deep concentration, afterimage observation |
| **EMDR Classic** | Standard bilateral, max amplitude | Most researched form of bilateral stimulation |
| **EMDR Diagonal** | Diagonal bilateral | Alternative bilateral engaging more eye muscles |
| **Sleep REM** | Slow figure-8 + theta binaural beats | Pre-sleep relaxation (hypothesis) |

---

## 🔊 Generative Sound

All audio is synthesized in real-time via WebAudio API — no audio files, works offline.

- **Bilateral stimulation** — tone pans left↔right in sync with the dot
- **Binaural beats** — theta range (4–8 Hz), headphones required
- **Tanpura drone** — multi-oscillator synthesis with organic shimmer
- **Rhythmic pulsing** — amplitude-modulated sync to movement
- **Tibetan singing bowl** — inharmonic metallic percussion marking eye-close/open transitions

Frequencies are selected based on research — details in each pattern's info panel.

---

## 👀 Eye Tracking (Optional)

Enable your webcam and the app tracks your gaze using MediaPipe Face Landmarker — all processing happens locally.

- **Adaptive speed** — slows down if your eyes can't keep up
- **Gaze heatmap** — see where you actually looked after each session
- **Focus Score** — how precisely your eyes followed the pattern
- **Focus Timeline** — moment-by-moment on-target vs off-target

Camera data never leaves your device. Desktop browsers only (Chrome, Firefox). Not available on mobile or Safari/iOS.

---

## 📊 Progress & Statistics

- Session reflection after each session with pattern-specific questions
- Activity calendar with streak tracking
- Weekly practice goals
- Session history with filtering
- Focus Score trends over time

---

## 🔬 Evidence Transparency

Some patterns are based on well-researched protocols. Others are hypotheses. We believe in being honest about what is proven and what is still just an idea. Each pattern's info panel marks the evidence level:

- 🟢 **Researched** — clinical studies directly support the mechanism (Pralokita, EMDR Classic)
- 🟡 **Preliminary** — related research supports the mechanism (Trataka, Sama, Sachi, Nimilita, EMDR Diagonal)
- ⚪ **Hypothesis** — logical chain grounded in research, but not directly tested (Alokita, Ullokita, Avalokita, Anuvritta, Sleep REM)

Key references:
- Lee & Cuijpers (2013): eye movements reduce memory vividness d = 0.91, emotionality d = 0.66 ([PubMed](https://pubmed.ncbi.nlm.nih.gov/23266601/))
- Cuijpers et al. (2020): EMDR meta-analysis of 76 RCTs, g = 0.93 ([PubMed](https://pubmed.ncbi.nlm.nih.gov/32043428/))
- Swathi et al. (2021): Trataka improves working memory d = 0.64–0.74 ([Frontiers](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.773049/full))
- Garcia-Argibay et al. (2019): binaural beats meta-analysis g = 0.45 for anxiety ([PubMed](https://pubmed.ncbi.nlm.nih.gov/30073406/))
- van den Hout & Engelhard (2012): working memory taxation theory ([DOI](https://doi.org/10.5127/jep.028212))

---

## 🔒 Privacy by Design

No servers, no databases, no accounts, no analytics, no trackers. All data stored in your browser's IndexedDB. Camera processes video locally. Static site on Vercel CDN. Open source — verify it yourself.

---

## 🛠 Tech Stack

Built as a local-first PWA, optimized for performance and privacy.

| Layer | Technology |
|-------|-----------|
| Core | React 19 + TypeScript + Vite |
| State | Zustand |
| Animation | Canvas 2D (requestAnimationFrame) |
| Sound | WebAudio API (fully synthesized, zero audio files) |
| Eye Tracking | MediaPipe Face Landmarker + custom ridge regression pipeline |
| Storage | Dexie.js (IndexedDB) |
| UI | shadcn/ui + Tailwind CSS |
| Offline | vite-plugin-pwa |
| Deploy | Vercel |
| Architecture | Feature-Sliced Design |

---

## ⌨️ Controls

| Key | Action |
|-----|--------|
| Space | Pause / Resume |
| Escape | Stop session |
| F | Fullscreen |
| I | Info panel |
| G | Toggle guided text |
| +/- | Visual scale |

All settings accessible before session: sound, volume, speed, guided text, eye tracking, background pattern.

---

## 🌐 Localization

Available in 11 languages:

🇬🇧 English · 🇷🇺 Русский · 🇪🇸 Español · 🇧🇷 Português · 🇩🇪 Deutsch · 🇫🇷 Français · 🇯🇵 日本語 · 🇮🇳 हिन्दी · 🇮🇳 தமிழ் · 🇨🇳 中文 · 🇧🇩 বাংলা

---

## 🖥 Browser Support

| Browser | Status |
|---------|--------|
| Chrome (desktop) | ✅ Full support including eye tracking |
| Firefox (desktop) | ✅ Full support including eye tracking |
| Safari / iOS / iPadOS | ⚠️ Works without eye tracking (WebKit limitations) |
| Mobile browsers | ⚠️ Works without eye tracking, landscape recommended |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/CorazonCruzo/saccada.git
cd saccada
npm install
npm run dev
```

Open `http://localhost:5173` in Chrome or Firefox.

### Build

```bash
npm run build
npm run preview
```

---

## 🤝 Collaboration

Saccada is a non-profit, independent open-source project. I'm open to collaboration — both non-commercial and commercial — with anyone who finds this work meaningful. If you see a way to contribute, want to build something together, or have a proposal, reach out.

⭐ Star this repo if you like the project
📬 Open an [Issue](https://github.com/CorazonCruzo/saccada/issues) to report bugs or suggest features
🔀 Fork, branch, PR — contributions welcome

---

## 👤 Author

**Anastasiia Chestnykh** — senior frontend developer and design engineer with 6+ years in React, TypeScript, WebAudio, Canvas, and real-time browser applications. Saccada started as a personal research project at the intersection of creative technology, neuroscience, and Indian classical dance traditions.

[@CorazonCruzo](https://github.com/CorazonCruzo) · [LinkedIn](https://www.linkedin.com/in/anastasiia-chestnykh-0953922a8/)

---

## 📄 License

[GPLv3](LICENSE) — free for personal use, research, and non-commercial projects. Commercial licensing available on request.

---

*Disclaimer: Saccada is a self-help tool, not a medical device or a substitute for professional therapy. If you are experiencing a mental health crisis, please contact a qualified professional. If you work with an EMDR therapist, consult them on how this tool can support your practice between sessions.*
