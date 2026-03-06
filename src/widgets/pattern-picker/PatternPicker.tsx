import { useState, useMemo } from 'react'
import { allPatterns, type PatternConfig, type PatternCategory } from '@/entities/pattern'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs'
import { PatternCard } from './PatternCard'
import { PatternInfoDialog } from './PatternInfoDialog'

const categories: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'drishti', label: 'Drishti Bheda' },
  { value: 'emdr', label: 'EMDR' },
  { value: 'sleep', label: 'Sleep' },
]

interface PatternPickerProps {
  selectedPattern: PatternConfig
  onSelect: (p: PatternConfig) => void
}

export function PatternPicker({ selectedPattern, onSelect }: PatternPickerProps) {
  const [category, setCategory] = useState('all')
  const [infoPattern, setInfoPattern] = useState<PatternConfig | null>(null)

  const filteredPatterns = useMemo(() => {
    if (category === 'all') return allPatterns
    return allPatterns.filter((p) => p.category === category as PatternCategory)
  }, [category])

  return (
    <>
      <Tabs value={category} onValueChange={setCategory}>
        <TabsList variant="line" className="mx-auto">
          {categories.map((c) => (
            <TabsTrigger key={c.value} value={c.value}>
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Single content area — filtering handled by filteredPatterns */}
        {categories.map((c) => (
          <TabsContent key={c.value} value={c.value}>
            <div className="mt-4 grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredPatterns.map((p) => (
                <PatternCard
                  key={p.id}
                  pattern={p}
                  isSelected={p.id === selectedPattern.id}
                  onSelect={() => onSelect(p)}
                  onInfo={() => setInfoPattern(p)}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <PatternInfoDialog
        pattern={infoPattern}
        open={infoPattern !== null}
        onOpenChange={(open) => { if (!open) setInfoPattern(null) }}
      />
    </>
  )
}
