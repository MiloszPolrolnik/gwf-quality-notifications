// scripts/generate-pdf.mjs
import { renderToFile } from "@react-pdf/renderer";
import React2 from "react";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// src/pdf/QualityNotificationPdf.jsx
import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
Font.registerHyphenationCallback((word) => [word]);
var PAGE_PADDING = 24;
var CONTENT_WIDTH = 595.28 - PAGE_PADDING * 2;
var NUM_COL_W = CONTENT_WIDTH * (22.4 / 504.8);
var CONTENT_COL_W = CONTENT_WIDTH - NUM_COL_W;
var HALF_W = CONTENT_COL_W / 2;
var S1_DATE_W = CONTENT_COL_W * (40 / 482.4);
var S1_PARTNO_W = CONTENT_COL_W * (94.7 / 482.4);
var S1_PARTDESC_W = CONTENT_COL_W * (191.3 / 482.4);
var S1_BATCHNO_W = CONTENT_COL_W * (78 / 482.4);
var S1_BATCHQTY_W = CONTENT_COL_W * (78 / 482.4);
var BORDER = 0.5;
var FONT_SIZE = 8;
var today = /* @__PURE__ */ new Date();
var todayStr = `${String(today.getDate()).padStart(2, "0")}.${String(
  today.getMonth() + 1
).padStart(2, "0")}.${today.getFullYear()}`;
var styles = StyleSheet.create({
  page: {
    paddingTop: PAGE_PADDING,
    paddingBottom: PAGE_PADDING,
    paddingHorizontal: PAGE_PADDING,
    fontFamily: "Helvetica",
    fontSize: FONT_SIZE,
    color: "#000000",
    flexDirection: "column"
  },
  footerPinned: {
    position: "absolute",
    bottom: PAGE_PADDING,
    left: PAGE_PADDING,
    right: PAGE_PADDING
  },
  headerWrap: {
    position: "relative"
  },
  headerFileName: {
    fontSize: 7
  },
  headerLogo: {
    position: "absolute",
    top: -19,
    right: 0,
    width: 72,
    height: 35.5,
    objectFit: "contain"
  },
  headerRule: {
    borderBottomWidth: 0.75,
    borderBottomColor: "#000000",
    marginTop: 6,
    marginBottom: 4
  },
  title: {
    fontSize: 15,
    marginTop: 14,
    marginBottom: 6
  },
  titleSub: {
    fontSize: 11
  },
  footerRule: {
    borderTopWidth: 0.5,
    borderTopColor: "#000000",
    marginBottom: 3
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7
  },
  footerRow2: {
    fontSize: 7,
    marginTop: 2
  },
  table: {
    borderWidth: 1.5,
    borderColor: "#000000"
  },
  sectionRow: {
    flexDirection: "row"
  },
  numCell: {
    width: NUM_COL_W,
    borderWidth: BORDER,
    borderColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    padding: 2
  },
  numCellTop: {
    justifyContent: "flex-start",
    paddingTop: 5
  },
  labelCell: {
    borderWidth: BORDER,
    borderColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  contentCol: {
    flexDirection: "column"
  },
  cell: {
    borderWidth: BORDER,
    borderColor: "#000000",
    paddingHorizontal: 4,
    paddingVertical: 2
  },
  bold: {
    fontFamily: "Helvetica-Bold"
  },
  small: {
    fontSize: 6.5
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  checkboxSquare: {
    width: 7,
    height: 7,
    borderWidth: BORDER,
    borderColor: "#000000",
    marginRight: 4
  },
  // The table's own outer border already draws the right edge of the form.
  // Any content cell that reaches that same edge must not also draw its own
  // right border - two independent borders sitting on (almost) the same
  // coordinate render as a faint doubled line once rasterized. Applied to
  // every cell that is the last (rightmost) column in its row.
  flush: {
    borderRightWidth: 0
  },
  footnote: {
    fontSize: 6
  }
});
function SectionNum({ n }) {
  return /* @__PURE__ */ React.createElement(View, { style: [styles.numCell, styles.numCellTop] }, /* @__PURE__ */ React.createElement(Text, null, n));
}
function NumberAndLabel({ n, headerHeight, labelHeight, label = "To be filled out by applicant" }) {
  return /* @__PURE__ */ React.createElement(View, { style: { width: NUM_COL_W } }, /* @__PURE__ */ React.createElement(View, { style: [styles.numCell, { width: NUM_COL_W, height: headerHeight }] }, /* @__PURE__ */ React.createElement(Text, null, n)), /* @__PURE__ */ React.createElement(View, { style: [styles.labelCell, { width: NUM_COL_W, height: labelHeight }] }, /* @__PURE__ */ React.createElement(
    Text,
    {
      style: {
        fontSize: 7,
        fontStyle: "italic",
        transform: "rotate(-90deg)",
        width: labelHeight - 8,
        textAlign: "center"
      }
    },
    label
  )));
}
function Checkbox({ label, style, labelStyle }) {
  return /* @__PURE__ */ React.createElement(View, { style: [styles.checkboxRow, style] }, /* @__PURE__ */ React.createElement(View, { style: styles.checkboxSquare }), /* @__PURE__ */ React.createElement(Text, { style: labelStyle }, label));
}
function DottedLine({ style }) {
  return /* @__PURE__ */ React.createElement(Text, { style: [{ fontSize: FONT_SIZE }, style] }, ".".repeat(60));
}
function FormHeader({ logoSrc: logoSrc2, withTitle = true }) {
  return /* @__PURE__ */ React.createElement(View, { fixed: true }, /* @__PURE__ */ React.createElement(View, { style: styles.headerWrap }, /* @__PURE__ */ React.createElement(Text, { style: styles.headerFileName }, "DL05-F0987 - Quality Notification.docx"), /* @__PURE__ */ React.createElement(Image, { style: styles.headerLogo, src: logoSrc2 })), /* @__PURE__ */ React.createElement(View, { style: styles.headerRule }), withTitle ? /* @__PURE__ */ React.createElement(Text, { style: styles.title }, "Quality Notification | ", /* @__PURE__ */ React.createElement(Text, { style: styles.titleSub }, "(intern & extern)")) : null);
}
function FormFooter({ page }) {
  return /* @__PURE__ */ React.createElement(View, { style: styles.footerPinned }, /* @__PURE__ */ React.createElement(View, { style: styles.footerRule }), /* @__PURE__ */ React.createElement(View, { style: styles.footerRow }, /* @__PURE__ */ React.createElement(Text, null, "Owner: QM / Freigabe: 16.10.2020"), /* @__PURE__ */ React.createElement(Text, null, "Seite ", page, " / 2"), /* @__PURE__ */ React.createElement(Text, null, "Quelle: GWFWorX")), /* @__PURE__ */ React.createElement(Text, { style: styles.footerRow2 }, "Verteiler: GWF / Unkontrollierte Ausgabe: ", todayStr));
}
var S1_HEADER_H = 24;
var S1_ROW_HEIGHTS = [20, 16, 16, 20, 16, 20];
var S1_LABEL_H = S1_ROW_HEIGHTS.reduce((a, b) => a + b, 0);
function Section1() {
  return /* @__PURE__ */ React.createElement(View, { style: styles.sectionRow }, /* @__PURE__ */ React.createElement(NumberAndLabel, { n: 1, headerHeight: S1_HEADER_H, labelHeight: S1_LABEL_H }), /* @__PURE__ */ React.createElement(View, { style: styles.contentCol }, /* @__PURE__ */ React.createElement(View, { style: { flexDirection: "row" } }, /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.bold, { width: S1_DATE_W, height: S1_HEADER_H }] }, /* @__PURE__ */ React.createElement(Text, null, "Date")), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.bold, { width: S1_PARTNO_W, height: S1_HEADER_H }] }, /* @__PURE__ */ React.createElement(Text, null, "GWF Part No.")), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.bold, { width: S1_PARTDESC_W, height: S1_HEADER_H }] }, /* @__PURE__ */ React.createElement(Text, null, "Part Description")), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.bold, { width: S1_BATCHNO_W, height: S1_HEADER_H }] }, /* @__PURE__ */ React.createElement(Text, null, "Affected Batchlot Number")), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.bold, styles.flush, { width: S1_BATCHQTY_W, height: S1_HEADER_H }] }, /* @__PURE__ */ React.createElement(Text, null, "Batchlot Quantity"))), /* @__PURE__ */ React.createElement(View, { style: { flexDirection: "row" } }, /* @__PURE__ */ React.createElement(View, { style: [styles.cell, { width: S1_DATE_W, height: S1_ROW_HEIGHTS[0] }] }), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, { width: S1_PARTNO_W, height: S1_ROW_HEIGHTS[0] }] }), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, { width: S1_PARTDESC_W, height: S1_ROW_HEIGHTS[0] }] }), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, { width: S1_BATCHNO_W, height: S1_ROW_HEIGHTS[0] }] }), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.flush, { width: S1_BATCHQTY_W, height: S1_ROW_HEIGHTS[0] }] })), /* @__PURE__ */ React.createElement(View, { style: { flexDirection: "row" } }, /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.bold, { width: HALF_W, height: S1_ROW_HEIGHTS[1] }] }, /* @__PURE__ */ React.createElement(Text, null, "Quality Notification No.", " ", /* @__PURE__ */ React.createElement(Text, { style: { fontFamily: "Helvetica" } }, "(to be allocated by GWF QM)"))), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.flush, { width: HALF_W, height: S1_ROW_HEIGHTS[1] }] })), /* @__PURE__ */ React.createElement(View, { style: { flexDirection: "row" } }, /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.bold, { width: HALF_W, height: S1_ROW_HEIGHTS[2] }] }, /* @__PURE__ */ React.createElement(Text, null, "Applicant")), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.bold, styles.flush, { width: HALF_W, height: S1_ROW_HEIGHTS[2] }] }, /* @__PURE__ */ React.createElement(Text, null, "Department"))), /* @__PURE__ */ React.createElement(View, { style: { flexDirection: "row" } }, /* @__PURE__ */ React.createElement(View, { style: [styles.cell, { width: HALF_W, height: S1_ROW_HEIGHTS[3] }] }), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.flush, { width: HALF_W, height: S1_ROW_HEIGHTS[3] }] })), /* @__PURE__ */ React.createElement(View, { style: { flexDirection: "row" } }, /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.bold, styles.flush, { width: CONTENT_COL_W, height: S1_ROW_HEIGHTS[4] }] }, /* @__PURE__ */ React.createElement(Text, null, "Supplier + Supplier number", " ", /* @__PURE__ */ React.createElement(Text, { style: { fontFamily: "Helvetica" } }, "(if applicable)")))), /* @__PURE__ */ React.createElement(View, { style: { flexDirection: "row" } }, /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.flush, { width: CONTENT_COL_W, height: S1_ROW_HEIGHTS[5] }] }))));
}
var S2_HEADER_H = 16;
var S2_BOX_H = 90;
var S2_PICTURES_H = 30;
function Section2() {
  return /* @__PURE__ */ React.createElement(View, { style: styles.sectionRow }, /* @__PURE__ */ React.createElement(NumberAndLabel, { n: 2, headerHeight: S2_HEADER_H, labelHeight: S2_BOX_H + S2_PICTURES_H }), /* @__PURE__ */ React.createElement(View, { style: styles.contentCol }, /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.bold, styles.flush, { width: CONTENT_COL_W, height: S2_HEADER_H }] }, /* @__PURE__ */ React.createElement(Text, null, "Problem Description")), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.flush, { width: CONTENT_COL_W, height: S2_BOX_H }] }), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.flush, { width: CONTENT_COL_W, height: S2_PICTURES_H }] }, /* @__PURE__ */ React.createElement(Text, null, "Attached Pictures:"))));
}
var S3_HEADER_H = 16;
var S3_BOX_H = 130;
function Section3() {
  return /* @__PURE__ */ React.createElement(View, { style: styles.sectionRow }, /* @__PURE__ */ React.createElement(NumberAndLabel, { n: 3, headerHeight: S3_HEADER_H, labelHeight: S3_BOX_H }), /* @__PURE__ */ React.createElement(View, { style: styles.contentCol }, /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.bold, styles.flush, { width: CONTENT_COL_W, height: S3_HEADER_H }] }, /* @__PURE__ */ React.createElement(Text, null, "Root Cause")), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.flush, { width: CONTENT_COL_W, height: S3_BOX_H }] })));
}
function Section4() {
  const half = HALF_W;
  return /* @__PURE__ */ React.createElement(View, { style: styles.sectionRow }, /* @__PURE__ */ React.createElement(SectionNum, { n: 4 }), /* @__PURE__ */ React.createElement(View, { style: styles.contentCol }, /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.flush, { width: CONTENT_COL_W }] }, /* @__PURE__ */ React.createElement(Text, { style: styles.bold }, "Disposition (parts)")), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.flush, { width: CONTENT_COL_W, flexDirection: "row", minHeight: 100 }] }, /* @__PURE__ */ React.createElement(View, { style: { width: half } }, /* @__PURE__ */ React.createElement(Checkbox, { label: "Scrap" }), /* @__PURE__ */ React.createElement(Checkbox, { label: "Sorting (under Concession)", style: { marginTop: 6 } })), /* @__PURE__ */ React.createElement(View, { style: { width: half } }, /* @__PURE__ */ React.createElement(Checkbox, { label: "Rework" }), /* @__PURE__ */ React.createElement(Checkbox, { label: "Use as is", style: { marginTop: 6 } }), /* @__PURE__ */ React.createElement(Checkbox, { label: "Risk assessment (mandatory)", style: { marginTop: 4, paddingLeft: 14 } }), /* @__PURE__ */ React.createElement(Checkbox, { label: "Other supporting documents", style: { marginTop: 3, paddingLeft: 14 } }), /* @__PURE__ */ React.createElement(DottedLine, { style: { marginTop: 3, paddingLeft: 14, width: half } })))));
}
function Section5() {
  const half = HALF_W;
  return /* @__PURE__ */ React.createElement(View, { style: styles.sectionRow }, /* @__PURE__ */ React.createElement(SectionNum, { n: 5 }), /* @__PURE__ */ React.createElement(View, { style: styles.contentCol }, /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.flush, { width: CONTENT_COL_W }] }, /* @__PURE__ */ React.createElement(Text, { style: styles.bold }, "Disposition (process)")), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.flush, { width: CONTENT_COL_W, flexDirection: "row", minHeight: 90 }] }, /* @__PURE__ */ React.createElement(View, { style: { width: half } }, /* @__PURE__ */ React.createElement(Checkbox, { label: "Stop until fixed" })), /* @__PURE__ */ React.createElement(View, { style: { width: half } }, /* @__PURE__ */ React.createElement(Checkbox, { label: "Continue with Concession" }), /* @__PURE__ */ React.createElement(Checkbox, { label: "Risk assessment (mandatory)", style: { marginTop: 4, paddingLeft: 14 } }), /* @__PURE__ */ React.createElement(Checkbox, { label: "Other supporting documents", style: { marginTop: 3, paddingLeft: 14 } }), /* @__PURE__ */ React.createElement(DottedLine, { style: { marginTop: 3, paddingLeft: 14, width: half } }))), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.flush, { width: CONTENT_COL_W }] }, /* @__PURE__ */ React.createElement(Text, { style: styles.bold }, "If concession:")), /* @__PURE__ */ React.createElement(View, { style: { flexDirection: "row" } }, /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.bold, { width: half, height: 16 }] }, /* @__PURE__ */ React.createElement(Text, null, "Until (date)")), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.bold, styles.flush, { width: half, height: 16 }] }, /* @__PURE__ */ React.createElement(Text, null, "Quantity (number)"))), /* @__PURE__ */ React.createElement(View, { style: { flexDirection: "row" } }, /* @__PURE__ */ React.createElement(View, { style: [styles.cell, { width: half, height: 18 }] }), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.flush, { width: half, height: 18 }] }))));
}
function Section6() {
  return /* @__PURE__ */ React.createElement(View, { style: styles.sectionRow }, /* @__PURE__ */ React.createElement(SectionNum, { n: 6 }), /* @__PURE__ */ React.createElement(View, { style: styles.contentCol }, /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.flush, { width: CONTENT_COL_W }] }, /* @__PURE__ */ React.createElement(Text, { style: styles.bold }, "Corrective Actions")), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.flush, { width: CONTENT_COL_W }] }, /* @__PURE__ */ React.createElement(View, { style: { flexDirection: "row" } }, /* @__PURE__ */ React.createElement(Checkbox, { label: "Tool repair", style: { width: HALF_W, marginTop: 2 } }), /* @__PURE__ */ React.createElement(View, { style: { width: HALF_W } })), /* @__PURE__ */ React.createElement(View, { style: { flexDirection: "row" } }, /* @__PURE__ */ React.createElement(View, { style: { width: HALF_W } }), /* @__PURE__ */ React.createElement(View, { style: { width: HALF_W } }, /* @__PURE__ */ React.createElement(Checkbox, { label: "DFM", style: { marginTop: 10 } }), /* @__PURE__ */ React.createElement(Checkbox, { label: "FAI", style: { marginTop: 6 } }), /* @__PURE__ */ React.createElement(Checkbox, { label: "Capability Study (PpK)", style: { marginTop: 6 } }), /* @__PURE__ */ React.createElement(Checkbox, { label: "all critical dimensions", style: { marginTop: 6, paddingLeft: 28 } }), /* @__PURE__ */ React.createElement(Checkbox, { label: "selected dimensions", style: { marginTop: 6, paddingLeft: 28 } }), /* @__PURE__ */ React.createElement(DottedLine, { style: { marginTop: 16, width: HALF_W } }), /* @__PURE__ */ React.createElement(Checkbox, { label: "Sample submission", style: { marginTop: 10 } }))), /* @__PURE__ */ React.createElement(Checkbox, { label: "other", style: { marginTop: 16 } }), /* @__PURE__ */ React.createElement(Checkbox, { label: "New PSW", style: { marginTop: 10 } }), /* @__PURE__ */ React.createElement(View, { style: { height: 8 } }))));
}
function InfoRow({ label, caption }) {
  return /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.flush, { flexDirection: "row", width: CONTENT_COL_W, padding: 0 }] }, /* @__PURE__ */ React.createElement(View, { style: { flex: 1, paddingHorizontal: 4, paddingVertical: 2 } }, /* @__PURE__ */ React.createElement(Text, { style: styles.bold }, label), /* @__PURE__ */ React.createElement(Text, { style: styles.small }, caption)), /* @__PURE__ */ React.createElement(View, { style: { width: 150, flexDirection: "row", alignItems: "center", paddingHorizontal: 4 } }, /* @__PURE__ */ React.createElement(Checkbox, { label: "ja / yes", style: { marginRight: 14 } }), /* @__PURE__ */ React.createElement(Checkbox, { label: "nein / no" })));
}
function Section7() {
  return /* @__PURE__ */ React.createElement(View, { style: styles.sectionRow }, /* @__PURE__ */ React.createElement(SectionNum, { n: 7 }), /* @__PURE__ */ React.createElement(View, { style: styles.contentCol }, /* @__PURE__ */ React.createElement(InfoRow, { label: "Information to the sales department:", caption: "For information only" }), /* @__PURE__ */ React.createElement(InfoRow, { label: "Information to the customer:", caption: "Sales communicates towards customer" })));
}
var SIG_COLS = [
  { key: "rowlabel", label: "" },
  { key: "e", label: "E (R + D)", italic: false },
  { key: "scm", label: "SCM", italic: false },
  { key: "p", label: "P (Production)", italic: true },
  { key: "gf", label: "*GF (Management Board)", italic: true },
  { key: "qm", label: "*QM (Quality Management)", italic: true },
  { key: "sales", label: "**Sales", italic: false }
];
function Section8() {
  const fixedW = CONTENT_COL_W * (63 / 482.4);
  const otherW = (CONTENT_COL_W - fixedW) / (SIG_COLS.length - 1);
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(View, { style: [styles.sectionRow, { marginTop: 5 }] }, /* @__PURE__ */ React.createElement(SectionNum, { n: 8 }), /* @__PURE__ */ React.createElement(View, { style: styles.contentCol }, /* @__PURE__ */ React.createElement(View, { style: { flexDirection: "row" } }, SIG_COLS.map((c, i) => /* @__PURE__ */ React.createElement(
    View,
    {
      key: c.key,
      style: [
        styles.cell,
        i === SIG_COLS.length - 1 ? styles.flush : null,
        { width: i === 0 ? fixedW : otherW, height: 34, justifyContent: "center" }
      ]
    },
    c.label ? /* @__PURE__ */ React.createElement(
      Text,
      {
        style: {
          fontFamily: c.italic ? "Helvetica-BoldOblique" : "Helvetica-Bold",
          textAlign: "center",
          fontSize: 7
        }
      },
      c.label
    ) : null
  ))), /* @__PURE__ */ React.createElement(View, { style: { flexDirection: "row" } }, SIG_COLS.map((c, i) => /* @__PURE__ */ React.createElement(
    View,
    {
      key: c.key,
      style: [
        styles.cell,
        i === SIG_COLS.length - 1 ? styles.flush : null,
        { width: i === 0 ? fixedW : otherW, height: 20 }
      ]
    },
    i === 0 ? /* @__PURE__ */ React.createElement(Text, { style: styles.bold }, "Signature") : null
  ))), /* @__PURE__ */ React.createElement(View, { style: { flexDirection: "row" } }, SIG_COLS.map((c, i) => /* @__PURE__ */ React.createElement(
    View,
    {
      key: c.key,
      style: [
        styles.cell,
        i === SIG_COLS.length - 1 ? styles.flush : null,
        { width: i === 0 ? fixedW : otherW, height: 20 }
      ]
    },
    i === 0 ? /* @__PURE__ */ React.createElement(Text, { style: styles.bold }, "Date") : null
  ))))), /* @__PURE__ */ React.createElement(Text, { style: [styles.footnote, { marginTop: 1 }] }, "* Release only valid with signature of the Management Board + Quality Management"), /* @__PURE__ */ React.createElement(Text, { style: [styles.footnote, { marginTop: 1 }] }, "** In case the sales department is required to be informed"));
}
function Section9() {
  const w1 = CONTENT_COL_W * 0.455;
  const w2 = CONTENT_COL_W * 0.279;
  const w3 = CONTENT_COL_W * 0.266;
  return /* @__PURE__ */ React.createElement(View, { style: [styles.sectionRow, { marginTop: 2 }] }, /* @__PURE__ */ React.createElement(SectionNum, { n: 9 }), /* @__PURE__ */ React.createElement(View, { style: { flexDirection: "row" } }, /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.bold, { width: w1, height: 34 }] }, /* @__PURE__ */ React.createElement(Text, null, "Customer approval ", /* @__PURE__ */ React.createElement(Text, { style: { fontFamily: "Helvetica" } }, "(if applicable)"))), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.bold, { width: w2, height: 34 }] }, /* @__PURE__ */ React.createElement(Text, null, "Name")), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.bold, styles.flush, { width: w3, height: 34 }] }, /* @__PURE__ */ React.createElement(Text, null, "Signature"))));
}
function Section10() {
  const w1 = CONTENT_COL_W * 0.455;
  const w2 = CONTENT_COL_W * 0.279;
  const w3 = CONTENT_COL_W * 0.266;
  return /* @__PURE__ */ React.createElement(View, { style: styles.sectionRow }, /* @__PURE__ */ React.createElement(SectionNum, { n: 10 }), /* @__PURE__ */ React.createElement(View, { style: { flexDirection: "row" } }, /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.bold, { width: w1, height: 34 }] }, /* @__PURE__ */ React.createElement(Text, null, "Check Execution/Completion")), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.bold, { width: w2, height: 34 }] }, /* @__PURE__ */ React.createElement(Text, null, "Signature")), /* @__PURE__ */ React.createElement(View, { style: [styles.cell, styles.flush, { width: w3, height: 34 }] }, /* @__PURE__ */ React.createElement(Checkbox, { label: "Status completed   ja / yes" }))));
}
function QualityNotificationPdf({ logoSrc: logoSrc2 = "/gwf-logo.png" }) {
  return /* @__PURE__ */ React.createElement(Document, { title: "DL05-F0987 - Quality Notification" }, /* @__PURE__ */ React.createElement(Page, { size: "A4", style: styles.page }, /* @__PURE__ */ React.createElement(FormHeader, { logoSrc: logoSrc2 }), /* @__PURE__ */ React.createElement(View, { style: styles.table }, /* @__PURE__ */ React.createElement(Section1, null), /* @__PURE__ */ React.createElement(Section2, null), /* @__PURE__ */ React.createElement(Section3, null), /* @__PURE__ */ React.createElement(Section4, null), /* @__PURE__ */ React.createElement(Section5, null)), /* @__PURE__ */ React.createElement(FormFooter, { page: 1 })), /* @__PURE__ */ React.createElement(Page, { size: "A4", style: styles.page }, /* @__PURE__ */ React.createElement(FormHeader, { logoSrc: logoSrc2, withTitle: false }), /* @__PURE__ */ React.createElement(View, { style: [styles.table, { marginTop: 16 }] }, /* @__PURE__ */ React.createElement(Section6, null), /* @__PURE__ */ React.createElement(Section7, null), /* @__PURE__ */ React.createElement(Section8, null), /* @__PURE__ */ React.createElement(Section9, null), /* @__PURE__ */ React.createElement(Section10, null)), /* @__PURE__ */ React.createElement(Text, { style: { fontSize: 7, marginTop: 4 } }, "Ablage GWF: G\\Publik\\Q-Dokumente\\Quality Notification"), /* @__PURE__ */ React.createElement(FormFooter, { page: 2 })));
}

// scripts/generate-pdf.mjs
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var logoSrc = pathToFileURL(path.join(__dirname, "..", "public", "gwf-logo.png")).href;
var outFile = path.join(__dirname, "..", "quality-notification-empty.pdf");
await renderToFile(React2.createElement(QualityNotificationPdf, { logoSrc }), outFile);
console.log("PDF written to", outFile);
