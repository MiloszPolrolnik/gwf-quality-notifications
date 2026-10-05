import React from 'react'
import { View, Text, Image } from '@react-pdf/renderer'
import { Cell, Row, SectionHead, SectionBody, SPLIT_PRESENCE, RichText, bold } from '../primitives.jsx'
import { S2, INNER_W, PAD_X, LINE_H } from '../geometry.js'
import { ONE_PAGE, richHeight } from '../measure.js'

// A one-line label needs this much height (99.7pt text + margins).
const LABEL_H = 112

const GAP = 8
const MAX_H = 230
const AREA_W = INNER_W - 0.96 - 2 * PAD_X - 1
const IMG_W = (AREA_W - GAP) / 2

function fit(img) {
  const s = Math.min(IMG_W / img.width, MAX_H / img.height)
  return { width: img.width * s, height: img.height * s }
}

// Two pictures per row, each row unbreakable; rows continue on the next page.
// The caption stays with the first row.
function Pictures({ images }) {
  const rows = []
  for (let i = 0; i < images.length; i += 2) rows.push(images.slice(i, i + 2))
  return rows.map((pair, r) => (
    <View key={r} wrap={false} style={{ marginTop: r === 0 ? 0 : GAP, marginBottom: 2 }}>
      {r === 0 ? <Text>Attached Pictures:</Text> : null}
      <View style={{ flexDirection: 'row', marginTop: r === 0 ? 3 : 0 }}>
        {pair.map((img, i) => (
          <View key={i} style={{ width: IMG_W, marginRight: i === 0 ? GAP : 0 }}>
            <Image src={img.src} style={fit(img)} />
          </View>
        ))}
      </View>
    </View>
  ))
}

export default function Section2({ data }) {
  const images = data.images || []
  const hasPictures = images.length > 0
  const textH = Math.max(S2.body, richHeight(data.problem, data.fieldImages) + 2)
  // A text that fits on one page moves as a whole to the next page when it does
  // not fit here; the header stays behind. Only longer texts are split.
  // Pictures are independent of the text: only they move on when they do not fit.
  const bodyH = hasPictures ? textH : textH + Math.max(S2.pictures, LINE_H + 5)
  const whole = bodyH <= ONE_PAGE
  const label = whole && (hasPictures ? textH >= LABEL_H : true) ? true : 'two'
  const text = (
    <Row h={label === true && hasPictures ? Math.max(S2.body, LABEL_H) : S2.body}>
      <Cell grow>
        <RichText value={data.problem} images={data.fieldImages} />
      </Cell>
    </Row>
  )
  return (
    <>
      <SectionHead n={2} h={S2.head} presence={whole ? 0 : SPLIT_PRESENCE} closed>
        <Row top="none" style={{ flexGrow: 1 }}>
          <Cell grow style={bold}>
            <Text>Problem Description</Text>
          </Cell>
        </Row>
      </SectionHead>
      {hasPictures ? (
        <>
          <SectionBody label={label} wrap={!whole}>
            {text}
          </SectionBody>
          <SectionBody continued>
            <Row h={S2.pictures}>
              <Cell grow>
                <Pictures images={images} />
              </Cell>
            </Row>
          </SectionBody>
        </>
      ) : (
        <SectionBody label={label} wrap={!whole}>
          {text}
          <Row h={S2.pictures}>
            <Cell grow>
              <Text>Attached Pictures:</Text>
            </Cell>
          </Row>
        </SectionBody>
      )}
    </>
  )
}
