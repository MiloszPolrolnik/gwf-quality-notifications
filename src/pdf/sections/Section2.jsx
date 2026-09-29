import React from 'react'
import { View, Text, Image } from '@react-pdf/renderer'
import { Cell, Row, SectionHead, SectionBody, bold, clean } from '../primitives.jsx'
import { S2, INNER_W, PAD_X } from '../geometry.js'

const GAP = 8
const MAX_H = 230
const AREA_W = INNER_W - 0.96 - 2 * PAD_X - 1
const IMG_W = (AREA_W - GAP) / 2

function fit(img) {
  const s = Math.min(IMG_W / img.width, MAX_H / img.height)
  return { width: img.width * s, height: img.height * s }
}

// Two pictures per row, each row unbreakable; rows continue on the next page.
function Pictures({ images }) {
  const rows = []
  for (let i = 0; i < images.length; i += 2) rows.push(images.slice(i, i + 2))
  return rows.map((pair, r) => (
    <View key={r} wrap={false} style={{ flexDirection: 'row', marginTop: r === 0 ? 3 : GAP, marginBottom: 2 }}>
      {pair.map((img, i) => (
        <View key={i} style={{ width: IMG_W, marginRight: i === 0 ? GAP : 0 }}>
          <Image src={img.src} style={fit(img)} />
        </View>
      ))}
    </View>
  ))
}

export default function Section2({ data }) {
  return (
    <>
      <SectionHead n={2} h={S2.head} presence={50}>
        <Row top="none" style={{ flexGrow: 1 }}>
          <Cell grow style={bold}>
            <Text>Problem Description</Text>
          </Cell>
        </Row>
      </SectionHead>
      <SectionBody label>
        <Row h={S2.body}>
          <Cell grow>
            <Text>{clean(data.problem)}</Text>
          </Cell>
        </Row>
        <Row h={S2.pictures}>
          <Cell grow>
            <Text>Attached Pictures:</Text>
            <Pictures images={data.images || []} />
          </Cell>
        </Row>
      </SectionBody>
    </>
  )
}
