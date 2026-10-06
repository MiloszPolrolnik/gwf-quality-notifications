import React from 'react'
import { View, Text, Image } from '@react-pdf/renderer'
import { Cell, Row, SectionHead, SectionBody, bold, italic } from '../primitives.jsx'
import { S8, S8_COLS, W_THICK, PAD_X, BLACK } from '../geometry.js'

const B = { fontWeight: 'bold' }
const BI = { fontWeight: 'bold', fontStyle: 'italic' }

// Column headers have mixed styling, exactly as in the template.
const HEAD = [
  null,
  [['E ', B], ['(R + D)', BI]],
  [['SCM', B]],
  [['P ', B], ['(Production)', BI]],
  [['*GF ', B], ['(Management Board)', BI]],
  [['*QM ', B], ['(Quality Management)', BI]],
  [['**Sales', B]],
]

// Signing role -> column of the table (same order as the headers above, after the label column).
export const SIGN_ROLES = ['E', 'SCM', 'P', 'GF', 'QM', 'SALES']

// Signature block: signatures (image) and dates of the reviewers who signed are filled in,
// the rest stays empty for manual signing. signatures: { [role]: { src, date } }
export default function Section8({ signatures = {} }) {
  return (
    <View wrap={false}>
      <SectionHead n={8} h={S8.head} numDx={3.6} presence={0}>
        <Row top="none" style={{ flexGrow: 1 }}>
          {HEAD.map((h, i) => (
            <Cell
              key={i}
              w={S8_COLS[i]}
              style={{ justifyContent: 'center', paddingTop: 0, paddingLeft: PAD_X + 0.5 }}
            >
              {h ? (
                <Text style={{ textAlign: 'center', position: 'relative', top: 0.28 }}>
                  {h.map(([t, st], k) => (
                    <Text key={k} style={st}>
                      {t}
                    </Text>
                  ))}
                </Text>
              ) : null}
            </Cell>
          ))}
        </Row>
      </SectionHead>
      <SectionBody>
        {[['Signature', S8.sig], ['Date', S8.date]].map(([label, h]) => (
          <Row key={label} h={h}>
            {S8_COLS.map((w, i) => (
              <Cell
                key={i}
                w={w}
                style={[{ justifyContent: 'center', paddingTop: 0 }, i === 0 ? bold : null]}
              >
                {i === 0 ? <Text>{label}</Text> : null}
                {i > 0 && signatures[SIGN_ROLES[i - 1]] ? (
                  label === 'Signature' ? (
                    signatures[SIGN_ROLES[i - 1]].page == null ? (
                      <Image
                        src={signatures[SIGN_ROLES[i - 1]].src}
                        style={{ width: w - 6, height: h - 3, objectFit: 'contain', alignSelf: 'center' }}
                      />
                    ) : null
                  ) : (
                    <Text style={{ textAlign: 'center' }}>{signatures[SIGN_ROLES[i - 1]].date}</Text>
                  )
                ) : null}
              </Cell>
            ))}
          </Row>
        ))}
      </SectionBody>
      <View style={{ height: W_THICK, backgroundColor: BLACK }} />
    </View>
  )
}
