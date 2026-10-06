import React from 'react'
import { Document, Page, View, Text, Image } from '@react-pdf/renderer'
import { FONT_FAMILY } from './fonts.js'
import { DEFAULT_HEADER_TITLE, emptyData, formatDate } from './data.js'
import {
  PAGE_W,
  PAGE_H,
  PAGE_TOP,
  CONTENT_BOTTOM,
  FONT_SIZE,
  LINE_HEIGHT,
  RULE_LEFT,
  RULE_RIGHT,
  TABLE_LEFT,
  NUM_W,
  CONTENT_W,
  HEADER_RULE_Y,
  FOOTER_RULE_Y,
  HEADER_TEXT_TOP,
  LOGO,
  BLACK,
  W_THIN,
  PAGE1_TABLE_TOP,
} from './geometry.js'
import { clean } from './primitives.jsx'
import Section1 from './sections/Section1.jsx'
import Section2 from './sections/Section2.jsx'
import Section3 from './sections/Section3.jsx'
import Section4 from './sections/Section4.jsx'
import Section5 from './sections/Section5.jsx'
import Section6 from './sections/Section6.jsx'
import Section7 from './sections/Section7.jsx'
import Section8 from './sections/Section8.jsx'
import Section9_10 from './sections/Section9_10.jsx'

const RULE_W = RULE_RIGHT - RULE_LEFT
const TABLE_W = NUM_W + CONTENT_W
const abs = (left, top, extra) => ({ position: 'absolute', left, top, ...extra })

// Vertical offsets between a text's glyph top (as measured in the template)
// and the top of its react-pdf line box.
const HEADER_DY = 0.89
const FOOTER_DY = 0.89

// Repeats on every page: file name / document title, logo, rule.
function Header({ title, logoSrc }) {
  return (
    <View fixed style={abs(0, 0, { width: PAGE_W, height: 50 })}>
      <Text maxLines={1} style={abs(49.56, HEADER_TEXT_TOP - HEADER_DY, { width: 420 })}>
        {clean(title).replace(/\n/g, ' ') || DEFAULT_HEADER_TITLE}
      </Text>
      <Image src={logoSrc} style={abs(LOGO.left, LOGO.top, { width: LOGO.width, height: LOGO.height })} />
      <View style={abs(RULE_LEFT, HEADER_RULE_Y, { width: RULE_W, height: W_THIN, backgroundColor: BLACK })} />
    </View>
  )
}

// Repeats on every page: "Seite x / y" comes from the render prop.
function Footer({ generatedAt }) {
  return (
    <View fixed style={abs(0, FOOTER_RULE_Y - 1, { width: PAGE_W, height: 60 })}>
      <View style={abs(RULE_LEFT, 1, { width: RULE_W, height: W_THIN, backgroundColor: BLACK })} />
      <Text style={abs(49.56, 791.41 - FOOTER_RULE_Y + 1 - FOOTER_DY)}>Owner: QM  / Freigabe: 16.10.2020</Text>
      <Text
        style={abs(258.41, 791.41 - FOOTER_RULE_Y + 1 - FOOTER_DY)}
        render={({ pageNumber, totalPages }) => `Seite ${pageNumber} / ${totalPages}`}
      />
      <Text style={abs(437.02, 791.41 - FOOTER_RULE_Y + 1 - FOOTER_DY)}>Quelle: GWFWorX</Text>
      <Text style={abs(49.56, 804.37 - FOOTER_RULE_Y + 1 - FOOTER_DY)}>
        Verteiler: GWF / Unkontrollierte Ausgabe: {generatedAt}
      </Text>
    </View>
  )
}

// Signatures the reviewers placed on the document, positioned as fractions of the page.
function SignatureOverlay({ signatures = {} }) {
  const placed = Object.values(signatures).filter((s) => s.page != null)
  if (!placed.length) return null
  return (
    <View
      fixed
      style={abs(0, 0, { width: PAGE_W, height: PAGE_H })}
      render={({ pageNumber }) =>
        placed
          .filter((s) => s.page === pageNumber)
          .map((s, i) => (
            <Image
              key={i}
              src={s.src}
              style={abs(s.x * PAGE_W, s.y * PAGE_H, { width: s.w * PAGE_W, height: s.h * PAGE_H, objectFit: 'contain' })}
            />
          ))
      }
    />
  )
}

// Title on page 1 only; the table starts at the template's y=89.66.
function Title() {
  return (
    <View style={{ height: PAGE1_TABLE_TOP - PAGE_TOP, paddingTop: 0.52 }}>
      <Text style={{ fontSize: 16, marginLeft: 49.56 - RULE_LEFT }}>
        Quality Notification | <Text style={{ fontSize: 12 }}>(intern & extern)</Text>
      </Text>
    </View>
  )
}

const table = { width: TABLE_W, marginLeft: TABLE_LEFT - RULE_LEFT }

export default function QualityNotificationPdf({
  data = emptyData,
  logoSrc = '/gwf-logo.png',
  generatedAt = formatDate(),
}) {
  const d = { ...emptyData, ...data }
  return (
    <Document title={clean(d.docTitle) || 'DL05-F0987 - Quality Notification'} author="GWF" creator="GWF Quality Notification">
      <Page
        size={[PAGE_W, PAGE_H]}
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: FONT_SIZE,
          lineHeight: LINE_HEIGHT,
          color: BLACK,
          paddingTop: PAGE_TOP,
          paddingBottom: PAGE_H - CONTENT_BOTTOM,
          paddingLeft: RULE_LEFT,
          paddingRight: PAGE_W - RULE_RIGHT,
        }}
      >
        <Header title={d.docTitle} logoSrc={logoSrc} />
        <Footer generatedAt={generatedAt} />
        <SignatureOverlay signatures={d.signatures} />
        <Title />
        <View style={table}>
          <Section1 data={d} />
          <Section2 data={d} />
          <Section3 data={d} />
          <Section4 data={d} />
          <Section5 data={d} />
        </View>
        <View style={table}>
          <Section6 data={d} />
          <Section7 data={d} />
        </View>
        {/* Keep section 8 and its footnotes together, separately from sections 9 and 10. */}
        <View wrap={false} style={[table, { marginTop: 4.68 }]}>
          <Section8 signatures={d.signatures} />
          <View style={{ marginLeft: 54.6 - TABLE_LEFT, paddingTop: 0.4 }}>
            <Text style={{ fontSize: 6, lineHeight: 1.14, fontStyle: 'italic' }}>
              * Release only valid with signature of the Management Board + Quality Management
            </Text>
            <Text style={{ fontSize: 6, lineHeight: 1.14, fontStyle: 'italic' }}>
              **  In case the sales department is required to be informed
            </Text>
          </View>
        </View>
        <View wrap={false} style={[table, { marginTop: 2.15 }]}>
          <Section9_10 />
          <Text style={{ fontSize: 6, lineHeight: 1.14, marginLeft: 54.6 - TABLE_LEFT, marginTop: 2.34 }}>
            Ablage GWF: G\Publik\Q-Dokumente\Quality Notification
          </Text>
        </View>
      </Page>
    </Document>
  )
}
