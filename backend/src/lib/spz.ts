import {
  createChunkDataPool,
  MemoryFileSystem,
  MemoryReadFileSystem,
  readFile,
  writeSource,
} from '@playcanvas/splat-transform'

// SPZ v4 files start with the "NGSP" magic; v1–3 are gzip (`1f 8b`). The
// PlayCanvas SPZ parser reads only v4, so uploads/seed files in older versions
// are converted before they are stored.

export function isSpzV4(buffer: Uint8Array): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x4e && // N
    buffer[1] === 0x47 && // G
    buffer[2] === 0x53 && // S
    buffer[3] === 0x50 // P
  )
}

/**
 * Convert a legacy (v1–3) .spz to v4 in memory. CPU-only (the SPZ wasm
 * backend): ~1s per million gaussians, peak RAM roughly 20× the file size.
 * Throws on unreadable input.
 */
export async function convertSpzToV4(input: Buffer): Promise<Buffer> {
  const readFs = new MemoryReadFileSystem()
  readFs.set('model.spz', new Uint8Array(input.buffer, input.byteOffset, input.byteLength))
  const sources = await readFile({
    filename: 'model.spz',
    inputFormat: 'spz',
    fileSystem: readFs,
  })
  const source = sources[0]
  try {
    const writeFs = new MemoryFileSystem()
    const pool = createChunkDataPool()
    await writeSource(
      { filename: 'model-v4.spz', outputFormat: 'spz', source, pool, options: { spzVersion: 4 } },
      writeFs,
    )
    const out = writeFs.results.get('model-v4.spz')
    if (!out) {
      throw new Error('SPZ conversion produced no output')
    }
    return Buffer.from(out.buffer, out.byteOffset, out.byteLength)
  } finally {
    source.close()
  }
}
