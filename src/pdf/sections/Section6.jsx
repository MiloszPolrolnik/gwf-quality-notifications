import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import { Cell, Row, SectionHead, SectionBody, CheckItem, DottedLine, bold, clean } from '../primitives.jsx'
import { S6 } from '../geometry.js'

const REGION_H = 178
const COL2 = 233.57
const COL3 = 255.77

export default function Section6({ data }) {
  const d = data.corrective
  return (
    <>
      <SectionHead n={6} h={S6.head} top="thin" numDx={3.6} numDy={1} presence={REGION_H + 20}>
        <Row top="none" style={{ flexGrow: 1 }}>
          <Cell grow style={[bold, { paddingTop: 1 }]}>
            <Text>Corrective Actions</Text>
          </Cell>
        </Row>
      </SectionHead>
      <SectionBody>
        <Row h={S6.body} top="thin">
          <Cell grow style={{ paddingTop: 0 }}>
            <View wrap={false} style={{ height: REGION_H }}>
              <CheckItem checked={d.toolRepair} label="Tool repair" left={0} top={1.15} dx={10.32} />
              <CheckItem checked={d.dfm} label="DFM" left={COL2} top={13.27} dx={10.08} />
              <CheckItem checked={d.fai} label="FAI" left={COL2} top={28.75} dx={10.08} />
              <CheckItem checked={d.cpk} label="Capability Study (PpK)" left={COL2} top={44.35} dx={10.08} />
              <CheckItem checked={d.cpkAll} label="all critical dimensions" left={COL3} top={59.95} dx={10.32} />
              <CheckItem checked={d.cpkSelected} label="selected dimensions" left={COL3} top={75.55} dx={10.2} />
              <DottedLine left={266.93} top={103.75} text={d.cpkText} />
              <CheckItem checked={d.sample} label="Sample submission" left={COL2} top={118.63} dx={10.08} />
              <CheckItem checked={d.other} label="other" left={0} top={144.67} dx={10.32} />
              <CheckItem checked={d.psw} label="New PSW" left={0} top={167.26} dx={10.32} />
            </View>
            {d.details ? <Text style={{ paddingBottom: 3 }}>{clean(d.details)}</Text> : null}
          </Cell>
        </Row>
      </SectionBody>
    </>
  )
}
