import { useState, useMemo } from 'react'
import { allPatterns, type PatternConfig, type PatternCategory } from '@/entities/pattern'
import { useTranslation } from '@/shared/lib/i18n'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs'
import { PatternCard } from './PatternCard'
import { PatternInfoDialog } from './PatternInfoDialog'

const categoryKeys = ['all', 'drishti', 'emdr', 'sleep'] as const

interface PatternPickerProps {
  selectedPattern: PatternConfig
  onSelect: (p: PatternConfig) => void
}

export function PatternPicker({ selectedPattern, onSelect }: PatternPickerProps) {
  const [category, setCategory] = useState('all')
  const [infoPattern, setInfoPattern] = useState<PatternConfig | null>(null)
  const { t } = useTranslation()

  const filteredPatterns = useMemo(() => {
    if (category === 'all') return allPatterns
    return allPatterns.filter((p) => p.category === category as PatternCategory)
  }, [category])

  return (
    <>
      <Tabs value={category} onValueChange={setCategory}>
        <TabsList variant="line" className="mx-auto">
          {categoryKeys.map((key) => (
            <TabsTrigger key={key} value={key}>
              {t.categories[key]}
            </TabsTrigger>
          ))}
        </TabsList>

        {categoryKeys.map((key) => (
          <TabsContent key={key} value={key}>
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
