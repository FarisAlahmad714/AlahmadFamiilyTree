import sharp from 'sharp'

// Original image: 484x243
// Halo is the gold ring sitting center-top between the two wings
// Roughly: x=170..314, y=28..80  (center ~242, top ~28, bottom ~80)
// Add padding around it

const src = 'public/angel-wings.jpg'

// Crop just the halo region with generous padding
await sharp(src)
  .extract({ left: 158, top: 18, width: 168, height: 72 })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
  .then(async ({ data, info }) => {
    const { width, height } = info
    const buf = Buffer.from(data)

    // Remove the blue-purple background (same tolerance as wings)
    const bgR = 89, bgG = 99, bgB = 194
    const tolerance = 55
    for (let i = 0; i < buf.length; i += 4) {
      const r = buf[i], g = buf[i+1], b = buf[i+2]
      const dist = Math.sqrt((r-bgR)**2 + (g-bgG)**2 + (b-bgB)**2)
      if (dist < tolerance) {
        buf[i+3] = Math.min(255, Math.round((dist / tolerance) * 255 * 2))
      }
    }

    await sharp(buf, { raw: { width, height, channels: 4 } })
      .png()
      .toFile('public/angel-halo.png')

    console.log(`Saved halo: ${width}x${height}`)
  })

// Also save wings-only version (crop top area that contains halo, keep the wings)
// The halo is roughly in the top 85px, but the wings extend through the full height
// We'll just use the full transparent wings image and the halo separately
console.log('Done')
