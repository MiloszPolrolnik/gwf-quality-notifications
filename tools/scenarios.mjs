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

const words150 =
  Array.from({ length: 9 }, (_, i) =>
    `Satz ${i + 1}: Bei der Wareneingangsprüfung wurden Abweichungen an der Außenkontur festgestellt, die Ursache liegt im Werkzeugverschleiß der Stanze und in der Überschreitung der Toleranz ±0,05 mm.`,
  ).join(' ') + ' https://example.com/qualitaet/meldung/QN26-043/anhang/pruefbericht-2026-0815-rev-c-final-version-with-a-very-long-unbroken-address';

const emptyish = () => ({
  parts: { scrap: true, rework: false, sorting: false, useAsIs: true, risk: true, otherDocs: false, otherDocsText: '', details: '' },
  process: { stop: false, concession: true, risk: false, otherDocs: false, otherDocsText: '', details: '', until: '', quantity: '' },
  corrective: { toolRepair: true, dfm: false, fai: false, cpk: false, cpkAll: false, cpkSelected: false, cpkText: '', sample: false, other: true, psw: true, details: '' },
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
  // bug-regression scenarios: ~150 words incl. an unbroken URL
  allLong: async () => ({
    ...emptyish(),
    problem: words150,
    rootCause: words150,
    parts: { ...emptyish().parts, details: words150 },
    process: { ...emptyish().process, details: words150 },
    corrective: { ...emptyish().corrective, details: words150 },
    images: [img(1, 1200, 700), img(2, 900, 900)],
  }),
  // multi-line texts next to "other supporting documents" / "selected dimensions" / "other"
  notes: async () => ({
    ...full,
    parts: { ...full.parts, otherDocsText: 'Prüfbericht 2026-0815\nMessprotokoll Los 4711\nFoto-Doku ' + LONG_WORD.slice(0, 40) },
    process: { ...full.process, otherDocsText: 'Freigabe QM vom 28.09.2026\nFreigabe Kunde' },
    corrective: {
      ...full.corrective,
      cpkText: 'Merkmale 3, 5, 7 und 9\nzusätzlich Merkmal 12\nund 14',
      otherText: 'Sonderprüfung durch Kunde\nmit Bericht bis KW 42\nund Rückmeldung',
    },
  }),
  // texts that fit on one page but not in the space left after the previous section
  mid: async () => ({ ...full, problem: para(14, 'Problem'), rootCause: para(20, 'Ursache') }),
  // bold / italic / underline and inline images in the free texts
  rich: async () => {
    const B = '\uE001', I = '\uE002', U = '\uE003'
    const tok = (id) => `\uE004${id}\uE005`
    const fieldImages = { a: img(1, 1200, 700), b: img(2, 900, 900) }
    return {
      ...full,
      partNo: `${B}12.110008${B}`,
      fieldImages,
      problem: `${B}Wichtig:${B} dies ist ${I}kursiv${I}, ${U}unterstrichen${U} und ${B}${I}${U}alles zusammen${U}${I}${B}.\n${para(3, 'Problem')}\n${tok('a')}\nText nach dem Bild.\n\n${tok('b')}\n${para(2, 'Ende')}`,
      rootCause: `${B}Ursache${B}\n` + para(2, 'U'),
      parts: { ...full.parts, details: `${U}Details${U}\n${tok('a')}` },
      images: [img(3, 1000, 600), img(4, 800, 1000)],
    }
  },
  only6: async () => ({ ...emptyish(), corrective: { ...emptyish().corrective, details: words150 } }),
  only4: async () => ({ ...emptyish(), parts: { ...emptyish().parts, details: words150 } }),
}
