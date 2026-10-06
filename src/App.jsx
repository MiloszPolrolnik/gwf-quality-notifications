import React, { useEffect, useState } from 'react'
import { I18nProvider, useI18n } from './i18n.jsx'
import LanguageSwitch from './components/LanguageSwitch.jsx'
import FormPage from './components/FormPage.jsx'
import ListPage from './components/ListPage.jsx'
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
  const m = h.match(/^\/form\/(\d+)$/)
  if (m) return { name: 'form', id: Number(m[1]) }
  if (h === '/form') return { name: 'form', id: null }
  if (h === '/drafts') return { name: 'drafts' }
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
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    api.me().then(setUser, () => setUser(null))
  }, [])
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
      {user === null && <AuthPage onAuth={setUser} />}
      {user && route.name === 'form' && (
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
      {user && route.name === 'history' && (
        <ListPage key="history" kind="history" onOpen={(id) => go(`#/form/${id}`)} onBack={() => go('#/')} />
      )}
      {user && route.name === 'review' && (
        <ListPage key="review" kind="review" onOpen={(id) => go(`#/form/${id}`)} onBack={() => go('#/')} />
      )}
      {user && profileOpen && <ProfileDialog user={user} onSaved={setUser} onClose={() => setProfileOpen(false)} />}
      {user && route.name === 'landing' && (
        <main className="landing">
          <h1>{t('landingTitle')}</h1>
          <p className="sub">{t('landingSub')}</p>
          <div className="landing-actions">
            <button type="button" className="btn primary big" onClick={() => go('#/form')}>
              {t('fillOut')}
            </button>
            <button type="button" className="btn big" onClick={() => go('#/drafts')}>
              {t('drafts')}
            </button>
            <button type="button" className="btn big" onClick={() => go('#/history')}>
              {t('history')}
            </button>
            <button type="button" className="btn big" onClick={() => go('#/review')}>
              {t('review')}
            </button>
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
