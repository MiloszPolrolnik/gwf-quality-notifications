import React, { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { api } from '../api.js'
import { ROLE_LABELS } from '../pdf/data.js'
import { processSignature } from '../signature.js'

export default function ProfileDialog({ user, onSaved, onClose }) {
  const { t } = useI18n()
  const [role, setRole] = useState(user.role ?? '')
  const [signature, setSignature] = useState(undefined) // undefined = unchanged, null = removed, string = new
  const [current, setCurrent] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (user.hasSignature) api.mySignature().then((r) => setCurrent(r.signature), () => {})
  }, [user.hasSignature])

  const shown = signature === undefined ? current : signature

  async function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setSignature(await processSignature(file))
      setMsg(null)
    } catch {
      setMsg({ kind: 'error', text: t('imageError') })
    }
  }

  async function save() {
    setBusy(true)
    setMsg(null)
    try {
      const updated = await api.saveProfile({ role: role || null, signature })
      onSaved(updated)
      setMsg({ kind: 'ok', text: t('profileSaved') })
      setSignature(undefined)
      if (updated.hasSignature) api.mySignature().then((r) => setCurrent(r.signature), () => {})
      else setCurrent(null)
    } catch {
      setMsg({ kind: 'error', text: t('profileError') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <h2>{t('profileTitle')}</h2>
        <p className="note" style={{ margin: 0 }}>
          {user.name} · {user.email}
        </p>
        <label>
          {t('signingRole')}
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">{t('noRole')}</option>
            {Object.entries(ROLE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div>
          <div className="field-label">{t('signatureImage')}</div>
          <p className="note">{t('signatureHelp')}</p>
          {shown && <img className="signature-preview" src={shown} alt="" />}
          <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: 8 }}>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={pick} />
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              {t('uploadSignature')}
            </button>
            {shown && (
              <button type="button" className="btn ghost" onClick={() => setSignature(null)}>
                {t('removeSignature')}
              </button>
            )}
          </div>
        </div>
        {msg && <p className={msg.kind === 'ok' ? 'note ok' : 'error'}>{msg.text}</p>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            {t('close')}
          </button>
          <button type="button" className="btn primary" disabled={busy} onClick={save}>
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  )
}
