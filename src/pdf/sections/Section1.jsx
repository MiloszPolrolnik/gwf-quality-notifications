import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import { Cell, Row, SectionHead, SectionBody, RichText, bold } from '../primitives.jsx'
import { S1_COLS, S1_ROWS, HALF_W, INNER_W, PAD_X } from '../geometry.js'
import { ONE_PAGE, richHeight } from '../measure.js'

const HEAD = ['Date', 'GWF Part No.', 'Part Description', 'Affected Batchlot Number', 'Batchlot Quantity']

const Val = ({ children }) => <RichText value={children} />

export default function Section1({ data }) {
  const values = [data.date, data.partNo, data.partDesc, data.batchNo, data.batchQty]
  // Normally unbreakable; very long texts may let the section break across pages.
  const w = (cell) => cell - 2 * PAD_X - 2
  const h = (v, cell) => richHeight(v, {}, w(cell))
  const est =
    Math.max(...values.map((v, i) => h(v, S1_COLS[i]))) +
    Math.max(h(data.qnNo, INNER_W - HALF_W), S1_ROWS.qn) +
    Math.max(h(data.applicant, HALF_W), h(data.department, INNER_W - HALF_W)) +
    h(data.supplier, INNER_W) +
    100
  return (
    <View wrap={est > ONE_PAGE}>
      <SectionHead n={1} h={S1_ROWS.head} top="gray">
        <Row top="none" style={{ flexGrow: 1 }}>
          {HEAD.map((t, i) => (
            <Cell key={t} w={S1_COLS[i]} style={bold}>
              <Text>{t}</Text>
            </Cell>
          ))}
        </Row>
      </SectionHead>
      <SectionBody label>
        <Row h={S1_ROWS.values}>
          {values.map((v, i) => (
            // The template's Date column is only 40pt wide: a full date needs a
            // smaller font and tighter padding to stay on one line.
            <Cell key={i} w={S1_COLS[i]} style={i === 0 ? { paddingLeft: 1.5, paddingRight: 1.5, fontSize: 6.5 } : null}>
              <Val>{v}</Val>
            </Cell>
          ))}
        </Row>
        <Row h={S1_ROWS.qn}>
          <Cell w={HALF_W} style={bold}>
            <Text>
              Quality Notification No. <Text style={{ fontWeight: 'normal' }}>(to be allocated by GWF QM)</Text>
            </Text>
          </Cell>
          <Cell grow>
            <Val>{data.qnNo}</Val>
          </Cell>
        </Row>
        <Row h={S1_ROWS.apHead}>
          <Cell w={HALF_W} style={bold}>
            <Text>Applicant</Text>
          </Cell>
          <Cell grow style={bold}>
            <Text>Department</Text>
          </Cell>
        </Row>
        <Row h={S1_ROWS.apVal}>
          <Cell w={HALF_W}>
            <Val>{data.applicant}</Val>
          </Cell>
          <Cell grow>
            <Val>{data.department}</Val>
          </Cell>
        </Row>
        <Row h={S1_ROWS.supHead}>
          <Cell grow style={bold}>
            <Text>
              Supplier + Supplier number <Text style={{ fontWeight: 'normal' }}>(if applicable)</Text>
            </Text>
          </Cell>
        </Row>
        <Row h={S1_ROWS.supVal}>
          <Cell grow>
            <Val>{data.supplier}</Val>
          </Cell>
        </Row>
      </SectionBody>
    </View>
  )
}
