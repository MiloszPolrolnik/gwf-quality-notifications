import React, { useState } from 'react'
import { useI18n } from '../i18n.jsx'

const splitOptions = (s) => s.split(',').map((o) => o.trim()).filter(Boolean)

// Manage the custom columns of Quality Tracking. They are shared by all years and by all users.
export default function TrackingColumnsDialog({ service, columns, onChanged, onClose }) {
  const { t } = useI18n()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState({ name: '', type: 'text', options: '' })

  async function run(job) {
    setBusy(true)
    setError('')
    try {
      await job()
      await onChanged()
    } catch {
      setError(t('columnError'))
    } finally {
      setBusy(false)
    }
  }

  const add = () =>
    run(async () => {
      await service.addColumn({ name: draft.name, type: draft.type, options: splitOptions(draft.options) })
      setDraft({ name: '', type: 'text', options: '' })
    })

  return (
    <div className="modal-backdrop tracking-modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <h2>{t('columnsTitle')}</h2>
        {columns.length === 0 && <p className="note">{t('columnsNone')}</p>}
        {columns.map((c) => (
          <ColumnRow service={service} key={`${c.id}:${c.name}:${c.options.join()}`} column={c} busy={busy} run={run} />
        ))}
        <div className="tracking-col-add">
          <input type="text" placeholder={t('columnName')} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
            <option value="text">{t('columnText')}</option>
            <option value="date">{t('columnDate')}</option>
            <option value="list">{t('columnList')}</option>
          </select>
          {draft.type === 'list' && (
            <input type="text" placeholder={t('columnOptions')} value={draft.options} onChange={(e) => setDraft({ ...draft, options: e.target.value })} />
          )}
          <button type="button" className="btn primary" disabled={busy || !draft.name.trim() || (draft.type === 'list' && !splitOptions(draft.options).length)} onClick={add}>
            {t('columnAdd')}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ColumnRow({ service, column, busy, run }) {
  const { t } = useI18n()
  const [name, setName] = useState(column.name)
  const [options, setOptions] = useState(column.options.join(', '))
  const isList = column.type === 'list'
  const dirty = name.trim() !== column.name || (isList && options !== column.options.join(', '))
  return (
    <div className="tracking-col-row">
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      <span className="note">{t(`column${column.type[0].toUpperCase()}${column.type.slice(1)}`)}</span>
      {isList && <input type="text" value={options} onChange={(e) => setOptions(e.target.value)} />}
      <button
        type="button"
        className="btn"
        disabled={busy || !dirty || !name.trim()}
        onClick={() => run(() => service.updateColumn(column.id, { name, options: splitOptions(options) }))}
      >
        {t('save')}
      </button>
      <button
        type="button"
        className="btn"
        disabled={busy}
        onClick={() => window.confirm(t('columnDeleteConfirm')) && run(() => service.deleteColumn(column.id))}
      >
        {t('delete')}
      </button>
    </div>
  )
}
