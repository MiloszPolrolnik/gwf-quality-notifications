import React, { useEffect, useState } from 'react'
import { I18nProvider, useI18n } from './i18n.jsx'
import LanguageSwitch from './components/LanguageSwitch.jsx'
import FormPage from './components/FormPage.jsx'
import ListPage from './components/ListPage.jsx'

const BASE = import.meta.env.BASE_URL

// Tiny hash router:
//   #/            landing      #/form        new notification
//   #/form/<id>   edit one     #/drafts      draft list      #/history   completed list
function parseRoute() {
  const h = location.hash.replace(/^#/, '')
  const m = h.match(/^\/form\/(\d+)$/)
  if (m) return { name: 'form', id: Number(m[1]) }
  if (h === '/form') return { name: 'form', id: null }
  if (h === '/drafts') return { name: 'drafts' }
  if (h === '/history') return { name: 'history' }
  return { name: 'landing' }
}

function Shell() {
  const { t } = useI18n()
  const [route, setRoute] = useState(parseRoute)
  useEffect(() => {
    const on = () => setRoute(parseRoute())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  useEffect(() => {
    document.title = t('appTitle')
  })
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
        <LanguageSwitch />
      </header>
      {route.name === 'form' && (
        <FormPage
          key={route.id ?? 'new'}
          id={route.id}
          onBack={() => go('#/')}
          onDone={(status) => go(status === 'completed' ? '#/history' : '#/drafts')}
        />
      )}
      {route.name === 'drafts' && (
        <ListPage key="drafts" status="draft" onOpen={(id) => go(`#/form/${id}`)} onBack={() => go('#/')} />
      )}
      {route.name === 'history' && (
        <ListPage key="history" status="completed" onOpen={(id) => go(`#/form/${id}`)} onBack={() => go('#/')} />
      )}
      {route.name === 'landing' && (
        <main className="landing">
          <h1>{t('landingTitle')}</h1>
          <p className="sub">{t('landingSub')}</p>
          <p>{t('landingText')}</p>
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
