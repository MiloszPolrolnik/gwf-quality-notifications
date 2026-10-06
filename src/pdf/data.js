// Shape of the data the PDF document renders. `emptyData` reproduces the blank
// template; the form UI edits a copy of it. Free texts may carry bold / italic /
// underline marks and inline images (see ../richText.js).
import { plainText } from '../richText.js'

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
  fieldImages: {}, // inline images of the formatted texts: { [id]: { src, width, height } }
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
  // Reviewer signatures { [role]: { src, date } }: filled in from the approvals, never stored in the form data.
  signatures: {},
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
  const part = plainText(data.partNo).trim().replace(/[^\p{L}\p{N}._-]+/gu, '_') || 'draft'
  return `Quality-Notification_${part}_${isoDate(d)}.pdf`
}

// Roles a reviewer can sign as = columns of section 8 (see pdf/sections/Section8.jsx).
export const ROLE_LABELS = {
  E: 'E (R + D)',
  SCM: 'SCM',
  P: 'P (Production)',
  GF: 'GF (Management Board)',
  QM: 'QM (Quality Management)',
  SALES: 'Sales',
}


// Approvals of the API -> the signatures the PDF prints.
export function signaturesFrom(approvals = []) {
  const out = {}
  for (const a of approvals) {
    if (a.signedAt && a.signature && a.role) out[a.role] = {
      src: a.signature,
      date: formatDate(new Date(a.signedAt)),
      // placement on the page (fractions); null for signatures made before placing existed
      page: a.sigPage ?? null,
      x: a.sigX,
      y: a.sigY,
      w: a.sigW,
      h: a.sigH,
    }
  }
  return out
}
