import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import { Cell, Row, SectionHead, SectionBody, CheckItem, DottedNote, RichText, bold } from '../primitives.jsx'
import { S4, W_LINE, W_THICK, BLACK, NUM_W, CONTENT_W } from '../geometry.js'
import { ONE_PAGE, TEXT_W, richHeight } from '../measure.js'

// Positions are the origin of the template's checkbox glyph relative to the
// top-left of the box's text area (x from 83.42, y from the box's top line).
export const REGION_H = 75

// Wraps a whole section so it is never split across pages (`whole`), else a plain fragment.
// `close` draws the section's bottom line (it lies on the next section's top line, so it
// only shows when that section moved to the next page).
export function Keep({ whole, close = false, children }) {
  if (!whole) return <>{children}</>
  return (
    <View wrap={false}>
      {children}
      {close ? (
        <View style={{ position: 'absolute', left: 0, bottom: -W_THICK, width: NUM_W + CONTENT_W, height: W_THICK, backgroundColor: BLACK }} />
      ) : null}
    </View>
  )
}
const COL2 = 234.29

export default function Section4({ data }) {
  const d = data.parts
  const text = d.details
  // Details that fit on one page move as a whole to the next page when they do
  // not fit here; only longer texts are split.
  const note = d.otherDocs ? richHeight(d.otherDocsText, {}, TEXT_W - 281) : 0
  // A note too long for one page lets the checkbox block itself break across pages.
  const breakable = REGION_H + note > ONE_PAGE
  const whole = Math.max(S4.body - REGION_H - W_LINE, richHeight(text, data.fieldImages) + 4) + note <= ONE_PAGE
  return (
    <Keep whole={whole} close>
      {/* header + checkbox block stay together; details flow on their own */}
      <View wrap={breakable}>
      <SectionHead n={4} h={S4.head} presence={REGION_H + 20}>
        <Row top="none" style={{ flexGrow: 1 }}>
          <Cell grow style={bold}>
            <Text>Disposition (parts)</Text>
          </Cell>
        </Row>
      </SectionHead>
      <SectionBody>
        {/* Row B: checkbox block (unbreakable). Row C: details, grows and breaks across pages. */}
        <Row h={REGION_H + W_LINE} wrap={breakable}>
          <Cell grow style={{ paddingTop: 0 }}>
            <View wrap={breakable} style={{ minHeight: REGION_H }}>
              <CheckItem checked={d.scrap} label="Scrap" left={0} top={1.25} dx={11.04} />
              <CheckItem checked={d.rework} label="Rework" left={COL2} top={1.25} dx={10.2} />
              <CheckItem checked={d.sorting} label="Sorting (under Concession)" left={0} top={16.85} dx={10.32} />
              <CheckItem checked={d.useAsIs} label="Use as is" left={COL2 + 0.12} top={16.85} dx={10.2} />
              <CheckItem checked={d.risk} label="Risk assessment (mandatory)" left={266.93} top={32.33} dx={11.4} />
              <CheckItem checked={d.otherDocs} label="Other supporting documents" left={266.93} top={47.93} dx={11.4} />
              <DottedNote left={280.25} top={62.33} text={d.otherDocs ? d.otherDocsText : ''} />
            </View>
          </Cell>
        </Row>
      </SectionBody>
      </View>
      <SectionBody continued wrap={!whole}>
        <Row top="none" h={S4.body - REGION_H - W_LINE}>
          <Cell grow style={{ paddingTop: 2, paddingBottom: 2 }}>
            <RichText value={text} images={data.fieldImages} />
          </Cell>
        </Row>
      </SectionBody>
    </Keep>
  )
}
