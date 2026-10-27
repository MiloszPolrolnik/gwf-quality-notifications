import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as db from './db.js'
import { COLUMNS, MAX_TEXT, buildWorkbook, parseColumn, parseFilters, parseId, parseYear } from './tracking.js'

// Folder with the Excel overviews of the Sonderfreigaben; the server imports every .xlsx in it on start.
export const SONDERFREIGABEN_DIR =
  process.env.QN_SONDERFREIGABEN_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'Sonderfreigaben')

const LABELS = { qnNo: 'SFR-Nr.', releaseUntilOrQty: 'Freigabe bis / Menge' }
const EXPORT_COLUMNS = COLUMNS.map((c) => (LABELS[c.key] ? { ...c, header: LABELS[c.key] } : c))

// Sonderfreigaben Tracking: like the Quality Notifications tracking one table for the whole company,
// readable and editable by every signed-in account. The caller mounts requireAuth first.
export function sonderfreigabenRoutes(app) {
  const base = '/api/sonderfreigaben'

  app.get(`${base}/years`, (_req, res) => res.json(db.sfYears(new Date().getFullYear())))

  app.get(`${base}/columns`, (_req, res) => res.json(db.sfColumns()))

  app.post(`${base}/columns`, (req, res) => {
    const col = parseColumn(req.body)
    if (!col) return res.status(400).json({ error: 'invalid column' })
    res.status(201).json(db.addSfColumn(col))
  })

  app.patch(`${base}/columns/:id`, (req, res) => {
    const id = parseId(req, res)
    if (id === null) return
    const current = db.sfColumns().find((c) => c.id === id)
    if (!current) return res.status(404).json({ error: 'not found' })
    const col = parseColumn(req.body, current)
    if (!col) return res.status(400).json({ error: 'invalid column' })
    res.json(db.updateSfColumn(id, col))
  })

  app.delete(`${base}/columns/:id`, (req, res) => {
    const id = parseId(req, res)
    if (id === null) return
    if (!db.deleteSfColumn(id)) return res.status(404).json({ error: 'not found' })
    res.status(204).end()
  })

  // Changes one cell: { field, value }.
  app.patch(`${base}/rows/:id`, (req, res) => {
    const id = parseId(req, res)
    if (id === null) return
    const { field, value } = req.body ?? {}
    const custom = typeof field === 'string' && /^c\d+$/.test(field) ? db.sfColumns().find((c) => c.key === field) : null
    if (!db.SF_FIELDS.includes(field) && field !== 'qnNo' && !custom) return res.status(400).json({ error: 'invalid field' })
    if (value !== null && (typeof value !== 'string' || value.length > MAX_TEXT)) return res.status(400).json({ error: 'invalid value' })
    if (field === 'qnNo') {
      // the number decides the year: SFR26-01
      const yy = /^[A-Z]{2,3}\d{2}-\d{2,3}$/.test(value ?? '') ? 2000 + Number(value.match(/\d{2}/)[0]) : 0
      if (yy < db.TRACKING_FIRST_YEAR || yy > new Date().getFullYear()) return res.status(400).json({ error: 'invalid number' })
    }
    if (value && custom?.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return res.status(400).json({ error: 'invalid value' })
    const r = db.setSfValue(id, field, value === null ? null : value.replace(/\r\n?/g, '\n'), req.user.id)
    if (r !== 'ok') return res.status(r === 'exists' ? 409 : 404).json({ error: r })
    res.json({ ok: true })
  })

  app.delete(`${base}/rows/:id`, (req, res) => {
    const id = parseId(req, res)
    if (id === null) return
    if (!db.deleteSf(id)) return res.status(404).json({ error: 'not found' })
    res.status(204).end()
  })

  app.post(`${base}/:year/rows`, (req, res) => {
    const year = parseYear(req, res)
    if (year === null) return
    res.status(201).json(db.sfRow(db.createSf(year)))
  })

  app.get(`${base}/:year/export.xlsx`, async (req, res) => {
    const year = parseYear(req, res)
    if (year === null) return
    const wb = await buildWorkbook(year, db.sfList(year, parseFilters(req.query)), db.sfColumns(), {
      title: `GWF Sonderfreigaben Tracking ${year}`,
      base: EXPORT_COLUMNS,
    })
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="Sonderfreigaben_Tracking_${year}.xlsx"`)
    await wb.xlsx.write(res)
    res.end()
  })

  app.get(`${base}/:year`, (req, res) => {
    const year = parseYear(req, res)
    if (year === null) return
    res.json(db.sfList(year, parseFilters(req.query)))
  })
}
