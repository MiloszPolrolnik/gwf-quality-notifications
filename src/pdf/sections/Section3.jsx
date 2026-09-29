import React from 'react'
import { Text } from '@react-pdf/renderer'
import { Cell, Row, SectionHead, SectionBody, bold, clean } from '../primitives.jsx'
import { S3 } from '../geometry.js'

export default function Section3({ data }) {
  return (
    <>
      <SectionHead n={3} h={S3.head} presence={50}>
        <Row top="none" style={{ flexGrow: 1 }}>
          <Cell grow style={bold}>
            <Text>Root Cause</Text>
          </Cell>
        </Row>
      </SectionHead>
      <SectionBody label>
        <Row h={S3.body}>
          <Cell grow>
            <Text>{clean(data.rootCause)}</Text>
          </Cell>
        </Row>
      </SectionBody>
    </>
  )
}
