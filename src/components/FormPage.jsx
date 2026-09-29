import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { emptyData, formatDate, pdfFileName } from '../pdf/data.js'
import { AutoTextarea, Block, Check, TextField, Field, YesNoField } from './fields.jsx'
import ImagePicker from './ImagePicker.jsx'
import PdfPreview, { renderPdfBlob } from './PdfPreview.jsx'
import { api } from '../api.js'

const STORE = 'qn-form-v1'
const AUTOSAVE_DELAY = 2000

const fresh = () => ({ ...structuredClone(emptyData), date: formatDate() })

// Fills gaps in saved data so older records keep working when fields are added.
function normalize(saved, keepImages) {
  const base = fresh()
  return {
    ...base,
    ...saved,
    parts: { ...base.parts, ...saved.parts },
    process: { ...base.process, ...saved.process },
    corrective: { ...base.corrective, ...saved.corrective },
    images: keepImages && Array.isArray(saved.images) ? saved.images : [],
  }
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null')
    if (saved && typeof saved === 'object') return normalize(saved, false)
  } catch {
    /* ignore corrupt or unavailable storage */
  }
  return fresh()
}

// Fields required to complete a notification (must match server/index.js).
const REQUIRED = { date: 'date', partNo: 'partNo', partDesc: 'partDesc', applicant: 'applicant', department: 'department', problem: 's2' }

export default function FormPage({ id, onBack, onDone }) {
  const { t } = useI18n()
  // recordId: the saved notification being edited (null = new, not yet saved).
  const [recordId, setRecordId] = useState(id ?? null)
  const [status, setStatus] = useState(null) // 'draft' | 'completed' once known
  const [data, setData] = useState(() => (id ? fresh() : load()))
  const [loading, setLoading] = useState(Boolean(id))
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null) // { kind: 'ok' | 'error', text }
  const [showPreview, setShowPreview] = useState(false) // mobile only
  const [auto, setAuto] = useState(null) // { kind: 'saving' | 'saved' | 'error', time? }

  // Autosave bookkeeping lives in refs so unmount / pagehide handlers see current values.
  const dataRef = useRef(data)
  const idRef = useRef(recordId)
  const statusRef = useRef(null)
  const loadingRef = useRef(loading)
  const savedRef = useRef(JSON.stringify(fresh())) // JSON of the last state known to be on the server
  const chainRef = useRef(Promise.resolve()) // serialises saves so a pending POST is never duplicated
  const mountedRef = useRef(false)
  const beaconRef = useRef('')
  dataRef.current = data
  loadingRef.current = loading

  const clearStore = () => {
    try {
      localStorage.removeItem(STORE)
    } catch {
      /* ignore */
    }
  }
  const enqueue = (job) => {
    const p = chainRef.current.then(job)
    chainRef.current = p.catch(() => {})
    return p
  }
  // Called once a new record got its id: sync state and URL (only while this page is still shown).
  const adoptId = (newId) => {
    if (!mountedRef.current) return
    setRecordId(newId)
    history.replaceState(null, '', `#/form/${newId}`)
  }
  // Runs `write` in the save queue; returns the saved row.
  const persist = (target, json, write) =>
    enqueue(async () => {
      const wasNew = !idRef.current
      const row = await write(idRef.current)
      idRef.current = row.id
      savedRef.current = json
      statusRef.current = target
      clearStore()
      if (wasNew) adoptId(row.id)
      return row
    })

  // Saves unsaved changes as a draft. Never touches completed records or empty new forms.
  function autosave() {
    if (loadingRef.current || statusRef.current === 'completed') return Promise.resolve()
    const snapshot = dataRef.current
    const json = JSON.stringify(snapshot)
    if (json === savedRef.current) return Promise.resolve()
    if (!idRef.current && json === JSON.stringify(fresh())) return Promise.resolve()
    const safe = (v) => mountedRef.current && setAuto(v)
    safe({ kind: 'saving' })
    return persist('draft', json, (rid) => (rid ? api.update(rid, 'draft', snapshot) : api.create('draft', snapshot)))
      .then(() => safe({ kind: 'saved', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }))
      .catch(() => safe({ kind: 'error' }))
  }

  // Debounced autosave after the last change.
  useEffect(() => {
    if (loading) return
    const timer = setTimeout(autosave, AUTOSAVE_DELAY)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loading])

  // Save immediately when leaving the form (Back, hash navigation, browser back).
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      autosave()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Tab close / reload: warn about unsaved changes and send a keepalive save.
  useEffect(() => {
    const isDirty = () => {
      if (loadingRef.current) return false
      const json = JSON.stringify(dataRef.current)
      return json !== savedRef.current && (idRef.current || json !== JSON.stringify(fresh()))
    }
    const onBeforeUnload = (e) => {
      if (!isDirty()) return
      e.preventDefault()
      e.returnValue = ''
    }
    const onPageHide = () => {
      if (!isDirty() || statusRef.current === 'completed') return
      // keepalive requests are capped at ~64 KB: images are left out (the server keeps stored ones).
      const { images, ...rest } = dataRef.current // eslint-disable-line no-unused-vars
      const json = JSON.stringify(rest)
      if (json === beaconRef.current) return
      beaconRef.current = json
      const rid = idRef.current
      if (rid) api.updateKeepalive(rid, { ...rest, images: [] })
      else api.createKeepalive({ ...rest, images: [] })
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [])

  // Open an existing notification from the database.
  useEffect(() => {
    if (!id) return
    let cancelled = false
    api
      .get(id)
      .then((row) => {
        if (cancelled) return
        const loaded = normalize(row.data, true)
        savedRef.current = JSON.stringify(loaded)
        statusRef.current = row.status
        setData(loaded)
        setStatus(row.status)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError(t('loadError'))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Unsaved new forms are kept in localStorage so a page reload loses nothing
  // (images excluded on purpose: too large). Saved records live in the database.
  useEffect(() => {
    if (recordId || loading) return
    try {
      const { images, ...rest } = data // eslint-disable-line no-unused-vars
      localStorage.setItem(STORE, JSON.stringify(rest))
    } catch {
      /* quota / private mode */
    }
  }, [data, recordId, loading])

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

  // Saves as draft or completed. Completing validates the required fields.
  async function save(target) {
    setNotice(null)
    if (target === 'completed') {
      const missing = Object.keys(REQUIRED).filter((k) => !String(data[k] ?? '').trim())
      if (missing.length) {
        setNotice({ kind: 'error', text: `${t('missingFields')} ${missing.map((k) => t(REQUIRED[k])).join(', ')}` })
        return
      }
    }
    setSaving(true)
    try {
      const snapshot = data
      await persist(target, JSON.stringify(snapshot), (rid) =>
        rid ? api.update(rid, target, snapshot) : api.create(target, snapshot),
      )
      if (target === 'completed') {
        onDone('completed')
        return
      }
      setStatus('draft')
      setNotice({ kind: 'ok', text: t('draftSaved') })
    } catch (e) {
      setNotice({ kind: 'error', text: e.status === 422 ? t('missingFields') : t('saveError') })
    } finally {
      setSaving(false)
    }
  }

  // Back waits for the pending save so the drafts list already shows the result.
  async function goBack() {
    await autosave()
    await chainRef.current
    onBack()
  }

  // The preview only re-renders when the debounced value changes.
  const previewData = useMemo(() => data, [data])

  if (loading) return <p className="note" style={{ padding: 24 }}>{t('loading')}</p>
  if (loadError) {
    return (
      <p className="error" style={{ padding: 24 }}>
        {loadError}{' '}
        <button type="button" className="btn" onClick={onBack}>
          {t('back')}
        </button>
      </p>
    )
  }

  return (
    <div className={`form-page ${showPreview ? 'show-preview' : ''}`}>
      <div className="form-col">
        <div className="form-head">
          <button type="button" className="btn ghost" onClick={goBack}>
            ← {t('back')}
          </button>
          <h1>{recordId ? `${t('formTitle')} #${recordId}` : t('formTitle')}</h1>
        </div>

        <TextField label={t('docTitle')} hint={t('docTitleHint')} value={data.docTitle} onChange={set('docTitle')} />

        <Block n={1} title={t('s1')}>
          <div className="grid g5">
            <TextField label={t('date')} value={data.date} onChange={set('date')} placeholder="DD.MM.YYYY" />
            <TextField multiline label={t('partNo')} value={data.partNo} onChange={set('partNo')} />
            <TextField multiline label={t('partDesc')} value={data.partDesc} onChange={set('partDesc')} />
            <TextField multiline label={t('batchNo')} value={data.batchNo} onChange={set('batchNo')} />
            <TextField multiline label={t('batchQty')} value={data.batchQty} onChange={set('batchQty')} />
          </div>
          <TextField multiline label={t('qnNo')} value={data.qnNo} onChange={set('qnNo')} />
          <div className="grid g2">
            <TextField multiline label={t('applicant')} value={data.applicant} onChange={set('applicant')} />
            <TextField multiline label={t('department')} value={data.department} onChange={set('department')} />
          </div>
          <TextField multiline label={t('supplier')} value={data.supplier} onChange={set('supplier')} />
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
            <Check
              indent={1}
              label={t('otherDocs')}
              checked={p.otherDocs}
              onChange={setIn('parts', 'otherDocs')}
              text={p.otherDocsText}
              onText={setIn('parts', 'otherDocsText')}
              placeholder={t('specify')}
              below
            />
          </div>
          <Field label={t('details')}>
            <AutoTextarea value={p.details} onChange={setIn('parts', 'details')} minRows={3} />
          </Field>
        </Block>

        <Block n={5} title={t('s5')}>
          <div className="checks">
            <Check label={t('stop')} checked={pr.stop} onChange={setIn('process', 'stop')} />
            <Check label={t('concession')} checked={pr.concession} onChange={setIn('process', 'concession')} />
            <Check indent={1} label={t('risk')} checked={pr.risk} onChange={setIn('process', 'risk')} />
            <Check
              indent={1}
              label={t('otherDocs')}
              checked={pr.otherDocs}
              onChange={setIn('process', 'otherDocs')}
              text={pr.otherDocsText}
              onText={setIn('process', 'otherDocsText')}
              placeholder={t('specify')}
              below
            />
          </div>
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
            <Check
              indent={1}
              label={t('cpkSelected')}
              checked={c.cpkSelected}
              onChange={setIn('corrective', 'cpkSelected')}
              text={c.cpkText}
              onText={setIn('corrective', 'cpkText')}
              placeholder={t('specify')}
              below
            />
            <Check label={t('sample')} checked={c.sample} onChange={setIn('corrective', 'sample')} />
            <Check
              label={t('other')}
              checked={c.other}
              onChange={setIn('corrective', 'other')}
              text={c.otherText ?? ''}
              onText={setIn('corrective', 'otherText')}
              placeholder={t('specify')}
              below
            />
            <Check label={t('psw')} checked={c.psw} onChange={setIn('corrective', 'psw')} />
          </div>
        </Block>

        <Block n={7} title={t('s7')}>
          <YesNoField label={t('infoSales')} value={data.infoSales} onChange={set('infoSales')} yes={t('yes')} no={t('no')} />
          <YesNoField label={t('infoCustomer')} value={data.infoCustomer} onChange={set('infoCustomer')} yes={t('yes')} no={t('no')} />
        </Block>

        {auto && status !== 'completed' && (
          <p className={auto.kind === 'error' ? 'error' : 'note'} style={{ fontSize: 12, margin: '4px 0' }}>
            {auto.kind === 'saving' ? t('autoSaving') : auto.kind === 'saved' ? `${t('autoSaved')} ${auto.time}` : t('autoError')}
          </p>
        )}
        {notice && <p className={notice.kind === 'ok' ? 'note ok' : 'error'}>{notice.text}</p>}
        <div className="actions">
          {status !== 'completed' && (
            <button type="button" className="btn" onClick={() => save('draft')} disabled={saving}>
              {t('saveDraft')}
            </button>
          )}
          <button type="button" className="btn primary" onClick={() => save('completed')} disabled={saving}>
            {status === 'completed' ? t('saveChanges') : t('complete')}
          </button>
          <button type="button" className="btn" onClick={generate} disabled={busy}>
            {busy ? t('generating') : t('generate')}
          </button>
          {!recordId && (
            <button type="button" className="btn" onClick={reset}>
              {t('reset')}
            </button>
          )}
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
