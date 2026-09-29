import React, { useEffect, useRef, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import QualityNotificationPdf from '../pdf/QualityNotificationPdf.jsx'
import { registerFonts } from '../pdf/fonts.js'
import { useI18n } from '../i18n.jsx'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

const BASE = import.meta.env.BASE_URL
registerFonts(`${BASE}fonts`)
export const LOGO_SRC = `${BASE}gwf-logo.png`

export async function renderPdfBlob(data) {
  return pdf(<QualityNotificationPdf data={data} logoSrc={LOGO_SRC} />).toBlob()
}

// Draws every page into a canvas sized to the container width.
async function rasterize(blob, width) {
  const task = pdfjs.getDocument({ data: await blob.arrayBuffer() })
  const doc = await task.promise
  const dpr = window.devicePixelRatio || 1
  const canvases = []
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: (width / base.width) * dpr })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    await page.render({ canvas, viewport }).promise
    canvases.push(canvas)
  }
  task.destroy()
  return canvases
}

// Live preview: the very same document component as the download, debounced.
// Pages are drawn off-screen and swapped in one go, so the scroll position of
// the preview never jumps while you type.
export default function PdfPreview({ data, delay = 500 }) {
  const { t } = useI18n()
  const scroller = useRef(null)
  const [busy, setBusy] = useState(true)
  const [failed, setFailed] = useState(false)
  const run = useRef(0)
  const blobRef = useRef(null)

  async function paint(blob, id) {
    const el = scroller.current
    if (!el || !blob) return
    const top = el.scrollTop
    const width = Math.max(200, el.clientWidth - 24)
    const canvases = await rasterize(blob, width)
    if (id !== run.current) return
    canvases.forEach((c) => c.classList.add('preview-page'))
    el.replaceChildren(...canvases)
    el.scrollTop = top
  }

  useEffect(() => {
    const id = ++run.current
    setBusy(true)
    const timer = setTimeout(async () => {
      try {
        const blob = await renderPdfBlob(data)
        if (id !== run.current) return
        blobRef.current = blob
        await paint(blob, id)
        if (id === run.current) setFailed(false)
      } catch (e) {
        console.error(e)
        if (id === run.current) setFailed(true)
      } finally {
        if (id === run.current) setBusy(false)
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [data, delay]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fit the pages when the preview pane changes size.
  useEffect(() => {
    let timer
    const ro = new ResizeObserver(() => {
      clearTimeout(timer)
      timer = setTimeout(() => paint(blobRef.current, run.current), 250)
    })
    ro.observe(scroller.current)
    return () => {
      clearTimeout(timer)
      ro.disconnect()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="preview">
      {busy ? <div className="preview-status">{t('previewLoading')}</div> : null}
      {failed ? <div className="preview-status error">{t('previewError')}</div> : null}
      <div className="preview-scroll" ref={scroller} />
    </div>
  )
}
