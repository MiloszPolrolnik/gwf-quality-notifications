// Shape of the data the PDF document renders. `emptyData` reproduces the blank
// template; the form UI edits a copy of it.

export const DEFAULT_HEADER_TITLE = 'DL05-F0987 - Quality Notification.docx'

export const emptyData = {
  docTitle: '',
  date: '',
  partNo: '',
  partDesc: '',
  qnNo: '',
  batchNo: '',
  batchQty: '',
  applicant: '',
  department: '',
  supplier: '',

  problem: '',
  images: [], // [{ src: dataURL, width, height }]
  rootCause: '',

  parts: {
    scrap: false,
    rework: false,
    sorting: false,
    useAsIs: false,
    risk: false,
    otherDocs: false,
    otherDocsText: '',
    details: '',
  },
  process: {
    stop: false,
    concession: false,
    risk: false,
    otherDocs: false,
    otherDocsText: '',
    details: '',
    until: '',
    quantity: '',
  },
  corrective: {
    toolRepair: false,
    dfm: false,
    fai: false,
    cpk: false,
    cpkAll: false,
    cpkSelected: false,
    cpkText: '',
    sample: false,
    other: false,
    otherText: '',
    psw: false,
    details: '',
  },
  infoSales: '', // 'yes' | 'no' | ''
  infoCustomer: '',
}

export function formatDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`
}

export function isoDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function pdfFileName(data, d = new Date()) {
  const part = (data.partNo || '').trim().replace(/[^\p{L}\p{N}._-]+/gu, '_') || 'draft'
  return `Quality-Notification_${part}_${isoDate(d)}.pdf`
}
