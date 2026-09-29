# GWF Quality Notifications

Internal application for digitizing the `DL05-F0987 - Quality Notification` form.

**Stage 1 (current scope):** a faithful 1:1 layout of the empty form as a
React component + PDF export (without data entry, login, signature workflow
or a database — those are later stages).

## Stack

- React + Vite
- `@react-pdf/renderer` — PDF built directly from JSX components (not
  html2canvas/screenshot)

## Structure

- `src/App.jsx` - landing page ("Fill out the form"), hash routing, EN/DE switch
- `src/i18n.jsx` - dictionary + React context (UI only; the PDF is never translated)
- `src/components/FormPage.jsx` - form for sections 1-7, live preview, download
- `src/pdf/QualityNotificationPdf.jsx` - the PDF document (data-driven, used for preview *and* download)
- `src/pdf/geometry.js` - all measured template geometry (pt), one source of truth
- `src/pdf/primitives.jsx`, `src/pdf/sections/*` - cells, rows, checkboxes, one component per section
- `public/fonts` - Arimo (metric-compatible with Arial), loaded locally
- `tools/` - verification: `render.mjs` (render scenarios in node), `extract2.py` (geometry of the
  original), `compare.py` / `diff.py` / `boxes2.py` (numeric + image diff against the original PDF)
- `docs/samples/` - rendered test scenarios (empty / long text / images)

## Running

```bash
npm install
npm run dev      # preview at http://localhost:5173
npm run build    # production build into dist/
```

### Note: corporate proxy/TLS (Zscaler etc.)

If `npm install` fails with
`UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, it's because Node.js can't see the
corporate root CA certificate that Windows already trusts
(git/browsers work fine because they use the Windows certificate store;
Node has its own, separate store). Solution — export the trusted Windows
certificates to a PEM file and point Node to it:

```powershell
$outFile = "$env:TEMP\corp-ca-bundle.pem"
Get-ChildItem Cert:\LocalMachine\Root, Cert:\LocalMachine\CA, Cert:\CurrentUser\Root |
  ForEach-Object {
    $b64 = [System.Convert]::ToBase64String($_.RawData)
    Add-Content $outFile "-----BEGIN CERTIFICATE-----"
    for ($i=0; $i -lt $b64.Length; $i+=64) { Add-Content $outFile $b64.Substring($i, [Math]::Min(64,$b64.Length-$i)) }
    Add-Content $outFile "-----END CERTIFICATE-----"
  }
$env:NODE_EXTRA_CA_CERTS = $outFile
```

Set `NODE_EXTRA_CA_CERTS` permanently (e.g. in your PowerShell profile or
user environment variables) so you don't have to do this every new session.

## Generating the PDF without a browser (for testing)

```bash
node -e "
const esbuild = require('esbuild');
esbuild.buildSync({
  entryPoints: ['scripts/generate-pdf.mjs'],
  bundle: true, platform: 'node', format: 'esm',
  outfile: 'scripts/.generate-pdf.bundle.mjs',
  jsx: 'automatic', external: ['@react-pdf/renderer','react','react-dom'],
});
"
node scripts/.generate-pdf.bundle.mjs
```

This produces `quality-notification-empty.pdf` in the repo root (this file
is not committed — it's just a tool for quickly verifying the layout).
