import React, { useEffect, useState } from 'react'
import { I18nProvider, useI18n } from './i18n.jsx'
import LanguageSwitch from './components/LanguageSwitch.jsx'
import FormPage from './components/FormPage.jsx'

const BASE = import.meta.env.BASE_URL

function Shell() {
  const { t } = useI18n()
  // Tiny hash router: "#/form" opens the form, anything else the landing page.
  const [route, setRoute] = useState(() => (location.hash === '#/form' ? 'form' : 'landing'))
  useEffect(() => {
    const on = () => setRoute(location.hash === '#/form' ? 'form' : 'landing')
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  useEffect(() => {
    document.title = t('appTitle')
  })
  const go = (r) => {
    location.hash = r === 'form' ? '#/form' : '#/'
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
      {route === 'form' ? (
        <FormPage onBack={() => go('landing')} />
      ) : (
        <main className="landing">
          <h1>{t('landingTitle')}</h1>
          <p className="sub">{t('landingSub')}</p>
          <p>{t('landingText')}</p>
          <button type="button" className="btn primary big" onClick={() => go('form')}>
            {t('fillOut')}
          </button>
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
