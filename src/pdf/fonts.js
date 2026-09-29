import { Font } from '@react-pdf/renderer'

// Arimo is metric-compatible with Arial (the template's font). The TTFs live
// in public/fonts so nothing is fetched from a CDN at runtime.
// `base` is a URL prefix in the browser and a directory path in node.
export const FONT_FAMILY = 'Arimo'

const LONG_WORD = 24
const CHUNK = 6

let registered = false

export function registerFonts(base = '/fonts') {
  if (registered) return
  registered = true
  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: `${base}/Arimo-Regular.ttf`, fontWeight: 'normal', fontStyle: 'normal' },
      { src: `${base}/Arimo-Bold.ttf`, fontWeight: 'bold', fontStyle: 'normal' },
      { src: `${base}/Arimo-Italic.ttf`, fontWeight: 'normal', fontStyle: 'italic' },
      { src: `${base}/Arimo-BoldItalic.ttf`, fontWeight: 'bold', fontStyle: 'italic' },
    ],
  })
  // No real hyphenation (no hyphens are ever inserted). Only very long
  // unbroken strings (URLs, serial numbers ...) get artificial break points so
  // they wrap inside their cell instead of overflowing it.
  Font.registerHyphenationCallback((word) => {
    if (word.length <= LONG_WORD) return [word]
    const parts = []
    for (let i = 0; i < word.length; i += CHUNK) parts.push(word.slice(i, i + CHUNK))
    return parts
  })
}
