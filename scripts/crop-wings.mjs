import sharp from 'sharp'

// Original image: 484x243, bg color rgb(89,99,194)
const src = 'public/angel-wings.jpg'
const bgR = 89, bgG = 99, bgB = 194
const tolerance = 55

async function removeBg(buf, w, h) {
  const out = Buffer.from(buf)
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i], g = out[i+1], b = out[i+2]
    const dist = Math.sqrt((r-bgR)**2 + (g-bgG)**2 + (b-bgB)**2)
    if (dist < tolerance) {
      out[i+3] = Math.min(255, Math.round((dist / tolerance) * 510))
    }
  }
  return out
}

// ── Left wing: x=0..230, full height ─────────────────────────────────────────
{
  const { data, info } = await sharp(src)
    .extract({ left: 0, top: 0, width: 230, height: 243 })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const clean = await removeBg(data, info.width, info.height)
  await sharp(clean, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png().toFile('public/wing-left.png')
  console.log('wing-left.png saved')
}

// ── Right wing: x=254..484, full height ──────────────────────────────────────
{
  const { data, info } = await sharp(src)
    .extract({ left: 254, top: 0, width: 230, height: 243 })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const clean = await removeBg(data, info.width, info.height)
  await sharp(clean, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png().toFile('public/wing-right.png')
  console.log('wing-right.png saved')
}

// ── Halo: center strip x=158..326, y=0..100 ──────────────────────────────────
{
  const { data, info } = await sharp(src)
    .extract({ left: 158, top: 0, width: 168, height: 100 })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const clean = await removeBg(data, info.width, info.height)
  await sharp(clean, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png().toFile('public/angel-halo.png')
  console.log('angel-halo.png saved')
}
