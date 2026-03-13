import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { translations } from './translations'
import type { Translation, PatternTranslation } from './types'
import { locales, localeNames } from './types'
import { allPatterns } from '@/entities/pattern'

const allPatternIds = [
  'sama', 'alokita', 'sachi', 'pralokita', 'nimilita', 'ullokita',
  'anuvritta', 'avalokita', 'trataka', 'emdr_classic', 'emdr_diagonal', 'sleep_rem',
]

const trajectoryKeys = ['horizontal', 'vertical', 'circular', 'diagonal', 'figure8', 'fixation'] as const
const audioModeKeys = ['bilateral', 'binaural', 'drone', 'rhythmic'] as const

// ────────────────────────────────────────────────────────
// types.ts
// ────────────────────────────────────────────────────────
describe('i18n types', () => {
  it('locales should contain all supported languages', () => {
    expect(locales).toContain('en')
    expect(locales).toContain('ru')
    expect(locales).toContain('es')
    expect(locales).toContain('de')
    expect(locales).toContain('fr')
    expect(locales).toContain('pt')
    expect(locales).toContain('ja')
    expect(locales).toContain('hi')
    expect(locales).toHaveLength(8)
  })

  it('localeNames should map every locale to a non-empty string', () => {
    for (const locale of locales) {
      expect(typeof localeNames[locale]).toBe('string')
      expect(localeNames[locale].length).toBeGreaterThan(0)
    }
  })

  it('localeNames should use native script for each language', () => {
    expect(localeNames.en).toBe('English')
    expect(localeNames.ru).toBe('Русский')
    expect(localeNames.es).toBe('Español')
    expect(localeNames.de).toBe('Deutsch')
    expect(localeNames.fr).toBe('Fran\u00E7ais')
    expect(localeNames.pt).toBe('Portugu\u00EAs')
    expect(localeNames.ja).toBe('日本語')
  })
})

// ────────────────────────────────────────────────────────
// store.ts — detectBrowserLocale
// ────────────────────────────────────────────────────────
describe('detectBrowserLocale', () => {
  const originalLanguage = navigator.language

  function setNavigatorLanguage(lang: string) {
    Object.defineProperty(navigator, 'language', { value: lang, configurable: true })
  }

  afterEach(() => {
    Object.defineProperty(navigator, 'language', { value: originalLanguage, configurable: true })
  })

  it('should return "ru" for Russian browser locale', async () => {
    setNavigatorLanguage('ru-RU')
    // Re-import to pick up the new navigator.language
    const { detectBrowserLocale } = await import('./store')
    expect(detectBrowserLocale()).toBe('ru')
  })

  it('should return "ru" for plain "ru"', async () => {
    setNavigatorLanguage('ru')
    const { detectBrowserLocale } = await import('./store')
    expect(detectBrowserLocale()).toBe('ru')
  })

  it('should return "es" for Spanish browser locale', async () => {
    setNavigatorLanguage('es-MX')
    const { detectBrowserLocale } = await import('./store')
    expect(detectBrowserLocale()).toBe('es')
  })

  it('should return "en" for English browser locale', async () => {
    setNavigatorLanguage('en-US')
    const { detectBrowserLocale } = await import('./store')
    expect(detectBrowserLocale()).toBe('en')
  })

  it('should return "de" for German browser locale', async () => {
    setNavigatorLanguage('de-DE')
    const { detectBrowserLocale } = await import('./store')
    expect(detectBrowserLocale()).toBe('de')
  })

  it('should return "fr" for French browser locale', async () => {
    setNavigatorLanguage('fr-FR')
    const { detectBrowserLocale } = await import('./store')
    expect(detectBrowserLocale()).toBe('fr')
  })

  it('should return "pt" for Portuguese browser locale', async () => {
    setNavigatorLanguage('pt-BR')
    const { detectBrowserLocale } = await import('./store')
    expect(detectBrowserLocale()).toBe('pt')
  })

  it('should return "ja" for Japanese browser locale', async () => {
    setNavigatorLanguage('ja-JP')
    const { detectBrowserLocale } = await import('./store')
    expect(detectBrowserLocale()).toBe('ja')
  })

  it('should return "en" for unsupported languages', async () => {
    setNavigatorLanguage('ko-KR')
    const { detectBrowserLocale } = await import('./store')
    expect(detectBrowserLocale()).toBe('en')
  })

  it('should return "en" for Chinese locale', async () => {
    setNavigatorLanguage('zh-CN')
    const { detectBrowserLocale } = await import('./store')
    expect(detectBrowserLocale()).toBe('en')
  })
})

// ────────────────────────────────────────────────────────
// store.ts — useLocaleStore
// ────────────────────────────────────────────────────────
describe('useLocaleStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should set and get locale', async () => {
    const { useLocaleStore } = await import('./store')
    useLocaleStore.getState().setLocale('es')
    expect(useLocaleStore.getState().locale).toBe('es')
  })

  it('should switch between all supported locales', async () => {
    const { useLocaleStore } = await import('./store')
    for (const locale of locales) {
      useLocaleStore.getState().setLocale(locale)
      expect(useLocaleStore.getState().locale).toBe(locale)
    }
  })
})

// ────────────────────────────────────────────────────────
// translations — structural integrity
// ────────────────────────────────────────────────────────
describe('translation structure', () => {
  it('should have translations for all locales', () => {
    for (const locale of locales) {
      expect(translations[locale]).toBeDefined()
    }
  })

  it('should have all top-level sections in every locale', () => {
    const sections: Array<keyof Translation> = [
      'common', 'home', 'onboarding', 'session', 'results',
      'sessionSettings', 'calibration', 'notFound', 'categories',
      'patternInfo', 'reflection', 'settingsPage', 'trajectory', 'audioMode', 'pattern',
    ]

    for (const locale of locales) {
      for (const section of sections) {
        expect(translations[locale][section], `${locale}.${section}`).toBeDefined()
      }
    }
  })

  it('should have matching non-pattern keys across all locales (en as reference)', () => {
    function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
      const keys: string[] = []
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key
        if (key === 'pattern') continue
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          keys.push(...getKeys(value as Record<string, unknown>, fullKey))
        } else {
          keys.push(fullKey)
        }
      }
      return keys.sort()
    }

    const enKeys = getKeys(translations.en as unknown as Record<string, unknown>)
    for (const locale of locales) {
      if (locale === 'en') continue
      const localeKeys = getKeys(translations[locale] as unknown as Record<string, unknown>)
      expect(localeKeys, `${locale} keys should match en`).toEqual(enKeys)
    }
  })

  it('should have the same set of pattern ids in every locale', () => {
    const enIds = Object.keys(translations.en.pattern).sort()
    for (const locale of locales) {
      const ids = Object.keys(translations[locale].pattern).sort()
      expect(ids, `${locale} pattern ids`).toEqual(enIds)
    }
  })

  it('should not have empty strings in any section (except pattern phases which can be null)', () => {
    function checkNoEmpty(obj: unknown, path: string) {
      if (typeof obj === 'string') {
        expect(obj.length, `${path} is empty`).toBeGreaterThan(0)
      } else if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          if (obj[i] !== null) {
            checkNoEmpty(obj[i], `${path}[${i}]`)
          }
        }
      } else if (obj && typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
          checkNoEmpty(value, `${path}.${key}`)
        }
      }
    }

    for (const locale of locales) {
      checkNoEmpty(translations[locale], locale)
    }
  })
})

// ────────────────────────────────────────────────────────
// translations — onboarding
// ────────────────────────────────────────────────────────
describe('onboarding translations', () => {
  it('should have exactly 5 slides in every locale', () => {
    for (const locale of locales) {
      expect(translations[locale].onboarding.slides).toHaveLength(5)
    }
  })

  it('each slide should have non-empty title and body', () => {
    for (const locale of locales) {
      for (const slide of translations[locale].onboarding.slides) {
        expect(slide.title.length, `${locale} slide title`).toBeGreaterThan(0)
        expect(slide.body.length, `${locale} slide body`).toBeGreaterThan(0)
      }
    }
  })

  it('should have navigation buttons in every locale', () => {
    for (const locale of locales) {
      const o = translations[locale].onboarding
      expect(o.prev).toBeTruthy()
      expect(o.next).toBeTruthy()
      expect(o.getStarted).toBeTruthy()
      expect(o.skip).toBeTruthy()
    }
  })
})

// ────────────────────────────────────────────────────────
// translations — categories
// ────────────────────────────────────────────────────────
describe('category translations', () => {
  it('should have all category keys in every locale', () => {
    const expectedKeys = ['all', 'drishti', 'emdr', 'sleep']
    for (const locale of locales) {
      for (const key of expectedKeys) {
        expect(
          (translations[locale].categories as Record<string, string>)[key],
          `${locale}.categories.${key}`,
        ).toBeTruthy()
      }
    }
  })
})

// ────────────────────────────────────────────────────────
// translations — trajectory labels
// ────────────────────────────────────────────────────────
describe('trajectory translations', () => {
  it('should have all 6 trajectory keys in every locale', () => {
    for (const locale of locales) {
      for (const key of trajectoryKeys) {
        expect(translations[locale].trajectory[key], `${locale}.trajectory.${key}`).toBeTruthy()
      }
    }
  })

  it('trajectory keys should match all TrajectoryType values used in pattern configs', () => {
    const configTrajectories = new Set(allPatterns.map((p) => p.trajectory))
    for (const traj of configTrajectories) {
      expect(trajectoryKeys).toContain(traj)
      for (const locale of locales) {
        expect(translations[locale].trajectory[traj], `${locale}.trajectory.${traj}`).toBeTruthy()
      }
    }
  })
})

// ────────────────────────────────────────────────────────
// translations — audio mode labels
// ────────────────────────────────────────────────────────
describe('audioMode translations', () => {
  it('should have all 4 audio mode keys in every locale', () => {
    for (const locale of locales) {
      for (const key of audioModeKeys) {
        expect(translations[locale].audioMode[key], `${locale}.audioMode.${key}`).toBeTruthy()
      }
    }
  })

  it('audioMode keys should match all AudioMode values used in pattern configs', () => {
    const configModes = new Set(allPatterns.map((p) => p.audioConfig.mode))
    for (const mode of configModes) {
      expect(audioModeKeys).toContain(mode)
      for (const locale of locales) {
        expect(translations[locale].audioMode[mode], `${locale}.audioMode.${mode}`).toBeTruthy()
      }
    }
  })
})

// ────────────────────────────────────────────────────────
// translations — pattern data
// ────────────────────────────────────────────────────────
describe('pattern translations', () => {
  it('should have translations for all 12 patterns in every locale', () => {
    for (const locale of locales) {
      for (const id of allPatternIds) {
        const pt = translations[locale].pattern[id]
        expect(pt, `${locale}.pattern.${id}`).toBeDefined()
      }
    }
  })

  it('each pattern translation should have all required fields', () => {
    for (const locale of locales) {
      for (const id of allPatternIds) {
        const pt = translations[locale].pattern[id]
        expect(pt.name, `${locale}.${id}.name`).toBeTruthy()
        expect(pt.description, `${locale}.${id}.description`).toBeTruthy()
        expect(pt.instruction, `${locale}.${id}.instruction`).toBeTruthy()
        expect(pt.effect, `${locale}.${id}.effect`).toBeTruthy()
        expect(pt.origins, `${locale}.${id}.origins`).toBeTruthy()
        expect(pt.benefits.length, `${locale}.${id}.benefits`).toBeGreaterThan(0)
        expect(pt.phases.length, `${locale}.${id}.phases`).toBeGreaterThan(0)
      }
    }
  })

  it('phase array lengths should match across locales for each pattern', () => {
    for (const id of allPatternIds) {
      const enPhases = translations.en.pattern[id].phases
      for (const locale of locales) {
        const phases = translations[locale].pattern[id].phases
        expect(phases.length, `${locale}.${id}.phases length`).toBe(enPhases.length)
      }
    }
  })

  it('phase null/non-null positions should be consistent across locales', () => {
    for (const id of allPatternIds) {
      const enPhases = translations.en.pattern[id].phases
      for (const locale of locales) {
        const phases = translations[locale].pattern[id].phases
        for (let i = 0; i < enPhases.length; i++) {
          expect(
            phases[i] === null,
            `${locale}.${id}.phases[${i}] null mismatch`,
          ).toBe(enPhases[i] === null)
        }
      }
    }
  })

  it('benefit count should match across locales for each pattern', () => {
    for (const id of allPatternIds) {
      const enCount = translations.en.pattern[id].benefits.length
      for (const locale of locales) {
        expect(
          translations[locale].pattern[id].benefits.length,
          `${locale}.${id}.benefits count`,
        ).toBe(enCount)
      }
    }
  })

  it('phase array lengths should match the actual pattern phase count from configs', () => {
    for (const pattern of allPatterns) {
      const configPhaseCount = pattern.phases.length
      for (const locale of locales) {
        const translatedPhaseCount = translations[locale].pattern[pattern.id].phases.length
        expect(
          translatedPhaseCount,
          `${locale}.${pattern.id} has ${translatedPhaseCount} translated phases but config has ${configPhaseCount}`,
        ).toBe(configPhaseCount)
      }
    }
  })

  it('pattern ids in translations should match ids from allPatterns', () => {
    const configIds = allPatterns.map((p) => p.id).sort()
    for (const locale of locales) {
      const translationIds = Object.keys(translations[locale].pattern).sort()
      expect(translationIds, `${locale} pattern ids`).toEqual(configIds)
    }
  })
})

// ────────────────────────────────────────────────────────
// translations — calibration section completeness
// ────────────────────────────────────────────────────────
describe('calibration translations', () => {
  it('should have all calibration keys in every locale', () => {
    const keys: Array<keyof Translation['calibration']> = [
      'title', 'intro', 'howItWorks', 'step1', 'step2', 'step3',
      'forBestResults', 'tip1', 'tip2', 'tip3', 'tip4',
      'begin', 'validationLabel', 'calibrationLabel', 'clicks',
      'readingGaze', 'lookAtDot', 'complete', 'noGazeData',
      'avgError', 'accuracy', 'excellent', 'good', 'low',
      'adaptiveNote', 'goodNote', 'lowNote',
      'continueToSession', 'backToHome', 'cameraAccessDenied', 'initFailed',
    ]
    for (const locale of locales) {
      for (const key of keys) {
        expect(translations[locale].calibration[key], `${locale}.calibration.${key}`).toBeTruthy()
      }
    }
  })
})

// ────────────────────────────────────────────────────────
// translations — session settings completeness
// ────────────────────────────────────────────────────────
describe('sessionSettings translations', () => {
  it('should have all session settings keys in every locale', () => {
    const keys: Array<keyof Translation['sessionSettings']> = [
      'title', 'timerMode', 'stopwatchMode', 'duration', 'unlimited',
      'speed', 'visualScale', 'visualScaleHint',
      'sound', 'volume', 'headphonesRecommended', 'haptic', 'guided',
      'eyeTracking', 'calibrationNeeded', 'calibrated', 'recalibrate',
      'cameraNotAvailable', 'cameraDenied', 'beginSession',
    ]
    for (const locale of locales) {
      for (const key of keys) {
        expect(translations[locale].sessionSettings[key], `${locale}.sessionSettings.${key}`).toBeTruthy()
      }
    }
  })
})

// ────────────────────────────────────────────────────────
// translations — results section
// ────────────────────────────────────────────────────────
describe('results translations', () => {
  it('should have all results keys in every locale', () => {
    const keys: Array<keyof Translation['results']> = [
      'title', 'noData', 'duration', 'status', 'completed',
      'endedEarly', 'pattern', 'audio', 'heatmapPlaceholder',
      'enableCameraHint', 'heatmapTitle', 'exportPng', 'gazePoints',
      'notePlaceholder', 'addNote',
      'repeatSession', 'newSession',
    ]
    for (const locale of locales) {
      for (const key of keys) {
        expect(translations[locale].results[key], `${locale}.results.${key}`).toBeTruthy()
      }
    }
  })
})

// ────────────────────────────────────────────────────────
// translations — session HUD
// ────────────────────────────────────────────────────────
describe('session translations', () => {
  it('should have all session keys in every locale', () => {
    const keys: Array<keyof Translation['session']> = [
      'paused', 'sessionComplete', 'resume', 'headphones', 'keyHints',
      'hideGuide', 'showGuide',
    ]
    for (const locale of locales) {
      for (const key of keys) {
        expect(translations[locale].session[key], `${locale}.session.${key}`).toBeTruthy()
      }
    }
  })
})

// ────────────────────────────────────────────────────────
// translations — patternInfo section
// ────────────────────────────────────────────────────────
describe('patternInfo translations', () => {
  it('should have all patternInfo keys in every locale', () => {
    const keys: Array<keyof Translation['patternInfo']> = [
      'howToPractice', 'whatToExpect', 'origins', 'benefits', 'headphonesNote',
    ]
    for (const locale of locales) {
      for (const key of keys) {
        expect(translations[locale].patternInfo[key], `${locale}.patternInfo.${key}`).toBeTruthy()
      }
    }
  })
})

// ────────────────────────────────────────────────────────
// translations — common, home, notFound, settingsPage
// ────────────────────────────────────────────────────────
describe('common translations', () => {
  it('should have all common keys non-empty', () => {
    for (const locale of locales) {
      for (const [key, value] of Object.entries(translations[locale].common)) {
        expect(value, `${locale}.common.${key}`).toBeTruthy()
      }
    }
  })
})

describe('home translations', () => {
  it('should have all home keys non-empty', () => {
    for (const locale of locales) {
      for (const [key, value] of Object.entries(translations[locale].home)) {
        expect(value, `${locale}.home.${key}`).toBeTruthy()
      }
    }
  })
})

describe('notFound translations', () => {
  it('should have all notFound keys non-empty', () => {
    for (const locale of locales) {
      for (const [key, value] of Object.entries(translations[locale].notFound)) {
        expect(value, `${locale}.notFound.${key}`).toBeTruthy()
      }
    }
  })
})

describe('settingsPage translations', () => {
  it('should have all settingsPage keys non-empty', () => {
    for (const locale of locales) {
      for (const [key, value] of Object.entries(translations[locale].settingsPage)) {
        expect(value, `${locale}.settingsPage.${key}`).toBeTruthy()
      }
    }
  })
})

// ────────────────────────────────────────────────────────
// useTranslation hook — tp() function
// ────────────────────────────────────────────────────────
describe('useTranslation — tp() function', () => {
  it('tp should return correct pattern translation for known id', () => {
    for (const locale of locales) {
      const dict = translations[locale]
      const tp = (id: string): PatternTranslation => dict.pattern[id]
      const result = tp('sama')
      expect(result).toBe(dict.pattern.sama)
    }
  })

  it('tp should return undefined for unknown id', () => {
    for (const locale of locales) {
      const dict = translations[locale]
      const tp = (id: string): PatternTranslation => dict.pattern[id]
      const result = tp('nonexistent_pattern')
      expect(result).toBeUndefined()
    }
  })

  it('tp should return distinct objects for different patterns', () => {
    const dict = translations.en
    const tp = (id: string): PatternTranslation => dict.pattern[id]
    expect(tp('sama')).not.toBe(tp('trataka'))
    expect(tp('sama').name).not.toBe(tp('trataka').name)
  })
})

// ────────────────────────────────────────────────────────
// translations — mood section
// ────────────────────────────────────────────────────────
describe('reflection translations', () => {
  it('should have all reflection keys in every locale', () => {
    const keys: Array<keyof Translation['reflection']> = [
      'title', 'skip', 'save', 'notePlaceholder', 'question', 'ratingLabels',
    ]
    for (const locale of locales) {
      for (const key of keys) {
        expect(translations[locale].reflection[key], `${locale}.reflection.${key}`).toBeTruthy()
      }
    }
  })

  it('should have exactly 5 rating labels in every locale', () => {
    for (const locale of locales) {
      expect(translations[locale].reflection.ratingLabels).toHaveLength(5)
    }
  })

  it('each rating label should be a non-empty string', () => {
    for (const locale of locales) {
      for (let i = 0; i < 5; i++) {
        expect(
          translations[locale].reflection.ratingLabels[i],
          `${locale}.reflection.ratingLabels[${i}]`,
        ).toBeTruthy()
      }
    }
  })

  it('reflection.title should differ between locales', () => {
    const values = new Set(locales.map((l) => translations[l].reflection.title))
    expect(values.size).toBe(locales.length)
  })

  it('reflection question keys should be present in every locale', () => {
    const questionKeys: Array<keyof Translation['reflection']['question']> = [
      'calming', 'activating', 'focusing', 'processing',
    ]
    for (const locale of locales) {
      for (const key of questionKeys) {
        expect(translations[locale].reflection.question[key], `${locale}.reflection.question.${key}`).toBeTruthy()
      }
    }
  })
})

// ────────────────────────────────────────────────────────
// cross-locale content differentiation
// ────────────────────────────────────────────────────────
describe('translations are actually different per locale', () => {
  it('common.cancel should differ between most locales', () => {
    // es and pt share "Cancelar" — allow one collision between related languages
    const values = new Set(locales.map((l) => translations[l].common.cancel))
    expect(values.size).toBeGreaterThanOrEqual(locales.length - 1)
  })

  it('pattern names should differ for translated patterns', () => {
    // EMDR Classic has different names across locales
    const names = locales.map((l) => translations[l].pattern.emdr_classic.name)
    expect(names[0]).not.toBe(names[1]) // en vs ru
  })

  it('trajectory labels should differ between en and ru', () => {
    expect(translations.en.trajectory.horizontal).not.toBe(translations.ru.trajectory.horizontal)
    expect(translations.en.trajectory.circular).not.toBe(translations.ru.trajectory.circular)
  })

  it('audioMode labels should differ between en and ru', () => {
    expect(translations.en.audioMode.rhythmic).not.toBe(translations.ru.audioMode.rhythmic)
  })

  it('pattern descriptions should differ between locales', () => {
    for (const id of allPatternIds) {
      const enDesc = translations.en.pattern[id].description
      const ruDesc = translations.ru.pattern[id].description
      expect(enDesc, `${id} en vs ru description`).not.toBe(ruDesc)
    }
  })

  it('session.paused should differ between locales', () => {
    const values = new Set(locales.map((l) => translations[l].session.paused))
    expect(values.size).toBe(locales.length)
  })
})
