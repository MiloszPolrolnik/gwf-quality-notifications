import React, { useEffect, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { KINDS } from './trackingKinds.js'

// Year picker of Quality Tracking: one tile per year, current year first, down to 2017.
export default function TrackingYears({ kind = 'qn', onOpen, onBack }) {
  const { t } = useI18n()
  const [years, setYears] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    KINDS[kind].api
      .years()
      .then(setYears)
      .catch(() => setError(t('trackingLoadError')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="list-page">
      <div className="form-head">
        <button type="button" className="btn ghost" onClick={onBack}>
          ← {t('back')}
        </button>
        <h1>{t(KINDS[kind].titleKey)}</h1>
      </div>
      {error && <p className="error">{error}</p>}
      {years && (
        <div className="tracking-years">
          {years.map((y) => (
            <button type="button" key={y.year} className={`btn tracking-year${y.total ? '' : ' empty'}`} onClick={() => onOpen(y.year)}>
              <span className="tracking-year-num">{y.year}</span>
              <span className="tracking-year-sub">
                {y.total
                  ? `${y.total} ${y.total === 1 ? t('trackingEntry') : t('trackingEntries')} · ${y.open} ${t('trackingOpen')}`
                  : t('trackingNone')}
              </span>
            </button>
          ))}
        </div>
      )}
    </main>
  )
}
