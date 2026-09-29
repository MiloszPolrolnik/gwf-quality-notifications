// Renders the PDF document in node (no browser) for testing.
//   node tools/render.mjs <scenario> [out.pdf]
import esbuild from 'esbuild'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import fs from 'node:fs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const work = path.join(root, '.work')
fs.mkdirSync(work, { recursive: true })
const bundle = path.join(work, 'render.bundle.mjs')

await esbuild.build({
  entryPoints: [path.join(root, 'tools', 'render-entry.jsx')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundle,
  external: ['@react-pdf/renderer', 'react'],
  jsx: 'automatic',
  loader: { '.png': 'file' },
  logLevel: 'error',
})
const { render } = await import(pathToFileURL(bundle).href + '?t=' + Date.now())
const scenario = process.argv[2] || 'empty'
const out = process.argv[3] || path.join(work, `out-${scenario}.pdf`)
await render(scenario, out, root)
console.log('written', out)
