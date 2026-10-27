import { qnTracking, sfTracking } from '../api.js'

// Column headers stay German in both languages, as in the original Excel.
// edit: how a cell is changed by hand ('line' = one line, 'text' = several lines, 'list' = choose, 'date').
const STATES = ['offen', 'freigegeben', 'abgeschlossen']
const common = [
  { key: 'partNo', label: 'Artikelnummer', width: 130, edit: 'line' },
  { key: 'partDesc', label: 'Artikelbezeichnung', width: 180, edit: 'text' },
  { key: 'supplierNo', label: 'Lieferanten-Nr', width: 90, edit: 'line' },
  { key: 'supplierName', label: 'Lieferant', width: 130, edit: 'line' },
  { key: 'reason', label: 'Begründung', width: 380, edit: 'text' },
  { key: 'measures', label: 'Massnahmen', width: 320, edit: 'text' },
]

// Quality Notifications Tracking (created in the app or imported) and Sonderfreigaben Tracking (typed in / imported).
export const KINDS = {
  qn: {
    api: qnTracking,
    titleKey: 'qualityTracking',
    route: 'tracking',
    sheetTitle: 'GWF Quality Notification Tracking',
    fileName: (year) => `QN_Tracking_${year}.xlsx`,
    columns: [
      { key: 'qnNo', label: 'QN-Nr.', width: 100, edit: 'line' },
      { key: 'pswType', label: 'PSW (Serie/Projekt)', width: 90, edit: 'list', options: ['Serie', 'Projekt'] },
      ...common,
      { key: 'releaseUntilOrQty', label: 'Freigabe bis / oder Menge', width: 150, edit: 'text' },
      { key: 'responsible', label: 'Verantwortung', width: 100, edit: 'line' },
      { key: 'doku', label: 'Doku', width: 56, sortKey: 'hasPdf' },
      { key: 'status', label: 'Status', width: 100, edit: 'list', options: STATES },
      { key: 'tracking', label: 'Tracking', width: 100, edit: 'list', options: STATES },
    ],
  },
  sf: {
    api: sfTracking,
    titleKey: 'sonderfreigabenTracking',
    route: 'sonderfreigaben',
    sheetTitle: 'GWF Sonderfreigaben Tracking',
    fileName: (year) => `Sonderfreigaben_Tracking_${year}.xlsx`,
    columns: [
      { key: 'qnNo', label: 'SFR-Nr.', width: 100, edit: 'line' },
      { key: 'pswType', label: 'PSW (Serie/Projekt)', width: 90, edit: 'line' },
      ...common,
      { key: 'releaseUntilOrQty', label: 'Freigabe bis / Menge', width: 150, edit: 'text' },
      { key: 'responsible', label: 'Verantwortung', width: 130, edit: 'line' },
      { key: 'doku', label: 'Doku', width: 70, edit: 'line' },
      { key: 'status', label: 'Status', width: 80, edit: 'line' },
      { key: 'tracking', label: 'Tracking', width: 100, edit: 'list', options: STATES },
    ],
  },
}
