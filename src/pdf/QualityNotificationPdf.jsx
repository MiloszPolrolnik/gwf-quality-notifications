import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'

// Disable automatic word-hyphenation so narrow header cells wrap on spaces only
Font.registerHyphenationCallback((word) => [word])

// ---------------------------------------------------------------------------
// Layout constants (all values in pt; A4 = 595.28 x 841.89 pt)
// ---------------------------------------------------------------------------
const PAGE_PADDING = 24
const CONTENT_WIDTH = 595.28 - PAGE_PADDING * 2

// Column ratios below are taken directly from the source DOCX's table grid
// (word/document.xml tcW values), not eyeballed from the rendered PDF. There
// is a single left-hand column (num) shared by every section: for sections
// 1-3 it holds the section number for just the header row, then a
// vertically-merged cell below it holds the rotated "To be filled out by
// applicant" label - there is no separate second column.
const NUM_COL_W = CONTENT_WIDTH * (22.4 / 504.8)
const CONTENT_COL_W = CONTENT_WIDTH - NUM_COL_W
const HALF_W = CONTENT_COL_W / 2

// Section 1's 5 data columns: Date | GWF Part No. | Part Description | Affected Batchlot Number | Batchlot Quantity
const S1_DATE_W = CONTENT_COL_W * (40 / 482.4)
const S1_PARTNO_W = CONTENT_COL_W * (94.7 / 482.4)
const S1_PARTDESC_W = CONTENT_COL_W * (191.3 / 482.4)
const S1_BATCHNO_W = CONTENT_COL_W * (78 / 482.4)
const S1_BATCHQTY_W = CONTENT_COL_W * (78 / 482.4)

// Adjacent cells each draw their own border, so a shared edge between two
// stacked/side-by-side cells renders at roughly 2x BORDER (both strokes sit
// next to each other). The table's outer frame must stay clearly heavier than
// that doubled-up worst case, or every line in the PDF reads as the same
// weight - hence the widening gap between BORDER and the table border below.
const BORDER = 0.5
const FONT_SIZE = 8

const today = new Date()
const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(
  today.getMonth() + 1,
).padStart(2, '0')}.${today.getFullYear()}`

const styles = StyleSheet.create({
  page: {
    paddingTop: PAGE_PADDING,
    paddingBottom: PAGE_PADDING,
    paddingHorizontal: PAGE_PADDING,
    fontFamily: 'Helvetica',
    fontSize: FONT_SIZE,
    color: '#000000',
    flexDirection: 'column',
  },
  footerPinned: {
    position: 'absolute',
    bottom: PAGE_PADDING,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
  },
  headerWrap: {
    position: 'relative',
  },
  headerFileName: {
    fontSize: 7,
  },
  headerLogo: {
    position: 'absolute',
    top: -19,
    right: 0,
    width: 72,
    height: 35.5,
    objectFit: 'contain',
  },
  headerRule: {
    borderBottomWidth: 0.75,
    borderBottomColor: '#000000',
    marginTop: 6,
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    marginTop: 14,
    marginBottom: 6,
  },
  titleSub: {
    fontSize: 11,
  },
  footerRule: {
    borderTopWidth: 0.5,
    borderTopColor: '#000000',
    marginBottom: 3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
  },
  footerRow2: {
    fontSize: 7,
    marginTop: 2,
  },
  table: {
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  sectionRow: {
    flexDirection: 'row',
  },
  numCell: {
    width: NUM_COL_W,
    borderWidth: BORDER,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  numCellTop: {
    justifyContent: 'flex-start',
    paddingTop: 5,
  },
  labelCell: {
    borderWidth: BORDER,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  contentCol: {
    flexDirection: 'column',
  },
  cell: {
    borderWidth: BORDER,
    borderColor: '#000000',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  small: {
    fontSize: 6.5,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxSquare: {
    width: 7,
    height: 7,
    borderWidth: BORDER,
    borderColor: '#000000',
    marginRight: 4,
  },
  // The table's own outer border already draws the right edge of the form.
  // Any content cell that reaches that same edge must not also draw its own
  // right border - two independent borders sitting on (almost) the same
  // coordinate render as a faint doubled line once rasterized. Applied to
  // every cell that is the last (rightmost) column in its row.
  flush: {
    borderRightWidth: 0,
  },
  footnote: {
    fontSize: 6,
  },
})

function SectionNum({ n }) {
  return (
    <View style={[styles.numCell, styles.numCellTop]}>
      <Text>{n}</Text>
    </View>
  )
}

// Matches the source table exactly: the number occupies the left column only
// for the height of the header row; a second, vertically-merged cell below it
// (spanning the rest of the section's rows) holds the rotated label.
function NumberAndLabel({ n, headerHeight, labelHeight, label = 'To be filled out by applicant' }) {
  return (
    <View style={{ width: NUM_COL_W }}>
      <View style={[styles.numCell, { width: NUM_COL_W, height: headerHeight }]}>
        <Text>{n}</Text>
      </View>
      <View style={[styles.labelCell, { width: NUM_COL_W, height: labelHeight }]}>
        <Text
          style={{
            fontSize: 7,
            fontStyle: 'italic',
            transform: 'rotate(-90deg)',
            width: labelHeight - 8,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  )
}

function Checkbox({ label, style, labelStyle }) {
  return (
    <View style={[styles.checkboxRow, style]}>
      <View style={styles.checkboxSquare} />
      <Text style={labelStyle}>{label}</Text>
    </View>
  )
}

function DottedLine({ style }) {
  return (
    <Text style={[{ fontSize: FONT_SIZE }, style]}>
      {'.'.repeat(60)}
    </Text>
  )
}

// ---------------------------------------------------------------------------
// Header / Footer
// ---------------------------------------------------------------------------
function FormHeader({ logoSrc, withTitle = true }) {
  return (
    <View fixed>
      <View style={styles.headerWrap}>
        <Text style={styles.headerFileName}>DL05-F0987 - Quality Notification.docx</Text>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image style={styles.headerLogo} src={logoSrc} />
      </View>
      <View style={styles.headerRule} />
      {withTitle ? (
        <Text style={styles.title}>
          Quality Notification | <Text style={styles.titleSub}>(intern &amp; extern)</Text>
        </Text>
      ) : null}
    </View>
  )
}

function FormFooter({ page }) {
  return (
    <View style={styles.footerPinned}>
      <View style={styles.footerRule} />
      <View style={styles.footerRow}>
        <Text>Owner: QM / Freigabe: 16.10.2020</Text>
        <Text>Seite {page} / 2</Text>
        <Text>Quelle: GWFWorX</Text>
      </View>
      <Text style={styles.footerRow2}>
        Verteiler: GWF / Unkontrollierte Ausgabe: {todayStr}
      </Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Section 1
// ---------------------------------------------------------------------------
const S1_HEADER_H = 24
const S1_ROW_HEIGHTS = [20, 16, 16, 20, 16, 20] // empty date row, QNNo, Applicant/Dept header, value, Supplier label, value
const S1_LABEL_H = S1_ROW_HEIGHTS.reduce((a, b) => a + b, 0)

function Section1() {
  return (
    <View style={styles.sectionRow}>
      <NumberAndLabel n={1} headerHeight={S1_HEADER_H} labelHeight={S1_LABEL_H} />
      <View style={styles.contentCol}>
        <View style={{ flexDirection: 'row' }}>
          <View style={[styles.cell, styles.bold, { width: S1_DATE_W, height: S1_HEADER_H }]}>
            <Text>Date</Text>
          </View>
          <View style={[styles.cell, styles.bold, { width: S1_PARTNO_W, height: S1_HEADER_H }]}>
            <Text>GWF Part No.</Text>
          </View>
          <View style={[styles.cell, styles.bold, { width: S1_PARTDESC_W, height: S1_HEADER_H }]}>
            <Text>Part Description</Text>
          </View>
          <View style={[styles.cell, styles.bold, { width: S1_BATCHNO_W, height: S1_HEADER_H }]}>
            <Text>Affected Batchlot Number</Text>
          </View>
          <View style={[styles.cell, styles.bold, styles.flush, { width: S1_BATCHQTY_W, height: S1_HEADER_H }]}>
            <Text>Batchlot Quantity</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <View style={[styles.cell, { width: S1_DATE_W, height: S1_ROW_HEIGHTS[0] }]} />
          <View style={[styles.cell, { width: S1_PARTNO_W, height: S1_ROW_HEIGHTS[0] }]} />
          <View style={[styles.cell, { width: S1_PARTDESC_W, height: S1_ROW_HEIGHTS[0] }]} />
          <View style={[styles.cell, { width: S1_BATCHNO_W, height: S1_ROW_HEIGHTS[0] }]} />
          <View style={[styles.cell, styles.flush, { width: S1_BATCHQTY_W, height: S1_ROW_HEIGHTS[0] }]} />
        </View>
        <View style={{ flexDirection: 'row' }}>
          <View style={[styles.cell, styles.bold, { width: HALF_W, height: S1_ROW_HEIGHTS[1] }]}>
            <Text>
              Quality Notification No.{' '}
              <Text style={{ fontFamily: 'Helvetica' }}>(to be allocated by GWF QM)</Text>
            </Text>
          </View>
          <View style={[styles.cell, styles.flush, { width: HALF_W, height: S1_ROW_HEIGHTS[1] }]} />
        </View>
        <View style={{ flexDirection: 'row' }}>
          <View style={[styles.cell, styles.bold, { width: HALF_W, height: S1_ROW_HEIGHTS[2] }]}>
            <Text>Applicant</Text>
          </View>
          <View style={[styles.cell, styles.bold, styles.flush, { width: HALF_W, height: S1_ROW_HEIGHTS[2] }]}>
            <Text>Department</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <View style={[styles.cell, { width: HALF_W, height: S1_ROW_HEIGHTS[3] }]} />
          <View style={[styles.cell, styles.flush, { width: HALF_W, height: S1_ROW_HEIGHTS[3] }]} />
        </View>
        <View style={{ flexDirection: 'row' }}>
          <View style={[styles.cell, styles.bold, styles.flush, { width: CONTENT_COL_W, height: S1_ROW_HEIGHTS[4] }]}>
            <Text>
              Supplier + Supplier number{' '}
              <Text style={{ fontFamily: 'Helvetica' }}>(if applicable)</Text>
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <View style={[styles.cell, styles.flush, { width: CONTENT_COL_W, height: S1_ROW_HEIGHTS[5] }]} />
        </View>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Section 2 - Problem Description
// ---------------------------------------------------------------------------
const S2_HEADER_H = 16
const S2_BOX_H = 90
const S2_PICTURES_H = 30

function Section2() {
  return (
    <View style={styles.sectionRow}>
      <NumberAndLabel n={2} headerHeight={S2_HEADER_H} labelHeight={S2_BOX_H + S2_PICTURES_H} />
      <View style={styles.contentCol}>
        <View style={[styles.cell, styles.bold, styles.flush, { width: CONTENT_COL_W, height: S2_HEADER_H }]}>
          <Text>Problem Description</Text>
        </View>
        <View style={[styles.cell, styles.flush, { width: CONTENT_COL_W, height: S2_BOX_H }]} />
        <View style={[styles.cell, styles.flush, { width: CONTENT_COL_W, height: S2_PICTURES_H }]}>
          <Text>Attached Pictures:</Text>
        </View>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Section 3 - Root Cause
// ---------------------------------------------------------------------------
const S3_HEADER_H = 16
const S3_BOX_H = 130

function Section3() {
  return (
    <View style={styles.sectionRow}>
      <NumberAndLabel n={3} headerHeight={S3_HEADER_H} labelHeight={S3_BOX_H} />
      <View style={styles.contentCol}>
        <View style={[styles.cell, styles.bold, styles.flush, { width: CONTENT_COL_W, height: S3_HEADER_H }]}>
          <Text>Root Cause</Text>
        </View>
        <View style={[styles.cell, styles.flush, { width: CONTENT_COL_W, height: S3_BOX_H }]} />
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Section 4 - Disposition (parts)
// ---------------------------------------------------------------------------
function Section4() {
  const half = HALF_W
  return (
    <View style={styles.sectionRow}>
      <SectionNum n={4} />
      <View style={styles.contentCol}>
        <View style={[styles.cell, styles.flush, { width: CONTENT_COL_W }]}>
          <Text style={styles.bold}>Disposition (parts)</Text>
        </View>
        <View style={[styles.cell, styles.flush, { width: CONTENT_COL_W, flexDirection: 'row', minHeight: 100 }]}>
          <View style={{ width: half }}>
            <Checkbox label="Scrap" />
            <Checkbox label="Sorting (under Concession)" style={{ marginTop: 6 }} />
          </View>
          <View style={{ width: half }}>
            <Checkbox label="Rework" />
            <Checkbox label="Use as is" style={{ marginTop: 6 }} />
            <Checkbox label="Risk assessment (mandatory)" style={{ marginTop: 4, paddingLeft: 14 }} />
            <Checkbox label="Other supporting documents" style={{ marginTop: 3, paddingLeft: 14 }} />
            <DottedLine style={{ marginTop: 3, paddingLeft: 14, width: half }} />
          </View>
        </View>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Section 5 - Disposition (process)
// ---------------------------------------------------------------------------
function Section5() {
  const half = HALF_W
  return (
    <View style={styles.sectionRow}>
      <SectionNum n={5} />
      <View style={styles.contentCol}>
        <View style={[styles.cell, styles.flush, { width: CONTENT_COL_W }]}>
          <Text style={styles.bold}>Disposition (process)</Text>
        </View>
        <View style={[styles.cell, styles.flush, { width: CONTENT_COL_W, flexDirection: 'row', minHeight: 90 }]}>
          <View style={{ width: half }}>
            <Checkbox label="Stop until fixed" />
          </View>
          <View style={{ width: half }}>
            <Checkbox label="Continue with Concession" />
            <Checkbox label="Risk assessment (mandatory)" style={{ marginTop: 4, paddingLeft: 14 }} />
            <Checkbox label="Other supporting documents" style={{ marginTop: 3, paddingLeft: 14 }} />
            <DottedLine style={{ marginTop: 3, paddingLeft: 14, width: half }} />
          </View>
        </View>
        <View style={[styles.cell, styles.flush, { width: CONTENT_COL_W }]}>
          <Text style={styles.bold}>If concession:</Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <View style={[styles.cell, styles.bold, { width: half, height: 16 }]}>
            <Text>Until (date)</Text>
          </View>
          <View style={[styles.cell, styles.bold, styles.flush, { width: half, height: 16 }]}>
            <Text>Quantity (number)</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <View style={[styles.cell, { width: half, height: 18 }]} />
          <View style={[styles.cell, styles.flush, { width: half, height: 18 }]} />
        </View>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Section 6 - Corrective Actions (page 2)
// ---------------------------------------------------------------------------
function Section6() {
  return (
    <View style={styles.sectionRow}>
      <SectionNum n={6} />
      <View style={styles.contentCol}>
        <View style={[styles.cell, styles.flush, { width: CONTENT_COL_W }]}>
          <Text style={styles.bold}>Corrective Actions</Text>
        </View>
        <View style={[styles.cell, styles.flush, { width: CONTENT_COL_W }]}>
          <View style={{ flexDirection: 'row' }}>
            <Checkbox label="Tool repair" style={{ width: HALF_W, marginTop: 2 }} />
            <View style={{ width: HALF_W }} />
          </View>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: HALF_W }} />
            <View style={{ width: HALF_W }}>
              <Checkbox label="DFM" style={{ marginTop: 10 }} />
              <Checkbox label="FAI" style={{ marginTop: 6 }} />
              <Checkbox label="Capability Study (PpK)" style={{ marginTop: 6 }} />
              <Checkbox label="all critical dimensions" style={{ marginTop: 6, paddingLeft: 28 }} />
              <Checkbox label="selected dimensions" style={{ marginTop: 6, paddingLeft: 28 }} />
              <DottedLine style={{ marginTop: 16, width: HALF_W }} />
              <Checkbox label="Sample submission" style={{ marginTop: 10 }} />
            </View>
          </View>
          <Checkbox label="other" style={{ marginTop: 16 }} />
          <Checkbox label="New PSW" style={{ marginTop: 10 }} />
          <View style={{ height: 8 }} />
        </View>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Section 7 - Information to sales / customer
// ---------------------------------------------------------------------------
function InfoRow({ label, caption }) {
  return (
    <View style={[styles.cell, styles.flush, { flexDirection: 'row', width: CONTENT_COL_W, padding: 0 }]}>
      <View style={{ flex: 1, paddingHorizontal: 4, paddingVertical: 2 }}>
        <Text style={styles.bold}>{label}</Text>
        <Text style={styles.small}>{caption}</Text>
      </View>
      <View style={{ width: 150, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}>
        <Checkbox label="ja / yes" style={{ marginRight: 14 }} />
        <Checkbox label="nein / no" />
      </View>
    </View>
  )
}

function Section7() {
  return (
    <View style={styles.sectionRow}>
      <SectionNum n={7} />
      <View style={styles.contentCol}>
        <InfoRow label="Information to the sales department:" caption="For information only" />
        <InfoRow label="Information to the customer:" caption="Sales communicates towards customer" />
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Section 8 - Signatures table
// ---------------------------------------------------------------------------
const SIG_COLS = [
  { key: 'rowlabel', label: '' },
  { key: 'e', label: 'E (R + D)', italic: false },
  { key: 'scm', label: 'SCM', italic: false },
  { key: 'p', label: 'P (Production)', italic: true },
  { key: 'gf', label: '*GF (Management Board)', italic: true },
  { key: 'qm', label: '*QM (Quality Management)', italic: true },
  { key: 'sales', label: '**Sales', italic: false },
]

function Section8() {
  const fixedW = CONTENT_COL_W * (63 / 482.4) // ratio taken from the source table's row-label column
  const otherW = (CONTENT_COL_W - fixedW) / (SIG_COLS.length - 1)

  return (
    <>
      <View style={[styles.sectionRow, { marginTop: 5 }]}>
        <SectionNum n={8} />
        <View style={styles.contentCol}>
          <View style={{ flexDirection: 'row' }}>
            {SIG_COLS.map((c, i) => (
              <View
                key={c.key}
                style={[
                  styles.cell,
                  i === SIG_COLS.length - 1 ? styles.flush : null,
                  { width: i === 0 ? fixedW : otherW, height: 34, justifyContent: 'center' },
                ]}
              >
                {c.label ? (
                  <Text
                    style={{
                      fontFamily: c.italic ? 'Helvetica-BoldOblique' : 'Helvetica-Bold',
                      textAlign: 'center',
                      fontSize: 7,
                    }}
                  >
                    {c.label}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row' }}>
            {SIG_COLS.map((c, i) => (
              <View
                key={c.key}
                style={[
                  styles.cell,
                  i === SIG_COLS.length - 1 ? styles.flush : null,
                  { width: i === 0 ? fixedW : otherW, height: 20 },
                ]}
              >
                {i === 0 ? <Text style={styles.bold}>Signature</Text> : null}
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row' }}>
            {SIG_COLS.map((c, i) => (
              <View
                key={c.key}
                style={[
                  styles.cell,
                  i === SIG_COLS.length - 1 ? styles.flush : null,
                  { width: i === 0 ? fixedW : otherW, height: 20 },
                ]}
              >
                {i === 0 ? <Text style={styles.bold}>Date</Text> : null}
              </View>
            ))}
          </View>
        </View>
      </View>
      {/* The source table leaves these two footnote lines unboxed, floating
          below the signature grid rather than inside its border - the visual
          gap before section 9 comes from this text, not from a margin. */}
      <Text style={[styles.footnote, { marginTop: 1 }]}>
        * Release only valid with signature of the Management Board + Quality Management
      </Text>
      <Text style={[styles.footnote, { marginTop: 1 }]}>
        ** In case the sales department is required to be informed
      </Text>
    </>
  )
}

// ---------------------------------------------------------------------------
// Section 9 - Customer approval
// ---------------------------------------------------------------------------
function Section9() {
  const w1 = CONTENT_COL_W * 0.455
  const w2 = CONTENT_COL_W * 0.279
  const w3 = CONTENT_COL_W * 0.266
  return (
    <View style={[styles.sectionRow, { marginTop: 2 }]}>
      <SectionNum n={9} />
      <View style={{ flexDirection: 'row' }}>
        <View style={[styles.cell, styles.bold, { width: w1, height: 34 }]}>
          <Text>
            Customer approval <Text style={{ fontFamily: 'Helvetica' }}>(if applicable)</Text>
          </Text>
        </View>
        <View style={[styles.cell, styles.bold, { width: w2, height: 34 }]}>
          <Text>Name</Text>
        </View>
        <View style={[styles.cell, styles.bold, styles.flush, { width: w3, height: 34 }]}>
          <Text>Signature</Text>
        </View>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Section 10 - Check Execution/Completion
// ---------------------------------------------------------------------------
function Section10() {
  const w1 = CONTENT_COL_W * 0.455
  const w2 = CONTENT_COL_W * 0.279
  const w3 = CONTENT_COL_W * 0.266
  return (
    <View style={styles.sectionRow}>
      <SectionNum n={10} />
      <View style={{ flexDirection: 'row' }}>
        <View style={[styles.cell, styles.bold, { width: w1, height: 34 }]}>
          <Text>Check Execution/Completion</Text>
        </View>
        <View style={[styles.cell, styles.bold, { width: w2, height: 34 }]}>
          <Text>Signature</Text>
        </View>
        <View style={[styles.cell, styles.flush, { width: w3, height: 34 }]}>
          <Checkbox label="Status completed   ja / yes" />
        </View>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------
export default function QualityNotificationPdf({ logoSrc = '/gwf-logo.png' }) {
  return (
    <Document title="DL05-F0987 - Quality Notification">
      <Page size="A4" style={styles.page}>
        <FormHeader logoSrc={logoSrc} />
        <View style={styles.table}>
          <Section1 />
          <Section2 />
          <Section3 />
          <Section4 />
          <Section5 />
        </View>
        <FormFooter page={1} />
      </Page>
      <Page size="A4" style={styles.page}>
        <FormHeader logoSrc={logoSrc} withTitle={false} />
        <View style={[styles.table, { marginTop: 16 }]}>
          <Section6 />
          <Section7 />
          <Section8 />
          <Section9 />
          <Section10 />
        </View>
        <Text style={{ fontSize: 7, marginTop: 4 }}>
          Ablage GWF: G\Publik\Q-Dokumente\Quality Notification
        </Text>
        <FormFooter page={2} />
      </Page>
    </Document>
  )
}
