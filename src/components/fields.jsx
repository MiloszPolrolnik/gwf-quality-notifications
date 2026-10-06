import React, { createContext, useContext, useLayoutEffect, useRef, useState } from 'react'
import RichEditor from './RichEditor.jsx'
import { useI18n } from '../i18n.jsx'

// Textarea that grows with its content and keeps pasted line breaks.
export function AutoTextarea({ value, onChange, minRows = 3, ...rest }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [value])
  return <textarea ref={ref} rows={minRows} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
}

export function Field({ label, hint, children, className = '', as: Tag = 'label' }) {
  return (
    <Tag className={`field ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </Tag>
  )
}

// Labelled editor with bold / italic / underline (and inline images with `allowImages`).
// A <div>, not a <label>: a label would forward clicks to the toolbar buttons.
export function RichField({ label, value, onChange, minRows = 3, allowImages = false, toolbar = 'always', className }) {
  return (
    <Field as="div" label={label} className={className}>
      <RichEditor value={value} onChange={onChange} minRows={minRows} allowImages={allowImages} toolbar={toolbar} />
    </Field>
  )
}

// `plain`: ordinary input without formatting.
// `multiline`: starts as one line, grows downwards and accepts Enter.
export function TextField({ label, value, onChange, hint, className, multiline = false, plain = false, ...rest }) {
  if (plain) {
    return (
      <Field label={label} hint={hint} className={className}>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      </Field>
    )
  }
  return (
    <Field as="div" label={label} hint={hint} className={className}>
      <RichEditor value={value} onChange={onChange} minRows={1} singleLine={!multiline} {...rest} />
    </Field>
  )
}

// `text` / `onText`: adds an input next to the label (or a growing textarea under it with
// `below`) while the box is checked.
// `col`: column in a two-column `.checks.cols` grid (as in the template); `wide` spans both.
export function Check({ label, checked, onChange, indent = 0, text, onText, placeholder, below = false, col, wide = false }) {
  const place = wide ? { gridColumn: '1 / -1' } : col ? { gridColumn: col } : undefined
  const box = (
    <label className="check" style={onText ? place : { ...place, marginLeft: indent * 22 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
  if (!onText) return box
  return (
    <div className={below ? 'check-text below' : 'check-text'} style={{ ...place, marginLeft: indent * 22 }}>
      {box}
      {checked &&
        (below ? (
          <RichEditor minRows={1} value={text} placeholder={placeholder} onChange={onText} />
        ) : (
          <input type="text" maxLength={60} value={text} placeholder={placeholder} onChange={(e) => onText(e.target.value)} />
        ))}
    </div>
  )
}

// yes / no pair: clicking the selected option again clears it.
export function YesNoField({ label, value, onChange, yes, no }) {
  return (
    <div className="yesno">
      <span className="field-label">{label}</span>
      <div className="yesno-options">
        {[
          ['yes', yes],
          ['no', no],
        ].map(([v, text]) => (
          <label className="check" key={v}>
            <input type="checkbox" checked={value === v} onChange={() => onChange(value === v ? '' : v)} />
            <span>{text}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

// Review state shared with the form blocks: read-only mode and the sticky notes per section.
//   notes: [{ id, fieldKey, userName, text, resolved }]
//   onAdd(fieldKey, text) / onResolve(id, resolved): null when the user may not do that
//   onDelete(id): removes a note; offered only for the user's own notes (userId)
export const ReviewContext = createContext({ readOnly: false, notes: [], onAdd: null, onResolve: null, onDelete: null })

// Content that becomes unusable (inert) while the notification is read-only.
export function Locked({ children, className }) {
  const { readOnly } = useContext(ReviewContext)
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (ref.current) ref.current.inert = readOnly
  }, [readOnly])
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

function Notes({ fieldKey, notes }) {
  const { t } = useI18n()
  const { onAdd, onResolve, onDelete, userId } = useContext(ReviewContext)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const act = async (fn) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch {
      setError(t('noteError'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="notes">
      {notes.map((n) => (
        <div key={n.id} className={`note-card ${n.resolved ? 'done' : ''}`}>
          <b>{n.userName}</b>
          <p>{n.text}</p>
          {onResolve && (
            <button type="button" className="btn ghost" disabled={busy} onClick={() => act(() => onResolve(n.id, !n.resolved))}>
              {n.resolved ? t('noteReopen') : t('noteDone')}
            </button>
          )}
          {!onResolve && n.resolved && <span className="note">✓ {t('noteDone')}</span>}
          {onDelete && n.userId === userId && (
            <button
              type="button"
              className="btn ghost"
              disabled={busy}
              onClick={() => window.confirm(t('noteDeleteConfirm')) && act(() => onDelete(n.id))}
            >
              {t('delete')}
            </button>
          )}
        </div>
      ))}
      {onAdd && (
        <div className="note-add">
          <textarea rows={2} value={text} placeholder={t('notePlaceholder')} onChange={(e) => setText(e.target.value)} />
          <button
            type="button"
            className="btn primary"
            disabled={busy || !text.trim()}
            onClick={() =>
              act(async () => {
                await onAdd(fieldKey, text.trim())
                setText('')
              })
            }
          >
            {t('addNote')}
          </button>
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  )
}

export function Block({ n, title, children }) {
  const { t } = useI18n()
  const { notes, onAdd } = useContext(ReviewContext)
  const key = `s${n}`
  const mine = notes.filter((c) => c.fieldKey === key)
  const open = mine.filter((c) => !c.resolved).length
  const [shown, setShown] = useState(null) // null = automatic: open while there are unresolved notes
  const expanded = shown ?? open > 0
  return (
    <section className={`block ${open ? 'has-notes' : ''}`}>
      <h2>
        <span className="block-n">{n}</span>
        {title}
        {(mine.length > 0 || onAdd) && (
          <button
            type="button"
            className={`note-btn ${open ? 'open' : ''}`}
            title={t('notes')}
            aria-expanded={expanded}
            onClick={() => setShown(!expanded)}
          >
            💬{mine.length > 0 && <span>{open || mine.length}</span>}
          </button>
        )}
      </h2>
      {expanded && <Notes fieldKey={key} notes={mine} />}
      <Locked>{children}</Locked>
    </section>
  )
}
