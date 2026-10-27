// Imports Excel overviews into Quality Notifications Tracking (or, with --sf, into Sonderfreigaben Tracking).
//   node scripts/import-tracking.js [--sf] [folder | file.xlsx] [sheet]
// Default folders: docs/Uebersichten, with --sf docs/Sonderfreigaben (the server imports both on every start as well).
import fs from 'node:fs'
import { importFile, importFolder, printResult } from '../server/tracking-import.js'
import { OVERVIEW_DIR } from '../server/tracking.js'
import { SONDERFREIGABEN_DIR } from '../server/sonderfreigaben.js'

const args = process.argv.slice(2)
const kind = args.includes('--sf') ? 'sf' : 'qn'
const [target = kind === 'sf' ? SONDERFREIGABEN_DIR : OVERVIEW_DIR, sheet] = args.filter((a) => a !== '--sf')
if (!fs.existsSync(target)) {
  console.error(`Not found: ${target}`)
  process.exit(1)
}
if (fs.statSync(target).isDirectory()) {
  const results = await importFolder(target, kind)
  const sum = (k) => results.reduce((n, r) => n + r[k].length, 0)
  console.log(`Total: ${results.reduce((n, r) => n + r.imported, 0)} imported, ${sum('skipped')} skipped, ${sum('errors')} errors in ${results.length} file(s)`)
} else {
  const r = await importFile(target, sheet, kind)
  printResult(target, r)
  if (r.skipped.length) console.log(`Skipped:\n  ${r.skipped.join('\n  ')}`)
}
