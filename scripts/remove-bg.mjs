import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'

const src = 'public/angel-wings.jpg'
const dst = 'public/angel-wings-transparent.png'

const image = sharp(src)
const meta = await image.metadata()
const { width, height } = meta

// Get raw RGBA pixels
const raw = await sharp(src).ensureAlpha().raw().toBuffer()

// Sample the top-left corner to detect the background color
const bgR = raw[0], bgG = raw[1], bgB = raw[2]
console.log(`Detected bg color: rgb(${bgR}, ${bgG}, ${bgB})`)

const tolerance = 55  // how similar a pixel needs to be to the bg to be erased
const data = Buffer.from(raw)

for (let i = 0; i < data.length; i += 4) {
  const r = data[i], g = data[i+1], b = data[i+2]
  const dr = Math.abs(r - bgR)
  const dg = Math.abs(g - bgG)
  const db = Math.abs(b - bgB)
  const dist = Math.sqrt(dr*dr + dg*dg + db*db)
  if (dist < tolerance) {
    // Feather the edges slightly instead of hard cut
    const alpha = Math.min(255, Math.round((dist / tolerance) * 255 * 2))
    data[i+3] = alpha
  }
}

await sharp(data, { raw: { width, height, channels: 4 } })
  .png()
  .toFile(dst)

console.log(`Saved transparent PNG: ${dst}`)
