import Dexie, { type EntityTable } from 'dexie'

export interface SessionRecord {
  id?: number
  patternId: string
  patternName: string
  elapsed: number
  completed: boolean
  timestamp: number
  moodBefore?: number
  moodAfter?: number
  note?: string
  gazePoints?: Array<{ x: number; y: number; t: number; dotX?: number; dotY?: number }>
  viewportWidth?: number
  viewportHeight?: number
  speed?: number
  visualScale?: number
}

const db = new Dexie('saccada') as Dexie & {
  sessions: EntityTable<SessionRecord, 'id'>
}

db.version(1).stores({
  sessions: '++id, patternId, timestamp',
})

export { db }
