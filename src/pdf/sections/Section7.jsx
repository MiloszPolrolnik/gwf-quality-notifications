import React from 'react'
import { View } from '@react-pdf/renderer'
import { Cell, Row, SectionHead, SectionBody, YesNo, At, bold } from '../primitives.jsx'
import { S7, GRAY, W_LINE } from '../geometry.js'

// Label, caption and yes/no pair sit at the template's measured positions
// (relative to the row's text origin; `base` = baseline below the row top).
function Info({ label, caption, value, base, captionBase, boxTop }) {
  return (
    <Cell grow style={{ paddingTop: 0 }}>
      <View style={{ height: 1 }}>
        <At left={0} base={base} style={bold}>
          {label}
        </At>
        <At left={0} base={captionBase} size={6}>
          {caption}
        </At>
        <YesNo value={value} base={base} boxTop={boxTop} />
      </View>
    </Cell>
  )
}

export default function Section7({ data }) {
  return (
    <View wrap={false}>
      <SectionHead n={7} h={S7.row1} presence={0}>
        <Row top="none" style={{ flexGrow: 1 }}>
          <Info
            label="Information to the sales department:"
            caption="For information only"
            value={data.infoSales}
            base={8.16}
            captionBase={16.08}
            boxTop={2.23}
          />
        </Row>
      </SectionHead>
      <SectionBody>
        <Row h={S7.row2}>
          <Info
            label="Information to the customer:"
            caption="Sales communicates towards customer"
            value={data.infoCustomer}
            base={8.04}
            captionBase={15.96}
            boxTop={2.11}
          />
        </Row>
      </SectionBody>
      <View style={{ height: W_LINE, backgroundColor: GRAY }} />
    </View>
  )
}
