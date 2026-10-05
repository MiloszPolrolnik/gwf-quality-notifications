import React from 'react'
import { Text } from '@react-pdf/renderer'
import { Cell, Row, SectionHead, SectionBody, SPLIT_PRESENCE, RichText, bold } from '../primitives.jsx'
import { GRAY, S3, W_LINE } from '../geometry.js'
import { ONE_PAGE, richHeight } from '../measure.js'

export default function Section3({ data }) {
  // A text that fits on one page moves as a whole to the next page when it does
  // not fit here; the header stays behind. Only longer texts are split.
  const whole = Math.max(S3.body, richHeight(data.rootCause, data.fieldImages) + 2) <= ONE_PAGE
  return (
    <>
      <SectionHead n={3} h={S3.head} presence={whole ? 0 : SPLIT_PRESENCE} closed>
        <Row top="none" style={{ flexGrow: 1 }}>
          <Cell grow style={bold}>
            <Text>Root Cause</Text>
          </Cell>
        </Row>
      </SectionHead>
      <SectionBody
        label={whole ? true : 'two'}
        wrap={!whole}
        style={{ borderBottomWidth: W_LINE, borderBottomColor: GRAY }}
      >
        <Row h={S3.body}>
          <Cell grow>
            <RichText value={data.rootCause} images={data.fieldImages} />
          </Cell>
        </Row>
      </SectionBody>
    </>
  )
}
