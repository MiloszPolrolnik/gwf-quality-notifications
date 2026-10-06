import React, { useRef, useState } from 'react'
import { processSignature } from '../signature.js'
import { useI18n } from '../i18n.jsx'
import { api } from '../api.js'
import { ROLE_LABELS } from '../pdf/data.js'

export default function AuthPage({ onAuth }) {
  const { t } = useI18n()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', role: '' })
  const [signature, setSignature] = useState(null)
  const fileRef = useRef(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isLogin = mode === 'login'
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const errorText = (err) => {
    if (err.status === 429) return t('errTooMany')
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
        <h1>{isLogin ? t('loginTitle') : t('registerTitle')}</h1>
        {!isLogin && (
          <label>
            {t('fullName')}
            <input value={form.name} onChange={set('name')} autoComplete="name" required autoFocus />
          </label>
        )}
        <label>
          {t('email')}
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
            autoComplete="email"
            required
            autoFocus={isLogin}
          />
        </label>
        <label>
          {t('password')}
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            minLength={isLogin ? undefined : 8}
            required
          />
          {!isLogin && <small>{t('passwordHint')}</small>}
        </label>
        {!isLogin && (
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
        {!isLogin && (
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
          {busy ? t('authBusy') : isLogin ? t('login') : t('register')}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            setMode(isLogin ? 'register' : 'login')
            setError('')
          }}
        >
          {isLogin ? t('noAccount') : t('haveAccount')}
        </button>
      </form>
    </main>
  )
}
