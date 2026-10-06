// Mail via the Resend HTTP API (https://resend.com/docs/api-reference/emails/send-email).
// Configure with RESEND_API_KEY, MAIL_FROM ("GWF Quality <qn@yourdomain>") and APP_URL
// (public address of the app, used for links). Without an API key mails are only logged.

const APP_URL = () => (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')

export const formLink = (id) => `${APP_URL()}/#/form/${id}`

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

export async function sendMail({ to, subject, text, link }) {
  const html = `<p>${esc(text).replace(/\n/g, '<br>')}</p><p><a href="${esc(link)}">${esc(link)}</a></p>`
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.log(`[mail disabled] to=${to} subject="${subject}"\n${text}\n${link}`)
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || 'GWF Quality Notification <onboarding@resend.dev>',
        to: [to],
        subject,
        text: `${text}\n\n${link}`,
        html,
      }),
    })
    if (!res.ok) console.error(`[mail] Resend ${res.status}: ${await res.text()}`)
    return res.ok
  } catch (e) {
    console.error('[mail] failed:', e.message)
    return false
  }
}
