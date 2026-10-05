import { CONTENT_W, W_LINE, PAD_X, LINE_H, FONT_SIZE } from './geometry.js'
import { parseRich, fitInline } from '../richText.js'

// react-pdf cannot tell us a block's height before layout, so the sections
// estimate it to decide whether a text still fits on one page.

// Arial advance widths (1/1000 em) for ASCII 32..126; Arimo is metric-compatible.
// prettier-ignore
const ADV = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
]

// Mirrors the hyphenation callback in fonts.js.
const LONG_WORD = 24
const CHUNK = 6

// Width of the text inside a full-width cell (1pt of safety).
export const TEXT_W = CONTENT_W - 2 * W_LINE - 2 * PAD_X - 1

// Inline images in texts: at most this big, on a line of their own.
export const INLINE_MAX_W = TEXT_W
export const INLINE_MAX_H = 230
const INLINE_GAP = 4

// A block taller than this is allowed to break across pages (the rest of the
// 721pt page body is reserved for the section header and estimation error).
export const ONE_PAGE = 600

export function textWidth(str, size = FONT_SIZE) {
  let w = 0
  for (const ch of str) {
    const c = ch.codePointAt(0)
    w += c >= 32 && c <= 126 ? ADV[c - 32] : 556
  }
  return (w * size) / 1000
}

export function countLines(text, width = TEXT_W) {
  const space = textWidth(' ')
  let lines = 0
  for (const para of String(text ?? '').split('\n')) {
    lines += 1
    let x = 0
    for (const word of para.split(' ')) {
      const pieces = []
      if (word.length > LONG_WORD) for (let i = 0; i < word.length; i += CHUNK) pieces.push(word.slice(i, i + CHUNK))
      else pieces.push(word)
      pieces.forEach((piece, i) => {
        const w = textWidth(piece)
        const gap = i === 0 && x > 0 ? space : 0
        if (x > 0 && x + gap + w > width) {
          lines += 1
          x = w
        } else x += gap + w
      })
    }
  }
  return lines
}

// Estimated height of a formatted text incl. its inline images.
export function richHeight(value, images = {}, width = TEXT_W) {
  let h = 0
  for (const blk of parseRich(value)) {
    if (blk.type === 'text') {
      // bold runs are wider: shrink the line a little when the block has any
      const w = blk.runs.some((r) => r.b) ? width * 0.94 : width
      h += countLines(blk.runs.map((r) => r.text).join(''), w) * LINE_H
    } else if (images[blk.id]) {
      h += fitInline(images[blk.id], INLINE_MAX_W, INLINE_MAX_H).height + INLINE_GAP
    }
  }
  return h
}
