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
            <div className="mx-auto mt-4 flex w-full max-w-[1120px] flex-wrap justify-center gap-3">
              {filteredPatterns.map((p) => (
                <div key={p.id} className="w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)] lg:w-[calc(25%-9px)]">
                  <PatternCard
                    pattern={p}
                    isSelected={p.id === selectedPattern.id}
                    onSelect={() => onSelect(p)}
                    onInfo={() => setInfoPattern(p)}
                  />
                </div>
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
