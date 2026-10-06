const MAX_W = 600
const MAX_H = 200

// Scales the picture down and, for pictures without transparency (photos, scans, JPEG),
// turns the white background transparent so the signature sits cleanly on the form.
export async function processSignature(file) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('not an image'))
      el.src = url
    })
    const scale = Math.min(1, MAX_W / img.naturalWidth, MAX_H / img.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const px = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const d = px.data
    let hasAlpha = false
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] < 250) {
        hasAlpha = true
        break
      }
    }
    if (!hasAlpha) {
      // brightness 215..255 fades from opaque to fully transparent
      for (let i = 0; i < d.length; i += 4) {
        const light = Math.min(d[i], d[i + 1], d[i + 2])
        d[i + 3] = light >= 245 ? 0 : light <= 215 ? 255 : Math.round(((245 - light) / 30) * 255)
      }
      ctx.putImageData(px, 0, 0)
    }
    // crop empty margins so the ink fills the signature cell instead of floating in whitespace
    const { width: w, height: h } = canvas
    let x0 = w, y0 = h, x1 = -1, y1 = -1
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 20) {
          if (x < x0) x0 = x
          if (x > x1) x1 = x
          if (y < y0) y0 = y
          if (y > y1) y1 = y
        }
      }
    }
    if (x1 < 0) return canvas.toDataURL('image/png')
    const out = document.createElement('canvas')
    out.width = x1 - x0 + 1
    out.height = y1 - y0 + 1
    out.getContext('2d').drawImage(canvas, x0, y0, out.width, out.height, 0, 0, out.width, out.height)
    return out.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}
