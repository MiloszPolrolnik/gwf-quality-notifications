// Single source of truth for the PDF layout. Every number below was measured
// from the original DL05-F0987 PDF with pdfplumber (see tools/extract2.py), all
// values in pt. A4 as produced by Word: 595.32 x 842.04.

export const PAGE_W = 595.32
export const PAGE_H = 842.04

export const FONT_SIZE = 8
// Word lays 8pt Arial out on a 9.2pt line.
export const LINE_H = 9.2
export const LINE_HEIGHT = LINE_H / FONT_SIZE

// ---- colours / line weights ------------------------------------------------
export const BLACK = '#000000'
export const GRAY = '#808080' // inner table lines
export const LIGHT = '#A6A6A6' // outline of the vertically merged label cell
export const W_LINE = 0.96 // inner table line
export const W_THICK = 1.44 // section separators
export const W_THIN = 0.48 // header / footer rule, label cell outline

// ---- horizontal geometry -----------------------------------------------------
export const RULE_LEFT = 48.12 // header + footer rule start
export const RULE_RIGHT = 560.02
export const TABLE_LEFT = 54.96
export const TABLE_RIGHT = 560.86
export const NUM_W = 77.42 - TABLE_LEFT // number column, incl. its left border
export const CONTENT_W = TABLE_RIGHT - 77.42 // content column, incl. right border
export const INNER_W = CONTENT_W - W_LINE // width usable by cells in a row
export const PAD_X = 5.04 // cell padding left/right
export const TEXT_X = 83.42 // x of text in the first content column
export const HALF_W = 318.67 - 77.42 // "half" split of the content column

// Section 1 columns (x of the vertical lines): 77.42 | 117.50 | 212.09 | 403.51 | 481.54 | 559.90
export const S1_COLS = [40.08, 94.59, 191.42, 78.03, 78.36]
// Section 8: label column + six signature columns
export const S8_COLS = [63.12, 69.87, 69.84, 69.86, 69.84, 69.87, 71.08]
// Sections 9/10 columns: 77.42 | 297.29 | 431.71 | right edge
export const S9_COLS = [219.87, 134.42, 128.42]

// ---- vertical geometry ---------------------------------------------------------
export const PAGE_TOP = 60.96 // where flow content starts on every page
export const PAGE1_TABLE_TOP = 89.66
export const CONTENT_BOTTOM = 782 // flow content must end above the footer rule (788.76)
export const HEADER_TEXT_TOP = 28.33
export const HEADER_RULE_Y = 43.2
export const FOOTER_RULE_Y = 788.76

// ---- logo -------------------------------------------------------------------------
export const LOGO = { left: 485.6, top: 7.4, width: 79.5, height: 39.2 }

// ---- checkboxes ---------------------------------------------------------------------
// Measured at 1200 dpi: the MS Gothic glyph is 8pt wide, the drawn square is
// 5.94pt with a ~0.4pt stroke, offset (1.08, 0.98) from the glyph origin.
export const CB_SIZE = 5.94
export const CB_STROKE = 0.4
export const CB_LABEL_DX = 11.0 // glyph origin -> first label letter
export const CB_GLYPH_W = 8.04

// Row pitches (line top -> next line top), page 1
export const S1_ROWS = { head: 19.44, values: 22.56, qn: 15.84, apHead: 14.88, apVal: 23.28, supHead: 14.88, supVal: 24.48 }
export const S2 = { head: 18.48, body: 76.95, pictures: 35.4 }
export const S3 = { head: 21.0, body: 116.42 }
export const S4 = { head: 18.48, body: 108.99 }
export const S5 = { head: 18.6, body: 94.56, concession: 11.4, untilHead: 11.3, untilVal: 14.88 }
// Page 2
export const S6 = { head: 16.32, body: 189.05 }
export const S7 = { row1: 18.84, row2: 18.24 }
export const S8 = { head: 29.04, sig: 19.44, date: 19.44 }
export const S9 = { row9: 30.14, row10: 28.68 }
