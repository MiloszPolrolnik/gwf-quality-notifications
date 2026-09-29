import React, { useLayoutEffect, useRef } from 'react'

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

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  )
}

// `multiline`: starts as one line like an input, grows downwards and accepts Enter.
export function TextField({ label, value, onChange, hint, className, multiline = false, ...rest }) {
  return (
    <Field label={label} hint={hint} className={className}>
      {multiline ? (
        <AutoTextarea value={value} onChange={onChange} minRows={1} {...rest} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      )}
    </Field>
  )
}

// `text` / `onText`: adds an input next to the label (or a growing textarea under it with
// `below`) while the box is checked.
export function Check({ label, checked, onChange, indent = 0, text, onText, placeholder, below = false }) {
  const box = (
    <label className="check" style={onText ? undefined : { marginLeft: indent * 22 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
  if (!onText) return box
  return (
    <div className={below ? 'check-text below' : 'check-text'} style={{ marginLeft: indent * 22 }}>
      {box}
      {checked &&
        (below ? (
          <AutoTextarea minRows={1} value={text} placeholder={placeholder} onChange={onText} />
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

export function Block({ n, title, children }) {
  return (
    <section className="block">
      <h2>
        <span className="block-n">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}
