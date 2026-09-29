import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import { Cell, Row, SectionHead, SectionBody, CheckItem, DottedLine, bold, clean } from '../primitives.jsx'
import { S4, W_LINE } from '../geometry.js'

// Positions are the origin of the template's checkbox glyph relative to the
// top-left of the box's text area (x from 83.42, y from the box's top line).
export const REGION_H = 75
const COL2 = 234.29

export default function Section4({ data }) {
  const d = data.parts
  return (
    <>
      {/* header + checkbox block stay together; details flow on their own */}
      <View wrap={false}>
      <SectionHead n={4} h={S4.head} presence={REGION_H + 20}>
        <Row top="none" style={{ flexGrow: 1 }}>
          <Cell grow style={bold}>
            <Text>Disposition (parts)</Text>
          </Cell>
        </Row>
      </SectionHead>
      <SectionBody>
        {/* Row B: checkbox block (unbreakable). Row C: details, grows and breaks across pages. */}
        <Row h={REGION_H + W_LINE} wrap={false}>
          <Cell grow style={{ paddingTop: 0 }}>
            <View wrap={false} style={{ height: REGION_H }}>
              <CheckItem checked={d.scrap} label="Scrap" left={0} top={1.25} dx={11.04} />
              <CheckItem checked={d.rework} label="Rework" left={COL2} top={1.25} dx={10.2} />
              <CheckItem checked={d.sorting} label="Sorting (under Concession)" left={0} top={16.85} dx={10.32} />
              <CheckItem checked={d.useAsIs} label="Use as is" left={COL2 + 0.12} top={16.85} dx={10.2} />
              <CheckItem checked={d.risk} label="Risk assessment (mandatory)" left={266.93} top={32.33} dx={11.4} />
              <CheckItem checked={d.otherDocs} label="Other supporting documents" left={266.93} top={47.93} dx={11.4} />
              <DottedLine left={280.25} top={62.33} text={d.otherDocsText} />
            </View>
          </Cell>
        </Row>
      </SectionBody>
      </View>
      <SectionBody continued>
        <Row top="none" h={S4.body - REGION_H - W_LINE}>
          <Cell grow style={{ paddingTop: 2, paddingBottom: 2 }}>
            <Text>{clean(d.details)}</Text>
          </Cell>
        </Row>
      </SectionBody>
    </>
  )
}
