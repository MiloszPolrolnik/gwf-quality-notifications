import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { processImage } from '../imageUtils.js'
import { BOLD, ITALIC, UNDERLINE, fitInline, imageToken, maxScale, parseRich, stripMarks } from '../richText.js'
import { INLINE_MAX_W, INLINE_MAX_H } from '../pdf/measure.js'

// Inline images of all rich fields live in one map (id -> { src, width, height, scale }).
export const ImageStore = createContext({ images: {}, add: () => {}, update: () => {} })

// Same proportions as in the PDF: share of the text width.
const widthCss = (img) => `${(fitInline(img, INLINE_MAX_W, INLINE_MAX_H).width / INLINE_MAX_W) * 100}%`
const STEP = 1.25

const BLOCK = new Set(['DIV', 'P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE'])

function styleOf(el, st) {
  const s = { ...st }
  const tag = el.tagName
  if (tag === 'B' || tag === 'STRONG') s.b = true
  if (tag === 'I' || tag === 'EM') s.i = true
  if (tag === 'U') s.u = true
  const css = el.style
  if (css) {
    if (css.fontWeight) s.b = css.fontWeight === 'bold' || css.fontWeight === 'bolder' || Number(css.fontWeight) >= 600
    if (css.fontStyle) s.i = css.fontStyle === 'italic'
    const deco = css.textDecorationLine || css.textDecoration
    if (deco) s.u = deco.includes('underline')
  }
  return s
}

// DOM of the editor -> stored string (see richText.js).
export function serializeDom(root) {
  const lines = []
  let cur = ''
  let open = false // a line has been started (it may still be empty)
  let eb = false
  let ei = false
  let eu = false
  const newline = () => {
    lines.push(cur)
    cur = ''
  }
  const emitText = (raw, st) => {
    raw
      .replace(/\u00a0/g, ' ')
      .split('\n')
      .forEach((part, n) => {
        if (n > 0) {
          newline()
          open = true
        }
        const s = stripMarks(part)
        if (!s) return
        if (st.b !== eb) (cur += BOLD), (eb = st.b)
        if (st.i !== ei) (cur += ITALIC), (ei = st.i)
        if (st.u !== eu) (cur += UNDERLINE), (eu = st.u)
        cur += s
        open = true
      })
  }
  const visit = (node, st) => {
    if (node.nodeType === 3) return emitText(node.nodeValue, st)
    if (node.nodeType !== 1) return
    const tag = node.tagName
    if (tag === 'BR') {
      // the <br> that keeps an empty line (or the end of a line) alive is not a line break
      if (!node.nextSibling) return
      newline()
      open = true
      return
    }
    if (tag === 'IMG') {
      const id = node.dataset.id
      if (!id) return
      if (cur !== '') newline()
      lines.push(imageToken(id))
      cur = ''
      open = false
      return
    }
    if (BLOCK.has(tag)) {
      if (open) newline()
      open = true
    }
    const next = styleOf(node, st)
    node.childNodes.forEach((c) => visit(c, next))
  }
  root.childNodes.forEach((c) => visit(c, { b: false, i: false, u: false }))
  if (open) lines.push(cur)
  return lines.join('\n')
}

function imageNode(id, img) {
  const el = document.createElement('img')
  el.src = img.src
  el.alt = ''
  el.dataset.id = id
  el.style.width = widthCss(img)
  el.contentEditable = 'false'
  return el
}

function runNode(r) {
  let node = document.createTextNode(r.text)
  for (const [on, tag] of [
    [r.u, 'u'],
    [r.i, 'i'],
    [r.b, 'b'],
  ]) {
    if (!on) continue
    const el = document.createElement(tag)
    el.appendChild(node)
    node = el
  }
  return node
}

// Stored string -> DOM lines (one <div> per line, images on their own line).
export function buildDom(value, images) {
  const out = []
  for (const blk of parseRich(value)) {
    if (blk.type === 'image') {
      const img = images[blk.id]
      if (!img) continue
      const d = document.createElement('div')
      d.appendChild(imageNode(blk.id, img))
      out.push(d)
      continue
    }
    let line = []
    const lines = [line]
    for (const r of blk.runs) {
      r.text.split('\n').forEach((part, n) => {
        if (n > 0) lines.push((line = []))
        if (part) line.push({ ...r, text: part })
      })
    }
    for (const l of lines) {
      const d = document.createElement('div')
      if (!l.length) d.appendChild(document.createElement('br'))
      else l.forEach((r) => d.appendChild(runNode(r)))
      out.push(d)
    }
  }
  return out
}

const COMMANDS = [
  ['bold', 'b', 'B', 'bold', 'Ctrl+B'],
  ['italic', 'i', 'I', 'italic', 'Ctrl+I'],
  ['underline', 'u', 'U', 'underline', 'Ctrl+U'],
]

// Small Word-like editor: bold / italic / underline and (optionally) inline images.
// `toolbar="focus"` shows the toolbar in a popup while the field has focus.
export default function RichEditor({
  value,
  onChange,
  minRows = 1,
  singleLine = false,
  allowImages = false,
  toolbar = 'focus',
  placeholder,
  className = '',
}) {
  const { t } = useI18n()
  const store = useContext(ImageStore)
  const ref = useRef(null)
  const fileInput = useRef(null)
  const last = useRef(null) // last value this editor wrote / rendered
  const range = useRef(null) // last caret position inside the editor
  const [fmt, setFmt] = useState({ b: false, i: false, u: false })
  const [error, setError] = useState('')
  const [picked, setPicked] = useState(null) // { id, top, left, w, h }: selected image, relative to the editor box
  const text = String(value ?? '')

  useLayoutEffect(() => {
    if (text === last.current) return
    ref.current.replaceChildren(...buildDom(text, store.images))
    last.current = text
    setPicked(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  useEffect(() => {
    function onSelection() {
      const el = ref.current
      const sel = document.getSelection()
      if (!el || !sel.rangeCount || !el.contains(sel.anchorNode)) return
      range.current = sel.getRangeAt(0).cloneRange()
      const next = { b: false, i: false, u: false }
      try {
        next.b = document.queryCommandState('bold')
        next.i = document.queryCommandState('italic')
        next.u = document.queryCommandState('underline')
      } catch {
        /* queryCommandState unavailable */
      }
      setFmt((f) => (f.b === next.b && f.i === next.i && f.u === next.u ? f : next))
    }
    document.addEventListener('selectionchange', onSelection)
    return () => document.removeEventListener('selectionchange', onSelection)
  }, [])

  function emit() {
    const v = serializeDom(ref.current)
    if (!v && ref.current.firstChild) ref.current.replaceChildren() // lets the placeholder show again
    last.current = v
    onChange(v)
  }

  function exec(command) {
    ref.current.focus()
    document.execCommand(command)
    emit()
  }

  function placeCaret() {
    const el = ref.current
    el.focus()
    const sel = document.getSelection()
    if (range.current && el.contains(range.current.startContainer)) {
      sel.removeAllRanges()
      sel.addRange(range.current)
    } else if (!sel.rangeCount || !el.contains(sel.anchorNode)) {
      const r = document.createRange()
      r.selectNodeContents(el)
      r.collapse(false)
      sel.removeAllRanges()
      sel.addRange(r)
    }
    return sel.getRangeAt(0)
  }

  async function insertImages(files) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!list.length) return
    setError('')
    for (const f of list) {
      let img
      try {
        img = await processImage(f)
      } catch {
        setError(t('imageError'))
        continue
      }
      store.add(img)
      const r = placeCaret()
      r.deleteContents()
      const line = document.createElement('div')
      line.appendChild(imageNode(img.id, img))
      const after = document.createElement('div')
      after.appendChild(document.createElement('br'))
      // the image gets a line of its own below the current line, the caret moves under it
      let block = r.startContainer
      while (block && block.parentNode !== ref.current) block = block.parentNode
      if (block) block.after(line, after)
      else ref.current.append(line, after)
      const c = document.createRange()
      c.setStart(after, 0)
      c.collapse(true)
      const sel = document.getSelection()
      sel.removeAllRanges()
      sel.addRange(c)
      range.current = c.cloneRange()
      emit()
    }
  }

  function onPaste(e) {
    const files = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith('image/'))
    const plain = e.clipboardData?.getData('text/plain') ?? ''
    if (files.length && !plain) {
      if (!allowImages) return // left to the page-level picture paste
      e.preventDefault()
      insertImages(files)
      return
    }
    e.preventDefault()
    const clean = stripMarks(plain).replace(/\r\n?/g, '\n')
    document.execCommand('insertText', false, singleLine ? clean.replace(/\s*\n\s*/g, ' ') : clean)
  }

  function onDrop(e) {
    const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
    e.preventDefault()
    e.stopPropagation()
    if (!allowImages) return
    const pos = document.caretRangeFromPoint?.(e.clientX, e.clientY)
    if (pos && ref.current.contains(pos.startContainer)) range.current = pos
    insertImages(files)
  }

  function imageEl(id) {
    return Array.from(ref.current.querySelectorAll('img')).find((el) => el.dataset.id === id)
  }

  // Marks an image as selected: frame with resize handles and the small toolbar.
  function pick(id) {
    ref.current.querySelectorAll('img.selected').forEach((el) => el.classList.remove('selected'))
    const el = id && imageEl(id)
    if (!el) return setPicked(null)
    el.classList.add('selected')
    const box = el.getBoundingClientRect()
    const host = ref.current.parentNode.getBoundingClientRect()
    setPicked({ id, top: box.top - host.top, left: box.left - host.left, w: box.width, h: box.height })
  }

  function resizeImage(id, factor) {
    const img = store.images[id]
    if (!img) return
    const limit = maxScale(img, INLINE_MAX_W, INLINE_MAX_H)
    const next = { ...img, scale: Math.min(limit, Math.max(0.1, (img.scale ?? 1) * factor)) }
    store.update(id, { scale: next.scale })
    const el = imageEl(id)
    if (el) el.style.width = widthCss(next)
    requestAnimationFrame(() => pick(id))
  }

  // Drag a corner handle: `dir` is +1 for the right corners, -1 for the left ones.
  function startDrag(e, id, dir) {
    e.preventDefault()
    const img = store.images[id]
    const el = imageEl(id)
    if (!img || !el) return
    const startX = e.clientX
    const startW = el.getBoundingClientRect().width
    const from = img.scale ?? 1
    const limit = maxScale(img, INLINE_MAX_W, INLINE_MAX_H)
    let scale = from
    const move = (ev) => {
      const w = Math.max(24, startW + dir * (ev.clientX - startX))
      scale = Math.min(limit, Math.max(0.1, (from * w) / startW))
      el.style.width = widthCss({ ...img, scale })
      pick(id)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      store.update(id, { scale })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  function removeImage(id) {
    const el = imageEl(id)
    if (!el) return
    const line = el.parentNode
    el.remove()
    if (line !== ref.current && !line.textContent && !line.firstChild) line.remove()
    setPicked(null)
    emit()
  }

  function onClick(e) {
    pick(e.target.tagName === 'IMG' ? e.target.dataset.id : null)
  }

  function onKeyDown(e) {
    if (singleLine && e.key === 'Enter') e.preventDefault()
    if (picked && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault()
      removeImage(picked.id)
      return
    }
    if (picked && e.key === 'Escape') pick(null)
    else if (picked && !['Delete', 'Backspace', 'Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) pick(null)
    const key = (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey ? e.key.toLowerCase() : ''
    const command = { b: 'bold', i: 'italic', u: 'underline' }[key]
    if (command) {
      e.preventDefault()
      exec(command)
    }
  }

  const bar = (
    <div className={`rich-bar ${toolbar}`} onMouseDown={(e) => e.preventDefault()}>
      {COMMANDS.map(([cmd, key, label, name, keys]) => (
        <button
          type="button"
          key={cmd}
          className={`rich-btn rich-${key} ${fmt[key] ? 'on' : ''}`}
          title={`${t(name)} (${keys})`}
          aria-label={t(name)}
          aria-pressed={fmt[key]}
          onClick={() => exec(cmd)}
        >
          {label}
        </button>
      ))}
      {allowImages ? (
        <>
          <span className="rich-sep" />
          <button
            type="button"
            className="rich-btn"
            title={t('insertImage')}
            aria-label={t('insertImage')}
            onClick={() => {
              if (ref.current) placeCaret()
              fileInput.current.click()
            }}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <circle cx="5.2" cy="6" r="1.3" fill="currentColor" />
              <path d="M2.5 12.5l3.8-3.8 2.4 2.4 2-2 3 3.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              insertImages(e.target.files)
              e.target.value = ''
            }}
          />
        </>
      ) : null}
    </div>
  )

  return (
    <div className={`rich ${toolbar} ${className}`}>
      {bar}
      <div
        ref={ref}
        className="rich-edit"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline={!singleLine}
        data-placeholder={placeholder}
        style={{ minHeight: `calc(${minRows} * 1.4em + 18px)` }}
        onInput={emit}
        onPaste={onPaste}
        onDrop={onDrop}
        onKeyDown={onKeyDown}
        onClick={onClick}
        onBlur={() => !ref.current?.parentNode.contains(document.activeElement) && picked && pick(null)}
      />
      {picked ? (
        <>
          <div className="rich-img-frame" style={{ top: picked.top, left: picked.left, width: picked.w, height: picked.h }}>
            {[
              ['nw', -1],
              ['ne', 1],
              ['sw', -1],
              ['se', 1],
            ].map(([corner, dir]) => (
              <span key={corner} className={`rich-handle ${corner}`} onPointerDown={(e) => startDrag(e, picked.id, dir)} />
            ))}
          </div>
          <div className="rich-img-bar" style={{ top: picked.top + 6, left: picked.left + 16 }} onMouseDown={(e) => e.preventDefault()}>
          <button type="button" className="rich-btn" title={t('imageSmaller')} aria-label={t('imageSmaller')} onClick={() => resizeImage(picked.id, 1 / STEP)}>
            −
          </button>
          <button type="button" className="rich-btn" title={t('imageLarger')} aria-label={t('imageLarger')} onClick={() => resizeImage(picked.id, STEP)}>
            +
          </button>
          <button type="button" className="rich-btn" title={t('imageRemove')} aria-label={t('imageRemove')} onClick={() => removeImage(picked.id)}>
            ✕
          </button>
        </div>
        </>
      ) : null}
      {error ? <div className="error">{error}</div> : null}
    </div>
  )
}
