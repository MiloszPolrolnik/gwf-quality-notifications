import React from 'react'
import path from 'node:path'
import fs from 'node:fs'
import { renderToFile } from '@react-pdf/renderer'
import QualityNotificationPdf from '../src/pdf/QualityNotificationPdf.jsx'
import { registerFonts } from '../src/pdf/fonts.js'
import { scenarios } from './scenarios.mjs'

export async function render(name, out, root) {
  registerFonts(path.join(root, 'public', 'fonts'))
  const data = await scenarios[name](root)
  await renderToFile(
    <QualityNotificationPdf data={data} logoSrc={{ data: fs.readFileSync(path.join(root, 'public', 'gwf-logo.png')), format: 'png' }} generatedAt="15.09.2026" />,
    out,
  )
}
