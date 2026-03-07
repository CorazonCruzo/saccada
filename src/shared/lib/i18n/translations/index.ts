import type { Locale, Translation } from '../types'
import { en } from './en'
import { ru } from './ru'
import { es } from './es'

export const translations: Record<Locale, Translation> = { en, ru, es }
