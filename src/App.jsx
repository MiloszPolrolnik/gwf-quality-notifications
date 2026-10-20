import React, { useEffect, useState } from 'react'
import { I18nProvider, useI18n } from './i18n.jsx'
import LanguageSwitch from './components/LanguageSwitch.jsx'
import FormPage from './components/FormPage.jsx'
import ListPage, { KINDS } from './components/ListPage.jsx'
import AuthPage from './components/AuthPage.jsx'
import ProfileDialog from './components/ProfileDialog.jsx'
import { api, setUnauthorizedHandler } from './api.js'

const BASE = import.meta.env.BASE_URL

// Tiny hash router:
//   #/            landing      #/form        new notification
//   #/form/<id>   edit one     #/drafts      draft list      #/history   completed list
//   #/review      notifications sent to me for review
function parseRoute() {
  const h = location.hash.replace(/^#/, '')
  // ?for=<userId> comes from mail links: the form only opens for that account
  const m = h.match(/^\/form\/(\d+)(?:\?for=(\d+))?$/)
  if (m) return { name: 'form', id: Number(m[1]), forUser: m[2] ? Number(m[2]) : null }
  const r = h.match(/^\/reset\/([\w-]+)$/)
  if (r) return { name: 'reset', token: r[1] }
  if (h === '/form') return { name: 'form', id: null }
  if (h === '/drafts') return { name: 'drafts' }
  if (h === '/changes') return { name: 'changes' }
  if (h === '/history') return { name: 'history' }
  if (h === '/review') return { name: 'review' }
  return { name: 'landing' }
}

function Shell() {
  const { t } = useI18n()
  const [route, setRoute] = useState(parseRoute)
  // undefined = still checking the session, null = logged out
  const [user, setUser] = useState(undefined)
  const [profileOpen, setProfileOpen] = useState(false)
  const [wrongAccount, setWrongAccount] = useState(false)
  // a mail link meant for another account: sign out so the right one can log in
  const mismatch = Boolean(user && route.forUser && route.forUser !== user.id)
  useEffect(() => {
    if (!mismatch) return
    setWrongAccount(true)
    api.logout().catch(() => {})
    setUser(null)
  }, [mismatch])
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    api.me().then(setUser, () => setUser(null))
  }, [])
  // Number of documents per category, shown above the landing buttons.
  const [counts, setCounts] = useState({})
  const onLanding = Boolean(user) && route.name === 'landing'
  useEffect(() => {
    if (!onLanding) return
    let alive = true
    Object.entries(KINDS).forEach(([kind, { status, mine }]) => {
      api
        .list({ status, mine })
        .then((rows) => alive && setCounts((c) => ({ ...c, [kind]: rows.length })))
        .catch(() => {})
    })
    return () => {
      alive = false
    }
  }, [onLanding])
  useEffect(() => {
    const on = () => setRoute(parseRoute())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  useEffect(() => {
    document.title = t('appTitle')
  })
  const logout = async () => {
    await api.logout().catch(() => {})
    setUser(null)
    location.hash = '#/'
  }
  const go = (hash) => {
    location.hash = hash
  }

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/">
          <img src={`${BASE}gwf-logo.png`} alt="GWF" />
          <span>{t('appTitle')}</span>
        </a>
        <div className="topbar-right">
          {user && (
            <>
              <button type="button" className="btn ghost" onClick={() => setProfileOpen(true)}>
                {user.name}
              </button>
              <button type="button" className="btn ghost" onClick={logout}>
                {t('logout')}
              </button>
            </>
          )}
          <LanguageSwitch />
        </div>
      </header>
      {(user === null || (user !== undefined && route.name === 'reset')) && (
        <AuthPage
          onAuth={setUser}
          resetToken={route.name === 'reset' ? route.token : null}
          notice={wrongAccount && route.forUser ? t('wrongAccountLink') : ''}
          onResetDone={() => {
            setUser(null)
            location.hash = '#/'
          }}
        />
      )}
      {user && !mismatch && route.name === 'form' && (
        <FormPage
          key={route.id ?? 'new'}
          id={route.id}
          user={user}
          onBack={() => go('#/')}
          onDone={(status) => go(status === 'completed' ? '#/history' : '#/drafts')}
        />
      )}
      {user && route.name === 'drafts' && (
        <ListPage key="drafts" kind="drafts" onOpen={(id) => go(`#/form/${id}`)} onBack={() => go('#/')} />
      )}
      {user && route.name === 'changes' && (
        <ListPage key="changes" kind="changes" onOpen={(id) => go(`#/form/${id}`)} onBack={() => go('#/')} />
      )}
      {user && route.name === 'history' && (
        <ListPage key="history" kind="history" onOpen={(id) => go(`#/form/${id}`)} onBack={() => go('#/')} />
      )}
      {user && route.name === 'review' && (
        <ListPage key="review" kind="review" onOpen={(id) => go(`#/form/${id}`)} onBack={() => go('#/')} />
      )}
      {user && profileOpen && (
        <ProfileDialog
          user={user}
          onSaved={setUser}
          onClose={() => setProfileOpen(false)}
          onDeleted={() => {
            setProfileOpen(false)
            setUser(null)
            location.hash = '#/'
          }}
        />
      )}
      {user && route.name === 'landing' && (
        <main className="landing">
          <h1>{t('landingTitle')}</h1>
          <p className="sub">{t('landingSub')}</p>
          <div className="landing-actions">
            <button type="button" className="btn primary big" onClick={() => go('#/form')}>
              {t('fillOut')}
            </button>
            {[
              ['drafts', t('drafts')],
              ['history', t('history')],
              ['changes', t('changes')],
              ['review', t('review')],
            ].map(([kind, label]) => (
              <div className="landing-item" key={kind}>
                {counts[kind] !== undefined && (
                  <span className={`landing-count${counts[kind] === 0 ? ' zero' : ''}`}>{counts[kind]}</span>
                )}
                <button type="button" className="btn big" onClick={() => go(`#/${kind}`)}>
                  {label}
                </button>
              </div>
            ))}
          </div>
        </main>
      )}
    </div>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <Shell />
    </I18nProvider>
  )
}
