import type { PatternConfig } from '@/entities/pattern'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/dialog'

interface PatternInfoDialogProps {
  pattern: PatternConfig | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PatternInfoDialog({ pattern, open, onOpenChange }: PatternInfoDialogProps) {
  if (!pattern) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-border-ornament bg-bg-mid">
        <DialogHeader>
          {pattern.nameDevanagari && (
            <p className="font-devanagari text-lg text-gold">{pattern.nameDevanagari}</p>
          )}
          <DialogTitle className="font-heading text-xl text-text-bright">
            {pattern.name}
          </DialogTitle>
          <DialogDescription className="font-body text-sm font-light text-text-muted">
            {pattern.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Instruction */}
          <section>
            <h3 className="font-heading text-xs tracking-widest text-turmeric uppercase">
              How to Practice
            </h3>
            <p className="mt-1.5 font-body text-sm font-light leading-relaxed text-text-bright">
              {pattern.instruction}
            </p>
          </section>

          {/* Effect */}
          <section>
            <h3 className="font-heading text-xs tracking-widest text-turmeric uppercase">
              What to Expect
            </h3>
            <p className="mt-1.5 font-body text-sm font-light leading-relaxed text-text-bright">
              {pattern.effect}
            </p>
          </section>

          {/* Origins */}
          <section>
            <h3 className="font-heading text-xs tracking-widest text-turmeric uppercase">
              Origins
            </h3>
            <p className="mt-1.5 font-body text-sm font-light leading-relaxed text-text-muted">
              {pattern.origins}
            </p>
          </section>

          {/* Benefits */}
          <section>
            <h3 className="font-heading text-xs tracking-widest text-turmeric uppercase">
              Benefits
            </h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {pattern.benefits.map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-border-ornament bg-bg-surface px-2.5 py-0.5 font-heading text-[10px] tracking-wide text-text-muted"
                >
                  {b}
                </span>
              ))}
            </div>
          </section>

          {/* Headphones notice */}
          {pattern.requiresHeadphones && (
            <div className="flex items-center gap-2 rounded-lg border border-indigo/30 bg-indigo/10 px-3 py-2">
              <span className="text-sm">🎧</span>
              <span className="font-body text-xs font-light text-indigo">
                Headphones recommended for this pattern
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
