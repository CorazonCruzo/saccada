# Task Plan: UX Overhaul

## Goal
Redesign the core user flow from pattern selection to session completion based on real user feedback.

## Phases

- [x] Phase 1: Quick wins
  - [x] 1.1 Reorder pattern cards (hook patterns first)
  - [x] 1.2 Guided text default OFF
  - [x] 1.3 Guided text larger/more prominent when ON
  - [x] 1.4 Info button larger, higher contrast
  - [x] 1.5 Remove vibration/haptic toggle from UI

- [ ] Phase 2: Pre-session screen (replaces settings dialog)
  - [ ] 2.1 Add sessionType to PatternConfig ('calming'|'activating'|'focusing'|'processing')
  - [ ] 2.2 Add recommendedDuration to PatternConfig
  - [ ] 2.3 Add i18n keys for pre-session instruction (sound ON/OFF variants), effects text, sensitivity warning, reflection questions
  - [ ] 2.4 Create PreSessionPage component (Zone A: instruction, Zone B: effects, Zone C: minimal settings, Zone D: start button)
  - [ ] 2.5 Add "Advanced settings" expandable section (speed, visual scale, background, eye tracking, guided text)
  - [ ] 2.6 Add sensitivity warning (collapsible)
  - [ ] 2.7 Add "Learn more" link opening PatternInfoDialog
  - [ ] 2.8 Update router: pattern card tap -> /pre-session/:id
  - [ ] 2.9 Remove old SettingsPanel dialog from home flow

- [ ] Phase 3: Session Reflection (replaces mood check)
  - [ ] 3.1 Add reflectionRating, reflectionType, note to session DB schema (Dexie migration)
  - [ ] 3.2 Create ReflectionPage component (heart rating + note + view stats link)
  - [ ] 3.3 Pattern-specific reflection questions (i18n)
  - [ ] 3.4 Update session flow: cooldown -> reflection -> results (optional)
  - [ ] 3.5 Update HistoryPage stats: replace mood change with avg rating
  - [ ] 3.6 Remove old mood check components and moodBefore/moodAfter from flow

- [ ] Phase 4: Desktop camera prompt
  - [ ] 4.1 One-time dismissible tooltip on home page (desktop only)
  - [ ] 4.2 Save dismissal in localStorage

## Status
**Phase 1 complete.** Ready to start Phase 2.

## Decisions Made
- Pattern order: Trataka, EMDR Classic, Pralokita, Avalokita first (hook patterns)
- Guided text OFF by default, larger text-base/text-lg when ON
- Haptic removed from UI (keep store/feature code for v2)
- Info button: h-12 w-12, gold border, filled background, font-semibold
- @media(hover:hover) for desktop-only UI elements
