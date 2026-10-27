import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { api } from '../api.js'
import { KINDS } from './trackingKinds.js'
import { formatDate, pdfFileName, signaturesFrom } from '../pdf/data.js'
import { renderPdfBlob } from './PdfPreview.jsx'
import TrackingColumnsDialog from './TrackingColumnsDialog.jsx'

const ACTION_WIDTH = 80
const OWN_TEXT = '__own_text__' // list entry that switches the cell to free text

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
const uniqueSorted = (rows, key) => [...new Set(rows.map((r) => r[key]).filter(Boolean))].sort(collator.compare)
const isoToDisplay = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split('-').reverse().join('.') : v)

// The editor of one cell. Enter / leaving the cell saves, Esc cancels, Shift+Enter is a line break.
function CellEditor({ column, value, canReset, resetLabel, onSave, onCancel }) {
  const ref = useRef(null)
  const [text, setText] = useState(value)
  const done = useRef(false)
  const switching = useRef(false)
  // lists also accept any own text: typing = the cell is edited as free text instead of picked
  const [typing, setTyping] = useState(column.edit === 'list' && value !== '' && !column.options.includes(value))
  useEffect(() => {
    switching.current = false
    ref.current?.focus()
    ref.current?.select?.()
  }, [typing])
  const finish = (v) => {
    if (done.current) return
    done.current = true
    if (v === undefined || v === value) onCancel()
    else onSave(v)
  }
  const common = {
    ref,
    onKeyDown: (e) => {
      if (e.key === 'Escape') finish(undefined)
      else if (e.key === 'Enter' && !(e.shiftKey && column.edit === 'text')) {
        e.preventDefault()
        finish(text)
      }
    },
  }
  let input
  if (column.edit === 'list' && typing) {
    input = <input type="text" {...common} value={text} onChange={(e) => setText(e.target.value)} onBlur={() => finish(text)} />
  } else if (column.edit === 'list') {
    input = (
      <select
        {...common}
        value={text}
        onChange={(e) => {
          if (e.target.value === OWN_TEXT) {
            switching.current = true
            setText('')
            setTyping(true)
          } else finish(e.target.value)
        }}
        onBlur={() => !switching.current && finish(undefined)}
      >
        <option value="" />
        {column.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        <option value={OWN_TEXT}>✎ …</option>
      </select>
    )
  } else if (column.edit === 'date') {
    input = <input type="date" {...common} value={text} onChange={(e) => setText(e.target.value)} onBlur={() => finish(text)} />
  } else {
    input = (
      <textarea
        {...common}
        rows={column.edit === 'line' ? 1 : Math.min(8, Math.max(2, text.split('\n').length))}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => finish(text)}
      />
    )
  }
  return (
    <>
      {input}
      {canReset && (
        // mousedown would blur (= save) the field first
        <button type="button" className="tracking-reset" onMouseDown={(e) => e.preventDefault()} onClick={() => ((done.current = true), onSave(null))}>
          {resetLabel}
        </button>
      )}
    </>
  )
}

// Table of all Quality Notifications of one year (the whole company, not only mine).
// Read-only until "Edit table" is switched on; then every cell except the QN number can be changed.
export default function TrackingTable({ kind: kindName = 'qn', user, year, onOpen, onBack }) {
  const { t, lang } = useI18n()
  const kind = KINDS[kindName]
  const service = kind.api
  const [rows, setRows] = useState(null)
  const [custom, setCustom] = useState([])
  const [options, setOptions] = useState({ suppliers: [], responsibles: [] })
  const [filters, setFilters] = useState({ search: '', status: '', supplier: '', responsible: '' })
  const [query, setQuery] = useState(filters)
  const [sort, setSort] = useState({ key: null, dir: 1 })
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editing, setEditing] = useState(null) // { id, key }
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [tick, setTick] = useState(0) // bump to reload after a change
  const scrollRef = useRef(null)
  const reload = () => setTick((n) => n + 1)

  const columns = useMemo(
    () => [
      ...kind.columns,
      ...custom.map((c) => ({ key: c.key, label: c.name, width: 150, custom: true, edit: c.type === 'list' ? 'list' : c.type === 'date' ? 'date' : 'text', options: c.options, type: c.type })),
    ],
    [custom],
  )
  const tableWidth = columns.reduce((sum, c) => sum + c.width, 0) + (editMode ? ACTION_WIDTH : 0)
  const valueOf = (r, c) => (c.custom ? r.custom[c.key] ?? '' : r[c.key])

  const loadColumns = () => service.columns().then(setCustom).catch(() => {})
  useEffect(() => {
    loadColumns()
  }, [])

  // filter values for the selects come from the whole year, not from the filtered rows
  useEffect(() => {
    service
      .list(year)
      .then((all) => setOptions({ suppliers: uniqueSorted(all, 'supplierName'), responsibles: uniqueSorted(all, 'responsible') }))
      .catch(() => {})
  }, [year, tick])

  // the search box is debounced, the selects apply at once
  useEffect(() => {
    const id = setTimeout(() => setQuery(filters), filters.search === query.search ? 0 : 250)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  useEffect(() => {
    let alive = true
    service
      .list(year, query)
      .then((r) => {
        if (!alive) return
        setRows(r)
        setError('')
      })
      .catch(() => alive && setError(t('trackingLoadError')))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, query, tick])

  const sorted = useMemo(() => {
    if (!rows || !sort.key) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return rows
    return [...rows].sort((a, b) => {
      const x = col.sortKey ? a[col.sortKey] : valueOf(a, col)
      const y = col.sortKey ? b[col.sortKey] : valueOf(b, col)
      // empty cells always go last
      if (!x && !y) return 0
      if (!x) return 1
      if (!y) return -1
      return collator.compare(String(x), String(y)) * sort.dir
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort, columns])

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }))
  const toggleSort = (key) => setSort((s) => (s.key === key ? (s.dir === 1 ? { key, dir: -1 } : { key: null, dir: 1 }) : { key, dir: 1 }))

  function save(blob, name) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  async function exportExcel() {
    setExporting(true)
    setError('')
    try {
      save(await service.exportXlsx(year, query), kind.fileName(year))
    } catch {
      setError(t('trackingExportError'))
    } finally {
      setExporting(false)
    }
  }

  async function openPdf(e, row) {
    e.preventDefault()
    e.stopPropagation()
    try {
      const full = await api.get(row.id)
      save(await renderPdfBlob({ ...full.data, signatures: signaturesFrom(full.approvals) }), pdfFileName(full.data))
    } catch {
      setError(t('loadError'))
    }
  }

  async function change(job) {
    setError('')
    try {
      await job()
      reload()
    } catch {
      setError(t('trackingSaveError'))
    }
  }

  const saveCell = (row, key, value) => {
    setEditing(null)
    return change(() => service.setCell(row.id, key, value))
  }

  async function addRow() {
    await change(() => service.addRow(year))
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 300)
  }

  // rows without a form can be removed here; a notification made in the app only by its author
  const canDelete = (row) => row.imported || (user && row.authorId === user.id)
  const removeRow = (row) =>
    window.confirm(t('trackingDeleteRowConfirm')) && change(() => (row.imported ? service.deleteRow(row.id) : api.remove(row.id)))

  const stopEditing = () => {
    setEditMode(false)
    setEditing(null)
  }

  const count = sorted?.length ?? 0
  const editedTitle = (info) => (info ? `${t('trackingEditedBy')} ${info.by ?? '–'}, ${new Date(info.at).toLocaleString(lang === 'de' ? 'de-CH' : 'en-GB')}` : undefined)

  return (
    <main className="tracking-page">
      <div className="form-head">
        <button type="button" className="btn ghost" onClick={onBack}>
          ← {t('back')}
        </button>
      </div>

      <div className="tracking-toolbar">
        <input type="search" placeholder={t('trackingSearch')} value={filters.search} onChange={set('search')} />
        <select value={filters.status} onChange={set('status')}>
          <option value="">{t('trackingAllStatus')}</option>
          <option value="offen">offen</option>
          <option value="freigegeben">freigegeben</option>
          <option value="abgeschlossen">abgeschlossen</option>
        </select>
        <select value={filters.supplier} onChange={set('supplier')}>
          <option value="">{t('trackingAllSupplier')}</option>
          {options.suppliers.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={filters.responsible} onChange={set('responsible')}>
          <option value="">{t('trackingAllResponsible')}</option>
          {options.responsibles.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <span className="tracking-toolbar-right">
          {editMode && (
            <>
              <button type="button" className="btn" onClick={addRow}>
                {t('trackingAddRow')}
              </button>
              <button type="button" className="btn" onClick={() => setColumnsOpen(true)}>
                {t('trackingColumns')}
              </button>
            </>
          )}
          <button type="button" className={editMode ? 'btn primary' : 'btn'} onClick={editMode ? stopEditing : () => setEditMode(true)}>
            {editMode ? t('trackingEditDone') : t('trackingEdit')}
          </button>
          <button type="button" className="btn" disabled={exporting} onClick={exportExcel}>
            {t('trackingExport')}
          </button>
        </span>
      </div>
      {editMode && <p className="tracking-count">{t('trackingEditHint')}</p>}
      {error && <p className="error">{error}</p>}

      <div className="tracking-title">
        <span>{kind.sheetTitle} {year}</span>
        <span>{formatDate()}</span>
      </div>
      <div className="tracking-scroll" ref={scrollRef}>
        <table className="tracking-table" style={{ width: tableWidth }}>
          <colgroup>
            {columns.map((c) => (
              <col key={c.key} style={{ width: c.width }} />
            ))}
            {editMode && <col style={{ width: ACTION_WIDTH }} />}
          </colgroup>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} onClick={() => toggleSort(c.key)}>
                  {c.label}
                  {sort.key === c.key && <span className="sort-mark">{sort.dir === 1 ? ' ▲' : ' ▼'}</span>}
                </th>
              ))}
              {editMode && <th />}
            </tr>
          </thead>
          <tbody>
            {(sorted ?? []).map((r) => {
              const clickable = !r.imported && !editMode
              return (
                <tr key={r.id} className={clickable ? 'clickable' : undefined} onClick={clickable ? () => onOpen(r.id) : undefined}>
                  {columns.map((c) => {
                    const editable = editMode && c.edit
                    const isEditing = editing?.id === r.id && editing.key === c.key
                    const info = r.edited[c.key]
                    const isQn = c.key === 'qnNo'
                    const value = valueOf(r, c)
                    return (
                      <td
                        key={c.key}
                        className={[editable ? 'editable' : '', info ? 'edited' : ''].join(' ').trim() || undefined}
                        title={editedTitle(info)}
                        onClick={editable && !isEditing ? () => setEditing({ id: r.id, key: c.key }) : undefined}
                      >
                        {isEditing ? (
                          <CellEditor
                            column={c}
                            value={value}
                            canReset={!isQn && (c.custom ? Boolean(value) : Boolean(info))}
                            resetLabel={c.custom ? t('delete') : r.imported ? t('trackingResetImported') : t('trackingReset')}
                            onSave={(v) => saveCell(r, c.key, v)}
                            onCancel={() => setEditing(null)}
                          />
                        ) : c.key === 'qnNo' ? (
                          <>
                            {(r.state ?? r.status) === 'offen' && <span className="qn-dot open" />}
                            {(r.state ?? r.status) === 'abgeschlossen' && <span className="qn-dot done" />}
                            {r.qnNo}
                          </>
                        ) : c.key === 'doku' ? (
                          r.hasPdf ? (
                            <a href="#/tracking" onClick={(e) => openPdf(e, r)}>
                              PDF
                            </a>
                          ) : (
                            r.doku
                          )
                        ) : c.type === 'date' ? (
                          isoToDisplay(value)
                        ) : (
                          value
                        )}
                      </td>
                    )
                  })}
                  {editMode && (
                    <td>
                      {canDelete(r) && (
                        <button type="button" className="btn tracking-delete" onClick={() => removeRow(r)}>
                          {t('trackingDeleteRow')}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="tracking-count">
        {count} {count === 1 ? t('trackingEntry') : t('trackingEntries')}
      </p>
      {columnsOpen && <TrackingColumnsDialog service={service} columns={custom} onChanged={loadColumns} onClose={() => setColumnsOpen(false)} />}
    </main>
  )
}
