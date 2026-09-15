import React, { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import QualityNotificationForm from './components/QualityNotificationForm.jsx'
import QualityNotificationPdf from './pdf/QualityNotificationPdf.jsx'
import { translations, languages } from './i18n.js'

const TOOLBAR_HEIGHT = 56

export default function App() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [lang, setLang] = useState('en')
  const t = translations[lang]

  async function handleDownload() {
    setIsGenerating(true)
    try {
      const blob = await pdf(<QualityNotificationPdf />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'DL05-F0987 - Quality Notification (empty).pdf'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div>
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: TOOLBAR_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: '#ffffff',
          borderBottom: '1px solid #ccc',
          zIndex: 10,
        }}
      >
        <strong>{t.toolbar.title}</strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                style={{
                  padding: '6px 12px',
                  fontSize: 13,
                  cursor: 'pointer',
                  background: lang === l.code ? '#1a3e6f' : '#ffffff',
                  color: lang === l.code ? '#fff' : '#1a3e6f',
                  border: '1px solid #1a3e6f',
                  borderRadius: 4,
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              cursor: isGenerating ? 'default' : 'pointer',
              background: '#1a3e6f',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
            }}
          >
            {isGenerating ? t.toolbar.generating : t.toolbar.download}
          </button>
        </div>
      </div>
      <div style={{ padding: '20px 0' }}>
        <QualityNotificationForm />
      </div>
    </div>
  )
}
