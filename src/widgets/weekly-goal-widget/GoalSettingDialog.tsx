import { useState } from 'react'
import { useWeeklyGoalStore } from '@/features/weekly-goal'
import { useTranslation } from '@/shared/lib/i18n'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'

interface GoalSettingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const GOAL_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7] as const

export function GoalSettingDialog({ open, onOpenChange }: GoalSettingDialogProps) {
  const { t } = useTranslation()
  const { weeklyGoal, setWeeklyGoal } = useWeeklyGoalStore()
  const [draft, setDraft] = useState<string>(
    weeklyGoal != null ? String(weeklyGoal) : '0',
  )

  function handleOpen(nextOpen: boolean) {
    if (nextOpen) {
      setDraft(weeklyGoal != null ? String(weeklyGoal) : '0')
    }
    onOpenChange(nextOpen)
  }

  function handleSave() {
    const val = Number(draft)
    setWeeklyGoal(val === 0 ? null : val)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="font-heading text-text-bright">
            {t.weeklyGoal.title}
          </DialogTitle>
          <DialogDescription className="font-body text-sm font-light text-text-muted">
            {t.weeklyGoal.description}
          </DialogDescription>
        </DialogHeader>

        <Select value={draft} onValueChange={setDraft}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GOAL_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n === 0
                  ? t.weeklyGoal.noGoal
                  : `${n} ${t.weeklyGoal.daysPerWeek}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleSave} className="w-full">
          {t.weeklyGoal.save}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
