import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { emptyData, formatDate, pdfFileName, signaturesFrom, ROLE_LABELS } from '../pdf/data.js'
import { Block, Check, TextField, RichField, YesNoField, ReviewContext, Locked } from './fields.jsx'
import RichEditor, { ImageStore } from './RichEditor.jsx'
import ImagePicker from './ImagePicker.jsx'
import PdfPreview, { renderPdfBlob } from './PdfPreview.jsx'
import { api } from '../api.js'
import { dropImages, imageIds, plainText } from '../richText.js'

const STORE = 'qn-form-v1'
const AUTOSAVE_DELAY = 2000

// Statuses in which the form is not autosaved (finished, or frozen for review).
const NO_AUTOSAVE = ['completed', 'submitted', 'signed']

const fresh = () => ({ ...structuredClone(emptyData), date: formatDate() })

// Applies fn to every string of the form data except the image maps.
function mapStrings(value, fn) {
  if (typeof value === 'string') return fn(value)
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === 'images' || k === 'fieldImages' ? v : mapStrings(v, fn)]))
  }
  return value
}

function usedImageIds(value, ids = new Set()) {
  mapStrings(value, (s) => (imageIds(s).forEach((id) => ids.add(id)), s))
  return ids
}

// Fills gaps in saved data so older records keep working when fields are added.
function normalize(saved, keepImages) {
  const base = fresh()
  const merged = {
    ...base,
    ...saved,
    parts: { ...base.parts, ...saved.parts },
    process: { ...base.process, ...saved.process },
    corrective: { ...base.corrective, ...saved.corrective },
    images: keepImages && Array.isArray(saved.images) ? saved.images : [],
  }
  // Inline images: keep only those still used in a text; texts lose tokens of missing images.
  const stored = keepImages && saved.fieldImages && typeof saved.fieldImages === 'object' ? saved.fieldImages : {}
  const used = usedImageIds(merged)
  const fieldImages = Object.fromEntries(Object.entries(stored).filter(([id]) => used.has(id)))
  const keep = new Set(Object.keys(fieldImages))
  return { ...mapStrings(merged, (s) => dropImages(s, keep)), images: merged.images, fieldImages }
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

export default function FormPage({ id, user, onBack, onDone }) {
  const { t } = useI18n()
  // recordId: the saved notification being edited (null = new, not yet saved).
  const [recordId, setRecordId] = useState(id ?? null)
  const [status, setStatus] = useState(null) // draft | completed | submitted | changes_requested | signed, once known
  // review workflow data of the loaded record
  const [meta, setMeta] = useState({ authorId: null, approvals: [], comments: [] })
  const [picker, setPicker] = useState(null) // null = closed, else { reviewers, picked, busy, error }
  const [flowBusy, setFlowBusy] = useState(false)
  const [signing, setSigning] = useState(null) // { src } while the reviewer places the signature
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
    if (loadingRef.current || NO_AUTOSAVE.includes(statusRef.current)) return Promise.resolve()
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
      if (!isDirty() || NO_AUTOSAVE.includes(statusRef.current)) return
      // keepalive requests are capped at ~64 KB: images are left out (the server keeps stored ones).
      const { images, fieldImages, ...rest } = dataRef.current // eslint-disable-line no-unused-vars
      const json = JSON.stringify(rest)
      if (json === beaconRef.current) return
      beaconRef.current = json
      const rid = idRef.current
      if (rid) api.updateKeepalive(rid, { ...rest, images: [], fieldImages: {} })
      else api.createKeepalive({ ...rest, images: [], fieldImages: {} })
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
        applyRow(row)
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
      const { images, fieldImages, ...rest } = data // eslint-disable-line no-unused-vars
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
  const imageStore = useMemo(
    () => ({
      images: data.fieldImages,
      add: (img) =>
        setData((d) => ({ ...d, fieldImages: { ...d.fieldImages, [img.id]: { src: img.src, width: img.width, height: img.height } } })),
      update: (id, patch) =>
        setData((d) => (d.fieldImages[id] ? { ...d, fieldImages: { ...d.fieldImages, [id]: { ...d.fieldImages[id], ...patch } } } : d)),
    }),
    [data.fieldImages],
  )

  // Takes over workflow state (status, approvals, notes) of a server response.
  function applyRow(row) {
    statusRef.current = row.status
    setStatus(row.status)
    setMeta({ authorId: row.authorId ?? null, approvals: row.approvals ?? [], comments: row.comments ?? [] })
  }

  // Records created before accounts existed have no author: everybody counts as author.
  const isAuthor = !meta.authorId || meta.authorId === user.id
  const myApproval = meta.approvals.find((a) => a.userId === user.id)
  const frozen = status === 'submitted' || status === 'signed'
  const readOnly = frozen || !isAuthor
  const underReview = status === 'submitted' || status === 'changes_requested'
  const canNote = Boolean(recordId && myApproval && underReview)
  const openNotes = meta.comments.filter((c) => !c.resolved).length

  const review = useMemo(
    () => ({
      readOnly,
      userId: user.id,
      notes: meta.comments,
      onAdd: canNote ? async (fieldKey, text) => applyRow(await api.addNote(recordId, fieldKey, text)) : null,
      onDelete: canNote ? async (noteId) => applyRow(await api.deleteNote(recordId, noteId)) : null,
      onResolve:
        isAuthor && status === 'changes_requested'
          ? async (noteId, resolved) => applyRow(await api.resolveNote(recordId, noteId, resolved))
          : null,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [readOnly, meta, canNote, isAuthor, status, recordId],
  )

  // Saves what is on screen so the server sends the same content to the reviewers.
  async function flushForSend() {
    if (status === 'completed') {
      const missing = Object.keys(REQUIRED).filter((k) => !plainText(data[k]).trim())
      if (missing.length) throw new Error(`${t('missingFields')} ${missing.map((k) => t(REQUIRED[k])).join(', ')}`)
      const snapshot = data
      await persist('completed', JSON.stringify(snapshot), (rid) => api.update(rid, 'completed', snapshot))
    } else {
      await autosave()
      await chainRef.current
    }
  }

  async function openPicker() {
    setNotice(null)
    if (status === 'changes_requested' && openNotes) {
      setNotice({ kind: 'error', text: t('resolveFirst') })
      return
    }
    try {
      const reviewers = await api.reviewers()
      setPicker({ reviewers, picked: new Set(meta.approvals.map((a) => a.userId)), busy: false, error: '' })
    } catch {
      setNotice({ kind: 'error', text: t('sendError') })
    }
  }

  async function sendToReview() {
    if (!picker.picked.size) return setPicker({ ...picker, error: t('chooseAtLeastOne') })
    setPicker({ ...picker, busy: true, error: '' })
    try {
      await flushForSend()
      applyRow(await api.submit(recordId, [...picker.picked]))
      setPicker(null)
      setNotice({ kind: 'ok', text: t('sentOk') })
    } catch (e) {
      setPicker((p) => ({ ...p, busy: false, error: e.status ? (e.code === 'open_comments' ? t('resolveFirst') : t('sendError')) : e.message }))
    }
  }

  async function startSigning() {
    setNotice(null)
    try {
      const r = await api.mySignature()
      if (!r.signature || !myApproval?.role) throw Object.assign(new Error('no signature'), { code: 'no_signature' })
      setSigning({ src: r.signature })
      setShowPreview(true)
    } catch (e) {
      setNotice({ kind: 'error', text: e.code === 'no_signature' ? t('signNoSignature') : t('signError') })
    }
  }

  async function signNow(place) {
    setFlowBusy(true)
    setNotice(null)
    try {
      applyRow(await api.sign(recordId, place))
      setSigning(null)
    } catch (e) {
      const text = e.code === 'no_signature' ? t('signNoSignature') : e.code === 'open_comments' ? t('signBlockedNotes') : t('signError')
      setNotice({ kind: 'error', text })
    } finally {
      setFlowBusy(false)
    }
  }

  async function generate() {
    setBusy(true)
    try {
      const blob = await renderPdfBlob(previewData)
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
      const missing = Object.keys(REQUIRED).filter((k) => !plainText(data[k]).trim())
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
  const previewData = useMemo(() => ({ ...data, signatures: signaturesFrom(meta.approvals) }), [data, meta.approvals])

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
    <ImageStore.Provider value={imageStore}>
    <ReviewContext.Provider value={review}>
    <div className={`form-page ${showPreview ? 'show-preview' : ''}`}>
      <div className="form-col">
        <div className="form-head">
          <button type="button" className="btn ghost" onClick={goBack}>
            ← {t('back')}
          </button>
          <h1>{recordId ? `${t('formTitle')} #${recordId}` : t('formTitle')}</h1>
        </div>

        {recordId && status && (
          <div className="review-banner">
            <span className={`status-badge s-${status}`}>{t(`status_${status}`)}</span>{' '}
            {frozen && t('lockedHint')}
            {status === 'changes_requested' && isAuthor && t('changesHint')}
            {!isAuthor && !frozen && t('notReviewerHint')}
            {myApproval && underReview && ' ' + t('signHint')}
          </div>
        )}

        <Locked>
          <TextField plain label={t('docTitle')} hint={t('docTitleHint')} value={data.docTitle} onChange={set('docTitle')} />
        </Locked>

        <Block n={1} title={t('s1')}>
          <div className="grid g5">
            <TextField plain label={t('date')} value={data.date} onChange={set('date')} placeholder="DD.MM.YYYY" />
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
          <RichEditor value={data.problem} onChange={set('problem')} minRows={5} allowImages toolbar="always" />
          <ImagePicker images={data.images} onChange={set('images')} />
        </Block>

        <Block n={3} title={t('s3')}>
          <RichEditor value={data.rootCause} onChange={set('rootCause')} minRows={5} allowImages toolbar="always" />
        </Block>

        <Block n={4} title={t('s4')}>
          <div className="checks cols">
            <Check label={t('scrap')} checked={p.scrap} onChange={setIn('parts', 'scrap')} />
            <Check col={2} label={t('rework')} checked={p.rework} onChange={setIn('parts', 'rework')} />
            <Check label={t('sorting')} checked={p.sorting} onChange={setIn('parts', 'sorting')} />
            <Check col={2} label={t('useAsIs')} checked={p.useAsIs} onChange={setIn('parts', 'useAsIs')} />
            <Check col={2} indent={1} label={t('risk')} checked={p.risk} onChange={setIn('parts', 'risk')} />
            <Check
              col={2}
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
          <RichField label={t('details')} value={p.details} onChange={setIn('parts', 'details')} minRows={3} allowImages />
        </Block>

        <Block n={5} title={t('s5')}>
          <div className="checks cols">
            <Check label={t('stop')} checked={pr.stop} onChange={setIn('process', 'stop')} />
            <Check col={2} label={t('concession')} checked={pr.concession} onChange={setIn('process', 'concession')} />
            <Check col={2} indent={1} label={t('risk')} checked={pr.risk} onChange={setIn('process', 'risk')} />
            <Check
              col={2}
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
          <RichField label={t('details')} value={pr.details} onChange={setIn('process', 'details')} minRows={3} allowImages />
          <div className="field-label">{t('ifConcession')}</div>
          <div className="grid g2">
            <TextField label={t('until')} value={pr.until} onChange={setIn('process', 'until')} />
            <TextField label={t('quantity')} value={pr.quantity} onChange={setIn('process', 'quantity')} />
          </div>
        </Block>

        <Block n={6} title={t('s6')}>
          <div className="checks cols">
            <Check label={t('toolRepair')} checked={c.toolRepair} onChange={setIn('corrective', 'toolRepair')} />
            <Check col={2} label={t('dfm')} checked={c.dfm} onChange={setIn('corrective', 'dfm')} />
            <Check col={2} label={t('fai')} checked={c.fai} onChange={setIn('corrective', 'fai')} />
            <Check col={2} label={t('cpk')} checked={c.cpk} onChange={setIn('corrective', 'cpk')} />
            <Check col={2} indent={1} label={t('cpkAll')} checked={c.cpkAll} onChange={setIn('corrective', 'cpkAll')} />
            <Check
              col={2}
              indent={1}
              label={t('cpkSelected')}
              checked={c.cpkSelected}
              onChange={setIn('corrective', 'cpkSelected')}
              text={c.cpkText}
              onText={setIn('corrective', 'cpkText')}
              placeholder={t('specify')}
              below
            />
            <Check col={2} label={t('sample')} checked={c.sample} onChange={setIn('corrective', 'sample')} />
            <Check
              wide
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

        {meta.approvals.length > 0 && (
          <div className="review-panel">
            <h3>{t('reviewersStatus')}</h3>
            <ul>
              {meta.approvals.map((a) => (
                <li key={a.userId}>
                  {a.signedAt ? '✓' : '○'} <b>{a.name}</b> ({ROLE_LABELS[a.role] ?? '–'}) –{' '}
                  {a.signedAt
                    ? `${t('signedOn')} ${formatDate(new Date(a.signedAt))}`
                    : t('pendingSign')}
                </li>
              ))}
            </ul>
          </div>
        )}

        {auto && !NO_AUTOSAVE.includes(status) && !readOnly && (
          <p className={auto.kind === 'error' ? 'error' : 'note'} style={{ fontSize: 12, margin: '4px 0' }}>
            {auto.kind === 'saving' ? t('autoSaving') : auto.kind === 'saved' ? `${t('autoSaved')} ${auto.time}` : t('autoError')}
          </p>
        )}
        {notice && <p className={notice.kind === 'ok' ? 'note ok' : 'error'}>{notice.text}</p>}
        <div className="actions">
          {!readOnly && (status === null || status === 'draft') && (
            <button type="button" className="btn" onClick={() => save('draft')} disabled={saving}>
              {t('saveDraft')}
            </button>
          )}
          {!readOnly && status !== 'changes_requested' && (
            <button type="button" className={status === 'completed' ? 'btn' : 'btn primary'} onClick={() => save('completed')} disabled={saving}>
              {status === 'completed' ? t('saveChanges') : t('complete')}
            </button>
          )}
          {isAuthor && recordId && (status === 'completed' || status === 'changes_requested') && (
            <button type="button" className="btn primary" onClick={openPicker} disabled={saving}>
              {status === 'completed' ? t('sendToReview') : t('sendAgain')}
            </button>
          )}
          {myApproval && (status === 'submitted' || status === 'signed') && !myApproval.signedAt && (
            <button type="button" className="btn primary" onClick={startSigning} disabled={flowBusy || Boolean(signing)}>
              {t('sign')}
            </button>
          )}
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
        <PdfPreview
          data={previewData}
          signing={signing && { src: signing.src, busy: flowBusy, onApply: signNow, onCancel: () => setSigning(null) }}
        />
      </div>

      <button type="button" className="btn primary preview-toggle" onClick={() => setShowPreview((v) => !v)}>
        {showPreview ? t('hidePreview') : t('preview')}
      </button>
      {picker && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !picker.busy && setPicker(null)}>
          <div className="modal" role="dialog" aria-modal="true">
            <h2>{t('chooseReviewers')}</h2>
            {picker.reviewers.length === 0 && <p className="note">{t('noReviewers')}</p>}
            <div className="reviewer-list">
              {picker.reviewers.map((r) => (
                <label key={r.id} className="check">
                  <input
                    type="checkbox"
                    checked={picker.picked.has(r.id)}
                    onChange={(e) => {
                      const picked = new Set(picker.picked)
                      if (e.target.checked) picked.add(r.id)
                      else picked.delete(r.id)
                      setPicker({ ...picker, picked, error: '' })
                    }}
                  />
                  <span>
                    {r.name} <span className="note">({ROLE_LABELS[r.role] ?? r.role})</span>
                  </span>
                </label>
              ))}
            </div>
            {picker.error && <p className="error">{picker.error}</p>}
            <div className="modal-actions">
              <button type="button" className="btn" disabled={picker.busy} onClick={() => setPicker(null)}>
                {t('cancel')}
              </button>
              <button type="button" className="btn primary" disabled={picker.busy || !picker.reviewers.length} onClick={sendToReview}>
                {picker.busy ? t('sending') : t('send')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ReviewContext.Provider>
    </ImageStore.Provider>
  )
}
