import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ExcelJS from 'exceljs'
import * as db from './db.js'

// Folder with the Excel overviews ("Übersicht"); the server imports every .xlsx in it on start.
export const OVERVIEW_DIR =
  process.env.QN_OVERVIEW_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'Uebersichten')

// Quality Tracking: one table for the whole company (not filtered by user); every signed-in
// account may read, edit and export. The caller mounts requireAuth on /api/tracking first.

// Column headers stay German in both UI languages, as in the original Excel.
export const COLUMNS = [
  { header: 'QN-Nr.', key: 'qnNo', width: 10 },
  { header: 'PSW (Serie/Projekt)', key: 'pswType', width: 12 },
  { header: 'Artikelnummer', key: 'partNo', width: 18 },
  { header: 'Artikelbezeichnung', key: 'partDesc', width: 28 },
  { header: 'Lieferanten-Nr', key: 'supplierNo', width: 14 },
  { header: 'Lieferant', key: 'supplierName', width: 20 },
  { header: 'Begründung', key: 'reason', width: 60 },
  { header: 'Massnahmen', key: 'measures', width: 50 },
  { header: 'Freigabe bis / oder Menge', key: 'releaseUntilOrQty', width: 22 },
  { header: 'Verantwortung', key: 'responsible', width: 16 },
  { header: 'Doku', key: 'doku', width: 8 },
  { header: 'Status', key: 'status', width: 14 },
  { header: 'Tracking', key: 'tracking', width: 14 },
]

const NAVY = 'FF1F4E79'
const THIN = { style: 'thin', color: { argb: 'FFD0D5DD' } }
export const MAX_TEXT = 5000

export function parseYear(req, res) {
  const year = Number(req.params.year)
  if (!Number.isInteger(year) || year < db.TRACKING_FIRST_YEAR || year > new Date().getFullYear()) {
    res.status(400).json({ error: 'invalid year' })
    return null
  }
  return year
}

export function parseId(req, res, param = 'id') {
  const id = Number(req.params[param])
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'invalid id' })
    return null
  }
  return id
}

export function parseFilters(query) {
  const str = (v) => (typeof v === 'string' ? v.trim() : '')
  const status = str(query.status)
  return {
    status: db.TRACKING_STATES.includes(status) ? status : '',
    supplier: str(query.supplier),
    responsible: str(query.responsible),
    search: str(query.search),
  }
}

// name / type / options of a custom column from a request body; null when invalid
export function parseColumn(body, current) {
  const name = String(body?.name ?? '').trim()
  const type = current ? current.type : body?.type
  if (!name || name.length > 60 || !['text', 'date', 'list'].includes(type)) return null
  let options = []
  if (type === 'list') {
    options = [...new Set((Array.isArray(body?.options) ? body.options : []).map((o) => String(o).trim()).filter(Boolean))]
    if (!options.length || options.length > 50 || options.some((o) => o.length > 60)) return null
  }
  return { name, type, options }
}

export async function buildWorkbook(year, rows, custom, { title: titleText = `GWF Quality Notification Tracking ${year}`, base = COLUMNS } = {}) {
  const columns = [...base, ...custom.map((c) => ({ header: c.name, key: c.key, width: 20 }))]
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(`${year}_Übersicht QN`, { views: [{ state: 'frozen', ySplit: 2 }] })
  ws.columns = columns.map(({ key, width }) => ({ key, width }))
  const last = columns.length

  ws.mergeCells(1, 1, 1, last - 1)
  const title = ws.getCell(1, 1)
  title.value = titleText
  title.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
  title.alignment = { vertical: 'middle' }
  const date = ws.getCell(1, last)
  date.value = new Date().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')
  date.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  date.alignment = { horizontal: 'right', vertical: 'middle' }
  for (let c = 1; c <= last; c++) ws.getCell(1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
  ws.getRow(1).height = 24

  const head = ws.getRow(2)
  columns.forEach((col, i) => {
    const cell = head.getCell(i + 1)
    cell.value = col.header
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    cell.alignment = { vertical: 'middle', wrapText: true }
    cell.border = { top: THIN, left: THIN, bottom: THIN, right: THIN }
  })
  head.height = 30

  for (const r of rows) {
    const row = ws.addRow({ ...r, ...r.custom, doku: r.hasPdf ? 'PDF' : r.doku ?? '' })
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { vertical: 'top', wrapText: true }
      cell.border = { top: THIN, left: THIN, bottom: THIN, right: THIN }
      // text as shown in the app: keep leading zeros / trailing zeros of article numbers
      cell.numFmt = '@'
    })
  }
  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: last } }
  return wb
}

export function trackingRoutes(app) {
  app.get('/api/tracking/years', (_req, res) => res.json(db.trackingYears(new Date().getFullYear())))

  // --- custom columns (shared by all years) ---
  app.get('/api/tracking/columns', (_req, res) => res.json(db.trackingColumns()))

  app.post('/api/tracking/columns', (req, res) => {
    const col = parseColumn(req.body)
    if (!col) return res.status(400).json({ error: 'invalid column' })
    res.status(201).json(db.addTrackingColumn(col))
  })

  app.patch('/api/tracking/columns/:id', (req, res) => {
    const id = parseId(req, res)
    if (id === null) return
    const current = db.trackingColumns().find((c) => c.id === id)
    if (!current) return res.status(404).json({ error: 'not found' })
    const col = parseColumn(req.body, current)
    if (!col) return res.status(400).json({ error: 'invalid column' })
    res.json(db.updateTrackingColumn(id, col))
  })

  app.delete('/api/tracking/columns/:id', (req, res) => {
    const id = parseId(req, res)
    if (id === null) return
    if (!db.deleteTrackingColumn(id)) return res.status(404).json({ error: 'not found' })
    res.status(204).end()
  })

  // --- rows ---
  // Changes one cell: { field, value }. value null = back to the value of the notification / empty cell.
  app.patch('/api/tracking/rows/:id', (req, res) => {
    const id = parseId(req, res)
    if (id === null) return
    const { field, value } = req.body ?? {}
    if (field === 'qnNo') {
      // the number decides the year: YY-NNN within the years the tracking covers
      const yy = typeof value === 'string' && /^\d{2}-\d{3}$/.test(value) ? 2000 + Number(value.slice(0, 2)) : 0
      if (yy < db.TRACKING_FIRST_YEAR || yy > new Date().getFullYear()) return res.status(400).json({ error: 'invalid QN number' })
      const r = db.renameQn(id, value)
      return r === 'ok' ? res.json({ ok: true }) : res.status(r === 'exists' ? 409 : 404).json({ error: r })
    }
    const custom = typeof field === 'string' && /^c\d+$/.test(field) ? db.trackingColumns().find((c) => c.key === field) : null
    if (!db.TRACKING_FIELDS.includes(field) && !custom) return res.status(400).json({ error: 'invalid field' })
    if (value !== null && (typeof value !== 'string' || value.length > MAX_TEXT)) return res.status(400).json({ error: 'invalid value' })
    if (value && custom?.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return res.status(400).json({ error: 'invalid value' })
    if (!db.setTrackingValue(id, field, value === null ? null : value.replace(/\r\n?/g, '\n'), req.user.id)) {
      return res.status(404).json({ error: 'not found' })
    }
    res.json({ ok: true })
  })

  app.delete('/api/tracking/rows/:id', (req, res) => {
    const id = parseId(req, res)
    if (id === null) return
    if (!db.deleteTrackingRow(id)) return res.status(404).json({ error: 'not found' })
    res.status(204).end()
  })

  // --- a year ---
  app.post('/api/tracking/:year/rows', (req, res) => {
    const year = parseYear(req, res)
    if (year === null) return
    res.status(201).json(db.trackingRow(year, db.createTrackingRow(year)))
  })

  app.get('/api/tracking/:year/export.xlsx', async (req, res) => {
    const year = parseYear(req, res)
    if (year === null) return
    const wb = await buildWorkbook(year, db.trackingList(year, parseFilters(req.query)), db.trackingColumns())
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="QN_Tracking_${year}.xlsx"`)
    await wb.xlsx.write(res)
    res.end()
  })

  app.get('/api/tracking/:year', (req, res) => {
    const year = parseYear(req, res)
    if (year === null) return
    res.json(db.trackingList(year, parseFilters(req.query)))
  })
}
