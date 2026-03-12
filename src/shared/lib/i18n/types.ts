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
    rotateLandscape: string
    rotateLandscapeHint: string
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
    enableCameraHint: string
    heatmapTitle: string
    exportPng: string
    gazePoints: string
    moodChange: string
    moodImproved: string
    moodSame: string
    moodWorse: string
    notePlaceholder: string
    addNote: string
    repeatSession: string
    newSession: string
    showGazeMap: string
    hideGazeMap: string
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
    moodCheck: string
    beginSession: string
    background: string
    backgroundRotation: string
    rotationNone: string
    rotationCW: string
    rotationCCW: string
    resetBackground: string
  }
  calibration: {
    title: string
    intro: string
    howItWorks: string
    step1: string
    step2: string
    step2Gaze: string
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
    modeGaze: string
    modeClick: string
    faceNotDetected: string
    smallScreenTitle: string
    smallScreenMessage: string
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
  mood: {
    howAreYouNow: string
    howAreYouAfter: string
    flamePrompt: string
    restless: string
    calm: string
    skip: string
    continue: string
    levels: string[]
  }
  history: {
    title: string
    empty: string
    totalSessions: string
    totalTime: string
    mostUsed: string
    streak: string
    streakDays: string
    deleteSession: string
    deleteConfirm: string
    completed: string
    endedEarly: string
    noMood: string
    periodWeek: string
    periodMonth: string
    periodAll: string
    periodCustom: string
    customFrom: string
    customTo: string
    noResults: string
    avgMoodChange: string
    showMore: string
    showLess: string
    bestPattern: string
    completionRate: string
    avgDuration: string
    preferredTime: string
    timeMorning: string
    timeAfternoon: string
    timeEvening: string
    timeNight: string
    calendarTitle: string
    calendarToday: string
    calendarSession: string
    calendarSessions: string
    weekdayMo: string
    weekdayTu: string
    weekdayWe: string
    weekdayTh: string
    weekdayFr: string
    weekdaySa: string
    weekdaySu: string
    legendLess: string
    legendMore: string
    longestStreak: string
    yesterday: string
    focus: string
    periodToday: string
    editNote: string
    noNote: string
    cameraOff: string
    avgFocus: string
  }
  settingsPage: {
    title: string
    language: string
    theme: string
    themeLight: string
    themeDark: string
    themeSystem: string
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
  weeklyGoal: {
    title: string
    description: string
    noGoal: string
    save: string
    thisWeek: string
    reached: string
    weeksInRow: string
    goalStreak: string
    milestone: string
    days: string
    daysPerWeek: string
  }
  backgroundName: Record<string, string>
  pattern: Record<string, PatternTranslation>
}
