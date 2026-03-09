import { describe, it, expect, beforeEach } from 'vitest'
import { useWeeklyGoalStore } from './store'

describe('useWeeklyGoalStore', () => {
  beforeEach(() => {
    useWeeklyGoalStore.setState({
      weeklyGoal: null,
      seenMilestones: [],
    })
  })

  it('starts with null goal and empty milestones', () => {
    const state = useWeeklyGoalStore.getState()
    expect(state.weeklyGoal).toBeNull()
    expect(state.seenMilestones).toEqual([])
  })

  it('setWeeklyGoal sets the goal', () => {
    useWeeklyGoalStore.getState().setWeeklyGoal(5)
    expect(useWeeklyGoalStore.getState().weeklyGoal).toBe(5)
  })

  it('setWeeklyGoal with null clears the goal', () => {
    useWeeklyGoalStore.getState().setWeeklyGoal(3)
    useWeeklyGoalStore.getState().setWeeklyGoal(null)
    expect(useWeeklyGoalStore.getState().weeklyGoal).toBeNull()
  })

  it('markMilestoneSeen adds milestone', () => {
    useWeeklyGoalStore.getState().markMilestoneSeen(2)
    expect(useWeeklyGoalStore.getState().seenMilestones).toEqual([2])
  })

  it('markMilestoneSeen does not duplicate', () => {
    useWeeklyGoalStore.getState().markMilestoneSeen(2)
    useWeeklyGoalStore.getState().markMilestoneSeen(2)
    expect(useWeeklyGoalStore.getState().seenMilestones).toEqual([2])
  })

  it('markMilestoneSeen accumulates different milestones', () => {
    useWeeklyGoalStore.getState().markMilestoneSeen(2)
    useWeeklyGoalStore.getState().markMilestoneSeen(4)
    useWeeklyGoalStore.getState().markMilestoneSeen(8)
    expect(useWeeklyGoalStore.getState().seenMilestones).toEqual([2, 4, 8])
  })
})
