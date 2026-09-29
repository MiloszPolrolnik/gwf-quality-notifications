import React, { useCallback, useEffect, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { api } from '../api.js'
import { pdfFileName } from '../pdf/data.js'
import { renderPdfBlob } from './PdfPreview.jsx'

function fmt(iso, lang) {
  if (!iso) return '–'
  return new Date(iso).toLocaleString(lang === 'de' ? 'de-CH' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

// Lists drafts (status "draft") or the history (status "completed").
export default function ListPage({ status, onOpen, onBack }) {
  const { t, lang } = useI18n()
  const isDraft = status === 'draft'
  const [rows, setRows] = useState(null)
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    setError('')
    api
      .list({ status, q })
      .then(setRows)
      .catch(() => setError(t('loadError')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q])

  // Debounce the search box.
  useEffect(() => {
    const id = setTimeout(load, 200)
    return () => clearTimeout(id)
  }, [load])

  async function remove(row) {
    if (!window.confirm(t('deleteConfirm'))) return
    try {
      await api.remove(row.id)
      load()
    } catch {
      setError(t('deleteError'))
    }
  }

  async function download(row) {
    setBusyId(row.id)
    try {
      const full = await api.get(row.id)
      const blob = await renderPdfBlob(full.data)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = pdfFileName(full.data)
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch {
      setError(t('loadError'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="list-page">
      <div className="form-head">
        <button type="button" className="btn ghost" onClick={onBack}>
          ← {t('back')}
        </button>
        <h1>{isDraft ? t('draftsTitle') : t('historyTitle')}</h1>
      </div>

      <input
        className="list-search"
        type="search"
        placeholder={t('search')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {error && <p className="error">{error}</p>}

      {rows && rows.length === 0 && <p className="note">{isDraft ? t('noDrafts') : t('noHistory')}</p>}

      {rows && rows.length > 0 && (
        <div className="table-wrap">
          <table className="list-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('partNo')}</th>
                <th>{t('partDesc')}</th>
                <th>{t('applicant')}</th>
                <th>{isDraft ? t('lastSaved') : t('completedOn')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.partNo || '–'}</td>
                  <td>{r.partDesc || '–'}</td>
                  <td>{r.applicant || '–'}</td>
                  <td>{fmt(isDraft ? r.updatedAt : r.completedAt, lang)}</td>
                  <td className="row-actions">
                    <button type="button" className="btn primary" onClick={() => onOpen(r.id)}>
                      {isDraft ? t('continueEditing') : t('edit')}
                    </button>
                    {!isDraft && (
                      <button type="button" className="btn" disabled={busyId === r.id} onClick={() => download(r)}>
                        {busyId === r.id ? t('generating') : 'PDF'}
                      </button>
                    )}
                    {isDraft && (
                      <button type="button" className="btn" onClick={() => remove(r)}>
                        {t('delete')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
