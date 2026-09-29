import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import { Cell, Row, SectionHead, SectionBody, CheckItem, DottedLine, bold, clean } from '../primitives.jsx'
import { S5, W_THICK } from '../geometry.js'

// "Until" / "Quantity" split at x=315.07 (not at the half of the column)
const UNTIL_W = 315.07 - 77.42
import { REGION_H } from './Section4.jsx'

const COL2 = 234.77

export default function Section5({ data }) {
  const d = data.process
  return (
    <>
      <SectionHead n={5} h={S5.head} presence={REGION_H + 20}>
        <Row top="none" style={{ flexGrow: 1 }}>
          <Cell grow style={bold}>
            <Text>Disposition (process)</Text>
          </Cell>
        </Row>
      </SectionHead>
      <SectionBody>
        <Row h={S5.body}>
          <Cell grow style={{ paddingTop: 0 }}>
            <View wrap={false} style={{ height: REGION_H }}>
              <CheckItem checked={d.stop} label="Stop until fixed" left={0} top={1.25} dx={11.04} />
              <CheckItem checked={d.concession} label="Continue with Concession" left={COL2} top={1.25} dx={10.92} />
              <CheckItem checked={d.risk} label="Risk assessment (mandatory)" left={266.93} top={16.85} dx={11.4} />
              <CheckItem checked={d.otherDocs} label="Other supporting documents" left={266.93} top={32.33} dx={11.4} />
              <DottedLine left={280.25} top={46.85} text={d.otherDocsText} />
            </View>
            {d.details ? <Text style={{ paddingBottom: 3 }}>{clean(d.details)}</Text> : null}
          </Cell>
        </Row>
        <View wrap={false}>
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
              <Text>{clean(d.until)}</Text>
            </Cell>
            <Cell grow>
              <Text>{clean(d.quantity)}</Text>
            </Cell>
          </Row>
        </View>
      </SectionBody>
      <View style={{ height: W_THICK, backgroundColor: '#000000' }} />
    </>
  )
}
