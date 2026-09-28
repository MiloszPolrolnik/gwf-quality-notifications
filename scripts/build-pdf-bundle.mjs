import esbuild from 'esbuild'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

await esbuild.build({
  entryPoints: [path.join(__dirname, 'generate-pdf.mjs')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: path.join(__dirname, '.generate-pdf.bundle.mjs'),
  external: ['@react-pdf/renderer', 'react', 'fontkit', 'node:*'],
  jsx: 'automatic',
})
console.log('bundle written')
