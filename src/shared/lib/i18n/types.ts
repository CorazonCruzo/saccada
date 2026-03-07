export type Locale = 'en' | 'ru' | 'es'

export const locales: Locale[] = ['en', 'ru', 'es']

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
}

export interface PatternTranslation {
  name: string
  description: string
  instruction: string
  effect: string
  origins: string
  benefits: string[]
  phases: (string | null)[]
}

export interface Translation {
  common: {
    cancel: string
    back: string
    goHome: string
  }
  home: {
    tagline: string
    startButton: string
    aboutLink: string
  }
  onboarding: {
    slides: Array<{ title: string; body: string }>
    prev: string
    next: string
    getStarted: string
    skip: string
  }
  session: {
    paused: string
    sessionComplete: string
    resume: string
    headphones: string
    keyHints: string
    hideGuide: string
    showGuide: string
  }
  results: {
    title: string
    noData: string
    duration: string
    status: string
    completed: string
    endedEarly: string
    pattern: string
    audio: string
    heatmapPlaceholder: string
    repeatSession: string
    newSession: string
  }
  sessionSettings: {
    title: string
    timerMode: string
    stopwatchMode: string
    duration: string
    unlimited: string
    speed: string
    visualScale: string
    visualScaleHint: string
    sound: string
    volume: string
    headphonesRecommended: string
    haptic: string
    guided: string
    eyeTracking: string
    calibrationNeeded: string
    calibrated: string
    recalibrate: string
    cameraNotAvailable: string
    cameraDenied: string
    beginSession: string
  }
  calibration: {
    title: string
    intro: string
    howItWorks: string
    step1: string
    step2: string
    step3: string
    forBestResults: string
    tip1: string
    tip2: string
    tip3: string
    tip4: string
    begin: string
    validationLabel: string
    calibrationLabel: string
    clicks: string
    readingGaze: string
    lookAtDot: string
    complete: string
    noGazeData: string
    avgError: string
    accuracy: string
    excellent: string
    good: string
    low: string
    adaptiveNote: string
    goodNote: string
    lowNote: string
    continueToSession: string
    backToHome: string
    cameraAccessDenied: string
    initFailed: string
  }
  notFound: {
    title: string
    message: string
    back: string
  }
  categories: {
    all: string
    drishti: string
    emdr: string
    sleep: string
  }
  patternInfo: {
    howToPractice: string
    whatToExpect: string
    origins: string
    benefits: string
    headphonesNote: string
  }
  settingsPage: {
    title: string
    language: string
  }
  trajectory: {
    horizontal: string
    vertical: string
    circular: string
    diagonal: string
    figure8: string
    fixation: string
  }
  audioMode: {
    bilateral: string
    binaural: string
    drone: string
    rhythmic: string
  }
  pattern: Record<string, PatternTranslation>
}
