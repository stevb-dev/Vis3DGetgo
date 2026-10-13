// One-off generator for the OpenFreeMap layer thumbnails (tile-layers ticket 05).
// OpenFreeMap is vector-only with no static-image endpoint, so these are
// representative gradient placeholders — NOT faithful captures. Replace with
// real rendered stills if a faithful preview is required.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}
function png(width, height, pixelFn) {
  const raw = Buffer.alloc((width * 3 + 1) * height)
  let o = 0
  for (let y = 0; y < height; y++) {
    raw[o++] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelFn(x, y)
      raw[o++] = r
      raw[o++] = g
      raw[o++] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)))

const STYLES = [
  // Background colors taken from each OpenFreeMap style's "background" layer.
  { id: 'liberty', bg: '#f8f4f0' },
  { id: 'bright', bg: '#fbfbf7' },
  { id: 'dark', bg: '#1f2226' },
]

const SIZE = 64
for (const s of STYLES) {
  const bg = hex(s.bg)
  const light = bg.map((v) => clamp(v + (255 - v) * 0.12))
  const dark = bg.map((v) => clamp(v - v * 0.14))
  // A couple of subtle "road" bands so it reads as an abstract map, not a void.
  const road = s.id === 'dark' ? [80, 82, 86] : [255, 255, 255]
  const buf = png(SIZE, SIZE, (x, y) => {
    const t = y / (SIZE - 1)
    let px = mix(light, dark, t)
    if ((y >= 22 && y <= 24) || (y >= 40 && y <= 41)) px = mix(px, road, 0.55)
    return px
  })
  writeFileSync(`public/layers/${s.id}.png`, buf)
  console.log('wrote', s.id)
}
