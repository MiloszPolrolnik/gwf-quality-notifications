import React from 'react'
import { useI18n } from '../i18n.jsx'

// Inline SVG flags (emoji flags do not render on Windows).
const Gb = () => (
  <svg viewBox="0 0 60 40" width="24" height="16" aria-hidden="true">
    <rect width="60" height="40" fill="#012169" />
    <path d="M0 0l60 40M60 0L0 40" stroke="#fff" strokeWidth="8" />
    <path d="M0 0l60 40M60 0L0 40" stroke="#C8102E" strokeWidth="3" />
    <path d="M30 0v40M0 20h60" stroke="#fff" strokeWidth="13" />
    <path d="M30 0v40M0 20h60" stroke="#C8102E" strokeWidth="8" />
  </svg>
)
const De = () => (
  <svg viewBox="0 0 60 40" width="24" height="16" aria-hidden="true">
    <rect width="60" height="13.4" fill="#000" />
    <rect y="13.3" width="60" height="13.4" fill="#DD0000" />
    <rect y="26.6" width="60" height="13.4" fill="#FFCE00" />
  </svg>
)

export default function LanguageSwitch() {
  const { lang, setLang } = useI18n()
  return (
    <div className="lang" role="group" aria-label="Language">
      {[
        ['en', 'EN', <Gb key="g" />],
        ['de', 'DE', <De key="d" />],
      ].map(([code, label, flag]) => (
        <button
          key={code}
          type="button"
          className={lang === code ? 'active' : ''}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
        >
          {flag}
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
