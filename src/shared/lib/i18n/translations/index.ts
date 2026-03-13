import type { Locale, Translation } from '../types'
import { en } from './en'
import { ru } from './ru'
import { es } from './es'
import { de } from './de'
import { fr } from './fr'
import { pt } from './pt'
import { ja } from './ja'
import { hi } from './hi'
import { ta } from './ta'

export const translations: Record<Locale, Translation> = { en, ru, es, de, fr, pt, ja, hi, ta }
