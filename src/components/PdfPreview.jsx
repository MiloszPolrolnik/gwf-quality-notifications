import React, { useEffect, useRef, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import QualityNotificationPdf from '../pdf/QualityNotificationPdf.jsx'
import { registerFonts } from '../pdf/fonts.js'
import { useI18n } from '../i18n.jsx'

const BASE = import.meta.env.BASE_URL
registerFonts(`${BASE}fonts`)
export const LOGO_SRC = `${BASE}gwf-logo.png`

export async function renderPdfBlob(data) {
  return pdf(<QualityNotificationPdf data={data} logoSrc={LOGO_SRC} />).toBlob()
}

// Live preview: the very same document component as the download, debounced.
export default function PdfPreview({ data, delay = 500 }) {
  const { t } = useI18n()
  const [url, setUrl] = useState(null)
  const [busy, setBusy] = useState(true)
  const [failed, setFailed] = useState(false)
  const run = useRef(0)

  useEffect(() => {
    const id = ++run.current
    setBusy(true)
    const timer = setTimeout(async () => {
      try {
        const blob = await renderPdfBlob(data)
        if (id !== run.current) return
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old)
          return URL.createObjectURL(blob)
        })
        setFailed(false)
      } catch (e) {
        console.error(e)
        if (id === run.current) setFailed(true)
      } finally {
        if (id === run.current) setBusy(false)
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [data, delay])

  useEffect(() => () => url && URL.revokeObjectURL(url), []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="preview">
      {busy ? <div className="preview-status">{t('previewLoading')}</div> : null}
      {failed ? <div className="preview-status error">{t('previewError')}</div> : null}
      {url ? <iframe title="PDF preview" src={`${url}#toolbar=0&navpanes=0&view=FitH`} /> : null}
    </div>
  )
}
