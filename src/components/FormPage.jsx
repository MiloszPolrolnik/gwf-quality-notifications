import React, { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { emptyData, formatDate, pdfFileName } from '../pdf/data.js'
import { AutoTextarea, Block, Check, TextField, Field, YesNoField } from './fields.jsx'
import ImagePicker from './ImagePicker.jsx'
import PdfPreview, { renderPdfBlob } from './PdfPreview.jsx'

const STORE = 'qn-form-v1'

const fresh = () => ({ ...structuredClone(emptyData), date: formatDate() })

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null')
    if (saved && typeof saved === 'object') {
      const base = fresh()
      return {
        ...base,
        ...saved,
        parts: { ...base.parts, ...saved.parts },
        process: { ...base.process, ...saved.process },
        corrective: { ...base.corrective, ...saved.corrective },
        images: [],
      }
    }
  } catch {
    /* ignore corrupt or unavailable storage */
  }
  return fresh()
}

export default function FormPage({ onBack }) {
  const { t } = useI18n()
  const [data, setData] = useState(load)
  const [busy, setBusy] = useState(false)
  const [showPreview, setShowPreview] = useState(false) // mobile only

  // Autosave text fields (images are excluded on purpose: too large).
  useEffect(() => {
    try {
      const { images, ...rest } = data // eslint-disable-line no-unused-vars
      localStorage.setItem(STORE, JSON.stringify(rest))
    } catch {
      /* quota / private mode */
    }
  }, [data])

  const set = (key) => (value) => setData((d) => ({ ...d, [key]: value }))
  const setIn = (group, key) => (value) => setData((d) => ({ ...d, [group]: { ...d[group], [key]: value } }))
  const p = data.parts
  const pr = data.process
  const c = data.corrective

  async function generate() {
    setBusy(true)
    try {
      const blob = await renderPdfBlob(data)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = pdfFileName(data)
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    if (!window.confirm(t('resetConfirm'))) return
    try {
      localStorage.removeItem(STORE)
    } catch {
      /* ignore */
    }
    setData(fresh())
  }

  // The preview only re-renders when the debounced value changes.
  const previewData = useMemo(() => data, [data])

  return (
    <div className={`form-page ${showPreview ? 'show-preview' : ''}`}>
      <div className="form-col">
        <div className="form-head">
          <button type="button" className="btn ghost" onClick={onBack}>
            ← {t('back')}
          </button>
          <h1>{t('formTitle')}</h1>
        </div>

        <TextField label={t('docTitle')} hint={t('docTitleHint')} value={data.docTitle} onChange={set('docTitle')} />

        <Block n={1} title={t('s1')}>
          <div className="grid g3">
            <TextField label={t('date')} value={data.date} onChange={set('date')} placeholder="DD.MM.YYYY" />
            <TextField label={t('partNo')} value={data.partNo} onChange={set('partNo')} />
            <TextField label={t('batchNo')} value={data.batchNo} onChange={set('batchNo')} />
          </div>
          <div className="grid g2">
            <TextField label={t('partDesc')} value={data.partDesc} onChange={set('partDesc')} />
            <TextField label={t('batchQty')} value={data.batchQty} onChange={set('batchQty')} />
          </div>
          <div className="grid g2">
            <TextField label={t('applicant')} value={data.applicant} onChange={set('applicant')} />
            <TextField label={t('department')} value={data.department} onChange={set('department')} />
          </div>
          <TextField label={t('supplier')} value={data.supplier} onChange={set('supplier')} />
          <p className="note">{t('qnNote')}</p>
        </Block>

        <Block n={2} title={t('s2')}>
          <AutoTextarea value={data.problem} onChange={set('problem')} minRows={5} />
          <ImagePicker images={data.images} onChange={set('images')} />
        </Block>

        <Block n={3} title={t('s3')}>
          <AutoTextarea value={data.rootCause} onChange={set('rootCause')} minRows={5} />
        </Block>

        <Block n={4} title={t('s4')}>
          <div className="checks">
            <Check label={t('scrap')} checked={p.scrap} onChange={setIn('parts', 'scrap')} />
            <Check label={t('rework')} checked={p.rework} onChange={setIn('parts', 'rework')} />
            <Check label={t('sorting')} checked={p.sorting} onChange={setIn('parts', 'sorting')} />
            <Check label={t('useAsIs')} checked={p.useAsIs} onChange={setIn('parts', 'useAsIs')} />
            <Check indent={1} label={t('risk')} checked={p.risk} onChange={setIn('parts', 'risk')} />
            <Check indent={1} label={t('otherDocs')} checked={p.otherDocs} onChange={setIn('parts', 'otherDocs')} />
          </div>
          <TextField label={t('otherDocsText')} maxLength={60} value={p.otherDocsText} onChange={setIn('parts', 'otherDocsText')} />
          <Field label={t('details')}>
            <AutoTextarea value={p.details} onChange={setIn('parts', 'details')} minRows={3} />
          </Field>
        </Block>

        <Block n={5} title={t('s5')}>
          <div className="checks">
            <Check label={t('stop')} checked={pr.stop} onChange={setIn('process', 'stop')} />
            <Check label={t('concession')} checked={pr.concession} onChange={setIn('process', 'concession')} />
            <Check indent={1} label={t('risk')} checked={pr.risk} onChange={setIn('process', 'risk')} />
            <Check indent={1} label={t('otherDocs')} checked={pr.otherDocs} onChange={setIn('process', 'otherDocs')} />
          </div>
          <TextField label={t('otherDocsText')} maxLength={60} value={pr.otherDocsText} onChange={setIn('process', 'otherDocsText')} />
          <Field label={t('details')}>
            <AutoTextarea value={pr.details} onChange={setIn('process', 'details')} minRows={3} />
          </Field>
          <div className="field-label">{t('ifConcession')}</div>
          <div className="grid g2">
            <TextField label={t('until')} value={pr.until} onChange={setIn('process', 'until')} />
            <TextField label={t('quantity')} value={pr.quantity} onChange={setIn('process', 'quantity')} />
          </div>
        </Block>

        <Block n={6} title={t('s6')}>
          <div className="checks">
            <Check label={t('toolRepair')} checked={c.toolRepair} onChange={setIn('corrective', 'toolRepair')} />
            <Check label={t('dfm')} checked={c.dfm} onChange={setIn('corrective', 'dfm')} />
            <Check label={t('fai')} checked={c.fai} onChange={setIn('corrective', 'fai')} />
            <Check label={t('cpk')} checked={c.cpk} onChange={setIn('corrective', 'cpk')} />
            <Check indent={1} label={t('cpkAll')} checked={c.cpkAll} onChange={setIn('corrective', 'cpkAll')} />
            <Check indent={1} label={t('cpkSelected')} checked={c.cpkSelected} onChange={setIn('corrective', 'cpkSelected')} />
            <Check label={t('sample')} checked={c.sample} onChange={setIn('corrective', 'sample')} />
            <Check label={t('other')} checked={c.other} onChange={setIn('corrective', 'other')} />
            <Check label={t('psw')} checked={c.psw} onChange={setIn('corrective', 'psw')} />
          </div>
          <TextField label={t('cpkSelected') + ' (…)'} maxLength={60} value={c.cpkText} onChange={setIn('corrective', 'cpkText')} />
          <Field label={t('details')}>
            <AutoTextarea value={c.details} onChange={setIn('corrective', 'details')} minRows={3} />
          </Field>
        </Block>

        <Block n={7} title={t('s7')}>
          <YesNoField label={t('infoSales')} value={data.infoSales} onChange={set('infoSales')} yes={t('yes')} no={t('no')} />
          <YesNoField label={t('infoCustomer')} value={data.infoCustomer} onChange={set('infoCustomer')} yes={t('yes')} no={t('no')} />
        </Block>

        <div className="actions">
          <button type="button" className="btn primary" onClick={generate} disabled={busy}>
            {busy ? t('generating') : t('generate')}
          </button>
          <button type="button" className="btn" onClick={reset}>
            {t('reset')}
          </button>
        </div>
      </div>

      <div className="preview-col">
        <PdfPreview data={previewData} />
      </div>

      <button type="button" className="btn primary preview-toggle" onClick={() => setShowPreview((v) => !v)}>
        {showPreview ? t('hidePreview') : t('preview')}
      </button>
    </div>
  )
}
