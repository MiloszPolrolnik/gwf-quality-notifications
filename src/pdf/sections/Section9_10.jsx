import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import { Cell, Row, SectionHead, At, Box, bold } from '../primitives.jsx'
import { S9, S9_COLS, W_THICK, BLACK } from '../geometry.js'

const Normal = { fontWeight: 'normal' }

// Customer approval (9) and check execution (10): printed empty.
export default function Section9_10() {
  return (
    <View wrap={false}>
      <SectionHead n={9} h={S9.row9} presence={0}>
        <Row top="none" style={{ flexGrow: 1 }}>
          <Cell w={S9_COLS[0]} style={bold}>
            <Text>
              Customer approval <Text style={Normal}>(if applicable)</Text>
            </Text>
          </Cell>
          <Cell w={S9_COLS[1]} style={bold}>
            <Text>Name</Text>
          </Cell>
          <Cell grow style={bold}>
            <Text>Signature</Text>
          </Cell>
        </Row>
      </SectionHead>
      <SectionHead n={10} h={S9.row10} top="gray" presence={0}>
        <Row top="none" style={{ flexGrow: 1 }}>
          <Cell w={S9_COLS[0]} style={bold}>
            <Text>Check Execution/Completion</Text>
          </Cell>
          <Cell w={S9_COLS[1]} style={bold}>
            <Text>Signature</Text>
          </Cell>
          <Cell grow style={{ paddingTop: 0 }}>
            <View style={{ height: 1 }}>
              <At left={0.03} base={8.04} style={bold}>
                Status completed
              </At>
              <At left={77.91} base={8.04}>
                ja / yes
              </At>
              <Box checked={false} style={{ position: 'absolute', left: 106.59, top: 1.93 }} />
            </View>
          </Cell>
        </Row>
      </SectionHead>
      <View style={{ height: W_THICK, backgroundColor: BLACK }} />
    </View>
  )
}
