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

// Example notification (taken from a filled-in form) for the "fill with sample data" button.
// Images are left out on purpose.
export const sampleData = {
  docTitle: '',
  date: '14.09.2026',
  partNo: '12.110008',
  partDesc: 'Impeller complet',
  qnNo: 'QN 26 - 043',
  batchNo: 'SO00087546 – 8 Stk\n(LT 15.09.2026)\n\nSO00088760 – 1 Stk\n(LT 16.09.2026)\n\nSO00089061 – 1 Stk\n(LT 18.09.2026)',
  batchQty: '10 pcs',
  applicant: 'Milosz Polrolnik',
  department: 'QOM',
  supplier: 'n/a',

  problem:
    'Following the switch from Janz as our supplier, we have now run out of impellers in production. As expected, the first attempt with Nimoulda to produce impellers using the cold-water mold GWF-2361 (12.080289) did not work, since the mold was designed for PP. In the second attempt using injection mold 4525, we were able to produce impellers that are sufficient for initial hydraulic testing. However, these exhibit significant dimensional deviations from the current drawing for part 12.110008. For example, the impeller diameter is approximately 0.9 mm larger, which results in a 6% increase in impeller rotation at the same adjustment. During the first hydraulic tests in the 220-mm body, however, the counters could be adjusted to fit just barely. Furthermore, Nimoulda is unable to perform the ultrasonic welding process previously used to secure the bearing sleeve. The dark color of the Ryton parts also suggests suboptimal injection molding parameters, which in turn could lead to the breakage of vanes in the area of the gate points.',
  images: [],
  fieldImages: {},
  rootCause: 'Hydraulic tests showed that the parts with the reworked diameter (Ø40) function properly.',

  parts: {
    scrap: false,
    rework: true,
    sorting: false,
    useAsIs: true,
    risk: true,
    otherDocs: false,
    otherDocsText: '',
    details:
      'SO00087546 – 8 Stk (LT 15.09.2026)\nSO00088760 – 1 Stk (LT 16.09.2026)\nSO00089061 – 1 Stk (LT 18.09.2026)\nSee also document (260817_Impeller Replacement 12.110008).',
  },
  process: {
    stop: false,
    concession: true,
    risk: false,
    otherDocs: false,
    otherDocsText: '',
    details: '',
    until: '',
    quantity: '10 pcs',
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
  infoSales: 'no',
  infoCustomer: 'no',
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
