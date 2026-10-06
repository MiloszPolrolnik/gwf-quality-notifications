import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
const DEFAULT_SIG_W = 0.22 // initial width of a placed signature, as a fraction of the page width
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// A signature lying on a page: drag to move, corner handle to resize. Position and size are fractions of the page.
function PlacedSignature({ src, ratio, place, onChange }) {
  const drag = useRef(null)
  const begin = (mode) => (e) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { mode, cx: e.clientX, cy: e.clientY, x0: place.x, y0: place.y, w0: place.w }
  }
  const move = (e) => {
    const d = drag.current
    if (!d) return
    const r = e.currentTarget.closest('.preview-page-wrap').getBoundingClientRect()
    const dx = (e.clientX - d.cx) / r.width
    const dy = (e.clientY - d.cy) / r.height
    if (d.mode === 'move') {
      onChange({ ...place, x: clamp(d.x0 + dx, 0, 1 - place.w), y: clamp(d.y0 + dy, 0, 1 - place.h) })
    } else {
      const w = clamp(d.w0 + dx, 0.04, 1 - d.x0)
      const h = (w * ratio * r.width) / r.height
      if (d.y0 + h <= 1) onChange({ ...place, w, h })
    }
  }
  const end = () => (drag.current = null)
  return (
    <div
      className="placed-sig"
      style={{ left: `${place.x * 100}%`, top: `${place.y * 100}%`, width: `${place.w * 100}%`, height: `${place.h * 100}%` }}
      onPointerDown={begin('move')}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <img src={src} alt="" draggable={false} />
      <div className="handle" onPointerDown={begin('resize')} />
    </div>
  )
}

// `signing`: { src, busy, onApply(place), onCancel } while the reviewer signs. The signature follows the
// mouse; a click puts it on the page, where it can still be moved and resized before it is applied.
export default function PdfPreview({ data, delay = 500, signing = null }) {
  const { t } = useI18n()
  const [wraps, setWraps] = useState([])
  const [ratio, setRatio] = useState(0.3) // height / width of the signature image
  const [place, setPlace] = useState(null) // { page, x, y, w, h }
  const [hover, setHover] = useState(null)
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
    const wraps = canvases.map((c) => {
      c.classList.add('preview-page')
      const wrap = document.createElement('div')
      wrap.className = 'preview-page-wrap'
      wrap.appendChild(c)
      return wrap
    })
    el.replaceChildren(...wraps)
    el.scrollTop = top
    setWraps(wraps)
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

  useEffect(() => {
    setPlace(null)
    setHover(null)
    if (!signing?.src) return
    const img = new Image()
    img.onload = () => setRatio(img.naturalHeight / img.naturalWidth || 0.3)
    img.src = signing.src
  }, [signing?.src]) // eslint-disable-line react-hooks/exhaustive-deps

  const picking = Boolean(signing && !place)

  function put(e) {
    if (!picking) return
    const wrap = e.target.closest?.('.preview-page-wrap')
    const page = wraps.indexOf(wrap)
    if (page < 0) return
    const r = wrap.getBoundingClientRect()
    const w = DEFAULT_SIG_W
    const h = (w * ratio * r.width) / r.height
    setPlace({
      page: page + 1,
      x: clamp((e.clientX - r.left) / r.width - w / 2, 0, 1 - w),
      y: clamp((e.clientY - r.top) / r.height - h / 2, 0, 1 - h),
      w,
      h,
    })
    setHover(null)
  }

  const ghostW = (wraps[0]?.clientWidth ?? 400) * DEFAULT_SIG_W

  return (
    <div className={`preview ${signing ? 'signing' : ''}`}>
      {signing ? (
        <div className="sign-bar">
          <span>{place ? t('signPlaceHint2') : t('signPlaceHint')}</span>
          <button type="button" className="btn ghost" onClick={signing.onCancel}>
            {t('signCancel')}
          </button>
          <button type="button" className="btn primary" disabled={!place || signing.busy} onClick={() => signing.onApply(place)}>
            {signing.busy ? t('signing') : t('signApply')}
          </button>
        </div>
      ) : null}
      {busy ? <div className="preview-status">{t('previewLoading')}</div> : null}
      {failed ? <div className="preview-status error">{t('previewError')}</div> : null}
      <div
        className="preview-scroll"
        ref={scroller}
        onClick={put}
        onPointerMove={(e) => picking && setHover({ x: e.clientX, y: e.clientY })}
        onPointerLeave={() => setHover(null)}
      />
      {picking && hover ? (
        <img className="sign-ghost" src={signing.src} alt="" style={{ left: hover.x, top: hover.y, width: ghostW }} />
      ) : null}
      {signing && place && wraps[place.page - 1]
        ? createPortal(
            <PlacedSignature src={signing.src} ratio={ratio} place={place} onChange={setPlace} />,
            wraps[place.page - 1],
          )
        : null}
    </div>
  )
}
