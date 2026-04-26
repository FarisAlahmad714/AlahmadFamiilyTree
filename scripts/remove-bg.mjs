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

// ── 2. Erase halo + sparkles from center region (color-targeted, not rect) ───
// Only erase pixels that are gold/yellow/orange (halo ring and sparkles).
// White wing pixels that happen to be in the center area are preserved.
const cx = Math.floor(width / 2)
for (let y = 0; y < 120; y++) {
  for (let x = cx - 140; x < cx + 140; x++) {
    const i = (y * width + x) * 4
    const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3]
    if (a < 10) continue  // already transparent
    // Gold/yellow: high red, medium-high green, low blue
    const isGold = r > 160 && g > 120 && b < 100 && r > g && r > b
    // Off-white sparkle: high all channels but not pure white
    const isSparkle = r > 220 && g > 220 && b > 180 && b < 240
    if (isGold || isSparkle) {
      data[i+3] = 0
    }
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
