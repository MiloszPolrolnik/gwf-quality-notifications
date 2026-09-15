import { renderToFile } from '@react-pdf/renderer'
import React from 'react'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import QualityNotificationPdf from '../src/pdf/QualityNotificationPdf.jsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const logoSrc = pathToFileURL(path.join(__dirname, '..', 'public', 'gwf-logo.png')).href
const outFile = path.join(__dirname, '..', 'quality-notification-empty.pdf')

await renderToFile(React.createElement(QualityNotificationPdf, { logoSrc }), outFile)
console.log('PDF written to', outFile)
