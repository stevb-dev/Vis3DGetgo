import fs from 'fs'
import path from 'path'
import { createApp } from './app'
import { config } from './lib/config'
import { warmEmbeddingModel } from './lib/embedding'
import { backfillEmbeddings, startBackfillLoop } from './lib/search'

// Ensure upload/model directories exist (they are Docker volume mount targets).
fs.mkdirSync(path.resolve(config.uploadDir), { recursive: true })
fs.mkdirSync(path.resolve(config.modelsDir), { recursive: true })

const app = createApp()

// Warm the embedding model, then backfill any NULL embeddings (seed rows +
// degraded writes), then run a periodic backfill. Search degrades gracefully if
// the model fails to load (search feature, .scratch/search).
warmEmbeddingModel()
  .then(() => backfillEmbeddings())
  .catch((err) => {
    console.warn('[api] embedding init failed — search will degrade:', (err as Error)?.message ?? err)
  })
startBackfillLoop()

app.listen(config.port, () => {
  console.log(`[api] listening on http://localhost:${config.port} (env: ${process.env.NODE_ENV ?? 'development'})`)
})
