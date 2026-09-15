import React from 'react'
import './QualityNotificationForm.css'

const today = new Date()
const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(
  today.getMonth() + 1,
).padStart(2, '0')}.${today.getFullYear()}`

function Header({ withTitle = true }) {
  return (
    <>
      <div className="qn-header-row">
        <span className="qn-header-filename">DL05-F0987 - Quality Notification.docx</span>
        <img className="qn-header-logo" src="/gwf-logo.png" alt="GWF" />
      </div>
      <div className="qn-header-rule" />
      {withTitle && (
        <h1 className="qn-title">
          Quality Notification | <span className="qn-title-sub">(intern &amp; extern)</span>
        </h1>
      )}
    </>
  )
}

function Footer({ page }) {
  return (
    <>
      <div className="qn-footer-rule" />
      <div className="qn-footer-row">
        <span>Owner: QM / Freigabe: 16.10.2020</span>
        <span>Seite {page} / 2</span>
        <span>Quelle: GWFWorX</span>
      </div>
      <div className="qn-footer-row2">Verteiler: GWF / Unkontrollierte Ausgabe: {todayStr}</div>
    </>
  )
}

function RotatedLabel({ text }) {
  return (
    <div className="qn-label-cell">
      <span>{text}</span>
    </div>
  )
}

function Checkbox({ label, className = '' }) {
  return (
    <div className={`qn-checkbox-row ${className}`}>
      <span className="qn-checkbox" />
      <span>{label}</span>
    </div>
  )
}

function Section1() {
  return (
    <div className="qn-section">
      <div className="qn-num-col">
        <div className="qn-num-cell qn-num-cell--s1">1</div>
        <RotatedLabel text="To be filled out by applicant" />
      </div>
      <div className="qn-content-col">
        <div className="qn-row">
          <div className="qn-cell qn-bold" style={{ width: '13%' }}>Date</div>
          <div className="qn-cell qn-bold" style={{ width: '17%' }}>GWF Part No.</div>
          <div className="qn-cell qn-bold" style={{ width: '35%' }}>Part Description</div>
          <div className="qn-cell qn-bold" style={{ width: '18%' }}>Affected Batchlot Number</div>
          <div className="qn-cell qn-bold" style={{ width: '17%' }}>Batchlot Quantity</div>
        </div>
        <div className="qn-row">
          <div className="qn-cell" style={{ width: '13%', height: 22 }} />
          <div className="qn-cell" style={{ width: '17%', height: 22 }} />
          <div className="qn-cell" style={{ width: '35%', height: 22 }} />
          <div className="qn-cell" style={{ width: '18%', height: 22 }} />
          <div className="qn-cell" style={{ width: '17%', height: 22 }} />
        </div>
        <div className="qn-row">
          <div className="qn-cell qn-bold" style={{ width: '50%' }}>
            Quality Notification No. <span className="qn-bold" style={{ fontWeight: 'normal' }}>(to be allocated by GWF QM)</span>
          </div>
          <div className="qn-cell" style={{ width: '50%' }} />
        </div>
        <div className="qn-row">
          <div className="qn-cell qn-bold" style={{ width: '50%' }}>Applicant</div>
          <div className="qn-cell qn-bold" style={{ width: '50%' }}>Department</div>
        </div>
        <div className="qn-row">
          <div className="qn-cell" style={{ width: '50%', height: 22 }} />
          <div className="qn-cell" style={{ width: '50%', height: 22 }} />
        </div>
        <div className="qn-row">
          <div className="qn-cell qn-bold" style={{ width: '100%' }}>
            Supplier + Supplier number <span style={{ fontWeight: 'normal' }}>(if applicable)</span>
          </div>
        </div>
        <div className="qn-row">
          <div className="qn-cell" style={{ width: '100%', height: 22 }} />
        </div>
      </div>
    </div>
  )
}

function Section2() {
  return (
    <div className="qn-section">
      <div className="qn-num-col">
        <div className="qn-num-cell qn-num-cell--s2">2</div>
        <RotatedLabel text="To be filled out by applicant" />
      </div>
      <div className="qn-content-col">
        <div className="qn-cell qn-bold">Problem Description</div>
        <div className="qn-cell qn-content-box-lg" />
        <div className="qn-cell" style={{ minHeight: 34 }}>Attached Pictures:</div>
      </div>
    </div>
  )
}

function Section3() {
  return (
    <div className="qn-section">
      <div className="qn-num-col">
        <div className="qn-num-cell qn-num-cell--s3">3</div>
        <RotatedLabel text="To be filled out by applicant" />
      </div>
      <div className="qn-content-col">
        <div className="qn-cell qn-bold">Root Cause</div>
        <div className="qn-cell qn-content-box-lg" style={{ minHeight: 172 }} />
      </div>
    </div>
  )
}

function Section4() {
  return (
    <div className="qn-section">
      <div className="qn-num-col">
        <div className="qn-num-cell qn-num-cell-fill">4</div>
      </div>
      <div className="qn-content-col">
        <div className="qn-cell qn-bold">Disposition (parts)</div>
        <div className="qn-cell" style={{ display: 'flex', minHeight: 130 }}>
          <div style={{ width: '50%' }}>
            <Checkbox label="Scrap" />
            <Checkbox label="Sorting (under Concession)" />
          </div>
          <div style={{ width: '50%' }}>
            <Checkbox label="Rework" />
            <Checkbox label="Use as is" />
            <Checkbox label="Risk assessment (mandatory)" className="qn-indent-1" />
            <Checkbox label="Other supporting documents" className="qn-indent-1" />
            <div className="qn-dotted qn-indent-1" style={{ marginLeft: 24, width: '70%' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Section5() {
  return (
    <div className="qn-section">
      <div className="qn-num-col">
        <div className="qn-num-cell qn-num-cell-fill">5</div>
      </div>
      <div className="qn-content-col">
        <div className="qn-cell qn-bold">Disposition (process)</div>
        <div className="qn-cell" style={{ display: 'flex', minHeight: 110 }}>
          <div style={{ width: '50%' }}>
            <Checkbox label="Stop until fixed" />
          </div>
          <div style={{ width: '50%' }}>
            <Checkbox label="Continue with Concession" />
            <Checkbox label="Risk assessment (mandatory)" className="qn-indent-1" />
            <Checkbox label="Other supporting documents" className="qn-indent-1" />
            <div className="qn-dotted qn-indent-1" style={{ marginLeft: 24, width: '70%' }} />
          </div>
        </div>
        <div className="qn-cell qn-bold">If concession:</div>
        <div className="qn-row">
          <div className="qn-cell qn-bold" style={{ width: '50%' }}>Until (date)</div>
          <div className="qn-cell qn-bold" style={{ width: '50%' }}>Quantity (number)</div>
        </div>
        <div className="qn-row">
          <div className="qn-cell" style={{ width: '50%', height: 20 }} />
          <div className="qn-cell" style={{ width: '50%', height: 20 }} />
        </div>
      </div>
    </div>
  )
}

function Section6() {
  return (
    <div className="qn-section">
      <div className="qn-num-col">
        <div className="qn-num-cell qn-num-cell-fill">6</div>
      </div>
      <div className="qn-content-col">
        <div className="qn-cell qn-bold">Corrective Actions</div>
        <div className="qn-cell">
          <div style={{ display: 'flex' }}>
            <div style={{ width: '50%' }}>
              <Checkbox label="Tool repair" />
            </div>
            <div style={{ width: '50%' }} />
          </div>
          <div style={{ display: 'flex' }}>
            <div style={{ width: '50%' }} />
            <div style={{ width: '50%' }}>
              <Checkbox label="DFM" />
              <Checkbox label="FAI" />
              <Checkbox label="Capability Study (PpK)" />
              <Checkbox label="all critical dimensions" className="qn-indent-1" />
              <Checkbox label="selected dimensions" className="qn-indent-1" />
              <div className="qn-dotted" style={{ width: '80%', marginTop: 16, marginBottom: 16 }} />
              <Checkbox label="Sample submission" />
            </div>
          </div>
          <div style={{ height: 16 }} />
          <Checkbox label="other" />
          <div style={{ height: 10 }} />
          <Checkbox label="New PSW" />
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, caption }) {
  return (
    <div className="qn-row">
      <div className="qn-cell" style={{ flex: 1 }}>
        <div className="qn-bold">{label}</div>
        <div className="qn-small">{caption}</div>
      </div>
      <div className="qn-cell" style={{ width: 170, display: 'flex', alignItems: 'center' }}>
        <Checkbox label="ja / yes" className="" />
        <span style={{ width: 16 }} />
        <Checkbox label="nein / no" />
      </div>
    </div>
  )
}

function Section7() {
  return (
    <div className="qn-section">
      <div className="qn-num-col">
        <div className="qn-num-cell qn-num-cell-fill">7</div>
      </div>
      <div className="qn-content-col">
        <InfoRow label="Information to the sales department:" caption="For information only" />
        <InfoRow label="Information to the customer:" caption="Sales communicates towards customer" />
      </div>
    </div>
  )
}

const SIG_COLS = [
  { key: 'rowlabel', label: '', width: '12%' },
  { key: 'e', label: 'E (R + D)', italic: false },
  { key: 'scm', label: 'SCM', italic: false },
  { key: 'p', label: 'P (Production)', italic: true },
  { key: 'gf', label: '*GF (Management Board)', italic: true },
  { key: 'qm', label: '*QM (Quality Management)', italic: true },
  { key: 'sales', label: '**Sales', italic: false },
]

function Section8() {
  const otherWidth = `${88 / 6}%`
  return (
    <div className="qn-section" style={{ marginTop: 6 }}>
      <div className="qn-num-col">
        <div className="qn-num-cell qn-num-cell-fill">8</div>
      </div>
      <div className="qn-content-col">
        <div className="qn-row">
          {SIG_COLS.map((c, i) => (
            <div
              key={c.key}
              className="qn-cell"
              style={{ width: i === 0 ? c.width : otherWidth, minHeight: 34, textAlign: 'center' }}
            >
              <span style={{ fontWeight: 'bold', fontStyle: c.italic ? 'italic' : 'normal' }}>{c.label}</span>
            </div>
          ))}
        </div>
        <div className="qn-row">
          {SIG_COLS.map((c, i) => (
            <div key={c.key} className="qn-cell" style={{ width: i === 0 ? c.width : otherWidth, height: 26 }}>
              {i === 0 && <span className="qn-bold">Signature</span>}
            </div>
          ))}
        </div>
        <div className="qn-row">
          {SIG_COLS.map((c, i) => (
            <div key={c.key} className="qn-cell" style={{ width: i === 0 ? c.width : otherWidth, height: 26 }}>
              {i === 0 && <span className="qn-bold">Date</span>}
            </div>
          ))}
        </div>
        <div className="qn-cell qn-small" style={{ padding: '2px 5px' }}>
          <div>* Release only valid with signature of the Management Board + Quality Management</div>
          <div>** In case the sales department is required to be informed</div>
        </div>
      </div>
    </div>
  )
}

function Section9() {
  return (
    <div className="qn-section">
      <div className="qn-num-col">
        <div className="qn-num-cell qn-num-cell-fill">9</div>
      </div>
      <div className="qn-row" style={{ flex: 1 }}>
        <div className="qn-cell qn-bold" style={{ width: '50%', minHeight: 40 }}>
          Customer approval <span style={{ fontWeight: 'normal' }}>(if applicable)</span>
        </div>
        <div className="qn-cell qn-bold" style={{ width: '25%', minHeight: 40 }}>Name</div>
        <div className="qn-cell qn-bold" style={{ width: '25%', minHeight: 40 }}>Signature</div>
      </div>
    </div>
  )
}

function Section10() {
  return (
    <div className="qn-section">
      <div className="qn-num-col">
        <div className="qn-num-cell qn-num-cell-fill">10</div>
      </div>
      <div className="qn-row" style={{ flex: 1 }}>
        <div className="qn-cell qn-bold" style={{ width: '45%', minHeight: 40 }}>Check Execution/Completion</div>
        <div className="qn-cell qn-bold" style={{ width: '25%', minHeight: 40 }}>Signature</div>
        <div className="qn-cell" style={{ width: '30%', minHeight: 40 }}>
          <Checkbox label="Status completed   ja / yes" />
        </div>
      </div>
    </div>
  )
}

export default function QualityNotificationForm() {
  return (
    <>
      <div className="qn-page">
        <Header />
        <div className="qn-table">
          <Section1 />
          <Section2 />
          <Section3 />
          <Section4 />
          <Section5 />
        </div>
        <Footer page={1} />
      </div>
      <div className="qn-page">
        <Header withTitle={false} />
        <div className="qn-table" style={{ marginTop: 20 }}>
          <Section6 />
          <Section7 />
          <Section8 />
          <Section9 />
          <Section10 />
        </div>
        <div style={{ fontSize: 8, marginTop: 6 }}>
          Ablage GWF: G\Publik\Q-Dokumente\Quality Notification
        </div>
        <Footer page={2} />
      </div>
    </>
  )
}
