// Import of the Excel overviews ("Übersicht") into the Quality Notifications / Sonderfreigaben Tracking tables.
// The header row is the one with a "QN-Nr." cell (a title row sits above it). Values are taken as
// Excel displays them, line breaks kept. Rows that have nothing but QN-Nr. / PSW are reserved
// numbers and skipped, as are numbers that exist in the database already, so running it again is safe.
import fs from 'node:fs'
import path from 'node:path'
import ExcelJS from 'exceljs'
import * as db from './db.js'

// header text of the Excel (lower case, spaces around "/" removed) -> field; the number column is "qnNo" for both kinds
const HEADERS = {
  'qn-nr.': 'qnNo',
  'sfr-nr.': 'qnNo',
  'psw (serie/projekt)': 'pswType',
  'psw (ja/projekt)': 'pswType',
  artikelnummer: 'partNo',
  artikelbezeichnung: 'partDesc',
  'lieferanten-nr': 'supplierNo',
  lieferant: 'supplierName',
  begründung: 'reason',
  massnahmen: 'measures',
  'freigabe bis/oder menge': 'releaseUntilOrQty',
  'freigabe bis/menge': 'releaseUntilOrQty',
  verantwortung: 'responsible',
  doku: 'doku',
  status: 'status',
  tracking: 'tracking',
}
const headerKey = (s) => s.toLowerCase().replace(/\s+/g, ' ').replace(/ ?\/ ?/g, '/')

// What is imported: the Quality Notification overviews ("QN-Nr.") or the Sonderfreigaben overviews ("SFR-Nr.").
const KINDS = {
  qn: { anchor: 'qn-nr.', pattern: /^\d{2}-\d{3}$/, ignoreWhenEmpty: ['qnNo', 'pswType', 'doku'], save: (rec) => db.importTracking(rec) },
  sf: { anchor: 'sfr-nr.', pattern: /^[A-Z]{2,3}\d{2}-\d{2,3}$/, ignoreWhenEmpty: ['qnNo', 'pswType'], save: (rec) => db.importSonderfreigabe(rec) },
}

const pad = (n) => String(n).padStart(2, '0')

// exceljs' cell.text prints raw numbers and long date strings, so numbers and dates are
// formatted here the way Excel shows them; everything else (text, rich text) is cell.text.
function shown(cell) {
  let v = cell.value
  if (v && typeof v === 'object' && 'result' in v) v = v.result
  if (v === null || v === undefined) return ''
  const fmt = cell.numFmt || 'General'
  if (v instanceof Date) {
    return `${pad(v.getUTCDate())}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCFullYear() % 100)}`
  }
  if (typeof v === 'number') {
    const decimals = (fmt.match(/\.(0+)/)?.[1] ?? '').length
    if (/^0(\.0+)?%$/.test(fmt)) return `${(v * 100).toFixed(decimals)}%`
    if (/^(#,##)?0(\.0+)?$/.test(fmt)) {
      return v.toLocaleString('en-US', {
        useGrouping: fmt.startsWith('#,##'),
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    }
    // accounting formats such as "_ * #,##0_ ;..."
    if (fmt.includes('#,##0')) return v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    return String(v)
  }
  return cell.text
}

const clean = (s) => String(s).replace(/\r\n?/g, '\n').trim()

function normalizeStatus(s) {
  const v = s.toLowerCase()
  if (!v) return ''
  if (v === 'open' || v === 'offen') return 'offen'
  if (v === 'abgeschlossen') return 'abgeschlossen'
  return v
}

// Imports one workbook (first sheet unless named) -> { sheet, imported, skipped: [], errors: [] }
export async function importFile(file, sheetName, kind = 'qn') {
  const { anchor, pattern, ignoreWhenEmpty, save } = KINDS[kind]
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(file)
  const ws = sheetName ? wb.getWorksheet(sheetName) : wb.worksheets[0]
  if (!ws) throw new Error(`sheet "${sheetName}" not found (available: ${wb.worksheets.map((w) => w.name).join(', ')})`)

  let headerRow = 0
  const cols = {}
  ws.eachRow((row, n) => {
    if (headerRow) return
    row.eachCell((cell) => {
      if (headerKey(clean(shown(cell))) === anchor) headerRow = n
    })
  })
  if (!headerRow) throw new Error(`no header row with "${anchor}" found`)
  ws.getRow(headerRow).eachCell((cell, c) => {
    const field = HEADERS[headerKey(clean(shown(cell)))]
    if (field) cols[field] = c
  })

  const result = { sheet: ws.name, imported: 0, skipped: [], errors: [] }
  for (let n = headerRow + 1; n <= ws.rowCount; n++) {
    const row = ws.getRow(n)
    const get = (field) => (cols[field] ? clean(shown(row.getCell(cols[field]))) : '')
    const rec = Object.fromEntries(Object.values(HEADERS).map((f) => [f, get(f)]))
    if (!rec.qnNo) continue // notes / stray cells, not a notification row
    try {
      const filled = Object.entries(rec).some(([f, v]) => v && !ignoreWhenEmpty.includes(f))
      if (!filled) {
        result.skipped.push(`${rec.qnNo} (reserved, empty)`)
        continue
      }
      // older sheets number as QN18-01: same scheme as the app, 18-001
      rec.qnNo = rec.qnNo.replace(/^QN(\d{2})-(\d{2,3})$/, (_, yy, nn) => (kind === 'qn' ? `${yy}-${nn.padStart(3, '0')}` : _))
      if (!pattern.test(rec.qnNo)) throw new Error(`invalid number "${rec.qnNo}"`)
      rec.status = normalizeStatus(rec.status)
      rec.tracking = normalizeStatus(rec.tracking)
      if (save(rec)) result.imported++
      else result.skipped.push(`${rec.qnNo} (already in database)`)
    } catch (e) {
      result.errors.push(`row ${n}: ${e.message}`)
    }
  }
  return result
}

export function printResult(file, r) {
  console.log(`${path.basename(file)} [${r.sheet}]: imported ${r.imported}, skipped ${r.skipped.length}, errors ${r.errors.length}`)
  for (const e of r.errors) console.log(`  error: ${e}`)
}

// Imports every .xlsx of a folder (Excel lock files "~$..." ignored). A broken file does not stop the others.
export async function importFolder(dir, kind = 'qn') {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const name of fs.readdirSync(dir).filter((f) => /\.xlsx$/i.test(f) && !f.startsWith('~$')).sort()) {
    const file = path.join(dir, name)
    try {
      const r = await importFile(file, undefined, kind)
      printResult(file, r)
      out.push({ file, ...r })
    } catch (e) {
      console.error(`${name}: import failed: ${e.message}`)
      out.push({ file, sheet: '', imported: 0, skipped: [], errors: [e.message] })
    }
  }
  return out
}
