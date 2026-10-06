import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import { Cell, Row, SectionHead, SectionBody, CheckItem, DottedNote, RichText, bold } from '../primitives.jsx'
import { S5, W_THICK, W_LINE, PAD_X } from '../geometry.js'
import { ONE_PAGE, TEXT_W, richHeight } from '../measure.js'

// "Until" / "Quantity" split at x=315.07 (not at the half of the column)
const UNTIL_W = 315.07 - 77.42
import { REGION_H } from './Section4.jsx'

const COL2 = 234.77

export default function Section5({ data }) {
  const d = data.process
  const text = d.details
  // Details that fit on one page move as a whole to the next page when they do
  // not fit here; only longer texts are split. The "If concession" block follows.
  // The estimate includes the (possibly long) note of "other supporting documents".
  const note = d.otherDocs ? richHeight(d.otherDocsText, {}, TEXT_W - 281) : 0
  const untilH = Math.max(
    S5.untilVal,
    richHeight(d.until, {}, UNTIL_W - 2 * PAD_X - 2),
    richHeight(d.quantity, {}, TEXT_W - UNTIL_W),
  )
  const whole =
    Math.max(S5.body - REGION_H - W_LINE, richHeight(text, data.fieldImages) + 4) + note + S5.concession + S5.untilHead + untilH <= ONE_PAGE
  // A note too long for one page lets the checkbox block itself break across pages.
  const breakable = REGION_H + note > ONE_PAGE
  const head = (
    <SectionHead n={5} h={S5.head} presence={REGION_H + 20}>
      <Row top="none" style={{ flexGrow: 1 }}>
        <Cell grow style={bold}>
          <Text>Disposition (process)</Text>
        </Cell>
      </Row>
    </SectionHead>
  )
  const checks = (
    <SectionBody>
      <Row h={REGION_H + W_LINE} wrap={breakable}>
        <Cell grow style={{ paddingTop: 0 }}>
          <View wrap={breakable} style={{ minHeight: REGION_H }}>
            <CheckItem checked={d.stop} label="Stop until fixed" left={0} top={1.25} dx={11.04} />
            <CheckItem checked={d.concession} label="Continue with Concession" left={COL2} top={1.25} dx={10.92} />
            <CheckItem checked={d.risk} label="Risk assessment (mandatory)" left={266.93} top={16.85} dx={11.4} />
            <CheckItem checked={d.otherDocs} label="Other supporting documents" left={266.93} top={32.33} dx={11.4} />
            <DottedNote left={280.25} top={46.85} text={d.otherDocs ? d.otherDocsText : ''} />
          </View>
        </Cell>
      </Row>
    </SectionBody>
  )
  const rest = (
    <>
      <SectionBody continued wrap={!whole}>
        <Row top="none" h={S5.body - REGION_H - W_LINE}>
          <Cell grow style={{ paddingTop: 2, paddingBottom: 2 }}>
            <RichText value={text} images={data.fieldImages} />
          </Cell>
        </Row>
        <View wrap={!whole}>
          <Row h={S5.concession}>
            <Cell grow style={bold}>
              <Text>If concession:</Text>
            </Cell>
          </Row>
          <Row h={S5.untilHead}>
            <Cell w={UNTIL_W}>
              <Text>Until (date)</Text>
            </Cell>
            <Cell grow>
              <Text>Quantity (number)</Text>
            </Cell>
          </Row>
          <Row h={S5.untilVal}>
            <Cell w={UNTIL_W}>
              <RichText value={d.until} />
            </Cell>
            <Cell grow>
              <RichText value={d.quantity} />
            </Cell>
          </Row>
        </View>
      </SectionBody>
      <View style={{ height: W_THICK, backgroundColor: '#000000' }} />
    </>
  )
  // A section that fits on one page is never split: header and body move down together.
  if (whole) {
    return (
      <View wrap={false}>
        {head}
        {checks}
        {rest}
      </View>
    )
  }
  // header + checkbox block stay together; details flow on their own
  return (
    <>
      <View wrap={breakable}>
        {head}
        {checks}
      </View>
      {rest}
    </>
  )
}
