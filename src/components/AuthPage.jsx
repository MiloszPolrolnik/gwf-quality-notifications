import React, { useRef, useState } from 'react'
import { processSignature } from '../signature.js'
import { useI18n } from '../i18n.jsx'
import { api } from '../api.js'
import { ROLE_LABELS } from '../pdf/data.js'

export default function AuthPage({ onAuth, resetToken, onResetDone, notice }) {
  const { t } = useI18n()
  // login | register | forgot (ask for a link) | reset (set a new password via the mailed link)
  const [mode, setMode] = useState(resetToken ? 'reset' : 'login')
  const [info, setInfo] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '', role: '' })
  const [signature, setSignature] = useState(null)
  const fileRef = useRef(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isLogin = mode === 'login'
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const errorText = (err) => {
    if (err.status === 429) return t('errTooMany')
    if (err.code === 'bad_token') return t('errResetLink')
    if (err.status === 401) return t('errInvalidCredentials')
    if (err.status === 409) return t('errEmailTaken')
    if (err.field === 'email') return t('errInvalidEmail')
    if (err.field === 'password') return t('errPasswordShort')
    if (err.field === 'name') return t('errNameRequired')
    return t('errGeneric')
  }

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setSignature(await processSignature(file))
      setError('')
    } catch {
      setError(t('imageError'))
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'forgot') {
        await api.forgotPassword(form.email)
        setInfo(t('resetMailSent'))
        setBusy(false)
        return
      }
      if (mode === 'reset') {
        await api.resetPassword(resetToken, form.password)
        setBusy(false)
        setMode('login')
        setForm((f) => ({ ...f, password: '' }))
        setInfo(t('resetDone'))
        onResetDone?.()
        return
      }
      const user = isLogin
        ? await api.login(form.email, form.password)
        : await api.register(form.name, form.email, form.password, form.role, signature)
      onAuth(user)
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={submit}>
        <h1>
          {mode === 'forgot' ? t('forgotTitle') : mode === 'reset' ? t('resetTitle') : isLogin ? t('loginTitle') : t('registerTitle')}
        </h1>
        {mode === 'forgot' && <p className="note">{t('forgotHelp')}</p>}
        {notice && mode === 'login' && <p className="note">{notice}</p>}
        {info && <p className="note ok">{info}</p>}
        {mode === 'register' && (
          <label>
            {t('fullName')}
            <input value={form.name} onChange={set('name')} autoComplete="name" required autoFocus />
          </label>
        )}
        {mode !== 'reset' && (
          <label>
            {t('email')}
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              autoComplete="email"
              required
              autoFocus={isLogin || mode === 'forgot'}
            />
          </label>
        )}
        {isLogin && (
          <button
            type="button"
            className="btn ghost"
            style={{ alignSelf: 'flex-end', padding: '0 2px', margin: '0 0 -34px', fontSize: 14, lineHeight: '20px', height: 20, position: 'relative', top: -8, zIndex: 1 }}
            onClick={() => {
              setMode('forgot')
              setError('')
              setInfo('')
            }}
          >
            {t('forgotPassword')}
          </button>
        )}
        {mode !== 'forgot' && (
          <label>
            {mode === 'reset' ? t('newPassword') : t('password')}
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              minLength={isLogin ? undefined : 8}
              required
              autoFocus={mode === 'reset'}
            />
            {!isLogin && <small>{t('passwordHint')}</small>}
          </label>
        )}
        {mode === 'register' && (
          <label>
            {t('signingRole')}
            <select value={form.role} onChange={set('role')}>
              <option value="">{t('noRole')}</option>
              {Object.entries(ROLE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
        {mode === 'register' && (
          <div>
            <div className="field-label">{t('signatureImage')}</div>
            <p className="note">{t('signatureHelp')}</p>
            {signature && <img className="signature-preview" src={signature} alt="" />}
            <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: 8 }}>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={pick} />
              <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
                {t('uploadSignature')}
              </button>
              {signature && (
                <button type="button" className="btn ghost" onClick={() => setSignature(null)}>
                  {t('removeSignature')}
                </button>
              )}
            </div>
          </div>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn primary big" disabled={busy}>
          {busy
            ? t('authBusy')
            : mode === 'forgot'
              ? t('sendResetLink')
              : mode === 'reset'
                ? t('setNewPassword')
                : isLogin
                  ? t('login')
                  : t('register')}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            if (mode === 'reset') onResetDone?.()
            setMode(mode === 'login' ? 'register' : 'login')
            setError('')
            setInfo('')
          }}
        >
          {mode === 'login' ? t('noAccount') : mode === 'register' ? t('haveAccount') : t('backToLogin')}
        </button>
      </form>
    </main>
  )
}
