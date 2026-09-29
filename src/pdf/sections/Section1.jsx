import React from 'react'
import { View, Text } from '@react-pdf/renderer'
import { Cell, Row, SectionHead, SectionBody, bold, clean } from '../primitives.jsx'
import { S1_COLS, S1_ROWS, HALF_W, INNER_W } from '../geometry.js'

const HEAD = ['Date', 'GWF Part No.', 'Part Description', 'Affected Batchlot Number', 'Batchlot Quantity']

const Val = ({ children }) => <Text>{clean(children)}</Text>

export default function Section1({ data }) {
  const values = [data.date, data.partNo, data.partDesc, data.batchNo, data.batchQty]
  return (
    <View wrap={false}>
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
