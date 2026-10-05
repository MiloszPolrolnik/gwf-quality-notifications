// Formatted text is stored as a plain string so older records, the server's
// required-field checks and the search columns keep working:
//   - text with "\n" line breaks, unformatted text is just the text itself
//   - private-use characters toggle bold / italic / underline for what follows
//   - IMG_OPEN + image id + IMG_CLOSE marks an inline image (kept on its own line)

export const BOLD = '\uE001'
export const ITALIC = '\uE002'
export const UNDERLINE = '\uE003'
export const IMG_OPEN = '\uE004'
export const IMG_CLOSE = '\uE005'

const MARKS = /[\uE001-\uE005]/g
const IMAGE_TOKEN = /\uE004([^\uE005\n]*)\uE005/g

// User input must never be able to forge markers.
export const stripMarks = (str) => String(str ?? '').replace(MARKS, '')

// The text without formatting and images (search columns, file names, ...).
export const plainText = (value) =>
  String(value ?? '')
    .replace(IMAGE_TOKEN, '')
    .replace(MARKS, '')

export const imageToken = (id) => `${IMG_OPEN}${id}${IMG_CLOSE}`

export const hasImages = (value) => /\uE004/.test(String(value ?? ''))

export function imageIds(value) {
  const ids = []
  for (const m of String(value ?? '').matchAll(IMAGE_TOKEN)) ids.push(m[1])
  return ids
}

// Removes all image tokens, or those whose id is not in `keep`.
export function dropImages(value, keep) {
  return String(value ?? '').replace(IMAGE_TOKEN, (all, id) => (keep && keep.has(id) ? all : ''))
}

// -> [{ type: 'text', runs: [{ text, b, i, u }] } | { type: 'image', id }]
export function parseRich(value) {
  const blocks = []
  let runs = []
  let b = false
  let i = false
  let u = false
  let text = ''
  const flush = () => {
    if (text) runs.push({ text, b, i, u })
    text = ''
  }
  const endText = () => {
    flush()
    if (runs.length) blocks.push({ type: 'text', runs })
    runs = []
  }
  const src = String(value ?? '')
  for (let k = 0; k < src.length; k++) {
    const ch = src[k]
    if (ch === BOLD || ch === ITALIC || ch === UNDERLINE) {
      flush()
      if (ch === BOLD) b = !b
      else if (ch === ITALIC) i = !i
      else u = !u
    } else if (ch === IMG_OPEN) {
      const end = src.indexOf(IMG_CLOSE, k)
      if (end < 0) break
      endText()
      blocks.push({ type: 'image', id: src.slice(k + 1, end) })
      k = end
    } else text += ch
  }
  endText()
  // The line break that puts an image on its own line is not part of the text.
  blocks.forEach((blk, n) => {
    if (blk.type !== 'text') return
    const first = blk.runs[0]
    const last = blk.runs[blk.runs.length - 1]
    if (n > 0 && first.text.startsWith('\n')) first.text = first.text.slice(1)
    if (n < blocks.length - 1 && last.text.endsWith('\n')) last.text = last.text.slice(0, -1)
  })
  return blocks
    .map((blk) => (blk.type === 'text' ? { ...blk, runs: blk.runs.filter((r) => r.text) } : blk))
    .filter((blk) => blk.type === 'image' || blk.runs.length)
}

// Largest `scale` that fitInline still honours.
export function maxScale(img, maxW, maxH) {
  const fit = Math.min(1, maxW / img.width, maxH / img.height)
  return Math.min(maxW / img.width, (maxH * 2.2) / img.height) / fit
}

// Size of an inline image: fitted into `maxW` x `maxH` (aspect ratio kept), then
// multiplied by the user's `scale`, but never wider than `maxW` or taller than
// 2.2 x `maxH`.
export function fitInline(img, maxW, maxH) {
  const fit = Math.min(1, maxW / img.width, maxH / img.height)
  const s = Math.min(fit * (img.scale ?? 1), maxW / img.width, (maxH * 2.2) / img.height)
  return { width: img.width * s, height: img.height * s }
}
