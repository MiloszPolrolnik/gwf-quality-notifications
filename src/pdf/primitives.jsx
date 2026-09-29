import React from 'react'
import { View, Text, Svg, Path, Line } from '@react-pdf/renderer'
import {
  BLACK,
  GRAY,
  LIGHT,
  W_LINE,
  W_THICK,
  W_THIN,
  NUM_W,
  CONTENT_W,
  PAD_X,
  CB_SIZE,
  CB_STROKE,
  FONT_SIZE,
} from './geometry.js'

// Vertical shift that puts Arimo's first baseline on the same y as the
// template (calibrated with tools/compare.py against the original PDF).
export const TEXT_DY = 0.17
// Distance from the top of an 8pt / 9.2pt line box to its baseline in Arimo.
export const BASE = 7.39
const LABEL = 'To be filled out by applicant'
const LABEL_LEN = 99.7 // rendered length of LABEL (8pt italic)

export const bold = { fontWeight: 'bold' }
export const italic = { fontStyle: 'italic' }

// User supplied text: keep line breaks, drop \r and tabs.
export function clean(str) {
  return String(str ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
}

// ---------------------------------------------------------------------------
// Table cells
// ---------------------------------------------------------------------------
export const line = (width, color) => ({ borderTopWidth: width, borderTopColor: color })
const LINES = {
  gray: line(W_LINE, GRAY),
  thick: line(W_THICK, BLACK),
  thin: line(W_THIN, BLACK),
  none: null,
}

// A cell in a content row: gray line on its left, template padding.
export function Cell({ w, grow, style, children }) {
  return (
    <View
      style={[
        {
          width: w,
          flexGrow: grow ? 1 : 0,
          borderLeftWidth: W_LINE,
          borderLeftColor: GRAY,
          paddingLeft: PAD_X,
          paddingRight: PAD_X,
          paddingTop: TEXT_DY,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

// A horizontal band inside the content column, separated by a gray line.
export function Row({ h, top = 'gray', style, children, ...rest }) {
  const l = LINES[top]
  return (
    <View style={[{ flexDirection: 'row', minHeight: h }, l, style]} {...rest}>
      {children}
    </View>
  )
}

// The content column of a section (everything right of the number column).
export function ContentCol({ children, style, ...rest }) {
  return (
    <View
      style={[
        { width: CONTENT_W, flexDirection: 'column', borderRightWidth: W_LINE, borderRightColor: GRAY },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  )
}

// Number cell of a section header row (left edge of the table).
export function NumCell({ n, dx = 0, dy = 0 }) {
  return (
    <View
      style={{
        width: NUM_W,
        borderLeftWidth: W_LINE,
        borderLeftColor: GRAY,
        paddingLeft: 4.94 + dx,
        paddingTop: TEXT_DY + dy,
      }}
    >
      <Text>{n}</Text>
    </View>
  )
}

// Rotated "To be filled out by applicant". It is a `render` node so react-pdf
// evaluates it once per page fragment: when a section breaks across pages the
// label is repeated in every fragment, centred in that fragment's height.
export function LabelCell({ label = false, continued = false }) {
  return (
    <View
      style={{
        width: NUM_W - 0.24,
        marginLeft: 0.24,
        paddingRight: 0.24,
        borderLeftWidth: W_THIN,
        borderLeftColor: LIGHT,
        borderTopWidth: continued ? 0 : W_THIN,
        borderTopColor: LIGHT,
        alignItems: 'center',
        justifyContent: 'flex-end',
      }}
    >
      {label ? (
        <View fixed>
          <Text
            style={{
              fontSize: 8,
              lineHeight: 1,
              fontStyle: 'italic',
              transform: 'rotate(-90deg)',
              width: LABEL_LEN,
              letterSpacing: 0.108,
              // Bottom-anchored like the template: the text is centred on its
              // layout box when rotated, so lift the box by half the length.
              marginBottom: LABEL_LEN / 2 + 5.73 - 4,
              marginRight: 2.4,
            }}
          >
            {LABEL}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

// Header row of a section: [number | header cells]. Never split, and never left
// alone at the bottom of a page (`presence` = space that must follow it).
export function SectionHead({ n, h, top = 'thick', numDx = 0, numDy = 0, presence = 60, children }) {
  return (
    <View
      wrap={false}
      minPresenceAhead={presence}
      style={[{ flexDirection: 'row', minHeight: h }, LINES[top]]}
    >
      <NumCell n={n} dx={numDx} dy={numDy} />
      <ContentCol>{children}</ContentCol>
    </View>
  )
}

// Body of a section: [label cell | content column].
export function SectionBody({ label, continued, children, wrap = true, style }) {
  return (
    <View style={[{ flexDirection: 'row' }, style]} wrap={wrap}>
      <LabelCell label={label} continued={continued} />
      <ContentCol>{children}</ContentCol>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Checkboxes: drawn squares (no unicode glyphs); checked = square with an X.
// ---------------------------------------------------------------------------
export function Box({ checked, style }) {
  const s = CB_SIZE
  const o = CB_STROKE / 2
  const b = CB_STROKE
  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={style}>
      {/* frame as one even-odd filled outline, like the glyph of the original */}
      <Path d={`M0 0H${s}V${s}H0Z M${b} ${b}V${s - b}H${s - b}V${b}Z`} fill={BLACK} fillRule="evenodd" />
      {checked ? (
        <>
          <Line x1={o} y1={o} x2={s - o} y2={s - o} stroke={BLACK} strokeWidth={CB_STROKE} />
          <Line x1={s - o} y1={o} x2={o} y2={s - o} stroke={BLACK} strokeWidth={CB_STROKE} />
        </>
      ) : null}
    </Svg>
  )
}

// Checkbox + label, absolutely placed. (left, top) is the origin of the
// original MS Gothic glyph relative to the containing region; `dx` is the
// measured distance from that origin to the first letter of the label.
export function CheckItem({ checked, label, left, top, dx = 10.3 }) {
  return (
    <View style={{ position: 'absolute', left, top }}>
      <Box checked={checked} style={{ position: 'absolute', left: 1.08, top: 0.86 }} />
      <Text style={{ marginLeft: dx, marginTop: -0.48 }}>{label}</Text>
    </View>
  )
}

// Dotted line that optionally carries one line of user text. `top` is the top
// of the 8pt line box holding the dots.
const DOTS = '…'.repeat(16)
export function DottedLine({ left, top, text }) {
  return (
    <View style={{ position: 'absolute', left, top }}>
      <Text>{DOTS}</Text>
      {text ? (
        <Text maxLines={1} style={{ position: 'absolute', left: 1, top: -2.4, width: 190 }}>
          {clean(text).replace(/\n/g, ' ')}
        </Text>
      ) : null}
    </View>
  )
}

// Dotted line whose text may run over several lines: it flows in the region (so
// the things below move down) with the first line on the dots. `top` is the top
// of the dotted line's 8pt line box, like DottedLine.
export function DottedNote({ left, top, text, minHeight = 0 }) {
  return (
    <View style={{ marginTop: top - 2.4, minHeight }}>
      <DottedLine left={left} top={2.4} />
      {text ? <Text style={{ marginLeft: left + 1 }}>{clean(text)}</Text> : null}
    </View>
  )
}

// One text label at an absolute position; `base` is the desired baseline
// relative to the region top.
export function At({ left, base, size = FONT_SIZE, children, style }) {
  const b = size === FONT_SIZE ? BASE : size * 0.905 + (size * 1.14 - size * 1.117) / 2
  return (
    <View style={{ position: 'absolute', left, top: base - b }}>
      <Text style={[size === FONT_SIZE ? null : { fontSize: size, lineHeight: 1.14 }, style]}>{children}</Text>
    </View>
  )
}

// "ja / yes [ ]   nein / no [ ]" (sections 7 and 10). Coordinates are relative
// to the text origin of the cell (x=83.42); `top` is the region-relative top of
// the glyph box row, `base` the text baseline.
export function YesNo({ value, base, boxTop }) {
  return (
    <>
      <At left={402.07 - 83.42} base={base}>
        ja / yes
      </At>
      <Box checked={value === 'yes'} style={{ position: 'absolute', left: 429.67 + 1.08 - 83.42, top: boxTop }} />
      <At left={469.78 - 83.42} base={base}>
        nein / no
      </At>
      <Box checked={value === 'no'} style={{ position: 'absolute', left: 504.46 + 1.08 - 83.42, top: boxTop }} />
    </>
  )
}
