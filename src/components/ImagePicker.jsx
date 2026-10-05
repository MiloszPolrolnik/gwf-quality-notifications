import React, { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { processImage } from '../imageUtils.js'

// File picker + drag & drop + Ctrl+V paste, thumbnails with remove / reorder.
export default function ImagePicker({ images, onChange }) {
  const { t } = useI18n()
  const input = useRef(null)
  const [over, setOver] = useState(false)
  const [error, setError] = useState('')
  const imagesRef = useRef(images)
  imagesRef.current = images

  async function addFiles(files) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!list.length) return
    setError('')
    const added = []
    for (const f of list) {
      try {
        added.push(await processImage(f))
      } catch {
        setError(t('imageError'))
      }
    }
    if (added.length) onChange([...imagesRef.current, ...added])
  }

  // Ctrl+V anywhere on the form page pastes clipboard images.
  useEffect(() => {
    function onPaste(e) {
      if (e.defaultPrevented) return // an editor already inserted the image inline
      const files = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith('image/'))
      if (files.length) {
        e.preventDefault()
        addFiles(files)
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  })

  const move = (i, d) => {
    const next = [...images]
    const j = i + d
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="images">
      <div className="field-label">{t('images')}</div>
      <div
        className={`dropzone ${over ? 'over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          addFiles(e.dataTransfer.files)
        }}
      >
        <button type="button" className="btn" onClick={() => input.current.click()}>
          {t('addImages')}
        </button>
        <span>{t('dropHint')}</span>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>
      {error ? <div className="error">{error}</div> : null}
      {images.length ? (
        <ul className="thumbs">
          {images.map((img, i) => (
            <li key={img.id || i}>
              <img src={img.src} alt="" />
              <div className="thumb-actions">
                <button type="button" title={t('moveLeft')} disabled={i === 0} onClick={() => move(i, -1)}>
                  ←
                </button>
                <button type="button" title={t('moveRight')} disabled={i === images.length - 1} onClick={() => move(i, 1)}>
                  →
                </button>
                <button type="button" title={t('remove')} onClick={() => onChange(images.filter((_, k) => k !== i))}>
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
