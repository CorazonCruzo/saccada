/** Saccada color palette — raw hex values for Canvas rendering */

export const palette = {
  bg: {
    deep: '#0e0a1a',
    mid: '#1a1035',
    surface: '#231a42',
  },
  warm: {
    saffron: '#c4956a',
    turmeric: '#e8a838',
    gold: '#c4956a',
  },
  cool: {
    teal: '#2ec4b6',
    lotus: '#e84393',
    indigo: '#6c5ce7',
  },
  text: {
    bright: '#f0e6d3',
    muted: '#9b8eb0',
    dim: '#5a4d6e',
  },
  border: '#2d2255',
} as const

/** Bindu color by pattern category */
export const binduColors = {
  saffron: palette.warm.saffron,
  teal: palette.cool.teal,
  lotus: palette.cool.lotus,
  indigo: palette.cool.indigo,
} as const

export type BinduColorToken = keyof typeof binduColors
