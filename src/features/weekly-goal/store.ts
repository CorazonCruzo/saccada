import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WeeklyGoalStore {
  weeklyGoal: number | null
  seenMilestones: number[]
  setWeeklyGoal: (goal: number | null) => void
  markMilestoneSeen: (weeks: number) => void
}

export const useWeeklyGoalStore = create<WeeklyGoalStore>()(
  persist(
    (set) => ({
      weeklyGoal: null,
      seenMilestones: [],
      setWeeklyGoal: (goal) => set({ weeklyGoal: goal }),
      markMilestoneSeen: (weeks) =>
        set((state) => ({
          seenMilestones: state.seenMilestones.includes(weeks)
            ? state.seenMilestones
            : [...state.seenMilestones, weeks],
        })),
    }),
    { name: 'saccada-weekly-goal' },
  ),
)
