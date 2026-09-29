const MAX_SIDE = 1600
const QUALITY = 0.85

// Downscale (long side <= 1600px) and re-encode as JPEG so the PDF stays small.
export async function processImage(file) {
  const bitmapUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('not an image'))
      el.src = bitmapUrl
    })
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const width = Math.max(1, Math.round(img.naturalWidth * scale))
    const height = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff' // JPEG has no alpha
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)
    return { id: crypto.randomUUID(), src: canvas.toDataURL('image/jpeg', QUALITY), width, height }
  } finally {
    URL.revokeObjectURL(bitmapUrl)
  }
}
