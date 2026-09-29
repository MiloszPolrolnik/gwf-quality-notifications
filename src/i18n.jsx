import React, { createContext, useContext, useEffect, useState } from 'react'

// UI strings only: the generated PDF always stays in the template's language.
export const dictionary = {
  en: {
    appTitle: 'GWF Quality Notification',
    landingTitle: 'Quality Notification',
    landingSub: 'Form DL05-F0987 (intern & extern)',
    landingText:
      'Fill out the form, check the live preview and download the finished PDF that looks exactly like the official template.',
    fillOut: 'Fill out the form',
    back: 'Back',
    formTitle: 'Fill out the form',
    generate: 'Generate PDF',
    generating: 'Generating…',
    reset: 'Reset form',
    resetConfirm: 'Delete all entries?',
    preview: 'Preview',
    hidePreview: 'Back to form',
    previewLoading: 'Updating preview…',
    previewError: 'The preview could not be generated.',
    docTitle: 'Document title (header, optional)',
    docTitleHint: 'Empty = "DL05-F0987 - Quality Notification.docx"',
    s1: 'Basic data',
    date: 'Date',
    partNo: 'GWF Part No.',
    partDesc: 'Part Description',
    batchNo: 'Affected Batchlot Number',
    batchQty: 'Batchlot Quantity',
    applicant: 'Applicant',
    department: 'Department',
    supplier: 'Supplier + Supplier number (if applicable)',
    qnNo: 'Quality Notification No. (to be allocated by GWF QM)',
    qnNote: 'The Quality Notification No. is allocated by GWF QM and stays empty in the PDF.',
    s2: 'Problem Description',
    s3: 'Root Cause',
    s4: 'Disposition (parts)',
    s5: 'Disposition (process)',
    s6: 'Corrective Actions',
    s7: 'Information to sales / customer',
    scrap: 'Scrap',
    rework: 'Rework',
    sorting: 'Sorting (under Concession)',
    useAsIs: 'Use as is',
    risk: 'Risk assessment (mandatory)',
    otherDocs: 'Other supporting documents',
    otherDocsText: 'Text on the dotted line (one line)',
    details: 'Details (printed below the checkboxes)',
    stop: 'Stop until fixed',
    concession: 'Continue with Concession',
    ifConcession: 'If concession:',
    until: 'Until (date)',
    quantity: 'Quantity (number)',
    toolRepair: 'Tool repair',
    dfm: 'DFM',
    fai: 'FAI',
    cpk: 'Capability Study (PpK)',
    cpkAll: 'all critical dimensions',
    cpkSelected: 'selected dimensions',
    sample: 'Sample submission',
    other: 'other',
    psw: 'New PSW',
    infoSales: 'Information to the sales department',
    infoCustomer: 'Information to the customer',
    yes: 'yes',
    no: 'no',
    images: 'Attached Pictures',
    addImages: 'Add images',
    dropHint: 'Choose files, drag & drop here or paste with Ctrl+V',
    remove: 'Remove',
    moveLeft: 'Move earlier',
    moveRight: 'Move later',
    imageError: 'This file could not be read as an image.',
  },
  de: {
    appTitle: 'GWF Qualitätsmeldung',
    landingTitle: 'Qualitätsmeldung',
    landingSub: 'Formular DL05-F0987 (intern & extern)',
    landingText:
      'Formular ausfüllen, Live-Vorschau prüfen und das fertige PDF herunterladen – es sieht genau aus wie die offizielle Vorlage.',
    fillOut: 'Formular ausfüllen',
    back: 'Zurück',
    formTitle: 'Formular ausfüllen',
    generate: 'PDF erzeugen',
    generating: 'Wird erzeugt…',
    reset: 'Formular zurücksetzen',
    resetConfirm: 'Alle Eingaben löschen?',
    preview: 'Vorschau',
    hidePreview: 'Zurück zum Formular',
    previewLoading: 'Vorschau wird aktualisiert…',
    previewError: 'Die Vorschau konnte nicht erzeugt werden.',
    docTitle: 'Dokumenttitel (Kopfzeile, optional)',
    docTitleHint: 'Leer = "DL05-F0987 - Quality Notification.docx"',
    s1: 'Grunddaten',
    date: 'Date',
    partNo: 'GWF Part No.',
    partDesc: 'Part Description',
    batchNo: 'Affected Batchlot Number',
    batchQty: 'Batchlot Quantity',
    applicant: 'Applicant',
    department: 'Department',
    supplier: 'Supplier + Supplier number (if applicable)',
    qnNo: 'Quality Notification No. (to be allocated by GWF QM)',
    qnNote: 'Die Quality-Notification-Nr. wird von GWF QM vergeben und bleibt im PDF leer.',
    s2: 'Problembeschreibung',
    s3: 'Ursache',
    s4: 'Disposition (Teile)',
    s5: 'Disposition (Prozess)',
    s6: 'Korrekturmaßnahmen',
    s7: 'Information an Vertrieb / Kunde',
    scrap: 'Verschrotten',
    rework: 'Nacharbeit',
    sorting: 'Sortieren (unter Sonderfreigabe)',
    useAsIs: 'Verwenden wie besehen',
    risk: 'Risikobewertung (zwingend)',
    otherDocs: 'Weitere Unterlagen',
    otherDocsText: 'Text auf der Punktlinie (eine Zeile)',
    details: 'Details (unter den Kontrollkästchen gedruckt)',
    stop: 'Stopp bis behoben',
    concession: 'Weiter mit Sonderfreigabe',
    ifConcession: 'Bei Sonderfreigabe:',
    until: 'Bis (Datum)',
    quantity: 'Menge (Anzahl)',
    toolRepair: 'Werkzeugreparatur',
    dfm: 'DFM',
    fai: 'FAI',
    cpk: 'Fähigkeitsuntersuchung (PpK)',
    cpkAll: 'alle kritischen Maße',
    cpkSelected: 'ausgewählte Maße',
    sample: 'Bemusterung',
    other: 'Sonstiges',
    psw: 'Neue PSW',
    infoSales: 'Information an den Vertrieb',
    infoCustomer: 'Information an den Kunden',
    yes: 'ja',
    no: 'nein',
    images: 'Angehängte Bilder',
    addImages: 'Bilder hinzufügen',
    dropHint: 'Dateien wählen, hierher ziehen oder mit Strg+V einfügen',
    remove: 'Entfernen',
    moveLeft: 'Nach vorn',
    moveRight: 'Nach hinten',
    imageError: 'Diese Datei konnte nicht als Bild gelesen werden.',
  },
}

const KEY = 'qn-lang'
const I18n = createContext({ lang: 'en', setLang: () => {}, t: (k) => k })

function initialLang() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'en' || saved === 'de') return saved
  } catch {
    /* storage unavailable */
  }
  return (navigator.language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en'
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(initialLang)
  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem(KEY, lang)
    } catch {
      /* ignore */
    }
  }, [lang])
  const t = (k) => dictionary[lang][k] ?? dictionary.en[k] ?? k
  return <I18n.Provider value={{ lang, setLang, t }}>{children}</I18n.Provider>
}

export const useI18n = () => useContext(I18n)
