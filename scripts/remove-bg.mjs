import sharp from 'sharp'

const src = 'public/angel-wings.jpg'

// ── 1. Full wings + transparent bg ───────────────────────────────────────────
const image = sharp(src)
const { width, height } = await image.metadata()

const raw = await sharp(src).ensureAlpha().raw().toBuffer()
const bgR = 89, bgG = 99, bgB = 194
const tolerance = 55
const data = Buffer.from(raw)

for (let i = 0; i < data.length; i += 4) {
  const r = data[i], g = data[i+1], b = data[i+2]
  const dist = Math.sqrt((r-bgR)**2 + (g-bgG)**2 + (b-bgB)**2)
  if (dist < tolerance) {
    data[i+3] = Math.min(255, Math.round((dist / tolerance) * 255 * 2))
  }
}

// ── 2. Erase the entire center-top region (halo + sparkles) ──────────────────
// The halo and sparkles sit in the center band of the image.
// Erase a wide vertical strip from the center so only the wing sides remain.
const cx = Math.floor(width / 2)
const eraseHalfW = 130   // 260px total strip centered on image
for (let y = 0; y < 110; y++) {
  for (let x = cx - eraseHalfW; x < cx + eraseHalfW; x++) {
    const i = (y * width + x) * 4
    data[i+3] = 0
  }
}

await sharp(data, { raw: { width, height, channels: 4 } })
  .png()
  .toFile('public/angel-wings-transparent.png')
console.log('Wings (no halo) saved')

// ── 3. Halo-only crop ────────────────────────────────────────────────────────
const haloRaw = await sharp(src)
  .extract({ left: 148, top: 10, width: 188, height: 85 })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const { data: hd, info: hi } = haloRaw
const hBuf = Buffer.from(hd)
for (let i = 0; i < hBuf.length; i += 4) {
  const r = hBuf[i], g = hBuf[i+1], b = hBuf[i+2]
  const dist = Math.sqrt((r-bgR)**2 + (g-bgG)**2 + (b-bgB)**2)
  if (dist < tolerance) {
    hBuf[i+3] = Math.min(255, Math.round((dist / tolerance) * 255 * 2))
  }
}
await sharp(hBuf, { raw: { width: hi.width, height: hi.height, channels: 4 } })
  .png()
  .toFile('public/angel-halo.png')
console.log(`Halo saved: ${hi.width}×${hi.height}`)
