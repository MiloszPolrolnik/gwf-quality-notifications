import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import { Cell, Row, SectionHead, SectionBody, CheckItem, DottedNote, bold, clean } from '../primitives.jsx'
import { S6, W_THIN } from '../geometry.js'

const REGION_H = 178
const COL2 = 233.57
const COL3 = 255.77
// top of the block below the "selected dimensions" text
const LOWER_Y = 116

export default function Section6({ data }) {
  const d = data.corrective
  return (
    <>
      {/* header + checkbox block stay together; details flow on their own */}
      <View wrap={false}>
      <SectionHead n={6} h={S6.head} top="thin" numDx={3.6} numDy={1} presence={REGION_H + 20}>
        <Row top="none" style={{ flexGrow: 1 }}>
          <Cell grow style={[bold, { paddingTop: 1 }]}>
            <Text>Corrective Actions</Text>
          </Cell>
        </Row>
      </SectionHead>
      <SectionBody>
        <Row h={REGION_H + W_THIN} top="thin" wrap={false}>
          <Cell grow style={{ paddingTop: 0 }}>
            <View wrap={false} style={{ minHeight: REGION_H }}>
              <CheckItem checked={d.toolRepair} label="Tool repair" left={0} top={1.15} dx={10.32} />
              <CheckItem checked={d.dfm} label="DFM" left={COL2} top={13.27} dx={10.08} />
              <CheckItem checked={d.fai} label="FAI" left={COL2} top={28.75} dx={10.08} />
              <CheckItem checked={d.cpk} label="Capability Study (PpK)" left={COL2} top={44.35} dx={10.08} />
              <CheckItem checked={d.cpkAll} label="all critical dimensions" left={COL3} top={59.95} dx={10.32} />
              <CheckItem checked={d.cpkSelected} label="selected dimensions" left={COL3} top={75.55} dx={10.2} />
              {/* text of "selected dimensions" may grow; the lower block moves down with it */}
              <DottedNote left={266.93} top={103.75} minHeight={LOWER_Y - 101.35} text={d.cpkSelected ? d.cpkText : ''} />
              <View style={{ minHeight: REGION_H - LOWER_Y }}>
                <CheckItem checked={d.sample} label="Sample submission" left={COL2} top={118.63 - LOWER_Y} dx={10.08} />
                <View style={{ marginTop: 144.67 - LOWER_Y, minHeight: 167.26 - 144.67 }}>
                  <CheckItem checked={d.other} label="other" left={0} top={0} dx={10.32} />
                  {d.other && d.otherText ? (
                    <Text style={{ marginLeft: 36, marginTop: -0.48 }}>{clean(d.otherText)}</Text>
                  ) : null}
                </View>
                <View style={{ height: REGION_H - 167.26 }}>
                  <CheckItem checked={d.psw} label="New PSW" left={0} top={0} dx={10.32} />
                </View>
              </View>
            </View>
          </Cell>
        </Row>
      </SectionBody>
      </View>
      <SectionBody continued>
        <Row top="none" h={S6.body - REGION_H - W_THIN}>
          <Cell grow style={{ paddingTop: 2, paddingBottom: 2 }}>
            <Text> </Text>
          </Cell>
        </Row>
      </SectionBody>
    </>
  )
}
