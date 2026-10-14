import { prisma } from './prisma'
import { embedPassage, locationText } from './embedding'

// Search constants (.scratch/search). The floor is a heuristic — e5 cosine
// scores cluster high, so tune against real data if results feel off.
export const SEARCH_LIMIT = 8
export const SEARCH_FLOOR = 0.4
const BACKFILL_INTERVAL_MS = 10 * 60 * 1000 // ~10 min

/** pgvector's text format is `[a,b,c]` — serialize the embedding accordingly. */
function serialize(vec: number[]): string {
  return `[${vec.join(',')}]`
}

export async function setLocationEmbedding(id: number, vec: number[]): Promise<void> {
  await prisma.$executeRaw`UPDATE "Location" SET embedding = ${serialize(vec)}::vector WHERE id = ${id}`
}

/**
 * Embed a location's text and store it, degrading to NULL on failure: the row
 * stays on the map but is unsearchable until the backfill pass re-embeds it.
 */
export async function embedLocationAndStore(
  id: number,
  name: string,
  description: string | null,
): Promise<void> {
  try {
    const vec = await embedPassage(locationText(name, description))
    await setLocationEmbedding(id, vec)
  } catch (err) {
    console.warn(`[search] failed to embed location ${id}; left unsearchable:`, (err as Error)?.message ?? err)
  }
}

let backfillRunning = false

/** Re-embed rows with a NULL embedding (startup + interval). Idempotent. */
export async function backfillEmbeddings(): Promise<void> {
  if (backfillRunning) return
  backfillRunning = true
  try {
    const rows = await prisma.$queryRaw<{ id: number; name: string; description: string | null }[]>`
      SELECT id, name, description FROM "Location" WHERE embedding IS NULL AND "deletedAt" IS NULL
    `
    for (const row of rows) {
      await embedLocationAndStore(row.id, row.name, row.description)
    }
    if (rows.length > 0) {
      console.log(`[search] backfilled ${rows.length} embedding(s)`)
    }
  } catch (err) {
    console.warn('[search] backfill failed:', (err as Error)?.message ?? err)
  } finally {
    backfillRunning = false
  }
}

/** In-process interval so a degraded location becomes searchable without a redeploy. */
export function startBackfillLoop(): void {
  setInterval(() => {
    backfillEmbeddings().catch(() => undefined)
  }, BACKFILL_INTERVAL_MS)
}
