// Test data for tools/render.mjs (node only)
import fs from 'node:fs'
import path from 'node:path'

const para = (n, tag) =>
  Array.from({ length: n }, (_, i) =>
    `${tag} Absatz ${i + 1}: Die Prüfung der Flügelräder ergab Maßabweichungen an der Außenkontur (Ø 12,5 mm – Toleranz ±0,05). ` +
    `Zażółć gęślą jaźń – Größe, Übermaß, Fräsen. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.`,
  ).join('\n')

const LONG_WORD = 'Seriennummer-' + 'ABCDEFGHIJ0123456789'.repeat(8)

const full = {
  docTitle: 'QN26-043_Ersatz für Flügelrad 12.110008 Qn 3.5',
  date: '29.09.2026',
  partNo: '12.110008',
  partDesc: 'Flügelrad, Messing, Ø 62 mm, mit Wellenbohrung und Passfeder (Ersatzteil für Wasserzähler Serie Q3.5)',
  batchNo: 'LT 15.09.2026 / 7654321',
  batchQty: '1.250 Stk',
  applicant: 'Miłosz Półrolnik',
  department: 'Qualitätssicherung / QM Lieferanten',
  supplier: 'Musterlieferant Präzisionsteile GmbH & Co. KG, Lieferantennr. 4711',
  problem: para(9, 'Problem') + '\n\n' + LONG_WORD,
  rootCause: para(12, 'Ursache'),
  parts: {
    scrap: true, rework: false, sorting: true, useAsIs: true, risk: true, otherDocs: true,
    otherDocsText: 'Prüfbericht 2026-0815 (siehe Anhang)',
    details: 'SO00087546 – 8 Stk (LT 15.09.2026)\nSee also document QN26-043 / Prüfplan rev. C.\n' + para(3, 'Teile'),
  },
  process: {
    stop: false, concession: true, risk: true, otherDocs: true,
    otherDocsText: 'Freigabe QM vom 28.09.2026',
    details: para(4, 'Prozess'), until: '31.12.2026', quantity: '1.250',
  },
  corrective: {
    toolRepair: true, dfm: true, fai: true, cpk: true, cpkAll: true, cpkSelected: true,
    cpkText: 'Merkmale 3, 5, 7 und 9', sample: true, other: true, psw: true,
    details: para(5, 'Maßnahme'),
  },
  infoSales: 'yes',
  infoCustomer: 'no',
}

const img = (n, w, h) => ({
  src: { data: fs.readFileSync(path.join(process.cwd(), '.work', `img${n}.jpg`)), format: 'jpg' },
  width: w,
  height: h,
})

export const scenarios = {
  empty: async () => ({}),
  full: async () => full,
  long: async () => ({ ...full, problem: para(40, 'Problem'), rootCause: para(25, 'Ursache') }),
  images: async () => ({
    ...full,
    problem: para(3, 'Problem'),
    rootCause: para(3, 'Ursache'),
    images: [img(1, 1200, 700), img(2, 900, 900), img(3, 1400, 500), img(4, 800, 1000), img(5, 1000, 600), img(6, 1100, 800)],
  }),
}
