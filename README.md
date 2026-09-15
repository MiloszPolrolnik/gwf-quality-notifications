# GWF Quality Notifications

Wewnętrzna aplikacja do cyfryzacji formularza `DL05-F0987 - Quality Notification`.

**Etap 1 (obecny zakres):** wierny 1:1 layout pustego formularza jako komponent
React + eksport do PDF (bez wypełniania danych, logowania, workflow podpisów
czy bazy danych — to kolejne etapy).

## Stack

- React + Vite
- `@react-pdf/renderer` — PDF budowany bezpośrednio z komponentów JSX (nie
  html2canvas/screenshot)

## Struktura

- `src/components/QualityNotificationForm.jsx` — podgląd formularza na ekranie (HTML/CSS)
- `src/pdf/QualityNotificationPdf.jsx` — layout do generowania PDF-a
- `src/App.jsx` — podgląd + przycisk „Pobierz pusty formularz PDF”
- `public/gwf-logo.png` — **placeholder** logo GWF (podmienić na docelowy plik)
- `docs/` — oryginalne pliki referencyjne (PDF/DOCX)

## Uruchomienie

```bash
npm install
npm run dev      # podgląd na http://localhost:5173
npm run build    # build produkcyjny do dist/
```

### Uwaga: firmowy proxy/TLS (Zscaler itp.)

Jeśli `npm install` kończy się błędem
`UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, to dlatego, że Node.js nie widzi
firmowego certyfikatu root CA, który jest już zaufany przez Windows
(git/przeglądarka działają, bo korzystają z magazynu certyfikatów Windows;
Node ma własny, osobny magazyn). Rozwiązanie — wyeksportować zaufane
certyfikaty Windows do pliku PEM i wskazać go Node'owi:

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

Ustaw `NODE_EXTRA_CA_CERTS` na stałe (np. w profilu PowerShell albo zmiennych
środowiskowych użytkownika), żeby nie robić tego przy każdej nowej sesji.

## Generowanie PDF-a bez przeglądarki (do testów)

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

Powstaje `quality-notification-empty.pdf` w katalogu głównym repo (plik ten
nie jest commitowany — to tylko narzędzie do szybkiej weryfikacji layoutu).
